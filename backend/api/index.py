"""FastAPI entrypoint for the portfolio agent backend.

Works with both `vercel dev` (modern Python runtime) and local `uvicorn`.

Request body:
    {
      "history": [{"role": "user"|"assistant", "content": str}, ...],
      "message": "..."
    }

Response: text/event-stream (SSE)
"""

from __future__ import annotations

import json
import logging
import os
import sys
from pathlib import Path

# Ensure backend/ is on sys.path so package imports resolve.
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from dotenv import load_dotenv  # noqa: E402

for env_path in (_BACKEND_DIR / ".env", _BACKEND_DIR.parent / ".env"):
    if env_path.exists():
        load_dotenv(env_path)
        break

import logger as app_logger  # noqa: E402
app_logger.setup()

from fastapi import FastAPI, Request  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse, StreamingResponse  # noqa: E402

from agent import loop as agent_loop  # noqa: E402

log = logging.getLogger("api.chat")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.post("/api/chat")
async def chat(request: Request):
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON body"}, status_code=400)

    history = body.get("history") or []
    message = (body.get("message") or "").strip()

    if not message:
        return JSONResponse({"error": "'message' is required"}, status_code=400)
    if not isinstance(history, list):
        return JSONResponse({"error": "'history' must be a list"}, status_code=400)

    history = [
        m for m in history
        if isinstance(m, dict)
        and m.get("role") in ("user", "assistant")
        and isinstance(m.get("content"), str)
    ]

    async def event_stream():
        try:
            async for event in agent_loop.run(history, message):
                if event == "[DONE]":
                    yield "data: [DONE]\n\n"
                else:
                    yield f"data: {json.dumps(event)}\n\n"
        except Exception:
            log.exception("SSE streaming crashed")
            yield f"data: {json.dumps({'content': 'Something went wrong. Please try again.'})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
