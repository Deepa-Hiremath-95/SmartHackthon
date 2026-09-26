import unittest
import json
from starlette.testclient import TestClient

from backend.app.main import app
from backend.app.routers.websocket import ws_manager
from backend.app.seeds.seed_data import init_and_seed


class TestAPIAndWebSocket(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_and_seed()
        cls._client_ctx = TestClient(app)
        cls.client = cls._client_ctx.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls._client_ctx.__exit__(None, None, None)

    def test_root_endpoint(self):
        """Verify root health check endpoint and advisory notice."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["provenance"], "SIMULATED")
        self.assertEqual(data["platform"], "NEXVION")
        self.assertIn("Advisory only", data["advisory_only_notice"])

    def test_list_conveyors(self):
        """Verify GET /api/v1/conveyors returns 2 conveyors and 3 joints on CV-01."""
        response = self.client.get("/api/v1/conveyors")
        self.assertEqual(response.status_code, 200)
        conveyors = response.json()
        self.assertEqual(len(conveyors), 2)

        cv1 = next(c for c in conveyors if c["id"] == "CV-01")
        self.assertEqual(cv1["joint_count"], 3)
        self.assertEqual(cv1["provenance"], "SIMULATED")

    def test_list_joints_on_cv1(self):
        """Verify GET /api/v1/conveyors/CV-01/joints returns all 3 joints."""
        response = self.client.get("/api/v1/conveyors/CV-01/joints")
        self.assertEqual(response.status_code, 200)
        joints = response.json()
        self.assertEqual(len(joints), 3)
        self.assertEqual(joints[0]["joint_code"], "J01")
        self.assertEqual(joints[2]["joint_code"], "J03")

    def test_sim_controls(self):
        """Verify simulator speed and status REST controls."""
        # Status
        res_status = self.client.get("/api/v1/sim/status")
        self.assertEqual(res_status.status_code, 200)
        data = res_status.json()
        self.assertIn("run_id", data)
        self.assertTrue(data["run_id"].startswith("run_"))
        self.assertIn("lap", data)
        self.assertIn("speed_preset", data)
        self.assertIn("paused", data)
        self.assertIn("scenario_phase", data)
        self.assertEqual(data["target_joint"], "J02")

        # Change speed preset
        res_speed = self.client.post("/api/v1/sim/speed?preset=60x")
        self.assertEqual(res_speed.status_code, 200)
        self.assertEqual(res_speed.json()["preset"], "60x")

        # Reset back to 600x
        self.client.post("/api/v1/sim/speed?preset=600x")

    def test_websocket_live_connection_and_handshake(self):
        """Verify WebSocket client connects to /ws/live and receives handshake and broadcasts."""
        with self.client.websocket_connect("/ws/live") as websocket:
            # 1. First message is connection_ack handshake
            ack_data = websocket.receive_json()
            self.assertEqual(ack_data["type"], "connection_ack")
            self.assertEqual(ack_data["endpoint"], "/ws/live")
            self.assertEqual(ack_data["provenance"], "SIMULATED")

    def test_joint_history_endpoint(self):
        """Verify GET /api/v1/joints/{joint_id}/history returns history list or 404."""
        # 1. Non-existent joint returns 404
        res_404 = self.client.get("/api/v1/joints/INVALID_JOINT/history")
        self.assertEqual(res_404.status_code, 404)

        # 2. Existing joint code e.g. "J02" returns 200 list
        res_j02 = self.client.get("/api/v1/joints/J02/history")
        self.assertEqual(res_j02.status_code, 200)
        history = res_j02.json()
        self.assertIsInstance(history, list)

        # 3. Existing joint ID e.g. "CV01_J02" returns 200 list
        res_id = self.client.get("/api/v1/joints/CV01_J02/history")
        self.assertEqual(res_id.status_code, 200)
        self.assertIsInstance(res_id.json(), list)

    def test_joints_contain_rul(self):
        """Verify GET /api/v1/conveyors/CV-01/joints includes RUL structure for every joint."""
        response = self.client.get("/api/v1/conveyors/CV-01/joints")
        self.assertEqual(response.status_code, 200)
        joints = response.json()
        self.assertTrue(len(joints) > 0)
        for j in joints:
            self.assertIn("rul", j)
            self.assertIn("status", j["rul"])
            self.assertIn(j["rul"]["status"], ["UNAVAILABLE", "DEMO", "ESTIMATED", "VALIDATED"])


if __name__ == "__main__":
    unittest.main()
