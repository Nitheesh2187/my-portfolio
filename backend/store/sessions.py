"""In-memory conversation session store.

Each session_id maps to a conversation history and a last-seen timestamp.
Sessions idle longer than IDLE_TTL are purged on write (lazy sweep).
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field

from config import IDLE_TTL, MAX_HISTORY


@dataclass
class Session:
    history: list[dict] = field(default_factory=list)
    last_seen: float = field(default_factory=time.time)


_sessions: dict[str, Session] = {}


def _sweep() -> None:
    cutoff = time.time() - IDLE_TTL
    stale = [sid for sid, s in _sessions.items() if s.last_seen < cutoff]
    for sid in stale:
        _sessions.pop(sid, None)


def new_session() -> str:
    _sweep()
    sid = str(uuid.uuid4())
    _sessions[sid] = Session()
    return sid


def get_history(session_id: str) -> list[dict]:
    s = _sessions.get(session_id)
    if s is None:
        # Unknown id (could be post-restart) — create empty session.
        _sessions[session_id] = Session()
        return _sessions[session_id].history
    s.last_seen = time.time()
    return s.history


def append_turn(session_id: str, user_message: str, assistant_reply: str) -> None:
    s = _sessions.setdefault(session_id, Session())
    s.history.append({"role": "user", "content": user_message})
    s.history.append({"role": "assistant", "content": assistant_reply})
    # Trim from the front if over the cap.
    if len(s.history) > MAX_HISTORY:
        s.history = s.history[-MAX_HISTORY:]
    s.last_seen = time.time()


def clear_session(session_id: str) -> None:
    _sessions.pop(session_id, None)


def stats() -> dict:
    _sweep()
    return {"active": len(_sessions)}
