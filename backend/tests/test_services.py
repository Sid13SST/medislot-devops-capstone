"""Unit tests for pure business rules (no HTTP, no database)."""

from datetime import datetime

import pytest

from app.services import can_transition, end_time


@pytest.mark.parametrize(
    ("current", "new", "allowed"),
    [
        ("SCHEDULED", "CHECKED_IN", True),
        ("SCHEDULED", "CANCELLED", True),
        ("SCHEDULED", "NO_SHOW", True),
        ("SCHEDULED", "COMPLETED", False),
        ("CHECKED_IN", "COMPLETED", True),
        ("COMPLETED", "CANCELLED", False),
        ("CANCELLED", "SCHEDULED", True),
        ("NO_SHOW", "SCHEDULED", True),
        ("CHECKED_IN", "CHECKED_IN", True),
    ],
)
def test_can_transition(current, new, allowed):
    assert can_transition(current, new) is allowed


def test_end_time_adds_duration():
    assert end_time(datetime(2030, 1, 1, 9, 45), 30) == datetime(2030, 1, 1, 10, 15)
