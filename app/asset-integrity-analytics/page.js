'use client'

import { useEffect,useMemo,useState } from 'react'
import Shell from '../../components/Shell'
import { Badge,Panel,StatCard } from '../../components/Ui'
import { Activity,AlertTriangle,Factory,ShieldCheck,Wrench } from 'lucide-react'
import { PROJECTED_NOTE,assetHealth,companyOf,field,loadIntelligence,pct } from '../../lib/intelligence-engine'
import styles from '../intelligence-2028.module.css'

export default function AssetIntegrityAnalytics(){
 const[data,setData]=useState(null)
 useEffect(()=>{loadIntelligence(['assets']).then(setData)},[])
 const assets=useMemo(()=>data?(data.assets||[]).map(a=>({...a,health:assetHealth(a)})):[],[data])
 const avg=assets.length?Math.round(assets.reduce((s,a)=>s+a.health,0)/assets.length):0
 const healthy=assets.filter(a=>a.health>=80).length,watch=assets.filter(a=>a.health>=60&&a.health<80).length,poor=assets.filter(a=>a.health<60).length
 const cert=assets.filter(a=>field(a,'certificate_no')||String(field(a,'certificate_status')).toLowerCase().includes('bersertifikat')).length
 const categories=useMemo(()=>{const m={};assets.forEach(a=>{const k=field(a,'category')||'Other';if(!m[k])m[k]={name:k,total:0,health:0,poor:0};m[k].total++;m[k].health+=a.health;if(a.health<60)m[k].poor++});return Object.values(m).map(x=>({...x,avg:Math.round(x.health/x.total)})).sort((a,b)=>a.avg-b.avg)},[assets])
 const companies=useMemo(()=>{const m={};assets.forEach(a=>{const k=companyOf(a);if(!m[k])m[k]={code:k,total:0,health:0,poor:0};m[k].total++;m[k].health+=a.health;if(a.health<60)m[k].poor++});return Object.values(m).map(x=>({...x,avg:Math.round(x.health/x.total)})).sort((a,b)=>a.avg-b.avg)},[assets])
 return <Shell title="Asset Integrity Analytics" subtitle="Health score, integrity exposure dan critical asset analytics untuk seluruh asset register.">
  <div className={styles.note}><Activity size={17}/><span>{PROJECTED_NOTE}</span></div>
  <div className="stats-grid four"><StatCard label="Average Asset Health" value={`${avg}/100`} hint={`${assets.length} asset scored`} tone={avg>=80?'green':avg>=60?'blue':'orange'} icon={<Wrench/>}/><StatCard label="Healthy" value={healthy} hint="health ≥80" tone="green" icon={<ShieldCheck/>}/><StatCard label="Watch List" value={watch} hint="health 60–79" tone="orange" icon={<Activity/>}/><StatCard label="Critical / Poor" value={poor} hint="health <60" tone="red" icon={<AlertTriangle/>}/></div>
  <div className={styles.grid2} style={{marginTop:14}}><Panel title="Integrity by Equipment Category"><div className="table-wrap"><table><thead><tr><th>Category</th><th>Assets</th><th>Avg Health</th><th>Poor</th></tr></thead><tbody>{categories.map(c=><tr key={c.name}><td><b>{c.name}</b></td><td>{c.total}</td><td><Badge tone={c.avg>=80?'green':c.avg>=60?'blue':c.avg>=40?'orange':'red'}>{c.avg}/100</Badge></td><td>{c.poor}</td></tr>)}</tbody></table></div></Panel><Panel title="Integrity by Company"><div className="table-wrap"><table><thead><tr><th>PT</th><th>Assets</th><th>Avg Health</th><th>Poor</th></tr></thead><tbody>{companies.map(c=><tr key={c.code}><td><b>{c.code}</b></td><td>{c.total}</td><td><Badge tone={c.avg>=80?'green':c.avg>=60?'blue':c.avg>=40?'orange':'red'}>{c.avg}/100</Badge></td><td>{c.poor}</td></tr>)}</tbody></table></div></Panel></div>
  <Panel title="Integrity Coverage" className="mt"><div className={styles.grid3}><div className={styles.card}><span>Certificate Coverage</span><b>{pct(cert,assets.length)}%</b><small>{cert} asset memiliki certificate signal.</small></div><div className={styles.card}><span>Healthy Share</span><b>{pct(healthy,assets.length)}%</b><small>Health score ≥80.</small></div><div className={styles.card}><span>Critical Exposure</span><b>{pct(poor,assets.length)}%</b><small>Asset dengan health score &lt;60.</small></div></div></Panel>
 </Shell>
}
