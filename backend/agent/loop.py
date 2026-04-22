"""Agent loop — single streaming call per turn.

Every Groq call is `stream=True`. The loop accumulates streamed deltas (both
content and tool_calls) and reacts on `finish_reason`:
  - "tool_calls"  → execute tools, append results, loop again
  - "stop"        → done, content already streamed to user
  - "length"      → hit max_tokens, treat as done

Error handling is categorised:
  1. tool_use_failed (Llama malformed function calls) → retry, disabling tools
     after 2 failures so the model responds with plain text.
  2. Rate limit                                       → apologise, end turn.
  3. Network / timeout (transient)                    → retry with backoff, then apologise.
  4. Groq 5xx                                         → retry with backoff, then apologise.
  5. Invalid tool args (Pydantic)                     → handled in tools.execute,
                                                        error returned to LLM.
  6. Unknown tool name                                → handled in tools.execute,
                                                        error returned to LLM.
  7/8. Notion HTTP / network error                    → raised as UserFacingError
                                                        from tools.execute, apologise.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any, AsyncIterator

from groq import (
    APIConnectionError,
    APITimeoutError,
    AsyncGroq,
    InternalServerError,
    RateLimitError,
)

from agent import prompts, tools
from agent.errors import UserFacingError
from agent.helpers import (
    corrective_note,
    extract_error_info,
    is_tool_format_error,
    merge_tool_call_delta,
)
from config import (
    MAX_RETRIES,
    MAX_TOKENS,
    MAX_TOOL_USE_FAILURES,
    MAX_TURNS,
    MODEL,
    RETRY_BACKOFF_SECONDS,
    TEMPERATURE,
)

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Groq client
# ---------------------------------------------------------------------------

_client: AsyncGroq | None = None


def _groq() -> AsyncGroq:
    global _client
    if _client is None:
        key = os.environ.get("GROQ_API_KEY")
        if not key:
            raise RuntimeError("GROQ_API_KEY is not set")
        _client = AsyncGroq(api_key=key)
    return _client


# ---------------------------------------------------------------------------
# Stream creation with transient-error retries
# ---------------------------------------------------------------------------


async def _create_stream(messages: list[dict], use_tools: bool):
    """Create a streaming completion with retry for transient errors.

    Maps error classes to the user's categorisation:
    - RateLimitError        → UserFacingError (no retry)
    - APIConnection/Timeout → retry up to MAX_RETRIES, then UserFacingError
    - InternalServerError   → retry up to MAX_RETRIES, then UserFacingError
    - Other exceptions      → propagated (caller handles tool-format errors)
    """
    client = _groq()
    kwargs: dict[str, Any] = {
        "model": MODEL,
        "messages": messages,
        "stream": True,
        "temperature": TEMPERATURE,
        "max_tokens": MAX_TOKENS,
    }
    if use_tools:
        kwargs["tools"] = tools.TOOL_SCHEMAS
        kwargs["tool_choice"] = "auto"

    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            return await client.chat.completions.create(**kwargs)

        except RateLimitError as e:
            log.warning("Groq rate limit: %s", e)
            raise UserFacingError(
                "I'm being rate-limited right now. Please try again in a minute."
            ) from e

        except (APIConnectionError, APITimeoutError) as e:
            last_error = e
            if attempt < MAX_RETRIES:
                delay = RETRY_BACKOFF_SECONDS[min(attempt, len(RETRY_BACKOFF_SECONDS) - 1)]
                log.warning(
                    "Groq network error (attempt %d/%d), retrying in %ss: %s",
                    attempt + 1, MAX_RETRIES, delay, e,
                )
                await asyncio.sleep(delay)
                continue
            raise UserFacingError(
                "I'm having trouble connecting to my AI service. Please try again shortly."
            ) from e

        except InternalServerError as e:
            last_error = e
            if attempt < MAX_RETRIES:
                delay = RETRY_BACKOFF_SECONDS[min(attempt, len(RETRY_BACKOFF_SECONDS) - 1)]
                log.warning(
                    "Groq 5xx (attempt %d/%d), retrying in %ss: %s",
                    attempt + 1, MAX_RETRIES, delay, e,
                )
                await asyncio.sleep(delay)
                continue
            raise UserFacingError(
                "The AI service is having issues right now. Please try again shortly."
            ) from e

    raise UserFacingError(
        "Something went wrong reaching the AI service. Please try again."
    ) from last_error


# ---------------------------------------------------------------------------
# Public entrypoint
# ---------------------------------------------------------------------------


async def run(history: list[dict], user_message: str) -> AsyncIterator[dict | str]:
    """Run one chat turn.

    Stateless — the caller (serverless handler) owns conversation history and
    passes it on every invocation. Nothing is persisted here.

    Args:
        history: Prior messages in OpenAI format
                 (list of {"role": "user"|"assistant", "content": str}).
        user_message: The new user message for this turn.

    Yields:
        {"status": "..."}    — progress label while a tool runs
        {"content": "..."}   — a streamed token of the assistant's answer
        "[DONE]"             — sentinel marking end of stream
    """
    system_prompt = await prompts.build_system_prompt()

    messages: list[dict] = [
        {"role": "system", "content": system_prompt},
        *history,
        {"role": "user", "content": user_message},
    ]

    try:
        async for event in _run_loop(messages):
            yield event
    except UserFacingError as e:
        yield {"content": e.user_message}
    except Exception:
        log.exception("Unhandled error in agent loop")
        yield {
            "content": "Something unexpected went wrong on my end. Please try again in a moment."
        }

    yield "[DONE]"


# ---------------------------------------------------------------------------
# Core loop
# ---------------------------------------------------------------------------


async def _run_loop(messages: list[dict]) -> AsyncIterator[dict]:
    """Stream the conversation forward, yielding content + status events."""
    tool_use_failures = 0

    for turn in range(MAX_TURNS):
        use_tools = tool_use_failures < MAX_TOOL_USE_FAILURES

        # --- 1. Open the stream -------------------------------------------
        try:
            log.info("Starting turn %d", turn + 1)
            stream = await _create_stream(messages, use_tools=use_tools)
        except UserFacingError:
            raise
        except Exception as e:
            info = extract_error_info(e)
            if is_tool_format_error(info):
                tool_use_failures += 1
                messages.append({"role": "user", "content": corrective_note(info)})
                log.warning(
                    "tool format error at create — retry %d: %s",
                    tool_use_failures, info.get("message") or info.get("raw_message"),
                )
                continue
            if info.get("status_code") == 400:
                log.warning("Groq 400 (non-tool): %s", info)
                raise UserFacingError(
                    "Something went wrong processing your question. Please try rephrasing."
                ) from e
            raise

        # --- 2. Consume the stream ----------------------------------------
        collected_content = ""
        tool_call_buffers: dict[int, dict] = {}
        finish_reason: str | None = None
        stream_error_info: dict | None = None

        try:
            async for chunk in stream:
                if not chunk.choices:
                    continue
                choice = chunk.choices[0]
                delta = choice.delta

                if delta is not None:
                    tc_delta = getattr(delta, "tool_calls", None)

                    # Only stream content to the user when this delta is NOT
                    # part of a tool call. Tool-call deltas sometimes carry
                    # preamble text or leaked `<function=...>` markup that
                    # shouldn't reach the user.
                    if getattr(delta, "content", None) and not tc_delta:
                        collected_content += delta.content
                        yield {"content": delta.content}

                    if tc_delta:
                        for tc in tc_delta:
                            merge_tool_call_delta(tool_call_buffers, tc)

                if choice.finish_reason:
                    finish_reason = choice.finish_reason
        except Exception as e:
            info = extract_error_info(e)
            if is_tool_format_error(info):
                stream_error_info = info
            else:
                raise

        if stream_error_info is not None:
            tool_use_failures += 1
            messages.append({"role": "user", "content": corrective_note(stream_error_info)})
            log.warning(
                "tool format error mid-stream — retry %d: %s",
                tool_use_failures,
                stream_error_info.get("message") or stream_error_info.get("raw_message"),
            )
            continue

        # --- 3. Record the assistant turn ---------------------------------
        tool_calls = [tool_call_buffers[k] for k in sorted(tool_call_buffers)]
        assistant_msg: dict = {"role": "assistant", "content": collected_content}
        if tool_calls:
            assistant_msg["tool_calls"] = tool_calls
        messages.append(assistant_msg)

        # --- 4. Decide next step based on finish_reason -------------------
        if finish_reason == "tool_calls" and tool_calls:
            log.info(
                "Turn %d: %d tool call(s) — %s",
                turn + 1,
                len(tool_calls),
                ", ".join(tc["function"]["name"] for tc in tool_calls),
            )
            for tc in tool_calls:
                name = tc["function"]["name"]
                raw_args = tc["function"]["arguments"] or "{}"
                try:
                    args = json.loads(raw_args)
                    if not isinstance(args, dict):
                        args = {}
                except json.JSONDecodeError:
                    args = {}

                yield {"status": tools.STATUS_LABELS.get(name, f"Running {name}…")}

                result = await tools.execute(name, args)

                if isinstance(result, dict) and "error" in result:
                    tool_use_failures += 1
                    log.warning(
                        "tool execution error in %s — count %d: %s",
                        name, tool_use_failures, result.get("error"),
                    )

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": json.dumps(result, default=str),
                })
            continue

        if finish_reason in ("stop", "length"):
            log.info(
                "Turn %d: Done (%s) — %d chars streamed",
                turn + 1, finish_reason, len(collected_content),
            )
            return

        log.warning("Unexpected finish_reason=%r, content=%d chars",
                    finish_reason, len(collected_content))
        if not collected_content.strip():
            raise UserFacingError(
                "I didn't get a complete response. Please try asking again."
            )
        return

    log.warning("Agent hit MAX_TURNS=%d without finalizing", MAX_TURNS)
    raise UserFacingError(
        "I got stuck while looking things up. Please try rephrasing your question."
    )
