'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import { Badge, BarList, Panel, StatCard } from '../../components/Ui'
import {
  Activity, AlertOctagon, AlertTriangle, CheckCircle2, Clock3, Download,
  FileSearch, Filter, HeartPulse, Plus, Search, ShieldCheck, Siren, X
} from 'lucide-react'
import { COMPANY_MASTER } from '../../lib/company-master'
import styles from './incident.module.css'

const defaultIncidents = [
  { id: 'INC-2026-045', date: '2026-09-02', time: '10:15', type: 'Near Miss', severity: 'High', description: 'Material jatuh dari conveyor tanpa mengenai pekerja', unit: 'PKS A', location: 'Conveyor Station', reporter: 'Supervisor Produksi', investigator: 'HSE Officer PKS A', status: 'Investigation', immediateAction: 'Area diisolasi dan material diamankan', rootCause: '', correctiveAction: 'Review guarding dan inspeksi conveyor', dueDate: '2026-09-18' },
  { id: 'INC-2026-044', date: '2026-08-28', time: '14:20', type: 'First Aid', severity: 'Low', description: 'Luka gores tangan operator saat handling material', unit: 'Estate 3', location: 'Workshop', reporter: 'Mandor Workshop', investigator: 'HSE Estate 3', status: 'Closed', immediateAction: 'P3K dan pemeriksaan area kerja', rootCause: 'Penggunaan sarung tangan tidak sesuai jenis pekerjaan', correctiveAction: 'Refresh training hand protection', dueDate: '2026-09-05' },
  { id: 'INC-2026-043', date: '2026-08-21', time: '08:12', type: 'Lost Time Injury', severity: 'Critical', description: 'Pekerja terpeleset pada area lantai basah', unit: 'PKS B', location: 'Process Floor', reporter: 'Shift Supervisor', investigator: 'HSE Section Head', status: 'Action Pending', immediateAction: 'Korban ditangani P3K dan dievakuasi', rootCause: 'Drainase tidak optimal dan kontrol housekeeping tidak efektif', correctiveAction: 'Perbaikan drainase, anti-slip dan inspeksi housekeeping', dueDate: '2026-09-15' },
  { id: 'INC-2026-042', date: '2026-08-15', time: '16:05', type: 'Property Damage', severity: 'Medium', description: 'Forklift menyentuh rack saat manuver mundur', unit: 'PKS C', location: 'Gudang Sparepart', reporter: 'Warehouse Supervisor', investigator: 'HSE PKS C', status: 'Closed', immediateAction: 'Forklift dihentikan dan rack diperiksa', rootCause: 'Blind spot dan marka jalur kurang jelas', correctiveAction: 'Pasang convex mirror dan perbarui marka jalur', dueDate: '2026-08-28' },
  { id: 'INC-2026-041', date: '2026-08-09', time: '11:40', type: 'Medical Treatment', severity: 'High', description: 'Paparan uap kimia ringan saat transfer bahan', unit: 'Laboratorium', location: 'Chemical Handling Area', reporter: 'Lab Supervisor', investigator: 'HSE Compliance', status: 'RCA', immediateAction: 'Pekerja dipindahkan ke area aman dan diperiksa medis', rootCause: 'Ventilasi lokal tidak optimal', correctiveAction: 'Perbaikan local exhaust ventilation dan review SOP transfer', dueDate: '2026-09-20' },
]

const units = ['Head Office', 'PKS A', 'PKS B', 'PKS C', 'Estate 1', 'Estate 2', 'Estate 3', 'Laboratorium']
const types = ['Near Miss', 'First Aid', 'Medical Treatment', 'Lost Time Injury', 'Property Damage', 'Environmental', 'Fire']
const severities = ['Low', 'Medium', 'High', 'Critical']
const statuses = ['Reported', 'Investigation', 'RCA', 'Action Pending', 'Closed']

const emptyForm = {
  companyCode: 'ACP', date: '2026-09-15', time: '09:00', type: 'Near Miss', severity: 'Medium', description: '',
  unit: 'PKS A', location: '', reporter: '', investigator: '', immediateAction: '', rootCause: '', correctiveAction: '', dueDate: ''
}

const tone = value => {
  if (['Closed', 'Low', 'First Aid'].includes(value)) return 'green'
  if (['Investigation', 'Medium', 'Medical Treatment'].includes(value)) return 'orange'
  if (['RCA', 'High', 'Near Miss'].includes(value)) return 'blue'
  if (['Action Pending', 'Critical', 'Lost Time Injury', 'Fire', 'Reported'].includes(value)) return 'red'
  return 'purple'
}

const fmt = value => {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

function nextStatus(status) {
  const i = statuses.indexOf(status)
  return i >= 0 && i < statuses.length - 1 ? statuses[i + 1] : status
}

function isOverdue(item) {
  if (!item.dueDate || item.status === 'Closed') return false
  return new Date(`${item.dueDate}T23:59:59`) < new Date()
}

export default function Incident() {
  const [incidents, setIncidents] = useState(defaultIncidents)
  const [search, setSearch] = useState('')
  const [filterCompany, setFilterCompany] = useState('All')
  const [filterType, setFilterType] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterUnit, setFilterUnit] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sinshe-incidents')
      if (saved) setIncidents(JSON.parse(saved))
    } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem('sinshe-incidents', JSON.stringify(incidents)) } catch {}
  }, [incidents])

  const companyScoped = useMemo(() => filterCompany === 'All' ? incidents : incidents.filter(i => i.companyCode === filterCompany), [incidents, filterCompany])
  const filtered = useMemo(() => companyScoped.filter(i => {
    const q = search.trim().toLowerCase()
    const matchSearch = !q || [i.id, i.companyCode, i.description, i.unit, i.location, i.reporter, i.investigator].join(' ').toLowerCase().includes(q)
    return matchSearch &&
      (filterType === 'All' || i.type === filterType) &&
      (filterStatus === 'All' || i.status === filterStatus) &&
      (filterUnit === 'All' || i.unit === filterUnit)
  }), [companyScoped, search, filterType, filterStatus, filterUnit])

  const active = companyScoped.filter(i => i.status !== 'Closed').length
  const investigation = companyScoped.filter(i => ['Investigation', 'RCA'].includes(i.status)).length
  const critical = companyScoped.filter(i => i.severity === 'Critical' && i.status !== 'Closed').length
  const overdue = companyScoped.filter(isOverdue).length
  const closed = companyScoped.filter(i => i.status === 'Closed').length
  const closureRate = companyScoped.length ? Math.round((closed / companyScoped.length) * 100) : 0

  const byType = types.map(typeName => ({
    label: typeName,
    value: companyScoped.filter(i => i.type === typeName).length,
    tone: typeName === 'Lost Time Injury' || typeName === 'Fire' ? 'red' : typeName === 'Near Miss' ? 'blue' : 'green'
  })).filter(x => x.value > 0)

  const latestLTI = [...companyScoped].filter(i => i.type === 'Lost Time Injury').sort((a, b) => b.date.localeCompare(a.date))[0]
  const daysWithoutLTI = latestLTI ? Math.max(0, Math.floor((new Date() - new Date(`${latestLTI.date}T00:00:00`)) / 86400000)) : 0

  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function saveIncident(e) {
    e.preventDefault()
    if (!form.companyCode || !form.description.trim() || !form.location.trim() || !form.reporter.trim() || !form.investigator.trim()) {
      setNotice('Pilih Company/PT dan lengkapi deskripsi, lokasi, pelapor serta investigator terlebih dahulu.')
      return
    }
    const nextNo = Math.max(0, ...incidents.map(i => Number(i.id.split('-').pop()) || 0)) + 1
    const id = `INC-2026-${String(nextNo).padStart(3, '0')}`
    const incident = { id, ...form, status: 'Reported' }
    setIncidents(prev => [incident, ...prev])
    setFilterCompany(form.companyCode)
    setForm(emptyForm)
    setModalOpen(false)
    setNotice(`${id} berhasil dilaporkan untuk PT ${form.companyCode}.`)
    setTimeout(() => setNotice(''), 3000)
  }

  function syncCorrectiveAction(item, targetStatus) {
    if (!item.correctiveAction?.trim()) return
    try {
      const actions = JSON.parse(localStorage.getItem('sinshe-corrective-actions') || '[]')
      const id = `CA-${item.id}`
      const existingIndex = actions.findIndex(a => a.id === id || a.sourceId === item.id)
      const payload = {
        id,
        companyCode: item.companyCode || '',
        source: 'Incident',
        sourceId: item.id,
        title: item.correctiveAction,
        unit: item.unit,
        location: item.location,
        category: 'Incident Follow-up',
        priority: item.severity,
        pic: item.investigator,
        dueDate: item.dueDate,
        status: targetStatus === 'Closed' ? 'Closed' : 'Open',
        progress: targetStatus === 'Closed' ? 100 : 10,
        evidence: '',
        createdAt: new Date().toISOString().slice(0, 10),
      }
      if (existingIndex >= 0) actions[existingIndex] = { ...actions[existingIndex], ...payload }
      else actions.unshift(payload)
      localStorage.setItem('sinshe-corrective-actions', JSON.stringify(actions))
    } catch {}
  }

  function advance(item) {
    const target = nextStatus(item.status)
    if (target === item.status) return
    if (['Action Pending', 'Closed'].includes(target)) syncCorrectiveAction(item, target)
    setIncidents(prev => prev.map(i => i.id === item.id ? { ...i, status: target } : i))
    setSelected(prev => prev?.id === item.id ? { ...prev, status: target } : prev)
    setNotice(`${item.id}: status menjadi ${target}.`)
    setTimeout(() => setNotice(''), 2500)
  }

  function exportCSV() {
    const header = ['ID', 'Company/PT', 'Tanggal', 'Jam', 'Tipe', 'Severity', 'Deskripsi', 'Unit', 'Lokasi', 'Pelapor', 'Investigator', 'Status', 'Immediate Action', 'Root Cause', 'Corrective Action', 'Due Date']
    const rows = filtered.map(i => [i.id, i.companyCode || '', i.date, i.time, i.type, i.severity, i.description, i.unit, i.location, i.reporter, i.investigator, i.status, i.immediateAction, i.rootCause, i.correctiveAction, i.dueDate])
    const csv = [header, ...rows].map(row => row.map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `SINSHE_Incident_Register_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return <Shell title="Incident Management" subtitle="Pelaporan insiden, investigasi, root cause analysis dan tindak lanjut korektif terintegrasi.">
    {notice && <div className={styles.notice}><CheckCircle2 size={18}/>{notice}</div>}

    <div className="stats-grid four">
      <StatCard label="Insiden Aktif" value={active} hint={`${companyScoped.length} total register`} tone="blue" icon={<Siren/>}/>
      <StatCard label="Investigasi / RCA" value={investigation} hint={`${critical} critical active`} tone="orange" icon={<FileSearch/>}/>
      <StatCard label="Overdue Follow-up" value={overdue} hint="melewati due date" tone="red" icon={<AlertOctagon/>}/>
      <StatCard label="Days Without LTI" value={daysWithoutLTI} hint={`Closure rate ${closureRate}%`} tone="green" icon={<HeartPulse/>}/>
    </div>

    <div className={styles.headerRow}>
      <div><h2>Incident Register</h2><p>Kelola laporan awal sampai investigasi, RCA, corrective action dan closure per Company/PT.</p></div>
      <div className={styles.buttons}><button className={styles.secondary} onClick={exportCSV}><Download size={17}/> Export CSV</button><button className={styles.primary} onClick={() => setModalOpen(true)}><Plus size={18}/> Laporkan Insiden</button></div>
    </div>

    <Panel>
      <div className={styles.filters}>
        <label className={styles.search}><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari ID, PT, deskripsi, lokasi, investigator..."/></label>
        <label><select value={filterCompany} onChange={e => setFilterCompany(e.target.value)}><option value="All">All Companies</option>{COMPANY_MASTER.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
        <label><Filter size={15}/><select value={filterType} onChange={e => setFilterType(e.target.value)}><option>All</option>{types.map(v => <option key={v}>{v}</option>)}</select></label>
        <label><select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option>All</option>{statuses.map(v => <option key={v}>{v}</option>)}</select></label>
        <label><select value={filterUnit} onChange={e => setFilterUnit(e.target.value)}><option>All</option>{units.map(v => <option key={v}>{v}</option>)}</select></label>
      </div>

      <div className="table-wrap"><table>
        <thead><tr><th>ID</th><th>PT</th><th>Tanggal</th><th>Tipe</th><th>Insiden</th><th>Unit / Lokasi</th><th>Severity</th><th>Investigator</th><th>Due Date</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>
          {filtered.map(i => <tr key={i.id} className={isOverdue(i) ? styles.overdueRow : ''}>
            <td><b>{i.id}</b><small className={styles.block}>{i.time}</small></td><td><b>{i.companyCode || '-'}</b></td><td>{fmt(i.date)}</td>
            <td><Badge tone={tone(i.type)}>{i.type}</Badge></td><td className={styles.descCell}><b>{i.description}</b><small>Pelapor: {i.reporter}</small></td>
            <td><b>{i.unit}</b><small className={styles.block}>{i.location}</small></td><td><Badge tone={tone(i.severity)}>{i.severity}</Badge></td>
            <td>{i.investigator}</td><td><span className={isOverdue(i) ? styles.overdueText : ''}>{fmt(i.dueDate)}</span></td><td><Badge tone={tone(i.status)}>{i.status}</Badge></td>
            <td><div className={styles.rowActions}><button onClick={() => setSelected(i)}>Detail</button>{i.status !== 'Closed' && <button className={styles.advance} onClick={() => advance(i)}>Next</button>}</div></td>
          </tr>)}
          {!filtered.length && <tr><td colSpan="11" className={styles.empty}>Tidak ada insiden yang sesuai filter.</td></tr>}
        </tbody>
      </table></div>
    </Panel>

    <div className="dashboard-split mt">
      <Panel title="Insiden per Tipe"><BarList data={byType.length ? byType : [{label:'Belum ada data', value:1, tone:'green'}]}/></Panel>
      <Panel title="Prioritas Investigasi"><div className={styles.priorityBox}><AlertTriangle size={24}/><div><b>{critical} critical incident aktif</b><p>{overdue} tindak lanjut melewati due date. Pastikan evidence, RCA dan corrective action terdokumentasi sebelum closure.</p></div></div><div className="ai-card" style={{marginTop:12}}><Activity/><div><b>Integrated Workflow</b><p>Incident di tahap Action Pending/Closed menyinkronkan Corrective Action dengan Company/PT yang sama.</p></div></div></Panel>
    </div>

    {modalOpen && <div className={styles.backdrop} onMouseDown={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
      <form className={styles.modal} onSubmit={saveIncident}>
        <div className={styles.modalHeader}><div><span>SINSHE 2.0</span><h2>Laporkan Insiden</h2><p>Catat laporan awal, Company/PT dan penanggung jawab investigasi.</p></div><button type="button" onClick={() => setModalOpen(false)}><X size={20}/></button></div>
        <div className={styles.formGrid}>
          <label>Company / PT<select value={form.companyCode} onChange={e => updateForm('companyCode', e.target.value)}>{COMPANY_MASTER.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
          <label>Tanggal<input type="date" value={form.date} onChange={e => updateForm('date', e.target.value)}/></label>
          <label>Jam<input type="time" value={form.time} onChange={e => updateForm('time', e.target.value)}/></label>
          <label>Tipe Insiden<select value={form.type} onChange={e => updateForm('type', e.target.value)}>{types.map(v => <option key={v}>{v}</option>)}</select></label>
          <label>Severity<select value={form.severity} onChange={e => updateForm('severity', e.target.value)}>{severities.map(v => <option key={v}>{v}</option>)}</select></label>
          <label>Unit<select value={form.unit} onChange={e => updateForm('unit', e.target.value)}>{units.map(v => <option key={v}>{v}</option>)}</select></label>
          <label>Lokasi<input value={form.location} onChange={e => updateForm('location', e.target.value)} placeholder="Contoh: Boiler Area"/></label>
          <label>Pelapor<input value={form.reporter} onChange={e => updateForm('reporter', e.target.value)} placeholder="Nama / jabatan"/></label>
          <label>Investigator / PIC<input value={form.investigator} onChange={e => updateForm('investigator', e.target.value)} placeholder="HSE Officer / Manager"/></label>
          <label className={styles.full}>Deskripsi Insiden<textarea value={form.description} onChange={e => updateForm('description', e.target.value)} placeholder="Jelaskan apa yang terjadi..." rows="3"/></label>
          <label className={styles.full}>Immediate Action<textarea value={form.immediateAction} onChange={e => updateForm('immediateAction', e.target.value)} placeholder="Tindakan awal untuk mengendalikan kondisi..." rows="2"/></label>
          <label className={styles.full}>Root Cause / Temuan Awal<textarea value={form.rootCause} onChange={e => updateForm('rootCause', e.target.value)} placeholder="Dapat dilengkapi setelah investigasi..." rows="2"/></label>
          <label className={styles.full}>Corrective Action<textarea value={form.correctiveAction} onChange={e => updateForm('correctiveAction', e.target.value)} placeholder="Rencana tindakan korektif..." rows="2"/></label>
          <label>Due Date<input type="date" value={form.dueDate} onChange={e => updateForm('dueDate', e.target.value)}/></label>
        </div>
        <div className={styles.modalActions}><button type="button" className={styles.cancel} onClick={() => setModalOpen(false)}>Batal</button><button className={styles.primary} type="submit"><ShieldCheck size={17}/> Simpan Laporan</button></div>
      </form>
    </div>}

    {selected && <div className={styles.backdrop} onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null) }}>
      <div className={styles.detailModal}>
        <div className={styles.modalHeader}><div><span>{selected.id} • {selected.companyCode || 'PT belum ditetapkan'}</span><h2>{selected.type}</h2><p>{selected.unit} • {selected.location}</p></div><button onClick={() => setSelected(null)}><X size={20}/></button></div>
        <div className={styles.detailStatus}><Badge tone={tone(selected.severity)}>{selected.severity}</Badge><Badge tone={tone(selected.status)}>{selected.status}</Badge>{isOverdue(selected) && <Badge tone="red">Overdue</Badge>}</div>
        <div className={styles.detailGrid}><div><span>Company / PT</span><b>{selected.companyCode || '-'}</b></div><div><span>Tanggal / Jam</span><b>{fmt(selected.date)} • {selected.time}</b></div><div><span>Pelapor</span><b>{selected.reporter}</b></div><div><span>Investigator</span><b>{selected.investigator}</b></div><div><span>Due Date</span><b>{fmt(selected.dueDate)}</b></div></div>
        <div className={styles.detailSection}><span>Kejadian</span><p>{selected.description}</p></div><div className={styles.detailSection}><span>Immediate Action</span><p>{selected.immediateAction || '-'}</p></div><div className={styles.detailSection}><span>Root Cause</span><p>{selected.rootCause || 'Belum dilengkapi'}</p></div><div className={styles.detailSection}><span>Corrective Action</span><p>{selected.correctiveAction || 'Belum dilengkapi'}</p></div>
        <div className={styles.flow}><Clock3 size={18}/><span>Reported</span><span>→</span><span>Investigation</span><span>→</span><span>RCA</span><span>→</span><span>Action Pending</span><span>→</span><span>Closed</span></div>
        {selected.status !== 'Closed' && <button className={styles.primaryWide} onClick={() => advance(selected)}><ShieldCheck size={17}/> Lanjut ke {nextStatus(selected.status)}</button>}
      </div>
    </div>}
  </Shell>
}
