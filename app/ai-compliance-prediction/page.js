'use client'

import { useEffect,useMemo,useState } from 'react'
import Shell from '../../components/Shell'
import { Badge,Panel,StatCard } from '../../components/Ui'
import { AlertTriangle,BrainCircuit,Clock3,Database,FileCheck2,ShieldCheck } from 'lucide-react'
import { PROJECTED_NOTE,companyOf,complianceItemRisk,daysTo,field,loadIntelligence,predictionConfidence,riskLabel,riskTone } from '../../lib/intelligence-engine'
import styles from '../intelligence-2028.module.css'

function detail(row){
 const due=field(row,'due_date','valid_until','next_test_date'),days=daysTo(due),status=String(field(row,'status','test_status')||''),priority=field(row,'priority','risk'),score=complianceItemRisk(row),drivers=[]
 if(days!==null&&days<0)drivers.push(`${Math.abs(days)} hari overdue`)
 else if(days!==null&&days<=30)drivers.push(`due ${days} hari`)
 else if(days!==null&&days<=90)drivers.push(`due ${days} hari`)
 if(/expired|overdue|non.?compliant/i.test(status))drivers.push(`status ${status}`)
 if(priority)drivers.push(`priority ${priority}`)
 const signals=[due,status,priority,field(row,'company_code','companyCode'),field(row,'unit')].filter(Boolean).length
 const confidence=predictionConfidence({records:signals,sources:Math.min(3,signals),maxSources:3})
 return{score,days,drivers:drivers.length?drivers:['monitoring rutin'],confidence}
}

export default function AICompliancePrediction(){
 const[data,setData]=useState(null)
 useEffect(()=>{loadIntelligence(['compliance','actions','assets','learning','audits']).then(setData)},[])
 const items=useMemo(()=>{if(!data)return[];const rows=[]
  ;(data.compliance||[]).forEach(r=>{const d=detail(r);rows.push({company:companyOf(r),source:'Regulatory',title:field(r,'obligation','title','id'),due:field(r,'due_date'),status:field(r,'status'),...d})})
  ;(data.actions||[]).forEach(r=>{const d=detail(r);rows.push({company:companyOf(r),source:'Corrective Action',title:field(r,'title','id'),due:field(r,'due_date'),status:field(r,'status'),...d})})
  ;(data.assets||[]).forEach(r=>{const mapped={...r,due_date:field(r,'next_test_date','riksa_due','silo_due'),priority:field(r,'test_status')};const d=detail(mapped);rows.push({company:companyOf(r),source:'Asset/Riksa',title:field(r,'name','id'),due:field(mapped,'due_date'),status:field(r,'test_status'),...d})})
  ;(data.learning||[]).forEach(r=>{const mapped={...r,due_date:field(r,'valid_until'),priority:'Medium'};const d=detail(mapped);rows.push({company:companyOf(r),source:'SIO/Competency',title:field(r,'training_name','employee_name','id'),due:field(mapped,'due_date'),status:field(r,'status'),...d})})
  ;(data.audits||[]).forEach(r=>{const mapped={...r,priority:field(r,'finding_type')};const d=detail(mapped);rows.push({company:companyOf(r),source:'Audit',title:field(r,'finding','id'),due:field(r,'due_date'),status:field(r,'status'),...d})})
  return rows.filter(x=>x.score>0).sort((a,b)=>b.score-a.score)
 },[data])
 const critical=items.filter(x=>x.score>=75).length,high=items.filter(x=>x.score>=50&&x.score<75).length,due30=items.filter(x=>x.days!==null&&x.days>=0&&x.days<=30).length,avgConfidence=items.length?Math.round(items.reduce((s,x)=>s+x.confidence.score,0)/items.length):0
 return <Shell title="AI Compliance Prediction" subtitle="Projected early-warning dengan due horizon, explainable drivers dan confidence lintas compliance, audit, action, SIO dan riksa uji.">
  <div className={styles.note}><BrainCircuit size={17}/><span>{PROJECTED_NOTE}</span></div>
  <div className="stats-grid four"><StatCard label="Predicted Critical" value={critical} hint="score ≥75" tone="red" icon={<AlertTriangle/>}/><StatCard label="Predicted High" value={high} hint="score 50–74" tone="orange" icon={<Clock3/>}/><StatCard label="Due ≤30 Days" value={due30} hint="renewal / closure horizon" tone="blue" icon={<FileCheck2/>}/><StatCard label="Average Confidence" value={`${avgConfidence}%`} hint={`${items.length} items monitored`} tone={avgConfidence>=75?'green':avgConfidence>=45?'blue':'orange'} icon={<Database/>}/></div>
  <Panel title="Compliance Early Warning" action="Highest risk first" className="mt"><div className="table-wrap"><table><thead><tr><th>PT</th><th>Source</th><th>Requirement / Item</th><th>Due</th><th>Status</th><th>Risk</th><th>Confidence</th><th>Why Flagged</th></tr></thead><tbody>{items.slice(0,300).map((x,i)=><tr key={`${x.source}-${x.title}-${i}`}><td><b>{x.company}</b></td><td>{x.source}</td><td className={styles.wrap}>{x.title||'-'}</td><td>{x.due?String(x.due).slice(0,10):'-'}<small className={styles.block}>{x.days===null?'No due date':x.days<0?`${Math.abs(x.days)} hari overdue`:`${x.days} hari lagi`}</small></td><td>{x.status||'-'}</td><td><Badge tone={riskTone(x.score)}>{riskLabel(x.score)} · {x.score}</Badge></td><td><Badge tone={x.confidence.tone}>{x.confidence.label} · {x.confidence.score}%</Badge></td><td className={styles.wrap}>{x.drivers.join(' • ')}</td></tr>)}{data&&!items.length&&<tr><td colSpan="8" className={styles.empty}>Belum ada item dengan sinyal risiko compliance.</td></tr>}</tbody></table></div></Panel>
 </Shell>
}