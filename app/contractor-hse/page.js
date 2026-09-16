'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge, Panel, Progress, StatCard } from '../../components/Ui'
import {
  AlertTriangle, Award, BadgeCheck, BriefcaseBusiness, CheckCircle2, ClipboardCheck,
  Download, HardHat, Plus, Search, ShieldAlert, Users, X
} from 'lucide-react'
import { dbSelect, dbUpsert, getStoredProfile, isSupabaseConfigured } from '../../lib/supabase-rest'
import { COMPANY_MASTER, DEFAULT_COMPANY_FILTERS, companyCodeOf, filteredCompanies } from '../../lib/company-master'
import styles from './contractor-hse.module.css'

const CONTRACTOR_KEY='sinshe-contractors'
const WORKER_KEY='sinshe-contractor-workers'
const EVENT_KEY='sinshe-contractor-events'
const PERMIT_KEY='sinshe-permits'
const UNITS=['Head Office','PKS A','PKS B','PKS C','Estate 1','Estate 2','Estate 3','Laboratorium']
const RISK_CLASSES=['Low','Medium','High','Critical']
const CONTRACTOR_STATUSES=['Prequalified','Active','Suspended','Expired','Closed']
const WORKER_STATUSES=['Active','Restricted','Inactive']
const EVENT_TYPES=['Incident','Audit Finding','HSE Violation','Positive Observation','Other']
const EVENT_STATUSES=['Open','Monitoring','Closed']
const SEVERITIES=['Low','Medium','High','Critical']
const today=()=>new Date().toISOString().slice(0,10)
const nextYear=()=>{const d=new Date();d.setFullYear(d.getFullYear()+1);return d.toISOString().slice(0,10)}
const contractorEmpty={companyCode:'ACP',vendorName:'',contractNo:'',workScope:'',unit:'Head Office',contactPerson:'',hsePic:'',riskClass:'Medium',status:'Prequalified',startDate:today(),endDate:nextYear(),prequalificationScore:'',notes:''}
const workerEmpty={contractorId:'',companyCode:'',workerName:'',workerNo:'',role:'',unit:'Head Office',inductionDate:today(),inductionValidUntil:nextYear(),medicalValidUntil:nextYear(),competencyName:'',competencyValidUntil:nextYear(),status:'Active',notes:''}
const eventEmpty={contractorId:'',companyCode:'',unit:'Head Office',eventDate:today(),eventType:'Incident',severity:'Medium',title:'',description:'',sourceRecordId:'',status:'Open',dueDate:'',notes:''}

const safeRead=key=>{try{const raw=localStorage.getItem(key);const value=raw?JSON.parse(raw):[];return Array.isArray(value)?value:[]}catch{return[]}}
const safeWrite=(key,rows)=>{try{localStorage.setItem(key,JSON.stringify(rows));window.dispatchEvent(new CustomEvent('sinshe-central-data',{detail:{key,count:rows.length}}))}catch{}}
const mergeById=(local,central)=>{const map=new Map();(local||[]).forEach(r=>r?.id&&map.set(r.id,r));(central||[]).forEach(r=>r?.id&&map.set(r.id,r));return [...map.values()]}
const fmt=value=>value?new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${String(value).slice(0,10)}T00:00:00`)):'-'
const daysUntil=value=>value?Math.ceil((new Date(`${String(value).slice(0,10)}T23:59:59`)-new Date())/86400000):null
const norm=value=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ')
const riskTone=value=>value==='Critical'?'red':value==='High'?'orange':value==='Medium'?'blue':'green'
const statusTone=value=>['Active','Prequalified','Closed'].includes(value)?'green':value==='Suspended'?'red':value==='Expired'?'red':value==='Restricted'?'orange':value==='Monitoring'?'blue':'orange'
const validDate=value=>{const d=daysUntil(value);return d!==null&&d>=0}
const effectiveStatus=c=>c.status==='Active'&&c.endDate&&daysUntil(c.endDate)<0?'Expired':c.status
const workerReady=w=>w.status==='Active'&&validDate(w.inductionValidUntil)&&validDate(w.medicalValidUntil)&&Boolean(w.competencyName)&&validDate(w.competencyValidUntil)

function contractorFromDb(r){return{id:r.id,companyCode:r.company_code||'',vendorName:r.vendor_name||'',contractNo:r.contract_no||'',workScope:r.work_scope||'',unit:r.unit||'Head Office',contactPerson:r.contact_person||'',hsePic:r.hse_pic||'',riskClass:r.risk_class||'Medium',status:r.status||'Prequalified',startDate:r.start_date||'',endDate:r.end_date||'',prequalificationScore:r.prequalification_score===null?'':Number(r.prequalification_score),notes:r.notes||''}}
function contractorToDb(r){return{id:r.id,company_code:r.companyCode||null,vendor_name:r.vendorName,contract_no:r.contractNo||null,work_scope:r.workScope||null,unit:r.unit,contact_person:r.contactPerson||null,hse_pic:r.hsePic||null,risk_class:r.riskClass,status:r.status,start_date:r.startDate||null,end_date:r.endDate||null,prequalification_score:r.prequalificationScore===''?null:Number(r.prequalificationScore),notes:r.notes||null}}
function workerFromDb(r){return{id:r.id,contractorId:r.contractor_id,companyCode:r.company_code||'',workerName:r.worker_name||'',workerNo:r.worker_no||'',role:r.role||'',unit:r.unit||'Head Office',inductionDate:r.induction_date||'',inductionValidUntil:r.induction_valid_until||'',medicalValidUntil:r.medical_valid_until||'',competencyName:r.competency_name||'',competencyValidUntil:r.competency_valid_until||'',status:r.status||'Active',notes:r.notes||''}}
function workerToDb(r){return{id:r.id,contractor_id:r.contractorId,company_code:r.companyCode||null,worker_name:r.workerName,worker_no:r.workerNo||null,role:r.role||null,unit:r.unit,induction_date:r.inductionDate||null,induction_valid_until:r.inductionValidUntil||null,medical_valid_until:r.medicalValidUntil||null,competency_name:r.competencyName||null,competency_valid_until:r.competencyValidUntil||null,status:r.status,notes:r.notes||null}}
function eventFromDb(r){return{id:r.id,contractorId:r.contractor_id,companyCode:r.company_code||'',unit:r.unit||'Head Office',eventDate:r.event_date,eventType:r.event_type,severity:r.severity,title:r.title,description:r.description||'',sourceRecordId:r.source_record_id||'',status:r.status,dueDate:r.due_date||'',notes:r.notes||''}}
function eventToDb(r){return{id:r.id,contractor_id:r.contractorId,company_code:r.companyCode||null,unit:r.unit,event_date:r.eventDate,event_type:r.eventType,severity:r.severity,title:r.title,description:r.description||null,source_record_id:r.sourceRecordId||null,status:r.status,due_date:r.dueDate||null,notes:r.notes||null}}
function permitFromDb(r){return{id:r.id,companyCode:r.company_code||'',type:r.permit_type||'',title:r.title||'',unit:r.unit||'',area:r.area||'',contractor:r.contractor||'',risk:r.risk||'',status:r.status||'',startDate:r.start_at?String(r.start_at).slice(0,10):'',endDate:r.end_at?String(r.end_at).slice(0,10):''}}

function buildScore(contractor,workers,permits,events){
  if(!contractor)return{score:null,coverage:0,components:[],linkedPermits:[]}
  const components=[]
  const pre=Number(contractor.prequalificationScore)
  if(contractor.prequalificationScore!==''&&Number.isFinite(pre))components.push({label:'Prequalification',score:Math.max(0,Math.min(100,pre)),hint:'nilai prequalification vendor'})
  const vendorWorkers=workers.filter(w=>w.contractorId===contractor.id&&w.status!=='Inactive')
  if(vendorWorkers.length){const ready=vendorWorkers.filter(workerReady).length;components.push({label:'Worker Readiness',score:Math.round(ready/vendorWorkers.length*100),hint:`${ready}/${vendorWorkers.length} induction + medical + competency valid`})}
  const linkedPermits=permits.filter(p=>norm(p.contractor)===norm(contractor.vendorName))
  const scoredPermits=linkedPermits.filter(p=>p.status!=='Draft')
  if(scoredPermits.length){const healthy=scoredPermits.filter(p=>!['Expired','Suspended'].includes(p.status)).length;components.push({label:'Permit Status Health',score:Math.round(healthy/scoredPermits.length*100),hint:`${healthy}/${scoredPermits.length} permit tidak expired/suspended`})}
  const vendorEvents=events.filter(e=>e.contractorId===contractor.id)
  if(vendorEvents.length){const penalties={Critical:35,High:20,Medium:10,Low:5};const open=vendorEvents.filter(e=>e.status!=='Closed');const penalty=open.reduce((s,e)=>s+(penalties[e.severity]||5),0);components.push({label:'Open HSE Event Burden',score:Math.max(0,100-penalty),hint:`${open.length} event masih open/monitoring`})}
  const score=components.length?Math.round(components.reduce((s,c)=>s+c.score,0)/components.length):null
  return{score,coverage:Math.round(components.length/4*100),components,linkedPermits}
}

export default function ContractorHSE(){
  const [contractors,setContractors]=useState([])
  const [workers,setWorkers]=useState([])
  const [events,setEvents]=useState([])
  const [permits,setPermits]=useState([])
  const [filters,setFilters]=useState(DEFAULT_COMPANY_FILTERS)
  const [search,setSearch]=useState('')
  const [statusFilter,setStatusFilter]=useState('All')
  const [riskFilter,setRiskFilter]=useState('All')
  const [selectedId,setSelectedId]=useState('')
  const [tab,setTab]=useState('Workers')
  const [modal,setModal]=useState('')
  const [contractorForm,setContractorForm]=useState(contractorEmpty)
  const [workerForm,setWorkerForm]=useState(workerEmpty)
  const [eventForm,setEventForm]=useState(eventEmpty)
  const [source,setSource]=useState('Local cache')
  const [loading,setLoading]=useState(true)
  const [notice,setNotice]=useState('')
  const profile=getStoredProfile()
  const canManage=!profile||profile.role!=='Viewer'

  useEffect(()=>{
    let active=true
    async function load(){
      const lc=safeRead(CONTRACTOR_KEY),lw=safeRead(WORKER_KEY),le=safeRead(EVENT_KEY),lp=safeRead(PERMIT_KEY)
      if(active){setContractors(lc);setWorkers(lw);setEvents(le);setPermits(lp)}
      if(!isSupabaseConfigured()){setLoading(false);return}
      try{
        const [c,w,e,p]=await Promise.all([
          dbSelect('contractors','select=*&order=vendor_name.asc'),
          dbSelect('contractor_workers','select=*&order=worker_name.asc'),
          dbSelect('contractor_hse_events','select=*&order=event_date.desc,updated_at.desc'),
          dbSelect('permits','select=*'),
        ])
        const nc=mergeById(lc,(c||[]).map(contractorFromDb)),nw=mergeById(lw,(w||[]).map(workerFromDb)),ne=mergeById(le,(e||[]).map(eventFromDb)),np=mergeById(lp,(p||[]).map(permitFromDb))
        if(active){setContractors(nc);setWorkers(nw);setEvents(ne);setPermits(np);safeWrite(CONTRACTOR_KEY,nc);safeWrite(WORKER_KEY,nw);safeWrite(EVENT_KEY,ne);setSource('Supabase central data')}
      }catch{if(active)setSource('Offline / local cache')}
      if(active)setLoading(false)
    }
    load();return()=>{active=false}
  },[])

  const companies=useMemo(()=>filteredCompanies(filters),[filters])
  const allowed=useMemo(()=>new Set(companies.map(c=>c.code)),[companies])
  const specific=filters.company!=='All'||filters.region!=='All'||filters.province!=='All'||filters.pic!=='All'
  const rows=useMemo(()=>contractors.filter(c=>{const code=companyCodeOf(c);const q=search.trim().toLowerCase();const text=[c.id,c.companyCode,c.vendorName,c.contractNo,c.workScope,c.unit,c.contactPerson,c.hsePic].join(' ').toLowerCase();const st=effectiveStatus(c);return(code?allowed.has(code):!specific)&&(!q||text.includes(q))&&(statusFilter==='All'||st===statusFilter)&&(riskFilter==='All'||c.riskClass===riskFilter)}).sort((a,b)=>a.vendorName.localeCompare(b.vendorName)),[contractors,allowed,specific,search,statusFilter,riskFilter])
  const selected=contractors.find(c=>c.id===selectedId)||rows[0]||null
  const selectedWorkers=selected?workers.filter(w=>w.contractorId===selected.id):[]
  const selectedEvents=selected?events.filter(e=>e.contractorId===selected.id).sort((a,b)=>String(b.eventDate).localeCompare(String(a.eventDate))):[]
  const score=buildScore(selected,workers,permits,events)
  const scopedWorkers=workers.filter(w=>{const code=companyCodeOf(w);return code?allowed.has(code):!specific})
  const readyWorkers=scopedWorkers.filter(workerReady).length
  const scopedEvents=events.filter(e=>{const code=companyCodeOf(e);return code?allowed.has(code):!specific})
  const openEvents=scopedEvents.filter(e=>e.status!=='Closed'&&['High','Critical'].includes(e.severity)).length
  const activeContractors=rows.filter(c=>effectiveStatus(c)==='Active').length
  const criticalContractors=rows.filter(c=>['High','Critical'].includes(c.riskClass)&&!['Closed','Expired'].includes(effectiveStatus(c))).length

  useEffect(()=>{if(rows.length&&!rows.some(r=>r.id===selectedId))setSelectedId(rows[0].id)},[rows,selectedId])

  function flash(text){setNotice(text);setTimeout(()=>setNotice(''),3600)}
  function newContractor(){setContractorForm({...contractorEmpty,companyCode:filters.company!=='All'?filters.company:'ACP'});setModal('contractor')}
  function newWorker(){if(!selected){flash('Pilih contractor terlebih dahulu.');return}setWorkerForm({...workerEmpty,contractorId:selected.id,companyCode:selected.companyCode,unit:selected.unit});setModal('worker')}
  function newEvent(){if(!selected){flash('Pilih contractor terlebih dahulu.');return}setEventForm({...eventEmpty,contractorId:selected.id,companyCode:selected.companyCode,unit:selected.unit});setModal('event')}

  async function saveContractor(e){
    e.preventDefault();if(!canManage)return
    if(!contractorForm.companyCode||!contractorForm.vendorName.trim()||!contractorForm.unit){flash('Lengkapi Company/PT, nama contractor dan unit.');return}
    if(contractorForm.prequalificationScore!==''&&(Number(contractorForm.prequalificationScore)<0||Number(contractorForm.prequalificationScore)>100)){flash('Prequalification score harus 0–100.');return}
    const item={...contractorForm,id:`CTR-${Date.now().toString().slice(-8)}`}
    const next=[item,...contractors];setContractors(next);safeWrite(CONTRACTOR_KEY,next);setSelectedId(item.id);setModal('')
    if(isSupabaseConfigured()){try{await dbUpsert('contractors',[contractorToDb(item)],'id');flash(`${item.vendorName} tersimpan ke central data.`)}catch(err){flash(`Tersimpan lokal, sync contractor gagal: ${err.message}`)}}else flash(`${item.vendorName} tersimpan lokal.`)
  }
  async function saveWorker(e){
    e.preventDefault();if(!canManage)return
    if(!workerForm.contractorId||!workerForm.workerName.trim()||!workerForm.unit){flash('Lengkapi contractor, nama worker dan unit.');return}
    const item={...workerForm,id:`CTW-${Date.now().toString().slice(-8)}`}
    const next=[item,...workers];setWorkers(next);safeWrite(WORKER_KEY,next);setModal('')
    if(isSupabaseConfigured()){try{await dbUpsert('contractor_workers',[workerToDb(item)],'id');flash(`${item.workerName} tersimpan ke worker register.`)}catch(err){flash(`Tersimpan lokal, sync worker gagal: ${err.message}`)}}else flash(`${item.workerName} tersimpan lokal.`)
  }
  async function saveEvent(e){
    e.preventDefault();if(!canManage)return
    if(!eventForm.contractorId||!eventForm.title.trim()||!eventForm.eventDate){flash('Lengkapi contractor, judul event dan tanggal.');return}
    const item={...eventForm,id:`CTE-${Date.now().toString().slice(-8)}`}
    const next=[item,...events];setEvents(next);safeWrite(EVENT_KEY,next);setModal('')
    if(isSupabaseConfigured()){try{await dbUpsert('contractor_hse_events',[eventToDb(item)],'id');flash(`${item.id} tersimpan ke HSE event register.`)}catch(err){flash(`Tersimpan lokal, sync event gagal: ${err.message}`)}}else flash(`${item.id} tersimpan lokal.`)
  }
  async function closeEvent(item){
    if(!canManage)return;const updated={...item,status:'Closed'};const next=events.map(e=>e.id===item.id?updated:e);setEvents(next);safeWrite(EVENT_KEY,next);if(isSupabaseConfigured()){try{await dbUpsert('contractor_hse_events',[eventToDb(updated)],'id')}catch{}}flash(`${item.id} ditutup.`)
  }
  function exportCSV(){
    const header=['Contractor ID','Company/PT','Vendor','Contract No','Work Scope','Unit','Risk Class','Status','Start','End','Prequalification Score','Workers','Ready Workers','Linked PTW','Open HSE Events','HSE Score','Data Coverage']
    const data=rows.map(c=>{const ws=workers.filter(w=>w.contractorId===c.id);const ev=events.filter(e=>e.contractorId===c.id&&e.status!=='Closed');const sc=buildScore(c,workers,permits,events);return[c.id,c.companyCode,c.vendorName,c.contractNo,c.workScope,c.unit,c.riskClass,effectiveStatus(c),c.startDate,c.endDate,c.prequalificationScore,ws.length,ws.filter(workerReady).length,sc.linkedPermits.length,ev.length,sc.score??'',`${sc.coverage}%`]})
    const csv=[header,...data].map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`SINSHE_Contractor_HSE_${today()}.csv`;a.click();URL.revokeObjectURL(url)
  }

  return <Shell title="Contractor HSE Management" subtitle="Prequalification, worker readiness, PTW linkage, HSE event register dan scorecard contractor per Company/PT.">
    <CompanyScopeBar filters={filters} onChange={setFilters} onReset={()=>setFilters(DEFAULT_COMPANY_FILTERS)}/>
    {notice&&<div className={styles.notice}><CheckCircle2 size={18}/>{notice}</div>}

    <div className="stats-grid four">
      <StatCard label="Active Contractor" value={activeContractors} hint={`${source}${loading?' · loading…':''}`} tone="green" icon={<BriefcaseBusiness/>}/>
      <StatCard label="High / Critical Vendor" value={criticalContractors} hint="risk class contractor" tone="red" icon={<ShieldAlert/>}/>
      <StatCard label="Worker Ready" value={scopedWorkers.length?`${Math.round(readyWorkers/scopedWorkers.length*100)}%`:'—'} hint={`${readyWorkers}/${scopedWorkers.length} worker`} tone="blue" icon={<Users/>}/>
      <StatCard label="Open High-Risk Event" value={openEvents} hint="High / Critical" tone="orange" icon={<AlertTriangle/>}/>
    </div>

    <div className={styles.toolbar}><div><h2>Contractor Control Center</h2><p>Scorecard dihitung dari data yang tersedia; missing data tidak otomatis dianggap compliant.</p></div><div className={styles.actions}><button className={styles.secondary} onClick={exportCSV}><Download size={17}/> Export CSV</button>{canManage&&<button className={styles.primary} onClick={newContractor}><Plus size={18}/> Add Contractor</button>}</div></div>

    <Panel>
      <div className={styles.filters}>
        <label className={styles.search}><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari contractor, contract no, scope, HSE PIC..."/></label>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All</option>{CONTRACTOR_STATUSES.map(v=><option key={v}>{v}</option>)}</select>
        <select value={riskFilter} onChange={e=>setRiskFilter(e.target.value)}><option>All</option>{RISK_CLASSES.map(v=><option key={v}>{v}</option>)}</select>
      </div>
      <div className="table-wrap"><table><thead><tr><th>Contractor</th><th>PT</th><th>Scope</th><th>Risk</th><th>Contract</th><th>Workers</th><th>PTW</th><th>Score</th><th>Status</th></tr></thead><tbody>
        {rows.map(c=>{const sc=buildScore(c,workers,permits,events);const ws=workers.filter(w=>w.contractorId===c.id);return <tr key={c.id} onClick={()=>setSelectedId(c.id)} className={selected?.id===c.id?styles.selectedRow:''}><td><b>{c.vendorName}</b><small className={styles.block}>{c.id} · {c.contractNo||'No contract no.'}</small></td><td><b>{c.companyCode||'-'}</b><small className={styles.block}>{c.unit}</small></td><td>{c.workScope||'-'}</td><td><Badge tone={riskTone(c.riskClass)}>{c.riskClass}</Badge></td><td>{fmt(c.startDate)}<small className={styles.block}>to {fmt(c.endDate)}</small></td><td>{ws.filter(workerReady).length}/{ws.length} ready</td><td>{sc.linkedPermits.length}</td><td><b>{sc.score===null?'—':sc.score}</b><small className={styles.block}>{sc.coverage}% coverage</small></td><td><Badge tone={statusTone(effectiveStatus(c))}>{effectiveStatus(c)}</Badge></td></tr>})}
        {!rows.length&&<tr><td colSpan="9" className={styles.empty}>Belum ada contractor sesuai filter. Tambahkan contractor tanpa membuat data contoh palsu.</td></tr>}
      </tbody></table></div>
    </Panel>

    {selected&&<div className="dashboard-split mt">
      <Panel title="Contractor Scorecard"><div className={styles.scoreHeader}><div><h3>{selected.vendorName}</h3><p>{selected.companyCode} · {selected.workScope||'Scope belum diisi'} · HSE PIC {selected.hsePic||'-'}</p></div><div className={styles.scoreBubble}>{score.score===null?'—':score.score}<small>/100</small></div></div><Progress value={score.score||0}/><div className={styles.coverage}>Data coverage <b>{score.coverage}%</b>. Score hanya memakai komponen yang mempunyai data.</div><div className={styles.componentList}>{score.components.length?score.components.map(c=><div key={c.label}><span><b>{c.label}</b><small>{c.hint}</small></span><strong>{c.score}</strong></div>):<div className={styles.noData}>Belum cukup data untuk menghitung scorecard.</div>}</div><div className={styles.detailGrid}><div><span>Contact Person</span><b>{selected.contactPerson||'-'}</b></div><div><span>Contract No.</span><b>{selected.contractNo||'-'}</b></div><div><span>Risk Class</span><b>{selected.riskClass}</b></div><div><span>Contract End</span><b>{fmt(selected.endDate)}</b></div></div><div className={styles.linkRow}><Link className={styles.secondary} href="/permit-to-work"><ClipboardCheck size={15}/> Open Permit to Work</Link>{canManage&&<button className={styles.secondary} onClick={newWorker}><Users size={15}/> Add Worker</button>}{canManage&&<button className={styles.primary} onClick={newEvent}><AlertTriangle size={15}/> Log HSE Event</button>}</div></Panel>

      <Panel title="Operational Register"><div className={styles.tabs}><button className={tab==='Workers'?styles.activeTab:''} onClick={()=>setTab('Workers')}>Workers ({selectedWorkers.length})</button><button className={tab==='Events'?styles.activeTab:''} onClick={()=>setTab('Events')}>HSE Events ({selectedEvents.length})</button><button className={tab==='PTW'?styles.activeTab:''} onClick={()=>setTab('PTW')}>Linked PTW ({score.linkedPermits.length})</button></div>
        {tab==='Workers'&&<div className={styles.list}>{selectedWorkers.length?selectedWorkers.map(w=><div className={styles.listItem} key={w.id}><div><b>{w.workerName}</b><small>{w.workerNo||w.id} · {w.role||'-'} · {w.unit}</small><small>{w.competencyName||'Competency belum diisi'} · valid {fmt(w.competencyValidUntil)}</small></div><Badge tone={workerReady(w)?'green':'red'}>{workerReady(w)?'Ready':'Not Ready'}</Badge></div>):<div className={styles.empty}>Belum ada worker contractor.</div>}</div>}
        {tab==='Events'&&<div className={styles.list}>{selectedEvents.length?selectedEvents.map(ev=><div className={styles.listItem} key={ev.id}><div><b>{ev.eventType} · {ev.title}</b><small>{fmt(ev.eventDate)} · {ev.sourceRecordId||'manual record'} · {ev.unit}</small><small>{ev.description||'No description'}</small></div><div className={styles.badges}><Badge tone={riskTone(ev.severity)}>{ev.severity}</Badge><Badge tone={statusTone(ev.status)}>{ev.status}</Badge>{canManage&&ev.status!=='Closed'&&<button className={styles.smallButton} onClick={()=>closeEvent(ev)}>Close</button>}</div></div>):<div className={styles.empty}>Belum ada HSE event contractor.</div>}</div>}
        {tab==='PTW'&&<div className={styles.list}>{score.linkedPermits.length?score.linkedPermits.map(p=><div className={styles.listItem} key={p.id}><div><b>{p.id} · {p.type||'Permit'}</b><small>{p.title||'-'} · {p.unit||'-'} · {p.area||'-'}</small><small>{p.startDate||'-'} → {p.endDate||'-'}</small></div><div className={styles.badges}><Badge tone={riskTone(p.risk)}>{p.risk||'—'}</Badge><Badge tone={statusTone(p.status)}>{p.status}</Badge></div></div>):<div className={styles.empty}>Belum ada PTW dengan nama contractor yang sama persis.</div>}</div>}
      </Panel>
    </div>}

    <div className={styles.note}><HardHat size={20}/><div><b>Transparent scorecard</b><span>HSE Score bukan sertifikasi atau prediksi kecelakaan. Komponen saat ini: prequalification, worker readiness, permit status health, dan open HSE event burden. Data yang kosong menurunkan coverage, bukan otomatis diberi nilai 100.</span></div></div>

    {modal==='contractor'&&<div className={styles.modalBackdrop}><div className={styles.modal}><div className={styles.modalHead}><div><h2>Add Contractor</h2><p>Registrasi vendor/contractor untuk satu Company/PT.</p></div><button onClick={()=>setModal('')}><X size={18}/></button></div><form onSubmit={saveContractor} className={styles.form}><div className={styles.formGrid}>
      <label>Company / PT<select value={contractorForm.companyCode} onChange={e=>setContractorForm({...contractorForm,companyCode:e.target.value})}>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label><label>Vendor / Contractor Name<input value={contractorForm.vendorName} onChange={e=>setContractorForm({...contractorForm,vendorName:e.target.value})}/></label><label>Contract No.<input value={contractorForm.contractNo} onChange={e=>setContractorForm({...contractorForm,contractNo:e.target.value})}/></label><label>Unit<select value={contractorForm.unit} onChange={e=>setContractorForm({...contractorForm,unit:e.target.value})}>{UNITS.map(v=><option key={v}>{v}</option>)}</select></label><label className={styles.span2}>Work Scope<input value={contractorForm.workScope} onChange={e=>setContractorForm({...contractorForm,workScope:e.target.value})}/></label><label>Contact Person<input value={contractorForm.contactPerson} onChange={e=>setContractorForm({...contractorForm,contactPerson:e.target.value})}/></label><label>HSE PIC<input value={contractorForm.hsePic} onChange={e=>setContractorForm({...contractorForm,hsePic:e.target.value})}/></label><label>Risk Class<select value={contractorForm.riskClass} onChange={e=>setContractorForm({...contractorForm,riskClass:e.target.value})}>{RISK_CLASSES.map(v=><option key={v}>{v}</option>)}</select></label><label>Status<select value={contractorForm.status} onChange={e=>setContractorForm({...contractorForm,status:e.target.value})}>{CONTRACTOR_STATUSES.map(v=><option key={v}>{v}</option>)}</select></label><label>Contract Start<input type="date" value={contractorForm.startDate} onChange={e=>setContractorForm({...contractorForm,startDate:e.target.value})}/></label><label>Contract End<input type="date" value={contractorForm.endDate} onChange={e=>setContractorForm({...contractorForm,endDate:e.target.value})}/></label><label>Prequalification Score<input type="number" min="0" max="100" value={contractorForm.prequalificationScore} onChange={e=>setContractorForm({...contractorForm,prequalificationScore:e.target.value})} placeholder="0-100, optional"/></label><label className={styles.span2}>Notes<textarea value={contractorForm.notes} onChange={e=>setContractorForm({...contractorForm,notes:e.target.value})}/></label>
    </div><div className={styles.formFooter}><button type="button" className={styles.secondary} onClick={()=>setModal('')}>Cancel</button><button className={styles.primary}><BriefcaseBusiness size={16}/> Save Contractor</button></div></form></div></div>}

    {modal==='worker'&&<div className={styles.modalBackdrop}><div className={styles.modal}><div className={styles.modalHead}><div><h2>Add Contractor Worker</h2><p>{selected?.vendorName}</p></div><button onClick={()=>setModal('')}><X size={18}/></button></div><form onSubmit={saveWorker} className={styles.form}><div className={styles.formGrid}>
      <label>Worker Name<input value={workerForm.workerName} onChange={e=>setWorkerForm({...workerForm,workerName:e.target.value})}/></label><label>Worker ID<input value={workerForm.workerNo} onChange={e=>setWorkerForm({...workerForm,workerNo:e.target.value})}/></label><label>Role / Trade<input value={workerForm.role} onChange={e=>setWorkerForm({...workerForm,role:e.target.value})}/></label><label>Unit<select value={workerForm.unit} onChange={e=>setWorkerForm({...workerForm,unit:e.target.value})}>{UNITS.map(v=><option key={v}>{v}</option>)}</select></label><label>Induction Date<input type="date" value={workerForm.inductionDate} onChange={e=>setWorkerForm({...workerForm,inductionDate:e.target.value})}/></label><label>Induction Valid Until<input type="date" value={workerForm.inductionValidUntil} onChange={e=>setWorkerForm({...workerForm,inductionValidUntil:e.target.value})}/></label><label>Medical Valid Until<input type="date" value={workerForm.medicalValidUntil} onChange={e=>setWorkerForm({...workerForm,medicalValidUntil:e.target.value})}/></label><label>Status<select value={workerForm.status} onChange={e=>setWorkerForm({...workerForm,status:e.target.value})}>{WORKER_STATUSES.map(v=><option key={v}>{v}</option>)}</select></label><label>Competency / License<input value={workerForm.competencyName} onChange={e=>setWorkerForm({...workerForm,competencyName:e.target.value})} placeholder="Welder, SIO, K3, etc."/></label><label>Competency Valid Until<input type="date" value={workerForm.competencyValidUntil} onChange={e=>setWorkerForm({...workerForm,competencyValidUntil:e.target.value})}/></label><label className={styles.span2}>Notes<textarea value={workerForm.notes} onChange={e=>setWorkerForm({...workerForm,notes:e.target.value})}/></label>
    </div><div className={styles.formFooter}><button type="button" className={styles.secondary} onClick={()=>setModal('')}>Cancel</button><button className={styles.primary}><BadgeCheck size={16}/> Save Worker</button></div></form></div></div>}

    {modal==='event'&&<div className={styles.modalBackdrop}><div className={styles.modal}><div className={styles.modalHead}><div><h2>Log Contractor HSE Event</h2><p>{selected?.vendorName}</p></div><button onClick={()=>setModal('')}><X size={18}/></button></div><form onSubmit={saveEvent} className={styles.form}><div className={styles.formGrid}>
      <label>Event Type<select value={eventForm.eventType} onChange={e=>setEventForm({...eventForm,eventType:e.target.value})}>{EVENT_TYPES.map(v=><option key={v}>{v}</option>)}</select></label><label>Severity<select value={eventForm.severity} onChange={e=>setEventForm({...eventForm,severity:e.target.value})}>{SEVERITIES.map(v=><option key={v}>{v}</option>)}</select></label><label>Event Date<input type="date" value={eventForm.eventDate} onChange={e=>setEventForm({...eventForm,eventDate:e.target.value})}/></label><label>Unit<select value={eventForm.unit} onChange={e=>setEventForm({...eventForm,unit:e.target.value})}>{UNITS.map(v=><option key={v}>{v}</option>)}</select></label><label className={styles.span2}>Title<input value={eventForm.title} onChange={e=>setEventForm({...eventForm,title:e.target.value})}/></label><label className={styles.span2}>Description<textarea value={eventForm.description} onChange={e=>setEventForm({...eventForm,description:e.target.value})}/></label><label>Source Record ID<input value={eventForm.sourceRecordId} onChange={e=>setEventForm({...eventForm,sourceRecordId:e.target.value})} placeholder="INC / AUD / PTW reference"/></label><label>Status<select value={eventForm.status} onChange={e=>setEventForm({...eventForm,status:e.target.value})}>{EVENT_STATUSES.map(v=><option key={v}>{v}</option>)}</select></label><label>Due Date<input type="date" value={eventForm.dueDate} onChange={e=>setEventForm({...eventForm,dueDate:e.target.value})}/></label><label className={styles.span2}>Notes<textarea value={eventForm.notes} onChange={e=>setEventForm({...eventForm,notes:e.target.value})}/></label>
    </div><div className={styles.formFooter}><button type="button" className={styles.secondary} onClick={()=>setModal('')}>Cancel</button><button className={styles.primary}><Award size={16}/> Save HSE Event</button></div></form></div></div>}
  </Shell>
}
