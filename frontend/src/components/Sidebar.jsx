const NAV = [
  { id: 'dashboard', label: 'Appointments', icon: '▦' },
  { id: 'doctors', label: 'Doctors', icon: '⚕' },
];

const PIPELINE = ['Test', 'Build', 'Scan', 'Push', 'Deploy'];

export default function Sidebar({ view, onNavigate, info }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" aria-hidden>
          ✚
        </span>
        <div>
          <b>MediSlot</b>
          <small>Clinic scheduler</small>
        </div>
      </div>

      <nav aria-label="Main">
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`nav-link ${view === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
            aria-current={view === item.id ? 'page' : undefined}
          >
            <span aria-hidden>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="side-bottom">
        <div className="deploy-card">
          <strong>Delivery pipeline</strong>
          <div className="pipeline">
            {PIPELINE.map((step, i) => (
              <span key={step} className="pipeline-step">
                {i > 0 && <i aria-hidden />}
                {step}
              </span>
            ))}
          </div>
          <p>
            Running build <code>{info?.gitSha?.slice(0, 7) ?? '—'}</code>
          </p>
        </div>
        <div className="profile">
          <div className="avatar">SP</div>
          <div>
            <b>Siddhant Prasad</b>
            <small>Clinic admin</small>
          </div>
        </div>
      </div>
    </aside>
  );
}
