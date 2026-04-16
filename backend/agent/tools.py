"""Tool schemas and dispatcher for the agent.

5 tools total. Small sources (skills, certs, education, career goals,
availability) are baked into the system prompt and need no tools.

Caching is handled at the Notion API level (client.py), not here.

Argument validation uses Pydantic models (agent/tool_models.py). Errors are
categorised:
- Bad args / unknown tool     → returned as {"error": ...} to the LLM (self-correct)
- Notion network / HTTP error → raised as UserFacingError (apology to user)
- Any other exception         → returned as {"error": ...} to the LLM
"""

from __future__ import annotations

import logging
from typing import Any, Awaitable, Callable

import httpx
from pydantic import ValidationError

from agent.errors import UserFacingError
from agent.tool_models import ARG_MODELS
from notion import queries

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Tool schemas (advertised to the LLM via Groq function calling)
# ---------------------------------------------------------------------------

TOOL_SCHEMAS: list[dict] = [
    # search_faqs disabled — causes hallucinations with current model.
    # {
    #     "type": "function",
    #     "function": {
    #         "name": "search_faqs",
    #         "description": (
    #             "Search the FAQ database. Useful for pre-answered questions about "
    #             "salary, visa, hobbies, etc. Pass an optional category filter."
    #         ),
    #         "parameters": {
    #             "type": "object",
    #             "properties": {
    #                 "category": {
    #                     "type": "string",
    #                     "description": "Optional filter: 'Technical', 'Personal', or 'Career'. Empty returns all.",
    #                 },
    #             },
    #         },
    #     },
    # },
    {
        "type": "function",
        "function": {
            "name": "get_project_overview",
            "description": (
                "Fetch a project's properties and top-level summary (What, Why, Tech Stack). "
                "Returns an `available_sections` list you can drill into with get_project_section."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "Project id from the index.",
                    },
                },
                "required": ["project_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_project_section",
            "description": (
                "Fetch one specific section of a project page by heading name. "
                "Use the `available_sections` from get_project_overview to know what's available."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "Project id from the index.",
                    },
                    "section": {
                        "type": "string",
                        "description": "Section heading name, e.g. 'Architecture', 'Problems Faced', 'Key Decisions'.",
                    },
                },
                "required": ["project_id", "section"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_experience_overview",
            "description": (
                "Fetch an experience entry's properties and summary (About Company, Why Joined, "
                "Role & Responsibilities, Key Projects). Returns `available_sections` for deeper drill-down."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "experience_id": {
                        "type": "string",
                        "description": "Experience id from the index.",
                    },
                },
                "required": ["experience_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_experience_section",
            "description": (
                "Fetch one specific section of an experience page by heading name. "
                "Use `available_sections` from get_experience_overview."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "experience_id": {
                        "type": "string",
                        "description": "Experience id from the index.",
                    },
                    "section": {
                        "type": "string",
                        "description": "Section heading name, e.g. 'Impact & Achievements', 'Tech Stack & Tools Used'.",
                    },
                },
                "required": ["experience_id", "section"],
            },
        },
    },
]


# ---------------------------------------------------------------------------
# Dispatch table
# ---------------------------------------------------------------------------

_DISPATCH: dict[str, Callable[..., Awaitable[Any]]] = {
    # "search_faqs": queries.search_faqs,
    "get_project_overview": queries.get_project_overview,
    "get_project_section": queries.get_project_section,
    "get_experience_overview": queries.get_experience_overview,
    "get_experience_section": queries.get_experience_section,
}

STATUS_LABELS: dict[str, str] = {
    "search_faqs": "Searching FAQs…",
    "get_project_overview": "Looking up project details…",
    "get_project_section": "Reading project section…",
    "get_experience_overview": "Looking up role details…",
    "get_experience_section": "Reading role section…",
}


async def execute(tool_name: str, args: dict) -> Any:
    """Run a tool by name with the given arguments.

    Two exit paths:
      - Returns a dict   → result fed back to the LLM as tool output.
                            If the dict contains "error", the LLM sees it and
                            can self-correct on the next turn.
      - Raises UserFacingError → the loop catches it, shows the user an
                                  apology, and ends the turn.
    """

    # ── Lookup ────────────────────────────────────────────────────────────
    # If the LLM hallucinated a tool name, tell it what's actually available.
    fn = _DISPATCH.get(tool_name)
    if fn is None:
        return {
            "error": f"Unknown tool '{tool_name}'. Available: {list(_DISPATCH.keys())}"
        }

    # ── Argument validation ───────────────────────────────────────────────
    # Validate with Pydantic before calling the function. A validation error
    # returns structured feedback (field names, expected types) so the LLM
    # can fix and retry.
    model_cls = ARG_MODELS.get(tool_name)
    if model_cls is not None:
        try:
            validated = model_cls(**(args or {}))
        except ValidationError as e:
            log.info("Arg validation failed for %s: %s", tool_name, e.errors())
            return {
                "error": f"Invalid arguments for {tool_name}",
                "details": e.errors(include_url=False, include_input=False),
            }
        call_args = validated.model_dump(exclude_unset=True)
    else:
        call_args = args or {}

    # ── Execute ───────────────────────────────────────────────────────────
    # Notion HTTP and network errors abort the turn with an apology (the user
    # can't do anything about Notion being down). Everything else is returned
    # as an error dict so the LLM can adapt.
    log.info("calling %s(%s)", tool_name, call_args)
    try:
        result = await fn(**call_args)
        log.debug(
            "result  %s → %s",
            tool_name,
            str(result)[:200] + ("..." if len(str(result)) > 200 else ""),
        )
        return result
    except httpx.HTTPStatusError as e:
        # Notion returned 4xx/5xx — auth expired, page deleted, etc.
        log.warning("Notion HTTP %s in %s: %s", e.response.status_code, tool_name, e)
        raise UserFacingError(
            "I'm having trouble fetching my information right now. Please try again in a moment."
        )
    except (httpx.ConnectError, httpx.TimeoutException, httpx.NetworkError) as e:
        # Network-level failure — DNS, timeout, connection refused.
        log.warning("Notion network error in %s: %s", tool_name, e)
        raise UserFacingError(
            "I can't reach my knowledge base right now. Please try again shortly."
        )
    except TypeError as e:
        # Defensive — shouldn't happen after Pydantic validation.
        return {"error": f"Bad arguments for {tool_name}: {e}"}
    except Exception as e:
        # Catch-all for anything we didn't anticipate.
        log.exception("Tool %s failed unexpectedly", tool_name)
        return {"error": f"{type(e).__name__}: {e}"}
