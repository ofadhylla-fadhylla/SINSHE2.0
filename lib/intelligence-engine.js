import { dbSelect } from './supabase-rest'

export const PROJECTED_NOTE='Proyeksi Berdasarkan Analisis Penulis — skor prediktif menggunakan rule-based analytics dari data SINSHE 2.0 yang tersedia, bukan model ML tervalidasi.'

export const INTELLIGENCE_TABLES={
  incidents:'incidents', observations:'observations', actions:'corrective_actions', hazards:'hazards',
  compliance:'regulatory_obligations', audits:'audit_findings', assets:'assets', learning:'learning_records',
  envEvents:'environmental_events', envMetrics:'environmental_metrics', qrRuns:'qr_inspection_runs', qrItems:'qr_inspection_items', permits:'permits'
}

export const field=(row,...names)=>{for(const n of names){const v=row?.[n];if(v!==undefined&&v!==null&&v!=='')return v}return''}
export const companyOf=row=>String(field(row,'company_code','companyCode')||'UNASSIGNED')
export const unitOf=row=>String(field(row,'unit','department','location')||'Unknown')
export const isoDate=v=>v?String(v).slice(0,10):''
export const daysTo=v=>{if(!v)return null;const t=new Date();t.setHours(0,0,0,0);const d=new Date(`${isoDate(v)}T00:00:00`);return Number.isNaN(d.getTime())?null:Math.ceil((d-t)/86400000)}
export const isClosed=v=>['Closed','Completed','Cancelled','Archived','Compliant','Released'].includes(String(v||''))
export const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(Number(v)||0)))
export const pct=(a,b)=>b?Math.round((a/b)*1000)/10:0
export const severityWeight=v=>{const s=String(v||'').toLowerCase();if(/fatal|critical|extreme|major/.test(s))return 10;if(/high|tinggi/.test(s))return 7;if(/medium|moderate|sedang/.test(s))return 4;return 2}
export const riskLabel=s=>s>=75?'Critical':s>=50?'High':s>=25?'Medium':'Low'
export const riskTone=s=>s>=75?'red':s>=50?'orange':s>=25?'blue':'green'

export async function loadIntelligence(keys=Object.keys(INTELLIGENCE_TABLES)){
  const out={}
  await Promise.all(keys.map(async key=>{try{out[key]=await dbSelect(INTELLIGENCE_TABLES[key],'select=*')}catch{out[key]=[]}}))
  return out
}

export function assetHealth(asset){
  let score=100
  const cert=String(field(asset,'certificate_status')||'').toLowerCase(),test=String(field(asset,'test_status')||'').toLowerCase()
  const next=field(asset,'next_test_date','riksa_due','silo_due'),d=daysTo(next)
  if(!field(asset,'certificate_no')&&!cert.includes('bersertifikat'))score-=28
  if(cert.includes('tidak'))score-=20
  if(test.includes('expired'))score-=35
  else if(test.includes('belum'))score-=24
  else if(d!==null&&d<0)score-=35
  else if(d!==null&&d<=30)score-=15
  else if(d!==null&&d<=90)score-=7
  if(String(field(asset,'operational')).toLowerCase()==='inactive')score-=8
  const monthly=field(asset,'condition_monthly')||{}
  if(monthly&&typeof monthly==='object'){
    const values=Object.values(monthly).map(v=>String(v||'').toLowerCase())
    if(values.some(v=>/rusak|bad|ng|abnormal/.test(v)))score-=18
  }
  return clamp(score)
}

export function assetPriority(asset){
  const health=assetHealth(asset),d=daysTo(field(asset,'next_test_date','riksa_due','silo_due'))
  let score=100-health
  if(d!==null&&d<0)score+=25
  else if(d!==null&&d<=30)score+=15
  if(String(field(asset,'test_status')).toLowerCase().includes('expired'))score+=20
  return clamp(score)
}

export function inspectionWindow(score){return score>=75?'Immediate':score>=55?'≤ 7 days':score>=35?'≤ 30 days':'Routine'}

export function complianceItemRisk(row){
  const due=field(row,'due_date','valid_until','next_test_date'),d=daysTo(due),status=field(row,'status','test_status'),priority=field(row,'priority','risk')
  if(isClosed(status))return 0
  let score=severityWeight(priority)*3
  if(d!==null&&d<0)score+=45
  else if(d!==null&&d<=30)score+=30
  else if(d!==null&&d<=60)score+=18
  if(/expired|overdue|non.?compliant/i.test(String(status)))score+=35
  return clamp(score)
}

export function companyPrediction(code,data){
  const byCode=list=>(list||[]).filter(r=>companyOf(r)===code)
  const incidents=byCode(data.incidents),obs=byCode(data.observations),actions=byCode(data.actions),compliance=byCode(data.compliance),assets=byCode(data.assets)
  const openInc=incidents.filter(r=>!isClosed(field(r,'status'))),highInc=openInc.filter(r=>severityWeight(field(r,'severity','risk'))>=7)
  const overdueActions=actions.filter(r=>!isClosed(field(r,'status'))&&((daysTo(field(r,'due_date'))??1)<0||/overdue/i.test(String(field(r,'status')))))
  const complianceRisk=compliance.filter(r=>complianceItemRisk(r)>=50)
  const assetRisk=assets.filter(a=>assetPriority(a)>=55)
  const recentObs=obs.filter(r=>{const d=daysTo(field(r,'observation_date','created_at'));return d!==null&&d<=0&&d>=-90})
  const score=clamp(highInc.length*14+openInc.length*5+overdueActions.length*9+complianceRisk.length*8+assetRisk.length*1.5+recentObs.length*2)
  return {code,score,label:riskLabel(score),openIncidents:openInc.length,overdueActions:overdueActions.length,complianceRisk:complianceRisk.length,assetRisk:assetRisk.length,recentObservations:recentObs.length}
}

export function esgScores(data){
  const envTotal=(data.envMetrics||[]).length+(data.envEvents||[]).length
  let environmental=null
  if(envTotal){
    const badMetrics=(data.envMetrics||[]).filter(r=>{const v=Number(field(r,'value')),t=Number(field(r,'target_value'));return Number.isFinite(v)&&Number.isFinite(t)&&v>t}).length
    const openEvents=(data.envEvents||[]).filter(r=>!isClosed(field(r,'status'))).length
    environmental=clamp(100-((badMetrics+openEvents)/envTotal)*100)
  }
  const socialTotal=(data.incidents||[]).length+(data.learning||[]).length
  let social=null
  if(socialTotal){const open=(data.incidents||[]).filter(r=>!isClosed(field(r,'status'))).length,expired=(data.learning||[]).filter(r=>(daysTo(field(r,'valid_until'))??1)<0).length;social=clamp(100-((open+expired)/socialTotal)*100)}
  const govTotal=(data.compliance||[]).length+(data.audits||[]).length
  let governance=null
  if(govTotal){const risk=(data.compliance||[]).filter(r=>complianceItemRisk(r)>=50).length+(data.audits||[]).filter(r=>!isClosed(field(r,'status'))).length;governance=clamp(100-(risk/govTotal)*100)}
  const available=[environmental,social,governance].filter(v=>v!==null)
  return {environmental,social,governance,overall:available.length?Math.round(available.reduce((a,b)=>a+b,0)/available.length):null}
}
