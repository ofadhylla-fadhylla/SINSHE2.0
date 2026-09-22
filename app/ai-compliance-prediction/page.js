'use client'

import { useEffect,useMemo,useState } from 'react'
import Shell from '../../components/Shell'
import { Badge,Panel,StatCard } from '../../components/Ui'
import { AlertTriangle,BrainCircuit,Clock3,FileCheck2,ShieldCheck } from 'lucide-react'
import { PROJECTED_NOTE,companyOf,complianceItemRisk,field,loadIntelligence,riskLabel,riskTone } from '../../lib/intelligence-engine'
import styles from '../intelligence-2028.module.css'

export default function AICompliancePrediction(){
 const[data,setData]=useState(null)
 useEffect(()=>{loadIntelligence(['compliance','actions','assets','learning','audits']).then(setData)},[])
 const items=useMemo(()=>{if(!data)return[];const rows=[]
  ;(data.compliance||[]).forEach(r=>rows.push({company:companyOf(r),source:'Regulatory',title:field(r,'obligation','title','id'),due:field(r,'due_date'),status:field(r,'status'),score:complianceItemRisk(r)}))
  ;(data.actions||[]).forEach(r=>rows.push({company:companyOf(r),source:'Corrective Action',title:field(r,'title','id'),due:field(r,'due_date'),status:field(r,'status'),score:complianceItemRisk(r)}))
  ;(data.assets||[]).forEach(r=>{const mapped={...r,due_date:field(r,'next_test_date','riksa_due','silo_due'),priority:field(r,'test_status')};rows.push({company:companyOf(r),source:'Asset/Riksa',title:field(r,'name','id'),due:field(mapped,'due_date'),status:field(r,'test_status'),score:complianceItemRisk(mapped)})})
  ;(data.learning||[]).forEach(r=>{const mapped={...r,due_date:field(r,'valid_until'),priority:'Medium'};rows.push({company:companyOf(r),source:'SIO/Competency',title:field(r,'training_name','employee_name','id'),due:field(mapped,'due_date'),status:field(r,'status'),score:complianceItemRisk(mapped)})})
  return rows.filter(x=>x.score>0).sort((a,b)=>b.score-a.score)
 },[data])
 const critical=items.filter(x=>x.score>=75).length,high=items.filter(x=>x.score>=50&&x.score<75).length,medium=items.filter(x=>x.score>=25&&x.score<50).length
 return <Shell title="AI Compliance Prediction" subtitle="Projected early-warning untuk potensi lapse kepatuhan, sertifikat, action dan riksa uji.">
  <div className={styles.note}><BrainCircuit size={17}/><span>{PROJECTED_NOTE}</span></div>
  <div className="stats-grid four"><StatCard label="Predicted Critical" value={critical} hint="score ≥75" tone="red" icon={<AlertTriangle/>}/><StatCard label="Predicted High" value={high} hint="score 50–74" tone="orange" icon={<Clock3/>}/><StatCard label="Predicted Medium" value={medium} hint="score 25–49" tone="blue" icon={<FileCheck2/>}/><StatCard label="Items Monitored" value={items.length} hint="cross-module" tone="green" icon={<ShieldCheck/>}/></div>
  <Panel title="Compliance Early Warning" action="Highest risk first" className="mt"><div className="table-wrap"><table><thead><tr><th>PT</th><th>Source</th><th>Requirement / Item</th><th>Due / Valid Until</th><th>Current Status</th><th>Prediction Score</th><th>Forecast</th></tr></thead><tbody>{items.slice(0,250).map((x,i)=><tr key={`${x.source}-${x.title}-${i}`}><td><b>{x.company}</b></td><td>{x.source}</td><td className={styles.wrap}>{x.title||'-'}</td><td>{x.due?String(x.due).slice(0,10):'-'}</td><td>{x.status||'-'}</td><td><b>{x.score}/100</b></td><td><Badge tone={riskTone(x.score)}>{riskLabel(x.score)}</Badge></td></tr>)}{data&& !items.length&&<tr><td colSpan="7" className={styles.empty}>Belum ada item dengan sinyal risiko compliance.</td></tr>}</tbody></table></div></Panel>
 </Shell>
}
