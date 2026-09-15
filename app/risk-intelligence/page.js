'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge, Panel, Progress, StatCard } from '../../components/Ui'
import {
  AlertTriangle, BrainCircuit, CheckCircle2, Download, Gauge, MapPin,
  RefreshCw, ShieldAlert, Sparkles, Target, TrendingDown, TrendingUp, Zap
} from 'lucide-react'
import { dbSelect, isSupabaseConfigured } from '../../lib/supabase-rest'
import { DEFAULT_COMPANY_FILTERS, companyCodeOf, filteredCompanies, scopeLabel } from '../../lib/company-master'
import styles from './risk-intelligence.module.css'

const WINDOWS=[30,90,180,365]
const severityWeight={Critical:10,High:7,Medium:4,Low:2}
const routeBySource={
  Incident:'/incident', Hazard:'/hazard-risk', Observation:'/inspection', 'Corrective Action':'/corrective-action',
  'Environmental Event':'/environmental-esg', 'Environmental Metric':'/environmental-esg', 'QR Inspection':'/qr-inspection',
  Audit:'/audit-management', Compliance:'/regulatory-compliance', GIS:'/gis-map'
}
const sourceOrder=['Incident','Hazard','Observation','Corrective Action','Environmental Event','Environmental Metric','QR Inspection','Audit','Compliance','GIS']
const tableDefs=[
  {key:'incidents',table:'incidents',local:'sinshe-incidents'},
  {key:'hazards',table:'hazards',local:'sinshe-hazards'},
  {key:'observations',table:'observations',local:'sinshe-observations'},
  {key:'actions',table:'corrective_actions',local:'sinshe-corrective-actions'},
  {key:'envEvents',table:'environmental_events',local:'sinshe-environmental-events'},
  {key:'envMetrics',table:'environmental_metrics',local:'sinshe-environmental-metrics'},
  {key:'qrRuns',table:'qr_inspection_runs',local:'sinshe-qr-inspections'},
  {key:'qrItems',table:'qr_inspection_items',local:'sinshe-qr-inspection-items'},
  {key:'auditFindings',table:'audit_findings',local:'sinshe-audit-findings'},
  {key:'regulations',table:'regulatory_obligations',local:'sinshe-regulatory-obligations'},
  {key:'gis',table:'gis_points',local:'sinshe-gis-points'},
]
const emptyData=Object.fromEntries(tableDefs.map(d=>[d.key,[]]))

const safeRead=key=>{try{const raw=localStorage.getItem(key);const rows=raw?JSON.parse(raw):[];return Array.isArray(rows)?rows:[]}catch{return[]}}
const field=(row,...names)=>{for(const name of names){const value=row?.[name];if(value!==undefined&&value!==null&&value!=='')return value}return''}
const text=(...values)=>values.filter(Boolean).join(' ')
const dateOf=(row,...names)=>String(field(row,...names)||'').slice(0,10)
const dateMs=value=>{if(!value)return null;const d=new Date(`${String(value).slice(0,10)}T12:00:00`);return Number.isNaN(d.getTime())?null:d.getTime()}
const nowStart=()=>{const d=new Date();d.setHours(0,0,0,0);return d.getTime()}
const daysUntil=value=>{const ms=dateMs(value);return ms===null?null:Math.ceil((ms-nowStart())/86400000)}
const riskTone=r=>r==='Critical'?'red':r==='High'?'orange':r==='Medium'?'blue':'green'
const scoreLabel=score=>score===null?'No signal':score>=75?'Critical':score>=50?'High':score>=25?'Medium':'Low'
const scoreTone=score=>score===null?'blue':score>=75?'red':score>=50?'orange':score>=25?'blue':'green'
const normalizeRisk=raw=>raw<=0?null:Math.min(100,Math.round(100*(1-Math.exp(-raw/32))))
const riskFromScore=score=>score>=15?'Critical':score>=9?'High':score>=4?'Medium':'Low'
const riskWeight=r=>severityWeight[r]||2
const isClosed=value=>['Closed','Cancelled','Archived','Compliant'].includes(String(value||''))

function detectTheme(value,source){
  const s=String(value||'').toLowerCase()
  if(/fire|kebakaran|hydrant|apar|hotspot/.test(s))return'Fire & Emergency'
  if(/electric|listrik|panel|grounding|lvmdp/.test(s))return'Electrical Safety'
  if(/lift|lifting|crane|hoist|angkat|rigging/.test(s))return'Lifting & Material Handling'
  if(/apd|ppe|helmet|sepatu|glove|respirator/.test(s))return'PPE / Personal Protection'
  if(/spill|oil|oli|chemical|kimia|limbah|b3/.test(s))return'Spill, Chemical & Waste'
  if(/housekeep|bersih|ceceran|akses|jalur/.test(s))return'Housekeeping & Access'
  if(/training|competenc|kompeten|sio|silo|sertifikat/.test(s))return'Competency & Certification'
  if(/permit|ptw|jsa|hot work|confined/.test(s))return'Permit & JSA Control'
  if(/legal|regul|compliance|audit|clause/.test(s))return'Compliance & Audit'
  if(/water|air limbah|emission|emisi|waste|biodiversity|gambut|peat/.test(s))return'Environmental Control'
  if(/boiler|vessel|forklift|asset|guard|machine|alat|equipment/.test(s))return'Asset & Equipment Integrity'
  return source==='Environmental Event'||source==='Environmental Metric'?'Environmental Control':source
}

function addSignal(out,{id,companyCode,source,unit,location,risk,weight,date,title,details,status,ref}){
  out.push({id:String(id||`${source}-${out.length+1}`),companyCode:companyCode||'',source,unit:unit||'Unknown',location:location||'',risk:risk||'Medium',weight:Number(weight||2),date:date||'',title:title||source,details:details||'',status:status||'',ref:ref||id||'',theme:detectTheme(text(title,details,location),source),route:routeBySource[source]||'/'})
}

function buildSignals(data){
  const out=[]
  data.incidents.forEach(r=>{
    const risk=field(r,'severity')||'Medium',status=field(r,'status'),open=!isClosed(status)
    addSignal(out,{id:field(r,'id'),companyCode:companyCodeOf(r),source:'Incident',unit:field(r,'unit'),location:field(r,'location'),risk,weight:riskWeight(risk)+(open?2:0),date:dateOf(r,'incident_date','incidentDate','date','created_at','createdAt'),title:field(r,'incident_type','incidentType')||'Incident',details:field(r,'description'),status,ref:field(r,'id')})
  })
  data.hazards.forEach(r=>{
    const status=field(r,'status');if(isClosed(status))return
    const residual=Number(field(r,'residual_likelihood','residualLikelihood')||0)*Number(field(r,'residual_severity','residualSeverity')||0)
    const initial=Number(field(r,'likelihood')||0)*Number(field(r,'severity')||0)
    const score=residual||initial||0,risk=field(r,'residual_risk_level','residualRiskLevel','risk_level','riskLevel')||riskFromScore(score)
    addSignal(out,{id:field(r,'id'),companyCode:companyCodeOf(r),source:'Hazard',unit:field(r,'unit'),location:field(r,'location'),risk,weight:Math.max(riskWeight(risk),Math.min(10,Math.ceil(score/2))),date:dateOf(r,'updated_at','updatedAt','created_at','createdAt','review_date','reviewDate'),title:field(r,'title','activity')||'Hazard',details:text(field(r,'consequence'),field(r,'additional_controls','additionalControls')),status,ref:field(r,'id','jsa_no','jsaNo')})
  })
  data.observations.forEach(r=>{
    const risk=field(r,'risk')||'Medium',status=field(r,'status'),closed=isClosed(status)
    addSignal(out,{id:field(r,'id'),companyCode:companyCodeOf(r),source:'Observation',unit:field(r,'unit'),location:field(r,'location'),risk,weight:riskWeight(risk)*(closed?.55:1),date:dateOf(r,'observation_date','date','created_at','createdAt'),title:field(r,'observation_type','type')||'Safety Observation',details:text(field(r,'description'),field(r,'action')),status,ref:field(r,'id')})
  })
  data.actions.forEach(r=>{
    const status=field(r,'status');if(isClosed(status))return
    const priority=field(r,'priority')||'Medium',due=field(r,'due_date','dueDate'),overdue=due&&daysUntil(due)<0
    if(!overdue&&!['Critical','High'].includes(priority))return
    addSignal(out,{id:field(r,'id'),companyCode:companyCodeOf(r),source:'Corrective Action',unit:field(r,'unit'),location:field(r,'location'),risk:overdue?'Critical':priority,weight:riskWeight(priority)+(overdue?4:0),date:dateOf(r,'created_at','createdAt','createdAtDate'),title:field(r,'title')||'Corrective Action',details:text(field(r,'source'),field(r,'category'),overdue?'Overdue':''),status,ref:field(r,'id','source_id','sourceId')})
  })
  data.envEvents.forEach(r=>{
    const risk=field(r,'severity')||'Medium',status=field(r,'status'),closed=isClosed(status)
    addSignal(out,{id:field(r,'id'),companyCode:companyCodeOf(r),source:'Environmental Event',unit:field(r,'unit'),location:field(r,'location'),risk,weight:riskWeight(risk)*(closed?.6:1),date:dateOf(r,'event_date','eventDate','created_at','createdAt'),title:field(r,'event_type','eventType')||'Environmental Event',details:field(r,'description'),status,ref:field(r,'id')})
  })
  data.envMetrics.forEach(r=>{
    const value=Number(field(r,'value')),targetRaw=field(r,'target_value','targetValue'),target=targetRaw===''?null:Number(targetRaw),op=field(r,'target_operator','targetOperator')||'info'
    if(target===null||!Number.isFinite(value)||!Number.isFinite(target)||op==='info')return
    const fail=op==='<='?value>target:value<target;if(!fail)return
    const deviation=target===0?1:Math.abs(value-target)/Math.abs(target),risk=deviation>=.25?'High':'Medium'
    addSignal(out,{id:field(r,'id'),companyCode:companyCodeOf(r),source:'Environmental Metric',unit:field(r,'unit'),risk,weight:riskWeight(risk)+Math.min(3,Math.round(deviation*4)),date:dateOf(r,'period_date','periodDate','created_at'),title:`${field(r,'parameter')||'Environmental metric'} off target`,details:`Actual ${value} ${field(r,'unit_measure','unitMeasure')} vs target ${op} ${target}`,status:'Off Target',ref:field(r,'id')})
  })
  const runMap=new Map(data.qrRuns.map(r=>[String(field(r,'id')),r]))
  data.qrItems.forEach(r=>{
    if(field(r,'result')!=='NG')return
    const run=runMap.get(String(field(r,'run_id','runId')))||{},risk=field(r,'risk')||'Medium'
    addSignal(out,{id:field(r,'id'),companyCode:companyCodeOf(r)||companyCodeOf(run),source:'QR Inspection',unit:field(r,'unit')||field(run,'unit'),location:field(run,'location'),risk,weight:riskWeight(risk)+1,date:dateOf(run,'inspection_date','inspectionDate','created_at','createdAt'),title:field(r,'checkpoint')||'QR Inspection NG',details:text(field(r,'category'),field(r,'note'),field(run,'target_name','targetName')),status:'NG',ref:field(run,'id','target_id','targetId')})
  })
  data.auditFindings.forEach(r=>{
    const type=field(r,'finding_type','findingType'),status=field(r,'status');if(!['NC Major','NC Minor'].includes(type))return
    const risk=type==='NC Major'?'High':'Medium'
    addSignal(out,{id:field(r,'id'),companyCode:companyCodeOf(r),source:'Audit',unit:field(r,'unit'),risk,weight:riskWeight(risk)+(isClosed(status)?0:2),date:dateOf(r,'created_at','createdAt','closure_date','closureDate'),title:type,details:text(field(r,'finding'),field(r,'clause')),status,ref:field(r,'id','audit_id','auditId')})
  })
  data.regulations.forEach(r=>{
    const status=field(r,'status'),due=field(r,'due_date','dueDate'),days=daysUntil(due),priority=field(r,'priority')||'Medium'
    if(status==='Compliant')return
    if(!(status==='Non Compliant'||(days!==null&&days<=30)||['Critical','High'].includes(priority)))return
    const risk=status==='Non Compliant'||(days!==null&&days<0)?'High':priority==='Critical'?'Critical':priority
    addSignal(out,{id:field(r,'id'),companyCode:companyCodeOf(r),source:'Compliance',unit:field(r,'unit'),risk,weight:riskWeight(risk)+(days!==null&&days<0?3:0),date:dateOf(r,'updated_at','updatedAt','created_at','createdAt'),title:field(r,'obligation','regulation')||'Compliance obligation',details:text(field(r,'regulation'),days!==null&&days<0?'Overdue':''),status,ref:field(r,'id')})
  })
  data.gis.forEach(r=>{
    const type=field(r,'point_type','pointType'),sourceModule=field(r,'source_module','sourceModule'),status=field(r,'status'),risk=field(r,'risk_level','riskLevel')||'Medium'
    if(isClosed(status)||!['High','Critical'].includes(risk))return
    if(sourceModule!=='Manual'&&!['Hotspot','High Risk Area'].includes(type))return
    addSignal(out,{id:field(r,'id'),companyCode:companyCodeOf(r),source:'GIS',unit:field(r,'unit'),location:field(r,'location'),risk,weight:riskWeight(risk),date:dateOf(r,'observed_date','observedDate','created_at','createdAt'),title:field(r,'title')||type||'GIS risk point',details:text(type,field(r,'notes')),status,ref:field(r,'id')})
  })
  return out
}

function indexFor(signals){return normalizeRisk(signals.reduce((sum,s)=>sum+Number(s.weight||0),0))}
function inWindow(signal,start,end){const ms=dateMs(signal.date);if(ms===null)return end===nowStart();return ms>=start&&ms<=end}
function csvCell(v){return `"${String(v??'').replaceAll('"','""')}"`}

export default function RiskIntelligence(){
  const [data,setData]=useState(emptyData)
  const [filters,setFilters]=useState(DEFAULT_COMPANY_FILTERS)
  const [windowDays,setWindowDays]=useState(90)
  const [source,setSource]=useState('Loading central data…')
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    let active=true
    async function load(){
      const local=Object.fromEntries(tableDefs.map(d=>[d.key,safeRead(d.local)]))
      if(!isSupabaseConfigured()){if(active){setData(local);setSource('Local cache');setLoading(false)}return}
      const results=await Promise.allSettled(tableDefs.map(d=>dbSelect(d.table,'select=*')))
      const central={};let success=0
      results.forEach((result,i)=>{if(result.status==='fulfilled'){central[tableDefs[i].key]=Array.isArray(result.value)?result.value:[];success++}else central[tableDefs[i].key]=[]})
      if(active){setData(success?central:local);setSource(success===tableDefs.length?'Supabase central data':success?`Partial central data · ${success}/${tableDefs.length} sources`:'Offline / local cache');setLoading(false)}
    }
    load();return()=>{active=false}
  },[])

  const companies=useMemo(()=>filteredCompanies(filters),[filters])
  const allowed=useMemo(()=>new Set(companies.map(c=>c.code)),[companies])
  const specific=filters.company!=='All'||filters.region!=='All'||filters.province!=='All'||filters.pic!=='All'
  const scopedData=useMemo(()=>Object.fromEntries(Object.entries(data).map(([key,rows])=>[key,rows.filter(r=>{const code=companyCodeOf(r);return code?allowed.has(code):!specific})])),[data,allowed,specific])
  const allSignals=useMemo(()=>buildSignals(scopedData),[scopedData])
  const currentEnd=nowStart(),currentStart=currentEnd-windowDays*86400000,previousStart=currentStart-windowDays*86400000
  const currentSignals=useMemo(()=>allSignals.filter(s=>inWindow(s,currentStart,currentEnd)),[allSignals,currentStart,currentEnd])
  const previousSignals=useMemo(()=>allSignals.filter(s=>{const ms=dateMs(s.date);return ms!==null&&ms>=previousStart&&ms<currentStart}),[allSignals,previousStart,currentStart])

  const ranking=useMemo(()=>companies.map(c=>{const signals=currentSignals.filter(s=>s.companyCode===c.code);return{...c,signals,index:indexFor(signals),critical:signals.filter(s=>s.risk==='Critical').length,high:signals.filter(s=>s.risk==='High').length,weight:signals.reduce((a,b)=>a+b.weight,0)}}).sort((a,b)=>(b.index??-1)-(a.index??-1)||b.weight-a.weight),[companies,currentSignals])
  const rankedWithSignals=ranking.filter(r=>r.index!==null)
  const scopeIndex=rankedWithSignals.length?Math.round(rankedWithSignals.reduce((s,r)=>s+r.index,0)/rankedWithSignals.length):null
  const critical=currentSignals.filter(s=>s.risk==='Critical').length
  const overdue=scopedData.actions.filter(r=>!isClosed(field(r,'status'))&&field(r,'due_date','dueDate')&&daysUntil(field(r,'due_date','dueDate'))<0).length
  const sourceCoverage=tableDefs.filter(d=>(scopedData[d.key]||[]).length).length
  const coverage=Math.round(sourceCoverage/tableDefs.length*100)

  const bySource=useMemo(()=>sourceOrder.map(name=>{const rows=currentSignals.filter(s=>s.source===name);return{name,count:rows.length,weight:Math.round(rows.reduce((a,b)=>a+b.weight,0))}}).filter(x=>x.count).sort((a,b)=>b.weight-a.weight),[currentSignals])
  const maxSource=Math.max(1,...bySource.map(x=>x.weight))
  const themes=useMemo(()=>{const map=new Map();currentSignals.forEach(s=>{const item=map.get(s.theme)||{theme:s.theme,count:0,weight:0,critical:0,sources:new Set()};item.count++;item.weight+=s.weight;if(s.risk==='Critical')item.critical++;item.sources.add(s.source);map.set(s.theme,item)});return[...map.values()].map(x=>({...x,sources:[...x.sources]})).sort((a,b)=>b.count-a.count||b.weight-a.weight).slice(0,8)},[currentSignals])
  const hotspots=useMemo(()=>{const map=new Map();currentSignals.forEach(s=>{const key=`${s.companyCode||'UNASSIGNED'}|${s.unit||'Unknown'}|${s.location||''}`;const item=map.get(key)||{companyCode:s.companyCode||'',unit:s.unit||'Unknown',location:s.location||'',count:0,weight:0,critical:0};item.count++;item.weight+=s.weight;if(s.risk==='Critical')item.critical++;map.set(key,item)});return[...map.values()].sort((a,b)=>b.weight-a.weight||b.count-a.count).slice(0,8)},[currentSignals])
  const currentWeight=currentSignals.reduce((a,b)=>a+b.weight,0),previousWeight=previousSignals.reduce((a,b)=>a+b.weight,0)
  const trendPct=previousWeight?Math.round((currentWeight-previousWeight)/previousWeight*100):currentWeight?100:0
  const topTheme=themes[0]
  const topPT=rankedWithSignals[0]
  const highCritical=currentSignals.filter(s=>['High','Critical'].includes(s.risk)).length
  const recommendations=useMemo(()=>{
    const rec=[]
    if(topPT?.index>=50)rec.push({tone:'red',title:`Prioritaskan ${topPT.code}`,text:`Risk Index ${topPT.index}/100 dengan ${topPT.critical} critical dan ${topPT.high} high signal pada periode terpilih. Review cross-module bersama PIC PT.`})
    if(topTheme?.count>=2)rec.push({tone:'orange',title:`Recurring issue: ${topTheme.theme}`,text:`Terdeteksi ${topTheme.count} signal dari ${topTheme.sources.length} source. Lakukan thematic RCA dan kontrol lintas lokasi, bukan hanya closure per record.`})
    if(overdue>0)rec.push({tone:'red',title:'Recover overdue corrective actions',text:`Ada ${overdue} corrective action overdue pada scope ini. Prioritaskan action Critical/High dan verifikasi evidence closure.`})
    if(critical>0)rec.push({tone:'red',title:'Critical signal review',text:`Ada ${critical} critical signal dalam ${windowDays} hari. Pastikan immediate control dan escalation aktif sebelum aktivitas berisiko dilanjutkan.`})
    if(coverage<60)rec.push({tone:'blue',title:'Perkuat data coverage',text:`Hanya ${coverage}% source analytics memiliki data pada scope ini. Risk Index dapat understate risiko jika modul belum diisi konsisten.`})
    if(!rec.length)rec.push({tone:'green',title:'Tidak ada escalation otomatis',text:'Belum ada pola yang melewati rule early-warning. Tetap lakukan inspeksi dan pelaporan rutin karena tidak adanya signal bukan bukti tidak adanya risiko.'})
    return rec.slice(0,5)
  },[topPT,topTheme,overdue,critical,coverage,windowDays])

  function exportCSV(){
    const header=['Signal ID','Company/PT','Source','Theme','Risk','Weight','Date','Unit','Location','Title','Status','Reference']
    const rows=currentSignals.map(s=>[s.id,s.companyCode,s.source,s.theme,s.risk,s.weight,s.date,s.unit,s.location,s.title,s.status,s.ref])
    const csv=[header,...rows].map(r=>r.map(csvCell).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`SINSHE_Risk_Intelligence_${windowDays}d_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url)
  }

  return <Shell title="Predictive Risk Intelligence" subtitle="Cross-module early-warning analytics untuk menemukan konsentrasi risiko, recurring issue, hotspot dan prioritas tindakan per Company/PT.">
    <CompanyScopeBar filters={filters} onChange={setFilters} onReset={()=>setFilters(DEFAULT_COMPANY_FILTERS)}/>

    <div className={styles.method}><BrainCircuit size={22}/><div><b>Risk Intelligence v1 · deterministic analytics</b><span>Index dihitung dari record SINSHE yang tersedia, bukan model machine-learning dan bukan probabilitas kecelakaan. Nilai rendah dapat terjadi karena data belum lengkap.</span></div></div>

    <div className={styles.toolbar}><div><h2>{scopeLabel(filters)} · {windowDays}-day risk window</h2><p>{source}{loading?' · loading…':''} · {currentSignals.length} active/recent signal</p></div><div className={styles.actions}><select value={windowDays} onChange={e=>setWindowDays(Number(e.target.value))}>{WINDOWS.map(v=><option value={v} key={v}>{v} hari</option>)}</select><button className={styles.secondary} onClick={()=>setWindowDays(90)}><RefreshCw size={15}/> 90D</button><button className={styles.primary} onClick={exportCSV}><Download size={16}/> Export Signals</button></div></div>

    <div className="stats-grid four">
      <StatCard label="Scope Risk Index" value={scopeIndex===null?'—':`${scopeIndex}/100`} hint={scopeIndex===null?'belum ada signal':`${scoreLabel(scopeIndex)} · avg PT with signals`} tone={scoreTone(scopeIndex)} icon={<Gauge/>}/>
      <StatCard label="High / Critical" value={highCritical} hint={`${critical} critical`} tone={highCritical?'red':'green'} icon={<ShieldAlert/>}/>
      <StatCard label="Overdue Action" value={overdue} hint="corrective action lewat due date" tone={overdue?'red':'green'} icon={<Target/>}/>
      <StatCard label="Data Coverage" value={`${coverage}%`} hint={`${sourceCoverage}/${tableDefs.length} analytics sources`} tone={coverage>=75?'green':coverage>=50?'orange':'red'} icon={<Sparkles/>}/>
    </div>

    <div className={styles.topGrid}>
      <Panel title="PT Risk Ranking"><div className={styles.ranking}>
        {ranking.slice(0,10).map((r,i)=><div className={styles.rankRow} key={r.code}><span className={styles.rankNo}>{i+1}</span><div className={styles.rankName}><b>{r.code} · {r.name}</b><small>{r.signals.length} signal · {r.critical} critical · {r.high} high</small></div><div className={styles.rankScore}><Badge tone={scoreTone(r.index)}>{r.index===null?'No signal':`${r.index}/100`}</Badge>{r.index!==null&&<Progress value={r.index}/>}</div></div>)}
        {!ranking.length&&<div className={styles.empty}>Tidak ada Company/PT pada scope filter.</div>}
      </div></Panel>

      <Panel title="Risk Momentum"><div className={styles.momentum}><div className={styles.momentumIcon}>{trendPct>0?<TrendingUp/>:trendPct<0?<TrendingDown/>:<CheckCircle2/>}</div><div><span>Weighted signals vs previous {windowDays} days</span><strong className={trendPct>0?styles.worse:trendPct<0?styles.better:''}>{trendPct>0?'+':''}{trendPct}%</strong><small>Current weight {Math.round(currentWeight)} · Previous {Math.round(previousWeight)}</small></div></div><div className={styles.sourceList}>{bySource.map(s=><div key={s.name}><div><span>{s.name}</span><b>{s.count} · weight {s.weight}</b></div><div className={styles.bar}><i style={{width:`${Math.max(4,s.weight/maxSource*100)}%`}}/></div></div>)}{!bySource.length&&<div className={styles.empty}>Belum ada source contribution pada periode ini.</div>}</div></Panel>
    </div>

    <div className="dashboard-split mt">
      <Panel title="Recurring Issue Detector"><div className="table-wrap"><table><thead><tr><th>Theme</th><th>Signals</th><th>Sources</th><th>Critical</th><th>Priority</th></tr></thead><tbody>{themes.map(t=><tr key={t.theme}><td><b>{t.theme}</b></td><td>{t.count}</td><td>{t.sources.join(', ')}</td><td>{t.critical}</td><td><Badge tone={t.critical?'red':t.count>=3?'orange':'blue'}>{t.critical?'Immediate':t.count>=3?'Thematic RCA':'Monitor'}</Badge></td></tr>)}{!themes.length&&<tr><td colSpan="5" className={styles.empty}>Belum ada recurring pattern yang dapat dihitung.</td></tr>}</tbody></table></div></Panel>
      <Panel title="Hotspot Concentration"><div className={styles.hotspots}>{hotspots.map((h,i)=><div className={styles.hotspot} key={`${h.companyCode}-${h.unit}-${h.location}-${i}`}><MapPin size={18}/><div><b>{h.companyCode||'Unassigned'} · {h.unit}</b><span>{h.location||'Lokasi belum spesifik'}</span><small>{h.count} signal · weighted {Math.round(h.weight)} · {h.critical} critical</small></div></div>)}{!hotspots.length&&<div className={styles.empty}>Belum ada hotspot berdasarkan record yang tersedia.</div>}<Link className={styles.mapLink} href="/gis-map"><MapPin size={15}/> Buka GIS Safety & Environmental Map</Link></div></Panel>
    </div>

    <Panel className="mt" title="Early-Warning Priorities"><div className={styles.recommendations}>{recommendations.map((r,i)=><div key={i} className={`${styles.rec} ${styles[r.tone]}`}><Zap size={19}/><div><b>{r.title}</b><span>{r.text}</span></div></div>)}</div></Panel>

    <Panel className="mt" title="Signal Register"><div className="table-wrap"><table><thead><tr><th>Risk</th><th>PT</th><th>Source</th><th>Theme</th><th>Title</th><th>Unit / Location</th><th>Date</th><th>Reference</th></tr></thead><tbody>{currentSignals.sort((a,b)=>b.weight-a.weight).slice(0,80).map(s=><tr key={`${s.source}-${s.id}`}><td><Badge tone={riskTone(s.risk)}>{s.risk}</Badge></td><td><b>{s.companyCode||'-'}</b></td><td><Link href={s.route}>{s.source}</Link></td><td>{s.theme}</td><td><b>{s.title}</b><small className={styles.block}>{s.details}</small></td><td>{s.unit}<small className={styles.block}>{s.location||'-'}</small></td><td>{s.date||'-'}</td><td><code>{s.ref||'-'}</code></td></tr>)}{!currentSignals.length&&<tr><td colSpan="8" className={styles.empty}>Belum ada signal pada periode dan scope yang dipilih.</td></tr>}</tbody></table></div></Panel>

    <div className={styles.disclaimer}><AlertTriangle size={18}/><span><b>Interpretasi:</b> Risk Index adalah alat prioritisasi internal berbasis rule dan bobot. Gunakan bersama verifikasi lapangan, HIRA/JSA, inspeksi, investigasi dan judgement HSE. Jangan memakai skor ini sebagai satu-satunya dasar untuk menyatakan area aman.</span></div>
  </Shell>
}
