'use client'

import Link from 'next/link'
import { useEffect,useMemo,useState } from 'react'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge,Panel } from '../../components/Ui'
import { Activity,AlertTriangle,BarChart3,BrainCircuit,Building2,CheckCircle2,ChevronRight,FileCheck2,GraduationCap,Leaf,ShieldCheck,Wrench } from 'lucide-react'
import { dbSelect } from '../../lib/supabase-rest'
import { DEFAULT_COMPANY_FILTERS,companyCodeOf,filteredCompanies } from '../../lib/company-master'
import { PROJECTED_NOTE,assetPriority,complianceItemRisk,daysTo,esgScores,field,isClosed,loadIntelligence } from '../../lib/intelligence-engine'
import styles from './enterprise-dashboard.module.css'

const sevTone=s=>s==='Critical'?'red':s==='High'?'orange':s==='Medium'?'blue':'green'
const pct=(a,b)=>b?Math.round(a/b*100):0
const textStatus=v=>String(v||'').toLowerCase()

export default function EnterpriseDashboard(){
 const[data,setData]=useState(null),[readiness,setReadiness]=useState([]),[alerts,setAlerts]=useState([])
 const[filters,setFilters]=useState(DEFAULT_COMPANY_FILTERS),[view,setView]=useState('executive')
 const[unitFilter,setUnitFilter]=useState('All'),[areaFilter,setAreaFilter]=useState('All'),[picFilter,setPicFilter]=useState('All')

 useEffect(()=>{
  loadIntelligence().then(setData)
  dbSelect('permit_integration_readiness','select=*&order=id.desc').then(setReadiness).catch(()=>setReadiness([]))
  dbSelect('enterprise_control_alerts','select=*&order=days_to_due.asc&limit=5000').then(setAlerts).catch(()=>setAlerts([]))
 },[])

 const companies=useMemo(()=>filteredCompanies(filters),[filters])
 const allowed=useMemo(()=>new Set(companies.map(c=>c.code)),[companies])
 const scopedData=useMemo(()=>{
  if(!data)return null
  const out={}
  Object.entries(data).forEach(([key,list])=>{out[key]=(list||[]).filter(row=>allowed.has(companyCodeOf(row)))})
  return out
 },[data,allowed])
 const scopedAlerts=useMemo(()=>alerts.filter(a=>allowed.has(a.company_code)),[alerts,allowed])
 const scopedReadiness=useMemo(()=>readiness.filter(r=>allowed.has(r.company_code)),[readiness,allowed])

 const recordIndex=useMemo(()=>{
  const map=new Map();if(!scopedData)return map
  Object.values(scopedData).forEach(list=>(list||[]).forEach(row=>{const id=field(row,'id');if(id&&!map.has(String(id)))map.set(String(id),row)}))
  return map
 },[scopedData])

 const actionRows=useMemo(()=>scopedAlerts.map(a=>{
  const record=recordIndex.get(String(a.record_id||''))||{}
  const unit=a.unit||field(record,'unit','department')||'Belum terisi'
  const area=field(record,'area','location','location_detail','specific_location','work_area')||unit||'Belum terisi'
  const pic=field(record,'pic','owner','supervisor','requester','employee_name','approver')||'Belum terisi'
  return {...a,unit,area,pic}
 }),[scopedAlerts,recordIndex])

 const units=useMemo(()=>[...new Set(actionRows.map(r=>r.unit).filter(Boolean))].sort(),[actionRows])
 const areas=useMemo(()=>[...new Set(actionRows.filter(r=>unitFilter==='All'||r.unit===unitFilter).map(r=>r.area).filter(Boolean))].sort(),[actionRows,unitFilter])
 const pics=useMemo(()=>[...new Set(actionRows.filter(r=>(unitFilter==='All'||r.unit===unitFilter)&&(areaFilter==='All'||r.area===areaFilter)).map(r=>r.pic).filter(Boolean))].sort(),[actionRows,unitFilter,areaFilter])
 useEffect(()=>{setAreaFilter('All');setPicFilter('All')},[unitFilter])
 useEffect(()=>{setPicFilter('All')},[areaFilter])
 useEffect(()=>{if(unitFilter!=='All'&&!units.includes(unitFilter))setUnitFilter('All')},[units,unitFilter])

 const drillRows=useMemo(()=>actionRows.filter(r=>(unitFilter==='All'||r.unit===unitFilter)&&(areaFilter==='All'||r.area===areaFilter)&&(picFilter==='All'||r.pic===picFilter)),[actionRows,unitFilter,areaFilter,picFilter])

 const executive=useMemo(()=>{
  if(!scopedData)return{closure:0,critical:0,riskCompanies:0,esg:null,compliance:0,complianceTotal:0,records:0}
  const actions=scopedData.actions||[],closed=actions.filter(a=>isClosed(field(a,'status'))).length
  const critical=scopedAlerts.filter(a=>a.severity==='Critical').length
  const riskCompanies=new Set(scopedAlerts.filter(a=>['Critical','High'].includes(a.severity)).map(a=>a.company_code)).size
  const compliance=scopedData.compliance||[],compliant=compliance.filter(r=>textStatus(field(r,'status'))==='compliant').length
  const records=Object.values(scopedData).reduce((sum,list)=>sum+(list?.length||0),0)
  return{closure:pct(closed,actions.length),critical,riskCompanies,esg:esgScores(scopedData).overall,compliance:pct(compliant,compliance.length),complianceTotal:compliance.length,records}
 },[scopedData,scopedAlerts])

 const operational=useMemo(()=>{
  if(!scopedData)return{}
  const incidents=scopedData.incidents||[],observations=scopedData.observations||[],actions=scopedData.actions||[],permits=scopedData.permits||[]
  const learning=scopedData.learning||[],assets=scopedData.assets||[],envEvents=scopedData.envEvents||[],envMetrics=scopedData.envMetrics||[],compliance=scopedData.compliance||[],audits=scopedData.audits||[]
  const openIncidents=incidents.filter(r=>!isClosed(field(r,'status'))).length
  const overdueActions=actions.filter(r=>!isClosed(field(r,'status'))&&((daysTo(field(r,'due_date'))??1)<0)).length
  const activePermits=permits.filter(r=>['Approved','Active','Suspended','Submitted','Assistant Review','Field Verification'].includes(field(r,'status'))).length
  const expiredLearning=learning.filter(r=>(daysTo(field(r,'valid_until'))??1)<0).length
  const competency=pct(learning.length-expiredLearning,learning.length)
  const riskyAssets=assets.filter(a=>assetPriority(a)>=55).length
  const complianceRisk=compliance.filter(r=>complianceItemRisk(r)>=50).length+audits.filter(r=>!isClosed(field(r,'status'))).length
  return{
   safety:{value:openIncidents,label:'Open Incident',hint:`${observations.length} observations • ${overdueActions} overdue actions • ${activePermits} active/review PTW`,route:'/incident'},
   competency:{value:learning.length?`${competency}%`:'Data Pending',label:'Competency Validity',hint:`${learning.length} records • ${expiredLearning} expired`,route:'/learning-competency'},
   asset:{value:riskyAssets,label:'Priority Assets',hint:`${assets.length} assets monitored • priority ≥55`,route:'/predictive-inspection'},
   environment:{value:(envEvents.length+envMetrics.length)||'Data Pending',label:'Environment Records',hint:`${envEvents.length} events • ${envMetrics.length} metrics`,route:'/environmental-esg'},
   compliance:{value:complianceRisk,label:'Compliance Risk',hint:`${compliance.length} obligations • ${audits.length} audit findings`,route:'/regulatory-compliance'}
  }
 },[scopedData])

 const ptw=useMemo(()=>({
  total:scopedReadiness.length,
  ready:scopedReadiness.filter(r=>r.jsa_ready&&r.loto_ready&&r.evidence_ready).length,
  jsaGap:scopedReadiness.filter(r=>!r.jsa_ready).length,
  evidenceGap:scopedReadiness.filter(r=>!r.evidence_ready).length
 }),[scopedReadiness])

 const criticalDrill=drillRows.filter(r=>r.severity==='Critical').length,highDrill=drillRows.filter(r=>r.severity==='High').length

 return <Shell title="Enterprise Dashboard" subtitle="Executive → Operational → Unit → Area → PIC → Action">
  <CompanyScopeBar filters={filters} onChange={setFilters} onReset={()=>setFilters(DEFAULT_COMPANY_FILTERS)}/>

  <section className={styles.hero}>
   <div className={styles.heroTitle}><span>SINSHE 2.0</span><h2>Enterprise Dashboard</h2><p>Satu dashboard untuk keputusan strategis dan tindak lanjut operasional.</p></div>
   <div className={styles.branchLine}/>
   <div className={styles.branches}>
    <button className={`${styles.viewButton} ${view==='executive'?styles.active:''}`} onClick={()=>setView('executive')}>
     <b>EXECUTIVE VIEW</b><small>Ringkasan untuk management: Strategic KPI, Business Impact, Risk Overview, ESG dan Compliance.</small>
     <div className={styles.viewTags}><span>Strategic KPI</span><span>Business Impact</span><span>Risk Overview</span><span>ESG</span><span>Compliance</span></div>
    </button>
    <button className={`${styles.viewButton} ${view==='operational'?styles.active:''}`} onClick={()=>setView('operational')}>
     <b>OPERATIONAL VIEW</b><small>Monitoring pelaksanaan lapangan: Safety, Competency, Asset, Environment dan Compliance.</small>
     <div className={styles.viewTags}><span>Safety</span><span>Competency</span><span>Asset</span><span>Environment</span><span>Compliance</span></div>
    </button>
   </div>
  </section>

  {view==='executive'&&<>
   <div className={styles.sectionHead}><div><h2>Executive View</h2><p>Management snapshot berdasarkan scope PT yang dipilih.</p></div><Badge tone="blue">{executive.records.toLocaleString('id-ID')} central records</Badge></div>
   <div className={styles.metricGrid}>
    <div className={styles.metric}><span>Strategic KPI</span><b>{executive.closure}%</b><small>Corrective Action closure rate pada scope aktif.</small></div>
    <div className={styles.metric}><span>Business Impact</span><b>{executive.critical}</b><small>Critical control exposure yang perlu perhatian management.</small></div>
    <div className={styles.metric}><span>Risk Overview</span><b>{executive.riskCompanies}</b><small>PT dengan alert High/Critical aktif.</small></div>
    <div className={styles.metric}><span>ESG</span><b>{executive.esg===null?'Data Pending':`${executive.esg}/100`}</b><small>Composite score hanya memakai dimensi yang memiliki data.</small></div>
    <div className={styles.metric}><span>Compliance</span><b>{executive.complianceTotal?`${executive.compliance}%`:'Data Pending'}</b><small>{executive.complianceTotal} regulatory obligations dalam scope.</small></div>
   </div>
   <Panel title="Management Focus" className="mt"><div className={styles.domainGrid}>
    <Link className={styles.domain} href="/enterprise-alerts"><div className={styles.domainTop}><b>Critical Controls</b><AlertTriangle size={18}/></div><div className={styles.domainValue}>{scopedAlerts.filter(a=>a.severity==='Critical').length}</div><small>Prioritas lintas Asset, Compliance, Corrective Action, Evidence dan PTW.</small></Link>
    <Link className={styles.domain} href="/ai-prediction"><div className={styles.domainTop}><b>Risk Intelligence</b><BrainCircuit size={18}/></div><div className={styles.domainValue}>{scopedAlerts.filter(a=>['Critical','High'].includes(a.severity)).length}</div><small>High + Critical enterprise signals; predictive layer tetap rule-based.</small></Link>
    <Link className={styles.domain} href="/esg-dashboard"><div className={styles.domainTop}><b>ESG Readiness</b><Leaf size={18}/></div><div className={styles.domainValue}>{executive.esg===null?'Pending':executive.esg}</div><small>Environmental, Social dan Governance data readiness.</small></Link>
    <Link className={styles.domain} href="/regulatory-compliance"><div className={styles.domainTop}><b>Compliance</b><FileCheck2 size={18}/></div><div className={styles.domainValue}>{executive.complianceTotal}</div><small>Obligations yang dimonitor dalam scope aktif.</small></Link>
    <Link className={styles.domain} href="/permit-to-work"><div className={styles.domainTop}><b>PTW Integrity</b><ShieldCheck size={18}/></div><div className={styles.domainValue}>{ptw.total?`${ptw.ready}/${ptw.total}`:'0'}</div><small>{ptw.jsaGap} JSA gap • {ptw.evidenceGap} evidence gap.</small></Link>
   </div></Panel>
  </>}

  {view==='operational'&&<>
   <div className={styles.sectionHead}><div><h2>Operational View</h2><p>Area kerja yang perlu dimonitor setiap hari.</p></div><Badge tone="green">LIVE CENTRAL DATA</Badge></div>
   <div className={styles.domainGrid}>
    <Link className={styles.domain} href={operational.safety?.route||'/incident'}><div className={styles.domainTop}><b>Safety</b><ShieldCheck size={18}/></div><div className={styles.domainValue}>{operational.safety?.value??0}</div><small>{operational.safety?.hint}</small></Link>
    <Link className={styles.domain} href={operational.competency?.route||'/learning-competency'}><div className={styles.domainTop}><b>Competency</b><GraduationCap size={18}/></div><div className={styles.domainValue}>{operational.competency?.value??'Data Pending'}</div><small>{operational.competency?.hint}</small></Link>
    <Link className={styles.domain} href={operational.asset?.route||'/asset-integrity'}><div className={styles.domainTop}><b>Asset</b><Wrench size={18}/></div><div className={styles.domainValue}>{operational.asset?.value??0}</div><small>{operational.asset?.hint}</small></Link>
    <Link className={styles.domain} href={operational.environment?.route||'/environmental-esg'}><div className={styles.domainTop}><b>Environment</b><Leaf size={18}/></div><div className={styles.domainValue}>{operational.environment?.value??'Data Pending'}</div><small>{operational.environment?.hint}</small></Link>
    <Link className={styles.domain} href={operational.compliance?.route||'/regulatory-compliance'}><div className={styles.domainTop}><b>Compliance</b><FileCheck2 size={18}/></div><div className={styles.domainValue}>{operational.compliance?.value??0}</div><small>{operational.compliance?.hint}</small></Link>
   </div>
  </>}

  <section className={styles.flow}>
   <div className={styles.flowTitle}>DRILL-DOWN</div><div className={styles.arrow}>↓</div>
   <div className={styles.drillGrid}>
    <div className={styles.drillStep}><label>1 · Unit</label><select value={unitFilter} onChange={e=>setUnitFilter(e.target.value)}><option value="All">Semua Unit</option>{units.map(v=><option key={v}>{v}</option>)}</select></div>
    <div className={styles.drillStep}><label>2 · Area</label><select value={areaFilter} onChange={e=>setAreaFilter(e.target.value)}><option value="All">Semua Area</option>{areas.map(v=><option key={v}>{v}</option>)}</select></div>
    <div className={styles.drillStep}><label>3 · PIC</label><select value={picFilter} onChange={e=>setPicFilter(e.target.value)}><option value="All">Semua PIC</option>{pics.map(v=><option key={v}>{v}</option>)}</select></div>
   </div>
   <div className={styles.arrow}>↓</div><div className={styles.flowTitle}>ACTION</div>
   <div className={styles.actionSummary}><span>{drillRows.length} action</span><span>{criticalDrill} critical</span><span>{highDrill} high</span><span>Scope: {filters.company==='All'?'Semua PT':filters.company}</span></div>
  </section>

  <Panel title="Action Queue — Unit → Area → PIC" action={`${drillRows.length} item`} className="mt">
   <div className="table-wrap"><table><thead><tr><th>Severity</th><th>PT</th><th>Unit</th><th>Area</th><th>PIC</th><th>Action / Item</th><th>Due</th><th></th></tr></thead><tbody>
    {drillRows.slice(0,100).map((a,i)=><tr key={`${a.source}-${a.record_id}-${i}`}><td><Badge tone={sevTone(a.severity)}>{a.severity}</Badge></td><td><b>{a.company_code||'-'}</b></td><td>{a.unit}</td><td>{a.area}</td><td>{a.pic}</td><td><b>{a.alert_type}</b><small className={styles.block}>{a.title} • {a.source}</small></td><td>{a.due_date||'-'}<small className={styles.block}>{a.days_to_due===null?'':a.days_to_due<0?`${Math.abs(a.days_to_due)} hari overdue`:`${a.days_to_due} hari lagi`}</small></td><td><Link className={styles.actionLink} href={a.route||'/enterprise-alerts'}><Badge tone="blue">Open <ChevronRight size={11}/></Badge></Link></td></tr>)}
    {!drillRows.length&&<tr><td colSpan="8" className={styles.empty}>Tidak ada action pada kombinasi Unit, Area dan PIC yang dipilih.</td></tr>}
   </tbody></table></div>
  </Panel>

  <Panel title="Dashboard Architecture" className="mt"><div className={styles.domainGrid}>
   <div className={styles.domain}><div className={styles.domainTop}><b>Executive</b><BarChart3 size={18}/></div><small>Strategic KPI • Business Impact • Risk Overview • ESG • Compliance</small></div>
   <div className={styles.domain}><div className={styles.domainTop}><b>Operational</b><Activity size={18}/></div><small>Safety • Competency • Asset • Environment • Compliance</small></div>
   <div className={styles.domain}><div className={styles.domainTop}><b>Drill-down</b><Building2 size={18}/></div><small>PT → Unit → Area → PIC → Action</small></div>
   <div className={styles.domain}><div className={styles.domainTop}><b>Action Control</b><CheckCircle2 size={18}/></div><small>Enterprise Alert Center dan Reminder Engine menjadi jalur tindak lanjut.</small></div>
   <div className={styles.domain}><div className={styles.domainTop}><b>Predictive Layer</b><BrainCircuit size={18}/></div><small>{PROJECTED_NOTE}</small></div>
  </div></Panel>
 </Shell>
}
