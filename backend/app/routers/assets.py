from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.entities import Conveyor, Joint, PassEvent, Alert, HealthSnapshot
from backend.app.models.enums import AlertState, Provenance

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
        results.append({
            "id": j.id,
            "joint_code": j.joint_code,
            "belt_id": j.belt_id,
            "position_m": j.position_m,
            "splice_type": j.splice_type,
            "health": latest_snap.h_joint if latest_snap else 100.0,
            "state": latest_snap.state.value if latest_snap else "HEALTHY",
            "risk_score": latest_snap.risk_score if latest_snap else 0.0,
            "provenance": Provenance.SIMULATED.value,
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
