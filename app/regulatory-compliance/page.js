'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import { Badge, Panel, Progress, StatCard } from '../../components/Ui'
import {
  AlertTriangle, Bot, CheckCircle2, Clock3, Download, FileCheck2, Filter,
  Gauge, Leaf, Plus, Search, ShieldCheck, Scale, X
} from 'lucide-react'
import { COMPANY_MASTER } from '../../lib/company-master'
import styles from './regulatory-compliance.module.css'

const defaultObligations = [
  { id:'REG-001', regulation:'UU K3 & Turunannya', category:'K3', obligation:'Pemeriksaan berkala pesawat uap / boiler', unit:'PKS A', owner:'HSE PKS A', dueDate:'2026-09-27', status:'Needs Action', priority:'High', evidence:'Riksa Uji Boiler', reference:'Permenaker No. 37/2016' },
  { id:'REG-002', regulation:'Permenaker RI', category:'K3', obligation:'Perpanjangan SIO operator forklift', unit:'Estate 3', owner:'HSE Estate 3', dueDate:'2026-10-05', status:'Needs Action', priority:'Medium', evidence:'SIO Forklift', reference:'Permenaker No. 8/2020' },
  { id:'REG-003', regulation:'SMK3 (PP 50/2012)', category:'Audit', obligation:'Audit internal SMK3 semester II', unit:'Head Office', owner:'Corporate HSE', dueDate:'2026-10-20', status:'Compliant', priority:'Medium', evidence:'Audit Plan SMK3', reference:'PP No. 50/2012' },
  { id:'REG-004', regulation:'ISPO Standards', category:'Sustainability', obligation:'Review pemenuhan legalitas dan prinsip ISPO', unit:'Estate 2', owner:'Sustainability', dueDate:'2026-11-15', status:'Compliant', priority:'Medium', evidence:'Checklist ISPO', reference:'Permentan 33/2025' },
  { id:'REG-005', regulation:'RSPO Standards', category:'Sustainability', obligation:'Surveillance readiness dan evidence closure', unit:'PKS B', owner:'Sustainability', dueDate:'2026-10-30', status:'Needs Action', priority:'High', evidence:'RSPO Evidence Pack', reference:'RSPO P&C' },
  { id:'REG-006', regulation:'Environmental Regulation', category:'Environment', obligation:'Pelaporan pemantauan kualitas air limbah', unit:'PKS C', owner:'Environmental Officer', dueDate:'2026-09-10', status:'Non Compliant', priority:'Critical', evidence:'SPARING / Lab Result', reference:'Persetujuan Teknis Air Limbah' },
  { id:'REG-007', regulation:'ISO 14001', category:'Environment', obligation:'Evaluasi kepatuhan peraturan lingkungan', unit:'Head Office', owner:'Corporate HSE', dueDate:'2026-12-10', status:'Compliant', priority:'Low', evidence:'Compliance Evaluation', reference:'ISO 14001:2015' },
  { id:'REG-008', regulation:'ISO 45001', category:'K3', obligation:'Review operational control dan worker consultation', unit:'Head Office', owner:'Corporate HSE', dueDate:'2026-12-20', status:'Compliant', priority:'Low', evidence:'IMS Review', reference:'ISO 45001:2018' },
]

const regulations = ['UU K3 & Turunannya','Permenaker RI','SMK3 (PP 50/2012)','ISPO Standards','RSPO Standards','ISO 14001','ISO 45001','Environmental Regulation','ESG Regulations','Lainnya']
const categories = ['K3','Environment','Sustainability','Audit','ESG','Other']
const units = ['Head Office','PKS A','PKS B','PKS C','Estate 1','Estate 2','Estate 3','Laboratorium']
const priorities = ['Low','Medium','High','Critical']
const statuses = ['Compliant','Needs Action','Non Compliant']
const emptyForm = { companyCode:'ACP', regulation:'Permenaker RI', category:'K3', obligation:'', unit:'PKS A', owner:'', dueDate:'', status:'Needs Action', priority:'Medium', evidence:'', reference:'' }

const tone = value => { if(['Compliant','Low'].includes(value))return'green'; if(['Needs Action','Medium'].includes(value))return'orange'; if(['High'].includes(value))return'blue'; if(['Non Compliant','Critical'].includes(value))return'red'; return'purple' }
const fmt = value => value ? new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${value}T00:00:00`)) : '-'
const daysUntil = value => value ? Math.ceil((new Date(`${value}T23:59:59`) - new Date()) / 86400000) : null

export default function Regulatory(){
  const [items,setItems] = useState(defaultObligations)
  const [search,setSearch] = useState('')
  const [filterCompany,setFilterCompany] = useState('All')
  const [filterStatus,setFilterStatus] = useState('All')
  const [filterCategory,setFilterCategory] = useState('All')
  const [filterUnit,setFilterUnit] = useState('All')
  const [modalOpen,setModalOpen] = useState(false)
  const [form,setForm] = useState(emptyForm)
  const [notice,setNotice] = useState('')

  useEffect(()=>{try{const saved=localStorage.getItem('sinshe-regulatory-obligations');if(saved)setItems(JSON.parse(saved))}catch{}},[])
  useEffect(()=>{try{localStorage.setItem('sinshe-regulatory-obligations',JSON.stringify(items))}catch{}},[items])

  const companyScoped=useMemo(()=>filterCompany==='All'?items:items.filter(i=>i.companyCode===filterCompany),[items,filterCompany])
  const filtered=useMemo(()=>companyScoped.filter(i=>{const q=search.trim().toLowerCase();const matchSearch=!q||[i.id,i.companyCode,i.regulation,i.obligation,i.reference,i.owner,i.unit,i.evidence].join(' ').toLowerCase().includes(q);return matchSearch&&(filterStatus==='All'||i.status===filterStatus)&&(filterCategory==='All'||i.category===filterCategory)&&(filterUnit==='All'||i.unit===filterUnit)}),[companyScoped,search,filterStatus,filterCategory,filterUnit])

  const compliant=companyScoped.filter(i=>i.status==='Compliant').length
  const needsAction=companyScoped.filter(i=>i.status==='Needs Action').length
  const nonCompliant=companyScoped.filter(i=>i.status==='Non Compliant').length
  const total=companyScoped.length
  const score=total?Math.round(((compliant+needsAction*0.5)/total)*1000)/10:0
  const auditReadiness=total?Math.round((companyScoped.filter(i=>i.evidence&&i.owner&&i.dueDate).length/total)*100):0
  const coverage=total?100:0

  const upcoming=useMemo(()=>companyScoped.filter(i=>i.status!=='Compliant').map(i=>({...i,days:daysUntil(i.dueDate)})).filter(i=>i.days!==null&&i.days<=60).sort((a,b)=>a.days-b.days).slice(0,6),[companyScoped])
  const matrix=useMemo(()=>{const map=new Map();companyScoped.forEach(i=>{const key=i.regulation;if(!map.has(key))map.set(key,{name:key,total:0,compliant:0,action:0,non:0});const row=map.get(key);row.total++;if(i.status==='Compliant')row.compliant++;else if(i.status==='Needs Action')row.action++;else row.non++});return[...map.values()].map(r=>({...r,score:r.total?Math.round(((r.compliant+r.action*0.5)/r.total)*1000)/10:0}))},[companyScoped])

  function flash(message){setNotice(message);setTimeout(()=>setNotice(''),3000)}
  function updateForm(field,value){setForm(prev=>({...prev,[field]:value}))}
  function saveObligation(e){e.preventDefault();if(!form.companyCode||!form.obligation.trim()||!form.owner.trim()||!form.dueDate||!form.reference.trim()){flash('Pilih Company/PT dan lengkapi kewajiban, owner/PIC, due date serta dasar regulasi.');return}const seq=Math.max(8,...items.map(i=>Number(i.id.split('-').pop())||0))+1;const item={id:`REG-${String(seq).padStart(3,'0')}`,...form};setItems(prev=>[item,...prev]);setFilterCompany(form.companyCode);setForm(emptyForm);setModalOpen(false);flash(`${item.id} berhasil ditambahkan untuk PT ${form.companyCode}.`)}
  function markCompliant(id){setItems(prev=>prev.map(i=>i.id===id?{...i,status:'Compliant'}:i));flash(`${id} ditandai Compliant.`)}
  function exportCSV(){const header=['ID','Company/PT','Regulation','Category','Obligation','Unit','Owner','Due Date','Status','Priority','Evidence','Reference'];const rows=filtered.map(i=>[i.id,i.companyCode||'',i.regulation,i.category,i.obligation,i.unit,i.owner,i.dueDate,i.status,i.priority,i.evidence,i.reference]);const csv=[header,...rows].map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`SINSHE_Regulatory_Compliance_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url)}

  return <Shell title="Regulatory Compliance" subtitle="Legal register, compliance monitoring, reminder dan audit readiness terintegrasi.">
    {notice&&<div className={styles.notice}><CheckCircle2 size={18}/>{notice}</div>}
    <div className="stats-grid four"><StatCard label="Overall Compliance" value={`${score}%`} hint={`${compliant} compliant • ${needsAction} needs action`} tone="green" icon={<CheckCircle2/>}/><StatCard label="Audit Readiness" value={`${auditReadiness}%`} hint="evidence & PIC tersedia" tone="blue" icon={<FileCheck2/>}/><StatCard label="Regulation Coverage" value={`${coverage}%`} hint={`${new Set(companyScoped.map(i=>i.regulation)).size} kelompok regulasi`} tone="purple" icon={<ShieldCheck/>}/><StatCard label="Non Compliant" value={nonCompliant} hint={`${total} total kewajiban`} tone="red" icon={<Scale/>}/></div>

    <div className={styles.headerRow}><div><h2>Legal & Compliance Register</h2><p>Kelola kewajiban regulasi, standar, due date, evidence dan PIC per Company/PT.</p></div><div className={styles.buttons}><button className={styles.secondary} onClick={exportCSV}><Download size={17}/> Export CSV</button><button className={styles.primary} onClick={()=>setModalOpen(true)}><Plus size={18}/> Kewajiban Baru</button></div></div>

    <Panel className={styles.registerPanel}><div className={styles.filters}>
      <label className={styles.search}><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari PT, regulasi, kewajiban, PIC, evidence..."/></label>
      <label><select value={filterCompany} onChange={e=>setFilterCompany(e.target.value)}><option value="All">All Companies</option>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
      <label><Filter size={15}/><select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option>All</option>{statuses.map(v=><option key={v}>{v}</option>)}</select></label><label><select value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}><option>All</option>{categories.map(v=><option key={v}>{v}</option>)}</select></label><label><select value={filterUnit} onChange={e=>setFilterUnit(e.target.value)}><option>All</option>{units.map(v=><option key={v}>{v}</option>)}</select></label>
    </div><div className="table-wrap"><table><thead><tr><th>ID</th><th>PT</th><th>Regulasi / Standard</th><th>Kewajiban</th><th>Unit</th><th>PIC</th><th>Due Date</th><th>Priority</th><th>Status</th><th>Evidence</th><th>Aksi</th></tr></thead><tbody>{filtered.map(i=>{const days=daysUntil(i.dueDate);return <tr key={i.id} className={i.status==='Non Compliant'?styles.alertRow:''}><td><b>{i.id}</b></td><td><b>{i.companyCode||'-'}</b></td><td><b>{i.regulation}</b><small className={styles.block}>{i.reference}</small></td><td className={styles.obligationCell}><b>{i.obligation}</b><small>{i.category}</small></td><td>{i.unit}</td><td>{i.owner}</td><td><b className={days!==null&&days<0?styles.overdue:''}>{fmt(i.dueDate)}</b><small className={styles.block}>{days===null?'':days<0?`${Math.abs(days)} hari overdue`:`${days} hari lagi`}</small></td><td><Badge tone={tone(i.priority)}>{i.priority}</Badge></td><td><Badge tone={tone(i.status)}>{i.status}</Badge></td><td>{i.evidence||'-'}</td><td>{i.status!=='Compliant'?<button className={styles.closeBtn} onClick={()=>markCompliant(i.id)}><CheckCircle2 size={14}/> Comply</button>:<span className={styles.done}><CheckCircle2 size={14}/> Done</span>}</td></tr>})}{!filtered.length&&<tr><td colSpan="11" className={styles.empty}>Tidak ada data sesuai filter.</td></tr>}</tbody></table></div></Panel>

    <div className="dashboard-split compliance-layout mt"><Panel title="Compliance Matrix"><div className="table-wrap"><table><thead><tr><th>Regulasi / Standard</th><th>Kewajiban</th><th>Compliant</th><th>Needs Action</th><th>Non Compliant</th><th>Score</th></tr></thead><tbody>{matrix.map(r=><tr key={r.name}><td><b>{r.name}</b></td><td>{r.total}</td><td>{r.compliant}</td><td><Badge tone="orange">{r.action}</Badge></td><td><Badge tone="red">{r.non}</Badge></td><td style={{minWidth:120}}><b>{r.score}%</b><Progress value={r.score} tone={r.score>=90?'green':r.score>=75?'orange':'red'}/></td></tr>)}</tbody></table></div></Panel>
      <Panel title="Upcoming & Reminder"><div className={styles.reminders}>{upcoming.map(i=><div key={i.id}>{i.days<0?<AlertTriangle size={19}/>:<Clock3 size={19}/>}<span><b>{i.evidence||i.obligation}</b><small>{i.companyCode||'-'} • {i.unit} • {i.reference}</small></span><Badge tone={i.days<0?'red':i.days<=14?'red':i.days<=30?'orange':'blue'}>{i.days<0?`${Math.abs(i.days)} Hari Overdue`:`${i.days} Hari`}</Badge></div>)}{!upcoming.length&&<p className={styles.empty}>Tidak ada kewajiban kritis dalam 60 hari.</p>}</div><div className="ai-card"><Bot/><div><b>AI Notification</b><p>{nonCompliant} kewajiban non-compliant, {upcoming.filter(i=>i.days>=0&&i.days<=30).length} jatuh tempo dalam 30 hari, dan {upcoming.filter(i=>i.days<0).length} overdue pada scope PT aktif.</p></div></div></Panel>
    </div>

    <Panel title="Environmental Compliance & Monitoring" className="mt"><div className={styles.envGrid}><div><Gauge/><span><b>SPARING Online</b><small>COD 12.4 mg/L • BOD 6.1 mg/L • pH 7.2</small></span><Badge tone="green">Connected</Badge></div><div><Leaf/><span><b>Air Limbah</b><small>Pemantauan kualitas air limbah pabrik</small></span><Badge tone="green">Within Limit</Badge></div><div><Gauge/><span><b>Emission Monitoring</b><small>Cerobong & udara ambien</small></span><Badge tone="orange">Review</Badge></div><div><FileCheck2/><span><b>Environmental Permit</b><small>Persetujuan teknis & pelaporan</small></span><Badge tone="green">Valid</Badge></div></div></Panel>
    <div className="impact-grid"><div><ShieldCheck/><b>-60%</b><span>Risiko ketidakpatuhan</span></div><div><FileCheck2/><b>{auditReadiness}%</b><span>Kesiapan audit</span></div><div><Leaf/><b>-10%</b><span>Dampak lingkungan</span></div><div><Clock3/><b>-70%</b><span>Waktu pelaporan</span></div></div>

    {modalOpen&&<div className={styles.backdrop} onMouseDown={e=>{if(e.target===e.currentTarget)setModalOpen(false)}}><form className={styles.modal} onSubmit={saveObligation}><div className={styles.modalHead}><div><span>SINSHE 2.0</span><h2>Kewajiban Regulasi Baru</h2><p>Tambahkan kewajiban legal, standar atau audit per Company/PT.</p></div><button type="button" onClick={()=>setModalOpen(false)}><X/></button></div><div className={styles.formGrid}>
      <label>Company / PT<select value={form.companyCode} onChange={e=>updateForm('companyCode',e.target.value)}>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label><label>Regulasi / Standard<select value={form.regulation} onChange={e=>updateForm('regulation',e.target.value)}>{regulations.map(v=><option key={v}>{v}</option>)}</select></label><label>Kategori<select value={form.category} onChange={e=>updateForm('category',e.target.value)}>{categories.map(v=><option key={v}>{v}</option>)}</select></label><label className={styles.span2}>Kewajiban<textarea value={form.obligation} onChange={e=>updateForm('obligation',e.target.value)} placeholder="Jelaskan kewajiban yang harus dipenuhi..."/></label><label>Unit<select value={form.unit} onChange={e=>updateForm('unit',e.target.value)}>{units.map(v=><option key={v}>{v}</option>)}</select></label><label>PIC / Owner<input value={form.owner} onChange={e=>updateForm('owner',e.target.value)} placeholder="Contoh: HSE PKS A"/></label><label>Due Date<input type="date" value={form.dueDate} onChange={e=>updateForm('dueDate',e.target.value)}/></label><label>Priority<select value={form.priority} onChange={e=>updateForm('priority',e.target.value)}>{priorities.map(v=><option key={v}>{v}</option>)}</select></label><label>Status<select value={form.status} onChange={e=>updateForm('status',e.target.value)}>{statuses.map(v=><option key={v}>{v}</option>)}</select></label><label>Evidence / Dokumen<input value={form.evidence} onChange={e=>updateForm('evidence',e.target.value)} placeholder="Nama dokumen / bukti"/></label><label className={styles.span2}>Dasar Regulasi<input value={form.reference} onChange={e=>updateForm('reference',e.target.value)} placeholder="Nomor peraturan / klausul standar"/></label>
    </div><div className={styles.modalActions}><button type="button" onClick={()=>setModalOpen(false)}>Batal</button><button type="submit">Simpan Kewajiban</button></div></form></div>}
  </Shell>
}
