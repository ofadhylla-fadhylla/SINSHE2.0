'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge, Panel, StatCard } from '../../components/Ui'
import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock3, Download, Eye, FileCheck2, Flame, Plus, Search, ShieldCheck, X } from 'lucide-react'
import { DEFAULT_COMPANY_FILTERS, filteredCompanies } from '../../lib/company-master'
import { dbSelect, dbUpdate, dbUpsert, getStoredProfile, isSupabaseConfigured } from '../../lib/supabase-rest'
import { WORK_PERMIT_FORMS, WORK_PERMIT_TYPES, checklistFor, selectionMap } from '../../lib/work-permit-forms'
import styles from './permit-to-work.module.css'

const today = () => new Date().toISOString().slice(0, 10)
const emptyGas = () => ({ lel:'', co:'', oxygen:'', h2s:'', temperature:'' })
const emptyClosure = () => ({ date:'', time:'', safe:false, ak3:'', assistant:'', notes:'' })

function emptyPermit(type = 'Hot Work', companyCode = 'ACP') {
  const cfg = WORK_PERMIT_FORMS[type]
  return {
    id:'', companyCode, type, formCode:cfg.code, title:'', unit:'', area:'', requester:'', contractor:'', supervisor:'',
    startDate:today(), startTime:'08:00', endDate:today(), endTime:'17:00', risk:'High', status:'Draft', jsaNo:'', description:'',
    workers:Array(cfg.workerRows).fill(''), checklist:checklistFor(type), equipment:selectionMap(cfg.equipment), ppe:selectionMap(cfg.ppe),
    environmentNotes:'', gasTest:emptyGas(), applicantName:'', assistantReviewer:'', ak3Reviewer:'', approverName:'', closure:emptyClosure(),
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

function gasOk(gas = {}) {
  const lel = Number(gas.lel), co = Number(gas.co), oxygen = Number(gas.oxygen), h2s = Number(gas.h2s), temperature = Number(gas.temperature)
  return [lel,co,oxygen,h2s,temperature].every(Number.isFinite) && lel <= 2 && co <= 30 && oxygen >= 19.5 && oxygen <= 23 && h2s <= 10 && temperature <= 35
}

function checklistReady(item) {
  const cfg = WORK_PERMIT_FORMS[item.type]
  return item.checklist.length > 0 && item.checklist.every(row => row.answer === 'Yes' || (cfg.allowNA && row.answer === 'N/A')) && !item.checklist.some(row => row.answer === 'No')
}

function tone(value) {
  if (['Active','Approved','Closed','Low'].includes(value)) return 'green'
  if (['Submitted','Assistant Review','HSE Review','Suspended','Medium'].includes(value)) return 'orange'
  if (['Rejected','Critical'].includes(value)) return 'red'
  return 'blue'
}

function fromDb(row) {
  const start = splitDateTime(row.start_at), end = splitDateTime(row.end_at)
  const type = WORK_PERMIT_FORMS[row.permit_type] ? row.permit_type : 'Hot Work'
  const cfg = WORK_PERMIT_FORMS[type]
  return {
    id:row.id, companyCode:row.company_code || '', type, formCode:row.form_code || cfg.code, title:row.title || '', unit:row.unit || '', area:row.area || '',
    requester:row.requester || '', contractor:row.contractor || '', supervisor:row.supervisor || '', startDate:start.date, startTime:start.time,
    endDate:end.date, endTime:end.time, risk:row.risk || 'High', status:row.status || 'Draft', jsaNo:row.jsa_no || '', description:row.description || '',
    workers:Array.isArray(row.workers) ? row.workers.map(String) : [],
    checklist:Array.isArray(row.safety_checklist) && row.safety_checklist.length ? row.safety_checklist : checklistFor(type),
    equipment:row.equipment || selectionMap(cfg.equipment), ppe:row.ppe || selectionMap(cfg.ppe), environmentNotes:row.environment_notes || '',
    gasTest:row.gas_test || emptyGas(), applicantName:row.applicant_name || '', assistantReviewer:row.assistant_reviewer || '',
    ak3Reviewer:row.ak3_reviewer || '', approverName:row.approver_name || '', closure:row.closure || emptyClosure(),
  }
}

function toDb(item) {
  return {
    id:item.id, company_code:item.companyCode, permit_type:item.type, form_code:item.formCode, title:item.title, unit:item.unit, area:item.area,
    requester:item.requester || null, contractor:item.contractor || null, supervisor:item.supervisor || null,
    start_at:toIso(item.startDate,item.startTime), end_at:toIso(item.endDate,item.endTime), risk:item.risk, status:item.status,
    jsa_no:item.jsaNo || null, description:item.description || null,
    controls:{ jsa:Boolean(item.jsaNo), ppe:Object.values(item.ppe || {}).some(Boolean), loto:item.type === 'Electrical Work' && item.checklist?.[4]?.answer === 'Yes', gasTest:item.type === 'Confined Space' && gasOk(item.gasTest) },
    approval:[item.assistantReviewer,item.ak3Reviewer,item.approverName].filter(Boolean).join(' → '),
    workers:(item.workers || []).map(v => String(v).trim()).filter(Boolean), safety_checklist:item.checklist, equipment:item.equipment, ppe:item.ppe,
    environment_notes:item.environmentNotes || null, gas_test:item.gasTest, applicant_name:item.applicantName || null,
    assistant_reviewer:item.assistantReviewer || null, ak3_reviewer:item.ak3Reviewer || null, approver_name:item.approverName || null,
    closure:item.closure || {}, source_form:item.formCode,
  }
}

export default function PermitToWork() {
  const [filters,setFilters] = useState(DEFAULT_COMPANY_FILTERS)
  const [permits,setPermits] = useState([])
  const [search,setSearch] = useState('')
  const [statusFilter,setStatusFilter] = useState('All')
  const [typeFilter,setTypeFilter] = useState('All')
  const [modal,setModal] = useState(false)
  const [form,setForm] = useState(() => emptyPermit())
  const [notice,setNotice] = useState('')
  const [error,setError] = useState('')
  const [loading,setLoading] = useState(true)
  const profile = getStoredProfile()
  const canManage = !profile || profile.role !== 'Viewer'

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        if (!isSupabaseConfigured()) throw new Error('Supabase belum dikonfigurasi.')
        const rows = await dbSelect('permits','select=*&order=updated_at.desc')
        if (alive) setPermits((rows || []).map(fromDb))
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
    const hit = !q || [p.id,p.companyCode,p.formCode,p.type,p.title,p.unit,p.area,p.requester,p.supervisor,p.jsaNo].join(' ').toLowerCase().includes(q)
    return hit && (statusFilter === 'All' || p.status === statusFilter) && (typeFilter === 'All' || p.type === typeFilter)
  }), [scoped,search,statusFilter,typeFilter])

  const cfg = WORK_PERMIT_FORMS[form.type]
  const flash = message => { setNotice(message); setTimeout(() => setNotice(''), 3500) }

  function openPermit(item) {
    const companyCode = filters.company !== 'All' ? filters.company : 'ACP'
    setForm(JSON.parse(JSON.stringify(item || emptyPermit('Hot Work',companyCode))))
    setModal(true)
  }

  function changeType(type) {
    const next = emptyPermit(type,form.companyCode)
    setForm({ ...next, title:form.title, unit:form.unit, area:form.area, requester:form.requester, contractor:form.contractor, supervisor:form.supervisor, startDate:form.startDate, startTime:form.startTime, endDate:form.endDate, endTime:form.endTime, risk:form.risk, jsaNo:form.jsaNo, description:form.description })
  }

  async function savePermit(nextStatus = form.status) {
    const item = { ...form, status:nextStatus, id:form.id || `PTW-${today().slice(0,4)}-${String(Date.now()).slice(-6)}`, formCode:WORK_PERMIT_FORMS[form.type].code }
    if (!item.companyCode || !item.title.trim() || !item.unit.trim() || !item.area.trim() || !item.requester.trim() || !item.supervisor.trim() || !item.description.trim()) return flash('Lengkapi PT, pekerjaan, unit, lokasi, pemohon, supervisor dan uraian pekerjaan.')
    if (durationHours(item) <= 0) return flash('Waktu selesai harus lebih akhir dari waktu mulai.')
    if (['Hot Work','Confined Space'].includes(item.type) && durationHours(item) > 24) return flash('Hot Work dan Confined Space dibatasi maksimum 1 x 24 jam sesuai SOP.')
    if (nextStatus !== 'Draft' && !checklistReady(item)) return flash('Checklist belum lengkap. Jawaban No memblokir pengajuan.')
    if (nextStatus === 'Submitted' && !item.applicantName.trim()) return flash('Nama Pemohon/Pimpinan Kerja wajib diisi sebelum Submit.')
    if (nextStatus === 'Submitted' && ['Draft','Rejected'].includes(form.status) && leadHours(item) < 48) return flash('Pengajuan izin kerja wajib dibuat minimal 2 hari sebelum pekerjaan dimulai sesuai SOP.')
    try {
      await dbUpsert('permits',[toDb(item)],'id')
      setPermits(prev => [item,...prev.filter(p => p.id !== item.id)])
      setForm(item)
      flash(`${item.id} tersimpan (${nextStatus}).`)
      if (nextStatus === 'Submitted') setModal(false)
    } catch (e) { flash(`Gagal menyimpan: ${e.message}`) }
  }

  async function setStatus(item,nextStatus) {
    if (nextStatus === 'Assistant Review' && !item.assistantReviewer) return flash('Isi nama Asisten Operasional melalui Buka/Edit terlebih dahulu.')
    if (nextStatus === 'HSE Review' && !item.ak3Reviewer) return flash('Isi nama Ahli K3 Umum melalui Buka/Edit terlebih dahulu.')
    if (nextStatus === 'Approved') {
      if (!item.approverName || !checklistReady(item)) return flash('Approval belum memenuhi otorisasi atau checklist.')
      if (item.type === 'Confined Space' && !gasOk(item.gasTest)) return flash('Confined Space belum memenuhi gate gas/temperatur SOP.')
    }
    if (nextStatus === 'Closed' && !(item.closure?.safe && item.closure?.date && item.closure?.time && item.closure?.ak3 && item.closure?.assistant)) return flash('Lengkapi pemeriksaan penutupan dan pernyataan aman melalui Buka/Edit.')
    try {
      await dbUpdate('permits',{id:`eq.${item.id}`},{status:nextStatus,closure:item.closure || {}})
      setPermits(prev => prev.map(p => p.id === item.id ? {...p,status:nextStatus} : p))
      flash(`${item.id} → ${nextStatus}`)
    } catch (e) { flash(e.message) }
  }

  function exportCSV() {
    const rows = [['ID','PT','Form','Type','Pekerjaan','Unit','Area','Start','End','Risk','Status'],...visible.map(p => [p.id,p.companyCode,p.formCode,p.type,p.title,p.unit,p.area,`${p.startDate} ${p.startTime}`,`${p.endDate} ${p.endTime}`,p.risk,p.status])]
    const csv = rows.map(r => r.map(v => `"${String(v || '').replaceAll('"','""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}))
    const a = document.createElement('a'); a.href = url; a.download = `SINSHE_Work_Permit_${today()}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  return <Shell title="Permit to Work" subtitle="Digitalisasi lima formulir izin kerja aktual KPN Plantations dan workflow approval lapangan.">
    {notice && <div className={styles.notice}><CheckCircle2 size={18}/>{notice}</div>}
    {error && <div className={styles.notice}><AlertTriangle size={18}/>{error}</div>}
    <CompanyScopeBar filters={filters} onChange={setFilters} onReset={() => setFilters(DEFAULT_COMPANY_FILTERS)}/>

    <div className="stats-grid four">
      <StatCard label="Permit Aktif" value={scoped.filter(p=>p.status==='Active').length} hint="pekerjaan berjalan" tone="green" icon={<ShieldCheck/>}/>
      <StatCard label="Menunggu Review" value={scoped.filter(p=>['Submitted','Assistant Review','HSE Review'].includes(p.status)).length} hint="workflow approval" tone="orange" icon={<Clock3/>}/>
      <StatCard label="High / Critical" value={scoped.filter(p=>['High','Critical'].includes(p.risk)&&p.status!=='Closed').length} hint="pengawasan prioritas" tone="red" icon={<Flame/>}/>
      <StatCard label="Closed" value={scoped.filter(p=>p.status==='Closed').length} hint={`${scoped.length} total permit`} tone="blue" icon={<FileCheck2/>}/>
    </div>

    <div className={styles.headerRow}>
      <div><h2>Work Permit Register</h2><p>Form KPNPLT-FORM-SST-008.01 s.d. 008.05. Pengajuan baru wajib minimal H-2 sebelum pekerjaan.</p></div>
      <div className={styles.buttons}><button className={styles.secondary} onClick={exportCSV}><Download size={17}/> Export CSV</button>{canManage && <button className={styles.primary} onClick={()=>openPermit(null)}><Plus size={18}/> Buat Permit</button>}</div>
    </div>

    <Panel>
      <div className={styles.filters}>
        <label className={styles.search}><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari ID, PT, form, pekerjaan, area, JSA..."/></label>
        <label><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All</option>{['Draft','Submitted','Assistant Review','HSE Review','Approved','Active','Suspended','Closed','Rejected'].map(v=><option key={v}>{v}</option>)}</select></label>
        <label><select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option>All</option>{WORK_PERMIT_TYPES.map(v=><option key={v}>{v}</option>)}</select></label>
      </div>
      <div className="table-wrap"><table><thead><tr><th>No PTW</th><th>PT / Form</th><th>Pekerjaan</th><th>Lokasi</th><th>Validitas</th><th>Risk</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
        {visible.map(p=><tr key={p.id}>
          <td><b>{p.id}</b><small className={styles.block}>{p.jsaNo || 'JSA: -'}</small></td>
          <td><b>{p.companyCode}</b><small className={styles.block}>{p.formCode}</small></td>
          <td className={styles.workCell}><b>{p.type}</b><small>{p.title}</small></td>
          <td><b>{p.unit}</b><small className={styles.block}>{p.area}</small></td>
          <td>{fmt(p.startDate)}<small className={styles.block}>{p.startTime}–{p.endTime}</small></td>
          <td><Badge tone={tone(p.risk)}>{p.risk}</Badge></td><td><Badge tone={tone(p.status)}>{p.status}</Badge></td>
          <td><div className={styles.rowActions}>
            <button onClick={()=>openPermit(p)}><Eye size={14}/> Buka</button>
            {canManage && p.status==='Submitted' && <button onClick={()=>setStatus(p,'Assistant Review')}>Asst Review</button>}
            {canManage && p.status==='Assistant Review' && <button onClick={()=>setStatus(p,'HSE Review')}>HSE Review</button>}
            {canManage && p.status==='HSE Review' && <button onClick={()=>setStatus(p,'Approved')}>Approve</button>}
            {canManage && p.status==='Approved' && <button onClick={()=>setStatus(p,'Active')}>Start</button>}
            {canManage && p.status==='Active' && <button onClick={()=>setStatus(p,'Suspended')}>Suspend</button>}
            {canManage && p.status==='Suspended' && <button onClick={()=>setStatus(p,'Active')}>Resume</button>}
            {canManage && ['Active','Suspended'].includes(p.status) && <button onClick={()=>setStatus(p,'Closed')}>Close</button>}
          </div></td>
        </tr>)}
        {!visible.length && <tr><td colSpan="8" className={styles.empty}>{loading ? 'Memuat data...' : 'Belum ada Work Permit aktual sesuai filter.'}</td></tr>}
      </tbody></table></div>
    </Panel>

    {modal && <div className={styles.backdrop} onMouseDown={e=>e.target===e.currentTarget&&setModal(false)}><div className={styles.modal}>
      <div className={styles.modalHead}><div><span>{cfg.code}</span><h2>{cfg.label}</h2><p>Checklist, peralatan dan APD mengikuti formulir aktual.</p></div><button type="button" onClick={()=>setModal(false)}><X/></button></div>
      <form onSubmit={e=>{e.preventDefault();savePermit(form.status==='Draft'?'Draft':form.status)}}>
        <div className={styles.formGrid}>
          <label>Company/PT<select value={form.companyCode} onChange={e=>setForm({...form,companyCode:e.target.value})}>{filteredCompanies(DEFAULT_COMPANY_FILTERS).map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
          <label>Jenis Permit<select value={form.type} onChange={e=>changeType(e.target.value)}>{WORK_PERMIT_TYPES.map(v=><option key={v}>{v}</option>)}</select></label>
          <label className={styles.span2}>Jenis/Judul Pekerjaan<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
          <label>Unit/Departemen<input value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}/></label><label>Lokasi<input value={form.area} onChange={e=>setForm({...form,area:e.target.value})}/></label>
          <label>Pemohon<input value={form.requester} onChange={e=>setForm({...form,requester:e.target.value})}/></label><label>Pimpinan Kerja/Supervisor<input value={form.supervisor} onChange={e=>setForm({...form,supervisor:e.target.value})}/></label>
          <label>Kontraktor/Pelaksana<input value={form.contractor} onChange={e=>setForm({...form,contractor:e.target.value})}/></label><label>JSA No.<input value={form.jsaNo} onChange={e=>setForm({...form,jsaNo:e.target.value})}/></label>
          <label>Tanggal Mulai<input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></label><label>Jam Mulai<input type="time" value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})}/></label>
          <label>Tanggal Selesai<input type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></label><label>Jam Selesai<input type="time" value={form.endTime} onChange={e=>setForm({...form,endTime:e.target.value})}/></label>
          <label>Risk<select value={form.risk} onChange={e=>setForm({...form,risk:e.target.value})}>{['Low','Medium','High','Critical'].map(v=><option key={v}>{v}</option>)}</select></label>
          <label className={styles.span2}>Uraian Pekerjaan<textarea rows="3" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
          <label className={styles.span2}>Daftar Pekerja (1 nama per baris)<textarea rows="4" value={(form.workers||[]).join('\n')} onChange={e=>setForm({...form,workers:e.target.value.split('\n')})}/></label>
        </div>

        <div className={styles.controlSection}><div className={styles.controlTitle}><b>Checklist Pemeriksaan Keselamatan</b><span>{form.checklist.filter(r=>r.answer).length}/{form.checklist.length} terjawab</span></div><div style={{display:'grid',gap:8}}>
          {form.checklist.map((row,index)=><div key={row.no} style={{display:'grid',gridTemplateColumns:'32px minmax(220px,1fr) 100px minmax(140px,180px)',gap:8,alignItems:'center',background:'#fff',border:'1px solid #e3e7e5',borderRadius:9,padding:8}}>
            <b>{row.no}</b><span style={{fontSize:10}}>{row.label}</span>
            <select value={row.answer} onChange={e=>setForm({...form,checklist:form.checklist.map((r,i)=>i===index?{...r,answer:e.target.value}:r)})}><option value="">Pilih</option><option>Yes</option><option>No</option>{cfg.allowNA&&<option>N/A</option>}</select>
            <input value={row.remarks||''} onChange={e=>setForm({...form,checklist:form.checklist.map((r,i)=>i===index?{...r,remarks:e.target.value}:r)})} placeholder="Keterangan"/>
          </div>)}
        </div></div>

        {form.type==='Confined Space' && <div className={styles.controlSection}><div className={styles.controlTitle}><b>Gas & Temperature</b><span>{gasOk(form.gasTest)?'Memenuhi gate SOP':'Belum memenuhi'}</span></div><div className={styles.formGrid}>
          {[['lel','Flammable Gas % LEL'],['co','CO ppm'],['oxygen','Oxygen %'],['h2s','H2S ppm'],['temperature','Temperature °C']].map(([key,label])=><label key={key}>{label}<input type="number" step="0.1" value={form.gasTest?.[key]||''} onChange={e=>setForm({...form,gasTest:{...form.gasTest,[key]:e.target.value}})}/></label>)}
        </div><p style={{fontSize:10,color:'#7b858f'}}>Form mencantumkan maksimum 5% LEL; SOP menyatakan dilarang masuk jika di atas 2% LEL. Gate approval memakai ≤2% LEL, O₂ 19,5–23%, CO ≤30 ppm, H₂S ≤10 ppm, suhu ≤35°C.</p></div>}

        <div className={styles.controlSection}><div className={styles.controlTitle}><b>Peralatan Kerja & APD</b></div><div className={styles.controlGrid}>
          {[...cfg.equipment.map(v=>['equipment',v]),...cfg.ppe.map(v=>['ppe',v])].map(([kind,name])=><label key={`${kind}-${name}`} className={form[kind]?.[name]?styles.controlChecked:''}><input type="checkbox" checked={Boolean(form[kind]?.[name])} onChange={()=>setForm({...form,[kind]:{...form[kind],[name]:!form[kind]?.[name]}})}/><span>{name}<em>{kind==='equipment'?'Peralatan':'APD/Pengaman'}</em></span></label>)}
        </div></div>

        <div className={styles.formGrid}>
          <label className={styles.span2}>Kondisi Lingkungan Area Kerja<textarea rows="3" value={form.environmentNotes} onChange={e=>setForm({...form,environmentNotes:e.target.value})}/></label>
          <label>Dibuat Oleh — Pemohon/Pimpinan Kerja<input value={form.applicantName} onChange={e=>setForm({...form,applicantName:e.target.value})}/></label>
          <label>Diperiksa — Asisten Operasional<input value={form.assistantReviewer} onChange={e=>setForm({...form,assistantReviewer:e.target.value})}/></label>
          <label>Diperiksa — Ahli K3 Umum<input value={form.ak3Reviewer} onChange={e=>setForm({...form,ak3Reviewer:e.target.value})}/></label>
          <label>Disetujui — Manajer/Kepala Dept.<input value={form.approverName} onChange={e=>setForm({...form,approverName:e.target.value})}/></label>
          {['Approved','Active','Suspended','Closed'].includes(form.status) && <>
            <label>Tanggal Selesai<input type="date" value={form.closure?.date||''} onChange={e=>setForm({...form,closure:{...form.closure,date:e.target.value}})}/></label><label>Jam Selesai<input type="time" value={form.closure?.time||''} onChange={e=>setForm({...form,closure:{...form.closure,time:e.target.value}})}/></label>
            <label>Pemeriksa Ahli K3 Umum<input value={form.closure?.ak3||''} onChange={e=>setForm({...form,closure:{...form.closure,ak3:e.target.value}})}/></label><label>Pemeriksa Asisten Operasional<input value={form.closure?.assistant||''} onChange={e=>setForm({...form,closure:{...form.closure,assistant:e.target.value}})}/></label>
            <label className={styles.span2}><span><input type="checkbox" checked={Boolean(form.closure?.safe)} onChange={e=>setForm({...form,closure:{...form.closure,safe:e.target.checked}})}/> Telah diperiksa dan dinyatakan aman setelah pekerjaan selesai</span></label>
          </>}
        </div>

        <div className={styles.modalFoot}><button type="button" className={styles.secondary} onClick={()=>setModal(false)}>Batal</button>{canManage && <><button type="submit" className={styles.secondary}>{form.status==='Draft'?'Simpan Draft':'Simpan Perubahan'}</button>{['Draft','Rejected'].includes(form.status)&&<button type="button" className={styles.primary} onClick={()=>savePermit('Submitted')}><ClipboardCheck size={16}/> Submit</button>}</>}</div>
      </form>
    </div></div>}
  </Shell>
}
