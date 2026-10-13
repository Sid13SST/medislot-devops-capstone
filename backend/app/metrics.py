"""Custom business metrics, exported on /metrics next to the default HTTP metrics."""

from prometheus_client import Counter

APPOINTMENTS_BOOKED = Counter(
    "medislot_appointments_booked_total",
    "Appointments booked through the API",
    ["department"],
)

APPOINTMENT_STATUS_CHANGES = Counter(
    "medislot_appointment_status_changes_total",
    "Appointment status transitions",
    ["status"],
)

BOOKING_CONFLICTS = Counter(
    "medislot_booking_conflicts_total",
    "Booking attempts rejected because the doctor was already busy",
)
