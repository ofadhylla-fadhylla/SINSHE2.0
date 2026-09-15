import Shell from '../components/Shell'
import { Badge, BarList, Donut, Panel, Progress, SectionTitle, StatCard } from '../components/Ui'
import { AlertTriangle, Award, CheckCircle2, Clock3, FileCheck2, Flame, Gauge, ShieldCheck, Siren, TrendingDown } from 'lucide-react'

const estates = ['PKS A', 'PKS B', 'PKS C', 'Estate 1', 'Estate 2', 'Estate 3']
const risks = ['Kebakaran', 'Alat Berat', 'Bahan Kimia', 'Kelistrikan', 'Confined Space']
const heat = [
  [1, 2, 1, 3, 2, 1],
  [3, 4, 2, 2, 3, 2],
  [2, 1, 3, 1, 2, 4],
  [2, 3, 1, 4, 1, 2],
  [4, 2, 3, 2, 3, 1],
]
const heatTone = v => v >= 4 ? 'h-crit' : v === 3 ? 'h-high' : v === 2 ? 'h-med' : 'h-low'

const incidents = [
  { label: 'Near Miss', value: 34, tone: 'blue' },
  { label: 'First Aid', value: 21, tone: 'green' },
  { label: 'Medical Treatment', value: 12, tone: 'orange' },
  { label: 'Lost Time Injury', value: 4, tone: 'red' },
  { label: 'Property Damage', value: 9, tone: 'purple' },
]

const reminders = [
  ['Riksa Uji Boiler 1', 'PKS A', '12 Hari', 'red'],
  ['SIO Forklift 23', 'Estate 3', '20 Hari', 'orange'],
  ['Audit SMK3 Internal', 'Head Office', '45 Hari', 'blue'],
  ['Renewal Izin Lingkungan', 'PKS B', '58 Hari', 'green'],
]

export default function Executive(){
  return <Shell title="Executive Dashboard" subtitle="Ringkasan kinerja Safety, Health & Environment lintas unit operasi secara real-time.">
    <div className="stats-grid six">
      <StatCard label="TRIFR" value="1.42" hint="-18% vs 2025" tone="green" icon={<TrendingDown/>}/>
      <StatCard label="LTIFR" value="0.36" hint="Target < 0.50" tone="green" icon={<ShieldCheck/>}/>
      <StatCard label="Open Incident" value="7" hint="3 high priority" tone="orange" icon={<Siren/>}/>
      <StatCard label="Overdue Action" value="12" hint="perlu tindak lanjut" tone="red" icon={<AlertTriangle/>}/>
      <StatCard label="Compliance" value="92.4%" hint="+8.6% vs bulan lalu" tone="blue" icon={<FileCheck2/>}/>
      <StatCard label="Active Permit" value="28" hint="hari ini" tone="purple" icon={<Award/>}/>
    </div>

    <div className="exec-grid">
      <Panel title="Tren Insiden & Observasi (12 Bulan)" action="2026">
        <div className="chart-card">
          <svg viewBox="0 0 700 300" role="img" aria-label="Tren insiden dan observasi">
            <g className="grid-lines"><line x1="45" y1="40" x2="675" y2="40"/><line x1="45" y1="105" x2="675" y2="105"/><line x1="45" y1="170" x2="675" y2="170"/><line x1="45" y1="235" x2="675" y2="235"/></g>
            <polyline className="line green" points="45,150 100,135 157,145 214,120 271,110 328,95 385,100 442,85 499,78 556,70 613,62 670,55"/>
            <polyline className="line orange" points="45,200 100,205 157,190 214,195 271,180 328,185 385,170 442,175 499,160 556,165 613,150 670,148"/>
            <polyline className="line red" points="45,240 100,238 157,242 214,230 271,232 328,225 385,228 442,220 499,222 556,215 613,214 670,208"/>
          </svg>
          <div className="chart-legend"><span><i className="dot d-green"/>Safety Observation</span><span><i className="dot d-orange"/>Near Miss</span><span><i className="dot d-red"/>Recordable Incident</span></div>
        </div>
      </Panel>

      <Panel title="Safety Performance Index">
        <div className="donut-wrap"><Donut value={87} tone="green" label="Index"/></div>
        <div className="mini-metric-list">
          <div><span>Leading Indicator</span><b className="green-text">Baik</b></div>
          <div><span>Lagging Indicator</span><b className="green-text">Terkendali</b></div>
          <div><span>Days Without LTI</span><b>184 Hari</b></div>
        </div>
      </Panel>
    </div>

    <div className="exec-grid two">
      <Panel title="Risk Heatmap per Unit">
        <div className="heatmap">
          <div className="heat-corner" />
          {estates.map(e => <div key={e} className="heat-col-head">{e}</div>)}
          {risks.map((r, ri) => (
            <div className="heat-row" key={r}>
              <div className="heat-row-head">{r}</div>
              {heat[ri].map((v, ci) => <div key={ci} className={`heat-cell ${heatTone(v)}`}>{v}</div>)}
            </div>
          ))}
        </div>
        <div className="heat-legend">
          <span><i className="hl h-low"/>Rendah</span><span><i className="hl h-med"/>Sedang</span><span><i className="hl h-high"/>Tinggi</span><span><i className="hl h-crit"/>Kritis</span>
        </div>
      </Panel>

      <Panel title="Insiden per Kategori">
        <BarList data={incidents}/>
      </Panel>
    </div>

    <div className="exec-grid two">
      <Panel title="Compliance per Standar">
        <div className="perspective-list">
          {[['SMK3 (PP 50/2012)', 94, 'green'], ['ISPO', 89, 'orange'], ['RSPO', 88, 'orange'], ['ISO 45001', 95, 'green'], ['ISO 14001', 91, 'green']].map(([n, v, t]) => (
            <div key={n}><div><b>{n}</b><span>{v}%</span></div><Progress value={v} tone={t}/></div>
          ))}
        </div>
      </Panel>

      <Panel title="Upcoming & Reminder" action="Prioritas">
        <div className="reminder-list">
          {reminders.map(([t, loc, due, tone]) => (
            <div key={t}><Clock3/><span><b>{t}</b><small>{loc}</small></span><Badge tone={tone}>{due}</Badge></div>
          ))}
        </div>
      </Panel>
    </div>

    <div className="impact-grid">
      <div><ShieldCheck/><b>0</b><span>Fatality (Zero Harm)</span></div>
      <div><CheckCircle2/><b>96%</b><span>Action closure rate</span></div>
      <div><Gauge/><b>-30%</b><span>Response time</span></div>
      <div><Flame/><b>-42%</b><span>High risk finding</span></div>
    </div>
  </Shell>
}
