// Pure UI helpers (no React, no DOM) so they can be unit-tested with `node --test`.

export const DEPARTMENTS = ['GENERAL', 'CARDIOLOGY', 'DERMATOLOGY', 'PEDIATRICS', 'ORTHOPEDICS', 'NEUROLOGY'];

export const STATUS_META = {
  SCHEDULED: { label: 'Scheduled', tone: 'blue' },
  CHECKED_IN: { label: 'Checked in', tone: 'amber' },
  COMPLETED: { label: 'Completed', tone: 'green' },
  CANCELLED: { label: 'Cancelled', tone: 'grey' },
  NO_SHOW: { label: 'No-show', tone: 'red' },
};

// Mirrors the backend lifecycle rules in app/services.py.
const ACTIONS = {
  SCHEDULED: [
    { status: 'CHECKED_IN', label: 'Check in', kind: 'primary' },
    { status: 'NO_SHOW', label: 'No-show', kind: 'ghost' },
    { status: 'CANCELLED', label: 'Cancel', kind: 'ghost' },
  ],
  CHECKED_IN: [
    { status: 'COMPLETED', label: 'Complete', kind: 'primary' },
    { status: 'CANCELLED', label: 'Cancel', kind: 'ghost' },
  ],
  CANCELLED: [{ status: 'SCHEDULED', label: 'Rebook', kind: 'ghost' }],
  NO_SHOW: [{ status: 'SCHEDULED', label: 'Rebook', kind: 'ghost' }],
  COMPLETED: [],
};

export function nextActions(status) {
  return ACTIONS[status] ?? [];
}

export function titleCase(value) {
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function initials(name) {
  return name
    .replace(/^dr\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

const pad = (n) => String(n).padStart(2, '0');

export function toDateInput(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTimeInput(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Backend stores clinic wall-clock time, so we send a naive ISO string (no timezone). */
export function toWallClockIso(dateStr, timeStr) {
  return `${dateStr}T${timeStr}:00`;
}

export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDay(iso, now = new Date()) {
  const date = new Date(iso);
  if (isSameDay(date, now)) return 'Today';
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (isSameDay(date, tomorrow)) return 'Tomorrow';
  return date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Filter appointments by status chip, department and free-text search (patient, doctor or phone). */
export function filterAppointments(list, { status = 'ALL', department = 'ALL', query = '' } = {}) {
  const q = query.trim().toLowerCase();
  return list.filter(
    (a) =>
      (status === 'ALL' || a.status === status) &&
      (department === 'ALL' || a.department === department) &&
      (!q ||
        a.patient_name.toLowerCase().includes(q) ||
        a.doctor_name.toLowerCase().includes(q) ||
        a.patient_phone.replace(/\s/g, '').includes(q.replace(/\s/g, ''))),
  );
}

/** Default slot for the booking form: tomorrow at 10:00. */
export function defaultSlot(now = new Date()) {
  const slot = new Date(now);
  slot.setDate(slot.getDate() + 1);
  slot.setHours(10, 0, 0, 0);
  return slot;
}
