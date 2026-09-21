import asyncio
import datetime
import logging
import uuid
from typing import Dict, Any, List, Optional, Set, Callable, Coroutine
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import SessionLocal
from backend.app.models.entities import (
    Conveyor,
    Joint,
    Station,
    PassEvent,
    Detection,
    Feature,
    HealthSnapshot,
    Alert,
    Prediction,
)
from backend.app.models.enums import (
    Provenance,
    HealthState,
    Severity,
    AlertState,
    Modality,
)
from backend.app.fusion.engine import FusionEngine, STATE_SEVERITY_ORDER
from backend.app.simulator.scenario import SpliceDegradationScenario

logger = logging.getLogger("nexvion.simulator")


class SimulatorEngine:
    """
    Continuous conveyor loop simulation engine.
    Handles odometry, station crossing detection, speed presets (1x, 10x, 60x, 600x),
    persistence to database with row capping, and event emission to WebSocket listeners.
    """

    SPEED_PRESETS = {
        "1x": 1.0,
        "10x": 10.0,
        "60x": 60.0,
        "600x": 600.0,
    }

    def __init__(
        self,
        conveyor_id: str = "CV-01",
        default_preset: str = "600x",
        seed: int = 42,
        broadcast_callback: Optional[Callable[[Dict[str, Any]], Coroutine[Any, Any, None]]] = None,
    ):
        self.conveyor_id = conveyor_id
        self.preset = default_preset
        self.time_acceleration = self.SPEED_PRESETS.get(default_preset, 600.0)
        self.seed = seed
        self.broadcast_callback = broadcast_callback

        # Run identification so resets do not mix data
        self.run_id = self._generate_run_id()

        # Hold critical laps and auto loop settings
        self.hold_critical_laps = settings.SIM_HOLD_CRITICAL_LAPS
        self.auto_loop = settings.SIM_AUTO_LOOP
        self.max_stored_events = settings.SIM_MAX_STORED_EVENTS

        # Scenario and fusion engines
        self.scenario = SpliceDegradationScenario(target_joint_code="J04", seed=seed)
        self.fusion_engine = FusionEngine()

        # Conveyor physical parameters (defaults matching seed data)
        self.loop_length_m = 4800.0
        self.nominal_speed_mps = 2.45
        self.nominal_load_pct = 80.0

        # Runtime state
        self.running = False
        self.paused = False
        self.current_belt_position_m = 0.0
        self.current_lap = 0
        self.sim_time = datetime.datetime.utcnow()
        self._task: Optional[asyncio.Task] = None

        # Tracking for once-per-lap summary emission
        self.joints_passed_this_lap: Set[str] = set()

        # Tracking for critical laps hold
        self.critical_laps_held = 0
        self.last_critical_counted_lap = -1
        self.completed_hold = False

        # Cache of joints sorted by position
        self.joints: List[Dict[str, Any]] = []
        self.station_id: Optional[str] = None
        self.station_position_m: float = 0.0
        self.last_joint_healths: Dict[str, float] = {}

    def _generate_run_id(self) -> str:
        return f"run_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"

    def get_scenario_phase(self) -> str:
        """Determines the current lifecycle phase of the degradation scenario."""
        if self.completed_hold:
            return "COMPLETED"

        target_code = self.scenario.target_joint_code
        target_state = self.fusion_engine.confirmed_states.get(
            f"CV01_{target_code}",
            self.fusion_engine.confirmed_states.get(target_code, HealthState.HEALTHY)
        )

        if target_state == HealthState.CRITICAL:
            return "CRITICAL_HOLD"
        elif target_state in (HealthState.WATCH, HealthState.MAINTENANCE_REQUIRED):
            return "DEGRADING"
        else:
            return "HEALTHY"

    def set_speed_preset(self, preset: str):
        """Change speed preset: 1x, 10x, 60x, 600x."""
        if preset in self.SPEED_PRESETS:
            self.preset = preset
            self.time_acceleration = self.SPEED_PRESETS[preset]
            logger.info(f"Simulator speed set to preset {preset} ({self.time_acceleration}x)")
        else:
            raise ValueError(f"Invalid preset {preset}. Allowed: {list(self.SPEED_PRESETS.keys())}")

    def pause(self):
        self.paused = True
        logger.info("Simulator paused")

    def resume(self):
        self.paused = False
        logger.info("Simulator resumed")

    def load_topology(self, db: Session):
        """Loads conveyor, belt, joints, and stations from the database."""
        conveyor = db.query(Conveyor).filter(Conveyor.id == self.conveyor_id).first()
        if not conveyor:
            logger.warning(f"Conveyor {self.conveyor_id} not found in DB")
            return

        self.loop_length_m = conveyor.loop_length_m
        self.nominal_speed_mps = conveyor.speed_rating_mps

        station = db.query(Station).filter(Station.conveyor_id == self.conveyor_id).first()
        if station:
            self.station_id = station.id
            self.station_position_m = station.position_m

        # Load joints from first belt
        if conveyor.belts:
            belt = conveyor.belts[0]
            db_joints = (
                db.query(Joint)
                .filter(Joint.belt_id == belt.id)
                .order_by(Joint.position_m.asc())
                .all()
            )
            self.joints = [
                {
                    "id": j.id,
                    "code": j.joint_code,
                    "position_m": j.position_m,
                    "baseline": j.baseline_data or {},
                }
                for j in db_joints
            ]
            for j in self.joints:
                self.last_joint_healths[j["code"]] = 95.0

    async def start(self):
        """Starts the asynchronous simulation loop."""
        if self.running:
            return

        db = SessionLocal()
        try:
            self.load_topology(db)
        finally:
            db.close()

        self.running = True
        self.paused = False
        self._task = asyncio.create_task(self._run_loop())
        logger.info(f"Simulator started for {self.conveyor_id} [Run: {self.run_id}, Preset: {self.preset}]")

    async def stop(self):
        """Stops the simulation loop."""
        self.running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("Simulator stopped")

    def reset(self, new_run: bool = True):
        """Resets the simulation to lap 0 and initial state."""
        if new_run:
            self.run_id = self._generate_run_id()
        self.current_belt_position_m = 0.0
        self.current_lap = 0
        self.sim_time = datetime.datetime.utcnow()
        self.critical_laps_held = 0
        self.last_critical_counted_lap = -1
        self.completed_hold = False
        self.joints_passed_this_lap.clear()
        self.scenario.reset()
        self.fusion_engine.reset_all()
        for j in self.joints:
            self.last_joint_healths[j["code"]] = 95.0
        logger.info(f"Simulator reset. New Run ID: {self.run_id}")

    async def _run_loop(self):
        """
        Internal simulation tick loop.
        Ticks at 10 Hz (every 0.1s real time).
        """
        tick_interval_real_sec = 0.1

        while self.running:
            start_time = asyncio.get_event_loop().time()

            if not self.paused and self.joints:
                # Calculate simulated elapsed time and distance
                sim_dt_sec = tick_interval_real_sec * self.time_acceleration
                self.sim_time += datetime.timedelta(seconds=sim_dt_sec)
                distance_traveled = self.nominal_speed_mps * sim_dt_sec

                prev_position = self.current_belt_position_m
                new_position = (prev_position + distance_traveled) % self.loop_length_m

                # Check if we completed a lap boundary
                if new_position < prev_position:
                    self.current_lap += 1

                # Check which joints passed the station during this interval
                crossed_joints = self._detect_station_crossings(prev_position, distance_traveled)

                if crossed_joints:
                    await self._process_crossed_joints(crossed_joints)

                self.current_belt_position_m = new_position

            elapsed = asyncio.get_event_loop().time() - start_time
            sleep_duration = max(0.01, tick_interval_real_sec - elapsed)
            await asyncio.sleep(sleep_duration)

    def _detect_station_crossings(self, prev_pos: float, distance: float) -> List[Dict[str, Any]]:
        """
        Determines which joints crossed the stationary inspection station.
        Station is at station_position_m (e.g. 0 m).
        """
        crossed = []
        for joint in self.joints:
            joint_pos = joint["position_m"]
            req_advance = (self.station_position_m - joint_pos - prev_pos) % self.loop_length_m
            if 0.0 <= req_advance < distance:
                crossed.append(joint)
        return crossed

    async def _process_crossed_joints(self, crossed_joints: List[Dict[str, Any]]):
        """Processes pass events for all crossed joints."""
        db = SessionLocal()
        try:
            for joint in crossed_joints:
                joint_code = joint["code"]
                joint_id = joint["id"]

                # 1. Simulator generates ONLY raw sensor and vision signals
                raw_signals = self.scenario.generate_pass_signals(
                    joint_code=joint_code,
                    lap_no=self.current_lap,
                    belt_speed=self.nominal_speed_mps,
                    belt_load=self.nominal_load_pct,
                )

                # 2. Fusion Engine computes health, risk, state, persistence, and corroboration
                fusion_result = self.fusion_engine.process_pass_event(
                    joint_id=joint_id,
                    lap_no=self.current_lap,
                    detections=raw_signals["detections"],
                    features=raw_signals["features"],
                    quality_scores=raw_signals["quality_scores"],
                    baseline=joint.get("baseline", {}),
                )

                self.last_joint_healths[joint_code] = fusion_result["h_joint"]

                # 3. Persist to database
                pass_event_id = f"pe_{uuid.uuid4().hex[:12]}"
                t_enter = self.sim_time
                t_exit = t_enter + datetime.timedelta(seconds=0.8)

                db_pass = PassEvent(
                    id=pass_event_id,
                    run_id=self.run_id,
                    joint_id=joint_id,
                    station_id=self.station_id or "ST-01",
                    lap_no=self.current_lap,
                    t_enter=t_enter,
                    t_exit=t_exit,
                    speed_mps=self.nominal_speed_mps,
                    load_pct=self.nominal_load_pct,
                    provenance=Provenance.SIMULATED,
                )
                db.add(db_pass)

                # Add detections
                for det in raw_signals["detections"]:
                    db_det = Detection(
                        id=f"det_{uuid.uuid4().hex[:10]}",
                        pass_event_id=pass_event_id,
                        defect_class=det["defect_class"],
                        confidence=det["confidence"],
                        bbox_json=det.get("bbox"),
                        model_version="yolov8n-nexvion-v1.0",
                    )
                    db.add(db_det)

                # Add features
                for mod_name, feats in raw_signals["features"].items():
                    mod_enum = Modality(mod_name)
                    q_score = raw_signals["quality_scores"].get(mod_name, 1.0)
                    db_feat = Feature(
                        id=f"feat_{uuid.uuid4().hex[:10]}",
                        pass_event_id=pass_event_id,
                        modality=mod_enum,
                        features_json=feats,
                        quality_score=q_score,
                    )
                    db.add(db_feat)

                # Add health snapshot
                db_snap = HealthSnapshot(
                    id=f"snap_{uuid.uuid4().hex[:10]}",
                    joint_id=joint_id,
                    pass_event_id=pass_event_id,
                    h_pass=fusion_result["h_pass"],
                    h_joint=fusion_result["h_joint"],
                    risk_score=fusion_result["risk_score"],
                    state=fusion_result["state"],
                    confidence=fusion_result["confidence"],
                    contributors_json=fusion_result["contributors"],
                )
                db.add(db_snap)

                # Add prediction
                rul_payload = fusion_result["rul"]
                db_pred = Prediction(
                    id=f"pred_{uuid.uuid4().hex[:10]}",
                    joint_id=joint_id,
                    pass_event_id=pass_event_id,
                    horizon_hours=168.0,
                    p_breach=round(1.0 - (fusion_result["h_joint"] / 100.0), 3),
                    rul_status=rul_payload["status"],
                    rul_low_days=rul_payload["low_days"],
                    rul_high_days=rul_payload["high_days"],
                )
                db.add(db_pred)

                # Trigger alert if state is WATCH or above and confirmed
                if fusion_result["state"] in (
                    HealthState.WATCH,
                    HealthState.MAINTENANCE_REQUIRED,
                    HealthState.CRITICAL,
                ):
                    severity_map = {
                        HealthState.WATCH: Severity.WATCH,
                        HealthState.MAINTENANCE_REQUIRED: Severity.WARNING,
                        HealthState.CRITICAL: Severity.CRITICAL,
                    }
                    severity = severity_map[fusion_result["state"]]
                    db_alert = Alert(
                        id=f"alt_{uuid.uuid4().hex[:10]}",
                        joint_id=joint_id,
                        pass_event_id=pass_event_id,
                        severity=severity,
                        state=AlertState.ACTIVE,
                        title=f"{severity.value} Condition on Joint {joint_code}",
                        description=f"Joint health dropped to {fusion_result['h_joint']:.1f}% with risk score {fusion_result['risk_score']:.2f}.",
                        evidence_json={
                            "contributors": fusion_result["contributors"],
                            "abnormal_modalities": fusion_result["abnormal_modalities"],
                            "is_corroborated": fusion_result["is_corroborated"],
                        },
                    )
                    db.add(db_alert)

                db.commit()

                # 4. WebSocket Broadcast: Health update event
                if self.broadcast_callback:
                    health_msg = {
                        "type": "health_update",
                        "ts": self.sim_time.isoformat() + "Z",
                        "run_id": self.run_id,
                        "conveyor_id": self.conveyor_id,
                        "joint_id": joint_code,
                        "pass_event_id": pass_event_id,
                        "lap_no": self.current_lap,
                        "health": fusion_result["h_joint"],
                        "state": fusion_result["state"].value,
                        "confidence": fusion_result["confidence"],
                        "risk": fusion_result["risk_score"],
                        "rul": {
                            "status": rul_payload["status"].value,
                            "reason": rul_payload.get("reason"),
                            "low_days": rul_payload["low_days"],
                            "high_days": rul_payload["high_days"],
                        },
                        "contributors": fusion_result["contributors"],
                        "provenance": Provenance.SIMULATED.value,
                    }
                    await self.broadcast_callback(health_msg)

                # Check critical hold condition on target joint J04
                if joint_code == self.scenario.target_joint_code:
                    if fusion_result["state"] == HealthState.CRITICAL:
                        if self.last_critical_counted_lap != self.current_lap:
                            self.last_critical_counted_lap = self.current_lap
                            self.critical_laps_held += 1
                            logger.info(
                                f"Target joint {joint_code} held Critical for {self.critical_laps_held}/{self.hold_critical_laps} laps"
                            )

                            if self.critical_laps_held >= self.hold_critical_laps:
                                self.completed_hold = True
                                action = "RESETTING" if self.auto_loop else "PAUSED"
                                logger.info(f"Target joint {joint_code} completed critical hold. Action: {action}")

                                if self.broadcast_callback:
                                    scenario_evt = {
                                        "type": "scenario_event",
                                        "ts": self.sim_time.isoformat() + "Z",
                                        "run_id": self.run_id,
                                        "event": "CRITICAL_HOLD_COMPLETED",
                                        "scenario": "splice_degradation",
                                        "target_joint": joint_code,
                                        "critical_laps_held": self.critical_laps_held,
                                        "action": action,
                                        "provenance": Provenance.SIMULATED.value,
                                    }
                                    await self.broadcast_callback(scenario_evt)

                                if self.auto_loop:
                                    self.reset(new_run=True)
                                else:
                                    self.pause()

                # Track passed joints for the current lap
                self.joints_passed_this_lap.add(joint_code)

                # Requirement 1: conveyor_summary emitted ONCE per lap (after the last joint of that lap)
                if len(self.joints) > 0 and len(self.joints_passed_this_lap) >= len(self.joints):
                    if self.broadcast_callback:
                        healths = list(self.last_joint_healths.values())
                        risk_idx, avg_h, worst_h = self.fusion_engine.compute_conveyor_risk_index(healths)
                        worst_joint = min(self.last_joint_healths.items(), key=lambda x: x[1])[0]

                        summary_msg = {
                            "type": "conveyor_summary",
                            "ts": self.sim_time.isoformat() + "Z",
                            "run_id": self.run_id,
                            "conveyor_id": self.conveyor_id,
                            "lap_no": self.current_lap,
                            "conveyor_risk_index": risk_idx,
                            "average_health": avg_h,
                            "worst_joint_id": worst_joint,
                            "worst_joint_health": worst_h,
                            "active_alerts_count": sum(1 for h in healths if h < 85.0),
                            "speed_mps": self.nominal_speed_mps,
                            "provenance": Provenance.SIMULATED.value,
                        }
                        await self.broadcast_callback(summary_msg)

                    self.joints_passed_this_lap.clear()

            # Requirement 2: Cap stored pass-event rows in SQLite so DB does not grow without limit
            self._prune_excess_events(db)

        except Exception as e:
            db.rollback()
            logger.error(f"Error processing pass events: {e}", exc_info=True)
        finally:
            db.close()

    def _prune_excess_events(self, db: Session):
        """Caps the number of stored pass events to settings.SIM_MAX_STORED_EVENTS."""
        try:
            total_count = db.query(PassEvent).count()
            if total_count > self.max_stored_events:
                excess = total_count - self.max_stored_events
                old_ids_q = (
                    db.query(PassEvent.id)
                    .order_by(PassEvent.t_enter.asc())
                    .limit(excess)
                    .all()
                )
                old_ids = [r[0] for r in old_ids_q]
                if old_ids:
                    db.query(Detection).filter(Detection.pass_event_id.in_(old_ids)).delete(synchronize_session=False)
                    db.query(Feature).filter(Feature.pass_event_id.in_(old_ids)).delete(synchronize_session=False)
                    db.query(HealthSnapshot).filter(HealthSnapshot.pass_event_id.in_(old_ids)).delete(synchronize_session=False)
                    db.query(Alert).filter(Alert.pass_event_id.in_(old_ids)).delete(synchronize_session=False)
                    db.query(Prediction).filter(Prediction.pass_event_id.in_(old_ids)).delete(synchronize_session=False)
                    db.query(PassEvent).filter(PassEvent.id.in_(old_ids)).delete(synchronize_session=False)
                    db.commit()
                    logger.debug(f"Pruned {len(old_ids)} excess pass events from SQLite.")
        except Exception as e:
            db.rollback()
            logger.warning(f"Failed to prune excess pass events: {e}")
