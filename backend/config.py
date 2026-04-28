"""Centralised configuration for the portfolio agent backend."""

# ---------------------------------------------------------------------------
# LLM (Groq)
# ---------------------------------------------------------------------------

MODEL = "openai/gpt-oss-120b"
TEMPERATURE = 0.7
MAX_TOKENS = 1024

# Agent loop
MAX_TURNS = 10
MAX_TOOL_USE_FAILURES = 4

# Transient error retries (network, 5xx)
MAX_RETRIES = 3
RETRY_BACKOFF_SECONDS = (1, 2, 4)

# ---------------------------------------------------------------------------
# Notion API
# ---------------------------------------------------------------------------

NOTION_API = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"

DATABASES = {
    "projects": "31438fa1-02e7-80a6-b4da-f0f4e64ce489",
    "experience": "31638fa1-02e7-8079-9c46-e54401593fe6",
    "skills": "33b38fa1-02e7-8042-b4db-d7feed0fb051",
    "certifications": "33b38fa1-02e7-8061-b5dd-d3f0e7f7d990",
    # "faqs": "33b38fa1-02e7-807e-8154-e7e3ef5a97af",
}

PAGES = {
    "education": "33b38fa1-02e7-800f-8be8-d4e3c9e0ee50",
    "career_goals": "33b38fa1-02e7-801d-86ad-fb87c7a10ef6",
    "availability": "33c38fa1-02e7-800c-86f3-c714acdbae38",
}

# ---------------------------------------------------------------------------
# Caching
# ---------------------------------------------------------------------------

API_CACHE_TTL = 600         # Notion API-level cache (seconds)
INDEX_TTL = 1800            # System prompt index rebuild interval (seconds)

# ---------------------------------------------------------------------------
# Notion block parsing
# ---------------------------------------------------------------------------

MAX_BLOCK_DEPTH = 4         # Recursive block extraction depth limit

# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

IDLE_TTL = 1800             # Session idle timeout (seconds)
MAX_HISTORY = 20            # Messages kept per session (older trimmed FIFO)
