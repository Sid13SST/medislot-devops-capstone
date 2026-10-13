import { useState } from 'react';
import { DEPARTMENTS, STATUS_META, formatDay, formatTime, nextActions, titleCase } from '../lib/appointments.js';

const STATUS_FILTERS = ['ALL', 'SCHEDULED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? { label: status, tone: 'grey' };
  return <span className={`badge tone-${meta.tone}`}>{meta.label}</span>;
}

export default function AppointmentTable({
  loading,
  appointments,
  totalCount,
  filters,
  onFiltersChange,
  onStatusChange,
  onEdit,
  onDelete,
}) {
  const [confirmingId, setConfirmingId] = useState(null);
  const set = (patch) => onFiltersChange({ ...filters, ...patch });

  return (
    <div className="panel">
      <div className="panel-head wrap">
        <div>
          <h2>Appointment book</h2>
          <p className="muted">
            Showing {appointments.length} of {totalCount}
          </p>
        </div>
        <div className="toolbar">
          <input
            type="search"
            className="search"
            placeholder="Search patient, doctor or phone…"
            value={filters.query}
            onChange={(e) => set({ query: e.target.value })}
            aria-label="Search appointments"
          />
          <select value={filters.department} onChange={(e) => set({ department: e.target.value })} aria-label="Department">
            <option value="ALL">All departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {titleCase(d)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="chips" role="tablist" aria-label="Filter by status">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={filters.status === s}
            className={`chip ${filters.status === s ? 'selected' : ''}`}
            onClick={() => set({ status: s })}
          >
            {s === 'ALL' ? 'All' : STATUS_META[s].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty">
          <span className="spinner" aria-hidden /> Loading appointments…
        </div>
      ) : appointments.length === 0 ? (
        <div className="empty">
          <b>No appointments here.</b>
          <span>Try a different filter or book a new appointment.</span>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>When</th>
                <th>Doctor</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td data-label="Patient">
                    <div className="cell-main">
                      <b>{a.patient_name}</b>
                      <small>
                        {a.patient_phone}
                        {a.reason && ` · ${a.reason}`}
                      </small>
                    </div>
                  </td>
                  <td data-label="When">
                    <div className="cell-main">
                      <b>{formatTime(a.scheduled_at)}</b>
                      <small>
                        {formatDay(a.scheduled_at)} · {a.duration_minutes} min
                      </small>
                    </div>
                  </td>
                  <td data-label="Doctor">
                    <div className="cell-main">
                      <b>{a.doctor_name}</b>
                      <small>{titleCase(a.department)}</small>
                    </div>
                  </td>
                  <td data-label="Status">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="actions-cell">
                    {confirmingId === a.id ? (
                      <div className="actions">
                        <span className="confirm-text">Delete?</span>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            setConfirmingId(null);
                            onDelete(a);
                          }}
                        >
                          Yes
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setConfirmingId(null)}>
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="actions">
                        {nextActions(a.status).map((action) => (
                          <button
                            key={action.status}
                            className={`btn btn-sm btn-${action.kind}`}
                            onClick={() => onStatusChange(a, action.status, action.label)}
                          >
                            {action.label}
                          </button>
                        ))}
                        {a.status !== 'COMPLETED' && (
                          <button className="icon-btn" title="Edit appointment" aria-label="Edit" onClick={() => onEdit(a)}>
                            ✎
                          </button>
                        )}
                        <button
                          className="icon-btn"
                          title="Delete appointment"
                          aria-label="Delete"
                          onClick={() => setConfirmingId(a.id)}
                        >
                          🗑
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
