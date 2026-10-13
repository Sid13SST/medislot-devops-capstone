import { DEPARTMENTS, titleCase } from '../lib/appointments.js';

export default function DepartmentChart({ byDepartment }) {
  const max = Math.max(1, ...Object.values(byDepartment));
  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Load by department</h2>
          <p className="muted">All appointments on record</p>
        </div>
      </div>
      <ul className="bars">
        {DEPARTMENTS.map((dept) => {
          const count = byDepartment[dept] ?? 0;
          return (
            <li key={dept}>
              <span>{titleCase(dept)}</span>
              <div className="bar-track" role="img" aria-label={`${titleCase(dept)}: ${count}`}>
                <div className="bar-fill" style={{ width: `${(count / max) * 100}%` }} />
              </div>
              <b>{count}</b>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
