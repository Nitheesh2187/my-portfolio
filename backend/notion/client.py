"""Low-level Notion REST API wrapper.

A single shared `httpx.AsyncClient` is lazily created on first use and closed
by the FastAPI lifespan hook.

API-level caching: `get_block_children` and `get_page_meta` cache their parsed
results keyed by page_id. This avoids redundant Notion API calls when multiple
tool calls (overview → section → section) hit the same page in quick succession.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any

import httpx

from config import API_CACHE_TTL, MAX_BLOCK_DEPTH, NOTION_API, NOTION_VERSION

log = logging.getLogger(__name__)

_client: httpx.AsyncClient | None = None

# --- API-level cache -------------------------------------------------------
# Keyed by (api_name, id). Values are (result, expires_at).

_api_cache: dict[tuple[str, str], tuple[Any, float]] = {}


def _api_cache_get(api: str, key: str) -> Any | None:
    entry = _api_cache.get((api, key))
    if entry is None:
        return None
    val, exp = entry
    if time.time() > exp:
        _api_cache.pop((api, key), None)
        return None
    log.info("api cache hit: %s(%s)", api, key[:12])
    return val


def _api_cache_set(api: str, key: str, val: Any) -> None:
    _api_cache[(api, key)] = (val, time.time() + API_CACHE_TTL)


def clear_api_cache() -> None:
    _api_cache.clear()


def _headers() -> dict[str, str]:
    key = os.environ.get("NOTION_API_KEY")
    if not key:
        raise RuntimeError("NOTION_API_KEY is not set")
    return {
        "Authorization": f"Bearer {key}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }


def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=30)
    return _client


async def close_client() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


# --- Property / block extraction helpers -----------------------------------


def extract_property_value(prop: dict) -> str:
    """Convert a Notion property object into a short readable string."""
    ptype = prop.get("type", "")

    if ptype == "title":
        return "".join(t.get("plain_text", "") for t in prop.get("title", []))
    if ptype == "rich_text":
        return "".join(t.get("plain_text", "") for t in prop.get("rich_text", []))
    if ptype == "select":
        sel = prop.get("select")
        return sel["name"] if sel else ""
    if ptype == "multi_select":
        return ", ".join(s["name"] for s in prop.get("multi_select", []))
    if ptype == "number":
        val = prop.get("number")
        return str(val) if val is not None else ""
    if ptype == "date":
        d = prop.get("date")
        if not d:
            return ""
        start = d.get("start", "")
        end = d.get("end", "")
        return f"{start} → {end}" if end else start
    if ptype == "url":
        return prop.get("url") or ""
    if ptype == "checkbox":
        return "Yes" if prop.get("checkbox") else "No"
    if ptype == "status":
        s = prop.get("status")
        return s["name"] if s else ""
    if ptype == "relation":
        return f"({len(prop.get('relation', []))} linked)"
    return ""


def _block_to_line(block: dict) -> str:
    """Convert a single Notion block into one line of markdown-ish text."""
    btype = block.get("type", "")
    content = block.get(btype, {})
    rich = content.get("rich_text", [])
    text = "".join(rt.get("plain_text", "") for rt in rich)

    if btype == "to_do":
        checked = "x" if content.get("checked") else " "
        return f"[{checked}] {text}"
    if not text.strip():
        return ""
    if btype.startswith("heading"):
        return f"## {text}"
    if btype == "bulleted_list_item":
        return f"- {text}"
    if btype == "numbered_list_item":
        return f"• {text}"
    if btype == "toggle":
        return f"▸ {text}"
    if btype in ("callout", "quote"):
        return f"> {text}"
    if btype == "code":
        lang = content.get("language", "")
        return f"```{lang}\n{text}\n```"
    return text


# --- Core request helpers --------------------------------------------------


async def query_database(db_id: str, filter_: dict | None = None) -> list[dict]:
    """Return all pages in a database, handling pagination."""
    client = get_client()
    pages: list[dict] = []
    payload: dict[str, Any] = {"page_size": 100}
    if filter_:
        payload["filter"] = filter_

    while True:
        resp = await client.post(
            f"{NOTION_API}/databases/{db_id}/query",
            headers=_headers(),
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        pages.extend(data.get("results", []))

        if not data.get("has_more"):
            break
        payload["start_cursor"] = data["next_cursor"]

    return pages


INDENT = "  "


async def _fetch_block_children(page_id: str, depth: int = 0) -> str:
    """Raw fetch — recursively get blocks and return parsed text."""
    client = get_client()
    out: list[str] = []
    url = f"{NOTION_API}/blocks/{page_id}/children?page_size=100"
    prefix = INDENT * depth

    while url:
        resp = await client.get(url, headers=_headers())
        resp.raise_for_status()
        data = resp.json()

        for block in data.get("results", []):
            btype = block.get("type", "")

            line = _block_to_line(block)
            if line:
                for sub in line.split("\n"):
                    out.append(f"{prefix}{sub}" if sub else "")

            # Recurse into nested children (toggles, indented bullets).
            if (
                block.get("has_children")
                and depth < MAX_BLOCK_DEPTH
                and btype not in ("child_page", "child_database")
            ):
                nested = await _fetch_block_children(block["id"], depth + 1)
                if nested:
                    out.append(nested)

        if data.get("has_more"):
            cursor = data["next_cursor"]
            url = f"{NOTION_API}/blocks/{page_id}/children?page_size=100&start_cursor={cursor}"
        else:
            url = None

    return "\n".join(ln for ln in out if ln is not None)


async def get_block_children(page_id: str) -> str:
    """Fetch a page's body as parsed text. Cached at API level for 10 min.

    Multiple tool calls hitting the same page (overview → section → section)
    will only make one Notion API round-trip.
    """
    cached = _api_cache_get("blocks", page_id)
    if cached is not None:
        return cached
    text = await _fetch_block_children(page_id, depth=0)
    _api_cache_set("blocks", page_id, text)
    return text


async def _fetch_page_meta(page_id: str) -> dict:
    """Raw fetch — get page properties."""
    client = get_client()
    resp = await client.get(f"{NOTION_API}/pages/{page_id}", headers=_headers())
    resp.raise_for_status()
    return resp.json()


async def get_page_meta(page_id: str) -> dict:
    """Fetch page properties. Cached at API level for 10 min."""
    cached = _api_cache_get("page_meta", page_id)
    if cached is not None:
        return cached
    data = await _fetch_page_meta(page_id)
    _api_cache_set("page_meta", page_id, data)
    return data


def expand_id(short_id: str) -> str:
    """Turn a dash-stripped id back into a full 8-4-4-4-12 UUID.
    Notion's API accepts either format, but keeping the canonical form is tidy."""
    s = short_id.replace("-", "")
    if len(s) != 32:
        return short_id
    return f"{s[0:8]}-{s[8:12]}-{s[12:16]}-{s[16:20]}-{s[20:32]}"


def properties_to_dict(page: dict) -> dict[str, str]:
    """Flatten a Notion page's properties into {name: readable_value}."""
    out: dict[str, str] = {}
    for name, prop in page.get("properties", {}).items():
        val = extract_property_value(prop)
        if val:
            out[name] = val
    return out


def title_of(page: dict) -> str:
    """Return the page's title string (whichever property is type=title)."""
    for prop in page.get("properties", {}).values():
        if prop.get("type") == "title":
            return extract_property_value(prop)
    return ""
