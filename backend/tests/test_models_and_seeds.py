import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database import Base
from backend.app.models.entities import Mine, Conveyor, Belt, Joint, Station, Sensor
from backend.app.models.enums import Provenance, RULStatus, HealthState, Severity, Modality
from backend.app.seeds.seed_data import seed_database


class TestModelsAndSeeds(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()
        seed_database(self.db)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)

    def test_enums_compliance(self):
        """Verify non-negotiable PRD enum requirements."""
        # Provenance enum
        self.assertEqual(Provenance.REAL_SITE.value, "REAL_SITE")
        self.assertEqual(Provenance.REAL_LAB.value, "REAL_LAB")
        self.assertEqual(Provenance.PUBLIC_PROXY.value, "PUBLIC_PROXY")
        self.assertEqual(Provenance.SIMULATED.value, "SIMULATED")

        # RULStatus enum
        self.assertEqual(RULStatus.UNAVAILABLE.value, "UNAVAILABLE")
        self.assertEqual(RULStatus.DEMO.value, "DEMO")
        self.assertEqual(RULStatus.ESTIMATED.value, "ESTIMATED")
        self.assertEqual(RULStatus.VALIDATED.value, "VALIDATED")

    def test_conveyors_seeded(self):
        """Verify 2 conveyors seeded."""
        conveyors = self.db.query(Conveyor).all()
        self.assertEqual(len(conveyors), 2)
        cv_ids = {c.id for c in conveyors}
        self.assertIn("CV-01", cv_ids)
        self.assertIn("CV-02", cv_ids)

    def test_joints_seeded(self):
        """Verify 3 joints on CV-01 and 6 joints on CV-02."""
        cv1 = self.db.query(Conveyor).filter(Conveyor.id == "CV-01").first()
        cv1_joints = self.db.query(Joint).filter(Joint.belt_id == cv1.belts[0].id).all()
        self.assertEqual(len(cv1_joints), 3)

        # Verify J01 to J03 codes exist and positions are 1600m apart
        codes = [j.joint_code for j in cv1_joints]
        self.assertEqual(codes, ["J01", "J02", "J03"])
        self.assertAlmostEqual(cv1_joints[0].position_m, 0.0)
        self.assertAlmostEqual(cv1_joints[1].position_m, 1600.0)
        self.assertAlmostEqual(cv1_joints[2].position_m, 3200.0)

        # Baseline data present on all joints
        for j in cv1_joints:
            self.assertIsNotNone(j.baseline_data)
            self.assertIn("vibration", j.baseline_data)
            self.assertIn("thermal", j.baseline_data)
            self.assertIn("laser", j.baseline_data)

        # CV-02 has 6 joints
        cv2 = self.db.query(Conveyor).filter(Conveyor.id == "CV-02").first()
        cv2_joints = self.db.query(Joint).filter(Joint.belt_id == cv2.belts[0].id).all()
        self.assertEqual(len(cv2_joints), 6)

    def test_stations_and_sensors(self):
        """Verify T1/T2 inspection station and sensors are seeded."""
        st1 = self.db.query(Station).filter(Station.conveyor_id == "CV-01").first()
        self.assertIsNotNone(st1)
        self.assertEqual(len(st1.sensors), 7)

        modalities = {s.modality for s in st1.sensors}
        self.assertIn(Modality.VISION, modalities)
        self.assertIn(Modality.THERMAL, modalities)
        self.assertIn(Modality.VIBRATION, modalities)
        self.assertIn(Modality.ACOUSTIC, modalities)
        self.assertIn(Modality.LASER, modalities)
        self.assertIn(Modality.TENSION, modalities)
        self.assertIn(Modality.SPEED, modalities)


if __name__ == "__main__":
    unittest.main()
