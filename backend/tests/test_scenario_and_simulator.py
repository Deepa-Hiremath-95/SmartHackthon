import unittest
import asyncio
from backend.app.simulator.scenario import SpliceDegradationScenario
from backend.app.simulator.engine import SimulatorEngine
from backend.app.fusion.engine import FusionEngine
from backend.app.models.enums import HealthState, Modality, Provenance
from backend.app.database import SessionLocal, Base, engine
from backend.app.seeds.seed_data import init_and_seed
from backend.app.models.entities import PassEvent


class TestScenarioAndSimulator(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_and_seed()

    def setUp(self):
        self.scenario = SpliceDegradationScenario(target_joint_code="J04", seed=42)
        self.fusion = FusionEngine()
        self.baseline = {
            "vibration": {"rms_mm_s": 2.2, "crit_rms_mm_s": 9.0, "kurtosis": 3.0},
            "thermal": {"hotspot_delta_t_c": 1.5, "crit_delta_t_c": 20.0},
            "laser": {"lift_height_mm": 0.0, "step_height_mm": 0.5, "crit_lift_height_mm": 8.0},
        }

    def test_scenario_produces_only_raw_features_no_state(self):
        """Verify the simulator generates only physical signals without computing health or state."""
        signals = self.scenario.generate_pass_signals(joint_code="J04", lap_no=10)
        self.assertIn("features", signals)
        self.assertIn("detections", signals)
        self.assertIn("quality_scores", signals)
        self.assertIn("provenance", signals)
        self.assertEqual(signals["provenance"], "SIMULATED")

        # Must NOT contain hardcoded health or state
        self.assertNotIn("health", signals)
        self.assertNotIn("state", signals)
        self.assertNotIn("risk", signals)

    def test_healthy_joint_stays_healthy(self):
        """Non-target joint J01 remains healthy across all laps."""
        for lap in range(1, 30):
            signals = self.scenario.generate_pass_signals(joint_code="J01", lap_no=lap)
            res = self.fusion.process_pass_event(
                joint_id="CV01_J01",
                lap_no=lap,
                detections=signals["detections"],
                features=signals["features"],
                quality_scores=signals["quality_scores"],
                baseline=self.baseline,
            )
            # Health should remain >= 85 with tolerance
            self.assertGreaterEqual(res["h_joint"], 85.0)
            self.assertEqual(res["state"], HealthState.HEALTHY)

    def test_j04_splice_degradation_progression_and_plateau(self):
        """
        Verify J04 progresses from Healthy -> Watch -> Maintenance Required -> Critical
        and saturates at plausible maxima so fused health settles in 20-35% (not near 0%).
        """
        states_observed = []
        healths_observed = []

        for lap in range(0, 30):
            signals = self.scenario.generate_pass_signals(joint_code="J04", lap_no=lap)
            res = self.fusion.process_pass_event(
                joint_id="CV01_J04",
                lap_no=lap,
                detections=signals["detections"],
                features=signals["features"],
                quality_scores=signals["quality_scores"],
                baseline=self.baseline,
            )
            states_observed.append(res["state"])
            healths_observed.append(res["h_joint"])

        # Early laps (0-4): Healthy
        self.assertGreaterEqual(healths_observed[0], 85.0)
        self.assertEqual(states_observed[0], HealthState.HEALTHY)

        # Intermediate progression: WATCH and/or MAINTENANCE_REQUIRED reached
        self.assertTrue(
            any(s in (HealthState.WATCH, HealthState.MAINTENANCE_REQUIRED) for s in states_observed[6:20]),
            "J04 did not reach intermediate warning states"
        )

        # Final laps (24+): Critical reached and health settles around 20-35%, not near 0%
        final_health = healths_observed[-1]
        self.assertLess(final_health, 50.0)
        self.assertGreaterEqual(final_health, 20.0, f"Final health {final_health} dropped below 20%")
        self.assertLessEqual(final_health, 35.0, f"Final health {final_health} exceeds 35%")
        self.assertEqual(states_observed[-1], HealthState.CRITICAL)

    def test_deterministic_reproducibility(self):
        """Verify identical seed produces identical signal streams."""
        scen1 = SpliceDegradationScenario(target_joint_code="J04", seed=123)
        scen2 = SpliceDegradationScenario(target_joint_code="J04", seed=123)

        sig1 = scen1.generate_pass_signals(joint_code="J04", lap_no=15)
        sig2 = scen2.generate_pass_signals(joint_code="J04", lap_no=15)

        self.assertEqual(sig1, sig2)

    def test_speed_presets(self):
        """Verify 1x, 10x, 60x, 600x speed presets on the simulator."""
        sim = SimulatorEngine(default_preset="600x")
        self.assertEqual(sim.time_acceleration, 600.0)

        sim.set_speed_preset("1x")
        self.assertEqual(sim.time_acceleration, 1.0)

        sim.set_speed_preset("10x")
        self.assertEqual(sim.time_acceleration, 10.0)

        sim.set_speed_preset("60x")
        self.assertEqual(sim.time_acceleration, 60.0)

        sim.set_speed_preset("600x")
        self.assertEqual(sim.time_acceleration, 600.0)

        with self.assertRaises(ValueError):
            sim.set_speed_preset("999x")

    def test_run_id_generation_and_reset(self):
        """Verify run_id is generated and updated on reset."""
        sim = SimulatorEngine()
        initial_run_id = sim.run_id
        self.assertTrue(initial_run_id.startswith("run_"))

        sim.reset(new_run=True)
        new_run_id = sim.run_id
        self.assertNotEqual(initial_run_id, new_run_id)

    def test_conveyor_summary_emitted_once_per_lap(self):
        """Verify conveyor_summary is broadcasted exactly once per lap after all 24 joints cross."""
        broadcasted_messages = []

        async def mock_broadcast(msg):
            broadcasted_messages.append(msg)

        sim = SimulatorEngine(broadcast_callback=mock_broadcast)
        db = SessionLocal()
        try:
            sim.load_topology(db)
        finally:
            db.close()

        # Simulate pass events for all 24 joints in lap 1
        crossed_joints = sim.joints[:]
        self.assertEqual(len(crossed_joints), 24)

        asyncio.run(sim._process_crossed_joints(crossed_joints))

        summaries = [m for m in broadcasted_messages if m.get("type") == "conveyor_summary"]
        health_updates = [m for m in broadcasted_messages if m.get("type") == "health_update"]

        # Exactly 24 health updates and exactly 1 conveyor summary
        self.assertEqual(len(health_updates), 24)
        self.assertEqual(len(summaries), 1)
        self.assertEqual(summaries[0]["lap_no"], sim.current_lap)
        self.assertIn("conveyor_risk_index", summaries[0])
        self.assertIn("average_health", summaries[0])
        self.assertIn("worst_joint_id", summaries[0])
        self.assertIn("active_alerts_count", summaries[0])

    def test_critical_laps_hold_and_scenario_event(self):
        """Verify holding critical state for N laps emits scenario_event and pauses or resets."""
        events_emitted = []

        async def mock_broadcast(msg):
            events_emitted.append(msg)

        sim = SimulatorEngine(broadcast_callback=mock_broadcast)
        sim.hold_critical_laps = 3
        sim.auto_loop = False
        db = SessionLocal()
        try:
            sim.load_topology(db)
        finally:
            db.close()

        # Artificially set J04 to Critical in fusion engine
        sim.fusion_engine.confirmed_states["CV01_J04"] = HealthState.CRITICAL
        target_joint = [j for j in sim.joints if j["code"] == "J04"]

        # Step 3 distinct laps for J04
        for lap in [10, 11, 12]:
            sim.current_lap = lap
            asyncio.run(sim._process_crossed_joints(target_joint))

        scenario_events = [m for m in events_emitted if m.get("type") == "scenario_event"]
        self.assertEqual(len(scenario_events), 1)
        self.assertEqual(scenario_events[0]["event"], "CRITICAL_HOLD_COMPLETED")
        self.assertEqual(scenario_events[0]["target_joint"], "J04")
        self.assertEqual(scenario_events[0]["action"], "PAUSED")
        self.assertTrue(sim.paused)
        self.assertEqual(sim.get_scenario_phase(), "COMPLETED")

    def test_prune_excess_events(self):
        """Verify _prune_excess_events caps stored pass-events in SQLite."""
        import datetime
        sim = SimulatorEngine()
        sim.max_stored_events = 5
        db = SessionLocal()
        try:
            sim.load_topology(db)
            for i in range(10):
                pe = PassEvent(
                    id=f"test_pe_{i}",
                    run_id=sim.run_id,
                    joint_id="CV01_J01",
                    station_id="ST-01",
                    lap_no=i,
                    t_enter=datetime.datetime.utcnow() + datetime.timedelta(seconds=i),
                    t_exit=datetime.datetime.utcnow() + datetime.timedelta(seconds=i + 1),
                    speed_mps=2.45,
                    load_pct=80.0,
                    provenance=Provenance.SIMULATED,
                )
                db.add(pe)
            db.commit()

            sim._prune_excess_events(db)
            count = db.query(PassEvent).filter(PassEvent.id.like("test_pe_%")).count()
            self.assertLessEqual(count, 5)
        finally:
            db.query(PassEvent).filter(PassEvent.id.like("test_pe_%")).delete()
            db.commit()
            db.close()


if __name__ == "__main__":
    unittest.main()
