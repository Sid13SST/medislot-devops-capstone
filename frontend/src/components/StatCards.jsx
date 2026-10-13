export default function StatCards({ stats }) {
  const cards = [
    { label: "Today's visits", value: stats.today, hint: 'Excluding cancellations', tone: 'teal', icon: '◷' },
    { label: 'Upcoming', value: stats.scheduled, hint: 'Scheduled, not yet arrived', tone: 'blue', icon: '▤' },
    { label: 'In clinic now', value: stats.checkedIn, hint: 'Checked in, waiting', tone: 'amber', icon: '◔' },
    { label: 'Completed', value: stats.completed, hint: `${stats.total} appointments total`, tone: 'green', icon: '✓' },
    { label: 'Cancelled / no-show', value: stats.cancelled + stats.noShow, hint: 'Slots released', tone: 'red', icon: '✕' },
  ];
  return (
    <section className="stats" aria-label="Key figures">
      {cards.map((card) => (
        <div className="stat" key={card.label}>
          <div className={`stat-icon tone-${card.tone}`} aria-hidden>
            {card.icon}
          </div>
          <div>
            <small>{card.label}</small>
            <strong>{card.value}</strong>
            <span>{card.hint}</span>
          </div>
        </div>
      ))}
    </section>
  );
}
