import Shell from '../../components/Shell'
import { SectionTitle, StatCard } from '../../components/Ui'
import { Activity, BrainCircuit, Cloud, Database, FileCheck2, Gauge, Leaf, Network, ShieldCheck, Smartphone, Users, Workflow } from 'lucide-react'

const modules = [
  ['1', 'Learning & Competency', 'Training, sertifikasi, kompetensi & lisensi', 'red'],
  ['2', 'Hazard & Risk Management', 'HIRA, JSA, Risk Register & Assessment', 'orange'],
  ['3', 'Inspection & Observation', 'Checklist, temuan & tindakan korektif', 'green'],
  ['4', 'Incident Management', 'Near miss, LTI, MTC, investigasi & RCA', 'teal'],
  ['5', 'Permit to Work', 'Work permit digital, approval & tracking', 'blue'],
  ['6', 'Asset Integrity Management', 'Boiler, crane, forklift, vessel & WWTP', 'navy'],
  ['7', 'Regulatory Compliance', 'Legal register, SMK3, ISPO, RSPO & ESG', 'purple'],
  ['8', 'Executive Dashboard', 'KPI, heatmap, analytics & reporting real-time', 'blue'],
  ['9', 'AI Recommendation Engine', 'Prediksi risiko, anomaly detection & rekomendasi', 'green'],
  ['10', 'Mobile Platform', 'Akses mobile, offline, QR, GPS & camera', 'green'],
]

export default function Ecosystem(){
  return <Shell title="SHINSE 2.0 Ecosystem" subtitle="Smart Integrated Network for Safety, Health & Environment — satu platform untuk data, proses, manusia dan teknologi.">
    <div className="hero-strip">
      <div><strong>FROM REACTIVE SAFETY</strong><span>TO PREDICTIVE SAFETY</span></div>
      <div className="hero-pills"><span>1 Platform Terintegrasi</span><span>Data Real-time</span><span>AI & Analitik</span><span>Keputusan Cepat</span></div>
    </div>

    <div className="stats-grid four">
      <StatCard label="Fatality" value="0" hint="Zero Harm" tone="red" icon={<ShieldCheck/>}/>
      <StatCard label="High Risk Incident" value="-50%" hint="vs 2025" tone="orange" icon={<Activity/>}/>
      <StatCard label="Response Time" value="-30%" hint="vs 2025" tone="blue" icon={<Gauge/>}/>
      <StatCard label="Compliance" value="100%" hint="Audit & Regulation" tone="purple" icon={<FileCheck2/>}/>
    </div>

    <div className="ecosystem-layout">
      <div className="panel">
        <SectionTitle title="Data Sources" />
        <div className="source-list">
          <div><Users/><span><b>People Data</b><small>Kompetensi, training, sertifikasi, perilaku & kesehatan.</small></span></div>
          <div><Workflow/><span><b>Process Data</b><small>SOP, workflow, permit, inspeksi, audit & investigasi.</small></span></div>
          <div><Database/><span><b>Operational Data</b><small>Produksi, maintenance, aset, energi & logistik.</small></span></div>
          <div><Network/><span><b>IoT & Sensor Data</b><small>Gas, suhu, getaran, lingkungan & alat berat.</small></span></div>
        </div>
      </div>

      <div className="panel wide">
        <SectionTitle title="Enterprise Modules" action="10 Modules" />
        <div className="module-grid">
          {modules.map(([n,title,desc,tone]) => <div className={`module-card m-${tone}`} key={n}><div className="module-no">{n}</div><div><h3>{title}</h3><p>{desc}</p></div></div>)}
        </div>
      </div>

      <div className="panel">
        <SectionTitle title="Key Enablers" />
        <div className="source-list">
          <div><Cloud/><span><b>Cloud Platform</b><small>Scalable, secure & highly available.</small></span></div>
          <div><ShieldCheck/><span><b>Cyber Security</b><small>Encryption, access management & audit trail.</small></span></div>
          <div><BrainCircuit/><span><b>AI & Machine Learning</b><small>Predictive model, anomaly detection & rekomendasi.</small></span></div>
          <div><Smartphone/><span><b>Mobile & Web</b><small>Akses mudah, kapan saja & di mana saja.</small></span></div>
        </div>
      </div>
    </div>

    <div className="value-row">
      <div><Gauge/><b>Visibility Menyeluruh</b><span>Data operasi real-time</span></div>
      <div><Activity/><b>Pencegahan Proaktif</b><span>Risiko teridentifikasi lebih dini</span></div>
      <div><Users/><b>Kolaborasi Kuat</b><span>Semua pihak terhubung</span></div>
      <div><Leaf/><b>Keberlanjutan</b><span>Operasi aman & lingkungan terjaga</span></div>
    </div>
  </Shell>
}
