'use client'

import { useEffect,useMemo,useState } from 'react'
import Shell from '../../components/Shell'
import { Badge,Panel,StatCard } from '../../components/Ui'
import { AlertTriangle,Clock3,ScanLine,Search,Wrench } from 'lucide-react'
import { PROJECTED_NOTE,assetHealth,assetPriority,companyOf,field,inspectionWindow,loadIntelligence,riskTone } from '../../lib/intelligence-engine'
import styles from '../intelligence-2028.module.css'

const priorityTone=s=>s>=75?'red':s>=55?'orange':s>=35?'blue':'green'
export default function PredictiveInspection(){
 const[data,setData]=useState(null),[search,setSearch]=useState(''),[company,setCompany]=useState('All')
 useEffect(()=>{loadIntelligence(['assets','observations','qrRuns','qrItems','hazards']).then(setData)},[])
 const assets=useMemo(()=>{if(!data)return[];return (data.assets||[]).map(a=>({...a,health:assetHealth(a),priority:assetPriority(a)})).sort((a,b)=>b.priority-a.priority)},[data])
 const companies=useMemo(()=>[...new Set(assets.map(companyOf))].sort(),[assets])
 const rows=useMemo(()=>assets.filter(a=>{const q=search.trim().toLowerCase();return(company==='All'||companyOf(a)===company)&&(!q||[field(a,'id'),field(a,'name'),field(a,'category'),field(a,'unit'),field(a,'serial'),field(a,'unit_no')].join(' ').toLowerCase().includes(q))}),[assets,company,search])
 const immediate=assets.filter(a=>a.priority>=75).length,week=assets.filter(a=>a.priority>=55&&a.priority<75).length,month=assets.filter(a=>a.priority>=35&&a.priority<55).length
 return <Shell title="Predictive Inspection" subtitle="Prioritas inspeksi berbasis kondisi sertifikasi, riksa uji, due date dan health signal asset.">
  <div className={styles.note}><ScanLine size={17}/><span>{PROJECTED_NOTE}</span></div>
  <div className="stats-grid four"><StatCard label="Immediate" value={immediate} hint="inspection priority ≥75" tone="red" icon={<AlertTriangle/>}/><StatCard label="≤ 7 Days" value={week} hint="priority 55–74" tone="orange" icon={<Clock3/>}/><StatCard label="≤ 30 Days" value={month} hint="priority 35–54" tone="blue" icon={<Wrench/>}/><StatCard label="Assets Scored" value={assets.length} hint="actual asset register" tone="green" icon={<ScanLine/>}/></div>
  <div className={styles.toolbar}><div><h2>Inspection Priority Queue</h2><p>Asset dengan kondisi paling berisiko muncul lebih dulu.</p></div><div className={styles.filters}><label><Search size={14}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari asset..."/></label><select value={company} onChange={e=>setCompany(e.target.value)}><option>All</option>{companies.map(v=><option key={v}>{v}</option>)}</select></div></div>
  <Panel><div className="table-wrap"><table><thead><tr><th>PT</th><th>Asset</th><th>Category</th><th>Location</th><th>Health Score</th><th>Inspection Priority</th><th>Recommended Window</th><th>Riksa Status</th></tr></thead><tbody>{rows.slice(0,300).map(a=><tr key={field(a,'id')}><td><b>{companyOf(a)}</b></td><td><b>{field(a,'name','id')}</b><small className={styles.block}>{field(a,'unit_no','serial')}</small></td><td>{field(a,'category')||'-'}</td><td>{field(a,'unit')||'-'}</td><td><Badge tone={a.health>=80?'green':a.health>=60?'blue':a.health>=40?'orange':'red'}>{a.health}/100</Badge></td><td><b>{a.priority}/100</b></td><td><Badge tone={priorityTone(a.priority)}>{inspectionWindow(a.priority)}</Badge></td><td>{field(a,'test_status')||'-'}</td></tr>)}</tbody></table></div></Panel>
 </Shell>
}
