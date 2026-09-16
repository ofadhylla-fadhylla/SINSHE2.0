'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge, Panel, Progress, StatCard } from '../../components/Ui'
import { CheckCircle2, Clock3, Download, Gauge, Plus, Search, ShieldCheck, Timer, Users, X } from 'lucide-react'
import { dbSelect, dbUpsert, getStoredProfile, isSupabaseConfigured } from '../../lib/supabase-rest'
import { COMPANY_MASTER, DEFAULT_COMPANY_FILTERS, companyCodeOf, filteredCompanies } from '../../lib/company-master'
import styles from './man-hours.module.css'

const KEY='sinshe-exposure-hours'
const INCIDENT_KEY='sinshe-incidents'
const UNITS=['Head Office','PKS A','PKS B','PKS C','Estate 1','Estate 2','Estate 3','Laboratorium']
const STATUSES=['Draft','Submitted','Verified']
const RATE_MULTIPLIER=1000000
const currentYear=()=>String(new Date().getFullYear())
const currentMonth=()=>new Date().toISOString().slice(0,7)
const emptyForm={companyCode:'ACP',unit:'Head Office',periodMonth:currentMonth(),employeeHours:'',contractorHours:'',employeeHeadcount:'',contractorHeadcount:'',status:'Draft',sourceRef:'',verifiedBy:'',notes:''}

const safeRead=key=>{try{const raw=localStorage.getItem(key);const rows=raw?JSON.parse(raw):[];return Array.isArray(rows)?rows:[]}catch{return[]}}
const safeWrite=rows=>{try{localStorage.setItem(KEY,JSON.stringify(rows));window.dispatchEvent(new CustomEvent('sinshe-central-data',{detail:{key:KEY,count:rows.length}}))}catch{}}
const mergeById=(local,central)=>{const map=new Map();(local||[]).forEach(r=>r?.id&&map.set(r.id,r));(central||[]).forEach(r=>r?.id&&map.set(r.id,r));return [...map.values()]}
const num=v=>v===null||v===undefined||v===''?0:Number(v)||0
const fmtNumber=v=>new Intl.NumberFormat('id-ID',{maximumFractionDigits:2}).format(Number(v)||0)
const fmtMonth=value=>value?new Intl.DateTimeFormat('id-ID',{month:'short',year:'numeric'}).format(new Date(`${String(value).slice(0,7)}-01T00:00:00`)):'-'
const slug=value=>String(value||'UNIT').toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,18)
const makeId=f=>`EXP-${f.companyCode}-${String(f.periodMonth).replace('-','')}-${slug(f.unit)}`
const incidentType=i=>String(i.type||i.incident_type||'').toLowerCase()
const isRecordable=i=>/(medical treatment|lost time|restricted work|fatal)/.test(incidentType(i))
const isLti=i=>/lost time/.test(incidentType(i))
const statusTone=v=>v==='Verified'?'green':v==='Submitted'?'blue':'orange'

function exposureFromDb(r){return{id:r.id,companyCode:r.company_code||'',unit:r.unit||'Head Office',periodMonth:String(r.period_month||'').slice(0,7),employeeHours:Number(r.employee_hours||0),contractorHours:Number(r.contractor_hours||0),employeeHeadcount:r.employee_headcount??'',contractorHeadcount:r.contractor_headcount??'',status:r.status||'Draft',sourceRef:r.source_ref||'',verifiedBy:r.verified_by||'',notes:r.notes||''}}
function exposureToDb(r){return{id:r.id,company_code:r.companyCode,unit:r.unit,period_month:`${r.periodMonth}-01`,employee_hours:num(r.employeeHours),contractor_hours:num(r.contractorHours),employee_headcount:r.employeeHeadcount===''?null:Number(r.employeeHeadcount),contractor_headcount:r.contractorHeadcount===''?null:Number(r.contractorHeadcount),status:r.status,source_ref:r.sourceRef||null,verified_by:r.status==='Verified'?(r.verifiedBy||null):null,notes:r.notes||null}}
function incidentFromDb(r){return{...r,companyCode:r.company_code||'',date:r.incident_date||r.date,type:r.incident_type||r.type}}

export default function ManHoursExposure(){
  const [records,setRecords]=useState([])
  const [incidents,setIncidents]=useState([])
  const [filters,setFilters]=useState(DEFAULT_COMPANY_FILTERS)
  const [year,setYear]=useState(currentYear())
  const [search,setSearch]=useState('')
  const [statusFilter,setStatusFilter]=useState('All')
  const [modalOpen,setModalOpen]=useState(false)
  const [form,setForm]=useState(emptyForm)
  const [notice,setNotice]=useState('')
  const [source,setSource]=useState('Local cache')
  const [loading,setLoading]=useState(true)
  const profile=getStoredProfile()
  const canManage=!profile||profile.role!=='Viewer'

  useEffect(()=>{
    let active=true
    async function load(){
      const localExposure=safeRead(KEY)
      const localIncidents=safeRead(INCIDENT_KEY)
      if(active){setRecords(localExposure);setIncidents(localIncidents)}
      if(!isSupabaseConfigured()){setLoading(false);return}
      try{
        const [exposureRows,incidentRows]=await Promise.all([
          dbSelect('hse_exposure_hours','select=*&order=period_month.desc,company_code.asc,unit.asc'),
          dbSelect('incidents','select=*'),
        ])
        if(!active)return
        const centralExposure=(exposureRows||[]).map(exposureFromDb)
        const merged=mergeById(localExposure,centralExposure)
        setRecords(merged);safeWrite(merged)
        setIncidents((incidentRows||[]).map(incidentFromDb))
        setSource('Supabase central data')
      }catch(err){if(active)setNotice(`Central data belum dapat dibaca: ${err.message}`)}finally{if(active)setLoading(false)}
    }
    load();return()=>{active=false}
  },[])

  const allowedCompanies=useMemo(()=>filteredCompanies(filters),[filters])
  const allowedCodes=useMemo(()=>new Set(allowedCompanies.map(c=>c.code)),[allowedCompanies])
  const specific=filters.company!=='All'||filters.region!=='All'||filters.province!=='All'||filters.pic!=='All'
  const scopeMatch=row=>{const code=companyCodeOf(row);return !code?!specific:allowedCodes.has(code)}

  const scopedRecords=useMemo(()=>records.filter(r=>scopeMatch(r)&&String(r.periodMonth||'').slice(0,4)===year),[records,allowedCodes,specific,year])
  const scopedIncidents=useMemo(()=>incidents.filter(i=>scopeMatch(i)&&String(i.date||i.incident_date||'').slice(0,4)===year),[incidents,allowedCodes,specific,year])
  const verified=useMemo(()=>scopedRecords.filter(r=>r.status==='Verified'),[scopedRecords])
  const verifiedHours=verified.reduce((s,r)=>s+num(r.employeeHours)+num(r.contractorHours),0)
  const employeeHours=verified.reduce((s,r)=>s+num(r.employeeHours),0)
  const contractorHours=verified.reduce((s,r)=>s+num(r.contractorHours),0)
  const recordableCount=scopedIncidents.filter(isRecordable).length
  const ltiCount=scopedIncidents.filter(isLti).length
  const trif=verifiedHours>0?recordableCount*RATE_MULTIPLIER/verifiedHours:null
  const ltifr=verifiedHours>0?ltiCount*RATE_MULTIPLIER/verifiedHours:null

  const monthsExpected=useMemo(()=>{const y=Number(year);const now=new Date();if(y<now.getFullYear())return 12;if(y>now.getFullYear())return 0;return now.getMonth()+1},[year])
  const verifiedCompanyMonths=new Set(verified.map(r=>`${r.companyCode}-${r.periodMonth}`)).size
  const expectedCompanyMonths=allowedCompanies.length*monthsExpected
  const coverage=expectedCompanyMonths?Math.min(100,Math.round(verifiedCompanyMonths/expectedCompanyMonths*100)):0

  const rows=useMemo(()=>scopedRecords.filter(r=>{
    const q=search.trim().toLowerCase()
    const text=[r.id,r.companyCode,r.unit,r.sourceRef,r.verifiedBy,r.notes].join(' ').toLowerCase()
    return (!q||text.includes(q))&&(statusFilter==='All'||r.status===statusFilter)
  }).sort((a,b)=>String(b.periodMonth).localeCompare(String(a.periodMonth))||String(a.companyCode).localeCompare(String(b.companyCode))),[scopedRecords,search,statusFilter])

  const monthSummary=useMemo(()=>Array.from({length:12},(_,idx)=>{
    const month=`${year}-${String(idx+1).padStart(2,'0')}`
    const monthRows=verified.filter(r=>r.periodMonth===month)
    return{month,hours:monthRows.reduce((s,r)=>s+num(r.employeeHours)+num(r.contractorHours),0),records:monthRows.length}
  }),[verified,year])

  function flash(message){setNotice(message);setTimeout(()=>setNotice(''),3500)}
  function openNew(){const company=filters.company!=='All'?filters.company:(allowedCompanies[0]?.code||'ACP');setForm({...emptyForm,companyCode:company,verifiedBy:profile?.full_name||''});setModalOpen(true)}
  function edit(row){setForm({...row,employeeHours:String(row.employeeHours??''),contractorHours:String(row.contractorHours??''),employeeHeadcount:row.employeeHeadcount??'',contractorHeadcount:row.contractorHeadcount??'',verifiedBy:row.verifiedBy||profile?.full_name||''});setModalOpen(true)}
  async function save(e){
    e.preventDefault();if(!canManage){flash('Role Viewer hanya dapat melihat data exposure.');return}
    if(!form.companyCode||!form.unit||!form.periodMonth){flash('Pilih Company/PT, unit dan periode.');return}
    if(num(form.employeeHours)<0||num(form.contractorHours)<0){flash('Man-hours tidak boleh bernilai negatif.');return}
    if(num(form.employeeHours)+num(form.contractorHours)<=0){flash('Isi employee hours atau contractor hours lebih dari 0.');return}
    const item={...form,id:form.id||makeId(form),employeeHours:num(form.employeeHours),contractorHours:num(form.contractorHours),employeeHeadcount:form.employeeHeadcount===''?'':Number(form.employeeHeadcount),contractorHeadcount:form.contractorHeadcount===''?'':Number(form.contractorHeadcount),verifiedBy:form.status==='Verified'?(form.verifiedBy||profile?.full_name||''):''}
    const next=[item,...records.filter(r=>r.id!==item.id)];setRecords(next);safeWrite(next);setModalOpen(false)
    if(isSupabaseConfigured()){try{await dbUpsert('hse_exposure_hours',[exposureToDb(item)],'id');flash(`${item.id} tersimpan ke central data.`)}catch(err){flash(`Tersimpan lokal, sync gagal: ${err.message}`)}}else flash(`${item.id} tersimpan lokal.`)
  }
  async function setVerified(row){
    if(!canManage)return
    const item={...row,status:'Verified',verifiedBy:profile?.full_name||profile?.email||row.verifiedBy||'Verified User'}
    const next=records.map(r=>r.id===item.id?item:r);setRecords(next);safeWrite(next)
    if(isSupabaseConfigured()){try{await dbUpsert('hse_exposure_hours',[exposureToDb(item)],'id');flash(`${item.id} sudah Verified.`)}catch(err){flash(`Update lokal tersimpan, sync gagal: ${err.message}`)}}
  }
  function exportCSV(){const header=['ID','Company/PT','Period','Unit','Employee Hours','Contractor Hours','Total Hours','Employee HC','Contractor HC','Status','Source','Verified By','Notes'];const data=rows.map(r=>[r.id,r.companyCode,r.periodMonth,r.unit,r.employeeHours,r.contractorHours,num(r.employeeHours)+num(r.contractorHours),r.employeeHeadcount,r.contractorHeadcount,r.status,r.sourceRef,r.verifiedBy,r.notes]);const csv=[header,...data].map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`SINSHE_ManHours_${year}_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url)}

  return <Shell title="Man-Hours & HSE Exposure" subtitle="Sumber exposure hours terverifikasi untuk TRIFR, LTIFR dan performance rate per Company/PT.">
    <CompanyScopeBar filters={filters} onChange={setFilters} onReset={()=>setFilters(DEFAULT_COMPANY_FILTERS)}/>
    {notice&&<div className={styles.notice}><CheckCircle2 size={18}/>{notice}</div>}

    <div className={styles.topline}>
      <div><b>Official rate basis</b><span>Hanya record berstatus Verified yang masuk denominator. Multiplier: {RATE_MULTIPLIER.toLocaleString('id-ID')} jam.</span></div>
      <label>Tahun<select value={year} onChange={e=>setYear(e.target.value)}>{[currentYear(),String(Number(currentYear())-1),String(Number(currentYear())-2)].map(v=><option key={v}>{v}</option>)}</select></label>
    </div>

    <div className="stats-grid six">
      <StatCard label="Verified Exposure" value={fmtNumber(verifiedHours)} hint="employee + contractor hours" tone="green" icon={<Timer/>}/>
      <StatCard label="Employee Hours" value={fmtNumber(employeeHours)} hint="verified" tone="blue" icon={<Users/>}/>
      <StatCard label="Contractor Hours" value={fmtNumber(contractorHours)} hint="verified" tone="purple" icon={<ShieldCheck/>}/>
      <StatCard label="TRIFR" value={trif===null?'—':trif.toFixed(2)} hint={`${recordableCount} recordable case`} tone="green" icon={<Gauge/>}/>
      <StatCard label="LTIFR" value={ltifr===null?'—':ltifr.toFixed(2)} hint={`${ltiCount} lost time injury`} tone="blue" icon={<Clock3/>}/>
      <StatCard label="Coverage" value={`${coverage}%`} hint={`${verifiedCompanyMonths}/${expectedCompanyMonths||0} PT-month verified`} tone={coverage>=90?'green':'orange'} icon={<CheckCircle2/>}/>
    </div>

    <div className={styles.actionsRow}><div><h2>Exposure Register</h2><p>{source}{loading?' · loading…':''} · Draft/Submitted tidak memengaruhi official rate.</p></div><div className={styles.buttons}><button className={styles.secondary} onClick={exportCSV}><Download size={16}/> Export CSV</button>{canManage&&<button className={styles.primary} onClick={openNew}><Plus size={17}/> Input Man-Hours</button>}</div></div>

    <div className="exec-grid two">
      <Panel title="Monthly Verified Exposure" action={`${year} • ${fmtNumber(verifiedHours)} jam`}>
        <div className={styles.monthList}>{monthSummary.map(m=>{const max=Math.max(1,...monthSummary.map(x=>x.hours));return <div key={m.month}><span>{fmtMonth(m.month)}</span><div><i style={{width:`${m.hours/max*100}%`}}/></div><b>{fmtNumber(m.hours)}</b></div>})}</div>
      </Panel>
      <Panel title="Rate Methodology" action="Transparent calculation">
        <div className={styles.formula}><b>TRIFR</b><code>Recordable Injuries × 1,000,000 / Verified Exposure Hours</code><span>Recordable mapping saat ini: Medical Treatment, Restricted Work, Lost Time Injury, dan Fatality. First Aid dan Near Miss tidak dihitung sebagai recordable.</span></div>
        <div className={styles.formula}><b>LTIFR</b><code>Lost Time Injuries × 1,000,000 / Verified Exposure Hours</code><span>Jika exposure hours = 0, dashboard menampilkan “—”; sistem tidak membuat rate estimasi.</span></div>
      </Panel>
    </div>

    <Panel className="mt">
      <div className={styles.filters}><label className={styles.search}><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari PT, unit, source, verifier..."/></label><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All</option>{STATUSES.map(v=><option key={v}>{v}</option>)}</select></div>
      <div className="table-wrap"><table><thead><tr><th>Period</th><th>PT</th><th>Unit</th><th>Employee</th><th>Contractor</th><th>Total Hours</th><th>Status</th><th>Source</th><th>Action</th></tr></thead><tbody>
        {rows.map(r=><tr key={r.id}><td><b>{fmtMonth(r.periodMonth)}</b><small className={styles.block}>{r.id}</small></td><td><b>{r.companyCode}</b></td><td>{r.unit}</td><td>{fmtNumber(r.employeeHours)}</td><td>{fmtNumber(r.contractorHours)}</td><td><b>{fmtNumber(num(r.employeeHours)+num(r.contractorHours))}</b></td><td><Badge tone={statusTone(r.status)}>{r.status}</Badge>{r.verifiedBy&&<small className={styles.block}>{r.verifiedBy}</small>}</td><td>{r.sourceRef||'-'}</td><td><div className={styles.rowActions}>{canManage&&<button onClick={()=>edit(r)}>Edit</button>}{canManage&&r.status!=='Verified'&&<button onClick={()=>setVerified(r)}>Verify</button>}</div></td></tr>)}
        {!rows.length&&<tr><td colSpan="9" className={styles.empty}>Belum ada man-hours untuk scope dan tahun ini.</td></tr>}
      </tbody></table></div>
    </Panel>

    {modalOpen&&<div className={styles.backdrop} onMouseDown={e=>{if(e.target===e.currentTarget)setModalOpen(false)}}><div className={styles.modal}><div className={styles.modalHead}><div><h2>Input Man-Hours</h2><p>Satu record per PT + unit + bulan. Record dengan ID sama akan diperbarui.</p></div><button onClick={()=>setModalOpen(false)}><X size={18}/></button></div><form onSubmit={save}><div className={styles.formGrid}>
      <label>Company / PT<select value={form.companyCode} onChange={e=>setForm({...form,companyCode:e.target.value})}>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
      <label>Unit<select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>{UNITS.map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Period<input type="month" value={form.periodMonth} onChange={e=>setForm({...form,periodMonth:e.target.value})}/></label>
      <label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{STATUSES.map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Employee Hours<input type="number" min="0" step="0.01" value={form.employeeHours} onChange={e=>setForm({...form,employeeHours:e.target.value})} placeholder="0"/></label>
      <label>Contractor Hours<input type="number" min="0" step="0.01" value={form.contractorHours} onChange={e=>setForm({...form,contractorHours:e.target.value})} placeholder="0"/></label>
      <label>Employee Headcount<input type="number" min="0" value={form.employeeHeadcount} onChange={e=>setForm({...form,employeeHeadcount:e.target.value})} placeholder="optional"/></label>
      <label>Contractor Headcount<input type="number" min="0" value={form.contractorHeadcount} onChange={e=>setForm({...form,contractorHeadcount:e.target.value})} placeholder="optional"/></label>
      <label className={styles.span2}>Source / Reference<input value={form.sourceRef} onChange={e=>setForm({...form,sourceRef:e.target.value})} placeholder="Timesheet, payroll report, contractor attendance, file ref..."/></label>
      {form.status==='Verified'&&<label className={styles.span2}>Verified By<input value={form.verifiedBy} onChange={e=>setForm({...form,verifiedBy:e.target.value})} placeholder="Nama verifier"/></label>}
      <label className={styles.span2}>Notes<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Catatan rekonsiliasi / adjustment..."/></label>
    </div><div className={styles.formFooter}><button type="button" className={styles.secondary} onClick={()=>setModalOpen(false)}>Batal</button><button className={styles.primary} type="submit"><CheckCircle2 size={16}/> Simpan</button></div></form></div></div>}
  </Shell>
}
