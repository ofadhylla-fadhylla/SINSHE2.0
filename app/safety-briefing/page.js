'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge, Panel, Progress, StatCard } from '../../components/Ui'
import {
  CheckCircle2, ClipboardCheck, Clock3, Copy, Download, GraduationCap,
  PlayCircle, Plus, QrCode, Search, ShieldCheck, UserCheck, Users, X
} from 'lucide-react'
import { COMPANY_MASTER, DEFAULT_COMPANY_FILTERS, companyCodeOf, filteredCompanies } from '../../lib/company-master'
import { dbSelect, dbUpsert, isSupabaseConfigured } from '../../lib/supabase-rest'
import styles from './safety-briefing.module.css'

const SESSION_KEY = 'sinshe-safety-sessions'
const ATTENDANCE_KEY = 'sinshe-safety-attendance'
const LEARNING_KEY = 'sinshe-learning-records'
const sessionTypes = ['Safety Briefing', 'Safety Induction']
const statuses = ['Scheduled', 'In Progress', 'Completed', 'Cancelled']
const units = ['Head Office','PKS A','PKS B','PKS C','Estate 1','Estate 2','Estate 3','Laboratorium']

const today = () => new Date().toISOString().slice(0, 10)
const nowTime = () => new Date().toTimeString().slice(0, 5)
const emptySession = () => ({
  companyCode:'ACP', type:'Safety Briefing', title:'', date:today(), startTime:'08:00', endTime:'', unit:'PKS A',
  location:'', facilitator:'', topic:'', materialRef:'', status:'Scheduled', quizRequired:false, passingScore:70,
  acknowledgementRequired:true, plannedParticipants:0,
})
const emptyParticipant = { employeeName:'', employeeId:'', unit:'PKS A', notes:'' }

function safeRead(key){ try{ const raw=localStorage.getItem(key); const rows=raw?JSON.parse(raw):[]; return Array.isArray(rows)?rows:[] }catch{return[]} }
function safeWrite(key,rows){ try{ localStorage.setItem(key,JSON.stringify(rows)); window.dispatchEvent(new CustomEvent('sinshe-central-data',{detail:{key,count:rows.length}})) }catch{} }
function mergeById(local,central){ const map=new Map(); (local||[]).forEach(r=>r?.id&&map.set(r.id,r)); (central||[]).forEach(r=>r?.id&&map.set(r.id,r)); return [...map.values()] }
function upsert(rows,item){ const i=rows.findIndex(r=>r.id===item.id); return i<0?[item,...rows]:rows.map(r=>r.id===item.id?item:r) }
function fmt(value){ return value?new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${value}T00:00:00`)):'-' }
function statusTone(value){ return value==='Completed'?'green':value==='In Progress'?'blue':value==='Cancelled'?'red':'orange' }
function typeTone(value){ return value==='Safety Induction'?'purple':'green' }
function cleanTime(value){ return value?String(value).slice(0,5):'' }

function sessionFromDb(r){ return {
  id:r.id, companyCode:r.company_code||'', type:r.session_type, title:r.title, date:r.session_date,
  startTime:cleanTime(r.start_time), endTime:cleanTime(r.end_time), unit:r.unit, location:r.location||'', facilitator:r.facilitator||'',
  topic:r.topic||'', materialRef:r.material_ref||'', status:r.status||'Scheduled', quizRequired:r.quiz_required===true,
  passingScore:Number(r.passing_score||70), acknowledgementRequired:r.acknowledgement_required!==false,
  qrToken:r.qr_token||'', plannedParticipants:Number(r.planned_participants||0),
} }
function sessionToDb(s){ return {
  id:s.id, company_code:s.companyCode, session_type:s.type, title:s.title, session_date:s.date,
  start_time:s.startTime||null, end_time:s.endTime||null, unit:s.unit, location:s.location||'', facilitator:s.facilitator||'',
  topic:s.topic||null, material_ref:s.materialRef||null, status:s.status||'Scheduled', quiz_required:s.quizRequired===true,
  passing_score:Number(s.passingScore||70), acknowledgement_required:s.acknowledgementRequired!==false,
  qr_token:s.qrToken||null, planned_participants:Math.max(0,Number(s.plannedParticipants||0)),
} }
function attendanceFromDb(r){ return {
  id:r.id, sessionId:r.session_id, companyCode:r.company_code||'', employeeName:r.employee_name||'', employeeId:r.employee_id||'',
  unit:r.unit||'', attendanceStatus:r.attendance_status||'Absent', checkInAt:r.check_in_at||'', quizScore:r.quiz_score===null?null:Number(r.quiz_score),
  acknowledgement:r.acknowledgement===true, notes:r.notes||'',
} }
function attendanceToDb(a){ return {
  id:a.id, session_id:a.sessionId, company_code:a.companyCode, employee_name:a.employeeName, employee_id:a.employeeId||null,
  unit:a.unit, attendance_status:a.attendanceStatus||'Absent', check_in_at:a.checkInAt||null,
  quiz_score:a.quizScore===''||a.quizScore===null||a.quizScore===undefined?null:Number(a.quizScore), acknowledgement:a.acknowledgement===true,
  notes:a.notes||null,
} }
function learningToDb(r){ return {
  id:r.id, company_code:r.companyCode, employee_name:r.employeeName, employee_id:r.employeeId||null, unit:r.unit,
  training_name:r.trainingName, category:r.category, training_date:r.trainingDate||null, valid_until:r.validUntil||null,
  status:r.status||'Valid', competency:r.competency||null, provider:r.provider||null, certificate_no:r.certificateNo||null,
  mandatory:r.mandatory!==false,
} }
function attendeeReady(session,a){
  if(a.attendanceStatus!=='Present') return false
  if(session.acknowledgementRequired&&!a.acknowledgement) return false
  if(session.quizRequired&&(a.quizScore===null||a.quizScore===''||Number(a.quizScore)<Number(session.passingScore||70))) return false
  return true
}

export default function SafetyBriefing(){
  const [sessions,setSessions]=useState([])
  const [attendance,setAttendance]=useState([])
  const [filters,setFilters]=useState(DEFAULT_COMPANY_FILTERS)
  const [search,setSearch]=useState('')
  const [typeFilter,setTypeFilter]=useState('All')
  const [statusFilter,setStatusFilter]=useState('All')
  const [selectedId,setSelectedId]=useState('')
  const [sessionModal,setSessionModal]=useState(false)
  const [participantOpen,setParticipantOpen]=useState(false)
  const [sessionForm,setSessionForm]=useState(()=>emptySession())
  const [participantForm,setParticipantForm]=useState(emptyParticipant)
  const [notice,setNotice]=useState('')
  const [syncLabel,setSyncLabel]=useState('Local ready')

  useEffect(()=>{
    let active=true
    async function load(){
      const localSessions=safeRead(SESSION_KEY)
      const localAttendance=safeRead(ATTENDANCE_KEY)
      if(active){setSessions(localSessions);setAttendance(localAttendance)}
      if(!isSupabaseConfigured()) return
      try{
        setSyncLabel('Syncing central data…')
        const [centralSessions,centralAttendance]=await Promise.all([
          dbSelect('safety_sessions','select=*&order=session_date.desc,updated_at.desc'),
          dbSelect('safety_attendance','select=*&order=updated_at.desc'),
        ])
        const mergedSessions=mergeById(localSessions,(centralSessions||[]).map(sessionFromDb))
        const mergedAttendance=mergeById(localAttendance,(centralAttendance||[]).map(attendanceFromDb))
        if(active){
          setSessions(mergedSessions); setAttendance(mergedAttendance)
          safeWrite(SESSION_KEY,mergedSessions); safeWrite(ATTENDANCE_KEY,mergedAttendance)
          setSyncLabel('Central data synced')
        }
      }catch{
        if(active)setSyncLabel('Offline / local cache')
      }
    }
    load(); return()=>{active=false}
  },[])

  const companies=useMemo(()=>filteredCompanies(filters),[filters])
  const allowed=useMemo(()=>new Set(companies.map(c=>c.code)),[companies])
  const specific=filters.company!=='All'||filters.region!=='All'||filters.province!=='All'||filters.pic!=='All'
  const filteredSessions=useMemo(()=>sessions.filter(s=>{
    const code=companyCodeOf(s)
    const companyMatch=!code?!specific:allowed.has(code)
    const q=search.trim().toLowerCase()
    const text=[s.id,s.companyCode,s.type,s.title,s.unit,s.location,s.facilitator,s.topic].join(' ').toLowerCase()
    return companyMatch&&(!q||text.includes(q))&&(typeFilter==='All'||s.type===typeFilter)&&(statusFilter==='All'||s.status===statusFilter)
  }).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))),[sessions,allowed,specific,search,typeFilter,statusFilter])

  const selected=filteredSessions.find(s=>s.id===selectedId)||filteredSessions[0]||null
  const scopedIds=useMemo(()=>new Set(filteredSessions.map(s=>s.id)),[filteredSessions])
  const scopedAttendance=useMemo(()=>attendance.filter(a=>scopedIds.has(a.sessionId)),[attendance,scopedIds])
  const selectedAttendance=useMemo(()=>selected?attendance.filter(a=>a.sessionId===selected.id).sort((a,b)=>a.employeeName.localeCompare(b.employeeName)):[],[attendance,selected])
  const present=scopedAttendance.filter(a=>a.attendanceStatus==='Present').length
  const attendanceRate=scopedAttendance.length?Math.round(present/scopedAttendance.length*100):0
  const completed=filteredSessions.filter(s=>s.status==='Completed').length
  const inductionPassed=filteredSessions.filter(s=>s.type==='Safety Induction'&&s.status==='Completed').reduce((sum,s)=>sum+attendance.filter(a=>a.sessionId===s.id&&attendeeReady(s,a)).length,0)
  const ackPresent=scopedAttendance.filter(a=>a.attendanceStatus==='Present'&&a.acknowledgement).length
  const ackRate=present?Math.round(ackPresent/present*100):0

  function flash(text){ setNotice(text); setTimeout(()=>setNotice(''),3400) }
  function updateSessionForm(field,value){ setSessionForm(prev=>({...prev,[field]:value})) }
  async function persistSession(item,message){
    const next=upsert(sessions,item); setSessions(next); safeWrite(SESSION_KEY,next); setSelectedId(item.id)
    if(isSupabaseConfigured()){
      try{ await dbUpsert('safety_sessions',[sessionToDb(item)],'id'); setSyncLabel('Central data synced') }
      catch(err){ setSyncLabel('Pending sync'); flash(`${message} Tersimpan lokal, sync central gagal: ${err.message}`); return }
    }
    flash(message)
  }
  async function persistAttendance(item,message='Attendance diperbarui.'){
    const next=upsert(attendance,item); setAttendance(next); safeWrite(ATTENDANCE_KEY,next)
    if(isSupabaseConfigured()){
      try{ await dbUpsert('safety_attendance',[attendanceToDb(item)],'id'); setSyncLabel('Central data synced') }
      catch(err){ setSyncLabel('Pending sync'); flash(`Tersimpan lokal, sync attendance gagal: ${err.message}`); return }
    }
    if(message)flash(message)
  }

  async function saveSession(e){
    e.preventDefault()
    if(!sessionForm.companyCode||!sessionForm.title.trim()||!sessionForm.location.trim()||!sessionForm.facilitator.trim()||!sessionForm.date){flash('Lengkapi Company/PT, judul, tanggal, lokasi dan facilitator.');return}
    const prefix=sessionForm.type==='Safety Induction'?'SI':'SB'
    const seq=Math.max(0,...sessions.filter(s=>String(s.id).startsWith(`${prefix}-`)).map(s=>Number(String(s.id).split('-').pop())||0))+1
    const id=`${prefix}-${new Date(sessionForm.date+'T00:00:00').getFullYear()}-${String(seq).padStart(4,'0')}`
    const item={...sessionForm,id,qrToken:`SINSHE-${id}-${Math.random().toString(36).slice(2,8).toUpperCase()}`}
    setSessionModal(false); setSessionForm(emptySession())
    await persistSession(item,`${id} berhasil dibuat untuk PT ${item.companyCode}.`)
  }

  async function addParticipant(e){
    e.preventDefault(); if(!selected)return
    if(!participantForm.employeeName.trim()){flash('Nama peserta wajib diisi.');return}
    const id=`ATT-${selected.id}-${Date.now().toString().slice(-7)}`
    const item={id,sessionId:selected.id,companyCode:selected.companyCode,employeeName:participantForm.employeeName.trim(),employeeId:participantForm.employeeId.trim(),unit:participantForm.unit||selected.unit,attendanceStatus:'Absent',checkInAt:'',quizScore:null,acknowledgement:false,notes:participantForm.notes.trim()}
    setParticipantForm({...emptyParticipant,unit:selected.unit}); setParticipantOpen(false)
    await persistAttendance(item,`${item.employeeName} ditambahkan ke daftar peserta.`)
  }

  async function patchAttendance(row,patch,message){ await persistAttendance({...row,...patch},message) }
  async function setStatus(next){ if(!selected)return; await persistSession({...selected,status:next},`${selected.id} diperbarui menjadi ${next}.`) }

  async function completeSession(){
    if(!selected)return
    const participants=attendance.filter(a=>a.sessionId===selected.id)
    const presentRows=participants.filter(a=>a.attendanceStatus==='Present')
    if(!presentRows.length){flash('Session belum dapat diselesaikan karena belum ada peserta yang check-in.');return}
    const incomplete=presentRows.filter(a=>!attendeeReady(selected,a))
    if(incomplete.length){
      const need=[]
      if(selected.acknowledgementRequired&&incomplete.some(a=>!a.acknowledgement))need.push('acknowledgement')
      if(selected.quizRequired&&incomplete.some(a=>a.quizScore===null||Number(a.quizScore)<Number(selected.passingScore||70)))need.push(`quiz ≥ ${selected.passingScore}`)
      flash(`Belum bisa Complete. ${incomplete.length} peserta belum memenuhi ${need.join(' & ') || 'persyaratan'}.`); return
    }
    const completedSession={...selected,status:'Completed',endTime:selected.endTime||nowTime()}
    await persistSession(completedSession,`${selected.id} Completed.`)

    if(selected.type==='Safety Induction'){
      const existing=safeRead(LEARNING_KEY)
      const generated=presentRows.map(a=>({
        id:`TRN-IND-${selected.id}-${String(a.employeeId||a.id).replace(/[^a-zA-Z0-9]/g,'').slice(-16)}`,
        companyCode:selected.companyCode, employeeName:a.employeeName, employeeId:a.employeeId, unit:a.unit,
        trainingName:selected.title, category:'Safety Induction', trainingDate:selected.date, validUntil:'', status:'Valid',
        competency:selected.topic||'Safety Induction', provider:selected.facilitator, certificateNo:'', mandatory:true,
      }))
      const nextLearning=mergeById(existing,generated); safeWrite(LEARNING_KEY,nextLearning)
      if(isSupabaseConfigured()){
        try{ await dbUpsert('learning_records',generated.map(learningToDb),'id'); flash(`${selected.id} selesai dan ${generated.length} peserta tersinkron ke Learning & Competency.`) }
        catch(err){ flash(`Session selesai. Learning record tersimpan lokal, sync central gagal: ${err.message}`) }
      }else flash(`${selected.id} selesai dan ${generated.length} peserta masuk Learning & Competency lokal.`)
    }
  }

  async function copyToken(){
    if(!selected?.qrToken)return
    try{await navigator.clipboard.writeText(selected.qrToken);flash('Check-in token disalin.')}catch{flash(`Token: ${selected.qrToken}`)}
  }

  function exportCSV(){
    const header=['Session ID','Company/PT','Type','Title','Date','Unit','Location','Facilitator','Status','Employee','Employee ID','Attendance','Check-in','Acknowledgement','Quiz Score','Pass']
    const rows=[]
    filteredSessions.forEach(s=>{
      const people=attendance.filter(a=>a.sessionId===s.id)
      if(!people.length)rows.push([s.id,s.companyCode,s.type,s.title,s.date,s.unit,s.location,s.facilitator,s.status,'','','','','','',''])
      else people.forEach(a=>rows.push([s.id,s.companyCode,s.type,s.title,s.date,s.unit,s.location,s.facilitator,s.status,a.employeeName,a.employeeId,a.attendanceStatus,a.checkInAt,a.acknowledgement?'Yes':'No',a.quizScore??'',attendeeReady(s,a)?'Yes':'No']))
    })
    const csv=[header,...rows].map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n')
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download=`SINSHE_Safety_Briefing_Induction_${today()}.csv`;a.click();URL.revokeObjectURL(url)
  }

  const selectedPresent=selectedAttendance.filter(a=>a.attendanceStatus==='Present').length
  const selectedReady=selectedAttendance.filter(a=>attendeeReady(selected||{},a)).length
  const selectedCompletion=selectedPresent?Math.round(selectedReady/selectedPresent*100):0

  return <Shell title="Safety Briefing & Induction" subtitle="Digitalisasi briefing, induction, attendance, acknowledgement dan competency hand-off per Company/PT.">
    <CompanyScopeBar filters={filters} onChange={setFilters} onReset={()=>setFilters(DEFAULT_COMPANY_FILTERS)}/>
    {notice&&<div className={styles.notice}><CheckCircle2 size={18}/>{notice}</div>}

    <div className="stats-grid four">
      <StatCard label="Session" value={filteredSessions.length} hint={`${completed} completed • ${syncLabel}`} tone="blue" icon={<ClipboardCheck/>}/>
      <StatCard label="Attendance" value={`${attendanceRate}%`} hint={`${present} present dari ${scopedAttendance.length} participant record`} tone="green" icon={<UserCheck/>}/>
      <StatCard label="Induction Passed" value={inductionPassed} hint="otomatis masuk Learning & Competency" tone="purple" icon={<GraduationCap/>}/>
      <StatCard label="Acknowledgement" value={`${ackRate}%`} hint="dari peserta yang hadir" tone="orange" icon={<ShieldCheck/>}/>
    </div>

    <div className={styles.toolbar}>
      <div><h2>Briefing & Induction Register</h2><p>Kelola sesi lapangan dari jadwal, check-in, acknowledgement/quiz sampai rekam kompetensi.</p></div>
      <div className={styles.actions}><button className={styles.secondary} onClick={exportCSV}><Download size={17}/> Export CSV</button><button className={styles.primary} onClick={()=>{setSessionForm({...emptySession(),companyCode:filters.company!=='All'?filters.company:'ACP'});setSessionModal(true)}}><Plus size={18}/> Buat Session</button></div>
    </div>

    <Panel>
      <div className={styles.filters}>
        <label className={styles.search}><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari session, PT, topic, facilitator, lokasi..."/></label>
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option>All</option>{sessionTypes.map(v=><option key={v}>{v}</option>)}</select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All</option>{statuses.map(v=><option key={v}>{v}</option>)}</select>
      </div>
      <div className="table-wrap"><table><thead><tr><th>Session</th><th>PT</th><th>Type</th><th>Tanggal</th><th>Unit / Lokasi</th><th>Facilitator</th><th>Peserta</th><th>Status</th><th>Progress</th></tr></thead><tbody>
        {filteredSessions.map(s=>{
          const people=attendance.filter(a=>a.sessionId===s.id); const p=people.filter(a=>a.attendanceStatus==='Present').length; const ready=people.filter(a=>attendeeReady(s,a)).length; const progress=p?Math.round(ready/p*100):0
          return <tr key={s.id} onClick={()=>setSelectedId(s.id)} className={selected?.id===s.id?styles.selectedRow:''}>
            <td><b>{s.id}</b><small className={styles.block}>{s.title}</small></td><td><b>{s.companyCode||'-'}</b></td><td><Badge tone={typeTone(s.type)}>{s.type}</Badge></td><td>{fmt(s.date)}<small className={styles.block}>{s.startTime||'-'}{s.endTime?`–${s.endTime}`:''}</small></td><td><b>{s.unit}</b><small className={styles.block}>{s.location}</small></td><td>{s.facilitator}</td><td><b>{p}</b> present<small className={styles.block}>{people.length} listed • target {s.plannedParticipants||0}</small></td><td><Badge tone={statusTone(s.status)}>{s.status}</Badge></td><td className={styles.progressCell}><b>{progress}%</b><Progress value={progress} tone={progress===100?'green':'orange'}/></td>
          </tr>
        })}
        {!filteredSessions.length&&<tr><td colSpan="9" className={styles.empty}>Belum ada session pada scope ini. Gunakan tombol Buat Session.</td></tr>}
      </tbody></table></div>
    </Panel>

    {selected&&<div className="dashboard-split mt">
      <Panel title="Session Detail" action={selected.id}>
        <div className={styles.detailTop}><div><Badge tone={typeTone(selected.type)}>{selected.type}</Badge><h3>{selected.title}</h3><p>{fmt(selected.date)} • {selected.startTime||'-'}{selected.endTime?`–${selected.endTime}`:''} • {selected.unit} / {selected.location}</p></div><Badge tone={statusTone(selected.status)}>{selected.status}</Badge></div>
        <div className={styles.detailGrid}>
          <div><span>Company/PT</span><b>{selected.companyCode}</b></div><div><span>Facilitator</span><b>{selected.facilitator}</b></div>
          <div><span>Topic</span><b>{selected.topic||'-'}</b></div><div><span>Material / Reference</span><b>{selected.materialRef||'-'}</b></div>
          <div><span>Quiz</span><b>{selected.quizRequired?`Required • Pass ${selected.passingScore}`:'Not required'}</b></div><div><span>Acknowledgement</span><b>{selected.acknowledgementRequired?'Required':'Optional'}</b></div>
        </div>
        <div className={styles.tokenCard}><QrCode size={28}/><div><span>Check-in Token</span><b>{selected.qrToken||'-'}</b><small>Token unik ini menjadi dasar check-in/QR attendance tanpa mengirim data ke layanan QR eksternal.</small></div><button onClick={copyToken}><Copy size={15}/> Copy</button></div>
        <div className={styles.sessionButtons}>
          {selected.status==='Scheduled'&&<button className={styles.startButton} onClick={()=>setStatus('In Progress')}><PlayCircle size={16}/> Start Session</button>}
          {selected.status==='In Progress'&&<button className={styles.completeButton} onClick={completeSession}><CheckCircle2 size={16}/> Complete Session</button>}
          {!['Completed','Cancelled'].includes(selected.status)&&<button className={styles.cancelButton} onClick={()=>setStatus('Cancelled')}><X size={16}/> Cancel</button>}
        </div>
      </Panel>

      <Panel title="Attendance & Completion" action={`${selectedReady}/${selectedPresent} ready`}>
        <div className={styles.attendanceSummary}><div><span>Present</span><b>{selectedPresent}</b></div><div><span>Listed</span><b>{selectedAttendance.length}</b></div><div><span>Completion</span><b>{selectedCompletion}%</b></div></div>
        <Progress value={selectedCompletion} tone={selectedCompletion===100?'green':'orange'}/>
        <div className={styles.participantHeader}><div><b>Participant Register</b><small>Check-in, acknowledgement dan quiz score</small></div><button className={styles.smallPrimary} onClick={()=>{setParticipantForm({...emptyParticipant,unit:selected.unit});setParticipantOpen(v=>!v)}}><Plus size={15}/> Participant</button></div>
        {participantOpen&&<form className={styles.participantForm} onSubmit={addParticipant}><input value={participantForm.employeeName} onChange={e=>setParticipantForm({...participantForm,employeeName:e.target.value})} placeholder="Nama pekerja"/><input value={participantForm.employeeId} onChange={e=>setParticipantForm({...participantForm,employeeId:e.target.value})} placeholder="Employee ID"/><select value={participantForm.unit} onChange={e=>setParticipantForm({...participantForm,unit:e.target.value})}>{units.map(v=><option key={v}>{v}</option>)}</select><button>Tambah</button></form>}
        <div className={styles.peopleList}>
          {selectedAttendance.map(a=><div className={styles.person} key={a.id}>
            <div className={styles.personMain}><div className={styles.personAvatar}><Users size={15}/></div><div><b>{a.employeeName}</b><small>{a.employeeId||'No ID'} • {a.unit}</small></div></div>
            <div className={styles.personControls}>
              <button className={a.attendanceStatus==='Present'?styles.present:styles.checkIn} onClick={()=>patchAttendance(a,a.attendanceStatus==='Present'?{attendanceStatus:'Absent',checkInAt:''}:{attendanceStatus:'Present',checkInAt:new Date().toISOString()},a.attendanceStatus==='Present'?`${a.employeeName} diubah Absent.`:`${a.employeeName} check-in.`)}>{a.attendanceStatus==='Present'?<CheckCircle2 size={14}/>:<Clock3 size={14}/>} {a.attendanceStatus}</button>
              {selected.acknowledgementRequired&&<button className={a.acknowledgement?styles.ackDone:styles.ack} onClick={()=>patchAttendance(a,{acknowledgement:!a.acknowledgement},`${a.employeeName}: acknowledgement ${!a.acknowledgement?'confirmed':'dibatalkan'}.`)}><ShieldCheck size={14}/> {a.acknowledgement?'Acknowledged':'Acknowledge'}</button>}
              {selected.quizRequired&&<label className={styles.quiz}>Quiz<input type="number" min="0" max="100" value={a.quizScore??''} onChange={e=>{const value=e.target.value===''?null:Number(e.target.value);const item={...a,quizScore:value};const next=upsert(attendance,item);setAttendance(next);safeWrite(ATTENDANCE_KEY,next)}} onBlur={e=>patchAttendance(a,{quizScore:e.target.value===''?null:Number(e.target.value)},'')}/><span>/100</span></label>}
              <Badge tone={attendeeReady(selected,a)?'green':'orange'}>{attendeeReady(selected,a)?'Ready':'Pending'}</Badge>
            </div>
          </div>)}
          {!selectedAttendance.length&&<div className={styles.emptyPeople}>Belum ada peserta. Tambahkan participant untuk memulai attendance.</div>}
        </div>
      </Panel>
    </div>}

    <div className={styles.info}><GraduationCap size={20}/><div><b>Terintegrasi dengan Learning & Competency</b><span>Safety Induction yang Completed akan otomatis membuat training record bagi peserta yang hadir dan memenuhi acknowledgement/quiz requirement. Filter Company/PT tetap menggunakan master PT yang sama.</span></div></div>

    {sessionModal&&<div className={styles.modalBackdrop} onMouseDown={e=>{if(e.target===e.currentTarget)setSessionModal(false)}}><form className={styles.modal} onSubmit={saveSession}>
      <div className={styles.modalHead}><div><span>SINSHE 2.0</span><h2>Buat Safety Session</h2><p>Briefing atau induction dengan scope Company/PT, attendance dan competency hand-off.</p></div><button type="button" onClick={()=>setSessionModal(false)}><X size={18}/></button></div>
      <div className={styles.formGrid}>
        <Field label="Company / PT"><select value={sessionForm.companyCode} onChange={e=>updateSessionForm('companyCode',e.target.value)}>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></Field>
        <Field label="Session Type"><select value={sessionForm.type} onChange={e=>updateSessionForm('type',e.target.value)}>{sessionTypes.map(v=><option key={v}>{v}</option>)}</select></Field>
        <Field label="Judul Session" wide><input value={sessionForm.title} onChange={e=>updateSessionForm('title',e.target.value)} placeholder="Contoh: Morning Safety Briefing - Harvesting"/></Field>
        <Field label="Tanggal"><input type="date" value={sessionForm.date} onChange={e=>updateSessionForm('date',e.target.value)}/></Field>
        <Field label="Start Time"><input type="time" value={sessionForm.startTime} onChange={e=>updateSessionForm('startTime',e.target.value)}/></Field>
        <Field label="Unit"><select value={sessionForm.unit} onChange={e=>updateSessionForm('unit',e.target.value)}>{units.map(v=><option key={v}>{v}</option>)}</select></Field>
        <Field label="Lokasi"><input value={sessionForm.location} onChange={e=>updateSessionForm('location',e.target.value)} placeholder="Meeting point / workshop / office"/></Field>
        <Field label="Facilitator"><input value={sessionForm.facilitator} onChange={e=>updateSessionForm('facilitator',e.target.value)} placeholder="Nama / jabatan facilitator"/></Field>
        <Field label="Target Participant"><input type="number" min="0" value={sessionForm.plannedParticipants} onChange={e=>updateSessionForm('plannedParticipants',Number(e.target.value||0))}/></Field>
        <Field label="Topic" wide><input value={sessionForm.topic} onChange={e=>updateSessionForm('topic',e.target.value)} placeholder="Topik bahaya, SOP, emergency, induction scope..."/></Field>
        <Field label="Material / Reference" wide><input value={sessionForm.materialRef} onChange={e=>updateSessionForm('materialRef',e.target.value)} placeholder="SOP / WI / slide / document reference"/></Field>
        <label className={styles.checkField}><input type="checkbox" checked={sessionForm.acknowledgementRequired} onChange={e=>updateSessionForm('acknowledgementRequired',e.target.checked)}/> Acknowledgement wajib</label>
        <label className={styles.checkField}><input type="checkbox" checked={sessionForm.quizRequired} onChange={e=>updateSessionForm('quizRequired',e.target.checked)}/> Quiz wajib</label>
        {sessionForm.quizRequired&&<Field label="Passing Score"><input type="number" min="0" max="100" value={sessionForm.passingScore} onChange={e=>updateSessionForm('passingScore',Number(e.target.value||0))}/></Field>}
      </div>
      <div className={styles.modalActions}><button type="button" className={styles.secondary} onClick={()=>setSessionModal(false)}>Batal</button><button className={styles.primary}>Simpan Session</button></div>
    </form></div>}
  </Shell>
}

function Field({label,children,wide=false}){ return <label className={wide?styles.fieldWide:styles.field}><span>{label}</span>{children}</label> }
