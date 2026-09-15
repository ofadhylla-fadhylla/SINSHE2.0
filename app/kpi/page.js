'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge, Progress, SectionTitle, StatCard } from '../../components/Ui'
import {
  AlertTriangle, BarChart3, CheckCircle2, Clock3, FileCheck2,
  GraduationCap, Leaf, ShieldCheck, Users, Workflow, Database
} from 'lucide-react'
import { dbSelect, isSupabaseConfigured } from '../../lib/supabase-rest'
import { DEFAULT_COMPANY_FILTERS, companyCodeOf, filteredCompanies, scopeLabel } from '../../lib/company-master'

const CURRENT_YEAR = String(new Date().getFullYear())
const emptyData = {
  incidents:[], observations:[], actions:[], compliance:[], learning:[], hazards:[], permits:[], assets:[],
  loaded:false, centralTables:0, localTables:0,
}

function safeRead(key){
  try { const raw=localStorage.getItem(key); return raw?JSON.parse(raw):[] } catch { return [] }
}
function isoDate(value){ if(!value)return ''; const text=String(value); return text.includes('T')?text.slice(0,10):text }
function normalizeDb(table,rows){
  const list=Array.isArray(rows)?rows:[]
  if(table==='incidents') return list.map(x=>({...x,date:isoDate(x.incident_date),type:x.incident_type,dueDate:isoDate(x.due_date)}))
  if(table==='observations') return list.map(x=>({...x,date:isoDate(x.observation_date),type:x.observation_type,dueDate:isoDate(x.due_date)}))
  if(table==='corrective_actions') return list.map(x=>({...x,createdAt:isoDate(x.created_at),dueDate:isoDate(x.due_date)}))
  if(table==='regulatory_obligations') return list.map(x=>({...x,dueDate:isoDate(x.due_date)}))
  if(table==='learning_records') return list.map(x=>({...x,trainingDate:isoDate(x.training_date),validUntil:isoDate(x.valid_until),companyCode:x.company_code}))
  if(table==='hazards') return list.map(x=>({...x,reviewDate:isoDate(x.review_date),riskLevel:x.risk_level,category:x.hazard_category}))
  if(table==='permits') return list.map(x=>({...x,startDate:isoDate(x.start_at),endDate:isoDate(x.end_at),type:x.permit_type}))
  if(table==='assets') return list.map(x=>({...x,createdAt:isoDate(x.created_at)}))
  return list
}
function recordDate(item){
  return item.date||item.incident_date||item.observation_date||item.createdAt||item.created_at||item.trainingDate||item.training_date||item.reviewDate||item.review_date||item.startDate||item.start_at||item.dueDate||item.due_date||''
}
function recordYear(item){ const value=recordDate(item); return value?String(value).slice(0,4):'' }
function monthKey(value){ const d=new Date(value); if(Number.isNaN(d.getTime()))return ''; return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }
function isExpired(value){ return !!value && new Date(`${isoDate(value)}T23:59:59`) < new Date() }
function pct(value){ return Number.isFinite(value)?Math.round(value*10)/10:null }
function changePct(current,previous){ if(!previous)return null; return pct(((current-previous)/previous)*100) }
function formatDelta(value){ if(value===null||value===undefined)return 'Baseline needed'; if(value===0)return '0%'; return `${value>0?'+':''}${value}%` }
function linePoints(values,maxValue){
  return values.map((value,index)=>`${Math.round(55+index*(595/Math.max(1,values.length-1)))},${Math.round(245-((value||0)/Math.max(1,maxValue))*175)}`).join(' ')
}
function complianceScore(rows){
  if(!rows.length)return null
  const compliant=rows.filter(i=>i.status==='Compliant').length
  const needs=rows.filter(i=>i.status==='Needs Action').length
  return pct(((compliant+needs*0.5)/rows.length)*100)
}
function riskIsHigh(item){
  const value=String(item.severity||item.risk||item.riskLevel||item.risk_level||'').toLowerCase()
  if(value.includes('critical')||value.includes('extreme')||value.includes('high')) return true
  const score=Number(item.likelihood||0)*Number(item.severity||0)
  return score>=9
}

export default function KPI(){
  const [data,setData]=useState(emptyData)
  const [filters,setFilters]=useState(DEFAULT_COMPANY_FILTERS)
  const [year,setYear]=useState(CURRENT_YEAR)

  useEffect(()=>{
    let active=true
    async function load(){
      const configs=[
        ['incidents','sinshe-incidents','incidents'],
        ['observations','sinshe-observations','observations'],
        ['corrective_actions','sinshe-corrective-actions','actions'],
        ['regulatory_obligations','sinshe-regulatory-obligations','compliance'],
        ['learning_records','sinshe-learning-records','learning'],
        ['hazards','sinshe-hazards','hazards'],
        ['permits','sinshe-permits','permits'],
        ['assets','sinshe-assets','assets'],
      ]
      const next={...emptyData,loaded:true}; let centralTables=0; let localTables=0
      await Promise.all(configs.map(async([table,key,stateKey])=>{
        let central=[]
        if(isSupabaseConfigured()){
          try { central=normalizeDb(table,await dbSelect(table,'select=*')) } catch { central=[] }
        }
        if(central.length){ next[stateKey]=central; centralTables+=1; return }
        const local=safeRead(key); next[stateKey]=Array.isArray(local)?local:[]; if(next[stateKey].length)localTables+=1
      }))
      next.centralTables=centralTables; next.localTables=localTables
      if(active)setData(next)
    }
    load(); return()=>{active=false}
  },[])

  const availableYears=useMemo(()=>{
    const all=[...data.incidents,...data.observations,...data.actions,...data.compliance,...data.learning,...data.hazards,...data.permits]
    const years=[...new Set(all.map(recordYear).filter(Boolean))].sort((a,b)=>b.localeCompare(a))
    return years.includes(CURRENT_YEAR)?years:[CURRENT_YEAR,...years]
  },[data])

  const scopedAll=useMemo(()=>{
    const companies=filteredCompanies(filters); const allowed=new Set(companies.map(c=>c.code))
    const specific=filters.company!=='All'||filters.region!=='All'||filters.province!=='All'||filters.pic!=='All'
    const apply=list=>list.filter(item=>{ const code=companyCodeOf(item); return !code?!specific:allowed.has(code) })
    return {
      companies,
      incidents:apply(data.incidents), observations:apply(data.observations), actions:apply(data.actions), compliance:apply(data.compliance),
      learning:apply(data.learning), hazards:apply(data.hazards), permits:apply(data.permits), assets:apply(data.assets),
      unassigned:[...data.incidents,...data.observations,...data.actions,...data.compliance,...data.learning,...data.hazards,...data.permits,...data.assets].filter(x=>!companyCodeOf(x)).length,
    }
  },[data,filters])

  const byYear=(list,targetYear)=>list.filter(item=>!recordYear(item)||recordYear(item)===targetYear)
  const previousYear=String(Number(year==='All'?CURRENT_YEAR:year)-1)

  const metrics=useMemo(()=>{
    if(!data.loaded)return null
    const y=year==='All'?CURRENT_YEAR:year
    const incidents=year==='All'?scopedAll.incidents:byYear(scopedAll.incidents,y)
    const observations=year==='All'?scopedAll.observations:byYear(scopedAll.observations,y)
    const actions=year==='All'?scopedAll.actions:byYear(scopedAll.actions,y)
    const compliance=year==='All'?scopedAll.compliance:byYear(scopedAll.compliance,y)
    const learning=year==='All'?scopedAll.learning:byYear(scopedAll.learning,y)
    const hazards=year==='All'?scopedAll.hazards:byYear(scopedAll.hazards,y)

    const prevIncidents=byYear(scopedAll.incidents,previousYear)
    const prevObservations=byYear(scopedAll.observations,previousYear)
    const prevCompliance=byYear(scopedAll.compliance,previousYear)

    const fatality=incidents.filter(i=>String(i.type||i.incident_type||'').toLowerCase().includes('fatal')).length
    const highRiskIncidents=incidents.filter(i=>i.status!=='Closed'&&['High','Critical'].includes(i.severity)).length
    const prevHigh=prevIncidents.filter(i=>i.status!=='Closed'&&['High','Critical'].includes(i.severity)).length
    const highRiskDelta=changePct(highRiskIncidents,prevHigh)
    const safetyObservation=observations.length
    const safetyDelta=changePct(safetyObservation,prevObservations.length)
    const compScore=complianceScore(compliance)
    const prevCompScore=complianceScore(prevCompliance)

    const sustainabilityRows=compliance.filter(i=>['Sustainability','ESG'].includes(i.category)||/ispo|rspo|esg|sustain/i.test(`${i.regulation||''} ${i.obligation||''}`))
    const prevSustainability=prevCompliance.filter(i=>['Sustainability','ESG'].includes(i.category)||/ispo|rspo|esg|sustain/i.test(`${i.regulation||''} ${i.obligation||''}`))
    const esgScore=complianceScore(sustainabilityRows)
    const prevEsgScore=complianceScore(prevSustainability)
    const esgDelta=esgScore!==null&&prevEsgScore?changePct(esgScore,prevEsgScore):null

    const validTraining=learning.filter(r=>{
      const status=String(r.status||'').toLowerCase()
      if(status==='expired')return false
      const valid=r.validUntil||r.valid_until
      return !valid||!isExpired(valid)
    }).length
    const people=learning.length?Math.round(validTraining/learning.length*100):0
    const closedActions=actions.filter(a=>a.status==='Closed').length
    const process=actions.length?Math.round(closedActions/actions.length*100):0
    const technology=Math.round((data.centralTables/8)*100)
    const governance=compScore===null?0:Math.round(compScore)
    const sustainability=esgScore===null?0:Math.round(esgScore)

    const months=[]; const anchor=new Date(Number(y),11,1)
    for(let n=11;n>=0;n--){ const d=new Date(anchor.getFullYear(),anchor.getMonth()-n,1); months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`) }
    const obsSeries=months.map(m=>observations.filter(o=>monthKey(recordDate(o))===m).length)
    const highSeries=months.map(m=>incidents.filter(i=>monthKey(recordDate(i))===m&&['High','Critical'].includes(i.severity)).length)
    const maxValue=Math.max(1,...obsSeries,...highSeries)

    const openCriticalHazards=hazards.filter(h=>h.status!=='Closed'&&riskIsHigh(h)).length
    const overdueActions=actions.filter(a=>a.status!=='Closed'&&((a.dueDate||a.due_date)&&isExpired(a.dueDate||a.due_date))).length

    return {
      y,fatality,highRiskIncidents,highRiskDelta,safetyObservation,safetyDelta,compScore,esgScore,esgDelta,
      responseTime:null, people,process,technology,governance,sustainability,
      trend:{obs:linePoints(obsSeries,maxValue),high:linePoints(highSeries,maxValue)},
      openCriticalHazards,overdueActions,
      kpis:[
        {name:'Fatality (Zero Harm)',unit:'Kasus',actual:String(fatality),target26:'0',target27:'0',status:fatality===0?'On Track':'Critical',tone:fatality===0?'green':'red'},
        {name:'High Risk Incident',unit:'Perubahan YoY',actual:highRiskDelta===null?`${highRiskIncidents} kasus`:formatDelta(highRiskDelta),target26:'-50%',target27:'-70%',status:highRiskDelta===null?'Baseline needed':highRiskDelta<=-50?'On Track':'Below Target',tone:highRiskDelta!==null&&highRiskDelta<=-50?'green':'orange'},
        {name:'Response Time (Rata-rata)',unit:'Menit',actual:'—',target26:'-30%',target27:'-50%',status:'Timestamp needed',tone:'blue'},
        {name:'Safety Observation',unit:'Perubahan YoY',actual:safetyDelta===null?`${safetyObservation} record`:formatDelta(safetyDelta),target26:'+20%',target27:'+40%',status:safetyDelta===null?'Baseline needed':safetyDelta>=20?'On Track':'Below Target',tone:safetyDelta!==null&&safetyDelta>=20?'green':'orange'},
        {name:'Compliance Audit',unit:'%',actual:compScore===null?'—':`${compScore}%`,target26:'100%',target27:'100%',status:compScore===null?'No data':compScore>=100?'On Track':'Gap',tone:compScore!==null&&compScore>=100?'green':'orange'},
        {name:'ESG Performance Score',unit:'Score / YoY',actual:esgScore===null?'—':esgDelta===null?`${esgScore}%`:`${esgScore}% (${formatDelta(esgDelta)})`,target26:'+10%',target27:'+20%',status:esgScore===null?'No data':esgDelta===null?'Baseline needed':esgDelta>=10?'On Track':'Below Target',tone:esgDelta!==null&&esgDelta>=10?'green':'orange'},
      ]
    }
  },[data.loaded,data.centralTables,scopedAll,year,previousYear])

  const perspectives=[
    ['People',metrics?.people??0,'red','Training & competency compliance'],
    ['Process',metrics?.process??0,'blue','Corrective action closure'],
    ['Technology',metrics?.technology??0,'green','Central database coverage'],
    ['Governance',metrics?.governance??0,'purple','Regulatory compliance score'],
    ['Sustainability',metrics?.sustainability??0,'green','ESG / sustainability obligations'],
  ]

  const sourceLabel=data.centralTables>0?`CENTRAL DATA • ${data.centralTables}/8 modul Supabase${data.localTables?` • ${data.localTables} fallback browser`:''}`:data.localTables>0?`MODULE DATA • ${data.localTables} modul browser`:'REFERENCE MODE • belum ada data operasional'

  return <Shell title="SINSHE 2.0 KPI Dashboard" subtitle="Mengukur kinerja implementasi secara terukur dan berkelanjutan menuju safety excellence.">
    <CompanyScopeBar filters={filters} onChange={setFilters} onReset={()=>setFilters(DEFAULT_COMPANY_FILTERS)}/>

    <div style={{marginBottom:14,padding:'10px 12px',border:'1px solid #d9e9dd',background:'#f1f8f3',borderRadius:10,fontSize:11,fontWeight:800,color:'#176b34',display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',alignItems:'center'}}>
      <span>{sourceLabel} • Scope: {scopeLabel(filters)}</span>
      <span style={{display:'flex',alignItems:'center',gap:8}}>
        {scopedAll.companies.length} PT
        <select value={year} onChange={e=>setYear(e.target.value)} style={{border:'1px solid #cfe1d4',borderRadius:8,padding:'6px 8px',background:'#fff',fontWeight:800,color:'#176b34'}}>
          <option value="All">Semua Tahun</option>{availableYears.map(v=><option key={v}>{v}</option>)}
        </select>
      </span>
    </div>

    {scopedAll.unassigned>0&&<div style={{marginBottom:14,padding:'9px 12px',border:'1px solid #f2d49b',background:'#fff8e8',borderRadius:10,fontSize:11,color:'#8a5a00'}}>
      {scopedAll.unassigned} record lama belum memiliki Company/PT dan hanya ikut pada scope All Companies.
    </div>}

    <div className="stats-grid six">
      <StatCard label="Fatality" value={metrics?.fatality??0} hint="Target: Zero Harm" tone="red" icon={<ShieldCheck/>}/>
      <StatCard label="High Risk Incident" value={metrics?.highRiskDelta==null?(metrics?.highRiskIncidents??0):formatDelta(metrics.highRiskDelta)} hint={metrics?.highRiskDelta==null?'baseline YoY belum tersedia':'vs tahun sebelumnya'} tone="orange" icon={<AlertTriangle/>}/>
      <StatCard label="Response Time" value="—" hint="butuh timestamp response" tone="blue" icon={<Clock3/>}/>
      <StatCard label="Safety Observation" value={metrics?.safetyDelta==null?(metrics?.safetyObservation??0):formatDelta(metrics.safetyDelta)} hint={metrics?.safetyDelta==null?'record pada scope':'vs tahun sebelumnya'} tone="green" icon={<BarChart3/>}/>
      <StatCard label="Compliance" value={metrics?.compScore==null?'—':`${metrics.compScore}%`} hint="Legal & regulatory register" tone="purple" icon={<FileCheck2/>}/>
      <StatCard label="ESG" value={metrics?.esgScore==null?'—':`${metrics.esgScore}%`} hint="Sustainability obligations" tone="green" icon={<Leaf/>}/>
    </div>

    <div className="kpi-layout">
      <div className="panel">
        <SectionTitle title="KPI Utama"/>
        <div className="table-wrap"><table><thead><tr><th>KPI</th><th>Satuan</th><th>Aktual {metrics?.y||year}</th><th>Target 2026</th><th>Target 2027</th><th>Status</th></tr></thead><tbody>
          {(metrics?.kpis||[]).map(r=><tr key={r.name}><td><b>{r.name}</b></td><td>{r.unit}</td><td><b>{r.actual}</b></td><td><b>{r.target26}</b></td><td><b>{r.target27}</b></td><td><Badge tone={r.tone}>{r.status}</Badge></td></tr>)}
        </tbody></table></div>
        <p style={{fontSize:10,color:'#7b858e',margin:'10px 2px 0'}}>Target 2026/2027 dipertahankan sesuai master konsep. Aktual hanya dihitung dari data modul yang tersedia; KPI yang membutuhkan baseline atau timestamp tidak diisi dengan angka dummy.</p>
      </div>

      <div className="panel">
        <SectionTitle title="Tren Kinerja KPI Utama"/>
        <div className="chart-card"><svg viewBox="0 0 700 320" role="img" aria-label="KPI trend chart">
          <g className="grid-lines"><line x1="55" y1="45" x2="665" y2="45"/><line x1="55" y1="110" x2="665" y2="110"/><line x1="55" y1="175" x2="665" y2="175"/><line x1="55" y1="240" x2="665" y2="240"/></g>
          <polyline className="line orange" points={metrics?.trend.high||''}/><polyline className="line green" points={metrics?.trend.obs||''}/>
        </svg><div className="chart-legend"><span><i className="dot d-orange"/>High Risk Incident</span><span><i className="dot d-green"/>Safety Observation</span><span><Clock3 size={12}/> Response Time: menunggu timestamp</span></div></div>
      </div>

      <div className="panel">
        <SectionTitle title="KPI by Perspective"/>
        <div className="perspective-list">{perspectives.map(([name,value,tone,note])=><div key={name}><div><b>{name}</b><span>{value}%</span></div><Progress value={value} tone={tone}/><small style={{display:'block',marginTop:4,color:'#7b858e'}}>{note}</small></div>)}</div>
      </div>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12,margin:'14px 0'}}>
      <div className="panel" style={{padding:14}}><div style={{display:'flex',gap:10,alignItems:'center'}}><AlertTriangle color="#d97706"/><div><small style={{color:'#7c858e',fontWeight:800}}>HIGH-RISK HAZARD</small><div style={{fontSize:24,fontWeight:900}}>{metrics?.openCriticalHazards??0}</div><span style={{fontSize:11,color:'#7c858e'}}>Open High / Extreme risk</span></div></div></div>
      <div className="panel" style={{padding:14}}><div style={{display:'flex',gap:10,alignItems:'center'}}><CheckCircle2 color="#19713e"/><div><small style={{color:'#7c858e',fontWeight:800}}>PROCESS CLOSURE</small><div style={{fontSize:24,fontWeight:900}}>{metrics?.process??0}%</div><span style={{fontSize:11,color:'#7c858e'}}>Corrective action closed</span></div></div></div>
      <div className="panel" style={{padding:14}}><div style={{display:'flex',gap:10,alignItems:'center'}}><Database color="#2469a8"/><div><small style={{color:'#7c858e',fontWeight:800}}>CENTRAL DATA COVERAGE</small><div style={{fontSize:24,fontWeight:900}}>{metrics?.technology??0}%</div><span style={{fontSize:11,color:'#7c858e'}}>{data.centralTables}/8 modul membaca Supabase</span></div></div></div>
    </div>

    <div className="driver-row">
      <div><Users/><b>People</b><span>Learning, competency & keterlibatan</span></div>
      <div><Workflow/><b>Process</b><span>Monitoring & closure berkelanjutan</span></div>
      <div><BarChart3/><b>Technology</b><span>Data terpusat & real-time</span></div>
      <div><CheckCircle2/><b>Governance</b><span>Compliance & tindak lanjut</span></div>
      <div><GraduationCap/><b>Sustainability</b><span>ESG & sustainability performance</span></div>
    </div>
  </Shell>
}
