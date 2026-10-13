import { useState } from 'react';
import { DEPARTMENTS, initials, isSameDay, titleCase } from '../lib/appointments.js';

export default function DoctorsView({ doctors, appointments, onAdd }) {
  const [form, setForm] = useState({ name: '', department: 'GENERAL', room: '' });
  const [saving, setSaving] = useState(false);
  const now = new Date();

  const workload = (doctorId) => {
    const mine = appointments.filter((a) => a.doctor_id === doctorId && a.status !== 'CANCELLED');
    return {
      today: mine.filter((a) => isSameDay(new Date(a.scheduled_at), now)).length,
      upcoming: mine.filter((a) => a.status === 'SCHEDULED').length,
    };
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const ok = await onAdd({ ...form, name: form.name.trim(), room: form.room.trim() });
    setSaving(false);
    if (ok) setForm({ name: '', department: form.department, room: '' });
  };

  return (
    <section className="doctors-layout">
      <div className="doctor-grid">
        {doctors.map((d) => {
          const load = workload(d.id);
          return (
            <article className="doctor-card" key={d.id}>
              <div className="doctor-avatar" aria-hidden>
                {initials(d.name)}
              </div>
              <div className="doctor-body">
                <b>{d.name}</b>
                <small>
                  {titleCase(d.department)}
                  {d.room && ` · Room ${d.room}`}
                </small>
                <div className="doctor-load">
                  <span>
                    <strong>{load.today}</strong> today
                  </span>
                  <span>
                    <strong>{load.upcoming}</strong> upcoming
                  </span>
                </div>
              </div>
            </article>
          );
        })}
        {doctors.length === 0 && <div className="empty">No doctors yet — add the first one.</div>}
      </div>

      <form className="panel add-doctor" onSubmit={submit}>
        <div className="panel-head">
          <div>
            <h2>Add a doctor</h2>
            <p className="muted">New doctors are bookable immediately.</p>
          </div>
        </div>
        <div className="panel-body">
          <label>
            Full name
            <input
              required
              minLength={3}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Dr. Kavya Menon"
            />
          </label>
          <label>
            Department
            <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {titleCase(dept)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Room
            <input value={form.room} maxLength={20} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="e.g. G-102" />
          </label>
          <button className="btn btn-primary full" disabled={saving}>
            {saving ? 'Adding…' : 'Add doctor'}
          </button>
        </div>
      </form>
    </section>
  );
}
