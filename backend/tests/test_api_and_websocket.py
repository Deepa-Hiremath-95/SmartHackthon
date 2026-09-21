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
        """Verify GET /api/v1/conveyors returns 2 conveyors and 24 joints on CV-01."""
        response = self.client.get("/api/v1/conveyors")
        self.assertEqual(response.status_code, 200)
        conveyors = response.json()
        self.assertEqual(len(conveyors), 2)

        cv1 = next(c for c in conveyors if c["id"] == "CV-01")
        self.assertEqual(cv1["joint_count"], 24)
        self.assertEqual(cv1["provenance"], "SIMULATED")

    def test_list_joints_on_cv1(self):
        """Verify GET /api/v1/conveyors/CV-01/joints returns all 24 joints."""
        response = self.client.get("/api/v1/conveyors/CV-01/joints")
        self.assertEqual(response.status_code, 200)
        joints = response.json()
        self.assertEqual(len(joints), 24)
        self.assertEqual(joints[0]["joint_code"], "J01")
        self.assertEqual(joints[23]["joint_code"], "J24")

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
        self.assertEqual(data["target_joint"], "J04")

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

            # 2. Ping-pong test
            websocket.send_text(json.dumps({"action": "ping"}))
            pong = websocket.receive_json()
            self.assertEqual(pong["type"], "pong")


if __name__ == "__main__":
    unittest.main()
