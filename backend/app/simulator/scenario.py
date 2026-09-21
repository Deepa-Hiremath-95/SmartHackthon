import random
from typing import Dict, Any, List
from backend.app.models.enums import Modality, Provenance


class SpliceDegradationScenario:
    """
    Simulates raw physical sensor and vision signals for the conveyor joints.
    Adheres strictly to the requirement: Generates ONLY sensor and vision signals.
    Health, risk, and state are computed exclusively by the FusionEngine.
    Signals saturate at plausible maxima so fused health settles in the 20-35% range.
    """

    def __init__(self, target_joint_code: str = "J04", seed: int = 42, max_degradation_laps: int = 26):
        self.target_joint_code = target_joint_code
        self.seed = seed
        self.max_degradation_laps = max_degradation_laps
        self.rng = random.Random(seed)

    def reset(self):
        """Reset RNG to deterministic seed."""
        self.rng = random.Random(self.seed)

    def generate_pass_signals(
        self,
        joint_code: str,
        lap_no: int,
        belt_speed: float = 2.45,
        belt_load: float = 80.0,
    ) -> Dict[str, Any]:
        """
        Generates raw features and vision detections for a joint passing the inspection station.
        """
        is_target = (joint_code == self.target_joint_code)

        if not is_target:
            # Healthy joint: nominal baseline noise
            progress = 0.0
        else:
            # Target joint J04 degrades monotonically across laps, saturating at 1.0
            progress = min(lap_no / float(self.max_degradation_laps), 1.0)

        # 1. Vision Detections
        # Saturated confidence around 0.80 - 0.84 so vision anomaly score is ~0.80 - 0.84
        detections: List[Dict[str, Any]] = []
        if is_target:
            if progress > 0.70:
                # Severe: splice lift and exposed cords
                conf_lift = min(0.78 + (0.06 * progress) + self.rng.uniform(-0.015, 0.015), 0.84)
                conf_cord = min(0.75 + (0.05 * progress) + self.rng.uniform(-0.015, 0.015), 0.80)
                detections.append({
                    "defect_class": "splice_lift",
                    "confidence": round(conf_lift, 3),
                    "bbox": [240.0, 150.0, 320.0, 85.0],
                })
                detections.append({
                    "defect_class": "cord_or_fabric_exposure",
                    "confidence": round(conf_cord, 3),
                    "bbox": [280.0, 160.0, 140.0, 60.0],
                })
            elif progress > 0.40:
                # Moderate: cover crack and advancing wear
                detections.append({
                    "defect_class": "cover_crack",
                    "confidence": round(0.65 + 0.10 * progress + self.rng.uniform(-0.02, 0.02), 3),
                    "bbox": [220.0, 180.0, 180.0, 45.0],
                })
                detections.append({
                    "defect_class": "cover_wear",
                    "confidence": round(0.60 + 0.08 * progress, 3),
                    "bbox": [200.0, 140.0, 250.0, 90.0],
                })
            elif progress > 0.18:
                # Early onset: cover wear
                detections.append({
                    "defect_class": "cover_wear",
                    "confidence": round(0.50 + 0.12 * progress + self.rng.uniform(-0.02, 0.02), 3),
                    "bbox": [210.0, 160.0, 200.0, 70.0],
                })
        else:
            # Minor harmless surface patch or scuff very rarely on other joints
            if self.rng.random() < 0.05:
                detections.append({
                    "defect_class": "patch",
                    "confidence": round(self.rng.uniform(0.10, 0.25), 3),
                    "bbox": [100.0, 100.0, 50.0, 50.0],
                })

        # 2. Vibration (RMS, Peak, Kurtosis)
        # Nominal: RMS ~ 2.2 mm/s, Kurtosis ~ 3.0.
        # In degradation, RMS saturates around 6.8 - 7.2 mm/s (critical limit is 9.0 mm/s)
        load_factor = (belt_load / 80.0)
        speed_factor = (belt_speed / 2.45)
        base_rms = 2.2 * load_factor * speed_factor

        if is_target:
            vib_rms = base_rms + (4.8 * (progress ** 1.5)) + self.rng.uniform(-0.10, 0.10)
            kurtosis = 3.0 + (1.3 * (progress ** 1.8)) + self.rng.uniform(-0.1, 0.1)
            peak = vib_rms * (1.8 + (0.6 * progress))
        else:
            vib_rms = base_rms + self.rng.uniform(-0.10, 0.10)
            kurtosis = 3.0 + self.rng.uniform(-0.10, 0.10)
            peak = vib_rms * 1.8

        vib_features = {
            "rms_mm_s": round(max(vib_rms, 0.5), 3),
            "peak_mm_s": round(max(peak, 1.0), 3),
            "kurtosis": round(max(kurtosis, 1.5), 3),
            "crest_factor": round(peak / max(vib_rms, 0.1), 3),
        }

        # 3. Thermal (Hotspot delta T in C relative to ambient/belt)
        # Nominal: 1.5 C. In degradation, saturates around 13.0 - 14.5 C (critical limit is 20.0 C)
        if is_target:
            delta_t = 1.5 + (12.5 * (progress ** 1.4)) + self.rng.uniform(-0.25, 0.25)
            hotspot_area = 10.0 + (90.0 * progress)
        else:
            delta_t = 1.5 + self.rng.uniform(-0.20, 0.20)
            hotspot_area = 0.0

        thermal_features = {
            "hotspot_delta_t_c": round(max(delta_t, 0.2), 2),
            "hotspot_area_cm2": round(max(hotspot_area, 0.0), 1),
            "ambient_temp_c": 28.5,
        }

        # 4. Laser Profile Scanner (Lift height, step height in mm)
        # Nominal: step 0.5 mm, lift 0.0 mm.
        # In degradation, lift saturates around 5.2 - 5.7 mm (critical limit is 8.0 mm)
        if is_target:
            lift_height = (5.4 * (progress ** 1.8)) + self.rng.uniform(-0.10, 0.10)
            step_height = 0.5 + (2.5 * progress)
        else:
            lift_height = max(self.rng.uniform(-0.05, 0.10), 0.0)
            step_height = 0.5 + self.rng.uniform(-0.06, 0.06)

        laser_features = {
            "lift_height_mm": round(max(lift_height, 0.0), 2),
            "step_height_mm": round(max(step_height, 0.1), 2),
        }

        # 5. Sensor Quality Scores (PRD 6.3)
        # High quality nominally (0.95 - 1.0)
        quality_scores = {
            Modality.VISION.value: round(self.rng.uniform(0.96, 1.0), 3),
            Modality.VIBRATION.value: round(self.rng.uniform(0.97, 1.0), 3),
            Modality.THERMAL.value: round(self.rng.uniform(0.95, 0.99), 3),
            Modality.LASER.value: round(self.rng.uniform(0.96, 1.0), 3),
        }

        return {
            "joint_code": joint_code,
            "lap_no": lap_no,
            "speed_mps": belt_speed,
            "load_pct": belt_load,
            "detections": detections,
            "features": {
                Modality.VIBRATION.value: vib_features,
                Modality.THERMAL.value: thermal_features,
                Modality.LASER.value: laser_features,
            },
            "quality_scores": quality_scores,
            "provenance": Provenance.SIMULATED.value,
        }
