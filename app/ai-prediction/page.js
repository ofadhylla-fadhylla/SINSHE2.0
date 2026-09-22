'use client'

import { useEffect,useMemo,useState } from 'react'
import Shell from '../../components/Shell'
import { Badge,Panel,StatCard } from '../../components/Ui'
import { AlertTriangle,BrainCircuit,Building2,RefreshCw,TrendingUp } from 'lucide-react'
import { COMPANY_MASTER } from '../../lib/company-master'
import { PROJECTED_NOTE,companyPrediction,loadIntelligence,riskTone } from '../../lib/intelligence-engine'
import styles from '../intelligence-2028.module.css'

export default function AIPrediction(){
 const[data,setData]=useState(null),[loading,setLoading]=useState(true)
 useEffect(()=>{(async()=>{setData(await loadIntelligence(['incidents','observations','actions','compliance','assets']));setLoading(false)})()},[])
 const predictions=useMemo(()=>{if(!data)return[];return COMPANY_MASTER.map(c=>companyPrediction(c.code,data)).filter(x=>x.openIncidents||x.overdueActions||x.complianceRisk||x.assetRisk||x.recentObservations).sort((a,b)=>b.score-a.score)},[data])
 const critical=predictions.filter(x=>x.score>=75).length,high=predictions.filter(x=>x.score>=50&&x.score<75).length,avg=predictions.length?Math.round(predictions.reduce((s,x)=>s+x.score,0)/predictions.length):0
 return <Shell title="AI Prediction" subtitle="Projected enterprise safety risk forecast dari sinyal operasional SINSHE 2.0.">
  <div className={styles.note}><BrainCircuit size={17}/><span>{PROJECTED_NOTE}</span></div>
  <div className="stats-grid four"><StatCard label="Company Signals" value={predictions.length} hint={loading?'loading':'PT dengan sinyal aktif'} tone="blue" icon={<Building2/>}/><StatCard label="Critical Forecast" value={critical} hint="score ≥75" tone="red" icon={<AlertTriangle/>}/><StatCard label="High Forecast" value={high} hint="score 50–74" tone="orange" icon={<TrendingUp/>}/><StatCard label="Average Risk Index" value={avg} hint="0–100 projected" tone="blue" icon={<RefreshCw/>}/></div>
  <Panel title="30-Day Projected Risk Index" action={`${predictions.length} PT`} className="mt"><div className="table-wrap"><table><thead><tr><th>PT</th><th>Prediction Score</th><th>Level</th><th>Open Incident</th><th>Overdue Action</th><th>Compliance Risk</th><th>High-Risk Asset</th><th>Recent Observation</th></tr></thead><tbody>{predictions.map(p=><tr key={p.code}><td><b>{p.code}</b></td><td><div className={styles.scoreRow}><span>{p.score}/100</span><div className={styles.scoreBar}><span style={{width:`${p.score}%`}}/></div><b>{p.score}</b></div></td><td><Badge tone={riskTone(p.score)}>{p.label}</Badge></td><td>{p.openIncidents}</td><td>{p.overdueActions}</td><td>{p.complianceRisk}</td><td>{p.assetRisk}</td><td>{p.recentObservations}</td></tr>)}{!loading&&!predictions.length&&<tr><td colSpan="8" className={styles.empty}>Belum ada sinyal yang cukup untuk membentuk proyeksi.</td></tr>}</tbody></table></div></Panel>
 </Shell>
}
