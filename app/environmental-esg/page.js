'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge, Panel, Progress, StatCard } from '../../components/Ui'
import {
  Activity, AlertTriangle, CheckCircle2, Clock3, Download, Droplets, FileCheck2,
  Leaf, Plus, Recycle, Search, Wind, X, Zap
} from 'lucide-react'
import { dbSelect, dbUpsert, getStoredProfile, isSupabaseConfigured } from '../../lib/supabase-rest'
import { COMPANY_MASTER, DEFAULT_COMPANY_FILTERS, companyCodeOf, filteredCompanies } from '../../lib/company-master'
import styles from './environmental-esg.module.css'

const METRIC_KEY='sinshe-environmental-metrics'
const EVENT_KEY='sinshe-environmental-events'
const REG_KEY='sinshe-regulatory-obligations'
const categories=['Water','Energy','Waste','Emission','Biodiversity','Peat & Water Management','Environmental Compliance']
const units=['Head Office','PKS A','PKS B','PKS C','Estate 1','Estate 2','Estate 3','Laboratorium']
const eventTypes=['Spill / Release','Water Quality','Air Emission','Waste Management','Biodiversity','Fire / Hotspot','Environmental Complaint','Other']
const severities=['Low','Medium','High','Critical']
const eventStatuses=['Open','In Progress','Monitoring','Closed']
const operators=[{value:'<=',label:'≤ Maksimum'},{value:'>=',label:'≥ Minimum'},{value:'info',label:'Informational'}]
const today=()=>new Date().toISOString().slice(0,10)
const currentYear=()=>String(new Date().getFullYear())

const emptyMetric={companyCode:'',unit:'Head Office',periodDate:today(),category:'Water',parameter:'',value:'',unitMeasure:'',targetValue:'',targetOperator:'info',sourceRef:'',notes:''}
const emptyEvent={companyCode:'',unit:'Head Office',eventDate:today(),eventType:'Spill / Release',severity:'Medium',description:'',location:'',pic:'',immediateAction:'',correctiveAction:'',dueDate:'',status:'Open',evidence:''}

const safeRead=key=>{try{const raw=localStorage.getItem(key);const rows=raw?JSON.parse(raw):[];return Array.isArray(rows)?rows:[]}catch{return[]}}
const safeWrite=(key,rows)=>{try{localStorage.setItem(key,JSON.stringify(rows));window.dispatchEvent(new CustomEvent('sinshe-central-data',{detail:{key,count:rows.length}}))}catch{}}
const mergeById=(local,central)=>{const map=new Map();(local||[]).forEach(r=>r?.id&&map.set(r.id,r));(central||[]).forEach(r=>r?.id&&map.set(r.id,r));return [...map.values()]}
const fmt=value=>value?new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${String(value).slice(0,10)}T00:00:00`)):'-'
const num=value=>value===null||value===undefined||value===''?null:Number(value)
const metricState=m=>{
  const target=num(m.targetValue)
  const value=num(m.value)
  if(m.targetOperator==='info'||target===null||value===null)return{label:'Info',tone:'blue'}
  const pass=m.targetOperator==='<='?value<=target:value>=target
  return pass?{label:'On Target',tone:'green'}:{label:'Off Target',tone:'red'}
}
const eventTone=value=>value==='Closed'?'green':value==='Monitoring'?'blue':value==='In Progress'?'orange':'red'
const severityTone=value=>value==='Critical'?'red':value==='High'?'orange':value==='Medium'?'blue':'green'
const metricIcon=category=>category==='Water'?<Droplets/>:category==='Energy'?<Zap/>:category==='Waste'?<Recycle/>:category==='Emission'?<Wind/>:<Leaf/>

function metricFromDb(r){return{id:r.id,companyCode:r.company_code||'',unit:r.unit||'Head Office',periodDate:r.period_date,category:r.category,parameter:r.parameter,value:Number(r.value),unitMeasure:r.unit_measure,targetValue:r.target_value===null?'':Number(r.target_value),targetOperator:r.target_operator||'info',sourceRef:r.source_ref||'',notes:r.notes||''}}
function metricToDb(r){return{id:r.id,company_code:r.companyCode||null,unit:r.unit,period_date:r.periodDate,category:r.category,parameter:r.parameter,value:Number(r.value),unit_measure:r.unitMeasure,target_value:r.targetValue===''?null:Number(r.targetValue),target_operator:r.targetOperator,source_ref:r.sourceRef||null,notes:r.notes||null}}
function eventFromDb(r){return{id:r.id,companyCode:r.company_code||'',unit:r.unit||'Head Office',eventDate:r.event_date,eventType:r.event_type,severity:r.severity,description:r.description,location:r.location||'',pic:r.pic||'',immediateAction:r.immediate_action||'',correctiveAction:r.corrective_action||'',dueDate:r.due_date||'',status:r.status,evidence:r.evidence||''}}
function eventToDb(r){return{id:r.id,company_code:r.companyCode||null,unit:r.unit,event_date:r.eventDate,event_type:r.eventType,severity:r.severity,description:r.description,location:r.location||null,pic:r.pic||null,immediate_action:r.immediateAction||null,corrective_action:r.correctiveAction||null,due_date:r.dueDate||null,status:r.status,evidence:r.evidence||null}}

export default function EnvironmentalESG(){
  const [metrics,setMetrics]=useState([])
  const [events,setEvents]=useState([])
  const [regulatory,setRegulatory]=useState([])
  const [filters,setFilters]=useState(DEFAULT_COMPANY_FILTERS)
  const [year,setYear]=useState(currentYear())
  const [category,setCategory]=useState('All')
  const [search,setSearch]=useState('')
  const [metricOpen,setMetricOpen]=useState(false)
  const [eventOpen,setEventOpen]=useState(false)
  const [metricForm,setMetricForm]=useState(emptyMetric)
  const [eventForm,setEventForm]=useState(emptyEvent)
  const [loading,setLoading]=useState(true)
  const [source,setSource]=useState('Local cache')
  const [notice,setNotice]=useState('')
  const profile=getStoredProfile()
  const canManage=!profile||profile.role!=='Viewer'

  useEffect(()=>{
    let active=true
    async function load(){
      const localMetrics=safeRead(METRIC_KEY),localEvents=safeRead(EVENT_KEY),localReg=safeRead(REG_KEY)
      if(active){setMetrics(localMetrics);setEvents(localEvents);setRegulatory(localReg)}
      if(!isSupabaseConfigured()){setLoading(false);return}
      try{
        const [m,e,r]=await Promise.all([
          dbSelect('environmental_metrics','select=*&order=period_date.desc,updated_at.desc'),
          dbSelect('environmental_events','select=*&order=event_date.desc,updated_at.desc'),
          dbSelect('regulatory_obligations','select=*'),
        ])
        const nextM=mergeById(localMetrics,(m||[]).map(metricFromDb))
        const nextE=mergeById(localEvents,(e||[]).map(eventFromDb))
        if(active){setMetrics(nextM);setEvents(nextE);setRegulatory(Array.isArray(r)?r:[]);safeWrite(METRIC_KEY,nextM);safeWrite(EVENT_KEY,nextE);setSource('Supabase central data')}
      }catch{if(active)setSource('Offline / local cache')}
      if(active)setLoading(false)
    }
    load();return()=>{active=false}
  },[])

  const companies=useMemo(()=>filteredCompanies(filters),[filters])
  const allowed=useMemo(()=>new Set(companies.map(c=>c.code)),[companies])
  const specific=filters.company!=='All'||filters.region!=='All'||filters.province!=='All'||filters.pic!=='All'
  const scopedMetrics=useMemo(()=>metrics.filter(m=>{const code=companyCodeOf(m);return code?allowed.has(code):!specific}),[metrics,allowed,specific])
  const scopedEvents=useMemo(()=>events.filter(e=>{const code=companyCodeOf(e);return code?allowed.has(code):!specific}),[events,allowed,specific])
  const scopedReg=useMemo(()=>regulatory.filter(r=>{const code=companyCodeOf(r);const inScope=code?allowed.has(code):!specific;const text=[r.category,r.obligation,r.regulation].join(' ').toLowerCase();return inScope&&(text.includes('environment')||text.includes('esg')||text.includes('sustain'))}),[regulatory,allowed,specific])

  const years=useMemo(()=>{
    const values=new Set([currentYear(),...scopedMetrics.map(m=>String(m.periodDate||'').slice(0,4)).filter(Boolean),...scopedEvents.map(e=>String(e.eventDate||'').slice(0,4)).filter(Boolean)])
    return [...values].sort((a,b)=>b.localeCompare(a))
  },[scopedMetrics,scopedEvents])

  const filteredMetrics=useMemo(()=>scopedMetrics.filter(m=>{
    const q=search.trim().toLowerCase();const text=[m.id,m.companyCode,m.category,m.parameter,m.unit,m.unitMeasure,m.sourceRef].join(' ').toLowerCase()
    return(!year||String(m.periodDate||'').startsWith(year))&&(category==='All'||m.category===category)&&(!q||text.includes(q))
  }).sort((a,b)=>String(b.periodDate).localeCompare(String(a.periodDate))),[scopedMetrics,year,category,search])
  const filteredEvents=useMemo(()=>scopedEvents.filter(e=>!year||String(e.eventDate||'').startsWith(year)).sort((a,b)=>String(b.eventDate).localeCompare(String(a.eventDate))),[scopedEvents,year])

  const measurable=filteredMetrics.filter(m=>metricState(m).label!=='Info')
  const onTarget=measurable.filter(m=>metricState(m).label==='On Target').length
  const performance=measurable.length?Math.round(onTarget/measurable.length*100):0
  const openEvents=filteredEvents.filter(e=>e.status!=='Closed')
  const highEvents=openEvents.filter(e=>['High','Critical'].includes(e.severity)).length
  const compliantReg=scopedReg.filter(r=>String(r.status||'').toLowerCase()==='compliant').length
  const regScore=scopedReg.length?Math.round(compliantReg/scopedReg.length*100):0

  const categorySummary=useMemo(()=>categories.map(name=>{
    const rows=filteredMetrics.filter(m=>m.category===name)
    const targetRows=rows.filter(m=>metricState(m).label!=='Info')
    const pass=targetRows.filter(m=>metricState(m).label==='On Target').length
    return{name,count:rows.length,score:targetRows.length?Math.round(pass/targetRows.length*100):null}
  }).filter(x=>x.count),[filteredMetrics])

  const monthly=useMemo(()=>Array.from({length:12},(_,i)=>{
    const month=String(i+1).padStart(2,'0');const count=filteredMetrics.filter(m=>String(m.periodDate||'').slice(5,7)===month).length
    return{month:new Intl.DateTimeFormat('id-ID',{month:'short'}).format(new Date(2026,i,1)),count}
  }),[filteredMetrics])
  const maxMonth=Math.max(1,...monthly.map(m=>m.count))

  function flash(text){setNotice(text);setTimeout(()=>setNotice(''),3500)}
  async function saveMetric(e){
    e.preventDefault()
    if(!canManage){flash('Role Viewer hanya dapat melihat Environmental & ESG Dashboard.');return}
    if(!metricForm.companyCode||!metricForm.parameter.trim()||metricForm.value===''||!metricForm.unitMeasure.trim()){flash('Pilih Company/PT dan lengkapi parameter, nilai serta unit pengukuran.');return}
    const item={id:`ENV-MET-${Date.now()}`,...metricForm,value:Number(metricForm.value),targetValue:metricForm.targetValue===''?'':Number(metricForm.targetValue)}
    const next=[item,...metrics];setMetrics(next);safeWrite(METRIC_KEY,next);setMetricOpen(false);setMetricForm(emptyMetric)
    if(isSupabaseConfigured()){try{await dbUpsert('environmental_metrics',[metricToDb(item)],'id');flash('Environmental metric tersimpan ke central data.');return}catch(err){flash(`Tersimpan lokal, sync central gagal: ${err.message}`);return}}
    flash('Environmental metric tersimpan lokal.')
  }
  async function saveEvent(e){
    e.preventDefault()
    if(!canManage){flash('Role Viewer hanya dapat melihat Environmental & ESG Dashboard.');return}
    if(!eventForm.companyCode||!eventForm.description.trim()||!eventForm.location.trim()||!eventForm.pic.trim()){flash('Pilih Company/PT dan lengkapi deskripsi, lokasi serta PIC.');return}
    const item={id:`ENV-EVT-${Date.now()}`,...eventForm};const next=[item,...events];setEvents(next);safeWrite(EVENT_KEY,next);setEventOpen(false);setEventForm(emptyEvent)
    if(isSupabaseConfigured()){try{await dbUpsert('environmental_events',[eventToDb(item)],'id');flash('Environmental event tersimpan ke central data.');return}catch(err){flash(`Tersimpan lokal, sync central gagal: ${err.message}`);return}}
    flash('Environmental event tersimpan lokal.')
  }
  async function closeEvent(item){
    if(!canManage)return
    const updated={...item,status:'Closed'};const next=events.map(e=>e.id===item.id?updated:e);setEvents(next);safeWrite(EVENT_KEY,next)
    if(isSupabaseConfigured()){try{await dbUpsert('environmental_events',[eventToDb(updated)],'id')}catch{}}
    flash(`${item.id} ditandai Closed.`)
  }
  function downloadCSV(name,header,data){
    const csv=[header,...data].map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n')
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)
  }
  function exportMetrics(){downloadCSV(`SINSHE_Environmental_Metrics_${today()}.csv`,['ID','Company/PT','Period','Category','Parameter','Value','Unit','Target','Operator','Status','Source'],filteredMetrics.map(m=>[m.id,m.companyCode,m.periodDate,m.category,m.parameter,m.value,m.unitMeasure,m.targetValue,m.targetOperator,metricState(m).label,m.sourceRef]))}
  function exportEvents(){downloadCSV(`SINSHE_Environmental_Events_${today()}.csv`,['ID','Company/PT','Date','Type','Severity','Description','Unit','Location','PIC','Due Date','Status','Corrective Action','Evidence'],filteredEvents.map(e=>[e.id,e.companyCode,e.eventDate,e.eventType,e.severity,e.description,e.unit,e.location,e.pic,e.dueDate,e.status,e.correctiveAction,e.evidence]))}

  return <Shell title="Environmental & ESG Dashboard" subtitle="Monitoring environmental performance, ESG indicator, event lingkungan dan compliance per Company/PT.">
    <CompanyScopeBar filters={filters} onChange={setFilters} onReset={()=>setFilters(DEFAULT_COMPANY_FILTERS)}/>
    {notice&&<div className={styles.notice}><CheckCircle2 size={18}/>{notice}</div>}

    <div className="stats-grid four">
      <StatCard label="Environmental Performance" value={measurable.length?`${performance}%`:'—'} hint={measurable.length?`${onTarget}/${measurable.length} metric on target`:'belum ada target terukur'} tone="green" icon={<Leaf/>}/>
      <StatCard label="Metric Records" value={filteredMetrics.length} hint={`${source} • ${year}`} tone="blue" icon={<Activity/>}/>
      <StatCard label="Open Env. Events" value={openEvents.length} hint={`${highEvents} high / critical`} tone={highEvents?'red':'orange'} icon={<AlertTriangle/>}/>
      <StatCard label="ESG / Env Compliance" value={scopedReg.length?`${regScore}%`:'—'} hint={scopedReg.length?`${compliantReg}/${scopedReg.length} compliant`:'belum ada obligation terkait'} tone="purple" icon={<FileCheck2/>}/>
    </div>

    <div className={styles.toolbar}>
      <div><h2>Environmental Performance Register</h2><p>Input angka aktual dan target dari sumber yang terverifikasi. Sistem tidak mengasumsikan emission factor atau batas baku mutu.</p></div>
      <div className={styles.actions}><button className={styles.secondary} onClick={exportMetrics}><Download size={16}/> Metrics CSV</button><button className={styles.secondary} onClick={exportEvents}><Download size={16}/> Events CSV</button>{canManage&&<><button className={styles.secondary} onClick={()=>setEventOpen(true)}><AlertTriangle size={16}/> Laporkan Event</button><button className={styles.primary} onClick={()=>setMetricOpen(true)}><Plus size={17}/> Tambah Metric</button></>}</div>
    </div>

    <Panel>
      <div className={styles.filters}>
        <label className={styles.search}><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari parameter, PT, category, source..."/></label>
        <select value={year} onChange={e=>setYear(e.target.value)}>{years.map(y=><option key={y}>{y}</option>)}</select>
        <select value={category} onChange={e=>setCategory(e.target.value)}><option>All</option>{categories.map(v=><option key={v}>{v}</option>)}</select>
      </div>
      <div className="table-wrap"><table><thead><tr><th>Period</th><th>PT</th><th>Category</th><th>Parameter</th><th>Actual</th><th>Target</th><th>Status</th><th>Source</th></tr></thead><tbody>
        {filteredMetrics.map(m=>{const state=metricState(m);return <tr key={m.id}><td>{fmt(m.periodDate)}</td><td><b>{m.companyCode||'-'}</b><small className={styles.block}>{m.unit}</small></td><td><span className={styles.categoryCell}>{metricIcon(m.category)}{m.category}</span></td><td><b>{m.parameter}</b>{m.notes&&<small className={styles.block}>{m.notes}</small>}</td><td><b>{m.value}</b> {m.unitMeasure}</td><td>{m.targetOperator==='info'||m.targetValue===''?'-':`${m.targetOperator} ${m.targetValue} ${m.unitMeasure}`}</td><td><Badge tone={state.tone}>{state.label}</Badge></td><td>{m.sourceRef||'-'}</td></tr>})}
        {!filteredMetrics.length&&<tr><td colSpan="8" className={styles.empty}>{loading?'Memuat environmental data…':'Belum ada environmental metric sesuai filter.'}</td></tr>}
      </tbody></table></div>
    </Panel>

    <div className="dashboard-split mt">
      <Panel title="Performance by Category">
        <div className={styles.performanceList}>{categorySummary.length?categorySummary.map(row=><div key={row.name} className={styles.performanceRow}><div><b>{row.name}</b><span>{row.count} record</span></div><div className={styles.performanceValue}>{row.score===null?<span>Info only</span>:<><b>{row.score}%</b><Progress value={row.score} tone={row.score>=80?'green':row.score>=60?'orange':'red'}/></>}</div></div>):<div className={styles.emptyCard}>Belum ada data category untuk tahun {year}.</div>}</div>
      </Panel>
      <Panel title={`Reporting Coverage · ${year}`}>
        <div className={styles.monthChart}>{monthly.map(m=><div key={m.month} className={styles.monthCol}><b>{m.count}</b><div><span style={{height:`${Math.max(4,(m.count/maxMonth)*100)}%`}}/></div><small>{m.month}</small></div>)}</div>
        <p className={styles.chartNote}>Chart ini menunjukkan jumlah record yang dilaporkan per bulan, bukan menjumlahkan nilai dengan unit berbeda.</p>
      </Panel>
    </div>

    <Panel title="Environmental Events & Follow-up" className="mt">
      <div className="table-wrap"><table><thead><tr><th>Date</th><th>PT</th><th>Event</th><th>Description</th><th>Severity</th><th>PIC / Due</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {filteredEvents.map(e=><tr key={e.id}><td>{fmt(e.eventDate)}</td><td><b>{e.companyCode||'-'}</b><small className={styles.block}>{e.unit}</small></td><td><b>{e.eventType}</b><small className={styles.block}>{e.location||'-'}</small></td><td><b>{e.description}</b>{e.correctiveAction&&<small className={styles.block}>CA: {e.correctiveAction}</small>}</td><td><Badge tone={severityTone(e.severity)}>{e.severity}</Badge></td><td>{e.pic||'-'}<small className={styles.block}>{e.dueDate?`Due ${fmt(e.dueDate)}`:'No due date'}</small></td><td><Badge tone={eventTone(e.status)}>{e.status}</Badge></td><td>{canManage&&e.status!=='Closed'?<button className={styles.closeBtn} onClick={()=>closeEvent(e)}><CheckCircle2 size={14}/> Close</button>:<span className={styles.done}><CheckCircle2 size={14}/> Done</span>}</td></tr>)}
        {!filteredEvents.length&&<tr><td colSpan="8" className={styles.empty}>Belum ada environmental event sesuai filter.</td></tr>}
      </tbody></table></div>
    </Panel>

    <div className="dashboard-split mt">
      <Panel title="Environmental Governance"><div className={styles.governance}><div><FileCheck2/><span>Environmental / ESG obligations</span><b>{scopedReg.length}</b></div><div><CheckCircle2/><span>Compliant obligations</span><b>{compliantReg}</b></div><div><Clock3/><span>Open environmental events</span><b>{openEvents.length}</b></div></div></Panel>
      <Panel title="Data Discipline"><div className={styles.infoBox}><Leaf size={20}/><div><b>Actual data only.</b><p>Masukkan nilai dari hasil monitoring, laboratory report, meter, manifest, atau sumber resmi lain. Target bersifat user-defined sehingga dashboard tidak mengganti standar legal atau metodologi ESG yang berlaku.</p></div></div></Panel>
    </div>

    {metricOpen&&<div className={styles.backdrop} onMouseDown={e=>{if(e.target===e.currentTarget)setMetricOpen(false)}}><div className={styles.modal}><div className={styles.modalHead}><div><h2>Tambah Environmental Metric</h2><p>Catat actual, unit dan target yang memang digunakan oleh unit.</p></div><button onClick={()=>setMetricOpen(false)}><X size={18}/></button></div><form onSubmit={saveMetric} className={styles.form}><div className={styles.formGrid}>
      <label>Company / PT<select value={metricForm.companyCode} onChange={e=>setMetricForm({...metricForm,companyCode:e.target.value})}><option value="">-- Pilih PT --</option>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
      <label>Period Date<input type="date" value={metricForm.periodDate} onChange={e=>setMetricForm({...metricForm,periodDate:e.target.value})}/></label>
      <label>Category<select value={metricForm.category} onChange={e=>setMetricForm({...metricForm,category:e.target.value})}>{categories.map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Unit / Area<select value={metricForm.unit} onChange={e=>setMetricForm({...metricForm,unit:e.target.value})}>{units.map(v=><option key={v}>{v}</option>)}</select></label>
      <label className={styles.span2}>Parameter<input value={metricForm.parameter} onChange={e=>setMetricForm({...metricForm,parameter:e.target.value})} placeholder="Contoh: Water consumption, TMAT, electricity, hazardous waste"/></label>
      <label>Actual Value<input type="number" step="any" value={metricForm.value} onChange={e=>setMetricForm({...metricForm,value:e.target.value})}/></label>
      <label>Unit Measure<input value={metricForm.unitMeasure} onChange={e=>setMetricForm({...metricForm,unitMeasure:e.target.value})} placeholder="m3, kWh, ton, cm, mg/L..."/></label>
      <label>Target Logic<select value={metricForm.targetOperator} onChange={e=>setMetricForm({...metricForm,targetOperator:e.target.value})}>{operators.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
      <label>Target Value<input type="number" step="any" disabled={metricForm.targetOperator==='info'} value={metricForm.targetValue} onChange={e=>setMetricForm({...metricForm,targetValue:e.target.value})}/></label>
      <label className={styles.span2}>Source / Reference<input value={metricForm.sourceRef} onChange={e=>setMetricForm({...metricForm,sourceRef:e.target.value})} placeholder="Lab report, meter ID, manifest, monitoring report..."/></label>
      <label className={styles.span2}>Notes<textarea value={metricForm.notes} onChange={e=>setMetricForm({...metricForm,notes:e.target.value})}/></label>
    </div><div className={styles.formFooter}><button type="button" className={styles.secondary} onClick={()=>setMetricOpen(false)}>Batal</button><button type="submit" className={styles.primary}>Simpan Metric</button></div></form></div></div>}

    {eventOpen&&<div className={styles.backdrop} onMouseDown={e=>{if(e.target===e.currentTarget)setEventOpen(false)}}><div className={styles.modal}><div className={styles.modalHead}><div><h2>Laporkan Environmental Event</h2><p>Catat event, severity, PIC dan follow-up.</p></div><button onClick={()=>setEventOpen(false)}><X size={18}/></button></div><form onSubmit={saveEvent} className={styles.form}><div className={styles.formGrid}>
      <label>Company / PT<select value={eventForm.companyCode} onChange={e=>setEventForm({...eventForm,companyCode:e.target.value})}><option value="">-- Pilih PT --</option>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
      <label>Event Date<input type="date" value={eventForm.eventDate} onChange={e=>setEventForm({...eventForm,eventDate:e.target.value})}/></label>
      <label>Event Type<select value={eventForm.eventType} onChange={e=>setEventForm({...eventForm,eventType:e.target.value})}>{eventTypes.map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Severity<select value={eventForm.severity} onChange={e=>setEventForm({...eventForm,severity:e.target.value})}>{severities.map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Unit / Area<select value={eventForm.unit} onChange={e=>setEventForm({...eventForm,unit:e.target.value})}>{units.map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Location<input value={eventForm.location} onChange={e=>setEventForm({...eventForm,location:e.target.value})}/></label>
      <label className={styles.span2}>Description<textarea value={eventForm.description} onChange={e=>setEventForm({...eventForm,description:e.target.value})}/></label>
      <label>PIC<input value={eventForm.pic} onChange={e=>setEventForm({...eventForm,pic:e.target.value})}/></label>
      <label>Due Date<input type="date" value={eventForm.dueDate} onChange={e=>setEventForm({...eventForm,dueDate:e.target.value})}/></label>
      <label className={styles.span2}>Immediate Action<textarea value={eventForm.immediateAction} onChange={e=>setEventForm({...eventForm,immediateAction:e.target.value})}/></label>
      <label className={styles.span2}>Corrective Action<textarea value={eventForm.correctiveAction} onChange={e=>setEventForm({...eventForm,correctiveAction:e.target.value})}/></label>
      <label>Status<select value={eventForm.status} onChange={e=>setEventForm({...eventForm,status:e.target.value})}>{eventStatuses.map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Evidence Ref<input value={eventForm.evidence} onChange={e=>setEventForm({...eventForm,evidence:e.target.value})} placeholder="Document ID / evidence reference"/></label>
    </div><div className={styles.formFooter}><button type="button" className={styles.secondary} onClick={()=>setEventOpen(false)}>Batal</button><button type="submit" className={styles.primary}>Simpan Event</button></div></form></div></div>}
  </Shell>
}
