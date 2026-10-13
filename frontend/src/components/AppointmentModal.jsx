import { useEffect, useMemo, useState } from 'react';
import { DEPARTMENTS, defaultSlot, titleCase, toDateInput, toTimeInput, toWallClockIso } from '../lib/appointments.js';

const DURATIONS = [15, 20, 30, 45, 60, 90];

function initialForm(appointment, doctors) {
  if (appointment) {
    const start = new Date(appointment.scheduled_at);
    return {
      patient_name: appointment.patient_name,
      patient_phone: appointment.patient_phone,
      department: appointment.department,
      doctor_id: String(appointment.doctor_id),
      date: toDateInput(start),
      time: toTimeInput(start),
      duration_minutes: appointment.duration_minutes,
      reason: appointment.reason,
    };
  }
  const slot = defaultSlot();
  const first = doctors[0];
  return {
    patient_name: '',
    patient_phone: '',
    department: first?.department ?? 'GENERAL',
    doctor_id: first ? String(first.id) : '',
    date: toDateInput(slot),
    time: toTimeInput(slot),
    duration_minutes: 30,
    reason: '',
  };
}

export default function AppointmentModal({ mode, appointment, doctors, onClose, onSave }) {
  const [form, setForm] = useState(() => initialForm(appointment, doctors));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const doctorsInDept = useMemo(() => doctors.filter((d) => d.department === form.department), [doctors, form.department]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const changeDepartment = (department) => {
    const firstDoctor = doctors.find((d) => d.department === department);
    update({ department, doctor_id: firstDoctor ? String(firstDoctor.id) : '' });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({
        patient_name: form.patient_name.trim(),
        patient_phone: form.patient_phone.trim(),
        doctor_id: Number(form.doctor_id),
        scheduled_at: toWallClockIso(form.date, form.time),
        duration_minutes: Number(form.duration_minutes),
        reason: form.reason.trim(),
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit} aria-labelledby="modal-title">
        <div className="modal-head">
          <div>
            <p className="eyebrow">{mode === 'edit' ? 'Reschedule' : 'New booking'}</p>
            <h2 id="modal-title">{mode === 'edit' ? 'Edit appointment' : 'Book an appointment'}</h2>
          </div>
          <button type="button" className="close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <div className="form-row">
          <label>
            Patient name
            <input
              required
              minLength={2}
              maxLength={120}
              value={form.patient_name}
              onChange={(e) => update({ patient_name: e.target.value })}
              placeholder="e.g. Rahul Sharma"
              autoFocus
            />
          </label>
          <label>
            Phone
            <input
              required
              type="tel"
              pattern="\+?[0-9][0-9 \-]{6,18}"
              title="Digits, spaces or dashes, optionally starting with +"
              value={form.patient_phone}
              onChange={(e) => update({ patient_phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </label>
        </div>

        <div className="form-row">
          <label>
            Department
            <select value={form.department} onChange={(e) => changeDepartment(e.target.value)}>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {titleCase(d)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Doctor
            <select required value={form.doctor_id} onChange={(e) => update({ doctor_id: e.target.value })}>
              {doctorsInDept.length === 0 && <option value="">No doctor in this department</option>}
              {doctorsInDept.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.room && `· ${d.room}`}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-row three">
          <label>
            Date
            <input required type="date" value={form.date} onChange={(e) => update({ date: e.target.value })} />
          </label>
          <label>
            Time
            <input required type="time" step="300" value={form.time} onChange={(e) => update({ time: e.target.value })} />
          </label>
          <label>
            Duration
            <select value={form.duration_minutes} onChange={(e) => update({ duration_minutes: e.target.value })}>
              {DURATIONS.map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Reason for visit
          <textarea
            maxLength={1000}
            value={form.reason}
            onChange={(e) => update({ reason: e.target.value })}
            placeholder="Symptoms, follow-up, routine check-up…"
          />
        </label>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving || !form.doctor_id}>
            {saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Book appointment'}
          </button>
        </div>
      </form>
    </div>
  );
}
