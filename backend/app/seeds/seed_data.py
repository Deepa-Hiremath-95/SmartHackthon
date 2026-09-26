import logging
from sqlalchemy.orm import Session
from backend.app.database import SessionLocal, Base, engine
from backend.app.models.entities import (
    Mine,
    Conveyor,
    Belt,
    Joint,
    Station,
    Sensor,
)
from backend.app.models.enums import Modality

logger = logging.getLogger("nexvion.seeds")


def seed_database(db: Session):
    """
    Seeds initial assets:
    - 1 Mine: MINE-01
    - 2 Conveyors: CV-01 (Overland Mainline, 3 joints) and CV-02 (Transfer Conveyor, 6 joints)
    - 3 Joints on CV-01 (J01-J03) spaced at 1600m on 4800m loop
    - 6 Joints on CV-02 (J25-J30)
    - Inspection stations and T1/T2 sensor capabilities
    - Commissioning baseline feature thresholds for all joints
    """
    # Check if already seeded
    existing_conveyor = db.query(Conveyor).filter(Conveyor.id == "CV-01").first()
    if existing_conveyor:
        logger.info("Database already seeded. Skipping.")
        return

    logger.info("Seeding database with 2 conveyors and 3 primary joints on CV-01...")

    # 1. Mine
    mine = Mine(
        id="MINE-01",
        name="Apex Iron Ore Mine",
        location="Odisha, India",
    )
    db.add(mine)

    # 2. Primary Conveyor: CV-01
    cv1 = Conveyor(
        id="CV-01",
        mine_id="MINE-01",
        name="CV-01 Overland Mainline",
        length_m=2400.0,
        speed_rating_mps=2.45,
        loop_length_m=4800.0,
    )
    db.add(cv1)

    belt1 = Belt(
        id="BELT-01",
        conveyor_id="CV-01",
        belt_type="Steel Cord ST-3150",
        width_mm=1800.0,
        thickness_mm=22.0,
        total_length_m=4800.0,
    )
    db.add(belt1)

    # Commissioning baseline template
    baseline_template = {
        "vibration": {
            "rms_mm_s": 2.2,
            "crit_rms_mm_s": 9.0,
            "kurtosis": 3.0,
        },
        "thermal": {
            "hotspot_delta_t_c": 1.5,
            "crit_delta_t_c": 20.0,
        },
        "laser": {
            "lift_height_mm": 0.0,
            "step_height_mm": 0.5,
            "crit_lift_height_mm": 8.0,
        },
    }

    # Seed 3 joints on CV-01 (J01, J02, J03 spaced at 1600m on 4800m loop)
    for i in range(1, 4):
        code = f"J{i:02d}"
        pos_m = (i - 1) * 1600.0
        joint = Joint(
            id=f"CV01_{code}",
            belt_id="BELT-01",
            joint_code=code,
            position_m=pos_m,
            splice_type="Finger Splice Hot Vulcanized",
            baseline_data=baseline_template,
        )
        db.add(joint)

    # Inspection Station on CV-01
    st1 = Station(
        id="ST-01",
        conveyor_id="CV-01",
        name="Head Pulley & In-Line Inspection Station",
        position_m=0.0,
        status="OPERATIONAL",
    )
    db.add(st1)

    # Sensors on ST-01 / CV-01 (CAD Digital Twin Hardware Spec)
    sensors_cv1 = [
        (Modality.VISION, "Multispectral Inspection Camera (RGB + NIR 30 FPS)", 30.0),
        (Modality.LASER, "TF-Luna Micro LiDAR 3D Profile Scanner (850nm ToF)", 100.0),
        (Modality.TENSION, "Precision Tension Load Cell (Dual Shear Beam)", 100.0),
        (Modality.VIBRATION, "Inductive Proximity Sensor Array (Internal Rupture / Metallic Cord)", 1000.0),
        (Modality.THERMAL, "FLIR A50 Thermal Infrared Camera", 10.0),
        (Modality.ACOUSTIC, "GRAS 46AE Free-field Acoustic Sensor", 44100.0),
        (Modality.SPEED, "Kubler Sendix 5000 Optical Shaft Encoder", 1000.0),
    ]
    for idx, (mod, model, rate) in enumerate(sensors_cv1, start=1):
        sensor = Sensor(
            id=f"SNS-CV1-{idx:02d}",
            station_id="ST-01",
            modality=mod,
            model_name=model,
            sample_rate_hz=rate,
            status="ONLINE",
        )
        db.add(sensor)

    # 3. Secondary Conveyor: CV-02
    cv2 = Conveyor(
        id="CV-02",
        mine_id="MINE-01",
        name="CV-02 Transfer Line",
        length_m=600.0,
        speed_rating_mps=2.0,
        loop_length_m=1200.0,
    )
    db.add(cv2)

    belt2 = Belt(
        id="BELT-02",
        conveyor_id="CV-02",
        belt_type="Fabric EP-800",
        width_mm=1400.0,
        thickness_mm=18.0,
        total_length_m=1200.0,
    )
    db.add(belt2)

    # 6 Joints on CV-02 (J25 to J30)
    for i in range(25, 31):
        code = f"J{i:02d}"
        pos_m = (i - 25) * 200.0
        joint = Joint(
            id=f"CV02_{code}",
            belt_id="BELT-02",
            joint_code=code,
            position_m=pos_m,
            splice_type="Overlap Step Splice Cold Bonded",
            baseline_data=baseline_template,
        )
        db.add(joint)

    # Station on CV-02
    st2 = Station(
        id="ST-02",
        conveyor_id="CV-02",
        name="Discharge Chute Inspection Station",
        position_m=0.0,
        status="OPERATIONAL",
    )
    db.add(st2)

    sensors_cv2 = [
        (Modality.VISION, "Basler ace 2 A2A1920-51gcBAS HD Camera", 30.0),
        (Modality.THERMAL, "FLIR A50 Thermal Infrared Camera", 10.0),
        (Modality.VIBRATION, "PCB Piezotronics 608A11 Triaxial Accelerometer", 10000.0),
        (Modality.SPEED, "Kubler Sendix 5000 Optical Shaft Encoder", 1000.0),
    ]
    for idx, (mod, model, rate) in enumerate(sensors_cv2, start=1):
        sensor = Sensor(
            id=f"SNS-CV2-{idx:02d}",
            station_id="ST-02",
            modality=mod,
            model_name=model,
            sample_rate_hz=rate,
            status="ONLINE",
        )
        db.add(sensor)

    db.commit()
    logger.info("Database seeding complete: 2 conveyors, 9 joints total (3 on CV-01, 6 on CV-02).")


def init_and_seed():
    """Initializes tables and seeds data if not present."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
