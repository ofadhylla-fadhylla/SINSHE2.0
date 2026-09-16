'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../components/Shell'
import CompanyScopeBar from '../components/CompanyScopeBar'
import { Badge, BarList, Donut, Panel, Progress, StatCard } from '../components/Ui'
import {
  AlertTriangle, CheckCircle2, ClipboardCheck, Clock3, Eye, FileWarning,
  Flame, GraduationCap, ShieldCheck, Siren, Target, TrendingDown, Wrench
} from 'lucide-react'
import { dbSelect, isSupabaseConfigured } from '../lib/supabase-rest'
import { COMPANY_MASTER, DEFAULT_COMPANY_FILTERS, companyCodeOf, filteredCompanies, scopeLabel } from '../lib/company-master'

const units = ['PKS A', 'PKS B', 'PKS C', 'Estate 1', 'Estate 2', 'Estate 3']
const riskCategories = ['Kebakaran', 'Alat Berat', 'Bahan Kimia', 'Kelistrikan', 'Confined Space']
const fallbackHeat = [[1,2,1,3,2,1],[3,4,2,2,3,2],[2,1,3,1,2,4],[2,3,1,4,1,2],[4,2,3,2,3,1]]
const heatTone = v => v >= 4 ? 'h-crit' : v === 3 ? 'h-high' : v === 2 ? 'h-med' : 'h-low'
const incidentTypes = ['Near Miss','First Aid','Medical Treatment','Restricted Work Case','Lost Time Injury','Fatality','Property Damage','Environmental','Fire']
const RATE_MULTIPLIER = 1000000
const emptyData = {
  incidents:[], actions:[], observations:[], permits:[], assets:[], compliance:[], hazards:[], learning:[], exposures:[],
  loaded:false, centralTables:0, localTables:0,
}

function safeRead(key){
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : [] } catch { return [] }
}
function isoDate(value){ if(!value) return ''; const text=String(value); return text.includes('T')?text.slice(0,10):text }
function normalizeDb(table, rows){
  const list=Array.isArray(rows)?rows:[]
  if(table==='incidents') return list.map(x=>({...x,date:isoDate(x.incident_date),type:x.incident_type,dueDate:isoDate(x.due_date),companyCode:x.company_code}))
  if(table==='corrective_actions') return list.map(x=>({...x,dueDate:isoDate(x.due_date)}))
  if(table==='observations') return list.map(x=>({...x,date:isoDate(x.observation_date),type:x.observation_type,dueDate:isoDate(x.due_date)}))
  if(table==='permits') return list.map(x=>({...x,type:x.permit_type,startDate:isoDate(x.start_at),endDate:isoDate(x.end_at)}))
  if(table==='assets') return list.map(x=>({...x,riksaDue:isoDate(x.riksa_due),sioDue:isoDate(x.sio_due),siloDue:isoDate(x.silo_due),calibrationDue:isoDate(x.calibration_due)}))
  if(table==='regulatory_obligations') return list.map(x=>({...x,dueDate:isoDate(x.due_date)}))
  if(table==='hazards') return list.map(x=>({...x,category:x.hazard_category,riskLevel:x.risk_level,reviewDate:isoDate(x.review_date)}))
  if(table==='learning_records') return list.map(x=>({...x,trainingDate:isoDate(x.training_date),validUntil:isoDate(x.valid_until),companyCode:x.company_code}))
  if(table==='hse_exposure_hours') return list.map(x=>({...x,companyCode:x.company_code,periodMonth:isoDate(x.period_month),employeeHours:Number(x.employee_hours||0),contractorHours:Number(x.contractor_hours||0)}))
  return list
}
function isOverdue(value){ return !!value && new Date(`${isoDate(value)}T23:59:59`) < new Date() }
function daysTo(value){ if(!value) return null; const t=new Date();t.setHours(0,0,0,0);const d=new Date(`${isoDate(value)}T00:00:00`);return Math.ceil((d-t)/86400000) }
function classifyHazard(item){
  const text=`${item.category||''} ${item.hazard_category||''} ${item.title||''} ${item.description||''}`.toLowerCase()
  if(/(fire|kebakaran|hot work|api)/.test(text)) return 'Kebakaran'
  if(/(forklift|crane|alat berat|lifting|excav)/.test(text)) return 'Alat Berat'
  if(/(chemical|kimia|b3|hazmat)/.test(text)) return 'Bahan Kimia'
  if(/(electr|listrik|panel|lvmdp)/.test(text)) return 'Kelistrikan'
  if(/(confined|ruang terbatas|chamber|tank)/.test(text)) return 'Confined Space'
  return null
}
function riskScore(item){
  const level=String(item.riskLevel||item.risk_level||item.risk||item.severity||'').toLowerCase()
  if(level.includes('critical')||level.includes('kritis')||level.includes('extreme')) return 4
  if(level.includes('high')||level.includes('tinggi')) return 3
  if(level.includes('medium')||level.includes('sedang')) return 2
  if(level.includes('low')||level.includes('rendah')) return 1
  const raw=Number(item.likelihood||0)*Number(item.severity||0)
  if(raw>=16) return 4; if(raw>=10) return 3; if(raw>=5) return 2; return raw>0?1:0
}
function monthKey(date){ const d=new Date(date); if(Number.isNaN(d.getTime())) return ''; return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }
function linePoints(values,maxValue){ return values.map((value,index)=>`${Math.round(45+index*(625/Math.max(1,values.length-1)))},${Math.round(235-((value||0)/Math.max(1,maxValue))*180)}`).join(' ') }
function recordYear(item){
  const value=item.date||item.incident_date||item.observation_date||item.trainingDate||item.training_date||item.periodMonth||item.period_month||item.createdAt||item.created_at
  return value ? String(value).slice(0,4) : ''
}
function titleOfRisk(item){ return item.title||item.description||item.obligation||item.name||item.id||'Risk item' }
function incidentType(item){ return String(item.type||item.incident_type||'').toLowerCase() }
function isRecordableIncident(item){ return /(medical treatment|restricted work|lost time|fatal)/.test(incidentType(item)) }
function isLostTimeIncident(item){ return /lost time/.test(incidentType(item)) }
function formatHours(value){ return new Intl.NumberFormat('id-ID',{maximumFractionDigits:0}).format(Number(value)||0) }

export default function Executive(){
  const [data,setData]=useState(emptyData)
  const [filters,setFilters]=useState(DEFAULT_COMPANY_FILTERS)
  const [year,setYear]=useState('All')

  useEffect(()=>{
    let active=true
    async function load(){
      const configs=[
        ['incidents','sinshe-incidents','incidents'],['corrective_actions','sinshe-corrective-actions','actions'],
        ['observations','sinshe-observations','observations'],['permits','sinshe-permits','permits'],
        ['assets','sinshe-assets','assets'],['regulatory_obligations','sinshe-regulatory-obligations','compliance'],
        ['hazards','sinshe-hazards','hazards'],['learning_records','sinshe-learning-records','learning'],
        ['hse_exposure_hours','sinshe-exposure-hours','exposures'],
      ]
      const next={...emptyData,loaded:true}; let centralTables=0; let localTables=0
      await Promise.all(configs.map(async([table,storageKey,stateKey])=>{
        let central=[]
        if(isSupabaseConfigured()){ try{ central=normalizeDb(table,await dbSelect(table,'select=*')) }catch{ central=[] } }
        if(central.length){ next[stateKey]=central; centralTables+=1; return }
        const local=safeRead(storageKey); next[stateKey]=Array.isArray(local)?local:[]; if(next[stateKey].length) localTables+=1
      }))
      next.centralTables=centralTables; next.localTables=localTables; if(active) setData(next)
    }
    load(); return()=>{active=false}
  },[])

  const availableYears=useMemo(()=>{
    const all=[...data.incidents,...data.observations,...data.learning,...data.exposures]
    return [...new Set(all.map(recordYear).filter(Boolean))].sort((a,b)=>b.localeCompare(a))
  },[data])

  const scoped=useMemo(()=>{
    const companies=filteredCompanies(filters)
    const allowed=new Set(companies.map(c=>c.code))
    const specific=filters.company!=='All'||filters.region!=='All'||filters.province!=='All'||filters.pic!=='All'
    const apply=list=>list.filter(item=>{
      const code=companyCodeOf(item)
      const companyMatch=!code ? !specific : allowed.has(code)
      const yearMatch=year==='All'||!recordYear(item)||recordYear(item)===year
      return companyMatch&&yearMatch
    })
    return {
      companies, incidents:apply(data.incidents), actions:apply(data.actions), observations:apply(data.observations),
      permits:apply(data.permits), assets:apply(data.assets), compliance:apply(data.compliance), hazards:apply(data.hazards), learning:apply(data.learning), exposures:apply(data.exposures),
      unassigned:[...data.incidents,...data.actions,...data.observations,...data.permits,...data.assets,...data.compliance,...data.hazards,...data.learning,...data.exposures].filter(x=>!companyCodeOf(x)).length,
    }
  },[data,filters,year])

  const dashboard=useMemo(()=>{
    if(!data.loaded) return null
    const {incidents,actions,observations,permits,assets,compliance,hazards,learning,exposures}=scoped
    const now=new Date()
    const fatality=incidents.filter(i=>incidentType(i).includes('fatal')).length
    const nearMiss=incidents.filter(i=>(i.type||i.incident_type)==='Near Miss').length
    const inspection=observations.length
    const unsafeAction=observations.filter(o=>String(o.type||o.observation_type||'').toLowerCase()==='unsafe action').length
    const unsafeCondition=observations.filter(o=>String(o.type||o.observation_type||'').toLowerCase()==='unsafe condition').length
    const overdueActions=actions.filter(a=>a.status!=='Closed'&&(a.status==='Overdue'||isOverdue(a.dueDate||a.due_date))).length
    const closedActions=actions.filter(a=>a.status==='Closed').length
    const inProgressActions=actions.filter(a=>['In Progress','Progress'].includes(a.status)).length
    const openActions=Math.max(0,actions.length-closedActions-inProgressActions)
    const closureRate=actions.length?Math.round(closedActions/actions.length*100):0
    const expiredPermit=permits.filter(p=>p.status==='Expired'||(p.status!=='Closed'&&isOverdue(p.endDate||p.end_at))).length
    const assetDates=a=>[a.riksaDue||a.riksa_due,a.sioDue||a.sio_due,a.siloDue||a.silo_due,a.calibrationDue||a.calibration_due].filter(Boolean)
    const assetOverdue=assets.filter(a=>assetDates(a).some(isOverdue)).length
    const assetDueSoon=assets.filter(a=>!assetDates(a).some(isOverdue)&&assetDates(a).some(d=>{const n=daysTo(d);return n!==null&&n>=0&&n<=30})).length
    const highHazards=hazards.filter(h=>h.status!=='Closed'&&riskScore(h)>=3).length
    const highIncident=incidents.filter(i=>i.status!=='Closed'&&['High','Critical'].includes(i.severity)).length
    const highRiskCount=highHazards+highIncident

    const verifiedExposure=exposures.filter(e=>e.status==='Verified')
    const exposureHours=verifiedExposure.reduce((sum,e)=>sum+Number(e.employeeHours??e.employee_hours??0)+Number(e.contractorHours??e.contractor_hours??0),0)
    const recordableCount=incidents.filter(isRecordableIncident).length
    const ltiCount=incidents.filter(isLostTimeIncident).length
    const trif=exposureHours>0?recordableCount*RATE_MULTIPLIER/exposureHours:null
    const ltifr=exposureHours>0?ltiCount*RATE_MULTIPLIER/exposureHours:null

    const dynamicHeat=riskCategories.map(category=>units.map(unit=>{
      const matched=hazards.filter(h=>h.unit===unit&&classifyHazard(h)===category)
      return matched.length?Math.max(...matched.map(riskScore),1):0
    }))
    const heatLive=dynamicHeat.some(row=>row.some(Boolean))

    const months=[];for(let o=11;o>=0;o--){const d=new Date(now.getFullYear(),now.getMonth()-o,1);months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)}
    const obsSeries=months.map(m=>observations.filter(o=>monthKey(o.date||o.observation_date||o.createdAt||o.created_at)===m).length)
    const nearSeries=months.map(m=>incidents.filter(i=>monthKey(i.date||i.incident_date||i.createdAt||i.created_at)===m&&(i.type||i.incident_type)==='Near Miss').length)
    const recordableSeries=months.map(m=>incidents.filter(i=>monthKey(i.date||i.incident_date||i.createdAt||i.created_at)===m&&isRecordableIncident(i)).length)
    const trendMax=Math.max(1,...obsSeries,...nearSeries,...recordableSeries)

    const incidentBars=incidentTypes.map(type=>({label:type,value:incidents.filter(i=>(i.type||i.incident_type)===type).length,tone:type==='Lost Time Injury'||type==='Fatality'||type==='Fire'?'red':type==='Medical Treatment'||type==='Restricted Work Case'?'orange':type==='Near Miss'?'blue':'green'})).filter(x=>x.value>0)
    const distribution=incidentBars.length?incidentBars:[{label:'Belum ada data',value:0,tone:'blue'}]

    const topRisks=[
      ...hazards.map(h=>({id:h.id,label:titleOfRisk(h),score:riskScore(h)*5,unit:h.unit||'-',source:'Hazard'})),
      ...incidents.filter(i=>i.status!=='Closed').map(i=>({id:i.id,label:titleOfRisk(i),score:riskScore(i)*5,unit:i.unit||'-',source:'Incident'})),
      ...actions.filter(a=>a.status!=='Closed').map(a=>({id:a.id,label:titleOfRisk(a),score:riskScore(a)*5+(isOverdue(a.dueDate||a.due_date)?2:0),unit:a.unit||'-',source:'Action'})),
    ].sort((a,b)=>b.score-a.score).slice(0,5)

    const validTraining=learning.filter(r=>{
      const explicit=String(r.status||'').toLowerCase()
      if(['expired','overdue'].includes(explicit)) return false
      return !r.validUntil&&!r.valid_until ? explicit!=='expired' : !isOverdue(r.validUntil||r.valid_until)
    }).length
    const trainingCompliance=learning.length?Math.round(validTraining/learning.length*100):0
    const trainingExpired=Math.max(0,learning.length-validTraining)

    const reportCategories=[
      {label:'Inspection / Observation',value:inspection,tone:'green'},
      {label:'Unsafe Condition',value:unsafeCondition,tone:'orange'},
      {label:'Permit to Work',value:permits.length,tone:'purple'},
      {label:'Incident',value:incidents.length,tone:'red'},
      {label:'Corrective Action',value:actions.length,tone:'blue'},
      {label:'Compliance',value:compliance.length,tone:'green'},
    ]

    const insights=[]
    if(overdueActions>0) insights.push({tone:'red',text:`${overdueActions} corrective action overdue perlu eskalasi PIC dan recovery date.`})
    if(highRiskCount>0) insights.push({tone:'orange',text:`${highRiskCount} risiko/insiden high-critical membutuhkan kontrol prioritas.`})
    if(expiredPermit>0||assetOverdue>0) insights.push({tone:'red',text:`${expiredPermit} permit expired dan ${assetOverdue} asset overdue perlu verifikasi sebelum operasi dilanjutkan.`})
    if(learning.length&&trainingCompliance<100) insights.push({tone:'blue',text:`Kepatuhan training ${trainingCompliance}% dengan ${trainingExpired} record perlu renewal.`})
    if(!exposureHours) insights.push({tone:'blue',text:'TRIFR/LTIFR belum dihitung karena belum ada exposure hours berstatus Verified pada scope ini.'})
    if(!insights.length) insights.push({tone:'green',text:'Belum ada sinyal prioritas kritis pada scope yang dipilih.'})

    return {
      fatality,nearMiss,inspection,unsafeAction,unsafeCondition,overdueActions,closureRate,
      expiredPermit,assetOverdue,assetDueSoon,highRiskCount,heat:heatLive?dynamicHeat:fallbackHeat,heatLive,
      exposureHours,recordableCount,ltiCount,trif,ltifr,
      trend:{observation:linePoints(obsSeries,trendMax),nearMiss:linePoints(nearSeries,trendMax),recordable:linePoints(recordableSeries,trendMax)},
      distribution,topRisks,trainingCompliance,trainingCount:learning.length,trainingExpired,
      actionBars:[{label:'Closed',value:closedActions,tone:'green'},{label:'In Progress',value:inProgressActions,tone:'blue'},{label:'Open / Overdue',value:openActions,tone:'orange'}],
      reportCategories,insights,
    }
  },[data.loaded,scoped])

  const sourceLabel=data.centralTables>0?`CENTRAL DATA • ${data.centralTables} modul membaca Supabase${data.localTables?` • ${data.localTables} modul fallback browser`:''}`:data.localTables>0?`MODULE DATA • ${data.localTables} modul membaca data browser`:'REFERENCE MODE • belum ada data operasional tersimpan'
  const selectedMaster=filters.company!=='All'?COMPANY_MASTER.find(c=>c.code===filters.company):null

  return <Shell title="Executive Dashboard" subtitle="Dashboard real-time untuk monitoring kinerja K3, kepatuhan, risiko dan tindak lanjut lintas PT.">
    <CompanyScopeBar filters={filters} onChange={setFilters} onReset={()=>setFilters(DEFAULT_COMPANY_FILTERS)}/>

    <div style={{marginBottom:14,padding:'10px 12px',border:'1px solid #d9e9dd',background:'#f1f8f3',borderRadius:10,fontSize:11,fontWeight:800,color:'#176b34',display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',alignItems:'center'}}>
      <span>{sourceLabel} • Scope: {scopeLabel(filters)}</span>
      <span style={{display:'flex',alignItems:'center',gap:8}}>
        {scoped.companies.length} PT aktif{selectedMaster?` • ${selectedMaster.region} • ${selectedMaster.province} • PIC ${selectedMaster.pic}`:''}
        <select value={year} onChange={e=>setYear(e.target.value)} style={{border:'1px solid #cfe1d4',borderRadius:8,padding:'6px 8px',background:'#fff',fontWeight:800,color:'#176b34'}}>
          <option value="All">Semua Tahun</option>{availableYears.map(v=><option key={v}>{v}</option>)}
        </select>
      </span>
    </div>

    {scoped.unassigned>0 && <div style={{marginBottom:14,padding:'9px 12px',border:'1px solid #f2d49b',background:'#fff8e8',borderRadius:10,fontSize:11,color:'#8a5a00'}}>
      {scoped.unassigned} record lama belum memiliki Company/PT. Record tersebut hanya muncul saat scope All Companies.
    </div>}

    <div className="stats-grid six">
      <StatCard label="TRIFR" value={dashboard?.trifr===null||dashboard?.trifr===undefined?'—':dashboard.trifr.toFixed(2)} hint={dashboard?.exposureHours?`${dashboard.recordableCount} recordable / ${formatHours(dashboard.exposureHours)} jam`:'input + verify man-hours'} tone="green" icon={<TrendingDown/>}/>
      <StatCard label="LTIFR" value={dashboard?.ltifr===null||dashboard?.ltifr===undefined?'—':dashboard.ltifr.toFixed(2)} hint={dashboard?.exposureHours?`${dashboard.ltiCount} LTI / ${formatHours(dashboard.exposureHours)} jam`:'input + verify man-hours'} tone="blue" icon={<ShieldCheck/>}/>
      <StatCard label="Fatality" value={dashboard?.fatality??0} hint="Zero Harm" tone="red" icon={<Siren/>}/>
      <StatCard label="Near Miss" value={dashboard?.nearMiss??0} hint="reported" tone="purple" icon={<Eye/>}/>
      <StatCard label="Inspection" value={dashboard?.inspection??0} hint="inspection & observation" tone="green" icon={<ClipboardCheck/>}/>
      <StatCard label="Unsafe Action" value={dashboard?.unsafeAction??0} hint="perlu coaching" tone="orange" icon={<AlertTriangle/>}/>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12,margin:'14px 0'}}>
      <div className="panel" style={{padding:14}}><div style={{display:'flex',gap:10,alignItems:'center'}}><Flame color="#d63333"/><div><small style={{color:'#7c858e',fontWeight:800}}>RISIKO TINGGI</small><div style={{fontSize:24,fontWeight:900}}>{dashboard?.highRiskCount??0}</div><span style={{fontSize:11,color:'#7c858e'}}>Hazard & incident high/critical</span></div></div></div>
      <div className="panel" style={{padding:14}}><div style={{display:'flex',gap:10,alignItems:'center'}}><FileWarning color="#e58a11"/><div><small style={{color:'#7c858e',fontWeight:800}}>PERMIT EXPIRED</small><div style={{fontSize:24,fontWeight:900}}>{dashboard?.expiredPermit??0}</div><span style={{fontSize:11,color:'#7c858e'}}>Perlu close-out / revalidation</span></div></div></div>
      <div className="panel" style={{padding:14}}><div style={{display:'flex',gap:10,alignItems:'center'}}><Wrench color="#2469a8"/><div><small style={{color:'#7c858e',fontWeight:800}}>ASSET DUE / OVERDUE</small><div style={{fontSize:24,fontWeight:900}}>{dashboard?.assetDueSoon??0} / {dashboard?.assetOverdue??0}</div><span style={{fontSize:11,color:'#7c858e'}}>Riksa uji, SIO, SILO, kalibrasi</span></div></div></div>
    </div>

    <div className="exec-grid two">
      <Panel title="Tren Kinerja 12 Bulan" action="Inspection • Near Miss • Recordable">
        <div className="chart-card">
          <svg viewBox="0 0 700 300" role="img" aria-label="Tren kinerja 12 bulan">
            <g className="grid-lines"><line x1="45" y1="40" x2="675" y2="40"/><line x1="45" y1="105" x2="675" y2="105"/><line x1="45" y1="170" x2="675" y2="170"/><line x1="45" y1="235" x2="675" y2="235"/></g>
            <polyline className="line green" points={dashboard?.trend.observation||''}/><polyline className="line orange" points={dashboard?.trend.nearMiss||''}/><polyline className="line red" points={dashboard?.trend.recordable||''}/>
          </svg>
          <div className="chart-legend"><span><i className="dot d-green"/>Inspection</span><span><i className="dot d-orange"/>Near Miss</span><span><i className="dot d-red"/>Recordable</span></div>
        </div>
      </Panel>
      <Panel title="Distribusi Kejadian" action={`${dashboard?.distribution.reduce((s,x)=>s+x.value,0)||0} laporan`}>
        <BarList data={dashboard?.distribution||[]}/>
      </Panel>
    </div>

    <div className="exec-grid two">
      <Panel title="Heat Map Risiko" action={dashboard?.heatLive?'Hazard Register':'Reference until Hazard Register live'}>
        <div className="heatmap">
          <div className="heat-corner"/>{units.map(e=><div key={e} className="heat-col-head">{e}</div>)}
          {riskCategories.map((r,ri)=><div className="heat-row" key={r}><div className="heat-row-head">{r}</div>{(dashboard?.heat?.[ri]||fallbackHeat[ri]).map((v,ci)=><div key={ci} className={`heat-cell ${heatTone(v||1)}`}>{dashboard?.heatLive&&!v?'–':v}</div>)}</div>)}
        </div>
        <div className="heat-legend"><span><i className="hl h-low"/>Rendah</span><span><i className="hl h-med"/>Sedang</span><span><i className="hl h-high"/>Tinggi</span><span><i className="hl h-crit"/>Kritis</span></div>
      </Panel>
      <Panel title="Tindakan / Action Status" action={`${dashboard?.closureRate??0}% closure`}>
        <BarList data={dashboard?.actionBars||[]}/>
        <div style={{marginTop:16}}><Progress value={dashboard?.closureRate??0} tone={(dashboard?.closureRate??0)>=90?'green':'orange'}/></div>
      </Panel>
    </div>

    <div className="exec-grid two">
      <Panel title="Top 5 Risiko Tertinggi" action="Current scope">
        <div className="table-wrap"><table><thead><tr><th>Risk</th><th>Source</th><th>Unit</th><th>Score</th></tr></thead><tbody>
          {(dashboard?.topRisks||[]).map(r=><tr key={`${r.source}-${r.id}`}><td><b>{r.label}</b></td><td>{r.source}</td><td>{r.unit}</td><td><Badge tone={r.score>=15?'red':r.score>=10?'orange':'blue'}>{r.score}</Badge></td></tr>)}
          {!dashboard?.topRisks?.length&&<tr><td colSpan="4" style={{color:'#7c858e'}}>Belum ada risk data pada scope ini.</td></tr>}
        </tbody></table></div>
      </Panel>
      <Panel title="Kepatuhan Training" action="Learning & Competency">
        <div className="donut-wrap"><Donut value={dashboard?.trainingCompliance??0} tone={(dashboard?.trainingCompliance??0)>=90?'green':'orange'} label="Compliant"/></div>
        <div className="mini-metric-list">
          <div><span>Total record</span><b>{dashboard?.trainingCount??0}</b></div>
          <div><span>Expired / renewal</span><b className={(dashboard?.trainingExpired??0)>0?'red-text':'green-text'}>{dashboard?.trainingExpired??0}</b></div>
          <div><span>Target</span><b>100%</b></div>
        </div>
      </Panel>
    </div>

    <div className="exec-grid two">
      <Panel title="Kategori Laporan" action="Live module count"><BarList data={dashboard?.reportCategories||[]}/></Panel>
      <Panel title="Insight Utama" action="Management attention">
        <div className="reminder-list">
          {(dashboard?.insights||[]).map((item,index)=><div key={index}><Target/><span><b>{item.text}</b><small>Scope: {scopeLabel(filters)}</small></span><Badge tone={item.tone}>{index+1}</Badge></div>)}
        </div>
      </Panel>
    </div>

    <div className="impact-grid">
      <div><ShieldCheck/><b>{dashboard?.fatality??0}</b><span>Fatality</span></div>
      <div><CheckCircle2/><b>{dashboard?.closureRate??0}%</b><span>Action closure</span></div>
      <div><GraduationCap/><b>{dashboard?.trainingCompliance??0}%</b><span>Training compliance</span></div>
      <div><Clock3/><b>{dashboard?.overdueActions??0}</b><span>Overdue actions</span></div>
    </div>
  </Shell>
}
