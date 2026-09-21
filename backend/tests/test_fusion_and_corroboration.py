import unittest
from backend.app.fusion.engine import FusionEngine, STATE_SEVERITY_ORDER
from backend.app.models.enums import HealthState, RULStatus, Modality


class TestFusionAndCorroboration(unittest.TestCase):
    def setUp(self):
        self.engine = FusionEngine(persistence_k=3, persistence_n=5, clear_window=5)
        self.baseline = {
            "vibration": {"rms_mm_s": 2.2, "crit_rms_mm_s": 9.0, "kurtosis": 3.0},
            "thermal": {"hotspot_delta_t_c": 1.5, "crit_delta_t_c": 20.0},
            "laser": {"lift_height_mm": 0.0, "step_height_mm": 0.5, "crit_lift_height_mm": 8.0},
        }

    def test_single_modality_spike_stays_at_watch_or_below(self):
        """
        Non-negotiable requirement:
        Alerts above WATCH need corroboration from at least 2 different sensor types.
        A single-modality spike (e.g. massive vibration RMS spike while vision,
        thermal, and laser remain healthy) must NOT exceed WATCH state.
        """
        joint_id = "CV01_J04"
        # Severe vibration spike: RMS 15.0 mm/s (critical is 9.0)
        features = {
            Modality.VIBRATION.value: {"rms_mm_s": 15.0, "peak_mm_s": 30.0, "kurtosis": 6.5},
            Modality.THERMAL.value: {"hotspot_delta_t_c": 1.5},
            Modality.LASER.value: {"lift_height_mm": 0.0, "step_height_mm": 0.5},
        }
        detections = []  # Vision is clean
        quality_scores = {
            Modality.VISION.value: 1.0,
            Modality.VIBRATION.value: 1.0,
            Modality.THERMAL.value: 1.0,
            Modality.LASER.value: 1.0,
        }

        # Run multiple passes with this single spike
        for lap in range(1, 10):
            res = self.engine.process_pass_event(
                joint_id=joint_id,
                lap_no=lap,
                detections=detections,
                features=features,
                quality_scores=quality_scores,
                baseline=self.baseline,
            )

        # Corroboration was NOT satisfied (only 1 abnormal modality: vibration)
        self.assertFalse(res["is_corroborated"])
        self.assertEqual(res["abnormal_modalities"], [Modality.VIBRATION.value])
        # Candidate and confirmed state MUST NOT exceed WATCH
        self.assertIn(res["state"], (HealthState.HEALTHY, HealthState.WATCH))
        self.assertNotEqual(res["state"], HealthState.MAINTENANCE_REQUIRED)
        self.assertNotEqual(res["state"], HealthState.CRITICAL)

    def test_multimodal_corroboration_allows_critical(self):
        """When multiple modalities agree (e.g. vision + vibration + thermal), state can advance."""
        joint_id = "CV01_J04"
        features = {
            Modality.VIBRATION.value: {"rms_mm_s": 10.5, "peak_mm_s": 25.0, "kurtosis": 6.0},
            Modality.THERMAL.value: {"hotspot_delta_t_c": 18.5},
            Modality.LASER.value: {"lift_height_mm": 7.5, "step_height_mm": 3.0},
        }
        detections = [
            {"defect_class": "splice_lift", "confidence": 0.92, "bbox": [10, 10, 50, 50]},
            {"defect_class": "cord_or_fabric_exposure", "confidence": 0.88, "bbox": [20, 20, 40, 40]},
        ]
        quality_scores = {m.value: 1.0 for m in (Modality.VISION, Modality.VIBRATION, Modality.THERMAL, Modality.LASER)}

        # Run 5 passes to pass persistence filter
        for lap in range(1, 6):
            res = self.engine.process_pass_event(
                joint_id=joint_id,
                lap_no=lap,
                detections=detections,
                features=features,
                quality_scores=quality_scores,
                baseline=self.baseline,
            )

        self.assertTrue(res["is_corroborated"])
        self.assertGreaterEqual(len(res["abnormal_modalities"]), 2)
        self.assertEqual(res["state"], HealthState.CRITICAL)
        self.assertLess(res["h_joint"], 50.0)

    def test_sensor_quality_downweighting(self):
        """Degraded sensor stream with low quality_score has diminished impact on fused risk."""
        engine1 = FusionEngine()
        engine2 = FusionEngine()
        joint_id = "CV01_J04"

        spike_features = {
            Modality.VIBRATION.value: {"rms_mm_s": 12.0},
            Modality.THERMAL.value: {"hotspot_delta_t_c": 1.5},
            Modality.LASER.value: {"lift_height_mm": 0.0},
        }

        # Case 1: Vibration quality is 1.0 (perfect)
        res_high_q = engine1.process_pass_event(
            joint_id=joint_id,
            lap_no=1,
            detections=[],
            features=spike_features,
            quality_scores={Modality.VISION.value: 1.0, Modality.VIBRATION.value: 1.0, Modality.THERMAL.value: 1.0, Modality.LASER.value: 1.0},
            baseline=self.baseline,
        )

        # Case 2: Vibration quality is 0.1 (degraded/noisy)
        res_low_q = engine2.process_pass_event(
            joint_id=joint_id,
            lap_no=1,
            detections=[],
            features=spike_features,
            quality_scores={Modality.VISION.value: 1.0, Modality.VIBRATION.value: 0.1, Modality.THERMAL.value: 1.0, Modality.LASER.value: 1.0},
            baseline=self.baseline,
        )

        # The low quality sensor should produce lower fused risk and higher health
        self.assertLess(res_low_q["risk_score"], res_high_q["risk_score"])
        self.assertGreater(res_low_q["h_pass"], res_high_q["h_pass"])

    def test_persistence_and_hysteresis(self):
        """
        PRD 6.5: State change requires k of the last n passes (3 of 5).
        Return to lower state requires clear window (all 5 passes).
        """
        joint_id = "CV01_J04"
        healthy_features = {
            Modality.VIBRATION.value: {"rms_mm_s": 2.2},
            Modality.THERMAL.value: {"hotspot_delta_t_c": 1.5},
            Modality.LASER.value: {"lift_height_mm": 0.0},
        }
        critical_features = {
            Modality.VIBRATION.value: {"rms_mm_s": 10.0},
            Modality.THERMAL.value: {"hotspot_delta_t_c": 18.0},
            Modality.LASER.value: {"lift_height_mm": 7.0},
        }
        critical_detections = [{"defect_class": "splice_lift", "confidence": 0.90}]
        qualities = {m.value: 1.0 for m in (Modality.VISION, Modality.VIBRATION, Modality.THERMAL, Modality.LASER)}

        # Establish healthy baseline
        for lap in range(1, 4):
            res = self.engine.process_pass_event(
                joint_id=joint_id,
                lap_no=lap,
                detections=[],
                features=healthy_features,
                quality_scores=qualities,
                baseline=self.baseline,
            )
            self.assertEqual(res["state"], HealthState.HEALTHY)

        # Pass 4 (1st critical pass): Candidate is CRITICAL, but confirmed state stays HEALTHY (1/5)
        res4 = self.engine.process_pass_event(
            joint_id=joint_id,
            lap_no=4,
            detections=critical_detections,
            features=critical_features,
            quality_scores=qualities,
            baseline=self.baseline,
        )
        self.assertEqual(res4["raw_candidate_state"], HealthState.CRITICAL)
        self.assertNotEqual(res4["state"], HealthState.CRITICAL)

        # Pass 5 (2nd critical pass): Still not 3 of 5
        res5 = self.engine.process_pass_event(
            joint_id=joint_id,
            lap_no=5,
            detections=critical_detections,
            features=critical_features,
            quality_scores=qualities,
            baseline=self.baseline,
        )
        self.assertNotEqual(res5["state"], HealthState.CRITICAL)

        # Pass 6 (3rd critical pass): 3 of last 5 passes are CRITICAL -> confirmed state transitions!
        res6 = self.engine.process_pass_event(
            joint_id=joint_id,
            lap_no=6,
            detections=critical_detections,
            features=critical_features,
            quality_scores=qualities,
            baseline=self.baseline,
        )
        self.assertEqual(res6["state"], HealthState.CRITICAL)

        # Now test recovery hysteresis: a single healthy pass must NOT immediately clear CRITICAL
        res_rec1 = self.engine.process_pass_event(
            joint_id=joint_id,
            lap_no=7,
            detections=[],
            features=healthy_features,
            quality_scores=qualities,
            baseline=self.baseline,
        )
        self.assertEqual(res_rec1["state"], HealthState.CRITICAL)

    def test_rul_healthy_joint_unavailable_no_degradation_trend(self):
        """Healthy joints without downward degradation trend get UNAVAILABLE with reason no_degradation_trend."""
        joint_id = "CV01_J01"
        features = {
            Modality.VIBRATION.value: {"rms_mm_s": 2.2},
            Modality.THERMAL.value: {"hotspot_delta_t_c": 1.5},
            Modality.LASER.value: {"lift_height_mm": 0.0},
        }
        qualities = {m.value: 1.0 for m in (Modality.VISION, Modality.VIBRATION, Modality.THERMAL, Modality.LASER)}

        # Passes 1 to 4: insufficient history
        for lap in range(1, 5):
            res = self.engine.process_pass_event(
                joint_id=joint_id,
                lap_no=lap,
                detections=[],
                features=features,
                quality_scores=qualities,
                baseline=self.baseline,
            )
            self.assertEqual(res["rul"]["status"], RULStatus.UNAVAILABLE)
            self.assertEqual(res["rul"]["reason"], "insufficient_history")
            self.assertIsNone(res["rul"]["low_days"])

        # Passes 5 to 10: enough passes, but slope is flat -> reason is no_degradation_trend
        for lap in range(5, 11):
            res = self.engine.process_pass_event(
                joint_id=joint_id,
                lap_no=lap,
                detections=[],
                features=features,
                quality_scores=qualities,
                baseline=self.baseline,
            )
            self.assertEqual(res["rul"]["status"], RULStatus.UNAVAILABLE)
            self.assertEqual(res["rul"]["reason"], "no_degradation_trend")
            self.assertIsNone(res["rul"]["low_days"])
            self.assertIsNone(res["rul"]["high_days"])

    def test_rul_degrading_joint_demo_with_interval(self):
        """Degrading joint with a downward trend gets DEMO with dynamic interval."""
        joint_id = "CV01_J04"
        qualities = {m.value: 1.0 for m in (Modality.VISION, Modality.VIBRATION, Modality.THERMAL, Modality.LASER)}

        # Simulate progressive degradation over 8 laps
        for lap in range(1, 9):
            vib_rms = 2.2 + (0.5 * lap)
            thermal_dt = 1.5 + (1.2 * lap)
            laser_lift = 0.3 * lap

            res = self.engine.process_pass_event(
                joint_id=joint_id,
                lap_no=lap,
                detections=[{"defect_class": "cover_wear", "confidence": min(0.3 + 0.05 * lap, 0.85)}],
                features={
                    Modality.VIBRATION.value: {"rms_mm_s": vib_rms},
                    Modality.THERMAL.value: {"hotspot_delta_t_c": thermal_dt},
                    Modality.LASER.value: {"lift_height_mm": laser_lift},
                },
                quality_scores=qualities,
                baseline=self.baseline,
            )

            if lap >= 5:
                # Downward trend is established -> status is DEMO
                self.assertEqual(res["rul"]["status"], RULStatus.DEMO)
                self.assertIsNone(res["rul"]["reason"])
                self.assertIsNotNone(res["rul"]["low_days"])
                self.assertIsNotNone(res["rul"]["high_days"])
                self.assertLess(res["rul"]["low_days"], res["rul"]["high_days"])
                self.assertGreater(res["rul"]["low_days"], 0.0)

    def test_conveyor_risk_index_formula(self):
        """Conveyor risk index = 0.6 * weighted_mean + 0.4 * worst_joint."""
        joint_healths = [90.0, 92.0, 88.0, 40.0]
        # mean = (90 + 92 + 88 + 40) / 4 = 310 / 4 = 77.5
        # worst = 40.0
        # risk_index = 0.6 * 77.5 + 0.4 * 40.0 = 46.5 + 16.0 = 62.5
        risk_idx, avg_h, worst_h = self.engine.compute_conveyor_risk_index(joint_healths)
        self.assertAlmostEqual(avg_h, 77.5)
        self.assertAlmostEqual(worst_h, 40.0)
        self.assertAlmostEqual(risk_idx, 62.5)


if __name__ == "__main__":
    unittest.main()
