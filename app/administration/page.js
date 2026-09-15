'use client'
import Shell from '../../components/Shell'
import { Badge, Panel, StatCard } from '../../components/Ui'
import { Building2, Database, Settings, ShieldCheck, UserCog, Users } from 'lucide-react'
import { useMemo, useState } from 'react'

const users = [
  ['Sari Melati', 'HSE Manager', 'Head Office', 'Admin', 'Aktif', 'green'],
  ['Ahmad Rizki', 'Safety Officer', 'PKS A', 'Editor', 'Aktif', 'green'],
  ['Budi Santoso', 'Supervisor', 'PKS B', 'Editor', 'Aktif', 'green'],
  ['Citra Dewi', 'Inspector', 'PKS C', 'Contributor', 'Aktif', 'green'],
  ['Dedi Pratama', 'Operator', 'Estate 2', 'Viewer', 'Nonaktif', 'red'],
  ['Eka Wulandari', 'Compliance Officer', 'Head Office', 'Editor', 'Aktif', 'green'],
]

const roles = [
  ['Admin', 'Akses penuh konfigurasi sistem & data', 3, 'red'],
  ['Editor', 'Kelola data modul & tindak lanjut temuan', 24, 'blue'],
  ['Contributor', 'Input laporan & observasi lapangan', 68, 'green'],
  ['Viewer', 'Akses baca dashboard & laporan', 142, 'purple'],
]

const master = [
  ['Unit Kerja / Lokasi', '18 entri', Building2],
  ['Kategori Bahaya', '12 entri', ShieldCheck],
  ['Jenis Aset', '26 entri', Database],
  ['Standar & Regulasi', '152 entri', Settings],
]

export default function Administration(){
  const [q, setQ] = useState('')
  const rows = useMemo(() => users.filter(u => u.join(' ').toLowerCase().includes(q.toLowerCase())), [q])
  return <Shell title="Administration" subtitle="Manajemen pengguna, peran & hak akses, data master, dan konfigurasi sistem SHINSE 2.0.">
    <div className="stats-grid four">
      <StatCard label="Total Pengguna" value="237" hint="212 aktif" tone="blue" icon={<Users/>}/>
      <StatCard label="Peran (Role)" value="4" hint="RBAC aktif" tone="green" icon={<UserCog/>}/>
      <StatCard label="Unit Kerja" value="18" hint="6 PKS • 12 estate" tone="purple" icon={<Building2/>}/>
      <StatCard label="Data Master" value="208" hint="entri terkelola" tone="orange" icon={<Database/>}/>
    </div>

    <div className="dashboard-split">
      <Panel className="table-panel">
        <div className="table-toolbar"><h2 className="tt-title">Manajemen Pengguna</h2>
          <input className="admin-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Cari pengguna..."/>
        </div>
        <div className="table-wrap"><table>
          <thead><tr><th>Nama</th><th>Jabatan</th><th>Unit</th><th>Role</th><th>Status</th></tr></thead>
          <tbody>{rows.map((u, i) => (
            <tr key={i}><td><b>{u[0]}</b></td><td>{u[1]}</td><td>{u[2]}</td><td><Badge tone="blue">{u[3]}</Badge></td><td><Badge tone={u[5]}>{u[4]}</Badge></td></tr>
          ))}</tbody>
        </table></div>
      </Panel>

      <Panel title="Peran & Hak Akses">
        <div className="role-list">
          {roles.map(([n, d, count, tone]) => (
            <div className="role-card" key={n}>
              <div className="role-top"><b>{n}</b><Badge tone={tone}>{count} user</Badge></div>
              <small>{d}</small>
            </div>
          ))}
        </div>
      </Panel>
    </div>

    <Panel title="Data Master & Konfigurasi" className="mt">
      <div className="master-grid">
        {master.map(([t, c, Icon]) => (
          <div className="master-card" key={t}><Icon/><div><b>{t}</b><span>{c}</span></div></div>
        ))}
      </div>
    </Panel>
  </Shell>
}
