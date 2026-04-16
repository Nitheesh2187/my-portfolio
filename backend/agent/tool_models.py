"""Pydantic models for tool arguments.

Validated before the tool function runs. A validation failure returns a
structured error back to the LLM so it can self-correct on the next turn.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class _StrictBase(BaseModel):
    """Base model — reject unexpected keys so the LLM can't sneak junk through."""

    model_config = ConfigDict(extra="forbid")


class SearchFaqsArgs(_StrictBase):
    category: Optional[str] = Field(
        default="",
        description="One of 'Technical', 'Personal', 'Career', or empty for all.",
    )


class GetProjectOverviewArgs(_StrictBase):
    project_id: str = Field(..., min_length=1)


class GetProjectSectionArgs(_StrictBase):
    project_id: str = Field(..., min_length=1)
    section: str = Field(..., min_length=1)


class GetExperienceOverviewArgs(_StrictBase):
    experience_id: str = Field(..., min_length=1)


class GetExperienceSectionArgs(_StrictBase):
    experience_id: str = Field(..., min_length=1)
    section: str = Field(..., min_length=1)


# Lookup map used by tools.execute()
ARG_MODELS: dict[str, type[_StrictBase]] = {
    "search_faqs": SearchFaqsArgs,
    "get_project_overview": GetProjectOverviewArgs,
    "get_project_section": GetProjectSectionArgs,
    "get_experience_overview": GetExperienceOverviewArgs,
    "get_experience_section": GetExperienceSectionArgs,
}
