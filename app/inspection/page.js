'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import { Badge, BarList, Panel, Progress, StatCard } from '../../components/Ui'
import {
  AlertTriangle, CheckCircle2, ClipboardCheck, Download, Eye, FileText,
  Filter, ListChecks, Plus, Search, ShieldCheck, X, XCircle
} from 'lucide-react'
import { COMPANY_MASTER } from '../../lib/company-master'
import styles from './inspection.module.css'

const defaultInspections = [
  { id: 'INS-2026-118', object: 'APAR & Fire Protection', unit: 'PKS A', status: 'Selesai', score: 96, result: 'compliant', date: '2026-09-10' },
  { id: 'INS-2026-119', object: 'Housekeeping Workshop', unit: 'Estate 2', status: 'Selesai', score: 88, result: 'compliant', date: '2026-09-11' },
  { id: 'INS-2026-120', object: 'Alat Angkat Angkut', unit: 'PKS C', status: 'Temuan', score: 72, result: 'finding', date: '2026-09-12' },
  { id: 'INS-2026-121', object: 'Kelistrikan Panel', unit: 'PKS B', status: 'Proses', score: 0, result: 'progress', date: '2026-09-15' },
  { id: 'INS-2026-122', object: 'Chemical Storage', unit: 'Laboratorium', status: 'Temuan', score: 65, result: 'finding', date: '2026-09-14' },
  { id: 'INS-2026-123', object: 'Ergonomi Kantor', unit: 'Head Office', status: 'Selesai', score: 91, result: 'compliant', date: '2026-09-15' },
]

const defaultObservations = [
  { id: 'OBS-260901', date: '2026-09-01', type: 'Unsafe Action', description: 'Tidak memakai APD di area produksi', unit: 'PKS A', location: 'Area Produksi', risk: 'High', status: 'Open', pic: 'Supervisor Produksi', dueDate: '2026-09-18', action: 'Briefing ulang penggunaan APD', evidence: '' },
  { id: 'OBS-260902', date: '2026-09-03', type: 'Unsafe Condition', description: 'Ceceran oli di jalur pejalan kaki', unit: 'Estate 3', location: 'Workshop', risk: 'Medium', status: 'In Progress', pic: 'Mandor Workshop', dueDate: '2026-09-17', action: 'Pembersihan dan pemasangan spill kit', evidence: '' },
  { id: 'OBS-260903', date: '2026-09-05', type: 'Positive Act', description: 'Pekerja melapor kebocoran gas sebelum pekerjaan dimulai', unit: 'PKS B', location: 'Boiler Area', risk: 'Low', status: 'Closed', pic: 'HSE Officer', dueDate: '2026-09-05', action: 'Apresiasi dan sharing saat toolbox meeting', evidence: '' },
  { id: 'OBS-260904', date: '2026-09-08', type: 'Near Miss', description: 'Material jatuh dari ketinggian tanpa menimbulkan cedera', unit: 'PKS C', location: 'Loading Area', risk: 'Critical', status: 'Investigation', pic: 'Mill Manager', dueDate: '2026-09-16', action: 'Isolasi area dan investigasi penyebab', evidence: '' },
]

const units = ['Head Office', 'PKS A', 'PKS B', 'PKS C', 'Estate 1', 'Estate 2', 'Estate 3', 'Laboratorium']
const observationTypes = ['Unsafe Action', 'Unsafe Condition', 'Near Miss', 'Positive Act']
const riskLevels = ['Low', 'Medium', 'High', 'Critical']
const statuses = ['Open', 'In Progress', 'Investigation', 'Closed']

const emptyForm = {
  companyCode: 'ACP', date: '2026-09-15', type: 'Unsafe Action', description: '', unit: 'PKS A', location: '', risk: 'Medium',
  status: 'Open', pic: '', dueDate: '', action: '', evidence: ''
}

const badgeTone = value => {
  if (['Closed', 'Selesai', 'Low', 'Positive Act'].includes(value)) return 'green'
  if (['In Progress', 'Proses', 'Medium'].includes(value)) return 'orange'
  if (['Investigation', 'High'].includes(value)) return 'blue'
  if (['Critical', 'Open', 'Temuan', 'Unsafe Action', 'Unsafe Condition', 'Near Miss'].includes(value)) return 'red'
  return 'purple'
}

function formatDate(value) {
  if (!value) return '-'
  const d = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
}

export default function Inspection() {
  const [observations, setObservations] = useState(defaultObservations)
  const [inspections] = useState(defaultInspections)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')
  const [filterCompany, setFilterCompany] = useState('All')
  const [filterType, setFilterType] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterUnit, setFilterUnit] = useState('All')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sinshe-observations')
      if (saved) setObservations(JSON.parse(saved))
    } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem('sinshe-observations', JSON.stringify(observations)) } catch {}
  }, [observations])

  const companyScoped = useMemo(() => filterCompany === 'All' ? observations : observations.filter(item => item.companyCode === filterCompany), [observations, filterCompany])
  const filtered = useMemo(() => companyScoped.filter(item => {
    const q = search.trim().toLowerCase()
    const matchSearch = !q || [item.id, item.companyCode, item.description, item.unit, item.location, item.pic].join(' ').toLowerCase().includes(q)
    return matchSearch &&
      (filterType === 'All' || item.type === filterType) &&
      (filterStatus === 'All' || item.status === filterStatus) &&
      (filterUnit === 'All' || item.unit === filterUnit)
  }), [companyScoped, search, filterType, filterStatus, filterUnit])

  const openFindings = companyScoped.filter(o => o.status !== 'Closed').length
  const closedFindings = companyScoped.filter(o => o.status === 'Closed').length
  const closureRate = companyScoped.length ? Math.round((closedFindings / companyScoped.length) * 100) : 0
  const highRisk = companyScoped.filter(o => ['High', 'Critical'].includes(o.risk) && o.status !== 'Closed').length

  const findingBars = [
    { label: 'Open', value: companyScoped.filter(o => o.status === 'Open').length, tone: 'red' },
    { label: 'In Progress', value: companyScoped.filter(o => o.status === 'In Progress').length, tone: 'orange' },
    { label: 'Investigation', value: companyScoped.filter(o => o.status === 'Investigation').length, tone: 'blue' },
    { label: 'Closed', value: Math.max(closedFindings, 1), tone: 'green' },
  ]

  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function saveObservation(e) {
    e.preventDefault()
    if (!form.companyCode || !form.description.trim() || !form.location.trim() || !form.pic.trim() || !form.dueDate) {
      setNotice('Pilih Company/PT dan lengkapi deskripsi, lokasi, PIC serta due date sebelum menyimpan.')
      return
    }
    const id = `OBS-${String(Date.now()).slice(-6)}`
    setObservations(prev => [{ id, ...form }, ...prev])
    setFilterCompany(form.companyCode)
    setForm(emptyForm)
    setModalOpen(false)
    setNotice(`${id} berhasil disimpan dan ditandai ke PT ${form.companyCode}.`)
    setTimeout(() => setNotice(''), 3500)
  }

  function closeObservation(id) {
    setObservations(prev => prev.map(item => item.id === id ? { ...item, status: 'Closed' } : item))
    setNotice(`${id} ditandai Closed.`)
    setTimeout(() => setNotice(''), 2500)
  }

  function exportCSV() {
    const header = ['ID', 'Company/PT', 'Tanggal', 'Tipe', 'Deskripsi', 'Unit', 'Lokasi', 'Risiko', 'Status', 'PIC', 'Due Date', 'Tindakan']
    const rows = filtered.map(o => [o.id, o.companyCode || '', o.date, o.type, o.description, o.unit, o.location, o.risk, o.status, o.pic, o.dueDate, o.action])
    const csv = [header, ...rows].map(row => row.map(value => `"${String(value || '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `SINSHE_Inspection_Observation_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return <Shell title="Inspection & Observation" subtitle="Digitalisasi inspeksi, safety observation, tindak lanjut dan penutupan temuan.">
    {notice && <div className={styles.notice}><CheckCircle2 size={18}/>{notice}</div>}

    <div className="stats-grid four">
      <StatCard label="Inspeksi Bulan Ini" value={inspections.length} hint="jadwal September 2026" tone="blue" icon={<ClipboardCheck/>}/>
      <StatCard label="Safety Observation" value={companyScoped.length} hint={`${filtered.length} tampil setelah filter`} tone="green" icon={<Eye/>}/>
      <StatCard label="Temuan Terbuka" value={openFindings} hint={`${highRisk} high / critical risk`} tone="red" icon={<XCircle/>}/>
      <StatCard label="Closure Rate" value={`${closureRate}%`} hint={filterCompany === 'All' ? 'seluruh PT' : `PT ${filterCompany}`} tone="purple" icon={<CheckCircle2/>}/>
    </div>

    <div className={styles.actionBar}>
      <div><h2>Safety Observation Register</h2><p>Catat unsafe action, unsafe condition, near miss dan positive act per Company/PT.</p></div>
      <div className={styles.actionButtons}>
        <button className={styles.secondaryButton} onClick={exportCSV}><Download size={17}/> Export CSV</button>
        <button className={styles.primaryButton} onClick={() => { setNotice(''); setModalOpen(true) }}><Plus size={18}/> Observasi Baru</button>
      </div>
    </div>

    <Panel className={styles.registerPanel}>
      <div className={styles.filters}>
        <label className={styles.searchInput}><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari ID, PT, deskripsi, lokasi, PIC..."/></label>
        <label><select value={filterCompany} onChange={e => setFilterCompany(e.target.value)}><option value="All">All Companies</option>{COMPANY_MASTER.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
        <label><Filter size={15}/><select value={filterType} onChange={e => setFilterType(e.target.value)}><option>All</option>{observationTypes.map(v => <option key={v}>{v}</option>)}</select></label>
        <label><select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option>All</option>{statuses.map(v => <option key={v}>{v}</option>)}</select></label>
        <label><select value={filterUnit} onChange={e => setFilterUnit(e.target.value)}><option>All</option>{units.map(v => <option key={v}>{v}</option>)}</select></label>
      </div>

      <div className="table-wrap"><table>
        <thead><tr><th>ID</th><th>PT</th><th>Tanggal</th><th>Tipe</th><th>Temuan / Observasi</th><th>Unit & Lokasi</th><th>Risiko</th><th>PIC</th><th>Due Date</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>
          {filtered.map(o => <tr key={o.id}>
            <td><b>{o.id}</b></td><td><b>{o.companyCode || '-'}</b></td><td>{formatDate(o.date)}</td>
            <td><Badge tone={badgeTone(o.type)}>{o.type}</Badge></td>
            <td className={styles.descriptionCell}><b>{o.description}</b>{o.action && <small>Tindakan: {o.action}</small>}</td>
            <td><b>{o.unit}</b><small className={styles.blockText}>{o.location}</small></td>
            <td><Badge tone={badgeTone(o.risk)}>{o.risk}</Badge></td><td>{o.pic}</td><td>{formatDate(o.dueDate)}</td>
            <td><Badge tone={badgeTone(o.status)}>{o.status}</Badge></td>
            <td>{o.status !== 'Closed' ? <button className={styles.closeButton} onClick={() => closeObservation(o.id)}><ShieldCheck size={14}/> Close</button> : <span className={styles.closedText}><CheckCircle2 size={14}/> Done</span>}</td>
          </tr>)}
          {!filtered.length && <tr><td colSpan="11" className={styles.emptyState}>Tidak ada data yang sesuai dengan filter.</td></tr>}
        </tbody>
      </table></div>
    </Panel>

    <div className="dashboard-split mt">
      <Panel title="Jadwal & Hasil Inspeksi">
        <div className="table-wrap"><table>
          <thead><tr><th>No Inspeksi</th><th>Tanggal</th><th>Objek</th><th>Lokasi</th><th>Status</th><th>Skor</th></tr></thead>
          <tbody>{inspections.map(r => <tr key={r.id}>
            <td><b>{r.id}</b></td><td>{formatDate(r.date)}</td><td>{r.object}</td><td>{r.unit}</td><td><Badge tone={badgeTone(r.status)}>{r.status}</Badge></td>
            <td style={{minWidth:120}}>{r.score ? <><b>{r.score}%</b><Progress value={r.score} tone={r.score >= 85 ? 'green' : 'orange'}/></> : '-'}</td>
          </tr>)}</tbody>
        </table></div>
      </Panel>

      <Panel title="Status Temuan"><BarList data={findingBars}/><div className="ai-card" style={{marginTop:16}}><ListChecks/><div><b>Kontrol Tindak Lanjut</b><p>{openFindings} temuan masih aktif. Prioritaskan {highRisk} temuan dengan risiko High/Critical dan pastikan bukti penutupan terdokumentasi.</p></div></div></Panel>
    </div>

    <div className={styles.infoStrip}><FileText size={20}/><div><b>Company/PT scope aktif</b><span>Setiap observasi baru wajib memilih PT. Saat login production, Company/PT ikut tersinkron ke database pusat dan menjadi sumber filter Executive Dashboard.</span></div></div>

    {modalOpen && <div className={styles.modalBackdrop} onMouseDown={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Tambah observasi baru">
        <div className={styles.modalHeader}><div><span>SINSHE 2.0</span><h2>Observasi Baru</h2><p>Input temuan lapangan dan rencana tindak lanjut.</p></div><button onClick={() => setModalOpen(false)} aria-label="Tutup"><X size={20}/></button></div>
        <form onSubmit={saveObservation} className={styles.form}>
          {notice && <div className={styles.formError}><AlertTriangle size={16}/>{notice}</div>}
          <div className={styles.formGrid}>
            <label>Company / PT<select value={form.companyCode} onChange={e => updateForm('companyCode', e.target.value)}>{COMPANY_MASTER.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
            <label>Tanggal Observasi<input type="date" value={form.date} onChange={e => updateForm('date', e.target.value)}/></label>
            <label>Tipe Observasi<select value={form.type} onChange={e => updateForm('type', e.target.value)}>{observationTypes.map(v => <option key={v}>{v}</option>)}</select></label>
            <label>Unit<select value={form.unit} onChange={e => updateForm('unit', e.target.value)}>{units.map(v => <option key={v}>{v}</option>)}</select></label>
            <label>Lokasi Spesifik<input value={form.location} onChange={e => updateForm('location', e.target.value)} placeholder="Contoh: Workshop / Blok A12"/></label>
            <label>Risk Level<select value={form.risk} onChange={e => updateForm('risk', e.target.value)}>{riskLevels.map(v => <option key={v}>{v}</option>)}</select></label>
            <label>Status Awal<select value={form.status} onChange={e => updateForm('status', e.target.value)}>{statuses.map(v => <option key={v}>{v}</option>)}</select></label>
            <label>PIC Tindak Lanjut<input value={form.pic} onChange={e => updateForm('pic', e.target.value)} placeholder="Nama / jabatan PIC"/></label>
            <label>Due Date<input type="date" value={form.dueDate} onChange={e => updateForm('dueDate', e.target.value)}/></label>
          </div>
          <label>Deskripsi Observasi<textarea rows="3" value={form.description} onChange={e => updateForm('description', e.target.value)} placeholder="Jelaskan kondisi/perilaku yang ditemukan..."/></label>
          <label>Tindakan Segera / Corrective Action<textarea rows="2" value={form.action} onChange={e => updateForm('action', e.target.value)} placeholder="Apa tindakan awal yang sudah atau akan dilakukan?"/></label>
          <label>Evidence (sementara)<input type="file" accept="image/*,.pdf" onChange={e => updateForm('evidence', e.target.files?.[0]?.name || '')}/>{form.evidence && <small>File dipilih: {form.evidence}</small>}</label>
          <div className={styles.formActions}><button type="button" className={styles.secondaryButton} onClick={() => setModalOpen(false)}>Batal</button><button type="submit" className={styles.primaryButton}><CheckCircle2 size={17}/> Simpan Observasi</button></div>
        </form>
      </div>
    </div>}
  </Shell>
}
