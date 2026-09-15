import Shell from '../../components/Shell'
import { Badge, BarList, Panel, Progress, StatCard } from '../../components/Ui'
import { CheckCircle2, ClipboardCheck, Eye, ListChecks, XCircle } from 'lucide-react'

const inspections = [
  ['INS-2026-118', 'APAR & Fire Protection', 'PKS A', 'Selesai', 96, 'compliant'],
  ['INS-2026-119', 'Housekeeping Workshop', 'Estate 2', 'Selesai', 88, 'compliant'],
  ['INS-2026-120', 'Alat Angkat Angkut', 'PKS C', 'Temuan', 72, 'finding'],
  ['INS-2026-121', 'Kelistrikan Panel', 'PKS B', 'Proses', 0, 'progress'],
  ['INS-2026-122', 'Chemical Storage', 'Laboratorium', 'Temuan', 65, 'finding'],
  ['INS-2026-123', 'Ergonomi Kantor', 'Head Office', 'Selesai', 91, 'compliant'],
]

const findings = [
  { label: 'Terbuka', value: 18, tone: 'red' },
  { label: 'Dalam Proses', value: 24, tone: 'orange' },
  { label: 'Selesai', value: 142, tone: 'green' },
]

const observations = [
  ['Unsafe Action', 'Tidak memakai APD di area produksi', 'PKS A', 'Terbuka', 'red'],
  ['Unsafe Condition', 'Ceceran oli di jalur pejalan kaki', 'Estate 3', 'Proses', 'orange'],
  ['Positive Act', 'Pekerja melapor kebocoran gas', 'PKS B', 'Ditutup', 'green'],
  ['Near Miss', 'Material jatuh dari ketinggian', 'PKS C', 'Investigasi', 'blue'],
]

const statusTone = s => s === 'compliant' ? 'green' : s === 'finding' ? 'orange' : 'blue'

export default function Inspection(){
  return <Shell title="Inspection & Observation" subtitle="Digitalisasi checklist inspeksi, pengamatan perilaku (BBS) dan penutupan temuan.">
    <div className="stats-grid four">
      <StatCard label="Inspeksi Bulan Ini" value="164" hint="98% terjadwal" tone="blue" icon={<ClipboardCheck/>}/>
      <StatCard label="Observasi (BBS)" value="512" hint="+20% vs 2025" tone="green" icon={<Eye/>}/>
      <StatCard label="Temuan Terbuka" value="18" hint="perlu tindak lanjut" tone="red" icon={<XCircle/>}/>
      <StatCard label="Closure Rate" value="89%" hint="rata-rata 6 hari" tone="purple" icon={<CheckCircle2/>}/>
    </div>

    <div className="dashboard-split">
      <Panel className="table-panel" title="Jadwal & Hasil Inspeksi">
        <div className="table-wrap"><table>
          <thead><tr><th>No Inspeksi</th><th>Objek</th><th>Lokasi</th><th>Status</th><th>Skor</th></tr></thead>
          <tbody>{inspections.map(r => (
            <tr key={r[0]}><td><b>{r[0]}</b></td><td>{r[1]}</td><td>{r[2]}</td><td><Badge tone={statusTone(r[5])}>{r[3]}</Badge></td>
              <td style={{minWidth:120}}>{r[4] ? <><b>{r[4]}%</b><Progress value={r[4]} tone={r[4] >= 85 ? 'green' : 'orange'}/></> : '-'}</td></tr>
          ))}</tbody>
        </table></div>
      </Panel>

      <Panel title="Status Temuan">
        <BarList data={findings}/>
        <div className="ai-card" style={{marginTop:16}}>
          <ListChecks/><div><b>SLA Penutupan</b><p>Rata-rata waktu penutupan temuan 6 hari, target maksimal 7 hari. 3 temuan mendekati batas SLA.</p></div>
        </div>
      </Panel>
    </div>

    <Panel title="Observasi Perilaku Terbaru (Behavior Based Safety)" className="mt">
      <div className="table-wrap"><table>
        <thead><tr><th>Tipe</th><th>Deskripsi</th><th>Lokasi</th><th>Status</th></tr></thead>
        <tbody>{observations.map((o, i) => (
          <tr key={i}><td><b>{o[0]}</b></td><td>{o[1]}</td><td>{o[2]}</td><td><Badge tone={o[4]}>{o[3]}</Badge></td></tr>
        ))}</tbody>
      </table></div>
    </Panel>
  </Shell>
}
