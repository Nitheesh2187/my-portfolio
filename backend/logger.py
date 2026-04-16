"""Coloured, uvicorn-style logging setup.

Import this module early (before other loggers fire) to apply the format
globally. Call `setup()` once from main.py.
"""

import logging

RESET = "\033[0m"
BOLD = "\033[1m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"
CYAN = "\033[36m"
MAGENTA = "\033[35m"
DIM = "\033[2m"

LEVEL_COLORS = {
    "DEBUG": DIM,
    "INFO": GREEN,
    "WARNING": YELLOW,
    "ERROR": RED,
    "CRITICAL": f"{BOLD}{RED}",
}


class ColorFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        color = LEVEL_COLORS.get(record.levelname, RESET)
        ts = self.formatTime(record, "%H:%M:%S")
        level = record.levelname.ljust(7)
        name = record.name
        msg = record.getMessage()
        formatted = f"{color}{record.levelname}{RESET}:     {MAGENTA}{name}{RESET}: {msg}"
        if record.exc_info and not record.exc_text:
            record.exc_text = self.formatException(record.exc_info)
        if record.exc_text:
            formatted += f"\n{record.exc_text}"
        return formatted


def setup() -> None:
    """Configure root logger with coloured output and silence noisy libs."""
    handler = logging.StreamHandler()
    handler.setFormatter(ColorFormatter())
    logging.root.handlers = [handler]
    logging.root.setLevel(logging.INFO)

    # Silence httpx/httpcore request-level spam.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
