'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import { Badge, BarList, Panel, StatCard } from '../../components/Ui'
import {
  AlertTriangle, CheckCircle2, Clock3, Download, Filter, ListChecks,
  PlayCircle, Plus, Search, ShieldCheck, Target, X
} from 'lucide-react'
import { COMPANY_MASTER } from '../../lib/company-master'
import styles from './corrective-action.module.css'

const defaultActions = [
  { id: 'CA-2026-001', source: 'Inspection', sourceId: 'INS-2026-120', title: 'Perbaikan guard alat angkat', unit: 'PKS C', location: 'Workshop', category: 'Engineering Control', priority: 'High', pic: 'Maintenance Supervisor', dueDate: '2026-09-16', status: 'In Progress', progress: 65, evidence: 'WO-MNT-441', createdAt: '2026-09-12' },
  { id: 'CA-2026-002', source: 'Observation', sourceId: 'OBS-260901', title: 'Briefing ulang penggunaan APD', unit: 'PKS A', location: 'Area Produksi', category: 'Administrative Control', priority: 'High', pic: 'Supervisor Produksi', dueDate: '2026-09-18', status: 'Open', progress: 20, evidence: '', createdAt: '2026-09-01' },
  { id: 'CA-2026-003', source: 'Observation', sourceId: 'OBS-260902', title: 'Pembersihan ceceran oli dan pemasangan spill kit', unit: 'Estate 3', location: 'Workshop', category: 'Housekeeping', priority: 'Medium', pic: 'Mandor Workshop', dueDate: '2026-09-17', status: 'In Progress', progress: 50, evidence: '', createdAt: '2026-09-03' },
  { id: 'CA-2026-004', source: 'Incident', sourceId: 'INC-2026-014', title: 'Review lifting plan dan exclusion zone', unit: 'PKS C', location: 'Loading Area', category: 'Procedure', priority: 'Critical', pic: 'Mill Manager', dueDate: '2026-09-15', status: 'Overdue', progress: 45, evidence: '', createdAt: '2026-09-08' },
  { id: 'CA-2026-005', source: 'Inspection', sourceId: 'INS-2026-122', title: 'Perbaikan segregasi chemical storage', unit: 'Laboratorium', location: 'Chemical Storage', category: 'Engineering Control', priority: 'Medium', pic: 'Lab Supervisor', dueDate: '2026-09-20', status: 'Open', progress: 10, evidence: '', createdAt: '2026-09-14' },
  { id: 'CA-2026-006', source: 'Audit', sourceId: 'AUD-2026-031', title: 'Update legal register ketenagalistrikan', unit: 'Head Office', location: 'HSE Office', category: 'Compliance', priority: 'Low', pic: 'HSE Compliance', dueDate: '2026-09-10', status: 'Closed', progress: 100, evidence: 'LR-REV-09-2026', createdAt: '2026-08-28' },
]

const units = ['Head Office', 'PKS A', 'PKS B', 'PKS C', 'Estate 1', 'Estate 2', 'Estate 3', 'Laboratorium']
const priorities = ['Low', 'Medium', 'High', 'Critical']
const statuses = ['Open', 'In Progress', 'Overdue', 'Closed']
const categories = ['Engineering Control', 'Administrative Control', 'Housekeeping', 'Procedure', 'Training', 'Compliance', 'Other']

const emptyForm = {
  companyCode: 'ACP', source: 'Manual', sourceId: '', title: '', unit: 'PKS A', location: '', category: 'Administrative Control',
  priority: 'Medium', pic: '', dueDate: '', status: 'Open', progress: 0, evidence: ''
}

const tone = value => {
  if (['Closed', 'Low'].includes(value)) return 'green'
  if (['In Progress', 'Medium'].includes(value)) return 'orange'
  if (['High'].includes(value)) return 'blue'
  if (['Overdue', 'Critical', 'Open'].includes(value)) return 'red'
  return 'purple'
}

const fmt = value => {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

function isOverdue(item) {
  if (!item.dueDate || item.status === 'Closed') return false
  return new Date(`${item.dueDate}T23:59:59`) < new Date()
}

function normalise(item) {
  if (item.status !== 'Closed' && isOverdue(item)) return { ...item, status: 'Overdue' }
  return item
}

export default function CorrectiveAction() {
  const [actions, setActions] = useState(defaultActions)
  const [search, setSearch] = useState('')
  const [filterCompany, setFilterCompany] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterPriority, setFilterPriority] = useState('All')
  const [filterUnit, setFilterUnit] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    try {
      let base = defaultActions
      const saved = localStorage.getItem('sinshe-corrective-actions')
      if (saved) base = JSON.parse(saved)

      const obsSaved = localStorage.getItem('sinshe-observations')
      if (obsSaved) {
        const observations = JSON.parse(obsSaved)
        const fromObservations = observations
          .filter(o => o.status !== 'Closed' && o.action)
          .map(o => ({
            id: `CA-${o.id}`,
            companyCode: o.companyCode || '',
            source: 'Observation',
            sourceId: o.id,
            title: o.action,
            unit: o.unit,
            location: o.location,
            category: 'Administrative Control',
            priority: o.risk === 'Critical' ? 'Critical' : o.risk === 'High' ? 'High' : o.risk === 'Low' ? 'Low' : 'Medium',
            pic: o.pic,
            dueDate: o.dueDate,
            status: o.status === 'Investigation' ? 'In Progress' : o.status,
            progress: o.status === 'In Progress' ? 50 : 10,
            evidence: o.evidence || '',
            createdAt: o.date,
          }))
        const ids = new Set(base.map(a => a.id))
        base = [...base, ...fromObservations.filter(a => !ids.has(a.id))]
      }
      setActions(base.map(normalise))
    } catch {
      setActions(defaultActions.map(normalise))
    }
  }, [])

  useEffect(() => {
    try { localStorage.setItem('sinshe-corrective-actions', JSON.stringify(actions)) } catch {}
  }, [actions])

  const companyScoped = useMemo(() => filterCompany === 'All' ? actions : actions.filter(a => a.companyCode === filterCompany), [actions, filterCompany])
  const filtered = useMemo(() => companyScoped.filter(a => {
    const q = search.trim().toLowerCase()
    const matchesSearch = !q || [a.id, a.companyCode, a.sourceId, a.title, a.unit, a.location, a.pic].join(' ').toLowerCase().includes(q)
    return matchesSearch &&
      (filterStatus === 'All' || a.status === filterStatus) &&
      (filterPriority === 'All' || a.priority === filterPriority) &&
      (filterUnit === 'All' || a.unit === filterUnit)
  }), [companyScoped, search, filterStatus, filterPriority, filterUnit])

  const open = companyScoped.filter(a => a.status === 'Open').length
  const inProgress = companyScoped.filter(a => a.status === 'In Progress').length
  const overdue = companyScoped.filter(a => a.status === 'Overdue' || isOverdue(a)).length
  const closed = companyScoped.filter(a => a.status === 'Closed').length
  const closureRate = companyScoped.length ? Math.round((closed / companyScoped.length) * 100) : 0

  const bars = [
    { label: 'Open', value: open, tone: 'red' },
    { label: 'In Progress', value: inProgress, tone: 'orange' },
    { label: 'Overdue', value: overdue, tone: 'red' },
    { label: 'Closed', value: Math.max(closed, 1), tone: 'green' },
  ]

  function changeStatus(id, status) {
    setActions(prev => prev.map(a => a.id === id ? {
      ...a,
      status,
      progress: status === 'Closed' ? 100 : status === 'In Progress' ? Math.max(a.progress || 0, 40) : a.progress,
      closedAt: status === 'Closed' ? new Date().toISOString().slice(0, 10) : a.closedAt,
    } : a))

    if (status === 'Closed') {
      try {
        const item = actions.find(a => a.id === id)
        if (item?.sourceId?.startsWith('OBS-')) {
          const obs = JSON.parse(localStorage.getItem('sinshe-observations') || '[]')
          localStorage.setItem('sinshe-observations', JSON.stringify(obs.map(o => o.id === item.sourceId ? { ...o, status: 'Closed' } : o)))
        }
      } catch {}
    }
    setNotice(`${id} diperbarui menjadi ${status}.`)
    setTimeout(() => setNotice(''), 2500)
  }

  function saveAction(e) {
    e.preventDefault()
    if (!form.companyCode || !form.title.trim() || !form.location.trim() || !form.pic.trim() || !form.dueDate) {
      setNotice('Pilih Company/PT dan lengkapi tindakan, lokasi, PIC serta due date terlebih dahulu.')
      return
    }
    const next = Math.max(0, ...actions.map(a => Number(a.id.split('-').pop()) || 0)) + 1
    const id = `CA-2026-${String(next).padStart(3, '0')}`
    const createdAt = new Date().toISOString().slice(0, 10)
    setActions(prev => [{ id, ...form, createdAt }, ...prev])
    setFilterCompany(form.companyCode)
    setForm(emptyForm)
    setModalOpen(false)
    setNotice(`${id} berhasil ditambahkan untuk PT ${form.companyCode}.`)
    setTimeout(() => setNotice(''), 3000)
  }

  function exportCSV() {
    const rows = filtered.map(a => [a.id, a.companyCode || '', a.source, a.sourceId, a.title, a.unit, a.location, a.category, a.priority, a.pic, a.dueDate, a.status, a.progress, a.evidence])
    const header = ['ID', 'Company/PT', 'Source', 'Source ID', 'Corrective Action', 'Unit', 'Location', 'Category', 'Priority', 'PIC', 'Due Date', 'Status', 'Progress', 'Evidence']
    const csv = [header, ...rows].map(row => row.map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `SINSHE_Corrective_Action_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return <Shell title="Corrective Action Tracking" subtitle="Monitoring tindak lanjut temuan, PIC, due date, progres, evidence dan closure secara terpusat.">
    {notice && <div className={styles.notice}><CheckCircle2 size={18}/>{notice}</div>}

    <div className="stats-grid four">
      <StatCard label="Open Action" value={open} hint="belum dimulai" tone="red" icon={<Target/>}/>
      <StatCard label="In Progress" value={inProgress} hint="sedang ditindaklanjuti" tone="orange" icon={<PlayCircle/>}/>
      <StatCard label="Overdue" value={overdue} hint="melewati due date" tone="red" icon={<AlertTriangle/>}/>
      <StatCard label="Closure Rate" value={`${closureRate}%`} hint={`${closed} action closed`} tone="green" icon={<CheckCircle2/>}/>
    </div>

    <div className={styles.headerRow}>
      <div><h2>Corrective Action Register</h2><p>Satu register tindak lanjut per Company/PT untuk inspeksi, observasi, insiden, audit dan compliance.</p></div>
      <div className={styles.buttons}><button className={styles.secondary} onClick={exportCSV}><Download size={17}/> Export CSV</button><button className={styles.primary} onClick={() => setModalOpen(true)}><Plus size={18}/> Action Baru</button></div>
    </div>

    <Panel className={styles.tablePanel}>
      <div className={styles.filters}>
        <label className={styles.search}><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari action, PT, PIC, source ID..."/></label>
        <label><select value={filterCompany} onChange={e => setFilterCompany(e.target.value)}><option value="All">All Companies</option>{COMPANY_MASTER.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
        <label><Filter size={15}/><select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option>All</option>{statuses.map(v => <option key={v}>{v}</option>)}</select></label>
        <label><select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}><option>All</option>{priorities.map(v => <option key={v}>{v}</option>)}</select></label>
        <label><select value={filterUnit} onChange={e => setFilterUnit(e.target.value)}><option>All</option>{units.map(v => <option key={v}>{v}</option>)}</select></label>
      </div>

      <div className="table-wrap"><table>
        <thead><tr><th>ID</th><th>PT</th><th>Source</th><th>Corrective Action</th><th>Unit / Lokasi</th><th>Priority</th><th>PIC</th><th>Due Date</th><th>Progress</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>
          {filtered.map(a => <tr key={a.id} className={a.status === 'Overdue' ? styles.overdueRow : ''}>
            <td><b>{a.id}</b><small className={styles.block}>{a.sourceId || a.source}</small></td><td><b>{a.companyCode || '-'}</b></td><td>{a.source}</td>
            <td className={styles.actionCell}><b>{a.title}</b><small>{a.category}{a.evidence ? ` • Evidence: ${a.evidence}` : ''}</small></td>
            <td><b>{a.unit}</b><small className={styles.block}>{a.location}</small></td><td><Badge tone={tone(a.priority)}>{a.priority}</Badge></td><td>{a.pic}</td>
            <td><span className={a.status === 'Overdue' ? styles.overdueText : ''}>{fmt(a.dueDate)}</span></td>
            <td><div className={styles.progressWrap}><div className={styles.progressTrack}><span style={{width:`${Math.min(100, a.progress || 0)}%`}}/></div><b>{a.progress || 0}%</b></div></td>
            <td><Badge tone={tone(a.status)}>{a.status}</Badge></td>
            <td><div className={styles.rowActions}>{a.status === 'Open' && <button onClick={() => changeStatus(a.id, 'In Progress')}><PlayCircle size={14}/> Start</button>}{a.status !== 'Closed' && <button className={styles.closeAction} onClick={() => changeStatus(a.id, 'Closed')}><ShieldCheck size={14}/> Close</button>}{a.status === 'Closed' && <span className={styles.done}><CheckCircle2 size={14}/> Done</span>}</div></td>
          </tr>)}
          {!filtered.length && <tr><td colSpan="11" className={styles.empty}>Tidak ada corrective action yang sesuai filter.</td></tr>}
        </tbody>
      </table></div>
    </Panel>

    <div className="dashboard-split mt">
      <Panel title="Status Corrective Action"><BarList data={bars}/></Panel>
      <Panel title="Prioritas Hari Ini"><div className={styles.priorityBox}><AlertTriangle size={24}/><div><b>{overdue} action overdue</b><p>Prioritaskan tindak lanjut yang melewati due date dan action dengan level Critical/High.</p></div></div><div className={styles.metric}><span>Critical / High Active</span><b>{companyScoped.filter(a => ['Critical','High'].includes(a.priority) && a.status !== 'Closed').length}</b></div><div className={styles.metric}><span>Total Action</span><b>{companyScoped.length}</b></div><div className={styles.metric}><span>Closed</span><b className="green-text">{closed}</b></div></Panel>
    </div>

    <div className={styles.info}><Clock3 size={20}/><div><b>Terhubung dengan Inspection, Observation & Incident</b><span>Company/PT dari source ikut diwariskan ke corrective action sehingga filtering Executive Dashboard tetap konsisten.</span></div></div>

    {modalOpen && <div className={styles.backdrop} onMouseDown={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.modalHead}><div><span>SINSHE 2.0</span><h2>Corrective Action Baru</h2><p>Tambahkan tindak lanjut manual atau dari hasil audit/temuan.</p></div><button onClick={() => setModalOpen(false)}><X size={20}/></button></div>
        <form onSubmit={saveAction} className={styles.form}>
          <label>Company / PT<select value={form.companyCode} onChange={e => setForm({...form, companyCode:e.target.value})}>{COMPANY_MASTER.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
          <label className={styles.full}>Corrective Action<textarea value={form.title} onChange={e => setForm({...form, title:e.target.value})} placeholder="Jelaskan tindakan perbaikan yang harus dilakukan..."/></label>
          <label>Source<select value={form.source} onChange={e => setForm({...form, source:e.target.value})}><option>Manual</option><option>Inspection</option><option>Observation</option><option>Incident</option><option>Audit</option><option>Compliance</option></select></label>
          <label>Source ID<input value={form.sourceId} onChange={e => setForm({...form, sourceId:e.target.value})} placeholder="Opsional"/></label>
          <label>Unit<select value={form.unit} onChange={e => setForm({...form, unit:e.target.value})}>{units.map(v => <option key={v}>{v}</option>)}</select></label>
          <label>Lokasi<input value={form.location} onChange={e => setForm({...form, location:e.target.value})} placeholder="Area / lokasi detail"/></label>
          <label>Category<select value={form.category} onChange={e => setForm({...form, category:e.target.value})}>{categories.map(v => <option key={v}>{v}</option>)}</select></label>
          <label>Priority<select value={form.priority} onChange={e => setForm({...form, priority:e.target.value})}>{priorities.map(v => <option key={v}>{v}</option>)}</select></label>
          <label>PIC<input value={form.pic} onChange={e => setForm({...form, pic:e.target.value})} placeholder="Nama / jabatan PIC"/></label>
          <label>Due Date<input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate:e.target.value})}/></label>
          <label>Progress (%)<input type="number" min="0" max="100" value={form.progress} onChange={e => setForm({...form, progress:Number(e.target.value)})}/></label>
          <label>Evidence / Referensi<input value={form.evidence} onChange={e => setForm({...form, evidence:e.target.value})} placeholder="Nomor dokumen / link / catatan"/></label>
          <div className={styles.formActions}><button type="button" className={styles.secondary} onClick={() => setModalOpen(false)}>Batal</button><button className={styles.primary} type="submit"><ListChecks size={17}/> Simpan Action</button></div>
        </form>
      </div>
    </div>}
  </Shell>
}
