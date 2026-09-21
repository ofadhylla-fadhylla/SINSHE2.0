'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge, Panel, StatCard } from '../../components/Ui'
import {
  AlertTriangle, CheckCircle2, ClipboardCheck, Download, FileWarning, Plus,
  Search, ShieldCheck, UserCheck
} from 'lucide-react'
import { COMPANY_MASTER, DEFAULT_COMPANY_FILTERS, companyCodeOf, filteredCompanies } from '../../lib/company-master'
import { dbSelect, dbUpsert, dbUpdate, getStoredProfile, isSupabaseConfigured } from '../../lib/supabase-rest'
import styles from './safety-violation.module.css'

const today = () => new Date().toISOString().slice(0, 10)
const addMonths = (value, months) => {
  if (!value) return ''
  const d = new Date(`${value}T00:00:00`)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}
const fmt = value => value ? new Intl.DateTimeFormat('id-ID', { day:'2-digit', month:'short', year:'numeric' }).format(new Date(`${String(value).slice(0,10)}T00:00:00`)) : '-'
const dueDays = value => value ? Math.ceil((new Date(`${value}T23:59:59`) - new Date()) / 86400000) : null
const tone = value => {
  if (['Closed','Acknowledged'].includes(value)) return 'green'
  if (['Issued','Follow-up','ST','SP I','SP II','SP III'].includes(value)) return 'orange'
  if (['Cancelled','Draft','None'].includes(value)) return 'gray'
  return 'red'
}
const disciplinaryOptions = ['None','ST','SP I','SP II','SP III','Demotion','Termination']
const statuses = ['Draft','Issued','Acknowledged','Follow-up','Closed','Cancelled']

const emptyForm = {
  companyCode:'ACP', unit:'Estate', location:'', incidentDate:today(), issuedDate:'',
  employeeName:'', nik:'', department:'', position:'',
  sourceType:'Inspection', sourceRecordId:'', sourceReference:'',
  violationType:'', violationDescription:'', warningGiven:'', targetImprovement:'',
  improvementDueDate:'', directSuperior:'', higherSuperior:'', hcoPgaReviewer:'',
  evidenceRef:'', status:'Draft', disciplinaryAction:'None', disciplinaryIssuedDate:'',
  followupResult:'', closureEvidence:'', notes:''
}

function fromDb(r) {
  return {
    id:r.id, companyCode:r.company_code||'', unit:r.unit||'', location:r.location||'',
    incidentDate:r.incident_date||'', issuedDate:r.issued_date||'',
    employeeName:r.employee_name||'', nik:r.nik||'', department:r.department||'', position:r.position||'',
    sourceType:r.source_type||'Inspection', sourceRecordId:r.source_record_id||'', sourceReference:r.source_reference||'',
    violationType:r.violation_type||'', violationDescription:r.violation_description||'',
    warningGiven:r.warning_given||'', targetImprovement:r.target_improvement||'',
    improvementDueDate:r.improvement_due_date||'', directSuperior:r.direct_superior||'',
    higherSuperior:r.higher_superior||'', hcoPgaReviewer:r.hco_pga_reviewer||'',
    evidenceRef:r.evidence_ref||'', status:r.status||'Draft',
    employeeAcknowledged:Boolean(r.employee_acknowledged), employeeAcknowledgedAt:r.employee_acknowledged_at||'',
    disciplinaryAction:r.disciplinary_action||'None', disciplinaryIssuedDate:r.disciplinary_issued_date||'',
    disciplinaryValidUntil:r.disciplinary_valid_until||'', followupResult:r.followup_result||'',
    closureEvidence:r.closure_evidence||'', closedAt:r.closed_at||'', notes:r.notes||''
  }
}

function toDb(row) {
  const discipline = row.disciplinaryAction && row.disciplinaryAction !== 'None' ? row.disciplinaryAction : null
  const stsp = ['ST','SP I','SP II','SP III'].includes(discipline)
  const issued = row.disciplinaryIssuedDate || null
  return {
    id:row.id,
    company_code:row.companyCode,
    unit:row.unit,
    location:row.location||null,
    incident_date:row.incidentDate,
    issued_date:row.issuedDate||null,
    employee_name:row.employeeName,
    nik:row.nik||null,
    department:row.department||null,
    position:row.position||null,
    source_type:row.sourceType||'Inspection',
    source_record_id:row.sourceRecordId||null,
    source_reference:row.sourceReference||null,
    violation_type:row.violationType,
    violation_description:row.violationDescription,
    warning_given:row.warningGiven||null,
    target_improvement:row.targetImprovement||null,
    improvement_due_date:row.improvementDueDate||null,
    direct_superior:row.directSuperior||null,
    higher_superior:row.higherSuperior||null,
    hco_pga_reviewer:row.hcoPgaReviewer||null,
    evidence_ref:row.evidenceRef||null,
    status:row.status||'Draft',
    employee_acknowledged:Boolean(row.employeeAcknowledged),
    employee_acknowledged_at:row.employeeAcknowledgedAt||null,
    disciplinary_action:discipline,
    disciplinary_issued_date:issued,
    disciplinary_valid_until:stsp && issued ? addMonths(issued,6) : null,
    followup_result:row.followupResult||null,
    closure_evidence:row.closureEvidence||null,
    closed_at:row.closedAt||null,
    notes:row.notes||null
  }
}

export default function SafetyViolationManagement() {
  const [filters,setFilters] = useState(DEFAULT_COMPANY_FILTERS)
  const [rows,setRows] = useState([])
  const [form,setForm] = useState(emptyForm)
  const [search,setSearch] = useState('')
  const [statusFilter,setStatusFilter] = useState('All')
  const [disciplineFilter,setDisciplineFilter] = useState('All')
  const [notice,setNotice] = useState('')
  const [error,setError] = useState('')
  const [loading,setLoading] = useState(true)
  const [showForm,setShowForm] = useState(false)
  const profile = getStoredProfile()
  const canManage = !profile || profile.role !== 'Viewer'

  useEffect(() => {
    let alive = true
    async function load() {
      if (!isSupabaseConfigured()) { setError('Supabase belum dikonfigurasi.'); setLoading(false); return }
      try {
        const data = await dbSelect('safety_violation_tickets','select=*&order=incident_date.desc,updated_at.desc')
        if (alive) setRows((data||[]).map(fromDb))
      } catch (e) {
        if (alive) setError(e?.message || 'Gagal mengambil Safety Violation Ticket.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  const companies = useMemo(() => filteredCompanies(filters),[filters])
  const allowed = useMemo(() => new Set(companies.map(c=>c.code)),[companies])
  const scoped = useMemo(() => rows.filter(row => {
    const code = companyCodeOf(row)
    return code ? allowed.has(code) : true
  }),[rows,allowed])
  const q = search.trim().toLowerCase()
  const filtered = useMemo(() => scoped.filter(row => {
    const matchQ = !q || [
      row.id,row.companyCode,row.employeeName,row.nik,row.department,row.unit,row.location,
      row.violationType,row.violationDescription,row.sourceRecordId,row.directSuperior
    ].join(' ').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All' || row.status === statusFilter
    const matchDiscipline = disciplineFilter === 'All' || (disciplineFilter === 'None' ? !row.disciplinaryAction || row.disciplinaryAction === 'None' : row.disciplinaryAction === disciplineFilter)
    return matchQ && matchStatus && matchDiscipline
  }),[scoped,q,statusFilter,disciplineFilter])

  const active = scoped.filter(r => !['Closed','Cancelled'].includes(r.status)).length
  const due = scoped.filter(r => {
    const d = dueDays(r.improvementDueDate)
    return !['Closed','Cancelled'].includes(r.status) && d !== null && d <= 7
  }).length
  const acknowledged = scoped.filter(r => r.employeeAcknowledged).length
  const disciplinary = scoped.filter(r => r.disciplinaryAction && r.disciplinaryAction !== 'None').length

  function flash(message) {
    setNotice(message)
    window.setTimeout(()=>setNotice(''),3500)
  }
  function update(field,value) { setForm(prev=>({...prev,[field]:value})) }

  function validate(nextStatus) {
    if (!form.companyCode || !form.unit.trim() || !form.employeeName.trim() || !form.incidentDate || !form.violationType.trim() || !form.violationDescription.trim()) {
      flash('PT, unit, nama karyawan, tanggal kejadian, jenis dan uraian pelanggaran wajib diisi.')
      return false
    }
    if (nextStatus !== 'Draft' && (!form.warningGiven.trim() || !form.targetImprovement.trim())) {
      flash('Sebelum diterbitkan, peringatan yang diberikan dan sasaran perbaikan wajib diisi.')
      return false
    }
    return true
  }

  async function save(e,nextStatus='Draft') {
    e.preventDefault()
    if (!canManage || !validate(nextStatus)) return
    const id = form.id || `SVT-${form.companyCode}-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
    const issuedDate = nextStatus === 'Issued' ? (form.issuedDate || today()) : form.issuedDate
    const row = {...form,id,status:nextStatus,issuedDate}
    try {
      await dbUpsert('safety_violation_tickets',[toDb(row)],'id')
      setRows(prev=>[row,...prev.filter(x=>x.id!==id)])
      setForm({...emptyForm,companyCode:form.companyCode,unit:form.unit})
      setShowForm(false)
      flash(nextStatus === 'Draft' ? `${id} disimpan sebagai Draft.` : `${id} berhasil diterbitkan.`)
    } catch (err) {
      flash(`Gagal menyimpan: ${err.message}`)
    }
  }

  async function transition(row,nextStatus) {
    if (!canManage) return
    const patch = {status:nextStatus}
    if (nextStatus === 'Acknowledged') {
      patch.employee_acknowledged = true
      patch.employee_acknowledged_at = new Date().toISOString()
    }
    if (nextStatus === 'Closed') {
      if (!row.followupResult && !row.closureEvidence) {
        const followup = window.prompt('Ringkasan hasil tindak lanjut / perbaikan:')
        if (!followup) return
        const evidence = window.prompt('Referensi bukti penutupan (link/path/no. dokumen):') || ''
        patch.followup_result = followup
        patch.closure_evidence = evidence || null
      }
      patch.closed_at = new Date().toISOString()
    }
    try {
      const updated = await dbUpdate('safety_violation_tickets',{id:`eq.${row.id}`},patch)
      const next = Array.isArray(updated) && updated[0] ? fromDb(updated[0]) : {...row,status:nextStatus}
      setRows(prev=>prev.map(x=>x.id===row.id?next:x))
      flash(`${row.id} → ${nextStatus}.`)
    } catch (err) {
      flash(`Update gagal: ${err.message}`)
    }
  }

  function editRow(row) {
    setForm({...emptyForm,...row})
    setShowForm(true)
    window.scrollTo({top:0,behavior:'smooth'})
  }

  function exportCsv() {
    const header = ['Ticket','PT','Unit','Lokasi','Tanggal Kejadian','Tanggal Terbit','Nama','NIK','Departemen','Jenis Pelanggaran','Uraian','Sumber','Source ID','Peringatan','Sasaran Perbaikan','Due Date','Atasan Langsung','Atasan Lebih Tinggi','HCO/PGA','Status','Acknowledged','Tindakan Disiplin','Tanggal ST/SP','Berlaku Sampai','Hasil Follow-up','Evidence']
    const data = filtered.map(r=>[
      r.id,r.companyCode,r.unit,r.location,r.incidentDate,r.issuedDate,r.employeeName,r.nik,r.department,
      r.violationType,r.violationDescription,r.sourceType,r.sourceRecordId,r.warningGiven,r.targetImprovement,
      r.improvementDueDate,r.directSuperior,r.higherSuperior,r.hcoPgaReviewer,r.status,r.employeeAcknowledged?'Yes':'No',
      r.disciplinaryAction||'',r.disciplinaryIssuedDate,r.disciplinaryValidUntil,r.followupResult,r.evidenceRef||r.closureEvidence
    ])
    const csv = [header,...data].map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
    const a = document.createElement('a'); a.href=url; a.download=`SINSHE_Safety_Violation_${today()}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  return <Shell title="Safety Violation Ticket" subtitle="Register pelanggaran K3L dari hasil inspeksi, penerbitan tiket, acknowledgment karyawan, tindak lanjut dan referensi proses ST/SP.">
    {notice && <div className={styles.notice}><CheckCircle2 size={17}/>{notice}</div>}
    {error && <div className={styles.error}><AlertTriangle size={17}/>{error}</div>}

    <CompanyScopeBar filters={filters} onChange={setFilters} onReset={()=>setFilters(DEFAULT_COMPANY_FILTERS)}/>

    <div className="stats-grid four">
      <StatCard label="Total Ticket" value={scoped.length} hint="sesuai filter PT" tone="blue" icon={<FileWarning/>}/>
      <StatCard label="Ticket Aktif" value={active} hint="belum Closed / Cancelled" tone="red" icon={<AlertTriangle/>}/>
      <StatCard label="Due ≤ 7 Hari" value={due} hint="sasaran perbaikan" tone="orange" icon={<ClipboardCheck/>}/>
      <StatCard label="Acknowledged" value={acknowledged} hint={`${disciplinary} memiliki referensi tindakan disiplin`} tone="green" icon={<UserCheck/>}/>
    </div>

    <div className={styles.actionBar}>
      <div>
        <h2>Safety Violation Register</h2>
        <p>Hasil inspeksi menjadi dasar ticket, lalu ticket dan dokumentasi tindak lanjut disimpan sebagai evidence.</p>
      </div>
      <div className={styles.actions}>
        <button className={styles.secondary} onClick={exportCsv}><Download size={16}/> Export CSV</button>
        {canManage && <button className={styles.primary} onClick={()=>{setForm(emptyForm);setShowForm(v=>!v)}}><Plus size={17}/> Ticket Baru</button>}
      </div>
    </div>

    {showForm && canManage && <Panel title={form.id ? `Edit ${form.id}` : 'Form Safety Violation Ticket'}>
      <form className={styles.form} onSubmit={e=>save(e,'Draft')}>
        <div className={styles.formGrid}>
          <label><span>Company / PT *</span><select value={form.companyCode} onChange={e=>update('companyCode',e.target.value)}>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
          <label><span>Unit *</span><input value={form.unit} onChange={e=>update('unit',e.target.value)} placeholder="Estate / Mill / Workshop / ..." /></label>
          <label><span>Lokasi</span><input value={form.location} onChange={e=>update('location',e.target.value)} placeholder="Lokasi kejadian" /></label>
          <label><span>Tanggal Kejadian *</span><input type="date" value={form.incidentDate} onChange={e=>update('incidentDate',e.target.value)}/></label>

          <label><span>Nama Karyawan *</span><input value={form.employeeName} onChange={e=>update('employeeName',e.target.value)} /></label>
          <label><span>NIK</span><input value={form.nik} onChange={e=>update('nik',e.target.value)} /></label>
          <label><span>Departemen</span><input value={form.department} onChange={e=>update('department',e.target.value)} /></label>
          <label><span>Jabatan</span><input value={form.position} onChange={e=>update('position',e.target.value)} /></label>

          <label><span>Sumber Temuan</span><select value={form.sourceType} onChange={e=>update('sourceType',e.target.value)}><option>Inspection</option><option>Safety Observation</option><option>Supervisor Report</option><option>Other</option></select></label>
          <label><span>Source Record ID</span><input value={form.sourceRecordId} onChange={e=>update('sourceRecordId',e.target.value)} placeholder="INS-... / OBS-..." /></label>
          <label className={styles.span2}><span>Referensi Hasil Inspeksi / Dokumen</span><input value={form.sourceReference} onChange={e=>update('sourceReference',e.target.value)} placeholder="Nomor dokumen, link, atau path evidence" /></label>

          <label><span>Jenis Pelanggaran *</span><input value={form.violationType} onChange={e=>update('violationType',e.target.value)} placeholder="Contoh: Ketidakpatuhan APD" /></label>
          <label className={styles.span3}><span>Uraian Pelanggaran *</span><textarea value={form.violationDescription} onChange={e=>update('violationDescription',e.target.value)} rows="3" /></label>

          <label className={styles.span2}><span>Peringatan yang Diberikan</span><textarea value={form.warningGiven} onChange={e=>update('warningGiven',e.target.value)} rows="2" /></label>
          <label className={styles.span2}><span>Sasaran Perbaikan</span><textarea value={form.targetImprovement} onChange={e=>update('targetImprovement',e.target.value)} rows="2" /></label>

          <label><span>Batas Waktu Perbaikan</span><input type="date" value={form.improvementDueDate} onChange={e=>update('improvementDueDate',e.target.value)}/></label>
          <label><span>Atasan Langsung</span><input value={form.directSuperior} onChange={e=>update('directSuperior',e.target.value)} /></label>
          <label><span>Atasan Lebih Tinggi</span><input value={form.higherSuperior} onChange={e=>update('higherSuperior',e.target.value)} /></label>
          <label><span>HCO Wilayah / PGA HO</span><input value={form.hcoPgaReviewer} onChange={e=>update('hcoPgaReviewer',e.target.value)} /></label>

          <label><span>Tindakan Disiplin / Disposisi HC</span><select value={form.disciplinaryAction} onChange={e=>update('disciplinaryAction',e.target.value)}>{disciplinaryOptions.map(v=><option key={v}>{v}</option>)}</select></label>
          <label><span>Tanggal Terbit ST/SP</span><input type="date" value={form.disciplinaryIssuedDate} onChange={e=>update('disciplinaryIssuedDate',e.target.value)} disabled={!['ST','SP I','SP II','SP III'].includes(form.disciplinaryAction)}/></label>
          <label className={styles.span2}><span>Evidence / Dokumentasi Pelanggaran</span><input value={form.evidenceRef} onChange={e=>update('evidenceRef',e.target.value)} placeholder="Link/path/no. dokumen evidence" /></label>

          <label className={styles.span4}><span>Catatan</span><textarea value={form.notes} onChange={e=>update('notes',e.target.value)} rows="2" /></label>
        </div>

        {['ST','SP I','SP II','SP III'].includes(form.disciplinaryAction) && form.disciplinaryIssuedDate && <div className={styles.ruleNote}>
          Masa berlaku ST/SP dihitung 6 bulan dari tanggal terbit: <b>{fmt(addMonths(form.disciplinaryIssuedDate,6))}</b>.
        </div>}

        <div className={styles.formActions}>
          <button type="button" className={styles.ghost} onClick={()=>setShowForm(false)}>Batal</button>
          <button type="submit" className={styles.secondary}>Simpan Draft</button>
          <button type="button" className={styles.primary} onClick={e=>save(e,'Issued')}><ShieldCheck size={16}/> Terbitkan Ticket</button>
        </div>
      </form>
    </Panel>}

    <Panel className={styles.register}>
      <div className={styles.filters}>
        <label className={styles.search}><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari ticket, karyawan, NIK, pelanggaran, lokasi..." /></label>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All</option>{statuses.map(v=><option key={v}>{v}</option>)}</select>
        <select value={disciplineFilter} onChange={e=>setDisciplineFilter(e.target.value)}><option>All</option>{disciplinaryOptions.map(v=><option key={v}>{v}</option>)}</select>
      </div>

      <div className="table-wrap"><table>
        <thead><tr><th>Ticket</th><th>Karyawan</th><th>PT / Lokasi</th><th>Kejadian</th><th>Pelanggaran</th><th>Sumber</th><th>Target Perbaikan</th><th>Disiplin</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>
          {filtered.map(row=>{
            const d=dueDays(row.improvementDueDate)
            return <tr key={row.id}>
              <td><b>{row.id}</b><small className={styles.block}>{row.issuedDate?`Terbit ${fmt(row.issuedDate)}`:'Belum diterbitkan'}</small></td>
              <td><b>{row.employeeName}</b><small className={styles.block}>{[row.nik,row.department,row.position].filter(Boolean).join(' • ')||'-'}</small></td>
              <td><b>{row.companyCode}</b><small className={styles.block}>{row.unit}{row.location?` • ${row.location}`:''}</small></td>
              <td>{fmt(row.incidentDate)}</td>
              <td><b>{row.violationType}</b><small className={styles.block}>{row.violationDescription}</small></td>
              <td>{row.sourceType}<small className={styles.block}>{row.sourceRecordId||row.sourceReference||'-'}</small></td>
              <td>{row.improvementDueDate?fmt(row.improvementDueDate):'-'}{d!==null&&!['Closed','Cancelled'].includes(row.status)&&<small className={`${styles.block} ${d<0?styles.late:d<=7?styles.due:''}`}>{d<0?`${Math.abs(d)} hari terlambat`:d===0?'Jatuh tempo hari ini':`${d} hari lagi`}</small>}</td>
              <td><Badge tone={tone(row.disciplinaryAction||'None')}>{row.disciplinaryAction||'None'}</Badge>{row.disciplinaryValidUntil&&<small className={styles.block}>s.d. {fmt(row.disciplinaryValidUntil)}</small>}</td>
              <td><Badge tone={tone(row.status)}>{row.status}</Badge>{row.employeeAcknowledged&&<small className={styles.block}>✓ acknowledged</small>}</td>
              <td><div className={styles.rowActions}>
                {canManage && <button onClick={()=>editRow(row)}>Edit</button>}
                {canManage && row.status==='Issued' && <button onClick={()=>transition(row,'Acknowledged')}>Acknowledge</button>}
                {canManage && ['Acknowledged','Issued'].includes(row.status) && <button onClick={()=>transition(row,'Follow-up')}>Follow-up</button>}
                {canManage && row.status==='Follow-up' && <button onClick={()=>transition(row,'Closed')}>Close</button>}
              </div></td>
            </tr>
          })}
          {!loading && !filtered.length && <tr><td colSpan="10" className={styles.empty}>Belum ada Safety Violation Ticket pada scope ini.</td></tr>}
          {loading && <tr><td colSpan="10" className={styles.empty}>Memuat data…</td></tr>}
        </tbody>
      </table></div>
    </Panel>

    <div className={styles.sourceGrid}>
      <Panel title="Dasar Dokumentasi Safety Violation">
        <div className={styles.sourceList}>
          <div><b>1. Hasil inspeksi sebagai dasar</b><span>Ticket menyimpan Source Record ID / referensi inspeksi agar asal temuan dapat ditelusuri.</span></div>
          <div><b>2. Ticket yang diterbitkan</b><span>Status Draft → Issued → Acknowledged → Follow-up → Closed digunakan untuk tracking operasional di SINSHE.</span></div>
          <div><b>3. Dokumentasi pelanggaran & tindak lanjut</b><span>Evidence reference dan closure evidence disimpan bersama ticket.</span></div>
        </div>
      </Panel>
      <Panel title="Referensi ST / SP">
        <div className={styles.sourceList}>
          <div><b>Form pengajuan ST/SP</b><span>Mencatat jenis pelanggaran, tanggal kejadian, peringatan dan sasaran perbaikan sebelum proses persetujuan.</span></div>
          <div><b>Verifikasi HCO / PGA</b><span>Disposisi tindakan disiplin dicatat sebagai hasil proses HC, bukan ditentukan otomatis oleh SINSHE.</span></div>
          <div><b>Masa berlaku</b><span>Jika tindakan adalah ST atau SP I–III, sistem menampilkan periode 6 bulan dari tanggal terbit.</span></div>
        </div>
      </Panel>
    </div>
  </Shell>
}
