'use client'

import { useEffect,useMemo,useState } from 'react'
import Shell from '../../components/Shell'
import { Badge,Panel,StatCard } from '../../components/Ui'
import { Activity,AlertTriangle,Leaf,ShieldCheck,Users } from 'lucide-react'
import { PROJECTED_NOTE,esgScores,field,loadIntelligence } from '../../lib/intelligence-engine'
import styles from '../intelligence-2028.module.css'

const scoreTone=v=>v===null?'blue':v>=80?'green':v>=60?'blue':v>=40?'orange':'red'
const show=v=>v===null?'Data Pending':`${v}/100`
export default function ESGDashboard(){
 const[data,setData]=useState(null)
 useEffect(()=>{loadIntelligence(['envEvents','envMetrics','incidents','learning','compliance','audits']).then(setData)},[])
 const scores=useMemo(()=>data?esgScores(data):{environmental:null,social:null,governance:null,overall:null},[data])
 const source=useMemo(()=>data?{
  e:(data.envEvents||[]).length+(data.envMetrics||[]).length,
  s:(data.incidents||[]).length+(data.learning||[]).length,
  g:(data.compliance||[]).length+(data.audits||[]).length,
 }: {e:0,s:0,g:0},[data])
 return <Shell title="ESG Dashboard" subtitle="Enterprise Environmental, Social & Governance view dari data K3L SINSHE 2.0.">
  <div className={styles.note}><Leaf size={17}/><span>{PROJECTED_NOTE} Nilai dimensi hanya dihitung bila sumber datanya tersedia; jika kosong ditampilkan Data Pending.</span></div>
  <div className="stats-grid four"><StatCard label="ESG Composite" value={show(scores.overall)} hint="available dimensions only" tone={scoreTone(scores.overall)} icon={<Activity/>}/><StatCard label="Environmental" value={show(scores.environmental)} hint={`${source.e} source record`} tone={scoreTone(scores.environmental)} icon={<Leaf/>}/><StatCard label="Social" value={show(scores.social)} hint={`${source.s} source record`} tone={scoreTone(scores.social)} icon={<Users/>}/><StatCard label="Governance" value={show(scores.governance)} hint={`${source.g} source record`} tone={scoreTone(scores.governance)} icon={<ShieldCheck/>}/></div>
  <div className={styles.grid3} style={{marginTop:14}}>
   <Panel title="Environmental"><div className={styles.list}><div className={styles.listItem}><div><b>Environmental Metrics</b><small>Air, water, emission, waste and other monitored metrics.</small></div><Badge tone={source.e?'green':'orange'}>{(data?.envMetrics||[]).length}</Badge></div><div className={styles.listItem}><div><b>Environmental Events</b><small>Event/spill/deviation records.</small></div><Badge tone={(data?.envEvents||[]).length?'orange':'green'}>{(data?.envEvents||[]).length}</Badge></div></div></Panel>
   <Panel title="Social"><div className={styles.list}><div className={styles.listItem}><div><b>Safety & Health Incident</b><small>Worker safety outcome signals.</small></div><Badge tone={(data?.incidents||[]).length?'orange':'green'}>{(data?.incidents||[]).length}</Badge></div><div className={styles.listItem}><div><b>Learning & Competency</b><small>Training, SIO and certification records.</small></div><Badge tone={(data?.learning||[]).length?'green':'orange'}>{(data?.learning||[]).length}</Badge></div></div></Panel>
   <Panel title="Governance"><div className={styles.list}><div className={styles.listItem}><div><b>Regulatory Obligations</b><small>Compliance register and due-date control.</small></div><Badge tone={(data?.compliance||[]).length?'green':'orange'}>{(data?.compliance||[]).length}</Badge></div><div className={styles.listItem}><div><b>Audit Findings</b><small>NC and governance assurance evidence.</small></div><Badge tone={(data?.audits||[]).length?'orange':'blue'}>{(data?.audits||[]).length}</Badge></div></div></Panel>
  </div>
  <Panel title="ESG Data Readiness" className="mt"><div className={styles.grid3}><div className={styles.card}><span>Environmental Data</span><b>{source.e?'READY':'PENDING'}</b><small>Score tidak akan dipaksakan jika belum ada record.</small></div><div className={styles.card}><span>Social Data</span><b>{source.s?'READY':'PENDING'}</b><small>Incident + Learning/SIO menjadi sumber awal.</small></div><div className={styles.card}><span>Governance Data</span><b>{source.g?'READY':'PENDING'}</b><small>Compliance + Audit menjadi sumber awal.</small></div></div></Panel>
 </Shell>
}
