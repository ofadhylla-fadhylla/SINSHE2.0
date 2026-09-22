'use client'

import Link from 'next/link'
import { useEffect,useMemo,useState } from 'react'
import Shell from '../../components/Shell'
import { Badge,Panel,StatCard } from '../../components/Ui'
import { Activity,BrainCircuit,Building2,CheckCircle2,Database,ShieldCheck } from 'lucide-react'
import { PROJECTED_NOTE,companyOf,esgScores,loadIntelligence } from '../../lib/intelligence-engine'
import styles from '../intelligence-2028.module.css'

const roadmap=[
 {name:'AI Prediction',href:'/ai-prediction',projected:true},{name:'AI Recommendation',href:'/ai-recommendation',projected:true},{name:'ESG Dashboard',href:'/esg-dashboard',projected:true},{name:'GIS',href:'/gis-map',projected:true},{name:'QR Inspection',href:'/qr-inspection',projected:true},{name:'Enterprise Dashboard',href:'/enterprise-dashboard',projected:true},{name:'AI Compliance Prediction',href:'/ai-compliance-prediction',projected:true},{name:'Predictive Inspection',href:'/predictive-inspection',projected:true},{name:'Asset Integrity Analytics',href:'/asset-integrity-analytics',projected:true},
]
export default function EnterpriseDashboard(){
 const[data,setData]=useState(null)
 useEffect(()=>{loadIntelligence().then(setData)},[])
 const metrics=useMemo(()=>{if(!data)return{records:0,companies:0,activeModules:0,esg:null};const values=Object.values(data),records=values.reduce((s,v)=>s+(v?.length||0),0),companies=new Set(values.flat().map(companyOf).filter(x=>x&&x!=='UNASSIGNED')).size,activeModules=values.filter(v=>v?.length).length;return{records,companies,activeModules,esg:esgScores(data).overall}},[data])
 const sources=useMemo(()=>data?Object.entries(data).map(([k,v])=>({name:k,count:v?.length||0})).sort((a,b)=>b.count-a.count):[],[data])
 return <Shell title="Enterprise Dashboard" subtitle="Enterprise Safety Intelligence overview lintas seluruh modul SINSHE 2.0.">
  <div className={styles.note}><BrainCircuit size={17}/><span>{PROJECTED_NOTE}</span></div>
  <div className="stats-grid four"><StatCard label="2028 Roadmap Coverage" value="9/9" hint="semua modul punya route eksplisit" tone="green" icon={<CheckCircle2/>}/><StatCard label="Central Records" value={metrics.records.toLocaleString('id-ID')} hint="across intelligence sources" tone="blue" icon={<Database/>}/><StatCard label="Companies with Data" value={metrics.companies} hint="identified in central data" tone="green" icon={<Building2/>}/><StatCard label="Live Source Modules" value={metrics.activeModules} hint="source tables with records" tone="blue" icon={<Activity/>}/></div>
  <Panel title="Enterprise Safety Intelligence 2028" action="Roadmap modules" className="mt"><div className={styles.grid3}>{roadmap.map(m=><Link key={m.name} href={m.href} className={styles.card} style={{textDecoration:'none',color:'inherit'}}><span>2028 Module</span><b style={{fontSize:15}}>{m.name}</b><small>{m.projected?'* Proyeksi Berdasarkan Analisis Penulis':'Live module'}</small><div style={{marginTop:8}}><Badge tone="green">AVAILABLE</Badge></div></Link>)}</div></Panel>
  <div className={styles.grid2} style={{marginTop:14}}><Panel title="Central Data Coverage"><div className={styles.list}>{sources.map(s=><div className={styles.listItem} key={s.name}><div><b>{s.name}</b><small>Supabase central source</small></div><Badge tone={s.count?'green':'blue'}>{s.count.toLocaleString('id-ID')}</Badge></div>)}</div></Panel><Panel title="Enterprise Principles"><div className={styles.list}><div className={styles.listItem}><div><b>People</b><small>Workers, supervisors, HSE and management in one ecosystem.</small></div><ShieldCheck/></div><div className={styles.listItem}><div><b>Process</b><small>Briefing → inspection → risk → action → compliance.</small></div><ShieldCheck/></div><div className={styles.listItem}><div><b>Data</b><small>Centralized, traceable and reusable across modules.</small></div><ShieldCheck/></div><div className={styles.listItem}><div><b>Technology</b><small>Web/mobile, QR, GIS and projected intelligence layer.</small></div><ShieldCheck/></div></div></Panel></div>
 </Shell>
}
