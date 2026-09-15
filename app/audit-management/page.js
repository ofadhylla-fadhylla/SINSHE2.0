'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge, Panel, Progress, StatCard } from '../../components/Ui'
import {
  AlertTriangle, CheckCircle2, ClipboardCheck, Download, FileSearch, Plus,
  Search, ShieldCheck, Target, UserCheck, X
} from 'lucide-react'
import { dbSelect, dbUpsert, getStoredProfile, isSupabaseConfigured } from '../../lib/supabase-rest'
import { COMPANY_MASTER, DEFAULT_COMPANY_FILTERS, companyCodeOf, filteredCompanies } from '../../lib/company-master'
import styles from './audit-management.module.css'

const AUDIT_KEY='sinshe-audit-plans'
const CHECK_KEY='sinshe-audit-checklist'
const FINDING_KEY='sinshe-audit-findings'
const CA_KEY='sinshe-corrective-actions'
const units=['Head Office','PKS A','PKS B','PKS C','Estate 1','Estate 2','Estate 3','Laboratorium']
const auditTypes=['Internal Audit','Legal Compliance Audit','ISO 45001','ISO 14001','ISPO','ISCC','Buyer / Customer','Contractor HSE','Other']
const auditStatuses=['Planned','In Progress','Review','Closed','Cancelled']
const findingTypes=['NC Major','NC Minor','OFI','Observation','Positive']
const findingStatuses=['Open','Action Pending','Verification','Closed']
const checklistResults=['Pending','Conform','Non-Conform','N/A']

const today=()=>new Date().toISOString().slice(0,10)
const newAudit=()=>({companyCode:'ACP',auditType:'Internal Audit',title:'',standard:'',unit:'PKS A',location:'',leadAuditor:'',auditTeam:'',plannedDate:today(),endDate:'',status:'Planned',scope:'',summary:''})
const newCheck=()=>({category:'',clause:'',requirement:'',result:'Pending',note:'',evidence:''})
const newFinding=()=>({findingType:'NC Minor',clause:'',finding:'',rootCause:'',correctiveAction:'',pic:'',dueDate:'',status:'Open',evidence:'',verifiedBy:''})

function safeRead(key){try{const raw=localStorage.getItem(key);const rows=raw?JSON.parse(raw):[];return Array.isArray(rows)?rows:[]}catch{return[]}}
function safeWrite(key,rows){try{localStorage.setItem(key,JSON.stringify(rows));window.dispatchEvent(new CustomEvent('sinshe-central-data',{detail:{key,count:rows.length}}))}catch{}}
function mergeById(local,central){const map=new Map();(local||[]).forEach(r=>r?.id&&map.set(r.id,r));(central||[]).forEach(r=>r?.id&&map.set(r.id,r));return [...map.values()]}
function upsert(rows,item){return rows.some(r=>r.id===item.id)?rows.map(r=>r.id===item.id?item:r):[item,...rows]}
function fmt(value){return value?new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${String(value).slice(0,10)}T00:00:00`)):'-'}
function daysTo(value){if(!value)return null;const now=new Date();now.setHours(0,0,0,0);const d=new Date(`${String(value).slice(0,10)}T00:00:00`);return Math.ceil((d-now)/86400000)}
function auditTone(status){return status==='Closed'?'green':status==='In Progress'?'blue':status==='Review'?'purple':status==='Cancelled'?'red':'orange'}
function findingTone(type){return type==='NC Major'?'red':type==='NC Minor'?'orange':type==='OFI'?'blue':type==='Positive'?'green':'purple'}
function findingStatusTone(status){return status==='Closed'?'green':status==='Verification'?'blue':status==='Action Pending'?'orange':'red'}
function checkTone(result){return result==='Conform'?'green':result==='Non-Conform'?'red':result==='N/A'?'blue':'orange'}
function scoreOf(rows){const assessed=rows.filter(r=>['Conform','Non-Conform'].includes(r.result));if(!assessed.length)return 0;return Math.round(assessed.filter(r=>r.result==='Conform').length/assessed.length*100)}

function auditFromDb(r){return{id:r.id,companyCode:r.company_code||'',auditType:r.audit_type||'Internal Audit',title:r.title||'',standard:r.standard||'',unit:r.unit||'',location:r.location||'',leadAuditor:r.lead_auditor||'',auditTeam:r.audit_team||'',plannedDate:r.planned_date||'',endDate:r.end_date||'',status:r.status||'Planned',scope:r.scope||'',score:r.score===null?null:Number(r.score),summary:r.summary||''}}
function auditToDb(r){return{id:r.id,company_code:r.companyCode,audit_type:r.auditType,title:r.title,standard:r.standard||null,unit:r.unit,location:r.location||null,lead_auditor:r.leadAuditor||null,audit_team:r.auditTeam||null,planned_date:r.plannedDate,end_date:r.endDate||null,status:r.status,scope:r.scope||null,score:r.score===null||r.score===undefined?null:Number(r.score),summary:r.summary||null}}
function checkFromDb(r){return{id:r.id,auditId:r.audit_id,companyCode:r.company_code||'',unit:r.unit||'',category:r.category||'',clause:r.clause||'',requirement:r.requirement||'',result:r.result||'Pending',note:r.note||'',evidence:r.evidence||''}}
function checkToDb(r){return{id:r.id,audit_id:r.auditId,company_code:r.companyCode,unit:r.unit,category:r.category||null,clause:r.clause||null,requirement:r.requirement,result:r.result,note:r.note||null,evidence:r.evidence||null}}
function findingFromDb(r){return{id:r.id,auditId:r.audit_id,companyCode:r.company_code||'',unit:r.unit||'',findingType:r.finding_type||'Observation',clause:r.clause||'',finding:r.finding||'',rootCause:r.root_cause||'',correctiveAction:r.corrective_action||'',pic:r.pic||'',dueDate:r.due_date||'',status:r.status||'Open',evidence:r.evidence||'',closureDate:r.closure_date||'',verifiedBy:r.verified_by||''}}
function findingToDb(r){return{id:r.id,audit_id:r.auditId,company_code:r.companyCode,unit:r.unit,finding_type:r.findingType,clause:r.clause||null,finding:r.finding,root_cause:r.rootCause||null,corrective_action:r.correctiveAction||null,pic:r.pic||null,due_date:r.dueDate||null,status:r.status,evidence:r.evidence||null,closure_date:r.closureDate||null,verified_by:r.verifiedBy||null}}
function caToDb(a){return{id:a.id,company_code:a.companyCode,source:a.source,source_id:a.sourceId,title:a.title,unit:a.unit,location:a.location||'',category:a.category||'',priority:a.priority,pic:a.pic||'',due_date:a.dueDate||null,status:a.status,progress:a.progress,evidence:a.evidence||''}}

export default function AuditManagement(){
  const [audits,setAudits]=useState([])
  const [checklist,setChecklist]=useState([])
  const [findings,setFindings]=useState([])
  const [filters,setFilters]=useState(DEFAULT_COMPANY_FILTERS)
  const [search,setSearch]=useState('')
  const [typeFilter,setTypeFilter]=useState('All')
  const [statusFilter,setStatusFilter]=useState('All')
  const [selectedId,setSelectedId]=useState('')
  const [auditModal,setAuditModal]=useState(false)
  const [checkModal,setCheckModal]=useState(false)
  const [findingModal,setFindingModal]=useState(false)
  const [auditForm,setAuditForm]=useState(()=>newAudit())
  const [checkForm,setCheckForm]=useState(()=>newCheck())
  const [findingForm,setFindingForm]=useState(()=>newFinding())
  const [notice,setNotice]=useState('')
  const [source,setSource]=useState('Local cache')
  const profile=getStoredProfile()
  const canManage=!profile||profile.role!=='Viewer'

  useEffect(()=>{
    let active=true
    async function load(){
      const localA=safeRead(AUDIT_KEY),localC=safeRead(CHECK_KEY),localF=safeRead(FINDING_KEY)
      if(active){setAudits(localA);setChecklist(localC);setFindings(localF);setSelectedId(localA[0]?.id||'')}
      if(!isSupabaseConfigured())return
      try{
        const [a,c,f]=await Promise.all([
          dbSelect('audit_plans','select=*&order=planned_date.desc,updated_at.desc'),
          dbSelect('audit_checklist','select=*&order=audit_id.asc,created_at.asc'),
          dbSelect('audit_findings','select=*&order=due_date.asc,updated_at.desc'),
        ])
        const nextA=mergeById(localA,(a||[]).map(auditFromDb)),nextC=mergeById(localC,(c||[]).map(checkFromDb)),nextF=mergeById(localF,(f||[]).map(findingFromDb))
        if(active){setAudits(nextA);setChecklist(nextC);setFindings(nextF);setSelectedId(nextA[0]?.id||'');safeWrite(AUDIT_KEY,nextA);safeWrite(CHECK_KEY,nextC);safeWrite(FINDING_KEY,nextF);setSource('Supabase central data')}
      }catch{if(active)setSource('Offline / local cache')}
    }
    load();return()=>{active=false}
  },[])

  const companies=useMemo(()=>filteredCompanies(filters),[filters])
  const allowed=useMemo(()=>new Set(companies.map(c=>c.code)),[companies])
  const specific=filters.company!=='All'||filters.region!=='All'||filters.province!=='All'||filters.pic!=='All'
  const rows=useMemo(()=>audits.filter(a=>{
    const code=companyCodeOf(a);const q=search.trim().toLowerCase();const companyMatch=code?allowed.has(code):!specific
    const text=[a.id,a.companyCode,a.title,a.auditType,a.standard,a.unit,a.location,a.leadAuditor].join(' ').toLowerCase()
    return companyMatch&&(!q||text.includes(q))&&(typeFilter==='All'||a.auditType===typeFilter)&&(statusFilter==='All'||a.status===statusFilter)
  }).sort((a,b)=>String(b.plannedDate||'').localeCompare(String(a.plannedDate||''))),[audits,allowed,specific,search,typeFilter,statusFilter])

  const selected=audits.find(a=>a.id===selectedId)||rows[0]||null
  const selectedChecks=useMemo(()=>selected?checklist.filter(c=>c.auditId===selected.id):[],[checklist,selected])
  const selectedFindings=useMemo(()=>selected?findings.filter(f=>f.auditId===selected.id).sort((a,b)=>String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999'))):[],[findings,selected])
  const scopedIds=useMemo(()=>new Set(rows.map(a=>a.id)),[rows])
  const scopedFindings=findings.filter(f=>scopedIds.has(f.auditId))
  const openFindings=scopedFindings.filter(f=>f.status!=='Closed').length
  const overdueFindings=scopedFindings.filter(f=>f.status!=='Closed'&&f.dueDate&&daysTo(f.dueDate)<0).length
  const closedAudits=rows.filter(a=>a.status==='Closed').length
  const closedFindingRate=scopedFindings.length?Math.round(scopedFindings.filter(f=>f.status==='Closed').length/scopedFindings.length*100):0
  const selectedScore=scoreOf(selectedChecks)

  function flash(text){setNotice(text);setTimeout(()=>setNotice(''),3400)}
  function guard(){if(canManage)return true;flash('Role Viewer hanya dapat melihat Audit Management.');return false}
  async function persistAudit(item,message){
    const next=upsert(audits,item);setAudits(next);safeWrite(AUDIT_KEY,next);setSelectedId(item.id)
    if(isSupabaseConfigured()){try{await dbUpsert('audit_plans',[auditToDb(item)],'id');setSource('Supabase central data')}catch(err){flash(`Tersimpan lokal, sync audit gagal: ${err.message}`);return}}
    flash(message)
  }
  async function persistCheck(item,message='Checklist diperbarui.'){
    const next=upsert(checklist,item);setChecklist(next);safeWrite(CHECK_KEY,next)
    if(isSupabaseConfigured()){try{await dbUpsert('audit_checklist',[checkToDb(item)],'id')}catch(err){flash(`Tersimpan lokal, sync checklist gagal: ${err.message}`);return}}
    flash(message)
  }
  async function persistFinding(item,message='Finding diperbarui.'){
    const next=upsert(findings,item);setFindings(next);safeWrite(FINDING_KEY,next)
    if(isSupabaseConfigured()){try{await dbUpsert('audit_findings',[findingToDb(item)],'id')}catch(err){flash(`Tersimpan lokal, sync finding gagal: ${err.message}`);return}}
    flash(message)
  }

  async function saveAudit(e){
    e.preventDefault();if(!guard())return
    if(!auditForm.companyCode||!auditForm.title.trim()||!auditForm.unit||!auditForm.leadAuditor.trim()||!auditForm.plannedDate){flash('Lengkapi PT, judul audit, unit, lead auditor dan planned date.');return}
    const seq=Math.max(0,...audits.map(a=>Number(String(a.id||'').split('-').pop())||0))+1
    const item={...auditForm,id:`AUD-${new Date(auditForm.plannedDate+'T00:00:00').getFullYear()}-${String(seq).padStart(4,'0')}`,score:null}
    setAuditModal(false);setAuditForm(newAudit());await persistAudit(item,`${item.id} berhasil dibuat.`)
  }
  async function saveCheck(e){
    e.preventDefault();if(!guard()||!selected)return
    if(!checkForm.requirement.trim()){flash('Requirement/checklist wajib diisi.');return}
    const seq=selectedChecks.length+1;const item={...checkForm,id:`CHK-${selected.id}-${String(Date.now()).slice(-6)}`,auditId:selected.id,companyCode:selected.companyCode,unit:selected.unit,stepNo:seq}
    setCheckModal(false);setCheckForm(newCheck());await persistCheck(item,'Checklist item berhasil ditambahkan.')
  }
  async function changeCheckResult(row,result){if(!guard())return;await persistCheck({...row,result},`${row.id} → ${result}.`)}

  async function createCorrectiveAction(finding){
    if(!['NC Major','NC Minor'].includes(finding.findingType))return
    const id=`CA-${finding.id}`
    const ca={id,companyCode:finding.companyCode,source:'Audit',sourceId:finding.id,title:finding.finding,unit:finding.unit,location:selected?.location||'',category:'Audit',priority:finding.findingType==='NC Major'?'High':'Medium',pic:finding.pic,dueDate:finding.dueDate,status:'Open',progress:0,evidence:''}
    const current=safeRead(CA_KEY);safeWrite(CA_KEY,upsert(current,ca))
    if(isSupabaseConfigured())await dbUpsert('corrective_actions',[caToDb(ca)],'id')
  }

  async function saveFinding(e){
    e.preventDefault();if(!guard()||!selected)return
    if(!findingForm.finding.trim()||!findingForm.pic.trim()){flash('Finding dan PIC wajib diisi.');return}
    if(['NC Major','NC Minor','OFI'].includes(findingForm.findingType)&&!findingForm.dueDate){flash('Due date wajib untuk NC/OFI.');return}
    const seq=selectedFindings.length+1
    const item={...findingForm,id:`FND-${selected.id}-${String(seq).padStart(3,'0')}`,auditId:selected.id,companyCode:selected.companyCode,unit:selected.unit,closureDate:''}
    setFindingModal(false);setFindingForm(newFinding())
    await persistFinding(item,`${item.id} berhasil dibuat.`)
    try{await createCorrectiveAction(item);if(['NC Major','NC Minor'].includes(item.findingType))flash(`${item.id} dibuat dan Corrective Action otomatis dibuat.`)}catch(err){flash(`Finding tersimpan, pembuatan Corrective Action gagal: ${err.message}`)}
  }

  async function startAudit(){if(!guard()||!selected)return;await persistAudit({...selected,status:'In Progress'},`${selected.id} dimulai.`)}
  async function submitReview(){
    if(!guard()||!selected)return
    if(!selectedChecks.length){flash('Audit belum memiliki checklist.');return}
    const pending=selectedChecks.filter(c=>c.result==='Pending').length;if(pending){flash(`${pending} checklist masih Pending.`);return}
    await persistAudit({...selected,status:'Review',score:selectedScore},`${selected.id} dikirim ke Review dengan score ${selectedScore}%.`)
  }
  async function closeAudit(){
    if(!guard()||!selected)return
    const blocking=selectedFindings.filter(f=>['NC Major','NC Minor'].includes(f.findingType)&&f.status!=='Closed')
    if(blocking.length){flash(`Belum bisa Close. ${blocking.length} NC masih open.`);return}
    await persistAudit({...selected,status:'Closed',score:selectedScore,endDate:selected.endDate||today()},`${selected.id} Closed dengan audit score ${selectedScore}%.`)
  }
  async function advanceFinding(row,nextStatus){
    if(!guard())return
    if(nextStatus==='Verification'&&(!row.rootCause.trim()||!row.correctiveAction.trim()||!row.evidence.trim())){flash('Isi root cause, corrective action dan evidence sebelum Verification.');return}
    if(nextStatus==='Closed'&&!row.evidence.trim()){flash('Evidence wajib sebelum finding ditutup.');return}
    const item={...row,status:nextStatus,closureDate:nextStatus==='Closed'?today():row.closureDate}
    await persistFinding(item,`${row.id} → ${nextStatus}.`)
  }
  async function enrichFinding(row,field,value){await persistFinding({...row,[field]:value},`${row.id} diperbarui.`)}

  function exportCSV(){
    const header=['Audit ID','Company/PT','Audit Type','Title','Standard','Unit','Location','Planned Date','Status','Audit Score','Checklist ID','Clause','Requirement','Checklist Result','Finding ID','Finding Type','Finding','PIC','Due Date','Finding Status']
    const data=[]
    rows.forEach(a=>{
      const checks=checklist.filter(c=>c.auditId===a.id),fs=findings.filter(f=>f.auditId===a.id)
      if(!checks.length&&!fs.length)data.push([a.id,a.companyCode,a.auditType,a.title,a.standard,a.unit,a.location,a.plannedDate,a.status,a.score??''])
      else{
        const max=Math.max(checks.length,fs.length)
        for(let i=0;i<max;i++){const c=checks[i]||{},f=fs[i]||{};data.push([a.id,a.companyCode,a.auditType,a.title,a.standard,a.unit,a.location,a.plannedDate,a.status,a.score??'',c.id||'',c.clause||'',c.requirement||'',c.result||'',f.id||'',f.findingType||'',f.finding||'',f.pic||'',f.dueDate||'',f.status||''])}
      }
    })
    const csv=[header,...data].map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`SINSHE_Audit_Management_${today()}.csv`;a.click();URL.revokeObjectURL(url)
  }

  return <Shell title="Audit Management" subtitle="Audit plan, checklist, finding, corrective action, verification dan closure terintegrasi per Company/PT.">
    <CompanyScopeBar filters={filters} onChange={setFilters} onReset={()=>setFilters(DEFAULT_COMPANY_FILTERS)}/>
    {notice&&<div className={styles.notice}><CheckCircle2 size={18}/>{notice}</div>}

    <div className="stats-grid four">
      <StatCard label="Audit Register" value={rows.length} hint={`${closedAudits} closed • ${source}`} tone="blue" icon={<ClipboardCheck/>}/>
      <StatCard label="Open Findings" value={openFindings} hint={`${overdueFindings} overdue`} tone={overdueFindings?'red':'orange'} icon={<AlertTriangle/>}/>
      <StatCard label="Finding Closure" value={`${closedFindingRate}%`} hint={`${scopedFindings.filter(f=>f.status==='Closed').length}/${scopedFindings.length} finding closed`} tone="green" icon={<ShieldCheck/>}/>
      <StatCard label="Selected Audit Score" value={selected?`${selectedScore}%`:'—'} hint={selected?`${selectedChecks.length} checklist item`:'pilih audit'} tone="purple" icon={<Target/>}/>
    </div>

    <div className={styles.toolbar}><div><h2>Audit & Compliance Assurance</h2><p>Plan → checklist → finding → action → verification → closure.</p></div><div className={styles.actions}><button className={styles.secondary} onClick={exportCSV}><Download size={17}/> Export CSV</button>{canManage&&<button className={styles.primary} onClick={()=>{setAuditForm({...newAudit(),companyCode:filters.company!=='All'?filters.company:(companies[0]?.code||'ACP')});setAuditModal(true)}}><Plus size={18}/> Audit Baru</button>}</div></div>

    <Panel>
      <div className={styles.filters}><label className={styles.search}><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari audit, PT, standard, auditor, lokasi..."/></label><select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option>All</option>{auditTypes.map(v=><option key={v}>{v}</option>)}</select><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All</option>{auditStatuses.map(v=><option key={v}>{v}</option>)}</select></div>
      <div className="table-wrap"><table><thead><tr><th>Audit ID</th><th>PT</th><th>Audit / Standard</th><th>Unit / Lokasi</th><th>Planned</th><th>Lead Auditor</th><th>Checklist</th><th>Findings</th><th>Score</th><th>Status</th></tr></thead><tbody>
        {rows.map(a=>{const cs=checklist.filter(c=>c.auditId===a.id),fs=findings.filter(f=>f.auditId===a.id),score=scoreOf(cs);return <tr key={a.id} onClick={()=>setSelectedId(a.id)} className={selected?.id===a.id?styles.selectedRow:''}><td><b>{a.id}</b></td><td><b>{a.companyCode||'-'}</b></td><td><b>{a.title}</b><small className={styles.block}>{a.auditType} · {a.standard||'No standard'}</small></td><td>{a.unit}<small className={styles.block}>{a.location||'-'}</small></td><td>{fmt(a.plannedDate)}</td><td>{a.leadAuditor||'-'}</td><td><b>{cs.length}</b></td><td><b>{fs.length}</b></td><td><b>{cs.length?`${score}%`:'—'}</b></td><td><Badge tone={auditTone(a.status)}>{a.status}</Badge></td></tr>})}
        {!rows.length&&<tr><td colSpan="10" className={styles.empty}>Belum ada audit pada filter ini.</td></tr>}
      </tbody></table></div>
    </Panel>

    {selected&&<div className="dashboard-split mt">
      <Panel title={`${selected.id} · ${selected.title}`} action={selected.status}>
        <div className={styles.detailGrid}><div><span>Company / PT</span><b>{selected.companyCode}</b></div><div><span>Audit Type</span><b>{selected.auditType}</b></div><div><span>Standard</span><b>{selected.standard||'-'}</b></div><div><span>Lead Auditor</span><b>{selected.leadAuditor||'-'}</b></div><div><span>Audit Team</span><b>{selected.auditTeam||'-'}</b></div><div><span>Schedule</span><b>{fmt(selected.plannedDate)} → {fmt(selected.endDate)}</b></div></div>
        <div className={styles.scope}><b>Scope</b><span>{selected.scope||'Belum diisi.'}</span></div>
        <div className={styles.scoreRow}><span><b>Audit Score</b><small>Conform ÷ seluruh checklist assessed (N/A & Pending dikecualikan)</small></span><strong>{selectedScore}%</strong></div><Progress value={selectedScore} tone={selectedScore>=90?'green':selectedScore>=75?'blue':'orange'}/>
        {canManage&&<div className={styles.detailActions}>{selected.status==='Planned'&&<button className={styles.primary} onClick={startAudit}>Start Audit</button>}{selected.status==='In Progress'&&<button className={styles.primary} onClick={submitReview}>Submit Review</button>}{selected.status==='Review'&&<button className={styles.primary} onClick={closeAudit}>Close Audit</button>}</div>}
      </Panel>
      <Panel title="Finding Health">
        <div className={styles.findingHealth}>{findingTypes.map(type=>{const n=selectedFindings.filter(f=>f.findingType===type).length;return <div key={type}><span>{type}</span><b>{n}</b><Badge tone={findingTone(type)}>{type==='Positive'?'Good Practice':'Finding'}</Badge></div>})}</div>
        <div className={styles.info}><ShieldCheck size={19}/><div><b>Closure gate</b><span>Audit tidak dapat ditutup selama NC Major/NC Minor masih terbuka. NC baru otomatis membuat Corrective Action agar tindak lanjut tidak terputus.</span></div></div>
      </Panel>
    </div>}

    {selected&&<Panel title="Audit Checklist" action={`${selectedChecks.length} item`} className="mt">
      <div className={styles.sectionToolbar}><p>Checklist evidence-based untuk menghitung audit score.</p>{canManage&&!['Closed','Cancelled'].includes(selected.status)&&<button className={styles.primary} onClick={()=>setCheckModal(true)}><Plus size={16}/> Checklist</button>}</div>
      <div className="table-wrap"><table><thead><tr><th>Clause</th><th>Category</th><th>Requirement</th><th>Result</th><th>Note</th><th>Evidence</th></tr></thead><tbody>
        {selectedChecks.map(c=><tr key={c.id}><td><b>{c.clause||'-'}</b></td><td>{c.category||'-'}</td><td>{c.requirement}</td><td>{canManage&&!['Closed','Cancelled'].includes(selected.status)?<select className={styles.inlineSelect} value={c.result} onChange={e=>changeCheckResult(c,e.target.value)}>{checklistResults.map(v=><option key={v}>{v}</option>)}</select>:<Badge tone={checkTone(c.result)}>{c.result}</Badge>}</td><td>{c.note||'-'}</td><td>{c.evidence||'-'}</td></tr>)}
        {!selectedChecks.length&&<tr><td colSpan="6" className={styles.empty}>Belum ada checklist. Tambahkan requirement audit.</td></tr>}
      </tbody></table></div>
    </Panel>}

    {selected&&<Panel title="Audit Findings" action={`${selectedFindings.length} finding`} className="mt">
      <div className={styles.sectionToolbar}><p>NC/OFI/Observation dengan PIC, due date, evidence dan verification.</p>{canManage&&!['Closed','Cancelled'].includes(selected.status)&&<button className={styles.primary} onClick={()=>setFindingModal(true)}><Plus size={16}/> Finding</button>}</div>
      <div className="table-wrap"><table><thead><tr><th>ID / Type</th><th>Clause & Finding</th><th>PIC / Due</th><th>Root Cause</th><th>Corrective Action</th><th>Evidence</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
        {selectedFindings.map(f=>{const overdue=f.status!=='Closed'&&f.dueDate&&daysTo(f.dueDate)<0;return <tr key={f.id}><td><b>{f.id}</b><small className={styles.block}><Badge tone={findingTone(f.findingType)}>{f.findingType}</Badge></small></td><td><b>{f.clause||'No clause'}</b><small className={styles.block}>{f.finding}</small></td><td>{f.pic||'-'}<small className={`${styles.block} ${overdue?styles.overdue:''}`}>{fmt(f.dueDate)}{overdue?' · OVERDUE':''}</small></td><td>{canManage&&f.status!=='Closed'?<input className={styles.inlineInput} defaultValue={f.rootCause} onBlur={e=>{if(e.target.value!==f.rootCause)enrichFinding(f,'rootCause',e.target.value)}} placeholder="Root cause..."/>:(f.rootCause||'-')}</td><td>{canManage&&f.status!=='Closed'?<input className={styles.inlineInput} defaultValue={f.correctiveAction} onBlur={e=>{if(e.target.value!==f.correctiveAction)enrichFinding(f,'correctiveAction',e.target.value)}} placeholder="Action..."/>:(f.correctiveAction||'-')}</td><td>{canManage&&f.status!=='Closed'?<input className={styles.inlineInput} defaultValue={f.evidence} onBlur={e=>{if(e.target.value!==f.evidence)enrichFinding(f,'evidence',e.target.value)}} placeholder="Evidence ref..."/>:(f.evidence||'-')}</td><td><Badge tone={findingStatusTone(f.status)}>{f.status}</Badge></td><td><div className={styles.rowActions}>{f.status==='Open'&&canManage&&<button onClick={()=>advanceFinding(f,'Action Pending')}>Action</button>}{f.status==='Action Pending'&&canManage&&<button onClick={()=>advanceFinding(f,'Verification')}>Verify</button>}{f.status==='Verification'&&canManage&&<button onClick={()=>advanceFinding(f,'Closed')}>Close</button>}</div></td></tr>})}
        {!selectedFindings.length&&<tr><td colSpan="8" className={styles.empty}>Belum ada finding pada audit ini.</td></tr>}
      </tbody></table></div>
    </Panel>}

    {auditModal&&<div className={styles.backdrop} onMouseDown={e=>{if(e.target===e.currentTarget)setAuditModal(false)}}><form className={styles.modal} onSubmit={saveAudit}><ModalHead title="Audit Baru" subtitle="Buat audit plan per Company/PT." close={()=>setAuditModal(false)}/><div className={styles.formGrid}>
      <Field label="Company / PT"><select value={auditForm.companyCode} onChange={e=>setAuditForm({...auditForm,companyCode:e.target.value})}>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></Field>
      <Field label="Audit Type"><select value={auditForm.auditType} onChange={e=>setAuditForm({...auditForm,auditType:e.target.value})}>{auditTypes.map(v=><option key={v}>{v}</option>)}</select></Field>
      <Field label="Audit Title" full><input value={auditForm.title} onChange={e=>setAuditForm({...auditForm,title:e.target.value})} placeholder="Contoh: Internal Audit K3L Semester II"/></Field>
      <Field label="Standard / Reference"><input value={auditForm.standard} onChange={e=>setAuditForm({...auditForm,standard:e.target.value})} placeholder="ISO 45001 / Peraturan / SOP"/></Field>
      <Field label="Unit"><select value={auditForm.unit} onChange={e=>setAuditForm({...auditForm,unit:e.target.value})}>{units.map(v=><option key={v}>{v}</option>)}</select></Field>
      <Field label="Location"><input value={auditForm.location} onChange={e=>setAuditForm({...auditForm,location:e.target.value})}/></Field>
      <Field label="Lead Auditor"><input value={auditForm.leadAuditor} onChange={e=>setAuditForm({...auditForm,leadAuditor:e.target.value})}/></Field>
      <Field label="Audit Team"><input value={auditForm.auditTeam} onChange={e=>setAuditForm({...auditForm,auditTeam:e.target.value})} placeholder="Nama dipisahkan koma"/></Field>
      <Field label="Planned Date"><input type="date" value={auditForm.plannedDate} onChange={e=>setAuditForm({...auditForm,plannedDate:e.target.value})}/></Field>
      <Field label="End Date"><input type="date" value={auditForm.endDate} onChange={e=>setAuditForm({...auditForm,endDate:e.target.value})}/></Field>
      <Field label="Scope" full><textarea value={auditForm.scope} onChange={e=>setAuditForm({...auditForm,scope:e.target.value})} rows="3"/></Field>
    </div><ModalActions cancel={()=>setAuditModal(false)} label="Simpan Audit"/></form></div>}

    {checkModal&&selected&&<div className={styles.backdrop} onMouseDown={e=>{if(e.target===e.currentTarget)setCheckModal(false)}}><form className={styles.modalSmall} onSubmit={saveCheck}><ModalHead title="Tambah Checklist" subtitle={selected.id} close={()=>setCheckModal(false)}/><div className={styles.formGrid}>
      <Field label="Category"><input value={checkForm.category} onChange={e=>setCheckForm({...checkForm,category:e.target.value})}/></Field><Field label="Clause"><input value={checkForm.clause} onChange={e=>setCheckForm({...checkForm,clause:e.target.value})}/></Field>
      <Field label="Requirement" full><textarea rows="3" value={checkForm.requirement} onChange={e=>setCheckForm({...checkForm,requirement:e.target.value})}/></Field><Field label="Initial Result"><select value={checkForm.result} onChange={e=>setCheckForm({...checkForm,result:e.target.value})}>{checklistResults.map(v=><option key={v}>{v}</option>)}</select></Field><Field label="Evidence Ref"><input value={checkForm.evidence} onChange={e=>setCheckForm({...checkForm,evidence:e.target.value})}/></Field><Field label="Note" full><textarea rows="2" value={checkForm.note} onChange={e=>setCheckForm({...checkForm,note:e.target.value})}/></Field>
    </div><ModalActions cancel={()=>setCheckModal(false)} label="Tambah Checklist"/></form></div>}

    {findingModal&&selected&&<div className={styles.backdrop} onMouseDown={e=>{if(e.target===e.currentTarget)setFindingModal(false)}}><form className={styles.modal} onSubmit={saveFinding}><ModalHead title="Tambah Audit Finding" subtitle={`${selected.id} · NC otomatis membuat Corrective Action`} close={()=>setFindingModal(false)}/><div className={styles.formGrid}>
      <Field label="Finding Type"><select value={findingForm.findingType} onChange={e=>setFindingForm({...findingForm,findingType:e.target.value})}>{findingTypes.map(v=><option key={v}>{v}</option>)}</select></Field><Field label="Clause"><input value={findingForm.clause} onChange={e=>setFindingForm({...findingForm,clause:e.target.value})}/></Field>
      <Field label="Finding" full><textarea rows="3" value={findingForm.finding} onChange={e=>setFindingForm({...findingForm,finding:e.target.value})}/></Field><Field label="PIC"><input value={findingForm.pic} onChange={e=>setFindingForm({...findingForm,pic:e.target.value})}/></Field><Field label="Due Date"><input type="date" value={findingForm.dueDate} onChange={e=>setFindingForm({...findingForm,dueDate:e.target.value})}/></Field><Field label="Root Cause"><input value={findingForm.rootCause} onChange={e=>setFindingForm({...findingForm,rootCause:e.target.value})}/></Field><Field label="Corrective Action"><input value={findingForm.correctiveAction} onChange={e=>setFindingForm({...findingForm,correctiveAction:e.target.value})}/></Field><Field label="Evidence" full><input value={findingForm.evidence} onChange={e=>setFindingForm({...findingForm,evidence:e.target.value})} placeholder="Nomor dokumen / link / referensi evidence"/></Field>
    </div><ModalActions cancel={()=>setFindingModal(false)} label="Simpan Finding"/></form></div>}
  </Shell>
}

function Field({label,children,full=false}){return <label className={full?styles.full:''}><span>{label}</span>{children}</label>}
function ModalHead({title,subtitle,close}){return <div className={styles.modalHeader}><div><span>AUDIT MANAGEMENT</span><h2>{title}</h2><p>{subtitle}</p></div><button type="button" onClick={close}><X size={19}/></button></div>}
function ModalActions({cancel,label}){return <div className={styles.modalActions}><button type="button" className={styles.secondary} onClick={cancel}>Batal</button><button type="submit" className={styles.primary}>{label}</button></div>}
