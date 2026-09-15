'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge, Panel, Progress, StatCard } from '../../components/Ui'
import {
  AlertTriangle, CheckCircle2, ClipboardList, Copy, Download, FileCheck2,
  Plus, Search, Send, ShieldCheck, Target, Workflow, X
} from 'lucide-react'
import { dbSelect, dbUpsert, isSupabaseConfigured } from '../../lib/supabase-rest'
import { COMPANY_MASTER, DEFAULT_COMPANY_FILTERS, companyCodeOf, filteredCompanies } from '../../lib/company-master'
import styles from './digital-jsa.module.css'

const JSA_KEY='sinshe-jsa-assessments'
const STEP_KEY='sinshe-jsa-steps'
const HAZARD_KEY='sinshe-hazards'
const units=['Head Office','PKS A','PKS B','PKS C','Estate 1','Estate 2','Estate 3','Laboratorium']
const jobTypes=['General Work','Hot Work','Working at Height','Confined Space','Electrical','Excavation','Lifting']
const statuses=['Draft','Review','Approved','Rejected','Archived']
const controlTypes=['Eliminasi','Substitusi','Engineering','Administratif','APD']

const today=()=>new Date().toISOString().slice(0,10)
const newAssessment=()=>({companyCode:'ACP',title:'',jobType:'General Work',unit:'PKS A',location:'',supervisor:'',approver:'',assessmentDate:today(),validUntil:'',status:'Draft',permitRequired:true,workDescription:'',notes:''})
const newStep=()=>({jobStep:'',hazard:'',consequence:'',likelihood:1,severity:1,existingControls:'',controlType:'Administratif',additionalControls:'',residualLikelihood:1,residualSeverity:1,owner:''})

function safeRead(key){try{const raw=localStorage.getItem(key);const rows=raw?JSON.parse(raw):[];return Array.isArray(rows)?rows:[]}catch{return[]}}
function safeWrite(key,rows){try{localStorage.setItem(key,JSON.stringify(rows));window.dispatchEvent(new CustomEvent('sinshe-central-data',{detail:{key,count:rows.length}}))}catch{}}
function mergeById(local,central){const map=new Map();(local||[]).forEach(r=>r?.id&&map.set(r.id,r));(central||[]).forEach(r=>r?.id&&map.set(r.id,r));return [...map.values()]}
function upsert(rows,item){return rows.some(r=>r.id===item.id)?rows.map(r=>r.id===item.id?item:r):[item,...rows]}
function fmt(value){return value?new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${String(value).slice(0,10)}T00:00:00`)):'-'}
function riskMeta(likelihood,severity){const score=Number(likelihood||0)*Number(severity||0);if(score>=15)return{score,label:'Extreme',tone:'red'};if(score>=9)return{score,label:'High',tone:'orange'};if(score>=4)return{score,label:'Medium',tone:'blue'};return{score,label:'Low',tone:'green'}}
function statusTone(status){return status==='Approved'?'green':status==='Review'?'blue':status==='Rejected'?'red':status==='Archived'?'purple':'orange'}
function cleanDate(value){return value?String(value).slice(0,10):''}
function assessmentFromDb(r){return{id:r.id,companyCode:r.company_code||'',title:r.title||'',jobType:r.job_type||'General Work',unit:r.unit||'',location:r.location||'',supervisor:r.supervisor||'',approver:r.approver||'',assessmentDate:cleanDate(r.assessment_date),validUntil:cleanDate(r.valid_until),status:r.status||'Draft',permitRequired:r.permit_required!==false,workDescription:r.work_description||'',notes:r.notes||''}}
function assessmentToDb(r){return{id:r.id,company_code:r.companyCode,title:r.title,job_type:r.jobType,unit:r.unit,location:r.location||'',supervisor:r.supervisor||'',approver:r.approver||'',assessment_date:r.assessmentDate,valid_until:r.validUntil||null,status:r.status,permit_required:r.permitRequired!==false,work_description:r.workDescription||null,notes:r.notes||null}}
function stepFromDb(r){return{id:r.id,jsaId:r.jsa_id,companyCode:r.company_code||'',stepNo:Number(r.step_no||1),jobStep:r.job_step||'',hazard:r.hazard||'',consequence:r.consequence||'',likelihood:Number(r.likelihood||1),severity:Number(r.severity||1),existingControls:r.existing_controls||'',controlType:r.control_type||'Administratif',additionalControls:r.additional_controls||'',residualLikelihood:Number(r.residual_likelihood||1),residualSeverity:Number(r.residual_severity||1),owner:r.owner||''}}
function stepToDb(r){const initial=riskMeta(r.likelihood,r.severity);const residual=riskMeta(r.residualLikelihood,r.residualSeverity);return{id:r.id,jsa_id:r.jsaId,company_code:r.companyCode,step_no:Number(r.stepNo),job_step:r.jobStep,hazard:r.hazard,consequence:r.consequence||null,likelihood:Number(r.likelihood),severity:Number(r.severity),initial_risk:initial.label,existing_controls:r.existingControls||null,control_type:r.controlType||null,additional_controls:r.additionalControls||null,residual_likelihood:Number(r.residualLikelihood),residual_severity:Number(r.residualSeverity),residual_risk:residual.label,owner:r.owner||null}}
function hazardToDb(r){const initial=riskMeta(r.likelihood,r.severity);const residual=riskMeta(r.residualLikelihood,r.residualSeverity);return{id:r.id,company_code:r.companyCode,title:r.title,hazard_category:r.category,unit:r.unit,location:r.location||null,likelihood:Number(r.likelihood),severity:Number(r.severity),risk_level:initial.label,controls:r.existingControls||null,owner:r.owner||null,status:r.status,review_date:r.reviewDate||null,activity:r.activity||null,consequence:r.consequence||null,jsa_no:r.jsaNo||null,assessment_type:'JSA',residual_likelihood:Number(r.residualLikelihood),residual_severity:Number(r.residualSeverity),residual_risk_level:residual.label,control_type:r.controlType||null,additional_controls:r.additionalControls||null,due_date:r.dueDate||null,notes:r.notes||null}}

export default function DigitalJSA(){
  const router=useRouter()
  const [assessments,setAssessments]=useState([])
  const [steps,setSteps]=useState([])
  const [filters,setFilters]=useState(DEFAULT_COMPANY_FILTERS)
  const [search,setSearch]=useState('')
  const [statusFilter,setStatusFilter]=useState('All')
  const [selectedId,setSelectedId]=useState('')
  const [assessmentModal,setAssessmentModal]=useState(false)
  const [stepModal,setStepModal]=useState(false)
  const [assessmentForm,setAssessmentForm]=useState(()=>newAssessment())
  const [stepForm,setStepForm]=useState(()=>newStep())
  const [editingStepId,setEditingStepId]=useState('')
  const [notice,setNotice]=useState('')
  const [source,setSource]=useState('Local cache')

  useEffect(()=>{
    let active=true
    async function load(){
      const localA=safeRead(JSA_KEY); const localS=safeRead(STEP_KEY)
      if(active){setAssessments(localA);setSteps(localS);setSelectedId(localA[0]?.id||'')}
      if(!isSupabaseConfigured())return
      try{
        const [centralA,centralS]=await Promise.all([
          dbSelect('jsa_assessments','select=*&order=assessment_date.desc,updated_at.desc'),
          dbSelect('jsa_steps','select=*&order=jsa_id.asc,step_no.asc'),
        ])
        const mergedA=mergeById(localA,(centralA||[]).map(assessmentFromDb))
        const mergedS=mergeById(localS,(centralS||[]).map(stepFromDb))
        if(active){setAssessments(mergedA);setSteps(mergedS);setSelectedId(mergedA[0]?.id||'');safeWrite(JSA_KEY,mergedA);safeWrite(STEP_KEY,mergedS);setSource('Supabase central data')}
      }catch{if(active)setSource('Offline / local cache')}
    }
    load();return()=>{active=false}
  },[])

  const companies=useMemo(()=>filteredCompanies(filters),[filters])
  const allowed=useMemo(()=>new Set(companies.map(c=>c.code)),[companies])
  const specific=filters.company!=='All'||filters.region!=='All'||filters.province!=='All'||filters.pic!=='All'
  const rows=useMemo(()=>assessments.filter(a=>{
    const code=companyCodeOf(a); const companyMatch=!code?!specific:allowed.has(code)
    const q=search.trim().toLowerCase();const text=[a.id,a.companyCode,a.title,a.jobType,a.unit,a.location,a.supervisor,a.approver].join(' ').toLowerCase()
    return companyMatch&&(!q||text.includes(q))&&(statusFilter==='All'||a.status===statusFilter)
  }).sort((a,b)=>String(b.assessmentDate||'').localeCompare(String(a.assessmentDate||''))),[assessments,allowed,specific,search,statusFilter])

  const selected=rows.find(a=>a.id===selectedId)||rows[0]||null
  const selectedSteps=useMemo(()=>selected?steps.filter(s=>s.jsaId===selected.id).sort((a,b)=>a.stepNo-b.stepNo):[],[steps,selected])
  const approved=rows.filter(a=>a.status==='Approved').length
  const inReview=rows.filter(a=>a.status==='Review').length
  const activeStepIds=new Set(rows.map(a=>a.id))
  const scopedSteps=steps.filter(s=>activeStepIds.has(s.jsaId))
  const initialHigh=scopedSteps.filter(s=>['Extreme','High'].includes(riskMeta(s.likelihood,s.severity).label)).length
  const residualHigh=scopedSteps.filter(s=>['Extreme','High'].includes(riskMeta(s.residualLikelihood,s.residualSeverity).label)).length
  const reduction=initialHigh?Math.max(0,Math.round((initialHigh-residualHigh)/initialHigh*100)):0

  function flash(text){setNotice(text);setTimeout(()=>setNotice(''),3400)}
  async function persistAssessment(item,message){const next=upsert(assessments,item);setAssessments(next);safeWrite(JSA_KEY,next);setSelectedId(item.id);if(isSupabaseConfigured()){try{await dbUpsert('jsa_assessments',[assessmentToDb(item)],'id');setSource('Supabase central data')}catch(err){flash(`${message} Tersimpan lokal, sync central gagal: ${err.message}`);return false}}flash(message);return true}
  async function persistStep(item,message){const next=upsert(steps,item);setSteps(next);safeWrite(STEP_KEY,next);if(isSupabaseConfigured()){try{await dbUpsert('jsa_steps',[stepToDb(item)],'id')}catch(err){flash(`${message} Tersimpan lokal, sync step gagal: ${err.message}`);return false}}flash(message);return true}

  async function saveAssessment(e){
    e.preventDefault()
    if(!assessmentForm.companyCode||!assessmentForm.title.trim()||!assessmentForm.location.trim()||!assessmentForm.supervisor.trim()||!assessmentForm.approver.trim()){flash('Lengkapi PT, judul pekerjaan, lokasi, supervisor dan approver.');return}
    const year=new Date(`${assessmentForm.assessmentDate}T00:00:00`).getFullYear()
    const seq=Math.max(0,...assessments.map(a=>Number(String(a.id||'').split('-').pop())||0))+1
    const item={...assessmentForm,id:`JSA-${year}-${String(seq).padStart(4,'0')}`,status:'Draft'}
    setAssessmentModal(false);setAssessmentForm(newAssessment());await persistAssessment(item,`${item.id} berhasil dibuat.`)
  }

  function openStep(step=null){
    if(!selected)return
    if(selected.status==='Approved'||selected.status==='Archived'){flash('JSA Approved/Archived dikunci. Revisi dilakukan melalui JSA baru.');return}
    if(step){setEditingStepId(step.id);setStepForm({...step})}else{setEditingStepId('');setStepForm({...newStep(),owner:selected.supervisor})}
    setStepModal(true)
  }

  async function saveStep(e){
    e.preventDefault();if(!selected)return
    if(!stepForm.jobStep.trim()||!stepForm.hazard.trim()||!stepForm.existingControls.trim()||!stepForm.additionalControls.trim()||!stepForm.owner.trim()){flash('Lengkapi job step, hazard, existing control, additional control dan owner.');return}
    const nextNo=editingStepId?stepForm.stepNo:Math.max(0,...selectedSteps.map(s=>Number(s.stepNo)||0))+1
    const item={...stepForm,id:editingStepId||`${selected.id}-S${String(nextNo).padStart(2,'0')}`,jsaId:selected.id,companyCode:selected.companyCode,stepNo:nextNo}
    setStepModal(false);setEditingStepId('');setStepForm(newStep());await persistStep(item,`${item.id} berhasil disimpan.`)
  }

  async function submitReview(){
    if(!selected)return
    if(!selectedSteps.length){flash('Tambahkan minimal 1 job step sebelum submit review.');return}
    const incomplete=selectedSteps.filter(s=>!s.existingControls?.trim()||!s.additionalControls?.trim()||!s.owner?.trim())
    if(incomplete.length){flash(`${incomplete.length} step belum lengkap kontrol/PIC.`);return}
    await persistAssessment({...selected,status:'Review'},`${selected.id} dikirim untuk review.`)
  }

  async function publishHazards(jsa,jsaSteps){
    const hazards=jsaSteps.map(s=>({
      id:`RSK-${s.id}`,companyCode:jsa.companyCode,assessmentType:'JSA',jsaNo:jsa.id,activity:s.jobStep,title:s.hazard,category:'Lainnya',unit:jsa.unit,location:jsa.location,consequence:s.consequence,
      likelihood:s.likelihood,severity:s.severity,existingControls:s.existingControls,controlType:s.controlType,additionalControls:s.additionalControls,
      residualLikelihood:s.residualLikelihood,residualSeverity:s.residualSeverity,owner:s.owner||jsa.supervisor,
      status:['Extreme','High'].includes(riskMeta(s.residualLikelihood,s.residualSeverity).label)?'Monitoring':'Controlled',dueDate:jsa.validUntil||'',reviewDate:jsa.validUntil||'',notes:`Generated from ${jsa.id}`
    }))
    const existing=safeRead(HAZARD_KEY);const merged=mergeById(existing,hazards);safeWrite(HAZARD_KEY,merged)
    if(isSupabaseConfigured())await dbUpsert('hazards',hazards.map(hazardToDb),'id')
  }

  async function approveJsa(){
    if(!selected)return
    if(selected.status!=='Review'){flash('JSA harus berstatus Review sebelum Approved.');return}
    if(!selectedSteps.length){flash('Tidak ada job step untuk di-approve.');return}
    const extreme=selectedSteps.filter(s=>riskMeta(s.residualLikelihood,s.residualSeverity).label==='Extreme')
    if(extreme.length){flash(`Belum bisa Approved. ${extreme.length} step masih memiliki residual risk Extreme.`);return}
    try{await publishHazards(selected,selectedSteps)}catch(err){flash(`Publish Risk Register gagal: ${err.message}`);return}
    await persistAssessment({...selected,status:'Approved'},`${selected.id} Approved dan ${selectedSteps.length} risk dipublish ke Hazard & Risk Register.`)
  }

  async function rejectJsa(){if(!selected)return;await persistAssessment({...selected,status:'Rejected'},`${selected.id} dikembalikan untuk revisi.`)}
  async function reviseJsa(){if(!selected)return;await persistAssessment({...selected,status:'Draft'},`${selected.id} dibuka kembali sebagai Draft.`)}

  async function copyAndOpenPtw(){
    if(!selected)return
    try{await navigator.clipboard.writeText(selected.id)}catch{}
    try{sessionStorage.setItem('sinshe-jsa-last-reference',JSON.stringify({id:selected.id,companyCode:selected.companyCode,title:selected.title,jobType:selected.jobType,unit:selected.unit,location:selected.location}))}catch{}
    flash(`${selected.id} disalin. Membuka Permit to Work…`)
    setTimeout(()=>router.push('/permit-to-work'),550)
  }

  function exportCSV(){
    const header=['JSA No','Company/PT','Status','Assessment Date','Valid Until','Job Type','Job Title','Unit','Location','Supervisor','Approver','Step No','Job Step','Hazard','Consequence','Likelihood','Severity','Initial Risk','Existing Controls','Control Type','Additional Controls','Residual Likelihood','Residual Severity','Residual Risk','Owner']
    const data=[]
    rows.forEach(a=>{const ss=steps.filter(s=>s.jsaId===a.id).sort((x,y)=>x.stepNo-y.stepNo);if(!ss.length)data.push([a.id,a.companyCode,a.status,a.assessmentDate,a.validUntil,a.jobType,a.title,a.unit,a.location,a.supervisor,a.approver]);else ss.forEach(s=>{const initial=riskMeta(s.likelihood,s.severity);const residual=riskMeta(s.residualLikelihood,s.residualSeverity);data.push([a.id,a.companyCode,a.status,a.assessmentDate,a.validUntil,a.jobType,a.title,a.unit,a.location,a.supervisor,a.approver,s.stepNo,s.jobStep,s.hazard,s.consequence,s.likelihood,s.severity,`${initial.label} ${initial.score}`,s.existingControls,s.controlType,s.additionalControls,s.residualLikelihood,s.residualSeverity,`${residual.label} ${residual.score}`,s.owner])})})
    const csv=[header,...data].map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`SINSHE_Digital_JSA_${today()}.csv`;a.click();URL.revokeObjectURL(url)
  }

  const maxResidual=selectedSteps.reduce((best,s)=>Math.max(best,riskMeta(s.residualLikelihood,s.residualSeverity).score),0)
  const selectedComplete=selectedSteps.length?Math.round(selectedSteps.filter(s=>s.additionalControls&&s.owner).length/selectedSteps.length*100):0

  return <Shell title="Digital JSA" subtitle="Job Safety Analysis digital: job step, hazard, risk, control, residual risk, approval dan integrasi ke Risk Register.">
    <CompanyScopeBar filters={filters} onChange={setFilters} onReset={()=>setFilters(DEFAULT_COMPANY_FILTERS)}/>
    {notice&&<div className={styles.notice}><CheckCircle2 size={18}/>{notice}</div>}

    <div className={styles.flow}>
      {['Job Breakdown','Hazard Identification','Risk Assessment','Control','Residual Risk','Approval'].map((x,i)=><div key={x}><span>{i+1}</span><b>{x}</b></div>)}
    </div>

    <div className="stats-grid four">
      <StatCard label="JSA Register" value={rows.length} hint={source} tone="blue" icon={<ClipboardList/>}/>
      <StatCard label="In Review" value={inReview} hint="menunggu approval" tone="orange" icon={<Workflow/>}/>
      <StatCard label="Approved" value={approved} hint="siap referensi PTW" tone="green" icon={<FileCheck2/>}/>
      <StatCard label="High Risk Reduction" value={`${reduction}%`} hint={`${initialHigh} initial → ${residualHigh} residual`} tone="purple" icon={<Target/>}/>
    </div>

    <div className={styles.toolbar}><div><h2>Digital Job Safety Analysis</h2><p>Satu JSA dapat memiliki banyak job step dan otomatis menjadi risk register setelah approval.</p></div><div className={styles.actions}><button className={styles.secondary} onClick={exportCSV}><Download size={17}/> Export CSV</button><button className={styles.primary} onClick={()=>{setAssessmentForm({...newAssessment(),companyCode:filters.company!=='All'?filters.company:(companies[0]?.code||'ACP')});setAssessmentModal(true)}}><Plus size={18}/> JSA Baru</button></div></div>

    <Panel>
      <div className={styles.filters}><label className={styles.search}><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari JSA, pekerjaan, PT, supervisor, lokasi..."/></label><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All</option>{statuses.map(v=><option key={v}>{v}</option>)}</select></div>
      <div className="table-wrap"><table><thead><tr><th>JSA No</th><th>PT</th><th>Pekerjaan</th><th>Unit / Lokasi</th><th>Tanggal</th><th>Supervisor / Approver</th><th>Steps</th><th>Residual Max</th><th>Status</th></tr></thead><tbody>
        {rows.map(a=>{const ss=steps.filter(s=>s.jsaId===a.id);const max=ss.reduce((v,s)=>Math.max(v,riskMeta(s.residualLikelihood,s.residualSeverity).score),0);const rm=riskMeta(max?max:1,1);return <tr key={a.id} onClick={()=>setSelectedId(a.id)} className={selected?.id===a.id?styles.selectedRow:''}><td><b>{a.id}</b><small className={styles.block}>{a.jobType}</small></td><td><b>{a.companyCode}</b></td><td><b>{a.title}</b><small className={styles.block}>{a.workDescription||'-'}</small></td><td>{a.unit}<small className={styles.block}>{a.location}</small></td><td>{fmt(a.assessmentDate)}<small className={styles.block}>Valid: {fmt(a.validUntil)}</small></td><td>{a.supervisor}<small className={styles.block}>{a.approver}</small></td><td><b>{ss.length}</b></td><td>{ss.length?<Badge tone={rm.tone}>{rm.label} · {max}</Badge>:'-'}</td><td><Badge tone={statusTone(a.status)}>{a.status}</Badge></td></tr>})}
        {!rows.length&&<tr><td colSpan="9" className={styles.empty}>Belum ada JSA pada filter ini. Buat JSA baru untuk memulai.</td></tr>}
      </tbody></table></div>
    </Panel>

    {selected&&<div className="dashboard-split mt">
      <Panel title={`${selected.id} · ${selected.title}`} action={selected.status}>
        <div className={styles.detailGrid}><div><span>Company / PT</span><b>{selected.companyCode}</b></div><div><span>Job Type</span><b>{selected.jobType}</b></div><div><span>Unit / Lokasi</span><b>{selected.unit} · {selected.location}</b></div><div><span>Supervisor</span><b>{selected.supervisor}</b></div><div><span>Approver</span><b>{selected.approver}</b></div><div><span>Permit to Work</span><b>{selected.permitRequired?'Required':'Not Required'}</b></div></div>
        <div className={styles.progressBox}><span><b>JSA completeness</b><small>{selectedSteps.length} job step • residual max {maxResidual||0}</small></span><b>{selectedComplete}%</b></div><Progress value={selectedComplete} tone={selectedComplete===100?'green':'orange'}/>
        <div className={styles.detailActions}>
          {['Draft','Rejected'].includes(selected.status)&&<button className={styles.primary} onClick={submitReview}><Send size={15}/> Submit Review</button>}
          {selected.status==='Review'&&<><button className={styles.primary} onClick={approveJsa}><ShieldCheck size={15}/> Approve & Publish Risk</button><button className={styles.danger} onClick={rejectJsa}><X size={15}/> Reject</button></>}
          {selected.status==='Rejected'&&<button className={styles.secondary} onClick={reviseJsa}>Open Draft</button>}
          {selected.status==='Approved'&&selected.permitRequired&&<button className={styles.secondary} onClick={copyAndOpenPtw}><Copy size={15}/> Copy JSA No → PTW</button>}
        </div>
      </Panel>

      <Panel title="Risk Summary">
        <div className={styles.riskSummary}>{['Extreme','High','Medium','Low'].map(label=>{const count=selectedSteps.filter(s=>riskMeta(s.residualLikelihood,s.residualSeverity).label===label).length;const tone=label==='Extreme'?'red':label==='High'?'orange':label==='Medium'?'blue':'green';return <div key={label}><span>{label}</span><b>{count}</b><Badge tone={tone}>Residual</Badge></div>})}</div>
        <div className={styles.info}><AlertTriangle size={19}/><div><b>Approval gate</b><span>JSA tidak dapat di-approve bila masih ada residual risk Extreme. Setelah Approved, setiap step otomatis dipublish ke Hazard & Risk Register dengan referensi JSA No.</span></div></div>
      </Panel>
    </div>}

    {selected&&<Panel title="JSA Job Steps" action={`${selectedSteps.length} step`} className="mt">
      <div className={styles.stepToolbar}><p>Breakdown pekerjaan → hazard → control → residual risk.</p>{!['Approved','Archived'].includes(selected.status)&&<button className={styles.primary} onClick={()=>openStep()}><Plus size={16}/> Tambah Step</button>}</div>
      <div className="table-wrap"><table><thead><tr><th>#</th><th>Job Step</th><th>Hazard / Consequence</th><th>Initial Risk</th><th>Existing Control</th><th>Additional Control</th><th>Residual Risk</th><th>Owner</th><th></th></tr></thead><tbody>
        {selectedSteps.map(s=>{const initial=riskMeta(s.likelihood,s.severity);const residual=riskMeta(s.residualLikelihood,s.residualSeverity);return <tr key={s.id}><td><b>{s.stepNo}</b></td><td><b>{s.jobStep}</b></td><td><b>{s.hazard}</b><small className={styles.block}>{s.consequence||'-'}</small></td><td><Badge tone={initial.tone}>{initial.label} · {initial.score}</Badge><small className={styles.block}>L{s.likelihood} × S{s.severity}</small></td><td>{s.existingControls}<small className={styles.block}>{s.controlType}</small></td><td>{s.additionalControls}</td><td><Badge tone={residual.tone}>{residual.label} · {residual.score}</Badge><small className={styles.block}>L{s.residualLikelihood} × S{s.residualSeverity}</small></td><td>{s.owner}</td><td>{!['Approved','Archived'].includes(selected.status)&&<button className={styles.edit} onClick={()=>openStep(s)}>Edit</button>}</td></tr>})}
        {!selectedSteps.length&&<tr><td colSpan="9" className={styles.empty}>Belum ada job step. Tambahkan step pertama.</td></tr>}
      </tbody></table></div>
    </Panel>}

    {assessmentModal&&<div className={styles.backdrop} onMouseDown={e=>{if(e.target===e.currentTarget)setAssessmentModal(false)}}><form className={styles.modal} onSubmit={saveAssessment}><div className={styles.modalHeader}><div><span>DIGITAL JSA</span><h2>JSA Baru</h2><p>Definisikan pekerjaan dan pihak yang bertanggung jawab.</p></div><button type="button" onClick={()=>setAssessmentModal(false)}><X size={19}/></button></div><div className={styles.formGrid}>
      <Field label="Company / PT"><select value={assessmentForm.companyCode} onChange={e=>setAssessmentForm({...assessmentForm,companyCode:e.target.value})}>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></Field>
      <Field label="Job Type"><select value={assessmentForm.jobType} onChange={e=>setAssessmentForm({...assessmentForm,jobType:e.target.value})}>{jobTypes.map(v=><option key={v}>{v}</option>)}</select></Field>
      <Field label="Job Title" full><input value={assessmentForm.title} onChange={e=>setAssessmentForm({...assessmentForm,title:e.target.value})} placeholder="Contoh: Penggantian valve steam line"/></Field>
      <Field label="Unit"><select value={assessmentForm.unit} onChange={e=>setAssessmentForm({...assessmentForm,unit:e.target.value})}>{units.map(v=><option key={v}>{v}</option>)}</select></Field>
      <Field label="Location"><input value={assessmentForm.location} onChange={e=>setAssessmentForm({...assessmentForm,location:e.target.value})}/></Field>
      <Field label="Assessment Date"><input type="date" value={assessmentForm.assessmentDate} onChange={e=>setAssessmentForm({...assessmentForm,assessmentDate:e.target.value})}/></Field>
      <Field label="Valid Until"><input type="date" value={assessmentForm.validUntil} onChange={e=>setAssessmentForm({...assessmentForm,validUntil:e.target.value})}/></Field>
      <Field label="Supervisor"><input value={assessmentForm.supervisor} onChange={e=>setAssessmentForm({...assessmentForm,supervisor:e.target.value})}/></Field>
      <Field label="Approver"><input value={assessmentForm.approver} onChange={e=>setAssessmentForm({...assessmentForm,approver:e.target.value})}/></Field>
      <Field label="Work Description" full><textarea rows="3" value={assessmentForm.workDescription} onChange={e=>setAssessmentForm({...assessmentForm,workDescription:e.target.value})}/></Field>
      <label className={styles.checkbox}><input type="checkbox" checked={assessmentForm.permitRequired} onChange={e=>setAssessmentForm({...assessmentForm,permitRequired:e.target.checked})}/> Permit to Work required</label>
      <Field label="Notes"><input value={assessmentForm.notes} onChange={e=>setAssessmentForm({...assessmentForm,notes:e.target.value})}/></Field>
    </div><div className={styles.modalActions}><button type="button" className={styles.secondary} onClick={()=>setAssessmentModal(false)}>Batal</button><button className={styles.primary}>Simpan JSA</button></div></form></div>}

    {stepModal&&selected&&<div className={styles.backdrop} onMouseDown={e=>{if(e.target===e.currentTarget)setStepModal(false)}}><form className={`${styles.modal} ${styles.wide}`} onSubmit={saveStep}><div className={styles.modalHeader}><div><span>{selected.id}</span><h2>{editingStepId?'Edit Job Step':'Tambah Job Step'}</h2><p>Nilai risk = Likelihood × Severity (1–5).</p></div><button type="button" onClick={()=>setStepModal(false)}><X size={19}/></button></div><div className={styles.formGrid}>
      <Field label="Job Step" full><input value={stepForm.jobStep} onChange={e=>setStepForm({...stepForm,jobStep:e.target.value})} placeholder="Urutan aktivitas kerja"/></Field>
      <Field label="Hazard"><input value={stepForm.hazard} onChange={e=>setStepForm({...stepForm,hazard:e.target.value})}/></Field>
      <Field label="Consequence"><input value={stepForm.consequence} onChange={e=>setStepForm({...stepForm,consequence:e.target.value})}/></Field>
      <Field label="Initial Likelihood"><select value={stepForm.likelihood} onChange={e=>setStepForm({...stepForm,likelihood:Number(e.target.value)})}>{[1,2,3,4,5].map(v=><option key={v}>{v}</option>)}</select></Field>
      <Field label="Initial Severity"><select value={stepForm.severity} onChange={e=>setStepForm({...stepForm,severity:Number(e.target.value)})}>{[1,2,3,4,5].map(v=><option key={v}>{v}</option>)}</select></Field>
      <div className={styles.liveRisk}><span>Initial Risk</span><Badge tone={riskMeta(stepForm.likelihood,stepForm.severity).tone}>{riskMeta(stepForm.likelihood,stepForm.severity).label} · {riskMeta(stepForm.likelihood,stepForm.severity).score}</Badge></div>
      <Field label="Control Type"><select value={stepForm.controlType} onChange={e=>setStepForm({...stepForm,controlType:e.target.value})}>{controlTypes.map(v=><option key={v}>{v}</option>)}</select></Field>
      <Field label="Existing Controls" full><textarea rows="3" value={stepForm.existingControls} onChange={e=>setStepForm({...stepForm,existingControls:e.target.value})}/></Field>
      <Field label="Additional Controls" full><textarea rows="3" value={stepForm.additionalControls} onChange={e=>setStepForm({...stepForm,additionalControls:e.target.value})}/></Field>
      <Field label="Residual Likelihood"><select value={stepForm.residualLikelihood} onChange={e=>setStepForm({...stepForm,residualLikelihood:Number(e.target.value)})}>{[1,2,3,4,5].map(v=><option key={v}>{v}</option>)}</select></Field>
      <Field label="Residual Severity"><select value={stepForm.residualSeverity} onChange={e=>setStepForm({...stepForm,residualSeverity:Number(e.target.value)})}>{[1,2,3,4,5].map(v=><option key={v}>{v}</option>)}</select></Field>
      <div className={styles.liveRisk}><span>Residual Risk</span><Badge tone={riskMeta(stepForm.residualLikelihood,stepForm.residualSeverity).tone}>{riskMeta(stepForm.residualLikelihood,stepForm.residualSeverity).label} · {riskMeta(stepForm.residualLikelihood,stepForm.residualSeverity).score}</Badge></div>
      <Field label="Control Owner"><input value={stepForm.owner} onChange={e=>setStepForm({...stepForm,owner:e.target.value})}/></Field>
    </div><div className={styles.modalActions}><button type="button" className={styles.secondary} onClick={()=>setStepModal(false)}>Batal</button><button className={styles.primary}>Simpan Step</button></div></form></div>}
  </Shell>
}

function Field({label,children,full=false}){return <label className={full?styles.full:''}><span>{label}</span>{children}</label>}
