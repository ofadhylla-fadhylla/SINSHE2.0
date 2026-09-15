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

export function Panel({title, action, children, className=''}) {
  return <div className={`panel ${className}`}>{title && <SectionTitle title={title} action={action}/>}{children}</div>
}

export function BarList({data}) {
  const max = Math.max(...data.map(d => d.value))
  return <div className="bar-list">
    {data.map(d => <div key={d.label} className="bar-row">
      <span className="bar-label">{d.label}</span>
      <div className="bar-track"><span className={`bar-fill p-${d.tone || 'blue'}`} style={{width: `${(d.value / max) * 100}%`}}/></div>
      <b className="bar-val">{d.value}</b>
    </div>)}
  </div>
}

export function Donut({value, tone='green', label}) {
  const r = 52, c = 2 * Math.PI * r
  const stroke = { green: 'var(--green2)', red: 'var(--red)', blue: 'var(--blue)', orange: 'var(--orange)', purple: 'var(--purple)' }[tone]
  return <div className="donut">
    <svg viewBox="0 0 140 140" role="img" aria-label={`${label || 'Progress'}: ${value}%`}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="#eef0f3" strokeWidth="14"/>
      <circle cx="70" cy="70" r={r} fill="none" stroke={stroke} strokeWidth="14" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (c * value) / 100} transform="rotate(-90 70 70)"/>
      <text x="70" y="66" textAnchor="middle" className="donut-value">{value}%</text>
      {label && <text x="70" y="88" textAnchor="middle" className="donut-label">{label}</text>}
    </svg>
  </div>
}
