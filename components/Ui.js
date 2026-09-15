export function StatCard({label, value, hint, tone='green', icon}) {
  return <div className={`stat-card tone-${tone}`}>
    <div className="stat-icon">{icon}</div>
    <div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-hint">{hint}</div></div>
  </div>
}

export function SectionTitle({title, action}) {
  return <div className="section-title"><h2>{title}</h2>{action && <span>{action}</span>}</div>
}

export function Progress({value, tone='green'}) {
  return <div className="progress"><span className={`p-${tone}`} style={{width: `${value}%`}}/></div>
}

export function Badge({children, tone='green'}) {
  return <span className={`badge b-${tone}`}>{children}</span>
}
