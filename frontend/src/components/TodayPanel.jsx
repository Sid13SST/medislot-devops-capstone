import { formatTime, isSameDay } from '../lib/appointments.js';
import { StatusBadge } from './AppointmentTable.jsx';

export default function TodayPanel({ appointments }) {
  const now = new Date();
  const today = appointments
    .filter((a) => isSameDay(new Date(a.scheduled_at), now) && a.status !== 'CANCELLED')
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Today’s queue</h2>
          <p className="muted">
            {now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>
      {today.length === 0 ? (
        <div className="empty small">No visits scheduled for today.</div>
      ) : (
        <ol className="timeline">
          {today.map((a) => (
            <li key={a.id}>
              <time>{formatTime(a.scheduled_at)}</time>
              <div>
                <b>{a.patient_name}</b>
                <small>{a.doctor_name}</small>
              </div>
              <StatusBadge status={a.status} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
