"""Exception types used by the agent loop."""

from __future__ import annotations


class UserFacingError(Exception):
    """Raised when we need to terminate the turn with a message the user should see.

    The loop catches this, streams the message as content to the frontend, and
    ends the SSE stream. The failed turn is NOT persisted to session history.
    """

    def __init__(self, user_message: str):
        self.user_message = user_message
        super().__init__(user_message)
