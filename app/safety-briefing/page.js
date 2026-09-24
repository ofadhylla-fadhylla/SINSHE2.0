'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge, Panel, Progress, StatCard } from '../../components/Ui'
import {
  BookOpen, Camera, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Clock3, Copy, Download,
  ExternalLink, GraduationCap, LocateFixed, MapPin, PlayCircle, Plus, QrCode, Search, ShieldCheck,
  UserCheck, Users, X
} from 'lucide-react'
import { COMPANY_MASTER, DEFAULT_COMPANY_FILTERS, companyCodeOf, filteredCompanies } from '../../lib/company-master'
import { SAFETY_BRIEFING_MATERIALS, SAFETY_MATERIAL_CATEGORIES, safetyMaterialById } from '../../lib/safety-briefing-materials'
import { dbSelect, dbUpsert, isSupabaseConfigured, storageSignedUrl, storageUpload } from '../../lib/supabase-rest'
import styles from './safety-briefing.module.css'

const SESSION_KEY = 'sinshe-safety-sessions'
const ATTENDANCE_KEY = 'sinshe-safety-attendance'
const LEARNING_KEY = 'sinshe-learning-records'
const EVIDENCE_BUCKET = 'sinshe-evidence'
const sessionTypes = ['Safety Briefing', 'Safety Induction']
const statuses = ['Scheduled', 'In Progress', 'Completed', 'Cancelled']
const units = ['Head Office','PKS A','PKS B','PKS C','Estate 1','Estate 2','Estate 3','Laboratorium']

const today = () => new Date().toISOString().slice(0, 10)
const nowTime = () => new Date().toTimeString().slice(0, 5)
const emptySession = () => ({
  companyCode:'ACP', type:'Safety Briefing', title:'', date:today(), startTime:'08:00', endTime:'', unit:'PKS A',
  location:'', facilitator:'', topic:'', materialRef:'', materialId:null, materialTitle:'', status:'Scheduled',
  quizRequired:false, passingScore:70, acknowledgementRequired:true, plannedParticipants:0,
  latitude:null, longitude:null, gpsAccuracyM:null, gpsCapturedAt:'', photoPath:'', photoName:'', photoCapturedAt:'',
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
function safeFileName(value){ return String(value||'photo.jpg').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').slice(0,120) || 'photo.jpg' }
function hasGpsCoords(lat,lng){ return lat!==null&&lat!==undefined&&lat!==''&&lng!==null&&lng!==undefined&&lng!==''&&Number.isFinite(Number(lat))&&Number.isFinite(Number(lng)) }
function coord(value){ return value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value)) ? Number(value).toFixed(6) : '-' }

function sessionFromDb(r){ return {
  id:r.id, companyCode:r.company_code||'', type:r.session_type, title:r.title, date:r.session_date,
  startTime:cleanTime(r.start_time), endTime:cleanTime(r.end_time), unit:r.unit, location:r.location||'', facilitator:r.facilitator||'',
  topic:r.topic||'', materialRef:r.material_ref||'', materialId:r.material_id===null?null:Number(r.material_id), materialTitle:r.material_title||'',
  status:r.status||'Scheduled', quizRequired:r.quiz_required===true, passingScore:Number(r.passing_score||70),
  acknowledgementRequired:r.acknowledgement_required!==false, qrToken:r.qr_token||'', plannedParticipants:Number(r.planned_participants||0),
  latitude:r.latitude===null?null:Number(r.latitude), longitude:r.longitude===null?null:Number(r.longitude),
  gpsAccuracyM:r.gps_accuracy_m===null?null:Number(r.gps_accuracy_m), gpsCapturedAt:r.gps_captured_at||'',
  photoPath:r.photo_path||'', photoName:r.photo_name||'', photoCapturedAt:r.photo_captured_at||'',
} }
function sessionToDb(s){ return {
  id:s.id, company_code:s.companyCode, session_type:s.type, title:s.title, session_date:s.date,
  start_time:s.startTime||null, end_time:s.endTime||null, unit:s.unit, location:s.location||'', facilitator:s.facilitator||'',
  topic:s.topic||null, material_ref:s.materialRef||null, material_id:s.materialId===null?null:Number(s.materialId), material_title:s.materialTitle||null,
  status:s.status||'Scheduled', quiz_required:s.quizRequired===true, passing_score:Number(s.passingScore||70),
  acknowledgement_required:s.acknowledgementRequired!==false, qr_token:s.qrToken||null,
  planned_participants:Math.max(0,Number(s.plannedParticipants||0)),
  latitude:s.latitude===null?null:Number(s.latitude), longitude:s.longitude===null?null:Number(s.longitude),
  gps_accuracy_m:s.gpsAccuracyM===null?null:Number(s.gpsAccuracyM), gps_captured_at:s.gpsCapturedAt||null,
  photo_path:s.photoPath||null, photo_name:s.photoName||null, photo_captured_at:s.photoCapturedAt||null,
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
  const [sessionStep,setSessionStep]=useState('material')
  const [materialSearch,setMaterialSearch]=useState('')
  const [materialCategory,setMaterialCategory]=useState('All')
  const [participantOpen,setParticipantOpen]=useState(false)
  const [sessionForm,setSessionForm]=useState(()=>emptySession())
  const [participantForm,setParticipantForm]=useState(emptyParticipant)
  const [photoFile,setPhotoFile]=useState(null)
  const [photoPreview,setPhotoPreview]=useState('')
  const [selectedPhotoUrl,setSelectedPhotoUrl]=useState('')
  const [gpsBusy,setGpsBusy]=useState(false)
  const [sessionSaving,setSessionSaving]=useState(false)
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

  useEffect(()=>()=>{ if(photoPreview) URL.revokeObjectURL(photoPreview) },[photoPreview])

  const companies=useMemo(()=>filteredCompanies(filters),[filters])
  const allowed=useMemo(()=>new Set(companies.map(c=>c.code)),[companies])
  const specific=filters.company!=='All'||filters.region!=='All'||filters.province!=='All'||filters.pic!=='All'
  const filteredSessions=useMemo(()=>sessions.filter(s=>{
    const code=companyCodeOf(s)
    const companyMatch=!code?!specific:allowed.has(code)
    const q=search.trim().toLowerCase()
    const text=[s.id,s.companyCode,s.type,s.title,s.unit,s.location,s.facilitator,s.topic,s.materialTitle].join(' ').toLowerCase()
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

  const filteredMaterials=useMemo(()=>{
    const q=materialSearch.trim().toLowerCase()
    return SAFETY_BRIEFING_MATERIALS.filter(m=>(materialCategory==='All'||m.category===materialCategory)&&(!q||`${m.id} ${m.code} ${m.title} ${m.category}`.toLowerCase().includes(q)))
  },[materialSearch,materialCategory])
  const chosenMaterial=safetyMaterialById(sessionForm.materialId)

  useEffect(()=>{
    let active=true
    setSelectedPhotoUrl('')
    if(!selected?.photoPath||!isSupabaseConfigured()) return()=>{active=false}
    storageSignedUrl(EVIDENCE_BUCKET,selected.photoPath,3600).then(url=>{if(active)setSelectedPhotoUrl(url)}).catch(()=>{})
    return()=>{active=false}
  },[selected?.photoPath])

  function flash(text){ setNotice(text); setTimeout(()=>setNotice(''),3400) }
  function updateSessionForm(field,value){ setSessionForm(prev=>({...prev,[field]:value})) }
  function openCreateSession(){
    if(photoPreview) URL.revokeObjectURL(photoPreview)
    setSessionForm({...emptySession(),companyCode:filters.company!=='All'?filters.company:'ACP'})
    setSessionStep('material'); setMaterialSearch(''); setMaterialCategory('All'); setPhotoFile(null); setPhotoPreview(''); setSessionModal(true)
  }
  function selectMaterial(material){
    setSessionForm(prev=>({...prev,materialId:material.id,materialTitle:material.title,topic:material.title,materialRef:`${material.code} • ${material.source}`,title:prev.title||material.title}))
  }
  function captureGps(){
    if(typeof navigator==='undefined'||!navigator.geolocation){flash('GPS / Geolocation tidak tersedia pada perangkat ini.');return}
    setGpsBusy(true)
    navigator.geolocation.getCurrentPosition(pos=>{
      const {latitude,longitude,accuracy}=pos.coords
      setSessionForm(prev=>({...prev,latitude:Number(latitude.toFixed(7)),longitude:Number(longitude.toFixed(7)),gpsAccuracyM:Math.round(Number(accuracy||0)),gpsCapturedAt:new Date().toISOString()}))
      setGpsBusy(false); flash(`Lokasi GPS berhasil diambil (${latitude.toFixed(6)}, ${longitude.toFixed(6)}).`)
    },err=>{
      setGpsBusy(false)
      const message=err.code===1?'Izin lokasi ditolak. Aktifkan permission lokasi untuk browser.':err.code===3?'Pengambilan GPS timeout. Coba lagi di area lebih terbuka.':'Lokasi GPS belum dapat diperoleh.'
      flash(message)
    },{enableHighAccuracy:true,timeout:15000,maximumAge:0})
  }
  function choosePhoto(e){
    const file=e.target.files?.[0]
    if(!file)return
    if(!String(file.type||'').startsWith('image/')){flash('File foto harus berupa gambar.');return}
    if(file.size>15*1024*1024){flash('Ukuran foto maksimum 15 MB.');return}
    if(photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file))
  }
  function removePhoto(){ if(photoPreview) URL.revokeObjectURL(photoPreview); setPhotoPreview(''); setPhotoFile(null) }

  async function persistSession(item,message){
    const next=upsert(sessions,item); setSessions(next); safeWrite(SESSION_KEY,next); setSelectedId(item.id)
    if(isSupabaseConfigured()){
      try{ await dbUpsert('safety_sessions',[sessionToDb(item)],'id'); setSyncLabel('Central data synced') }
      catch(err){ setSyncLabel('Pending sync'); flash(`${message||item.id} tersimpan lokal, sync central gagal: ${err.message}`); return false }
    }
    if(message)flash(message)
    return true
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
    if(!sessionForm.materialId){flash('Pilih materi Safety Briefing terlebih dahulu.');setSessionStep('material');return}
    if(!sessionForm.companyCode||!sessionForm.title.trim()||!sessionForm.location.trim()||!sessionForm.facilitator.trim()||!sessionForm.date){flash('Lengkapi Company/PT, judul, tanggal, lokasi dan facilitator.');return}
    setSessionSaving(true)
    const prefix=sessionForm.type==='Safety Induction'?'SI':'SB'
    const seq=Math.max(0,...sessions.filter(s=>String(s.id).startsWith(`${prefix}-`)).map(s=>Number(String(s.id).split('-').pop())||0))+1
    const id=`${prefix}-${new Date(sessionForm.date+'T00:00:00').getFullYear()}-${String(seq).padStart(4,'0')}`
    let item={...sessionForm,id,qrToken:`SINSHE-${id}-${Math.random().toString(36).slice(2,8).toUpperCase()}`}
    try{
      await persistSession(item,photoFile?'':`${id} berhasil dibuat untuk PT ${item.companyCode}.`)
      if(photoFile){
        if(!isSupabaseConfigured()) flash(`${id} dibuat. Foto belum dapat diunggah karena central storage tidak tersedia.`)
        else{
          try{
            const path=`${item.companyCode}/safety-briefing/${id}/${Date.now()}-${safeFileName(photoFile.name)}`
            await storageUpload(EVIDENCE_BUCKET,path,photoFile,{upsert:false})
            item={...item,photoPath:path,photoName:photoFile.name,photoCapturedAt:new Date().toISOString()}
            await persistSession(item,`${id} berhasil dibuat dan foto kegiatan tersimpan.`)
          }catch(err){ flash(`${id} sudah dibuat, tetapi upload foto gagal: ${err.message}`) }
        }
      }
      setSessionModal(false); setSessionForm(emptySession()); removePhoto(); setSessionStep('material')
    }finally{ setSessionSaving(false) }
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
    const header=['Session ID','Company/PT','Type','Title','Material ID','Material','Date','Unit','Location','Latitude','Longitude','GPS Accuracy (m)','Photo','Facilitator','Status','Employee','Employee ID','Attendance','Check-in','Acknowledgement','Quiz Score','Pass']
    const rows=[]
    filteredSessions.forEach(s=>{
      const people=attendance.filter(a=>a.sessionId===s.id)
      const base=[s.id,s.companyCode,s.type,s.title,s.materialId||'',s.materialTitle||'',s.date,s.unit,s.location,s.latitude??'',s.longitude??'',s.gpsAccuracyM??'',s.photoName||s.photoPath||'',s.facilitator,s.status]
      if(!people.length)rows.push([...base,'','','','','','',''])
      else people.forEach(a=>rows.push([...base,a.employeeName,a.employeeId,a.attendanceStatus,a.checkInAt,a.acknowledgement?'Yes':'No',a.quizScore??'',attendeeReady(s,a)?'Yes':'No']))
    })
    const csv=[header,...rows].map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n')
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download=`SINSHE_Safety_Briefing_Induction_${today()}.csv`;a.click();URL.revokeObjectURL(url)
  }

  const selectedPresent=selectedAttendance.filter(a=>a.attendanceStatus==='Present').length
  const selectedReady=selectedAttendance.filter(a=>attendeeReady(selected||{},a)).length
  const selectedCompletion=selectedPresent?Math.round(selectedReady/selectedPresent*100):0
  const hasGps=selected&&hasGpsCoords(selected.latitude,selected.longitude)

  return <Shell title="Safety Briefing & Induction" subtitle="Buat session, pilih materi, dokumentasikan GPS & foto, lalu kelola attendance dan competency hand-off.">
    <CompanyScopeBar filters={filters} onChange={setFilters}/>
    {notice&&<div className={styles.notice}><CheckCircle2 size={18}/>{notice}</div>}

    <div className="stats-grid four">
      <StatCard label="Session" value={filteredSessions.length} hint={`${completed} completed • ${syncLabel}`} tone="blue" icon={<ClipboardCheck/>}/>
      <StatCard label="Attendance" value={`${attendanceRate}%`} hint={`${present} present dari ${scopedAttendance.length} participant record`} tone="green" icon={<UserCheck/>}/>
      <StatCard label="Induction Passed" value={inductionPassed} hint="otomatis masuk Learning & Competency" tone="purple" icon={<GraduationCap/>}/>
      <StatCard label="Acknowledgement" value={`${ackRate}%`} hint="dari peserta yang hadir" tone="orange" icon={<ShieldCheck/>}/>
    </div>

    <div className={styles.toolbar}>
      <div><h2>Briefing & Induction Register</h2><p>Alur baru: Buat Session → Pilih Materi → Form → Attendance & Completion.</p></div>
      <div className={styles.actions}><button className={styles.secondary} onClick={exportCSV}><Download size={17}/> Export CSV</button><button className={styles.primary} onClick={openCreateSession}><Plus size={18}/> Buat Session</button></div>
    </div>

    <Panel>
      <div className={styles.filters}>
        <label className={styles.search}><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari session, PT, materi, facilitator, lokasi..."/></label>
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option>All</option>{sessionTypes.map(v=><option key={v}>{v}</option>)}</select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All</option>{statuses.map(v=><option key={v}>{v}</option>)}</select>
      </div>
      <div className="table-wrap"><table><thead><tr><th>Session</th><th>PT</th><th>Type</th><th>Tanggal</th><th>Unit / Lokasi</th><th>Facilitator</th><th>Peserta</th><th>Status</th><th>Progress</th></tr></thead><tbody>
        {filteredSessions.map(s=>{
          const people=attendance.filter(a=>a.sessionId===s.id); const p=people.filter(a=>a.attendanceStatus==='Present').length; const ready=people.filter(a=>attendeeReady(s,a)).length; const progress=p?Math.round(ready/p*100):0
          return <tr key={s.id} onClick={()=>setSelectedId(s.id)} className={selected?.id===s.id?styles.selectedRow:''}>
            <td><b>{s.id}</b><small className={styles.block}>{s.title}</small>{s.materialTitle&&<small className={styles.materialLine}><BookOpen size={11}/>{s.materialTitle}</small>}</td><td><b>{s.companyCode||'-'}</b></td><td><Badge tone={typeTone(s.type)}>{s.type}</Badge></td><td>{fmt(s.date)}<small className={styles.block}>{s.startTime||'-'}{s.endTime?`–${s.endTime}`:''}</small></td><td><b>{s.unit}</b><small className={styles.block}>{s.location}</small>{hasGpsCoords(s.latitude,s.longitude)&&<small className={styles.gpsLine}><MapPin size={10}/> GPS captured</small>}</td><td>{s.facilitator}</td><td><b>{p}</b> present<small className={styles.block}>{people.length} listed • target {s.plannedParticipants||0}</small></td><td><Badge tone={statusTone(s.status)}>{s.status}</Badge></td><td className={styles.progressCell}><b>{progress}%</b><Progress value={progress} tone={progress===100?'green':'orange'}/></td>
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
          <div><span>Materi</span><b>{selected.materialId?`${selected.materialId}. ${selected.materialTitle}`:(selected.materialTitle||'-')}</b><small>{selected.materialRef||'-'}</small></div>
          <div><span>Topic</span><b>{selected.topic||'-'}</b></div>
          <div><span>Quiz</span><b>{selected.quizRequired?`Required • Pass ${selected.passingScore}`:'Not required'}</b></div><div><span>Acknowledgement</span><b>{selected.acknowledgementRequired?'Required':'Optional'}</b></div>
          <div><span>GPS Location</span><b>{hasGps?`${coord(selected.latitude)}, ${coord(selected.longitude)}`:'Belum diambil'}</b>{hasGps&&<small>Akurasi ±{Math.round(Number(selected.gpsAccuracyM||0))} m</small>}</div>
          <div><span>Foto Kegiatan</span><b>{selected.photoName||'Belum ada foto'}</b><small>{selected.photoCapturedAt?new Date(selected.photoCapturedAt).toLocaleString('id-ID'):'-'}</small></div>
        </div>
        {(hasGps||selected.photoPath)&&<div className={styles.evidenceRow}>
          {hasGps&&<a className={styles.evidenceLink} href={`https://www.google.com/maps?q=${selected.latitude},${selected.longitude}`} target="_blank" rel="noreferrer"><MapPin size={16}/><div><b>Lihat Lokasi GPS</b><small>{coord(selected.latitude)}, {coord(selected.longitude)}</small></div><ExternalLink size={14}/></a>}
          {selected.photoPath&&<a className={styles.photoEvidence} href={selectedPhotoUrl||'#'} target={selectedPhotoUrl?'_blank':undefined} rel="noreferrer" onClick={e=>{if(!selectedPhotoUrl)e.preventDefault()}}>{selectedPhotoUrl?<img src={selectedPhotoUrl} alt={`Foto kegiatan ${selected.id}`}/>:<Camera size={24}/>}<div><b>Foto Kegiatan</b><small>{selectedPhotoUrl?'Klik untuk membuka foto':'Menyiapkan secure preview…'}</small></div></a>}
        </div>}
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

    <div className={styles.info}><GraduationCap size={20}/><div><b>Terintegrasi dengan Learning & Competency</b><span>Safety Induction yang Completed akan otomatis membuat training record bagi peserta yang hadir dan memenuhi acknowledgement/quiz requirement. Material, koordinat GPS dan dokumentasi foto tetap terhubung ke session.</span></div></div>

    {sessionModal&&<div className={styles.modalBackdrop} onMouseDown={e=>{if(e.target===e.currentTarget&&!sessionSaving)setSessionModal(false)}}><form className={styles.modal} onSubmit={saveSession}>
      <div className={styles.modalHead}><div><span>SINSHE 2.0</span><h2>Buat Safety Session</h2><p>Pilih materi terlebih dahulu, kemudian lengkapi form session dan evidence lapangan.</p></div><button type="button" disabled={sessionSaving} onClick={()=>setSessionModal(false)}><X size={18}/></button></div>
      <div className={styles.wizardSteps}><div className={sessionStep==='material'?styles.wizardActive:styles.wizardDone}><span>1</span><b>Pilih Materi</b></div><ChevronRight size={16}/><div className={sessionStep==='form'?styles.wizardActive:''}><span>2</span><b>Form Session</b></div></div>

      {sessionStep==='material'&&<>
        <div className={styles.materialToolbar}><label><Search size={16}/><input value={materialSearch} onChange={e=>setMaterialSearch(e.target.value)} placeholder="Cari 41 materi Safety Briefing..."/></label><select value={materialCategory} onChange={e=>setMaterialCategory(e.target.value)}>{SAFETY_MATERIAL_CATEGORIES.map(v=><option key={v}>{v}</option>)}</select></div>
        <div className={styles.materialGrid}>{filteredMaterials.map(material=><button type="button" key={material.id} className={`${styles.materialCard} ${sessionForm.materialId===material.id?styles.materialCardActive:''}`} onClick={()=>selectMaterial(material)}><span className={styles.materialNo}>{String(material.id).padStart(2,'0')}</span><div><b>{material.title}</b><small>{material.category}</small><em>{material.code}</em></div>{sessionForm.materialId===material.id&&<CheckCircle2 size={18}/>}</button>)}</div>
        {!filteredMaterials.length&&<div className={styles.materialEmpty}>Materi tidak ditemukan.</div>}
        {chosenMaterial&&<div className={styles.chosenMaterial}><BookOpen size={20}/><div><span>Materi dipilih</span><b>{chosenMaterial.id}. {chosenMaterial.title}</b><small>{chosenMaterial.code} • {chosenMaterial.category}</small></div></div>}
        <div className={styles.modalActions}><button type="button" className={styles.secondary} onClick={()=>setSessionModal(false)}>Batal</button><button type="button" className={styles.primary} disabled={!chosenMaterial} onClick={()=>setSessionStep('form')}>Lanjut ke Form <ChevronRight size={16}/></button></div>
      </>}

      {sessionStep==='form'&&<>
        <div className={styles.formMaterialBanner}><BookOpen size={20}/><div><span>Materi Safety Briefing</span><b>{chosenMaterial?.id}. {chosenMaterial?.title}</b><small>{chosenMaterial?.code} • {chosenMaterial?.category}</small></div><button type="button" onClick={()=>setSessionStep('material')}>Ganti Materi</button></div>
        <div className={styles.formGrid}>
          <Field label="Company / PT"><select value={sessionForm.companyCode} onChange={e=>updateSessionForm('companyCode',e.target.value)}>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></Field>
          <Field label="Session Type"><select value={sessionForm.type} onChange={e=>updateSessionForm('type',e.target.value)}>{sessionTypes.map(v=><option key={v}>{v}</option>)}</select></Field>
          <Field label="Judul Session" wide><input value={sessionForm.title} onChange={e=>updateSessionForm('title',e.target.value)} placeholder="Contoh: Morning Safety Briefing - Harvesting"/></Field>
          <Field label="Tanggal"><input type="date" value={sessionForm.date} onChange={e=>updateSessionForm('date',e.target.value)}/></Field>
          <Field label="Start Time"><input type="time" value={sessionForm.startTime} onChange={e=>updateSessionForm('startTime',e.target.value)}/></Field>
          <Field label="Unit"><select value={sessionForm.unit} onChange={e=>updateSessionForm('unit',e.target.value)}>{units.map(v=><option key={v}>{v}</option>)}</select></Field>
          <Field label="Lokasi / Area"><input value={sessionForm.location} onChange={e=>updateSessionForm('location',e.target.value)} placeholder="Meeting point / block / workshop / office"/></Field>
          <Field label="Facilitator"><input value={sessionForm.facilitator} onChange={e=>updateSessionForm('facilitator',e.target.value)} placeholder="Nama / jabatan facilitator"/></Field>
          <Field label="Target Participant"><input type="number" min="0" value={sessionForm.plannedParticipants} onChange={e=>updateSessionForm('plannedParticipants',Number(e.target.value||0))}/></Field>
          <Field label="Topic" wide><input value={sessionForm.topic} onChange={e=>updateSessionForm('topic',e.target.value)} placeholder="Topik bahaya, SOP, emergency, induction scope..."/></Field>
          <Field label="Material / Reference" wide><input value={sessionForm.materialRef} onChange={e=>updateSessionForm('materialRef',e.target.value)} placeholder="Material code / SOP / WI / document reference"/></Field>

          <div className={styles.gpsCard}>
            <div className={styles.evidenceTitle}><LocateFixed size={20}/><div><b>Lokasi GPS (Koordinat)</b><small>Diambil langsung dari GPS perangkat saat briefing.</small></div></div>
            {hasGpsCoords(sessionForm.latitude,sessionForm.longitude)?<div className={styles.gpsResult}><b>{coord(sessionForm.latitude)}, {coord(sessionForm.longitude)}</b><span>Akurasi ±{Math.round(Number(sessionForm.gpsAccuracyM||0))} m • {sessionForm.gpsCapturedAt?new Date(sessionForm.gpsCapturedAt).toLocaleString('id-ID'):'-'}</span></div>:<div className={styles.gpsPending}>Koordinat belum diambil.</div>}
            <button type="button" className={styles.captureButton} disabled={gpsBusy} onClick={captureGps}><MapPin size={16}/>{gpsBusy?'Mengambil GPS…':'Ambil Lokasi GPS'}</button>
          </div>

          <div className={styles.photoCard}>
            <div className={styles.evidenceTitle}><Camera size={20}/><div><b>Foto Kegiatan</b><small>HP dapat langsung membuka kamera belakang. Maksimum 15 MB.</small></div></div>
            {photoPreview?<div className={styles.photoPreview}><img src={photoPreview} alt="Preview foto Safety Briefing"/><button type="button" onClick={removePhoto}><X size={15}/> Hapus</button></div>:<label className={styles.photoPicker}><Camera size={22}/><b>Ambil / Pilih Foto</b><span>Kamera atau gallery</span><input type="file" accept="image/*" capture="environment" onChange={choosePhoto}/></label>}
          </div>

          <label className={styles.checkField}><input type="checkbox" checked={sessionForm.acknowledgementRequired} onChange={e=>updateSessionForm('acknowledgementRequired',e.target.checked)}/> Acknowledgement wajib</label>
          <label className={styles.checkField}><input type="checkbox" checked={sessionForm.quizRequired} onChange={e=>updateSessionForm('quizRequired',e.target.checked)}/> Quiz wajib</label>
          {sessionForm.quizRequired&&<Field label="Passing Score"><input type="number" min="0" max="100" value={sessionForm.passingScore} onChange={e=>updateSessionForm('passingScore',Number(e.target.value||0))}/></Field>}
        </div>
        <div className={styles.modalActions}><button type="button" className={styles.secondary} disabled={sessionSaving} onClick={()=>setSessionStep('material')}><ChevronLeft size={16}/> Kembali</button><button className={styles.primary} disabled={sessionSaving}>{sessionSaving?'Menyimpan…':'Simpan Session'}</button></div>
      </>}
    </form></div>}
  </Shell>
}

function Field({label,children,wide=false}){ return <label className={wide?styles.fieldWide:styles.field}><span>{label}</span>{children}</label> }