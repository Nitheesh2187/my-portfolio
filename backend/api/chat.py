"""Vercel serverless handler for POST /api/chat.

Frontend owns conversation history and sends the full thread on every request.
The handler is stateless — no session store — which lets Vercel run this as a
zero-infrastructure serverless function.

Module-level caches (system-prompt index, Notion API responses) persist across
WARM invocations of the same container, so repeated requests stay cheap.

Request body:
    {
      "history": [{"role": "user"|"assistant", "content": str}, ...],
      "message": "..."
    }

Response: text/event-stream
    data: {"status": "..."}
    data: {"content": "..."}
    ...
    data: [DONE]
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

# ── Ensure backend/ is on sys.path so our package imports resolve regardless
#    of how Vercel invokes this file.
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from dotenv import load_dotenv  # noqa: E402

# Local dev: load backend/.env (or project root .env) if present.
for env_path in (_BACKEND_DIR / ".env", _BACKEND_DIR.parent / ".env"):
    if env_path.exists():
        load_dotenv(env_path)
        break

import logger  # noqa: E402
logger.setup()

from agent import loop as agent_loop  # noqa: E402

log = logging.getLogger("api.chat")


class handler(BaseHTTPRequestHandler):
    # Vercel Python runtime instantiates a class named `handler`.

    def do_OPTIONS(self) -> None:
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def do_POST(self) -> None:
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b""
        try:
            body = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            self._json_error(400, "Invalid JSON body")
            return

        history = body.get("history") or []
        message = (body.get("message") or "").strip()

        if not message:
            self._json_error(400, "'message' is required")
            return
        if not isinstance(history, list):
            self._json_error(400, "'history' must be a list")
            return

        history = [
            m for m in history
            if isinstance(m, dict)
            and m.get("role") in ("user", "assistant")
            and isinstance(m.get("content"), str)
        ]

        # Start SSE response.
        self.send_response(200)
        self._cors_headers()
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("X-Accel-Buffering", "no")  # disable proxy buffering
        self.end_headers()

        try:
            asyncio.run(self._stream(history, message))
        except Exception:
            log.exception("SSE streaming crashed")
            self._write_sse({"content": "Something went wrong. Please try again."})
            self._write_sse("[DONE]")

    # ── Async agent loop → sync SSE writes ────────────────────────────────

    async def _stream(self, history: list[dict], message: str) -> None:
        async for event in agent_loop.run(history, message):
            self._write_sse(event)

    def _write_sse(self, event: dict | str) -> None:
        if event == "[DONE]":
            data = "data: [DONE]\n\n"
        else:
            data = f"data: {json.dumps(event)}\n\n"
        try:
            self.wfile.write(data.encode("utf-8"))
            self.wfile.flush()
        except Exception:
            # Client disconnected — nothing to do.
            pass

    # ── Helpers ──────────────────────────────────────────────────────────

    def _json_error(self, status: int, message: str) -> None:
        self.send_response(status)
        self._cors_headers()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode("utf-8"))

    def _cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    # Suppress BaseHTTPServer's default stderr access log — our logger.py
    # already handles it at the app level.
    def log_message(self, format: str, *args) -> None:  # noqa: A002
        log.info(format, *args)
