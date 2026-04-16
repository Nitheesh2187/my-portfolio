"""High-level Notion queries used by the agent tools.

Each function returns a small JSON-serializable structure suitable for feeding
back to the LLM as a tool result.
"""

from __future__ import annotations

import re

from config import DATABASES, PAGES

from . import client


def _short_id(notion_id: str) -> str:
    return notion_id.replace("-", "")


# ---------------------------------------------------------------------------
# Section parsing helpers
# ---------------------------------------------------------------------------

# Sections NEVER returned to the LLM (privacy / irrelevance).
_PROJECT_HIDDEN = {
    "raw notes", "scratchpad", "screenshots & demos",
    "resources & references", "timeline & milestones",
}

_EXPERIENCE_HIDDEN = {
    "resume bullets", "artifacts & proof of work",
    "raw notes", "scratchpad", "people & network",
    "ideas i never got to implement",
}

# Sections included in the *overview* response (first few that give the gist).
_PROJECT_OVERVIEW_SECTIONS = {
    "what is this", "why i built this", "tech stack",
}

_EXPERIENCE_OVERVIEW_SECTIONS = {
    "about the company", "why i joined",
    "my role & responsibilities", "key projects & contributions",
}


def _parse_sections(text: str) -> dict[str, str]:
    """Split a page body into {heading_lower: content} by H2 (## ...) markers.

    Lines before the first H2 are stored under the key '_preamble'.
    Heading text is normalised: stripped of leading emoji and whitespace, lowered.
    """
    sections: dict[str, str] = {}
    current_key = "_preamble"
    current_lines: list[str] = []

    for line in text.split("\n"):
        if line.lstrip().startswith("## "):
            # Save previous section
            body = "\n".join(current_lines).strip()
            if body:
                sections[current_key] = body
            # Parse new heading — strip leading ## , emoji, and whitespace
            raw = line.lstrip().removeprefix("##").strip()
            # Remove leading emoji (unicode category So / Sk)
            clean = re.sub(r"^[\U0001F000-\U0001FAFF\u2600-\u27BF\uFE00-\uFE0F\u200D]+\s*", "", raw)
            current_key = clean.lower().strip()
            current_lines = []
        else:
            current_lines.append(line)

    body = "\n".join(current_lines).strip()
    if body:
        sections[current_key] = body

    return sections


def _filter_sections(
    sections: dict[str, str],
    hidden: set[str],
    include: set[str] | None = None,
) -> dict[str, str]:
    """Return sections not in *hidden*. If *include* is given, also limit to that set."""
    out: dict[str, str] = {}
    for key, val in sections.items():
        if key == "_preamble":
            out[key] = val
            continue
        if any(h in key for h in hidden):
            continue
        if include is not None and not any(i in key for i in include):
            continue
        out[key] = val
    return out


def _sections_to_text(sections: dict[str, str]) -> str:
    parts: list[str] = []
    for key, val in sections.items():
        if key == "_preamble":
            parts.append(val)
        else:
            parts.append(f"## {key.title()}\n{val}")
    return "\n\n".join(parts)


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------


async def list_projects() -> list[dict]:
    """Return a compact index of all projects (properties only, no body)."""
    pages = await client.query_database(DATABASES["projects"])
    out = []
    for p in pages:
        props = client.properties_to_dict(p)
        out.append({
            "id": _short_id(p["id"]),
            "title": client.title_of(p),          # "Name" property
            "status": props.get("Status", ""),
            "tags": props.get("Tags", ""),
            "started": props.get("Started", ""),
            "github": props.get("Github", ""),
        })
    return out


async def get_project_overview(project_id: str) -> dict:
    """Properties + first few sections (What, Why, Tech Stack)."""
    pid = client.expand_id(project_id)
    try:
        page = await client.get_page_meta(pid)
    except Exception as e:
        return {"error": f"Could not fetch project {project_id}: {e}"}

    body = await client.get_block_children(pid)
    sections = _parse_sections(body)
    overview = _filter_sections(sections, _PROJECT_HIDDEN, include=_PROJECT_OVERVIEW_SECTIONS)

    # List available deeper sections so the LLM knows what it can request.
    all_visible = _filter_sections(sections, _PROJECT_HIDDEN)
    available = [k for k in all_visible if k != "_preamble" and k not in overview]

    return {
        "id": _short_id(page["id"]),
        "title": client.title_of(page),
        "properties": client.properties_to_dict(page),
        "content": _sections_to_text(overview),
        "available_sections": available,
    }


async def get_project_section(project_id: str, section: str) -> dict:
    """Fetch one specific section of a project page by heading name."""
    pid = client.expand_id(project_id)
    body = await client.get_block_children(pid)
    sections = _parse_sections(body)

    target = section.strip().lower()

    # Block hidden sections
    if any(h in target for h in _PROJECT_HIDDEN):
        return {"error": f"Section '{section}' is not available."}

    # Fuzzy match: find the first key that contains the target
    for key, val in sections.items():
        if key == "_preamble":
            continue
        if target in key or key in target:
            return {"section": key, "content": val}

    available = [k for k in _filter_sections(sections, _PROJECT_HIDDEN) if k != "_preamble"]
    return {"error": f"Section '{section}' not found.", "available_sections": available}


# ---------------------------------------------------------------------------
# Experience
# ---------------------------------------------------------------------------


async def list_experience() -> list[dict]:
    """Return a compact index of all experience entries (properties only)."""
    pages = await client.query_database(DATABASES["experience"])
    out = []
    for p in pages:
        props = client.properties_to_dict(p)
        out.append({
            "id": _short_id(p["id"]),
            "organisation": client.title_of(p),     # "Organisation" is the title property
            "designation": props.get("Designation", ""),
            "employment_type": props.get("Employment Type", ""),
            "start_date": props.get("Start Date", ""),
            "end_date": props.get("End Date", ""),
            "location": props.get("Location", ""),
        })
    return out


async def get_experience_overview(experience_id: str) -> dict:
    """Properties + first few sections (About, Why Joined, Role, Key Projects)."""
    pid = client.expand_id(experience_id)
    try:
        page = await client.get_page_meta(pid)
    except Exception as e:
        return {"error": f"Could not fetch experience {experience_id}: {e}"}

    body = await client.get_block_children(pid)
    sections = _parse_sections(body)
    overview = _filter_sections(sections, _EXPERIENCE_HIDDEN, include=_EXPERIENCE_OVERVIEW_SECTIONS)

    all_visible = _filter_sections(sections, _EXPERIENCE_HIDDEN)
    available = [k for k in all_visible if k != "_preamble" and k not in overview]

    return {
        "id": _short_id(page["id"]),
        "organisation": client.title_of(page),
        "properties": client.properties_to_dict(page),
        "content": _sections_to_text(overview),
        "available_sections": available,
    }


async def get_experience_section(experience_id: str, section: str) -> dict:
    """Fetch one specific section of an experience page by heading name."""
    pid = client.expand_id(experience_id)
    body = await client.get_block_children(pid)
    sections = _parse_sections(body)

    target = section.strip().lower()

    if any(h in target for h in _EXPERIENCE_HIDDEN):
        return {"error": f"Section '{section}' is not available."}

    for key, val in sections.items():
        if key == "_preamble":
            continue
        if target in key or key in target:
            return {"section": key, "content": val}

    available = [k for k in _filter_sections(sections, _EXPERIENCE_HIDDEN) if k != "_preamble"]
    return {"error": f"Section '{section}' not found.", "available_sections": available}


# ---------------------------------------------------------------------------
# Small flat databases (used by prompts.py for static context, not as tools)
# ---------------------------------------------------------------------------


async def get_all_skills() -> list[dict]:
    """Return all skills rows (properties only, no page body)."""
    pages = await client.query_database(DATABASES["skills"])
    out = []
    for p in pages:
        props = client.properties_to_dict(p)
        out.append({
            "skill": client.title_of(p),
            "category": props.get("Category", ""),
            "proficiency": props.get("Proficiency Level", ""),
            "years": props.get("Years", ""),
            "context": props.get("Context", ""),
        })
    return out


async def get_all_certifications() -> list[dict]:
    """Return all certification rows (properties only)."""
    pages = await client.query_database(DATABASES["certifications"])
    out = []
    for p in pages:
        props = client.properties_to_dict(p)
        out.append({
            "name": client.title_of(p),
            "platform": props.get("Platform ", ""),   # note trailing space in Notion
            "year": props.get("Year", ""),
            "key_takeaway": props.get("Key Takeaway", ""),
        })
    return out


async def get_page_content(name: str) -> str:
    """Fetch a standalone page's full text content."""
    if name not in PAGES:
        return f"Unknown page: {name}"
    return await client.get_block_children(PAGES[name])


# ---------------------------------------------------------------------------
# FAQs (still a tool — has category filtering)
# ---------------------------------------------------------------------------


async def search_faqs(category: str = "") -> list[dict]:
    """Return FAQs, optionally filtered by category (Technical/Personal/Career)."""
    pages = await client.query_database(DATABASES["faqs"])
    cat = (category or "").strip().lower()
    results = []
    for p in pages:
        props = client.properties_to_dict(p)
        row_cat = props.get("Category", "").lower()
        if cat and cat not in row_cat:
            continue
        results.append({
            "question": client.title_of(p),
            "answer": props.get("Answer", ""),
            "category": props.get("Category", ""),
        })
    return results
