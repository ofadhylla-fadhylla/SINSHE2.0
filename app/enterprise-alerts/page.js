'use client'

import Link from 'next/link'
import { useEffect,useMemo,useState } from 'react'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge,Panel,StatCard } from '../../components/Ui'
import { AlertTriangle,Bell,CheckCircle2,Clock3,RefreshCw,Search,TimerReset,Undo2 } from 'lucide-react'
import { dbSelect,dbUpsert,getStoredProfile } from '../../lib/supabase-rest'
import { DEFAULT_COMPANY_FILTERS,filteredCompanies } from '../../lib/company-master'
import styles from '../intelligence-2028.module.css'

const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d}
const addDays=n=>{const d=today();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
const sevTone=s=>s==='Critical'?'red':s==='High'?'orange':s==='Medium'?'blue':'green'
const actionId=a=>`enterprise:${a.source}:${a.record_id}:${a.alert_type}`.replace(/\s+/g,'-')
function actionFromDb(r){return{id:r.id,companyCode:r.company_code||'',unit:r.unit||'',source:r.source||'',recordId:r.source_record_id||'',reminderType:r.reminder_type||'',actionStatus:r.action_status||'Active',snoozedUntil:r.snoozed_until||'',note:r.note||''}}
function effective(a){if(!a)return'Active';if(a.actionStatus==='Acknowledged')return'Acknowledged';if(a.actionStatus==='Snoozed'&&a.snoozedUntil&&new Date(`${a.snoozedUntil}T23:59:59`)>=today())return'Snoozed';return'Active'}
function actionToDb(a){return{id:a.id,company_code:a.companyCode||null,unit:a.unit||'Head Office',source:a.source,source_record_id:a.recordId,reminder_type:a.reminderType,action_status:a.actionStatus,snoozed_until:a.snoozedUntil||null,note:a.note||null}}

export default function EnterpriseAlerts(){
 const[alerts,setAlerts]=useState([]),[actions,setActions]=useState([]),[filters,setFilters]=useState(DEFAULT_COMPANY_FILTERS),[search,setSearch]=useState(''),[severity,setSeverity]=useState('All'),[state,setState]=useState('Active'),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true)
 const profile=getStoredProfile(),canManage=!profile||profile.role!=='Viewer'
 useEffect(()=>{let alive=true;(async()=>{try{const[a,b]=await Promise.all([dbSelect('enterprise_control_alerts','select=*&order=days_to_due.asc&limit=5000'),dbSelect('reminder_actions','select=*&order=updated_at.desc').catch(()=>[])]);if(alive){setAlerts(a||[]);setActions((b||[]).map(actionFromDb))}}finally{if(alive)setLoading(false)}})();return()=>{alive=false}},[])
 const allowed=useMemo(()=>new Set(filteredCompanies(filters).map(c=>c.code)),[filters])
 const actionMap=useMemo(()=>new Map(actions.map(a=>[a.id,a])),[actions])
 const rows=useMemo(()=>alerts.map(a=>({...a,action:actionMap.get(actionId(a))||null,state:effective(actionMap.get(actionId(a)))})).filter(a=>{const q=search.trim().toLowerCase();const hit=!q||[a.company_code,a.source,a.record_id,a.title,a.alert_type,a.status,a.unit].join(' ').toLowerCase().includes(q);return allowed.has(a.company_code)&&hit&&(severity==='All'||a.severity===severity)&&(state==='All'||a.state===state)}),[alerts,actionMap,allowed,search,severity,state])
 const active=alerts.map(a=>({...a,state:effective(actionMap.get(actionId(a)))})).filter(a=>a.state==='Active'),critical=active.filter(a=>a.severity==='Critical').length,high=active.filter(a=>a.severity==='High').length,snoozed=alerts.filter(a=>effective(actionMap.get(actionId(a)))==='Snoozed').length
 const flash=t=>{setNotice(t);setTimeout(()=>setNotice(''),3200)}
 async function saveAction(alert,actionStatus,snoozedUntil=''){
  if(!canManage)return flash('Role Viewer hanya dapat melihat alert.')
  const item={id:actionId(alert),companyCode:alert.company_code||'',unit:alert.unit||'Head Office',source:'Enterprise Alert',recordId:alert.record_id,reminderType:`${alert.source} · ${alert.alert_type}`,actionStatus,snoozedUntil,note:`Severity ${alert.severity}`}
  const next=actions.some(a=>a.id===item.id)?actions.map(a=>a.id===item.id?item:a):[item,...actions];setActions(next)
  try{await dbUpsert('reminder_actions',[actionToDb(item)],'id');flash(actionStatus==='Acknowledged'?'Alert di-acknowledge.':actionStatus==='Snoozed'?'Alert di-snooze 7 hari.':'Alert diaktifkan kembali.')}catch(e){flash(`Gagal sync action: ${e.message}`)}
 }
 return <Shell title="Enterprise Alert Center" subtitle="Actionable cross-module alerts untuk corrective action, compliance, asset, SIO, evidence dan PTW integrity.">
  <CompanyScopeBar filters={filters} onChange={setFilters} onReset={()=>setFilters(DEFAULT_COMPANY_FILTERS)}/>
  {notice&&<div className={styles.note}><CheckCircle2 size={17}/><span>{notice}</span></div>}
  <div className="stats-grid four"><StatCard label="Active Alerts" value={active.length} hint={loading?'loading':'enterprise queue'} tone="blue" icon={<Bell/>}/><StatCard label="Critical" value={critical} hint="perlu prioritas" tone="red" icon={<AlertTriangle/>}/><StatCard label="High" value={high} hint="perlu tindak lanjut" tone="orange" icon={<Clock3/>}/><StatCard label="Snoozed" value={snoozed} hint="ditunda sementara" tone="blue" icon={<TimerReset/>}/></div>
  <div className={styles.toolbar}><div><h2>Action Queue</h2><p>Status action disimpan pada Reminder Engine (`reminder_actions`) sehingga acknowledgement dan snooze tetap terpusat.</p></div><div className={styles.filters}><label><Search size={14}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari PT, source, item..."/></label><select value={severity} onChange={e=>setSeverity(e.target.value)}><option>All</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select><select value={state} onChange={e=>setState(e.target.value)}><option>All</option><option>Active</option><option>Snoozed</option><option>Acknowledged</option></select></div></div>
  <Panel><div className="table-wrap"><table><thead><tr><th>Severity</th><th>PT</th><th>Source</th><th>Item</th><th>Due</th><th>State</th><th>Action</th></tr></thead><tbody>{rows.slice(0,500).map((a,i)=><tr key={`${a.source}-${a.record_id}-${i}`}><td><Badge tone={sevTone(a.severity)}>{a.severity}</Badge></td><td><b>{a.company_code||'-'}</b></td><td>{a.source}<small className={styles.block}>{a.alert_type}</small></td><td className={styles.wrap}><b>{a.title}</b><small className={styles.block}>{a.record_id} • {a.unit||'-'} • {a.status||'-'}</small></td><td>{a.due_date||'-'}<small className={styles.block}>{a.days_to_due<0?`${Math.abs(a.days_to_due)} hari overdue`:`${a.days_to_due} hari lagi`}</small></td><td><Badge tone={a.state==='Acknowledged'?'green':a.state==='Snoozed'?'blue':'orange'}>{a.state}</Badge>{a.action?.snoozedUntil&&a.state==='Snoozed'&&<small className={styles.block}>s/d {a.action.snoozedUntil}</small>}</td><td><div style={{display:'flex',gap:6,flexWrap:'wrap'}}><Link href={a.route||'/'}><Badge tone="blue">Open</Badge></Link>{canManage&&a.state==='Active'&&<><button onClick={()=>saveAction(a,'Acknowledged')}><CheckCircle2 size={14}/> Ack</button><button onClick={()=>saveAction(a,'Snoozed',addDays(7))}><TimerReset size={14}/> 7d</button></>}{canManage&&a.state!=='Active'&&<button onClick={()=>saveAction(a,'Active','')}><Undo2 size={14}/> Reactivate</button>}</div></td></tr>)}{!loading&&!rows.length&&<tr><td colSpan="7" className={styles.empty}>Tidak ada alert sesuai filter.</td></tr>}</tbody></table></div></Panel>
 </Shell>
}