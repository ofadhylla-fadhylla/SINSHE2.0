import Shell from '../../components/Shell'
import { Badge, Progress, SectionTitle, StatCard } from '../../components/Ui'
import { AlertTriangle, Bot, CheckCircle2, Clock3, FileCheck2, Gauge, Leaf, Scale, ShieldCheck } from 'lucide-react'

const matrix=[
 ['UU K3 & Turunannya',64,52,9,3,94.7],['Permenaker RI',112,86,20,6,91.1],['ISO Standards',78,66,9,3,94.9],['SMK3 (PP 50/2012)',62,50,8,4,90.3],['RSPO Standards',54,47,9,4,88.5],['ISPO Standards',41,32,6,3,89.0],['ESG Regulations',39,31,6,2,92.3]
]

export default function Regulatory(){
 return <Shell title="Regulatory Compliance" subtitle="Monitoring kewajiban regulasi dan standar secara terintegrasi, real-time, dan audit-ready.">
  <div className="stats-grid four">
   <StatCard label="Overall Compliance" value="92.4%" hint="+8.6% vs last month" tone="green" icon={<CheckCircle2/>}/>
   <StatCard label="Audit Readiness" value="88%" hint="Audit ready" tone="blue" icon={<FileCheck2/>}/>
   <StatCard label="Regulation Coverage" value="100%" hint="Seluruh regulasi terdaftar" tone="purple" icon={<ShieldCheck/>}/>
   <StatCard label="Total Obligation" value="486" hint="152 regulasi" tone="orange" icon={<Scale/>}/>
  </div>

  <div className="dashboard-split compliance-layout">
   <div className="panel table-panel">
    <SectionTitle title="Compliance Matrix" />
    <div className="table-wrap"><table><thead><tr><th>Regulasi / Standard</th><th>Kewajiban</th><th>Compliant</th><th>Needs Action</th><th>Non Compliant</th><th>Score</th></tr></thead><tbody>
     {matrix.map(r=><tr key={r[0]}><td><b>{r[0]}</b></td><td>{r[1]}</td><td>{r[2]}</td><td><Badge tone="orange">{r[3]}</Badge></td><td><Badge tone="red">{r[4]}</Badge></td><td><b>{r[5]}%</b><Progress value={r[5]} tone={r[5]<90?'orange':'green'}/></td></tr>)}
    </tbody></table></div>
    <div className="env-block"><SectionTitle title="Environmental Compliance & Monitoring" />
      <div className="env-grid"><div><Gauge/><b>SPARING Online</b><span>COD 12.4 mg/L • BOD 6.1 mg/L • pH 7.2</span></div><div><Leaf/><b>Air Limbah</b><span>Monitoring kualitas air limbah pabrik</span></div><div><ActivityIcon/><b>Emission Monitoring</b><span>Cerobong & udara ambien real-time</span></div><div><FileCheck2/><b>Environmental Permit</b><span>Izin lingkungan & dokumen legal</span></div></div>
    </div>
   </div>
   <div className="panel reminder-panel"><SectionTitle title="Upcoming & Reminder"/>
    <div className="reminder-list"><div><AlertTriangle/><span><b>Riksa Uji Boiler</b><small>Permenaker No. 37/2016</small></span><Badge tone="red">12 Hari</Badge></div><div><Clock3/><span><b>SIO Forklift</b><small>Permenaker No. 8/2020</small></span><Badge tone="orange">20 Hari</Badge></div><div><FileCheck2/><span><b>Audit SMK3 Internal</b><small>PP No. 50/2012</small></span><Badge tone="blue">45 Hari</Badge></div></div>
    <div className="ai-card"><Bot/><div><b>AI Notification</b><p>2 kewajiban berisiko tinggi, 5 dokumen akan expired dalam 30 hari, dan 12 tindakan korektif overdue.</p><button className="primary-btn">Lihat Rekomendasi AI</button></div></div>
   </div>
  </div>

  <div className="impact-grid"><div><ShieldCheck/><b>-60%</b><span>Risiko ketidakpatuhan</span></div><div><FileCheck2/><b>100%</b><span>Kesiapan audit</span></div><div><Leaf/><b>-10%</b><span>Dampak lingkungan</span></div><div><Clock3/><b>-70%</b><span>Waktu pelaporan</span></div></div>
 </Shell>
}

function ActivityIcon(){return <Gauge/>}
