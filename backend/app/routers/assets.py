from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.entities import Conveyor, Joint, PassEvent, Alert, HealthSnapshot, Prediction
from backend.app.models.enums import AlertState, Provenance, RULStatus

router = APIRouter(prefix="/api/v1", tags=["Assets & Telemetry"])


@router.get("/conveyors")
def list_conveyors(db: Session = Depends(get_db)):
    """Returns list of all configured conveyors."""
    conveyors = db.query(Conveyor).all()
    results = []
    for cv in conveyors:
        joint_count = 0
        if cv.belts:
            joint_count = len(cv.belts[0].joints)
        results.append({
            "id": cv.id,
            "name": cv.name,
            "mine_id": cv.mine_id,
            "length_m": cv.length_m,
            "loop_length_m": cv.loop_length_m,
            "speed_rating_mps": cv.speed_rating_mps,
            "joint_count": joint_count,
            "provenance": Provenance.SIMULATED.value,
        })
    return results


@router.get("/conveyors/{conveyor_id}")
def get_conveyor(conveyor_id: str, db: Session = Depends(get_db)):
    """Returns single conveyor details."""
    cv = db.query(Conveyor).filter(Conveyor.id == conveyor_id).first()
    if not cv:
        raise HTTPException(status_code=404, detail=f"Conveyor {conveyor_id} not found")
    
    return {
        "id": cv.id,
        "name": cv.name,
        "mine_id": cv.mine_id,
        "length_m": cv.length_m,
        "loop_length_m": cv.loop_length_m,
        "speed_rating_mps": cv.speed_rating_mps,
        "provenance": Provenance.SIMULATED.value,
    }


@router.get("/conveyors/{conveyor_id}/joints")
def list_conveyor_joints(conveyor_id: str, db: Session = Depends(get_db)):
    """Returns all joints on a conveyor ordered by belt position."""
    cv = db.query(Conveyor).filter(Conveyor.id == conveyor_id).first()
    if not cv:
        raise HTTPException(status_code=404, detail=f"Conveyor {conveyor_id} not found")

    if not cv.belts:
        return []

    belt = cv.belts[0]
    joints = db.query(Joint).filter(Joint.belt_id == belt.id).order_by(Joint.position_m.asc()).all()

    results = []
    for j in joints:
        latest_snap = (
            db.query(HealthSnapshot)
            .filter(HealthSnapshot.joint_id == j.id)
            .order_by(HealthSnapshot.created_at.desc())
            .first()
        )
        latest_pred = (
            db.query(Prediction)
            .filter(Prediction.joint_id == j.id)
            .order_by(Prediction.created_at.desc())
            .first()
        )
        rul_dict = {
            "status": latest_pred.rul_status.value if latest_pred else RULStatus.UNAVAILABLE.value,
            "reason": "no_degradation_trend" if (latest_pred and latest_pred.rul_status == RULStatus.UNAVAILABLE) else ("no_degradation_trend" if not latest_pred else None),
            "low_days": latest_pred.rul_low_days if latest_pred else None,
            "high_days": latest_pred.rul_high_days if latest_pred else None,
        }
        results.append({
            "id": j.id,
            "joint_code": j.joint_code,
            "belt_id": j.belt_id,
            "position_m": j.position_m,
            "splice_type": j.splice_type,
            "health": latest_snap.h_joint if latest_snap else 100.0,
            "state": latest_snap.state.value if latest_snap else "HEALTHY",
            "risk_score": latest_snap.risk_score if latest_snap else 0.0,
            "rul": rul_dict,
            "provenance": Provenance.SIMULATED.value,
        })
    return results


@router.get("/joints/{joint_id}/history")
def get_joint_history(
    joint_id: str,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
):
    """Returns historical pass events and health snapshots for a specific joint."""
    joint = db.query(Joint).filter((Joint.id == joint_id) | (Joint.joint_code == joint_id)).first()
    if not joint:
        raise HTTPException(status_code=404, detail=f"Joint {joint_id} not found")

    snapshots = (
        db.query(HealthSnapshot, PassEvent, Prediction)
        .join(PassEvent, HealthSnapshot.pass_event_id == PassEvent.id)
        .outerjoin(Prediction, HealthSnapshot.pass_event_id == Prediction.pass_event_id)
        .filter(HealthSnapshot.joint_id == joint.id)
        .order_by(PassEvent.t_enter.desc())
        .limit(limit)
        .all()
    )

    results = []
    for snap, pe, pred in reversed(snapshots):
        rul_dict = {
            "status": pred.rul_status.value if pred else RULStatus.UNAVAILABLE.value,
            "reason": "no_degradation_trend" if (pred and pred.rul_status == RULStatus.UNAVAILABLE) else None,
            "low_days": pred.rul_low_days if pred else None,
            "high_days": pred.rul_high_days if pred else None,
        }
        results.append({
            "pass_event_id": pe.id,
            "joint_id": joint.joint_code,
            "lap": pe.lap_no,
            "health": snap.h_joint,
            "h_pass": snap.h_pass,
            "risk_score": snap.risk_score,
            "state": snap.state.value,
            "confidence": snap.confidence,
            "contributors": snap.contributors_json,
            "rul": rul_dict,
            "timestamp": pe.t_enter.isoformat() + "Z",
            "provenance": pe.provenance.value,
        })
    return results


@router.get("/pass-events")
def list_pass_events(
    joint_id: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    """Queries recent pass events."""
    query = db.query(PassEvent).order_by(PassEvent.t_enter.desc())
    if joint_id:
        query = query.filter(PassEvent.joint_id == joint_id)

    events = query.limit(limit).all()
    results = []
    for pe in events:
        results.append({
            "id": pe.id,
            "joint_id": pe.joint_id,
            "station_id": pe.station_id,
            "lap_no": pe.lap_no,
            "t_enter": pe.t_enter.isoformat() + "Z",
            "t_exit": pe.t_exit.isoformat() + "Z",
            "speed_mps": pe.speed_mps,
            "load_pct": pe.load_pct,
            "provenance": pe.provenance.value,
        })
    return results


@router.get("/alerts")
def list_alerts(
    state: Optional[AlertState] = Query(None),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
):
    """Returns alerts ordered by recency."""
    query = db.query(Alert).order_by(Alert.created_at.desc())
    if state:
        query = query.filter(Alert.state == state)

    alerts = query.limit(limit).all()
    return [
        {
            "id": a.id,
            "joint_id": a.joint_id,
            "pass_event_id": a.pass_event_id,
            "severity": a.severity.value,
            "state": a.state.value,
            "title": a.title,
            "description": a.description,
            "evidence": a.evidence_json,
            "created_at": a.created_at.isoformat() + "Z",
            "provenance": Provenance.SIMULATED.value,
        }
        for a in alerts
    ]
