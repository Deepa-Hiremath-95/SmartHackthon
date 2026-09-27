import json
import logging
from typing import Set, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.app.models.enums import Provenance

logger = logging.getLogger("nexvion.websocket")

router = APIRouter()


class ConnectionManager:
    """Manages active WebSocket connections and thread-safe broadcast delivery."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcasts a JSON-serializable dictionary to all connected clients."""
        if not self.active_connections:
            return

        payload_text = json.dumps(message)
        dead_connections = set()

        for connection in list(self.active_connections):
            try:
                if hasattr(connection, "client_state") and connection.client_state.name != "CONNECTED":
                    dead_connections.add(connection)
                    continue
                await connection.send_text(payload_text)
            except Exception as e:
                logger.debug(f"Error sending message to client: {e}")
                dead_connections.add(connection)

        for dead in dead_connections:
            self.active_connections.discard(dead)


ws_manager = ConnectionManager()


@router.websocket("/ws/live")
async def websocket_live_endpoint(websocket: WebSocket):
    """
    Live streaming WebSocket endpoint at /ws/live per PRD Section 10.2.
    Streams health updates, alerts, and conveyor summaries in real time.
    """
    await ws_manager.connect(websocket)
    try:
        # Send initial connection confirmation
        init_message = {
            "type": "connection_ack",
            "message": "Connected to NEXVION Live Stream",
            "endpoint": "/ws/live",
            "provenance": Provenance.SIMULATED.value,
        }
        await websocket.send_text(json.dumps(init_message))

        # Keep connection open and accept optional incoming messages (e.g. ping/heartbeat)
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("action") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket handler error: {e}")
        ws_manager.disconnect(websocket)
