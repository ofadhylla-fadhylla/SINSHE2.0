import Shell from '../../components/Shell'
import { Badge, BarList, Panel, StatCard } from '../../components/Ui'
import { Activity, AlertOctagon, HeartPulse, Search, Siren } from 'lucide-react'

const incidents = [
  ['INC-2026-045', 'Near Miss', 'Material jatuh dari conveyor', 'PKS A', '02 Sep 2026', 'Investigasi', 'orange'],
  ['INC-2026-044', 'First Aid', 'Luka gores tangan operator', 'Estate 3', '28 Aug 2026', 'Selesai', 'green'],
  ['INC-2026-043', 'LTI', 'Terpeleset area basah', 'PKS B', '21 Aug 2026', 'RCA', 'red'],
  ['INC-2026-042', 'Property Damage', 'Tabrakan forklift dengan rak', 'Gudang', '15 Aug 2026', 'Selesai', 'green'],
  ['INC-2026-041', 'Medical Treatment', 'Paparan uap kimia ringan', 'Laboratorium', '09 Aug 2026', 'Monitoring', 'blue'],
]

const byType = [
  { label: 'Near Miss', value: 34, tone: 'blue' },
  { label: 'First Aid', value: 21, tone: 'green' },
  { label: 'Medical Treatment', value: 12, tone: 'orange' },
  { label: 'Lost Time Injury', value: 4, tone: 'red' },
]

const timeline = [
  ['Laporan Awal', 'INC-2026-043 dilaporkan oleh pengawas lapangan', '21 Aug, 08:12', 'red'],
  ['Tindakan Darurat', 'Korban ditangani tim P3K & dievakuasi', '21 Aug, 08:30', 'orange'],
  ['Investigasi', 'Tim K3 mengumpulkan bukti & wawancara saksi', '22 Aug, 10:00', 'blue'],
  ['Root Cause Analysis', 'Analisis 5-Why & fishbone diselesaikan', '24 Aug, 14:20', 'purple'],
  ['Corrective Action', 'Pemasangan rambu & anti-slip di area basah', '26 Aug, 09:00', 'green'],
]

export default function Incident(){
  return <Shell title="Incident Management" subtitle="Pelaporan insiden, investigasi, root cause analysis, dan tindakan korektif terintegrasi.">
    <div className="stats-grid four">
      <StatCard label="Insiden YTD" value="71" hint="-12% vs 2025" tone="blue" icon={<Siren/>}/>
      <StatCard label="Lost Time Injury" value="4" hint="LTIFR 0.36" tone="red" icon={<AlertOctagon/>}/>
      <StatCard label="Dalam Investigasi" value="6" hint="3 high priority" tone="orange" icon={<Search/>}/>
      <StatCard label="Days Without LTI" value="184" hint="rekor 210 hari" tone="green" icon={<HeartPulse/>}/>
    </div>

    <div className="dashboard-split">
      <Panel className="table-panel" title="Daftar Insiden Terbaru">
        <div className="table-wrap"><table>
          <thead><tr><th>ID</th><th>Tipe</th><th>Deskripsi</th><th>Lokasi</th><th>Tanggal</th><th>Status</th></tr></thead>
          <tbody>{incidents.map(r => (
            <tr key={r[0]}><td><b>{r[0]}</b></td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td>{r[4]}</td><td><Badge tone={r[6]}>{r[5]}</Badge></td></tr>
          ))}</tbody>
        </table></div>
      </Panel>

      <Panel title="Insiden per Tipe">
        <BarList data={byType}/>
        <div className="ai-card" style={{marginTop:16}}>
          <Activity/><div><b>Safety Pyramid</b><p>Rasio near miss terhadap recordable meningkat, menandakan pelaporan proaktif membaik.</p></div>
        </div>
      </Panel>
    </div>

    <Panel title="Alur Investigasi — INC-2026-043 (LTI)" className="mt">
      <div className="timeline">
        {timeline.map(([t, d, time, tone], i) => (
          <div className="tl-item" key={i}>
            <div className={`tl-dot p-${tone}`} />
            <div className="tl-body"><div className="tl-head"><b>{t}</b><span>{time}</span></div><p>{d}</p></div>
          </div>
        ))}
      </div>
    </Panel>
  </Shell>
}
