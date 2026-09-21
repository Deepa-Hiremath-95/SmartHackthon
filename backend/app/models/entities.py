import datetime
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    DateTime,
    ForeignKey,
    JSON,
    Enum as SQLEnum,
    Text,
)
from sqlalchemy.orm import relationship

from backend.app.database import Base
from backend.app.models.enums import (
    Provenance,
    RULStatus,
    HealthState,
    Severity,
    Modality,
    AlertState,
)


class Mine(Base):
    __tablename__ = "mines"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    location = Column(String(256), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    conveyors = relationship("Conveyor", back_populates="mine", cascade="all, delete-orphan")


class Conveyor(Base):
    __tablename__ = "conveyors"

    id = Column(String(64), primary_key=True, index=True)
    mine_id = Column(String(64), ForeignKey("mines.id"), nullable=False)
    name = Column(String(128), nullable=False)
    length_m = Column(Float, nullable=False)
    speed_rating_mps = Column(Float, nullable=False, default=2.45)
    loop_length_m = Column(Float, nullable=False, default=4800.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    mine = relationship("Mine", back_populates="conveyors")
    belts = relationship("Belt", back_populates="conveyor", cascade="all, delete-orphan")
    stations = relationship("Station", back_populates="conveyor", cascade="all, delete-orphan")


class Belt(Base):
    __tablename__ = "belts"

    id = Column(String(64), primary_key=True, index=True)
    conveyor_id = Column(String(64), ForeignKey("conveyors.id"), nullable=False)
    belt_type = Column(String(64), nullable=False, default="Steel Cord ST-3150")
    width_mm = Column(Float, nullable=False, default=1800.0)
    thickness_mm = Column(Float, nullable=False, default=22.0)
    total_length_m = Column(Float, nullable=False, default=4800.0)
    install_date = Column(DateTime, default=datetime.datetime.utcnow)

    conveyor = relationship("Conveyor", back_populates="belts")
    joints = relationship("Joint", back_populates="belt", cascade="all, delete-orphan")


class Joint(Base):
    __tablename__ = "joints"

    id = Column(String(64), primary_key=True, index=True)
    belt_id = Column(String(64), ForeignKey("belts.id"), nullable=False)
    joint_code = Column(String(32), nullable=False, index=True)  # e.g., "J01", "J04"
    position_m = Column(Float, nullable=False)                   # belt odometry offset along loop
    splice_type = Column(String(64), default="Finger Splice Hot Vulcanized")
    install_date = Column(DateTime, default=datetime.datetime.utcnow)
    baseline_data = Column(JSON, nullable=True)                  # Commissioning baseline features

    belt = relationship("Belt", back_populates="joints")
    pass_events = relationship("PassEvent", back_populates="joint", cascade="all, delete-orphan")
    health_snapshots = relationship("HealthSnapshot", back_populates="joint", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="joint", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="joint", cascade="all, delete-orphan")


class Station(Base):
    __tablename__ = "stations"

    id = Column(String(64), primary_key=True, index=True)
    conveyor_id = Column(String(64), ForeignKey("conveyors.id"), nullable=False)
    name = Column(String(128), nullable=False)
    position_m = Column(Float, nullable=False, default=0.0)  # station physical location on conveyor
    status = Column(String(32), default="OPERATIONAL")

    conveyor = relationship("Conveyor", back_populates="stations")
    sensors = relationship("Sensor", back_populates="station", cascade="all, delete-orphan")
    pass_events = relationship("PassEvent", back_populates="station", cascade="all, delete-orphan")


class Sensor(Base):
    __tablename__ = "sensors"

    id = Column(String(64), primary_key=True, index=True)
    station_id = Column(String(64), ForeignKey("stations.id"), nullable=False)
    modality = Column(SQLEnum(Modality), nullable=False)
    model_name = Column(String(128), nullable=False)
    sample_rate_hz = Column(Float, default=1000.0)
    status = Column(String(32), default="ONLINE")

    station = relationship("Station", back_populates="sensors")


class PassEvent(Base):
    __tablename__ = "pass_events"

    id = Column(String(64), primary_key=True, index=True)
    run_id = Column(String(64), nullable=True, index=True)
    joint_id = Column(String(64), ForeignKey("joints.id"), nullable=False, index=True)
    station_id = Column(String(64), ForeignKey("stations.id"), nullable=False)
    lap_no = Column(Integer, nullable=False, index=True)
    t_enter = Column(DateTime, nullable=False)
    t_exit = Column(DateTime, nullable=False)
    speed_mps = Column(Float, nullable=False, default=2.45)
    load_pct = Column(Float, nullable=False, default=80.0)
    provenance = Column(SQLEnum(Provenance), nullable=False, default=Provenance.SIMULATED)

    joint = relationship("Joint", back_populates="pass_events")
    station = relationship("Station", back_populates="pass_events")
    detections = relationship("Detection", back_populates="pass_event", cascade="all, delete-orphan")
    features = relationship("Feature", back_populates="pass_event", cascade="all, delete-orphan")
    health_snapshot = relationship("HealthSnapshot", back_populates="pass_event", uselist=False, cascade="all, delete-orphan")


class Detection(Base):
    __tablename__ = "detections"

    id = Column(String(64), primary_key=True, index=True)
    pass_event_id = Column(String(64), ForeignKey("pass_events.id"), nullable=False, index=True)
    defect_class = Column(String(64), nullable=False)
    confidence = Column(Float, nullable=False)
    bbox_json = Column(JSON, nullable=True)  # [x, y, w, h] or segmentation points
    model_version = Column(String(32), default="yolov8n-nexvion-v1.0")

    pass_event = relationship("PassEvent", back_populates="detections")


class Feature(Base):
    __tablename__ = "features"

    id = Column(String(64), primary_key=True, index=True)
    pass_event_id = Column(String(64), ForeignKey("pass_events.id"), nullable=False, index=True)
    modality = Column(SQLEnum(Modality), nullable=False)
    features_json = Column(JSON, nullable=False)
    quality_score = Column(Float, nullable=False, default=1.0)

    pass_event = relationship("PassEvent", back_populates="features")


class HealthSnapshot(Base):
    __tablename__ = "health_snapshots"

    id = Column(String(64), primary_key=True, index=True)
    joint_id = Column(String(64), ForeignKey("joints.id"), nullable=False, index=True)
    pass_event_id = Column(String(64), ForeignKey("pass_events.id"), nullable=False, unique=True)
    h_pass = Column(Float, nullable=False)        # Instantaneous pass health [0..100]
    h_joint = Column(Float, nullable=False)       # EWMA smoothed joint health [0..100]
    risk_score = Column(Float, nullable=False)    # Fused risk [0..1]
    state = Column(SQLEnum(HealthState), nullable=False)
    confidence = Column(Float, nullable=False)
    contributors_json = Column(JSON, nullable=False)  # Weights, anomaly scores per modality
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    joint = relationship("Joint", back_populates="health_snapshots")
    pass_event = relationship("PassEvent", back_populates="health_snapshot")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(String(64), primary_key=True, index=True)
    joint_id = Column(String(64), ForeignKey("joints.id"), nullable=False, index=True)
    pass_event_id = Column(String(64), ForeignKey("pass_events.id"), nullable=True)
    horizon_hours = Column(Float, default=168.0)  # 7 days
    p_breach = Column(Float, nullable=False, default=0.0)
    rul_status = Column(SQLEnum(RULStatus), nullable=False, default=RULStatus.UNAVAILABLE)
    rul_low_days = Column(Float, nullable=True)
    rul_high_days = Column(Float, nullable=True)
    failure_modes_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    joint = relationship("Joint", back_populates="predictions")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(64), primary_key=True, index=True)
    joint_id = Column(String(64), ForeignKey("joints.id"), nullable=False, index=True)
    pass_event_id = Column(String(64), ForeignKey("pass_events.id"), nullable=False)
    severity = Column(SQLEnum(Severity), nullable=False)
    state = Column(SQLEnum(AlertState), nullable=False, default=AlertState.ACTIVE)
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=True)
    evidence_json = Column(JSON, nullable=False)  # Contributing modalities and sensor signals
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    joint = relationship("Joint", back_populates="alerts")
