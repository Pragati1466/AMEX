"""WebSocket connection manager for live resolution updates."""

import json
from typing import Any

from fastapi import WebSocket
from loguru import logger


class ResolutionConnectionManager:
    """Manages WebSocket connections per dispute case."""

    def __init__(self) -> None:
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, case_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        if case_id not in self.active_connections:
            self.active_connections[case_id] = []
        self.active_connections[case_id].append(websocket)
        logger.debug(f"WebSocket connected for case {case_id}")

    def disconnect(self, case_id: int, websocket: WebSocket) -> None:
        if case_id in self.active_connections:
            self.active_connections[case_id] = [
                ws for ws in self.active_connections[case_id] if ws != websocket
            ]
            if not self.active_connections[case_id]:
                del self.active_connections[case_id]
        logger.debug(f"WebSocket disconnected for case {case_id}")

    async def broadcast_to_case(self, case_id: int, event_type: str, data: dict[str, Any]) -> None:
        if case_id not in self.active_connections:
            return
        message = json.dumps({"event": event_type, "case_id": case_id, "data": data})
        dead: list[WebSocket] = []
        for ws in self.active_connections[case_id]:
            try:
                await ws.send_text(message)
            except Exception as exc:
                logger.warning(f"WebSocket send failed for case {case_id}: {exc}")
                dead.append(ws)
        for ws in dead:
            self.disconnect(case_id, ws)


resolution_ws_manager = ResolutionConnectionManager()
