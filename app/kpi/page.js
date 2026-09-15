import Shell from '../../components/Shell'
import { Progress, SectionTitle, StatCard } from '../../components/Ui'
import { AlertTriangle, BarChart3, CheckCircle2, Clock3, FileCheck2, Leaf, ShieldCheck, Users, Workflow } from 'lucide-react'

const kpis=[
 ['Fatality (Zero Harm)','Kasus','0','0'],['High Risk Incident','Kasus','-50%','-70%'],['Response Time (Rata-rata)','Menit','-30%','-50%'],['Safety Observation','Jumlah','+20%','+40%'],['Compliance Audit','%','100%','100%'],['ESG Performance Score','Skor','+10%','+20%']
]
const perspectives=[['People',78,'red'],['Process',72,'blue'],['Technology',75,'green'],['Governance',80,'purple'],['Sustainability',76,'green']]

export default function KPI(){return <Shell title="SHINSE 2.0 KPI Dashboard" subtitle="Mengukur kinerja implementasi secara terukur dan berkelanjutan menuju safety excellence.">
 <div className="stats-grid six">
  <StatCard label="Fatality" value="0" hint="Zero Harm" tone="red" icon={<ShieldCheck/>}/><StatCard label="High Risk Incident" value="-50%" hint="vs 2025" tone="orange" icon={<AlertTriangle/>}/><StatCard label="Response Time" value="-30%" hint="vs 2025" tone="blue" icon={<Clock3/>}/><StatCard label="Safety Observation" value="+20%" hint="vs 2025" tone="green" icon={<BarChart3/>}/><StatCard label="Compliance" value="100%" hint="Audit & Regulation" tone="purple" icon={<FileCheck2/>}/><StatCard label="ESG" value="↑" hint="Score improvement" tone="green" icon={<Leaf/>}/>
 </div>
 <div className="kpi-layout">
  <div className="panel"><SectionTitle title="KPI Utama"/><div className="table-wrap"><table><thead><tr><th>KPI</th><th>Satuan</th><th>Target 2026</th><th>Target 2027</th></tr></thead><tbody>{kpis.map((r,i)=><tr key={r[0]}><td><b>{r[0]}</b></td><td>{r[1]}</td><td className={i<3?'red-text':'green-text'}><b>{r[2]}</b></td><td><b>{r[3]}</b></td></tr>)}</tbody></table></div></div>
  <div className="panel"><SectionTitle title="Tren Kinerja KPI Utama"/><div className="chart-card"><svg viewBox="0 0 700 320" role="img" aria-label="KPI trend chart"><g className="grid-lines"><line x1="55" y1="45" x2="665" y2="45"/><line x1="55" y1="110" x2="665" y2="110"/><line x1="55" y1="175" x2="665" y2="175"/><line x1="55" y1="240" x2="665" y2="240"/></g><polyline className="line green" points="55,175 140,155 225,135 310,115 395,95 480,80 565,65 650,50"/><polyline className="line orange" points="55,175 140,190 225,210 310,230 395,245 480,260 565,272 650,282"/><polyline className="line blue" points="55,175 140,198 225,215 310,230 395,242 480,255 565,267 650,276"/></svg><div className="chart-legend"><span><i className="dot d-orange"/>High Risk Incident</span><span><i className="dot d-blue"/>Response Time</span><span><i className="dot d-green"/>Safety Observation</span></div></div></div>
  <div className="panel"><SectionTitle title="KPI by Perspective"/><div className="perspective-list">{perspectives.map(([n,v,t])=><div key={n}><div><b>{n}</b><span>{v}%</span></div><Progress value={v} tone={t}/></div>)}</div></div>
 </div>
 <div className="driver-row"><div><Users/><b>People</b><span>Keterlibatan semua level</span></div><div><Workflow/><b>Process</b><span>Monitoring & evaluasi berkelanjutan</span></div><div><BarChart3/><b>Technology</b><span>Data akurat & real-time</span></div><div><CheckCircle2/><b>Governance</b><span>Tindak lanjut cepat & berbasis data</span></div></div>
 </Shell>}
