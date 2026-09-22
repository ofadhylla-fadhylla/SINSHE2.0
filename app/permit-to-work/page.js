'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge, Panel, StatCard } from '../../components/Ui'
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Clock3, Download, Eye, FileCheck2, Flame, Plus, Search, ShieldCheck, X } from 'lucide-react'
import { DEFAULT_COMPANY_FILTERS, filteredCompanies } from '../../lib/company-master'
import { dbInsert, dbSelect, dbUpdate, dbUpsert, getStoredProfile, isSupabaseConfigured } from '../../lib/supabase-rest'
import { WORK_PERMIT_FORMS, WORK_PERMIT_TYPES, checklistFor, selectionMap } from '../../lib/work-permit-forms'
import styles from './permit-to-work.module.css'

const STEPS = ['Informasi Umum','JSA & Pekerja','Checklist Spesifik','Peralatan & APD','Verifikasi & Approval']
const TYPE_META = {
  'Hot Work': { icon:'🔥', label:'Hot Work', desc:'Welding, cutting, grinding, drilling dan sumber panas/percikan.' },
  'Confined Space': { icon:'⚠️', label:'Confined Space', desc:'Tank, pit, boiler, tunnel, sewer, manhole dan vessel.' },
  'Working at Height': { icon:'🧗', label:'Working at Height', desc:'Pekerjaan pada ketinggian ≥ 1,8 meter.' },
  'Electrical Work': { icon:'⚡', label:'Electrical Work', desc:'Pekerjaan listrik dengan kontrol isolasi dan LOTO.' },
  'Water Depth Area': { icon:'🌊', label:'Water Depth Area', desc:'Pekerjaan di sekitar area air dengan risiko jatuh/tenggelam.' },
}

const localDate = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,10)
}
const emptyGas = () => ({ lel:'', co:'', oxygen:'', h2s:'', temperature:'' })
const emptyFieldVerification = () => ({ safe:false, verifier:'', date:'', time:'', notes:'' })
const emptyClosure = () => ({
  date:'', time:'', safe:false, ak3:'', assistant:'', notes:'',
  checks:{ workersOut:false, toolsRemoved:false, clean:false, barricadeSafe:false, noFire:false, lotoReleased:false, photo:false },
})

function emptyPermit(type = 'Hot Work', companyCode = 'ACP') {
  const cfg = WORK_PERMIT_FORMS[type]
  return {
    id:'', companyCode, type, formCode:cfg.code, title:'', unit:'', area:'', requester:'', contractorType:'Internal', contractor:'', supervisor:'',
    startDate:localDate(), startTime:'08:00', endDate:localDate(), endTime:'17:00', risk:'High', status:'Draft', jsaNo:'', description:'',
    workers:Array(cfg.workerRows).fill(''), checklist:checklistFor(type), equipment:selectionMap(cfg.equipment), ppe:selectionMap(cfg.ppe),
    environmentNotes:'', gasTest:emptyGas(), applicantName:'', assistantReviewer:'', ak3Reviewer:'', approverName:'',
    lotoRequired:type === 'Electrical Work', lotoRef:'', workHeightM:'', waterDepthM:'', weather:'', visibility:'', distanceFromShoreM:'', boatRequired:false,
    supportingDocuments:[], fieldVerification:emptyFieldVerification(), closure:emptyClosure(), statusReason:'',
  }
}

function splitDateTime(value) {
  if (!value) return { date:'', time:'' }
  const d = new Date(value)
  const pad = n => String(n).padStart(2, '0')
  return { date:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`, time:`${pad(d.getHours())}:${pad(d.getMinutes())}` }
}

const toIso = (date, time) => new Date(`${date}T${time || '00:00'}:00`).toISOString()
const durationHours = item => (new Date(`${item.endDate}T${item.endTime}:00`) - new Date(`${item.startDate}T${item.startTime}:00`)) / 36e5
const leadHours = item => (new Date(`${item.startDate}T${item.startTime}:00`) - new Date()) / 36e5
const fmt = value => value ? new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${value}T00:00:00`)) : '-'
const workers = item => (item.workers || []).map(v=>String(v).trim()).filter(Boolean)

function gasOk(gas = {}) {
  const lel = Number(gas.lel), co = Number(gas.co), oxygen = Number(gas.oxygen), h2s = Number(gas.h2s), temperature = Number(gas.temperature)
  return [lel,co,oxygen,h2s,temperature].every(Number.isFinite) && lel <= 2 && co <= 30 && oxygen >= 19.5 && oxygen <= 23 && h2s <= 10 && temperature <= 35
}

function checklistReady(item) {
  const cfg = WORK_PERMIT_FORMS[item.type]
  return item.checklist.length > 0 && item.checklist.every(row => row.answer === 'Yes' || (cfg.allowNA && row.answer === 'N/A')) && !item.checklist.some(row => row.answer === 'No')
}

function fieldVerified(item) {
  return Boolean(item.fieldVerification?.safe && item.fieldVerification?.verifier && item.fieldVerification?.date && item.fieldVerification?.time)
}

function closureReady(item) {
  const c = item.closure || {}
  const checks = c.checks || {}
  const basic = c.safe && c.date && c.time && c.ak3 && c.assistant && checks.workersOut && checks.toolsRemoved && checks.clean
  if (!basic) return false
  if (item.type === 'Hot Work' && !checks.noFire) return false
  if (item.type === 'Electrical Work' && item.lotoRequired && !checks.lotoReleased) return false
  return true
}

function overdueClosing(item) {
  if (!['Active','Suspended'].includes(item.status)) return false
  const end = new Date(`${item.endDate}T${item.endTime}:00`).getTime()
  return Number.isFinite(end) && Date.now() - end > 6 * 36e5
}

function tone(value) {
  if (['Active','Approved','Closed','Low'].includes(value)) return 'green'
  if (['Submitted','Assistant Review','Field Verification','Suspended','Medium'].includes(value)) return 'orange'
  if (['Rejected','Critical','Overdue'].includes(value)) return 'red'
  return 'blue'
}

function fromDb(row) {
  const start = splitDateTime(row.start_at), end = splitDateTime(row.end_at)
  const type = WORK_PERMIT_FORMS[row.permit_type] ? row.permit_type : 'Hot Work'
  const cfg = WORK_PERMIT_FORMS[type]
  return {
    id:row.id, companyCode:row.company_code || '', type, formCode:row.form_code || cfg.code, title:row.title || '', unit:row.unit || '', area:row.area || '',
    requester:row.requester || '', contractorType:row.contractor_type || 'Internal', contractor:row.contractor || '', supervisor:row.supervisor || '',
    startDate:start.date, startTime:start.time, endDate:end.date, endTime:end.time, risk:row.risk || 'High', status:row.status || 'Draft', jsaNo:row.jsa_no || '', description:row.description || '',
    workers:Array.isArray(row.workers) ? row.workers.map(String) : [], checklist:Array.isArray(row.safety_checklist) && row.safety_checklist.length ? row.safety_checklist : checklistFor(type),
    equipment:row.equipment || selectionMap(cfg.equipment), ppe:row.ppe || selectionMap(cfg.ppe), environmentNotes:row.environment_notes || '', gasTest:row.gas_test || emptyGas(),
    applicantName:row.applicant_name || '', assistantReviewer:row.assistant_reviewer || '', ak3Reviewer:row.ak3_reviewer || '', approverName:row.approver_name || '',
    lotoRequired:Boolean(row.loto_required), lotoRef:row.loto_ref || '', workHeightM:row.work_height_m ?? '', waterDepthM:row.water_depth_m ?? '', weather:row.weather || '',
    visibility:row.visibility || '', distanceFromShoreM:row.distance_from_shore_m ?? '', boatRequired:Boolean(row.boat_required),
    supportingDocuments:Array.isArray(row.supporting_documents) ? row.supporting_documents : [], fieldVerification:row.field_verification || emptyFieldVerification(),
    closure:row.closure || emptyClosure(), statusReason:row.status_reason || '',
  }
}

function toDb(item) {
  return {
    id:item.id, company_code:item.companyCode, permit_type:item.type, form_code:item.formCode, title:item.title, unit:item.unit, area:item.area,
    requester:item.requester || null, contractor_type:item.contractorType || 'Internal', contractor:item.contractor || null, supervisor:item.supervisor || null,
    start_at:toIso(item.startDate,item.startTime), end_at:toIso(item.endDate,item.endTime), risk:item.risk, status:item.status, jsa_no:item.jsaNo || null, description:item.description || null,
    controls:{ jsa:Boolean(item.jsaNo), ppe:Object.values(item.ppe || {}).some(Boolean), loto:Boolean(item.lotoRequired && item.lotoRef), gasTest:item.type === 'Confined Space' && gasOk(item.gasTest) },
    approval:[item.assistantReviewer,item.ak3Reviewer,item.approverName].filter(Boolean).join(' → '), workers:workers(item), safety_checklist:item.checklist,
    equipment:item.equipment, ppe:item.ppe, environment_notes:item.environmentNotes || null, gas_test:item.gasTest, applicant_name:item.applicantName || null,
    assistant_reviewer:item.assistantReviewer || null, ak3_reviewer:item.ak3Reviewer || null, approver_name:item.approverName || null,
    loto_required:Boolean(item.lotoRequired), loto_ref:item.lotoRef || null, work_height_m:item.workHeightM === '' ? null : Number(item.workHeightM),
    water_depth_m:item.waterDepthM === '' ? null : Number(item.waterDepthM), weather:item.weather || null, visibility:item.visibility || null,
    distance_from_shore_m:item.distanceFromShoreM === '' ? null : Number(item.distanceFromShoreM), boat_required:Boolean(item.boatRequired),
    supporting_documents:item.supportingDocuments || [], field_verification:item.fieldVerification || {}, closure:item.closure || {}, status_reason:item.statusReason || null, source_form:item.formCode,
  }
}

function gateIssues(item, activeLotos = [], phase = 'submit') {
  const issues = []
  if (!item.companyCode || !item.title.trim() || !item.unit.trim() || !item.area.trim() || !item.requester.trim() || !item.supervisor.trim() || !item.description.trim()) issues.push('Lengkapi PT, pekerjaan, unit, lokasi, pemohon, supervisor dan uraian pekerjaan.')
  if (durationHours(item) <= 0) issues.push('Waktu selesai harus lebih akhir dari waktu mulai.')
  if (['Hot Work','Confined Space'].includes(item.type) && durationHours(item) > 24) issues.push('Hot Work dan Confined Space maksimum 1 × 24 jam.')
  if (!item.jsaNo.trim()) issues.push('JSA wajib dilampirkan/diisi untuk permit berisiko tinggi.')
  if (!item.applicantName.trim()) issues.push('Nama Pemohon/Pimpinan Kerja wajib diisi.')
  if (!workers(item).length) issues.push('Daftar pekerja belum diisi.')
  if (item.type === 'Confined Space' && workers(item).length < 2) issues.push('Confined Space minimal 2 orang, termasuk standby person di luar ruang.')
  if (!checklistReady(item)) issues.push('Checklist harus lengkap; jawaban No memblokir permit.')
  if (item.type === 'Working at Height' && Number(item.workHeightM) < 1.8) issues.push('Working at Height Permit menggunakan trigger ketinggian ≥ 1,8 m.')
  if (item.type === 'Water Depth Area' && !(Number(item.waterDepthM) > 0)) issues.push('Kedalaman air wajib diisi lebih dari 0 meter.')
  if (item.type === 'Water Depth Area' && (!item.weather.trim() || !item.visibility.trim())) issues.push('Kondisi cuaca dan visibility wajib diisi untuk area kedalaman air.')
  if (item.type === 'Electrical Work' && item.lotoRequired) {
    if (!item.lotoRef) issues.push('Electrical Work yang memerlukan isolasi wajib terhubung ke LOTO.')
    else if (!activeLotos.some(l=>l.id===item.lotoRef && l.status==='Applied')) issues.push('LOTO terkait harus berstatus Applied sebelum permit disetujui.')
  }
  if (phase === 'approval') {
    if (item.type === 'Confined Space' && !gasOk(item.gasTest)) issues.push('Atmosfer Confined Space belum memenuhi gate: LEL ≤2%, O₂ 19,5–23%, CO ≤30 ppm, H₂S ≤10 ppm, suhu ≤35°C.')
    if (!fieldVerified(item)) issues.push('Field verification Sustainability/HSE belum lengkap atau belum dinyatakan aman.')
    if (!item.approverName.trim()) issues.push('Nama Manajer/Kepala Departemen sebagai approver wajib diisi.')
  }
  return issues
}

export default function PermitToWork() {
  const [filters,setFilters] = useState(DEFAULT_COMPANY_FILTERS)
  const [permits,setPermits] = useState([])
  const [activeLotos,setActiveLotos] = useState([])
  const [search,setSearch] = useState('')
  const [statusFilter,setStatusFilter] = useState('All')
  const [typeFilter,setTypeFilter] = useState('All')
  const [modal,setModal] = useState(false)
  const [step,setStep] = useState(1)
  const [form,setForm] = useState(() => emptyPermit())
  const [notice,setNotice] = useState('')
  const [error,setError] = useState('')
  const [loading,setLoading] = useState(true)
  const profile = getStoredProfile()
  const canManage = !profile || profile.role !== 'Viewer'
  const actor = profile?.full_name || profile?.name || profile?.email || 'SINSHE User'

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        if (!isSupabaseConfigured()) throw new Error('Supabase belum dikonfigurasi.')
        const [rows,lotos] = await Promise.all([
          dbSelect('permits','select=*&order=updated_at.desc'),
          dbSelect('loto_installations','select=id,company_code,unit,equipment,location,status,permit_ref&status=eq.Applied&order=updated_at.desc').catch(()=>[]),
        ])
        if (alive) {
          setPermits((rows || []).map(fromDb))
          setActiveLotos(lotos || [])
        }
      } catch (e) {
        if (alive) setError(e?.message || 'Gagal mengambil Work Permit.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  const companies = useMemo(() => filteredCompanies(filters), [filters])
  const allowed = useMemo(() => new Set(companies.map(c => c.code)), [companies])
  const scoped = useMemo(() => permits.filter(p => allowed.has(p.companyCode)), [permits,allowed])
  const visible = useMemo(() => scoped.filter(p => {
    const q = search.trim().toLowerCase()
    const hit = !q || [p.id,p.companyCode,p.formCode,p.type,p.title,p.unit,p.area,p.requester,p.supervisor,p.jsaNo,p.lotoRef].join(' ').toLowerCase().includes(q)
    return hit && (statusFilter === 'All' || p.status === statusFilter) && (typeFilter === 'All' || p.type === typeFilter)
  }), [scoped,search,statusFilter,typeFilter])

  const cfg = WORK_PERMIT_FORMS[form.type]
  const availableLotos = useMemo(() => activeLotos.filter(l=>l.company_code===form.companyCode), [activeLotos,form.companyCode])
  const approvalIssues = useMemo(() => gateIssues(form,activeLotos,'approval'), [form,activeLotos])
  const flash = message => { setNotice(message); setTimeout(() => setNotice(''), 4000) }

  function openPermit(item, type = 'Hot Work') {
    const companyCode = filters.company !== 'All' ? filters.company : 'ACP'
    setForm(JSON.parse(JSON.stringify(item || emptyPermit(type,companyCode))))
    setStep(1)
    setModal(true)
  }

  function changeType(type) {
    const next = emptyPermit(type,form.companyCode)
    setForm({ ...next, title:form.title, unit:form.unit, area:form.area, requester:form.requester, contractorType:form.contractorType, contractor:form.contractor, supervisor:form.supervisor, startDate:form.startDate, startTime:form.startTime, endDate:form.endDate, endTime:form.endTime, risk:form.risk, jsaNo:form.jsaNo, description:form.description, workers:form.workers, supportingDocuments:form.supportingDocuments })
  }

  async function recordEvent(item, fromStatus, toStatus, eventType, notes = '') {
    try {
      await dbInsert('permit_events',[{ permit_id:item.id, company_code:item.companyCode, unit:item.unit, event_type:eventType, from_status:fromStatus || null, to_status:toStatus || null, actor, notes:notes || null }])
    } catch {
      // Workflow action remains valid even if audit logging is temporarily unavailable.
    }
  }

  async function savePermit(nextStatus = form.status) {
    const isNew = !form.id
    const item = { ...form, status:nextStatus, id:form.id || `PTW-${localDate().slice(0,4)}-${String(Date.now()).slice(-6)}`, formCode:WORK_PERMIT_FORMS[form.type].code }
    if (nextStatus === 'Submitted') {
      const issues = gateIssues(item,activeLotos,'submit')
      if (issues.length) return flash(issues[0])
      if (['Draft','Rejected'].includes(form.status) && leadHours(item) < 48) return flash('Pengajuan izin kerja wajib dibuat minimal 2 hari sebelum pekerjaan dimulai sesuai SOP.')
    } else if (durationHours(item) <= 0) return flash('Waktu selesai harus lebih akhir dari waktu mulai.')
    try {
      const payload = toDb(item)
      if (nextStatus === 'Submitted' && ['Draft','Rejected'].includes(form.status)) payload.submitted_at = new Date().toISOString()
      await dbUpsert('permits',[payload],'id')
      setPermits(prev => [item,...prev.filter(p => p.id !== item.id)])
      setForm(item)
      await recordEvent(item, isNew ? null : form.status, nextStatus, isNew ? 'CREATED' : nextStatus === 'Submitted' ? 'SUBMITTED' : 'UPDATED')
      flash(`${item.id} tersimpan (${nextStatus}).`)
      if (nextStatus === 'Submitted') setModal(false)
    } catch (e) { flash(`Gagal menyimpan: ${e.message}`) }
  }

  async function setStatus(item,nextStatus) {
    let reason = ''
    if (nextStatus === 'Assistant Review' && !item.assistantReviewer) return flash('Isi nama Asisten Operasional melalui Buka/Edit terlebih dahulu.')
    if (nextStatus === 'Field Verification' && !fieldVerified(item)) return flash('Lengkapi field verification Sustainability/HSE dan pernyataan aman melalui Buka/Edit.')
    if (nextStatus === 'Approved') {
      const issues = gateIssues(item,activeLotos,'approval')
      if (issues.length) return flash(issues[0])
    }
    if (nextStatus === 'Closed' && !closureReady(item)) return flash('Lengkapi checklist penutupan, pemeriksa dan pernyataan aman melalui Buka/Edit.')
    if (nextStatus === 'Rejected') {
      reason = window.prompt('Alasan penolakan permit:') || ''
      if (!reason.trim()) return
    }
    const timestampField = {
      'Assistant Review':'assistant_reviewed_at',
      'Field Verification':'field_verified_at',
      'Approved':'approved_at',
      'Active':'activated_at',
      'Suspended':'suspended_at',
      'Closed':'closed_at',
    }[nextStatus]
    const patch = { status:nextStatus, closure:item.closure || {}, field_verification:item.fieldVerification || {}, status_reason:reason || null }
    if (timestampField) patch[timestampField] = new Date().toISOString()
    try {
      await dbUpdate('permits',{id:`eq.${item.id}`},patch)
      const updated = {...item,status:nextStatus,statusReason:reason}
      setPermits(prev => prev.map(p => p.id === item.id ? updated : p))
      await recordEvent(item,item.status,nextStatus,nextStatus.toUpperCase().replaceAll(' ','_'),reason)
      flash(`${item.id} → ${nextStatus}`)
    } catch (e) { flash(e.message) }
  }

  function exportCSV() {
    const rows = [['ID','PT','Form','Type','Pekerjaan','Unit','Area','Start','End','Risk','Status','JSA','LOTO'],...visible.map(p => [p.id,p.companyCode,p.formCode,p.type,p.title,p.unit,p.area,`${p.startDate} ${p.startTime}`,`${p.endDate} ${p.endTime}`,p.risk,p.status,p.jsaNo,p.lotoRef])]
    const csv = rows.map(r => r.map(v => `"${String(v || '').replaceAll('"','""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}))
    const a = document.createElement('a'); a.href = url; a.download = `SINSHE_Work_Permit_${localDate()}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  return <Shell title="Permit to Work" subtitle="Work Permit Management — lima form aktual, hard safety gate, field verification, LOTO link dan closing control.">
    {notice && <div className={styles.notice}><CheckCircle2 size={18}/>{notice}</div>}
    {error && <div className={styles.notice}><AlertTriangle size={18}/>{error}</div>}
    <CompanyScopeBar filters={filters} onChange={setFilters} onReset={() => setFilters(DEFAULT_COMPANY_FILTERS)}/>

    <div className="stats-grid four">
      <StatCard label="Permit Aktif" value={scoped.filter(p=>p.status==='Active').length} hint="pekerjaan berjalan" tone="green" icon={<ShieldCheck/>}/>
      <StatCard label="Menunggu Approval" value={scoped.filter(p=>['Submitted','Assistant Review','Field Verification'].includes(p.status)).length} hint="review & verifikasi" tone="orange" icon={<Clock3/>}/>
      <StatCard label="Overdue Closing" value={scoped.filter(overdueClosing).length} hint="> 6 jam dari waktu selesai" tone="red" icon={<AlertTriangle/>}/>
      <StatCard label="Closed" value={scoped.filter(p=>p.status==='Closed').length} hint={`${scoped.length} total permit`} tone="blue" icon={<FileCheck2/>}/>
    </div>

    <div className={styles.headerRow}>
      <div><h2>Create Work Permit</h2><p>Pilih tipe izin kerja. Pengajuan baru wajib minimal H-2 dan JSA menjadi hard requirement sebelum Submit.</p></div>
      <div className={styles.buttons}><button className={styles.secondary} onClick={exportCSV}><Download size={17}/> Export CSV</button></div>
    </div>

    <div className={styles.typeCards}>
      {WORK_PERMIT_TYPES.map(type=><button key={type} className={styles.typeCard} onClick={()=>canManage&&openPermit(null,type)} disabled={!canManage}>
        <span className={styles.typeIcon}>{TYPE_META[type]?.icon}</span><b>{TYPE_META[type]?.label || type}</b><small>{TYPE_META[type]?.desc}</small><em>{WORK_PERMIT_FORMS[type].code}</em>
      </button>)}
    </div>

    <div className={styles.headerRow}>
      <div><h2>Work Permit Register</h2><p>Monitoring Draft → Submitted → Assistant Review → Field Verification → Approved → Active → Closed.</p></div>
      {canManage && <button className={styles.primary} onClick={()=>openPermit(null,'Hot Work')}><Plus size={18}/> Buat Permit</button>}
    </div>

    <Panel>
      <div className={styles.filters}>
        <label className={styles.search}><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari ID, PT, form, pekerjaan, area, JSA, LOTO..."/></label>
        <label><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All</option>{['Draft','Submitted','Assistant Review','Field Verification','Approved','Active','Suspended','Closed','Rejected'].map(v=><option key={v}>{v}</option>)}</select></label>
        <label><select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option>All</option>{WORK_PERMIT_TYPES.map(v=><option key={v}>{v}</option>)}</select></label>
      </div>
      <div className="table-wrap"><table><thead><tr><th>No PTW</th><th>PT / Form</th><th>Pekerjaan</th><th>Lokasi</th><th>Validitas</th><th>Risk</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
        {visible.map(p=><tr key={p.id}>
          <td><b>{p.id}</b><small className={styles.block}>{p.jsaNo ? `JSA: ${p.jsaNo}` : 'JSA: -'}</small>{p.lotoRef&&<small className={styles.block}>LOTO: {p.lotoRef}</small>}</td>
          <td><b>{p.companyCode}</b><small className={styles.block}>{p.formCode}</small></td>
          <td className={styles.workCell}><b>{p.type}</b><small>{p.title}</small></td>
          <td><b>{p.unit}</b><small className={styles.block}>{p.area}</small></td>
          <td>{fmt(p.startDate)}<small className={styles.block}>{p.startTime}–{p.endTime}</small>{overdueClosing(p)&&<small className={styles.overdueText}>OVERDUE CLOSING</small>}</td>
          <td><Badge tone={tone(p.risk)}>{p.risk}</Badge></td><td><Badge tone={tone(p.status)}>{p.status}</Badge>{p.statusReason&&<small className={styles.block}>{p.statusReason}</small>}</td>
          <td><div className={styles.rowActions}>
            <button onClick={()=>openPermit(p)}><Eye size={14}/> Buka</button>
            {canManage && p.status==='Submitted' && <><button onClick={()=>setStatus(p,'Assistant Review')}>Asst Review</button><button onClick={()=>setStatus(p,'Rejected')}>Reject</button></>}
            {canManage && p.status==='Assistant Review' && <><button onClick={()=>setStatus(p,'Field Verification')}>Field Verify</button><button onClick={()=>setStatus(p,'Rejected')}>Reject</button></>}
            {canManage && p.status==='Field Verification' && <><button onClick={()=>setStatus(p,'Approved')}>Approve</button><button onClick={()=>setStatus(p,'Rejected')}>Reject</button></>}
            {canManage && p.status==='Approved' && <button onClick={()=>setStatus(p,'Active')}>Start</button>}
            {canManage && p.status==='Active' && <button onClick={()=>setStatus(p,'Suspended')}>Suspend</button>}
            {canManage && p.status==='Suspended' && <button onClick={()=>setStatus(p,'Active')}>Resume</button>}
            {canManage && ['Active','Suspended'].includes(p.status) && <button onClick={()=>setStatus(p,'Closed')}>Close</button>}
          </div></td>
        </tr>)}
        {!visible.length && <tr><td colSpan="8" className={styles.empty}>{loading ? 'Memuat data...' : 'Belum ada Work Permit sesuai filter.'}</td></tr>}
      </tbody></table></div>
    </Panel>

    {modal && <div className={styles.backdrop} onMouseDown={e=>e.target===e.currentTarget&&setModal(false)}><div className={styles.modal}>
      <div className={styles.modalHead}><div><span>{cfg.code}</span><h2>{cfg.label}</h2><p>{form.id || 'Permit baru'} • Status: {form.status}</p></div><button type="button" onClick={()=>setModal(false)}><X/></button></div>
      <div className={styles.stepper}>{STEPS.map((label,i)=><button type="button" key={label} className={step===i+1?styles.activeStep:step>i+1?styles.doneStep:''} onClick={()=>setStep(i+1)}><span>{i+1}</span>{label}</button>)}</div>
      <form onSubmit={e=>{e.preventDefault();savePermit(form.status)}}>
        {step===1 && <div className={styles.formGrid}>
          <label>Company/PT<select value={form.companyCode} onChange={e=>setForm({...form,companyCode:e.target.value,lotoRef:''})}>{filteredCompanies(DEFAULT_COMPANY_FILTERS).map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
          <label>Jenis Permit<select value={form.type} disabled={Boolean(form.id)&&form.status!=='Draft'} onChange={e=>changeType(e.target.value)}>{WORK_PERMIT_TYPES.map(v=><option key={v}>{v}</option>)}</select></label>
          <label className={styles.span2}>Jenis/Judul Pekerjaan<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
          <label>Unit/Departemen<input value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}/></label><label>Lokasi<input value={form.area} onChange={e=>setForm({...form,area:e.target.value})}/></label>
          <label>Pemohon<input value={form.requester} onChange={e=>setForm({...form,requester:e.target.value})}/></label><label>Pimpinan Kerja/Supervisor<input value={form.supervisor} onChange={e=>setForm({...form,supervisor:e.target.value})}/></label>
          <label>Pelaksana<select value={form.contractorType} onChange={e=>setForm({...form,contractorType:e.target.value})}><option>Internal</option><option>External</option></select></label>
          <label>Kontraktor/Perusahaan<input value={form.contractor} onChange={e=>setForm({...form,contractor:e.target.value})} placeholder={form.contractorType==='External'?'Wajib untuk pihak eksternal':'Opsional'}/></label>
          <label>Tanggal Mulai<input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></label><label>Jam Mulai<input type="time" value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})}/></label>
          <label>Tanggal Selesai<input type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></label><label>Jam Selesai<input type="time" value={form.endTime} onChange={e=>setForm({...form,endTime:e.target.value})}/></label>
          <label>Risk<select value={form.risk} onChange={e=>setForm({...form,risk:e.target.value})}>{['Low','Medium','High','Critical'].map(v=><option key={v}>{v}</option>)}</select></label>
          <label className={styles.span2}>Uraian Pekerjaan<textarea rows="4" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
        </div>}

        {step===2 && <div className={styles.formGrid}>
          <label>JSA Number <b className={styles.required}>WAJIB</b><input value={form.jsaNo} onChange={e=>setForm({...form,jsaNo:e.target.value})} placeholder="Contoh: JSA-CMA-2026-001"/></label>
          <label>Dibuat Oleh — Pemohon/Pimpinan Kerja<input value={form.applicantName} onChange={e=>setForm({...form,applicantName:e.target.value})}/></label>
          <label className={styles.span2}>Daftar Pekerja (1 nama per baris)<textarea rows="6" value={(form.workers||[]).join('\n')} onChange={e=>setForm({...form,workers:e.target.value.split('\n')})}/></label>
          <label className={styles.span2}>Dokumen Pendukung (1 referensi/nama file per baris)<textarea rows="5" value={(form.supportingDocuments||[]).join('\n')} onChange={e=>setForm({...form,supportingDocuments:e.target.value.split('\n').map(v=>v.trim()).filter(Boolean)})} placeholder="SPK / Surat penunjukan pengawas / Sertifikat kompetensi / jadwal kerja / daftar alat"/></label>
          <div className={styles.infoBox}>JSA menjadi hard requirement untuk Submit. Untuk kontraktor eksternal, tambahkan referensi SPK, penunjukan pengawas, jadwal, daftar alat/personel dan sertifikat kompetensi yang relevan.</div>
        </div>}

        {step===3 && <>
          {form.type==='Working at Height' && <div className={styles.specialBox}><b>Working at Height Gate</b><label>Ketinggian kerja (meter)<input type="number" min="0" step="0.1" value={form.workHeightM} onChange={e=>setForm({...form,workHeightM:e.target.value})}/></label><p>Permit ini menggunakan trigger ketinggian ≥ 1,8 meter.</p></div>}
          {form.type==='Electrical Work' && <div className={styles.specialBox}><b>Electrical Isolation & LOTO</b><label className={styles.inlineCheck}><input type="checkbox" checked={form.lotoRequired} onChange={e=>setForm({...form,lotoRequired:e.target.checked,lotoRef:e.target.checked?form.lotoRef:''})}/> Pekerjaan memerlukan isolasi energi / LOTO</label>{form.lotoRequired&&<label>LOTO Applied<select value={form.lotoRef} onChange={e=>setForm({...form,lotoRef:e.target.value})}><option value="">Pilih LOTO aktif</option>{availableLotos.map(l=><option key={l.id} value={l.id}>{l.id} — {l.equipment} — {l.location}</option>)}</select></label>}<a href="/loto-management">Buka LOTO Management</a></div>}
          {form.type==='Water Depth Area' && <div className={styles.specialBox}><b>Water Area Condition</b><div className={styles.formGrid}><label>Kedalaman air (m)<input type="number" min="0" step="0.1" value={form.waterDepthM} onChange={e=>setForm({...form,waterDepthM:e.target.value})}/></label><label>Jarak dari shore (m)<input type="number" min="0" step="0.1" value={form.distanceFromShoreM} onChange={e=>setForm({...form,distanceFromShoreM:e.target.value})}/></label><label>Cuaca<input value={form.weather} onChange={e=>setForm({...form,weather:e.target.value})} placeholder="Cerah / hujan / berangin"/></label><label>Visibility<input value={form.visibility} onChange={e=>setForm({...form,visibility:e.target.value})} placeholder="Baik / terbatas"/></label><label className={styles.inlineCheck}><input type="checkbox" checked={form.boatRequired} onChange={e=>setForm({...form,boatRequired:e.target.checked})}/> Boat diperlukan</label></div></div>}
          {form.type==='Confined Space' && <div className={styles.controlSection}><div className={styles.controlTitle}><b>Gas & Temperature Gate</b><span className={gasOk(form.gasTest)?styles.safeText:styles.dangerText}>{gasOk(form.gasTest)?'SAFE':'BLOCKED'}</span></div><div className={styles.formGrid}>
            {[['lel','Flammable Gas % LEL'],['co','CO ppm'],['oxygen','Oxygen %'],['h2s','H2S ppm'],['temperature','Temperature °C']].map(([key,label])=><label key={key}>{label}<input type="number" step="0.1" value={form.gasTest?.[key]||''} onChange={e=>setForm({...form,gasTest:{...form.gasTest,[key]:e.target.value}})}/></label>)}
          </div><p className={styles.helper}>Approval memakai gate SOP: LEL ≤2%, O₂ 19,5–23%, CO ≤30 ppm, H₂S ≤10 ppm, suhu ≤35°C.</p></div>}
          <div className={styles.controlSection}><div className={styles.controlTitle}><b>Checklist Pemeriksaan Keselamatan</b><span>{form.checklist.filter(r=>r.answer).length}/{form.checklist.length} terjawab</span></div><div className={styles.checklistGrid}>
            {form.checklist.map((row,index)=><div key={`${row.no}-${index}`} className={row.answer==='No'?styles.checkRowDanger:styles.checkRow}>
              <b>{row.no}</b><span>{row.label}</span><select value={row.answer} onChange={e=>setForm({...form,checklist:form.checklist.map((r,i)=>i===index?{...r,answer:e.target.value}:r)})}><option value="">Pilih</option><option>Yes</option><option>No</option>{cfg.allowNA&&<option>N/A</option>}</select><input value={row.remarks||''} onChange={e=>setForm({...form,checklist:form.checklist.map((r,i)=>i===index?{...r,remarks:e.target.value}:r)})} placeholder="Keterangan"/>
            </div>)}
          </div></div>
        </>}

        {step===4 && <>
          <div className={styles.controlSection}><div className={styles.controlTitle}><b>Peralatan Kerja & APD</b><span>Pilih yang digunakan/tersedia</span></div><div className={styles.controlGrid}>
            {[...cfg.equipment.map(v=>['equipment',v]),...cfg.ppe.map(v=>['ppe',v])].map(([kind,name])=><label key={`${kind}-${name}`} className={form[kind]?.[name]?styles.controlChecked:''}><input type="checkbox" checked={Boolean(form[kind]?.[name])} onChange={()=>setForm({...form,[kind]:{...form[kind],[name]:!form[kind]?.[name]}})}/><span>{name}<em>{kind==='equipment'?'Peralatan':'APD/Pengaman'}</em></span></label>)}
          </div></div>
          <div className={styles.formGrid}><label className={styles.span2}>Kondisi Lingkungan Area Kerja<textarea rows="5" value={form.environmentNotes} onChange={e=>setForm({...form,environmentNotes:e.target.value})} placeholder="Barricade, akses, kondisi lantai, cuaca, ventilasi, potensi sumber bahaya lain, dll."/></label></div>
        </>}

        {step===5 && <>
          <div className={styles.formGrid}>
            <label>Diperiksa — Asisten Operasional<input value={form.assistantReviewer} onChange={e=>setForm({...form,assistantReviewer:e.target.value})}/></label>
            <label>Diperiksa — Ahli K3 Umum<input value={form.ak3Reviewer} onChange={e=>setForm({...form,ak3Reviewer:e.target.value})}/></label>
            <label>Disetujui — Manajer/Kepala Dept.<input value={form.approverName} onChange={e=>setForm({...form,approverName:e.target.value})}/></label>
          </div>
          <div className={styles.controlSection}><div className={styles.controlTitle}><b>Field Verification — Sustainability/HSE</b><span>{fieldVerified(form)?'VERIFIED':'PENDING'}</span></div><div className={styles.formGrid}>
            <label>Verifier<input value={form.fieldVerification?.verifier||''} onChange={e=>setForm({...form,fieldVerification:{...form.fieldVerification,verifier:e.target.value}})}/></label><label>Tanggal<input type="date" value={form.fieldVerification?.date||''} onChange={e=>setForm({...form,fieldVerification:{...form.fieldVerification,date:e.target.value}})}/></label><label>Jam<input type="time" value={form.fieldVerification?.time||''} onChange={e=>setForm({...form,fieldVerification:{...form.fieldVerification,time:e.target.value}})}/></label>
            <label className={styles.inlineCheck}><input type="checkbox" checked={Boolean(form.fieldVerification?.safe)} onChange={e=>setForm({...form,fieldVerification:{...form.fieldVerification,safe:e.target.checked}})}/> Area telah diverifikasi dan aman</label>
            <label className={styles.span2}>Catatan Verifikasi<textarea rows="3" value={form.fieldVerification?.notes||''} onChange={e=>setForm({...form,fieldVerification:{...form.fieldVerification,notes:e.target.value}})}/></label>
          </div></div>

          <div className={approvalIssues.length?styles.gateBlocked:styles.gateSafe}><b>{approvalIssues.length?'Approval Gate: BLOCKED':'Approval Gate: READY'}</b>{approvalIssues.length?<ul>{approvalIssues.map(v=><li key={v}>{v}</li>)}</ul>:<p>Seluruh hard validation utama telah terpenuhi.</p>}</div>

          {['Approved','Active','Suspended','Closed'].includes(form.status) && <div className={styles.controlSection}><div className={styles.controlTitle}><b>Closing Permit</b><span>{closureReady(form)?'READY TO CLOSE':'BELUM LENGKAP'}</span></div><div className={styles.closingChecks}>
            {[['workersOut','Semua personel sudah keluar dari area'],['toolsRemoved','Tools/equipment telah dikeluarkan'],['clean','Area dan waste/material telah dibersihkan'],['barricadeSafe','Barricade sementara dilepas/dipertahankan sesuai kondisi aman'],['photo','Bukti foto setelah pekerjaan tersedia']].map(([key,label])=><label key={key}><input type="checkbox" checked={Boolean(form.closure?.checks?.[key])} onChange={e=>setForm({...form,closure:{...form.closure,checks:{...form.closure.checks,[key]:e.target.checked}}})}/>{label}</label>)}
            {form.type==='Hot Work'&&<label><input type="checkbox" checked={Boolean(form.closure?.checks?.noFire)} onChange={e=>setForm({...form,closure:{...form.closure,checks:{...form.closure.checks,noFire:e.target.checked}}})}/>Area telah diperiksa dan aman dari api/percikan panas</label>}
            {form.type==='Electrical Work'&&form.lotoRequired&&<label><input type="checkbox" checked={Boolean(form.closure?.checks?.lotoReleased)} onChange={e=>setForm({...form,closure:{...form.closure,checks:{...form.closure.checks,lotoReleased:e.target.checked}}})}/>LOTO telah dilepas sesuai prosedur setelah pekerjaan selesai</label>}
          </div><div className={styles.formGrid}>
            <label>Tanggal Selesai<input type="date" value={form.closure?.date||''} onChange={e=>setForm({...form,closure:{...form.closure,date:e.target.value}})}/></label><label>Jam Selesai<input type="time" value={form.closure?.time||''} onChange={e=>setForm({...form,closure:{...form.closure,time:e.target.value}})}/></label>
            <label>Pemeriksa Ahli K3 Umum<input value={form.closure?.ak3||''} onChange={e=>setForm({...form,closure:{...form.closure,ak3:e.target.value}})}/></label><label>Pemeriksa Asisten Operasional<input value={form.closure?.assistant||''} onChange={e=>setForm({...form,closure:{...form.closure,assistant:e.target.value}})}/></label>
            <label className={styles.inlineCheck}><input type="checkbox" checked={Boolean(form.closure?.safe)} onChange={e=>setForm({...form,closure:{...form.closure,safe:e.target.checked}})}/> Telah diperiksa dan dinyatakan aman setelah pekerjaan selesai</label>
            <label className={styles.span2}>Catatan Penutupan<textarea rows="3" value={form.closure?.notes||''} onChange={e=>setForm({...form,closure:{...form.closure,notes:e.target.value}})}/></label>
          </div></div>}
        </>}

        <div className={styles.modalFoot}>
          <button type="button" className={styles.secondary} onClick={()=>setModal(false)}>Batal</button>
          {step>1&&<button type="button" className={styles.secondary} onClick={()=>setStep(step-1)}><ChevronLeft size={16}/> Sebelumnya</button>}
          {canManage&&<button type="submit" className={styles.secondary}>{form.status==='Draft'?'Simpan Draft':'Simpan Perubahan'}</button>}
          {step<5&&<button type="button" className={styles.primary} onClick={()=>setStep(step+1)}>Berikutnya <ChevronRight size={16}/></button>}
          {canManage&&step===5&&['Draft','Rejected'].includes(form.status)&&<button type="button" className={styles.primary} onClick={()=>savePermit('Submitted')}><ClipboardCheck size={16}/> Submit Permit</button>}
        </div>
      </form>
    </div></div>}
  </Shell>
}
