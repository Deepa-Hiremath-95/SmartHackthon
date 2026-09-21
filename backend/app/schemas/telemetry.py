from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from backend.app.models.enums import (
    Provenance,
    RULStatus,
    HealthState,
    Severity,
    AlertState,
    Modality,
)


class RULPayload(BaseModel):
    """Remaining Useful Life estimation with non-negotiable status and reason."""
    status: RULStatus = RULStatus.UNAVAILABLE
    reason: Optional[str] = None  # e.g., "no_degradation_trend", "insufficient_history"
    low_days: Optional[float] = None
    high_days: Optional[float] = None


class DetectionPayload(BaseModel):
    defect_class: str
    confidence: float
    bbox: Optional[List[float]] = None  # [x, y, w, h]


class ModalityFeaturePayload(BaseModel):
    modality: Modality
    features: Dict[str, Any]
    quality_score: float = 1.0


class HealthUpdateMessage(BaseModel):
    """Live health update broadcast over WebSocket for a joint pass."""
    type: str = "health_update"
    ts: str
    run_id: Optional[str] = None
    conveyor_id: str
    joint_id: str
    pass_event_id: str
    lap_no: int
    health: float
    state: HealthState
    confidence: float
    risk: float
    rul: RULPayload
    contributors: Dict[str, Any]
    provenance: Provenance = Provenance.SIMULATED


class ConveyorSummaryMessage(BaseModel):
    """Aggregated conveyor state broadcast over WebSocket (once per lap)."""
    type: str = "conveyor_summary"
    ts: str
    run_id: Optional[str] = None
    conveyor_id: str
    average_health: float
    worst_joint_id: str
    worst_joint_health: float
    conveyor_risk_index: float
    active_alerts_count: int
    lap_no: int
    speed_mps: float
    provenance: Provenance = Provenance.SIMULATED


class AlertMessage(BaseModel):
    """Alert event message when joint damage exceeds persistence thresholds."""
    type: str = "alert"
    ts: str
    run_id: Optional[str] = None
    alert_id: str
    conveyor_id: str
    joint_id: str
    pass_event_id: str
    severity: Severity
    state: AlertState = AlertState.ACTIVE
    title: str
    description: Optional[str] = None
    evidence: Dict[str, Any]
    provenance: Provenance = Provenance.SIMULATED


class ScenarioEventMessage(BaseModel):
    """Event emitted when simulation scenario milestones are reached (e.g. critical hold)."""
    type: str = "scenario_event"
    ts: str
    run_id: str
    event: str
    scenario: str
    target_joint: str
    critical_laps_held: int
    action: str
    provenance: Provenance = Provenance.SIMULATED


class PassEventMessage(BaseModel):
    """Full pass-event representation including raw features and detections."""
    type: str = "pass_event"
    ts: str
    run_id: Optional[str] = None
    conveyor_id: str
    joint_id: str
    pass_event_id: str
    lap_no: int
    speed_mps: float
    load_pct: float
    detections: List[DetectionPayload] = []
    features: Dict[str, Any] = {}
    quality_scores: Dict[str, float] = {}
    provenance: Provenance = Provenance.SIMULATED
