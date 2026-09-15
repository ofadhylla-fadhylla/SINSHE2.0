import Shell from '../../components/Shell'
import { Badge, Panel, StatCard } from '../../components/Ui'
import { CheckCircle2, ClipboardSignature, Clock3, FileWarning, Flame } from 'lucide-react'

const kanban = [
  {
    title: 'Menunggu Approval', tone: 'orange', items: [
      ['PTW-2026-311', 'Hot Work — Pengelasan pipa', 'PKS A', 'Hot Work'],
      ['PTW-2026-312', 'Confined Space — WWTP', 'PKS C', 'Confined'],
    ],
  },
  {
    title: 'Aktif / Berjalan', tone: 'green', items: [
      ['PTW-2026-305', 'Working at Height — Cerobong', 'PKS B', 'Height'],
      ['PTW-2026-307', 'Electrical — Panel LVMDP', 'PKS A', 'Electrical'],
      ['PTW-2026-309', 'Excavation — Jalur pipa', 'Estate 2', 'Excavation'],
    ],
  },
  {
    title: 'Selesai / Ditutup', tone: 'blue', items: [
      ['PTW-2026-298', 'Hot Work — Perbaikan tangki', 'PKS C', 'Hot Work'],
      ['PTW-2026-301', 'Lifting — Crane overhead', 'Gudang', 'Lifting'],
    ],
  },
]

const permits = [
  ['PTW-2026-311', 'Hot Work', 'PKS A', 'Ahmad R.', 'Menunggu', 'orange'],
  ['PTW-2026-305', 'Working at Height', 'PKS B', 'Budi S.', 'Aktif', 'green'],
  ['PTW-2026-307', 'Electrical', 'PKS A', 'Citra D.', 'Aktif', 'green'],
  ['PTW-2026-312', 'Confined Space', 'PKS C', 'Dedi P.', 'Menunggu', 'orange'],
  ['PTW-2026-298', 'Hot Work', 'PKS C', 'Eka W.', 'Ditutup', 'blue'],
]

export default function PermitToWork(){
  return <Shell title="Permit to Work" subtitle="Sistem izin kerja digital dengan approval berjenjang, kontrol bahaya, dan pelacakan real-time.">
    <div className="stats-grid four">
      <StatCard label="Permit Aktif" value="28" hint="hari ini" tone="green" icon={<CheckCircle2/>}/>
      <StatCard label="Menunggu Approval" value="9" hint="rata-rata 2 jam" tone="orange" icon={<Clock3/>}/>
      <StatCard label="Hot Work" value="6" hint="pengawasan ketat" tone="red" icon={<Flame/>}/>
      <StatCard label="Expired / Overdue" value="2" hint="perlu ditutup" tone="purple" icon={<FileWarning/>}/>
    </div>

    <div className="kanban">
      {kanban.map(col => (
        <div className="kanban-col" key={col.title}>
          <div className={`kanban-head k-${col.tone}`}>{col.title}<span>{col.items.length}</span></div>
          <div className="kanban-body">
            {col.items.map(it => (
              <div className="ptw-card" key={it[0]}>
                <div className="ptw-top"><b>{it[0]}</b><Badge tone={col.tone}>{it[3]}</Badge></div>
                <p>{it[1]}</p><small>{it[2]}</small>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>

    <Panel title="Registrasi Permit to Work" className="mt">
      <div className="table-wrap"><table>
        <thead><tr><th>No PTW</th><th>Jenis Pekerjaan</th><th>Lokasi</th><th>Penanggung Jawab</th><th>Status</th></tr></thead>
        <tbody>{permits.map(r => (
          <tr key={r[0]}><td><b>{r[0]}</b></td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td><Badge tone={r[5]}>{r[4]}</Badge></td></tr>
        ))}</tbody>
      </table></div>
    </Panel>

    <div className="benefit-row">
      <div><ClipboardSignature/><b>Approval Cepat</b><span>Alur persetujuan digital berjenjang.</span></div>
      <div><Flame/><b>Kontrol Bahaya</b><span>Verifikasi JSA & isolasi energi.</span></div>
      <div><CheckCircle2/><b>Akuntabilitas</b><span>Jejak audit lengkap tiap izin.</span></div>
      <div><Clock3/><b>Real-time</b><span>Status izin terpantau langsung.</span></div>
    </div>
  </Shell>
}
