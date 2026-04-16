"""System prompt builder.

Bakes small, always-relevant knowledge (skills, certs, education, career goals,
availability) directly into the system prompt alongside a project/experience
index. Rebuilt at most every INDEX_TTL seconds.
"""

from __future__ import annotations

import logging
import time

from config import INDEX_TTL
from notion import queries

log = logging.getLogger(__name__)

_cache: tuple[str, float] | None = None


BASE_PROMPT = """You are Nitheesh Bopparaju's AI agent — a digital version of him embedded on his portfolio site. Speak in first person as Nitheesh.

## Personality
- Confident but not arrogant
- Technical but explains simply
- Enthusiastic about AI/ML and building production systems
- Friendly, concise, focused

## Rules
1. Only answer from the knowledge below or fetched via tools. If a topic isn't covered, say "I haven't documented that yet, but feel free to reach out directly."
2. Speak as Nitheesh, in first person ("I built…", "My experience with…").
3. Keep responses concise — 2–4 sentences for simple questions, more only when depth is asked for.
4. Use light markdown (bold, bullets) only when it genuinely helps.
5. If asked about salary, redirect politely to a direct conversation.
6. Never invent projects, roles, or skills.
7. If someone wants to hire or contact me, point them to the contact section of the site.

## How to use your tools
- The index below lists all projects and experience entries with their IDs.
- For broad questions ("what have you built?", "what's your background?"), answer from the index and the embedded knowledge — NO tool calls needed.
- For specific project questions, call `get_project_overview(id)` first. If you need deeper detail on a particular section, call `get_project_section(id, section_name)` using the `available_sections` list from the overview.
- Same pattern for experience: `get_experience_overview(id)` then optionally `get_experience_section(id, section_name)`.
- For FAQ-style questions (salary, availability, visa, career), check the embedded knowledge first. Only call `search_faqs` if the answer isn't already below.
- Don't call a tool more than once per turn with the same arguments.
- Prefer fewer tool calls — answer from embedded knowledge when possible.

---

## Embedded knowledge

{static_context}

---

## Project & experience index (use IDs with tools)

{index}
"""


# ---------------------------------------------------------------------------
# Builders
# ---------------------------------------------------------------------------


def _format_skills(skills: list[dict]) -> str:
    if not skills:
        return "(none documented)"
    lines = []
    for s in skills:
        prof = f" [{s['proficiency']}]" if s.get("proficiency") else ""
        yrs = f" ({s['years']}y)" if s.get("years") else ""
        ctx = f" — {s['context']}" if s.get("context") else ""
        lines.append(f"- **{s['skill']}**{prof}{yrs}{ctx}")
    return "\n".join(lines)


def _format_certs(certs: list[dict]) -> str:
    if not certs:
        return "(none documented)"
    lines = []
    for c in certs:
        plat = f" ({c['platform']})" if c.get("platform") else ""
        yr = f" [{c['year']}]" if c.get("year") else ""
        tk = f" — {c['key_takeaway']}" if c.get("key_takeaway") else ""
        lines.append(f"- **{c['name']}**{plat}{yr}{tk}")
    return "\n".join(lines)


async def _build_static_context() -> str:
    """Load skills, certs, education, career goals, availability."""
    parts: list[str] = []

    try:
        skills = await queries.get_all_skills()
        parts.append(f"### Skills & Proficiency\n{_format_skills(skills)}")
    except Exception as e:
        log.warning("Failed to load skills: %s", e)

    try:
        certs = await queries.get_all_certifications()
        parts.append(f"### Certifications & Courses\n{_format_certs(certs)}")
    except Exception as e:
        log.warning("Failed to load certifications: %s", e)

    for page_name, label in [
        ("education", "Education"),
        ("career_goals", "Career Goals"),
        ("availability", "Availability"),
    ]:
        try:
            text = await queries.get_page_content(page_name)
            if text.strip():
                parts.append(f"### {label}\n{text}")
        except Exception as e:
            log.warning("Failed to load %s: %s", page_name, e)

    return "\n\n---\n\n".join(parts)


async def _build_index() -> str:
    """Compact markdown index of projects and experience."""
    lines: list[str] = []

    lines.append("### Projects")
    try:
        projects = await queries.list_projects()
        if not projects:
            lines.append("(none documented)")
        for p in projects:
            tags = f" [{p['tags']}]" if p.get("tags") else ""
            status = f" *{p['status']}*" if p.get("status") else ""
            lines.append(f"- `{p['id']}`: **{p['title']}**{tags}{status}")
    except Exception as e:
        lines.append(f"(failed to load: {e})")

    lines.append("")
    lines.append("### Work Experience")
    try:
        experience = await queries.list_experience()
        if not experience:
            lines.append("(none documented)")
        for e in experience:
            org = e.get("organisation", "")
            desig = e.get("designation", "")
            emp = f" ({e['employment_type']})" if e.get("employment_type") else ""
            start = e.get("start_date", "")
            end = e.get("end_date", "present")
            label = f"**{desig}** @ {org}" if desig else f"**{org}**"
            lines.append(f"- `{e['id']}`: {label}{emp} — {start} → {end}")
    except Exception as e:
        lines.append(f"(failed to load: {e})")

    return "\n".join(lines)


async def build_system_prompt() -> str:
    """Return the full system prompt, rebuilding cached parts every INDEX_TTL seconds."""
    global _cache
    now = time.time()

    if _cache and (now - _cache[1]) < INDEX_TTL:
        return _cache[0]

    static_context = await _build_static_context()
    index = await _build_index()
    prompt = BASE_PROMPT.format(static_context=static_context, index=index)

    _cache = (prompt, now)
    log.info("System prompt rebuilt (%d chars)", len(prompt))
    return prompt
