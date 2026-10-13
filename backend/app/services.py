"""Business rules for appointments, kept separate from the HTTP layer so they are easy to test."""

from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Appointment

ACTIVE_STATUSES = ("SCHEDULED", "CHECKED_IN")

# Allowed lifecycle moves. COMPLETED is terminal; cancelled / no-show visits can be re-booked.
TRANSITIONS: dict[str, set[str]] = {
    "SCHEDULED": {"CHECKED_IN", "CANCELLED", "NO_SHOW"},
    "CHECKED_IN": {"COMPLETED", "CANCELLED"},
    "COMPLETED": set(),
    "CANCELLED": {"SCHEDULED"},
    "NO_SHOW": {"SCHEDULED"},
}


class BookingConflict(Exception):
    """Raised when a doctor already has an active appointment in the requested slot."""


class InvalidTransition(Exception):
    """Raised when a status change is not allowed by the appointment lifecycle."""


def end_time(start: datetime, duration_minutes: int) -> datetime:
    return start + timedelta(minutes=duration_minutes)


def can_transition(current: str, new: str) -> bool:
    return current == new or new in TRANSITIONS.get(current, set())


def ensure_slot_free(
    db: Session,
    doctor_id: int,
    start: datetime,
    duration_minutes: int,
    exclude_id: int | None = None,
) -> None:
    """Two appointments overlap when each one starts before the other ends."""
    stmt = select(Appointment.id).where(
        Appointment.doctor_id == doctor_id,
        Appointment.status.in_(ACTIVE_STATUSES),
        Appointment.scheduled_at < end_time(start, duration_minutes),
        Appointment.ends_at > start,
    )
    if exclude_id is not None:
        stmt = stmt.where(Appointment.id != exclude_id)
    clash = db.scalars(stmt.limit(1)).first()
    if clash is not None:
        raise BookingConflict(f"Doctor already has appointment #{clash} in this time slot")
