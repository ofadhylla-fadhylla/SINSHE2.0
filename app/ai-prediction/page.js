'use client'

import { useEffect,useMemo,useState } from 'react'
import Shell from '../../components/Shell'
import { Badge,Panel,StatCard } from '../../components/Ui'
import { AlertTriangle,BrainCircuit,Building2,Database,TrendingUp } from 'lucide-react'
import { COMPANY_MASTER } from '../../lib/company-master'
import { PROJECTED_NOTE,companyPrediction,loadIntelligence,riskTone } from '../../lib/intelligence-engine'
import styles from '../intelligence-2028.module.css'

const trendText=v=>v>0?`+${v}%`:v<0?`${v}%`:'0%'
const trendTone=v=>v>20?'red':v>0?'orange':v<0?'green':'blue'
export default function AIPrediction(){
 const[data,setData]=useState(null),[loading,setLoading]=useState(true)
 useEffect(()=>{(async()=>{setData(await loadIntelligence(['incidents','observations','actions','compliance','assets']));setLoading(false)})()},[])
 const predictions=useMemo(()=>{if(!data)return[];return COMPANY_MASTER.map(c=>companyPrediction(c.code,data)).filter(x=>x.openIncidents||x.overdueActions||x.complianceRisk||x.assetRisk||x.recentObservations).sort((a,b)=>b.score-a.score)},[data])
 const critical=predictions.filter(x=>x.score>=75).length,high=predictions.filter(x=>x.score>=50&&x.score<75).length,avg=predictions.length?Math.round(predictions.reduce((s,x)=>s+x.score,0)/predictions.length):0,avgConfidence=predictions.length?Math.round(predictions.reduce((s,x)=>s+x.confidence.score,0)/predictions.length):0
 return <Shell title="AI Prediction" subtitle="Projected 30-day enterprise safety risk dengan trend, confidence, source coverage dan driver yang dapat dijelaskan.">
  <div className={styles.note}><BrainCircuit size={17}/><span>{PROJECTED_NOTE}</span></div>
  <div className="stats-grid four"><StatCard label="Company Signals" value={predictions.length} hint={loading?'loading':'PT dengan sinyal aktif'} tone="blue" icon={<Building2/>}/><StatCard label="Critical / High" value={critical+high} hint={`${critical} critical • ${high} high`} tone={critical?'red':'orange'} icon={<AlertTriangle/>}/><StatCard label="Average Risk Index" value={avg} hint="0–100 projected" tone="blue" icon={<TrendingUp/>}/><StatCard label="Average Confidence" value={`${avgConfidence}%`} hint="berdasarkan volume & source coverage" tone={avgConfidence>=75?'green':avgConfidence>=45?'blue':'orange'} icon={<Database/>}/></div>
  <Panel title="30-Day Projected Risk Index" action={`${predictions.length} PT`} className="mt"><div className="table-wrap"><table><thead><tr><th>PT</th><th>Prediction</th><th>Level</th><th>30d Incident Trend</th><th>Confidence</th><th>Coverage</th><th>Key Drivers</th></tr></thead><tbody>{predictions.map(p=><tr key={p.code}><td><b>{p.code}</b></td><td><div className={styles.scoreRow}><span>{p.score}/100</span><div className={styles.scoreBar}><span style={{width:`${p.score}%`}}/></div><b>{p.score}</b></div></td><td><Badge tone={riskTone(p.score)}>{p.label}</Badge></td><td><Badge tone={trendTone(p.incidentTrend)}>{trendText(p.incidentTrend)}</Badge></td><td><Badge tone={p.confidence.tone}>{p.confidence.label} · {p.confidence.score}%</Badge></td><td>{p.sourceCoverage}/5 sources<small className={styles.block}>{p.recordCount} records</small></td><td className={styles.wrap}>{p.reasons.length?p.reasons.join(' • '):'No dominant driver'}</td></tr>)}{!loading&&!predictions.length&&<tr><td colSpan="7" className={styles.empty}>Belum ada sinyal yang cukup untuk membentuk proyeksi.</td></tr>}</tbody></table></div></Panel>
 </Shell>
}