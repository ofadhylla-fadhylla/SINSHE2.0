'use client'

import Link from 'next/link'
import { useEffect,useMemo,useState } from 'react'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge,Panel } from '../../components/Ui'
import { Activity,AlertTriangle,BarChart3,BrainCircuit,ChevronRight,FileCheck2,GraduationCap,Leaf,ShieldCheck,Wrench } from 'lucide-react'
import { dbSelect } from '../../lib/supabase-rest'
import { DEFAULT_COMPANY_FILTERS,companyCodeOf,filteredCompanies } from '../../lib/company-master'
import { assetPriority,complianceItemRisk,daysTo,esgScores,field,isClosed,loadIntelligence } from '../../lib/intelligence-engine'
import styles from './enterprise-dashboard.module.css'

const pct=(a,b)=>b?Math.round(a/b*100):0
const textStatus=v=>String(v||'').toLowerCase()

export default function EnterpriseDashboard(){
 const[data,setData]=useState(null),[readiness,setReadiness]=useState([]),[alerts,setAlerts]=useState([])
 const[filters,setFilters]=useState(DEFAULT_COMPANY_FILTERS),[view,setView]=useState(null)

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

 return <Shell title="Enterprise Dashboard" subtitle="Pilih Executive atau Operational View untuk membuka dashboard.">
  <CompanyScopeBar filters={filters} onChange={setFilters} companyOnly/>

  <section className={styles.selectorPanel}>
   <div className={styles.selectorIntro}>
    <span>SINSHE 2.0</span>
    <h2>Pilih Tampilan Dashboard</h2>
    <p>Pilih satu tampilan sesuai kebutuhan. Informasi detail hanya muncul setelah view dipilih.</p>
   </div>
   <div className={styles.selectorGrid}>
    <button className={`${styles.selectorCard} ${view==='executive'?styles.selectorActive:''}`} onClick={()=>setView('executive')}>
     <div className={styles.selectorIcon}><BarChart3 size={22}/></div>
     <div className={styles.selectorCopy}><b>Executive View</b><small>Strategic KPI, Business Impact, Risk Overview, ESG dan Compliance.</small></div>
     <ChevronRight size={20}/>
    </button>
    <button className={`${styles.selectorCard} ${view==='operational'?styles.selectorActive:''}`} onClick={()=>setView('operational')}>
     <div className={styles.selectorIcon}><Activity size={22}/></div>
     <div className={styles.selectorCopy}><b>Operational View</b><small>Safety, Competency, Asset, Environment dan Compliance.</small></div>
     <ChevronRight size={20}/>
    </button>
   </div>
   {!view&&<div className={styles.selectorEmpty}>Pilih salah satu view di atas untuk menampilkan dashboard.</div>}
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
 </Shell>
}
