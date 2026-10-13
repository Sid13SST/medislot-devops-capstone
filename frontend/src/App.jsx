import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { filterAppointments } from './lib/appointments.js';
import Sidebar from './components/Sidebar.jsx';
import StatCards from './components/StatCards.jsx';
import AppointmentTable from './components/AppointmentTable.jsx';
import AppointmentModal from './components/AppointmentModal.jsx';
import TodayPanel from './components/TodayPanel.jsx';
import DepartmentChart from './components/DepartmentChart.jsx';
import DoctorsView from './components/DoctorsView.jsx';
import Toast from './components/Toast.jsx';

const EMPTY_STATS = { total: 0, today: 0, scheduled: 0, checkedIn: 0, completed: 0, cancelled: 0, noShow: 0, byDepartment: {} };
const REFRESH_MS = 30_000;

export default function App() {
  const [view, setView] = useState('dashboard');
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ status: 'ALL', department: 'ALL', query: '' });
  const [modal, setModal] = useState(null); // null | { mode: 'create' } | { mode: 'edit', appointment }
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, tone = 'success') => setToast({ message, tone, id: Date.now() }), []);
  const dismissToast = useCallback(() => setToast(null), []);
  const closeModal = useCallback(() => setModal(null), []);

  const load = useCallback(async () => {
    try {
      const [appts, docs, s] = await Promise.all([api.appointments(), api.doctors(), api.stats()]);
      setAppointments(appts);
      setDoctors(docs);
      setStats(s);
      setError('');
    } catch (e) {
      setError(e.message || 'Backend unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    api.info().then(setInfo).catch(() => setInfo(null));
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const visible = useMemo(() => filterAppointments(appointments, filters), [appointments, filters]);

  const runAction = async (fn, successMessage) => {
    try {
      await fn();
      notify(successMessage);
      await load();
      return true;
    } catch (e) {
      notify(e.message, 'error');
      return false;
    }
  };

  const changeStatus = (appointment, status, label) =>
    runAction(() => api.updateAppointment(appointment.id, { status }), `${appointment.patient_name}: ${label.toLowerCase()}`);

  const remove = (appointment) =>
    runAction(() => api.deleteAppointment(appointment.id), `Appointment for ${appointment.patient_name} deleted`);

  const save = async (payload) => {
    if (modal?.mode === 'edit') {
      await api.updateAppointment(modal.appointment.id, payload);
      notify('Appointment updated');
    } else {
      await api.createAppointment(payload);
      notify(`Appointment booked for ${payload.patient_name}`);
    }
    setModal(null);
    await load();
  };

  const addDoctor = (doctor) => runAction(() => api.createDoctor(doctor), `${doctor.name} added to the roster`);

  return (
    <div className="app">
      <Sidebar view={view} onNavigate={setView} info={info} />

      <main className="main">
        <header className="page-header">
          <div>
            <p className="eyebrow">{view === 'dashboard' ? 'Front desk / Today' : 'Clinic / Roster'}</p>
            <h1>{view === 'dashboard' ? 'Appointments' : 'Doctors'}</h1>
            <p className="muted">
              {view === 'dashboard'
                ? 'Book, check in and track every patient visit across departments.'
                : 'Who is consulting, in which department and room.'}
            </p>
          </div>
          {view === 'dashboard' && (
            <button className="btn btn-primary" onClick={() => setModal({ mode: 'create' })} disabled={!doctors.length}>
              <span aria-hidden>＋</span> New appointment
            </button>
          )}
        </header>

        {error && (
          <div className="alert" role="alert">
            <strong>Can’t reach the API.</strong> {error}. Make sure the backend and PostgreSQL are running — retrying automatically.
          </div>
        )}

        {view === 'dashboard' ? (
          <>
            <StatCards stats={stats} />
            <section className="content-grid">
              <AppointmentTable
                loading={loading}
                appointments={visible}
                totalCount={appointments.length}
                filters={filters}
                onFiltersChange={setFilters}
                onStatusChange={changeStatus}
                onEdit={(appointment) => setModal({ mode: 'edit', appointment })}
                onDelete={remove}
              />
              <aside className="side-column">
                <TodayPanel appointments={appointments} />
                <DepartmentChart byDepartment={stats.byDepartment} />
              </aside>
            </section>
          </>
        ) : (
          <DoctorsView doctors={doctors} appointments={appointments} onAdd={addDoctor} />
        )}

        <footer className="page-footer">
          MediSlot v{info?.version ?? '—'} · build <code>{info?.gitSha?.slice(0, 7) ?? 'unknown'}</code> ·{' '}
          {info?.environment ?? 'offline'}
        </footer>
      </main>

      {modal && (
        <AppointmentModal
          mode={modal.mode}
          appointment={modal.appointment}
          doctors={doctors}
          onClose={closeModal}
          onSave={save}
        />
      )}

      {toast && <Toast key={toast.id} {...toast} onDone={dismissToast} />}
    </div>
  );
}
