"""FastAPI entrypoint for the portfolio agent.

Run locally:
    uvicorn main:app --reload --port 3000
"""

from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# Load .env — check backend/ first, then project root.
_env = Path(__file__).parent / ".env"
if not _env.exists():
    _env = Path(__file__).parent.parent / ".env"
load_dotenv(_env)

from agent import loop as agent_loop  # noqa: E402
from notion import client as notion_client  # noqa: E402
from store import sessions  # noqa: E402

import logger  # noqa: E402
logger.setup()

log = logging.getLogger("main")


@asynccontextmanager
async def lifespan(_: FastAPI):
    log.info("backend starting up")
    yield
    await notion_client.close_client()
    log.info("backend shut down")


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# --- Request models --------------------------------------------------------


class ChatRequest(BaseModel):
    session_id: str
    message: str


class SessionDeleteRequest(BaseModel):
    session_id: str


# --- Endpoints -------------------------------------------------------------


@app.get("/health")
async def health() -> dict:
    return {"ok": True, "sessions": sessions.stats()}


@app.post("/api/session/new")
async def session_new() -> dict:
    return {"session_id": sessions.new_session()}


@app.post("/api/session/delete")
async def session_delete(req: SessionDeleteRequest) -> dict:
    sessions.clear_session(req.session_id)
    return {"ok": True}


def _sse(event: dict | str) -> str:
    if event == "[DONE]":
        return "data: [DONE]\n\n"
    return f"data: {json.dumps(event)}\n\n"


@app.post("/api/chat")
async def chat(req: ChatRequest) -> StreamingResponse:
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="message is required")
    if not req.session_id.strip():
        raise HTTPException(status_code=400, detail="session_id is required")

    async def generator():
        # agent_loop.run() is responsible for catching and translating all
        # errors into user-facing content events + [DONE]. We only need to
        # wrap the streaming side itself here as a last-resort safety net.
        try:
            async for event in agent_loop.run(req.session_id, req.message):
                yield _sse(event)
        except Exception:
            log.exception("SSE generator crashed after agent_loop")
            yield _sse({"content": "Something went wrong. Please try again."})
            yield _sse("[DONE]")

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # disable proxy buffering
        },
    )
