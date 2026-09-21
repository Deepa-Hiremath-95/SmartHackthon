from enum import Enum


class Provenance(str, Enum):
    """Data provenance tracking origin of telemetry and inferences."""
    REAL_SITE = "REAL_SITE"
    REAL_LAB = "REAL_LAB"
    PUBLIC_PROXY = "PUBLIC_PROXY"
    SIMULATED = "SIMULATED"


class RULStatus(str, Enum):
    """Prognostic Remaining Useful Life credibility and validation state."""
    UNAVAILABLE = "UNAVAILABLE"
    DEMO = "DEMO"
    ESTIMATED = "ESTIMATED"
    VALIDATED = "VALIDATED"


class HealthState(str, Enum):
    """ISA-101 style high-performance HMI discrete health classifications."""
    HEALTHY = "HEALTHY"                # >= 85 (Green circle)
    WATCH = "WATCH"                    # 70 - 84 (Yellow triangle)
    MAINTENANCE_REQUIRED = "MAINTENANCE_REQUIRED"  # 50 - 69 (Orange diamond)
    CRITICAL = "CRITICAL"              # < 50 (Red octagon)


class Severity(str, Enum):
    """Alert severity levels."""
    INFO = "INFO"
    WATCH = "WATCH"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class Modality(str, Enum):
    """Sensor modalities deployed across T1, T2, T3 tiers."""
    VISION = "vision"
    VIBRATION = "vibration"
    THERMAL = "thermal"
    LASER = "laser"
    ACOUSTIC = "acoustic"
    TENSION = "tension"
    SPEED = "speed"


class AlertState(str, Enum):
    """Lifecycle state of an alert."""
    ACTIVE = "ACTIVE"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"
    SHELVED = "SHELVED"
