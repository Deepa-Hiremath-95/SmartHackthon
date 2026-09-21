from typing import Dict, Any, List, Optional, Tuple
from collections import deque
from backend.app.models.enums import (
    HealthState,
    Severity,
    Modality,
    RULStatus,
    Provenance,
)

# Standard severity ordering for comparison
STATE_SEVERITY_ORDER = {
    HealthState.HEALTHY: 0,
    HealthState.WATCH: 1,
    HealthState.MAINTENANCE_REQUIRED: 2,
    HealthState.CRITICAL: 3,
}

SEVERITY_TO_STATE = {
    Severity.INFO: HealthState.HEALTHY,
    Severity.WATCH: HealthState.WATCH,
    Severity.WARNING: HealthState.MAINTENANCE_REQUIRED,
    Severity.CRITICAL: HealthState.CRITICAL,
}

STATE_TO_SEVERITY = {
    HealthState.HEALTHY: Severity.INFO,
    HealthState.WATCH: Severity.WATCH,
    HealthState.MAINTENANCE_REQUIRED: Severity.WARNING,
    HealthState.CRITICAL: Severity.CRITICAL,
}


class ModalityScorer:
    """Calculates normalized anomaly scores s_m in [0, 1] per modality."""

    @staticmethod
    def score_vision(detections: List[Dict[str, Any]]) -> Tuple[float, float, Optional[str]]:
        """
        Calculates vision anomaly score and model confidence.
        Returns (score, confidence, top_defect_class).
        """
        if not detections:
            return 0.0, 1.0, None

        defect_weights = {
            "splice_lift": 1.0,
            "cord_or_fabric_exposure": 0.95,
            "tear_or_rip": 1.0,
            "cover_crack": 0.60,
            "cover_wear": 0.35,
            "missing_or_loose_fastener": 0.70,
            "patch": 0.20,
        }

        max_score = 0.0
        max_conf = 0.85
        top_defect = None

        for det in detections:
            d_class = det.get("defect_class", "")
            d_conf = float(det.get("confidence", 0.0))
            weight = defect_weights.get(d_class, 0.3)
            score = weight * d_conf
            if score > max_score:
                max_score = score
                max_conf = d_conf
                top_defect = d_class

        return min(max_score, 1.0), max_conf, top_defect

    @staticmethod
    def score_vibration(features: Dict[str, Any], baseline: Dict[str, Any]) -> Tuple[float, float]:
        """
        Calculates vibration anomaly score based on RMS and Kurtosis deviations.
        Baseline nominal: RMS ~ 2.2 mm/s, Kurtosis ~ 3.0.
        Critical threshold: RMS ~ 9.0 mm/s.
        """
        rms = float(features.get("rms_mm_s", 2.2))
        base_rms = float(baseline.get("rms_mm_s", 2.2))
        crit_rms = float(baseline.get("crit_rms_mm_s", 9.0))

        if rms <= base_rms:
            score = 0.0
        else:
            score = (rms - base_rms) / max((crit_rms - base_rms), 0.1)

        kurtosis = float(features.get("kurtosis", 3.0))
        if kurtosis > 4.5:
            score += 0.15

        return min(max(score, 0.0), 1.0), 0.95

    @staticmethod
    def score_thermal(features: Dict[str, Any], baseline: Dict[str, Any]) -> Tuple[float, float]:
        """
        Calculates thermal anomaly score based on hotspot temperature rise.
        Baseline nominal: delta_t ~ 1.5 C.
        Critical threshold: delta_t ~ 20.0 C.
        """
        delta_t = float(features.get("hotspot_delta_t_c", 1.5))
        base_dt = float(baseline.get("hotspot_delta_t_c", 1.5))
        crit_dt = float(baseline.get("crit_delta_t_c", 20.0))

        if delta_t <= base_dt:
            score = 0.0
        else:
            score = (delta_t - base_dt) / max((crit_dt - base_dt), 0.1)

        return min(max(score, 0.0), 1.0), 0.92

    @staticmethod
    def score_laser(features: Dict[str, Any], baseline: Dict[str, Any]) -> Tuple[float, float]:
        """
        Calculates laser profile anomaly score based on joint lift and step height.
        Baseline nominal: step ~ 0.5 mm, lift ~ 0.0 mm.
        Critical threshold: lift ~ 8.0 mm.
        """
        lift = float(features.get("lift_height_mm", 0.0))
        base_lift = float(baseline.get("lift_height_mm", 0.0))
        crit_lift = float(baseline.get("crit_lift_height_mm", 8.0))

        if lift <= base_lift:
            score = 0.0
        else:
            score = (lift - base_lift) / max((crit_lift - base_lift), 0.1)

        return min(max(score, 0.0), 1.0), 0.90


class FusionEngine:
    """
    Multimodal fusion, health calculation, persistence/hysteresis filter,
    corroboration validation, and conveyor risk index computation.
    """

    def __init__(
        self,
        weights: Optional[Dict[str, float]] = None,
        persistence_k: int = 3,
        persistence_n: int = 5,
        clear_window: int = 5,
        ewma_alpha: float = 0.35,
        min_passes_for_rul: int = 5,
    ):
        # Default expert weights per PRD Section 6.4
        self.weights = weights or {
            Modality.VISION.value: 0.35,
            Modality.VIBRATION.value: 0.25,
            Modality.THERMAL.value: 0.20,
            Modality.LASER.value: 0.20,
        }
        self.persistence_k = persistence_k
        self.persistence_n = persistence_n
        self.clear_window = clear_window
        self.ewma_alpha = ewma_alpha
        self.min_passes_for_rul = min_passes_for_rul

        # State tracking per joint: {joint_id: deque(maxlen=5)}
        self.candidate_history: Dict[str, deque] = {}
        # Confirmed active state per joint: {joint_id: HealthState}
        self.confirmed_states: Dict[str, HealthState] = {}
        # Smoothed health per joint: {joint_id: float}
        self.smoothed_health: Dict[str, float] = {}
        # Pass counts per joint: {joint_id: int}
        self.pass_counts: Dict[str, int] = {}
        # Health history per joint for trend regression: {joint_id: deque([(lap_no, h_joint)], maxlen=15)}
        self.health_history: Dict[str, deque] = {}

    def reset_joint(self, joint_id: str):
        """Resets tracking history for a specific joint."""
        self.candidate_history.pop(joint_id, None)
        self.confirmed_states.pop(joint_id, None)
        self.smoothed_health.pop(joint_id, None)
        self.pass_counts.pop(joint_id, None)
        self.health_history.pop(joint_id, None)

    def reset_all(self):
        """Resets all tracking histories across all joints."""
        self.candidate_history.clear()
        self.confirmed_states.clear()
        self.smoothed_health.clear()
        self.pass_counts.clear()
        self.health_history.clear()

    def process_pass_event(
        self,
        joint_id: str,
        lap_no: int,
        detections: List[Dict[str, Any]],
        features: Dict[str, Dict[str, Any]],
        quality_scores: Dict[str, float],
        baseline: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Executes multimodal fusion for one joint pass.
        Returns full snapshot including fused risk, health, confirmed state,
        corroboration status, RUL payload, and contributors breakdown.
        """
        baseline = baseline or {}
        self.pass_counts[joint_id] = self.pass_counts.get(joint_id, 0) + 1
        pass_count = self.pass_counts[joint_id]

        # 1. Compute per-modality anomaly scores s_m and confidence c_m = q_m * model_conf
        modality_scores = {}
        modality_confs = {}
        abnormal_modalities = []
        top_defect_class = None

        # Vision
        q_vis = quality_scores.get(Modality.VISION.value, 1.0)
        s_vis, m_conf_vis, top_defect = ModalityScorer.score_vision(detections)
        c_vis = q_vis * m_conf_vis
        modality_scores[Modality.VISION.value] = s_vis
        modality_confs[Modality.VISION.value] = c_vis
        top_defect_class = top_defect
        if s_vis >= 0.30:
            abnormal_modalities.append(Modality.VISION.value)

        # Vibration
        vib_feats = features.get(Modality.VIBRATION.value, {})
        q_vib = quality_scores.get(Modality.VIBRATION.value, 1.0)
        s_vib, m_conf_vib = ModalityScorer.score_vibration(vib_feats, baseline.get("vibration", {}))
        c_vib = q_vib * m_conf_vib
        modality_scores[Modality.VIBRATION.value] = s_vib
        modality_confs[Modality.VIBRATION.value] = c_vib
        if s_vib >= 0.30:
            abnormal_modalities.append(Modality.VIBRATION.value)

        # Thermal
        therm_feats = features.get(Modality.THERMAL.value, {})
        q_therm = quality_scores.get(Modality.THERMAL.value, 1.0)
        s_therm, m_conf_therm = ModalityScorer.score_thermal(therm_feats, baseline.get("thermal", {}))
        c_therm = q_therm * m_conf_therm
        modality_scores[Modality.THERMAL.value] = s_therm
        modality_confs[Modality.THERMAL.value] = c_therm
        if s_therm >= 0.30:
            abnormal_modalities.append(Modality.THERMAL.value)

        # Laser
        laser_feats = features.get(Modality.LASER.value, {})
        q_laser = quality_scores.get(Modality.LASER.value, 1.0)
        s_laser, m_conf_laser = ModalityScorer.score_laser(laser_feats, baseline.get("laser", {}))
        c_laser = q_laser * m_conf_laser
        modality_scores[Modality.LASER.value] = s_laser
        modality_confs[Modality.LASER.value] = c_laser
        if s_laser >= 0.30:
            abnormal_modalities.append(Modality.LASER.value)

        # 2. Weighted multimodal fusion: R_fused = Σ (w_m * c_m * s_m) / Σ (w_m * c_m)
        weighted_risk_sum = 0.0
        total_weight_conf = 0.0
        contributors = {}

        for mod, weight in self.weights.items():
            s_m = modality_scores.get(mod, 0.0)
            c_m = modality_confs.get(mod, 0.0)
            effective_w = weight * c_m
            weighted_risk_sum += effective_w * s_m
            total_weight_conf += effective_w

            contributors[mod] = {
                "score": round(s_m, 4),
                "confidence": round(c_m, 4),
                "quality": round(quality_scores.get(mod, 1.0), 3),
                "weight": weight,
            }

        if total_weight_conf > 0.0:
            r_fused = weighted_risk_sum / total_weight_conf
            overall_confidence = total_weight_conf / sum(self.weights.values())
        else:
            r_fused = 0.0
            overall_confidence = 0.0

        r_fused = min(max(r_fused, 0.0), 1.0)
        h_pass = 100.0 * (1.0 - r_fused)

        # 3. EWMA smoothed joint health
        prev_smoothed = self.smoothed_health.get(joint_id, h_pass)
        h_joint = (self.ewma_alpha * h_pass) + ((1.0 - self.ewma_alpha) * prev_smoothed)
        self.smoothed_health[joint_id] = h_joint

        # 4. Map per-pass health to unconstrained candidate state
        if h_pass >= 85.0:
            raw_state = HealthState.HEALTHY
        elif h_pass >= 70.0:
            raw_state = HealthState.WATCH
        elif h_pass >= 50.0:
            raw_state = HealthState.MAINTENANCE_REQUIRED
        else:
            raw_state = HealthState.CRITICAL

        # 5. Corroboration Rule (PRD Section 6.4 non-negotiable rule):
        # Alerts above WATCH need corroboration from at least 2 different sensor modalities,
        # unless configured as a safety-critical tear/rip rule.
        safety_override = (top_defect_class in ("tear_or_rip",) and s_vis > 0.85)
        is_corroborated = len(abnormal_modalities) >= 2 or safety_override

        if not is_corroborated and STATE_SEVERITY_ORDER[raw_state] > STATE_SEVERITY_ORDER[HealthState.WATCH]:
            candidate_state = HealthState.WATCH
        else:
            candidate_state = raw_state

        # 6. Persistence & Hysteresis (PRD Section 6.5: k of n passes, default 3 of 5)
        if joint_id not in self.candidate_history:
            self.candidate_history[joint_id] = deque(maxlen=self.persistence_n)
        history = self.candidate_history[joint_id]
        history.append(candidate_state)

        current_confirmed = self.confirmed_states.get(joint_id, HealthState.HEALTHY)
        target_confirmed = current_confirmed

        current_level = STATE_SEVERITY_ORDER[current_confirmed]
        candidate_level = STATE_SEVERITY_ORDER[candidate_state]

        if candidate_level > current_level:
            # Check upward transition: requires at least k passes >= candidate_state in last n passes
            matching_passes = sum(
                1 for s in history if STATE_SEVERITY_ORDER[s] >= candidate_level
            )
            if matching_passes >= self.persistence_k:
                target_confirmed = candidate_state
        elif candidate_level < current_level:
            # Check downward transition: requires clear window (all n passes <= candidate_state)
            if len(history) >= self.clear_window and all(
                STATE_SEVERITY_ORDER[s] <= candidate_level for s in history
            ):
                target_confirmed = candidate_state

        self.confirmed_states[joint_id] = target_confirmed

        # 7. Prognostics / RUL handling (PRD 6.6 & user requirement)
        # Record health history for trend regression
        if joint_id not in self.health_history:
            self.health_history[joint_id] = deque(maxlen=15)
        self.health_history[joint_id].append((lap_no, h_joint))

        history_pts = list(self.health_history[joint_id])
        if len(history_pts) < self.min_passes_for_rul:
            rul_status = RULStatus.UNAVAILABLE
            rul_reason = "insufficient_history"
            low_days = None
            high_days = None
        else:
            n_pts = len(history_pts)
            x_vals = [float(p[0]) for p in history_pts]
            y_vals = [float(p[1]) for p in history_pts]

            # If all lap numbers in history are identical, index by pass sequence
            if max(x_vals) == min(x_vals):
                x_vals = [float(i) for i in range(n_pts)]

            x_mean = sum(x_vals) / n_pts
            y_mean = sum(y_vals) / n_pts
            denom = sum((x - x_mean) ** 2 for x in x_vals)
            slope = (sum((x - x_mean) * (y - y_mean) for x, y in zip(x_vals, y_vals)) / denom) if denom > 0 else 0.0

            # Significant downward degradation trend check (slope < -0.15 points per pass/lap)
            if slope >= -0.15:
                rul_status = RULStatus.UNAVAILABLE
                rul_reason = "no_degradation_trend"
                low_days = None
                high_days = None
            else:
                rul_status = RULStatus.DEMO
                rul_reason = None
                abs_slope = abs(slope)

                # Time-to-threshold calculation:
                # Threshold for critical health state breach is H = 50.0
                if h_joint > 50.0:
                    delta_h = h_joint - 50.0
                    laps_to_threshold = delta_h / abs_slope
                else:
                    # Already critical; estimate remaining margin before functional floor (~20.0)
                    delta_h = max(h_joint - 20.0, 1.0)
                    laps_to_threshold = max(delta_h / abs_slope, 1.0)

                # Convert laps to simulated operational days (~0.8 day of life per simulation progression lap)
                nominal_days = laps_to_threshold * 0.8
                low_days = max(0.5, round(nominal_days * 0.75, 1))
                high_days = max(low_days + 0.5, round(nominal_days * 1.35, 1))

        return {
            "joint_id": joint_id,
            "lap_no": lap_no,
            "pass_count": pass_count,
            "h_pass": round(h_pass, 2),
            "h_joint": round(h_joint, 2),
            "risk_score": round(r_fused, 4),
            "state": target_confirmed,
            "raw_candidate_state": candidate_state,
            "confidence": round(overall_confidence, 4),
            "is_corroborated": is_corroborated,
            "abnormal_modalities": abnormal_modalities,
            "contributors": contributors,
            "rul": {
                "status": rul_status,
                "reason": rul_reason,
                "low_days": low_days,
                "high_days": high_days,
            },
        }

    def compute_conveyor_risk_index(
        self, all_joint_healths: List[float]
    ) -> Tuple[float, float, float]:
        """
        Conveyor-level risk index calculation (PRD Section 6.4):
        Conveyor risk index = 0.6 * weighted_mean + 0.4 * worst_joint.
        Returns (conveyor_risk_index, average_health, worst_health).
        """
        if not all_joint_healths:
            return 100.0, 100.0, 100.0

        average_health = sum(all_joint_healths) / len(all_joint_healths)
        worst_health = min(all_joint_healths)
        risk_index = (0.6 * average_health) + (0.4 * worst_health)

        return round(risk_index, 2), round(average_health, 2), round(worst_health, 2)
