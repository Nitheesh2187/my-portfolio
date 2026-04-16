"""Helper functions for the agent loop.

Extracted from loop.py to keep it focused on orchestration.
"""

from __future__ import annotations

from typing import Any


# ---------------------------------------------------------------------------
# Error extraction and classification
# ---------------------------------------------------------------------------


def extract_error_info(e: Exception) -> dict:
    """Pull structured info out of ANY Groq exception.

    Returns a dict shaped like:
        {
          "status_code": 400 | 429 | 500 | None,
          "code": "tool_use_failed" | "invalid_tool_call" | ...,
          "type": "invalid_request_error" | ...,
          "message": "...",
          "failed_generation": { ... } | str | None,
          "raw_message": str(e),
        }

    Works regardless of exception class. Mid-stream APIErrors often lack
    `status_code` and `response`, so we also preserve `raw_message` for
    string-based detection in `is_tool_format_error`.
    """
    info: dict = {
        "status_code": getattr(e, "status_code", None),
        "code": None,
        "type": None,
        "message": None,
        "failed_generation": None,
        "raw_message": str(e),
    }

    response = getattr(e, "response", None)
    if response is not None:
        try:
            body = response.json()
            err = body.get("error", {}) if isinstance(body, dict) else {}
            info["code"] = err.get("code")
            info["type"] = err.get("type")
            info["message"] = err.get("message")
            info["failed_generation"] = err.get("failed_generation")
        except Exception:
            pass

    # Some mid-stream APIErrors carry the `body` as a direct attribute.
    body = getattr(e, "body", None)
    if body and isinstance(body, dict):
        err = body.get("error", body)
        if isinstance(err, dict):
            info["code"] = info["code"] or err.get("code")
            info["type"] = info["type"] or err.get("type")
            info["message"] = info["message"] or err.get("message")
            info["failed_generation"] = info["failed_generation"] or err.get("failed_generation")

    return info


# Message fragments that reliably indicate a malformed tool call, regardless
# of how the exception was raised (BadRequestError at create time, or a bare
# APIError from the streaming parser).
_TOOL_FORMAT_MESSAGE_PATTERNS = (
    "tool call validation failed",
    "not in request.tools",
    "invalid tool call",
    "failed to call a function",
)


def is_tool_format_error(info: dict) -> bool:
    """True if the error info indicates a malformed tool call."""
    if info.get("code") in ("tool_use_failed", "invalid_tool_call"):
        return True
    haystack = " ".join(
        filter(None, [info.get("message"), info.get("raw_message")])
    ).lower()
    return any(pat in haystack for pat in _TOOL_FORMAT_MESSAGE_PATTERNS)


def corrective_note(info: dict) -> str:
    """Build a short message explaining the format failure to the model."""
    parts: list[str] = []

    fg = info.get("failed_generation")
    if isinstance(fg, dict):
        reason = fg.get("reason")
        attempted = fg.get("attempted_arguments") or fg.get("attempted_generation")
        if reason:
            parts.append(str(reason))
        if attempted:
            parts.append(f"Attempted: {attempted}")
    elif isinstance(fg, str) and fg.strip():
        parts.append(fg.strip())

    if not parts and info.get("message"):
        parts.append(str(info["message"]))
    if not parts and info.get("raw_message"):
        parts.append(info["raw_message"])

    reason_text = " — ".join(parts) if parts else "Malformed tool call"
    return (
        f"[System note: your previous response had a malformed tool call "
        f"({reason_text}). Please retry using one of the exact tool names from "
        f"the available list with valid JSON arguments, or answer directly "
        f"without calling any tool.]"
    )


# ---------------------------------------------------------------------------
# Streaming tool-call delta merging
# ---------------------------------------------------------------------------


def merge_tool_call_delta(buffer: dict[int, dict], delta: Any) -> None:
    """Merge a streaming ChoiceDeltaToolCall into the index-keyed buffer.

    The OpenAI/Groq streaming format splits a single tool_call across many
    chunks, each carrying an `index` to identify which call they belong to.
    Only `function.arguments` reliably arrives incrementally; id and name
    usually arrive on the first chunk.
    """
    idx = delta.index
    if idx not in buffer:
        buffer[idx] = {
            "id": "",
            "type": "function",
            "function": {"name": "", "arguments": ""},
        }
    buf = buffer[idx]

    if getattr(delta, "id", None):
        buf["id"] = delta.id
    if getattr(delta, "type", None):
        buf["type"] = delta.type

    fn_delta = getattr(delta, "function", None)
    if fn_delta is not None:
        if getattr(fn_delta, "name", None):
            buf["function"]["name"] += fn_delta.name
        if getattr(fn_delta, "arguments", None):
            buf["function"]["arguments"] += fn_delta.arguments
