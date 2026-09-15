'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import { Badge, Panel, StatCard } from '../../components/Ui'
import {
  AlertTriangle, CheckCircle2, ClipboardSignature, Clock3, Download,
  Eye, FileCheck2, FileWarning, Filter, Flame, LockKeyhole, PauseCircle,
  PlayCircle, Plus, Search, ShieldCheck, X
} from 'lucide-react'
import { COMPANY_MASTER } from '../../lib/company-master'
import styles from './permit-to-work.module.css'

const defaultPermits = [
  { id:'PTW-2026-311', type:'Hot Work', title:'Pengelasan pipa steam', unit:'PKS A', area:'Boiler Area', requester:'Ahmad R.', contractor:'Internal Maintenance', supervisor:'Maintenance Supervisor', startDate:'2026-09-15', startTime:'13:00', endDate:'2026-09-15', endTime:'17:00', risk:'High', status:'Awaiting Approval', jsaNo:'JSA-PKSA-0915-01', description:'Pengelasan spool pipa steam pada area boiler.', controls:{jsa:true,toolbox:true,ppe:true,barricade:true,loto:false,gasTest:true,fireWatch:true,fallProtection:false,rescuePlan:false}, approval:'Area Owner', createdAt:'2026-09-15' },
  { id:'PTW-2026-305', type:'Working at Height', title:'Inspeksi cerobong', unit:'PKS B', area:'Boiler Stack', requester:'Budi S.', contractor:'PT Vertical Teknik', supervisor:'HSE PKS B', startDate:'2026-09-15', startTime:'08:00', endDate:'2026-09-15', endTime:'16:00', risk:'High', status:'Active', jsaNo:'JSA-PKSB-0915-02', description:'Inspeksi visual struktur dan platform cerobong.', controls:{jsa:true,toolbox:true,ppe:true,barricade:true,loto:false,gasTest:false,fireWatch:false,fallProtection:true,rescuePlan:true}, approval:'Approved', createdAt:'2026-09-14' },
  { id:'PTW-2026-307', type:'Electrical', title:'Perawatan panel LVMDP', unit:'PKS A', area:'Main Electrical Room', requester:'Citra D.', contractor:'Internal Electrical', supervisor:'Electrical Supervisor', startDate:'2026-09-15', startTime:'09:00', endDate:'2026-09-15', endTime:'15:00', risk:'Critical', status:'Active', jsaNo:'JSA-PKSA-0915-04', description:'Preventive maintenance panel LVMDP dengan isolasi energi.', controls:{jsa:true,toolbox:true,ppe:true,barricade:true,loto:true,gasTest:false,fireWatch:false,fallProtection:false,rescuePlan:false}, approval:'Approved', createdAt:'2026-09-14' },
  { id:'PTW-2026-312', type:'Confined Space', title:'Pembersihan chamber WWTP', unit:'PKS C', area:'WWTP', requester:'Dedi P.', contractor:'PT CleanPro', supervisor:'WWTP Supervisor', startDate:'2026-09-16', startTime:'08:00', endDate:'2026-09-16', endTime:'14:00', risk:'Critical', status:'Awaiting Approval', jsaNo:'JSA-PKSC-0916-01', description:'Pembersihan internal chamber equalization tank.', controls:{jsa:true,toolbox:true,ppe:true,barricade:true,loto:true,gasTest:true,fireWatch:false,fallProtection:false,rescuePlan:true}, approval:'HSE Review', createdAt:'2026-09-15' },
  { id:'PTW-2026-298', type:'Hot Work', title:'Perbaikan tangki', unit:'PKS C', area:'Tank Farm', requester:'Eka W.', contractor:'Internal Maintenance', supervisor:'Maintenance Supervisor', startDate:'2026-09-10', startTime:'08:00', endDate:'2026-09-10', endTime:'12:00', risk:'High', status:'Closed', jsaNo:'JSA-PKSC-0910-03', description:'Repair minor support pada tangki.', controls:{jsa:true,toolbox:true,ppe:true,barricade:true,loto:true,gasTest:true,fireWatch:true,fallProtection:false,rescuePlan:false}, approval:'Approved', createdAt:'2026-09-09' },
]

const types = ['Hot Work','Working at Height','Confined Space','Electrical','Excavation','Lifting','General Work']
const units = ['Head Office','PKS A','PKS B','PKS C','Estate 1','Estate 2','Estate 3','Laboratorium']
const risks = ['Low','Medium','High','Critical']
const statuses = ['Draft','Awaiting Approval','Approved','Active','Suspended','Expired','Closed']
const controlLabels = {
  jsa:'JSA / HIRA tersedia', toolbox:'Toolbox meeting', ppe:'APD sesuai pekerjaan', barricade:'Barricade & signage',
  loto:'LOTO / isolasi energi', gasTest:'Gas test', fireWatch:'Fire watch & APAR', fallProtection:'Fall protection', rescuePlan:'Rescue plan'
}
const mandatoryByType = {
  'Hot Work':['jsa','toolbox','ppe','barricade','gasTest','fireWatch'],
  'Working at Height':['jsa','toolbox','ppe','barricade','fallProtection','rescuePlan'],
  'Confined Space':['jsa','toolbox','ppe','barricade','loto','gasTest','rescuePlan'],
  'Electrical':['jsa','toolbox','ppe','barricade','loto'], 'Excavation':['jsa','toolbox','ppe','barricade'],
  'Lifting':['jsa','toolbox','ppe','barricade'], 'General Work':['jsa','toolbox','ppe']
}

const emptyControls = { jsa:false,toolbox:false,ppe:false,barricade:false,loto:false,gasTest:false,fireWatch:false,fallProtection:false,rescuePlan:false }
const emptyForm = {
  companyCode:'ACP', type:'Hot Work', title:'', unit:'PKS A', area:'', requester:'', contractor:'', supervisor:'',
  startDate:'2026-09-15', startTime:'08:00', endDate:'2026-09-15', endTime:'17:00', risk:'High',
  status:'Draft', jsaNo:'', description:'', controls:emptyControls
}

const tone = value => {
  if (['Active','Closed','Low','Approved'].includes(value)) return 'green'
  if (['Awaiting Approval','Medium','Suspended'].includes(value)) return 'orange'
  if (['High','Draft'].includes(value)) return 'blue'
  if (['Critical','Expired'].includes(value)) return 'red'
  return 'purple'
}
const fmt = value => value ? new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${value}T00:00:00`)) : '-'
function hasExpired(item){ if (['Closed','Draft','Awaiting Approval'].includes(item.status) || !item.endDate || !item.endTime) return false; return new Date(`${item.endDate}T${item.endTime}:00`) < new Date() }
function normalise(item){ return hasExpired(item) ? {...item,status:'Expired'} : item }
function readiness(item){ const mandatory=mandatoryByType[item.type]||[]; if(!mandatory.length)return{score:100,missing:[]}; const missing=mandatory.filter(key=>!item.controls?.[key]); return{score:Math.round(((mandatory.length-missing.length)/mandatory.length)*100),missing} }

export default function PermitToWork(){
  const [permits,setPermits] = useState(defaultPermits)
  const [search,setSearch] = useState('')
  const [filterCompany,setFilterCompany] = useState('All')
  const [filterStatus,setFilterStatus] = useState('All')
  const [filterType,setFilterType] = useState('All')
  const [filterUnit,setFilterUnit] = useState('All')
  const [modalOpen,setModalOpen] = useState(false)
  const [detail,setDetail] = useState(null)
  const [form,setForm] = useState(emptyForm)
  const [notice,setNotice] = useState('')

  useEffect(()=>{ try{ const saved=localStorage.getItem('sinshe-permits'); if(saved)setPermits(JSON.parse(saved).map(normalise)); else setPermits(defaultPermits.map(normalise)) }catch{setPermits(defaultPermits.map(normalise))} },[])
  useEffect(()=>{ try{localStorage.setItem('sinshe-permits',JSON.stringify(permits))}catch{} },[permits])

  const companyScoped=useMemo(()=>filterCompany==='All'?permits:permits.filter(p=>p.companyCode===filterCompany),[permits,filterCompany])
  const filtered=useMemo(()=>companyScoped.filter(p=>{
    const q=search.trim().toLowerCase(); const matchSearch=!q||[p.id,p.companyCode,p.title,p.type,p.unit,p.area,p.requester,p.contractor,p.supervisor,p.jsaNo].join(' ').toLowerCase().includes(q)
    return matchSearch&&(filterStatus==='All'||p.status===filterStatus)&&(filterType==='All'||p.type===filterType)&&(filterUnit==='All'||p.unit===filterUnit)
  }),[companyScoped,search,filterStatus,filterType,filterUnit])

  const active=companyScoped.filter(p=>p.status==='Active').length
  const awaiting=companyScoped.filter(p=>p.status==='Awaiting Approval').length
  const highRisk=companyScoped.filter(p=>['High','Critical'].includes(p.risk)&&!['Closed','Expired'].includes(p.status)).length
  const expired=companyScoped.filter(p=>p.status==='Expired'||hasExpired(p)).length
  const kanban=[
    {title:'Menunggu Approval',tone:'orange',items:companyScoped.filter(p=>p.status==='Awaiting Approval')},
    {title:'Aktif / Berjalan',tone:'green',items:companyScoped.filter(p=>p.status==='Active')},
    {title:'Selesai / Ditutup',tone:'blue',items:companyScoped.filter(p=>p.status==='Closed')}
  ]

  function updateForm(field,value){setForm(prev=>({...prev,[field]:value}))}
  function toggleControl(key){setForm(prev=>({...prev,controls:{...prev.controls,[key]:!prev.controls[key]}}))}
  function flash(message){setNotice(message);setTimeout(()=>setNotice(''),3000)}
  function savePermit(e){
    e.preventDefault()
    if(!form.companyCode||!form.title.trim()||!form.area.trim()||!form.requester.trim()||!form.supervisor.trim()||!form.description.trim()){flash('Pilih Company/PT dan lengkapi judul pekerjaan, area, requester, supervisor serta deskripsi pekerjaan.');return}
    if(new Date(`${form.endDate}T${form.endTime}:00`)<=new Date(`${form.startDate}T${form.startTime}:00`)){flash('Waktu selesai harus lebih akhir dari waktu mulai.');return}
    const seq=Math.max(312,...permits.map(p=>Number(p.id.split('-').pop())||0))+1
    const item={id:`PTW-2026-${seq}`,...form,approval:'Belum diajukan',createdAt:new Date().toISOString().slice(0,10)}
    setPermits(prev=>[item,...prev]); setFilterCompany(form.companyCode); setForm(emptyForm); setModalOpen(false); flash(`${item.id} berhasil dibuat untuk PT ${form.companyCode}.`)
  }
  function setStatus(id,next){
    const item=permits.find(p=>p.id===id); if(!item)return
    if(next==='Active'){const ready=readiness(item);if(ready.missing.length){flash(`Permit belum dapat diaktifkan. Kontrol wajib belum lengkap: ${ready.missing.map(k=>controlLabels[k]).join(', ')}.`);return}}
    setPermits(prev=>prev.map(p=>p.id===id?{...p,status:next,approval:next==='Awaiting Approval'?'Area Owner → HSE':next==='Approved'?'Approved':p.approval}:p)); setDetail(prev=>prev?.id===id?{...prev,status:next}:prev); flash(`${id} diperbarui menjadi ${next}.`)
  }
  function exportCSV(){
    const header=['PTW ID','Company/PT','Type','Work Title','Unit','Area','Requester','Contractor','Supervisor','Start','End','Risk','Status','JSA','Readiness']
    const rows=filtered.map(p=>[p.id,p.companyCode||'',p.type,p.title,p.unit,p.area,p.requester,p.contractor,p.supervisor,`${p.startDate} ${p.startTime}`,`${p.endDate} ${p.endTime}`,p.risk,p.status,p.jsaNo,`${readiness(p).score}%`])
    const csv=[header,...rows].map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n'); const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`SINSHE_PTW_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  return <Shell title="Permit to Work" subtitle="Izin kerja digital dengan kontrol bahaya, approval, validitas waktu dan audit trail.">
    {notice&&<div className={styles.notice}><CheckCircle2 size={18}/>{notice}</div>}
    <div className="stats-grid four">
      <StatCard label="Permit Aktif" value={active} hint={filterCompany==='All'?'seluruh PT':`PT ${filterCompany}`} tone="green" icon={<CheckCircle2/>}/><StatCard label="Menunggu Approval" value={awaiting} hint="memerlukan review" tone="orange" icon={<Clock3/>}/><StatCard label="High / Critical" value={highRisk} hint="pengawasan prioritas" tone="red" icon={<Flame/>}/><StatCard label="Expired" value={expired} hint="perlu review / closure" tone="purple" icon={<FileWarning/>}/>
    </div>

    <div className={styles.headerRow}><div><h2>Digital Permit Control</h2><p>Kelola izin kerja per Company/PT mulai draft, approval, aktivasi sampai penutupan.</p></div><div className={styles.buttons}><button className={styles.secondary} onClick={exportCSV}><Download size={17}/> Export CSV</button><button className={styles.primary} onClick={()=>setModalOpen(true)}><Plus size={18}/> Buat Permit</button></div></div>

    <div className="kanban">{kanban.map(col=><div className="kanban-col" key={col.title}><div className={`kanban-head k-${col.tone}`}>{col.title}<span>{col.items.length}</span></div><div className="kanban-body">{col.items.slice(0,4).map(p=>{const ready=readiness(p);return <button className={`${styles.kanbanButton} ptw-card`} key={p.id} onClick={()=>setDetail(p)}><div className="ptw-top"><b>{p.id}</b><Badge tone={tone(p.risk)}>{p.risk}</Badge></div><p>{p.type} — {p.title}</p><small>{p.companyCode||'-'} • {p.unit} • {p.area}</small><div className={styles.readinessMini}><span style={{width:`${ready.score}%`}}/></div></button>})}{!col.items.length&&<div className={styles.emptyKanban}>Tidak ada permit</div>}</div></div>)}</div>

    <Panel className="mt"><div className={styles.filters}>
      <label className={styles.search}><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari PTW, PT, pekerjaan, requester, JSA..."/></label>
      <label><select value={filterCompany} onChange={e=>setFilterCompany(e.target.value)}><option value="All">All Companies</option>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
      <label><Filter size={15}/><select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option>All</option>{statuses.map(v=><option key={v}>{v}</option>)}</select></label><label><select value={filterType} onChange={e=>setFilterType(e.target.value)}><option>All</option>{types.map(v=><option key={v}>{v}</option>)}</select></label><label><select value={filterUnit} onChange={e=>setFilterUnit(e.target.value)}><option>All</option>{units.map(v=><option key={v}>{v}</option>)}</select></label>
    </div><div className="table-wrap"><table><thead><tr><th>No PTW</th><th>PT</th><th>Pekerjaan</th><th>Unit / Area</th><th>Requester</th><th>Validitas</th><th>Risk</th><th>Readiness</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{filtered.map(p=>{const ready=readiness(p);return <tr key={p.id}><td><b>{p.id}</b><small className={styles.block}>{p.jsaNo||'JSA belum diisi'}</small></td><td><b>{p.companyCode||'-'}</b></td><td className={styles.workCell}><b>{p.type}</b><small>{p.title}</small></td><td><b>{p.unit}</b><small className={styles.block}>{p.area}</small></td><td>{p.requester}<small className={styles.block}>{p.contractor||'Internal'}</small></td><td>{fmt(p.startDate)}<small className={styles.block}>{p.startTime}–{p.endTime}</small></td><td><Badge tone={tone(p.risk)}>{p.risk}</Badge></td><td><div className={styles.readyCell}><div><span style={{width:`${ready.score}%`}}/></div><b>{ready.score}%</b></div></td><td><Badge tone={tone(p.status)}>{p.status}</Badge></td><td><div className={styles.rowActions}><button onClick={()=>setDetail(p)}><Eye size={14}/> Detail</button>{p.status==='Draft'&&<button onClick={()=>setStatus(p.id,'Awaiting Approval')}><FileCheck2 size={14}/> Submit</button>}{p.status==='Awaiting Approval'&&<button onClick={()=>setStatus(p.id,'Approved')}><ShieldCheck size={14}/> Approve</button>}{p.status==='Approved'&&<button onClick={()=>setStatus(p.id,'Active')}><PlayCircle size={14}/> Activate</button>}{p.status==='Active'&&<button onClick={()=>setStatus(p.id,'Closed')}><CheckCircle2 size={14}/> Close</button>}</div></td></tr>})}{!filtered.length&&<tr><td colSpan="10" className={styles.empty}>Tidak ada permit yang sesuai filter.</td></tr>}</tbody></table></div></Panel>

    <div className="benefit-row"><div><ClipboardSignature/><b>Approval Digital</b><span>Draft → approval → active → closed.</span></div><div><LockKeyhole/><b>Critical Control</b><span>Permit hanya aktif jika kontrol wajib lengkap.</span></div><div><ShieldCheck/><b>Audit Trail</b><span>Status dan penanggung jawab terdokumentasi.</span></div><div><Clock3/><b>Validity Control</b><span>Permit otomatis ditandai expired setelah waktu berakhir.</span></div></div>

    {modalOpen&&<div className={styles.backdrop} onMouseDown={e=>{if(e.target===e.currentTarget)setModalOpen(false)}}><div className={styles.modal}><div className={styles.modalHead}><div><span>SINSHE 2.0</span><h2>Buat Permit to Work</h2><p>Lengkapi Company/PT, pekerjaan, validitas dan critical control.</p></div><button onClick={()=>setModalOpen(false)}><X/></button></div><form onSubmit={savePermit}><div className={styles.formGrid}>
      <label>Company / PT<select value={form.companyCode} onChange={e=>updateForm('companyCode',e.target.value)}>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label><label>Jenis Permit<select value={form.type} onChange={e=>updateForm('type',e.target.value)}>{types.map(v=><option key={v}>{v}</option>)}</select></label><label>Risk Level<select value={form.risk} onChange={e=>updateForm('risk',e.target.value)}>{risks.map(v=><option key={v}>{v}</option>)}</select></label>
      <label className={styles.span2}>Judul Pekerjaan<input value={form.title} onChange={e=>updateForm('title',e.target.value)} placeholder="Contoh: Pengelasan support pipa"/></label><label>Unit<select value={form.unit} onChange={e=>updateForm('unit',e.target.value)}>{units.map(v=><option key={v}>{v}</option>)}</select></label><label>Area / Lokasi<input value={form.area} onChange={e=>updateForm('area',e.target.value)} placeholder="Boiler Area"/></label><label>Requester<input value={form.requester} onChange={e=>updateForm('requester',e.target.value)} placeholder="Nama pemohon"/></label><label>Supervisor / PIC<input value={form.supervisor} onChange={e=>updateForm('supervisor',e.target.value)} placeholder="Penanggung jawab"/></label><label>Contractor<input value={form.contractor} onChange={e=>updateForm('contractor',e.target.value)} placeholder="Internal / nama kontraktor"/></label><label>No. JSA<input value={form.jsaNo} onChange={e=>updateForm('jsaNo',e.target.value)} placeholder="JSA-..."/></label><label>Tanggal Mulai<input type="date" value={form.startDate} onChange={e=>updateForm('startDate',e.target.value)}/></label><label>Jam Mulai<input type="time" value={form.startTime} onChange={e=>updateForm('startTime',e.target.value)}/></label><label>Tanggal Selesai<input type="date" value={form.endDate} onChange={e=>updateForm('endDate',e.target.value)}/></label><label>Jam Selesai<input type="time" value={form.endTime} onChange={e=>updateForm('endTime',e.target.value)}/></label><label className={styles.span2}>Deskripsi Pekerjaan<textarea rows="3" value={form.description} onChange={e=>updateForm('description',e.target.value)} placeholder="Jelaskan scope pekerjaan..."/></label>
    </div><div className={styles.controlSection}><div className={styles.controlTitle}><b>Critical Control Verification</b><span>Wajib sesuai jenis permit</span></div><div className={styles.controlGrid}>{Object.entries(controlLabels).map(([key,label])=>{const mandatory=(mandatoryByType[form.type]||[]).includes(key);return <label key={key} className={form.controls[key]?styles.controlChecked:''}><input type="checkbox" checked={form.controls[key]} onChange={()=>toggleControl(key)}/><span>{label}{mandatory&&<em>Wajib</em>}</span></label>})}</div></div><div className={styles.modalFoot}><button type="button" className={styles.secondary} onClick={()=>setModalOpen(false)}>Batal</button><button type="submit" className={styles.primary}><Plus size={17}/> Simpan Draft</button></div></form></div></div>}

    {detail&&<div className={styles.backdrop} onMouseDown={e=>{if(e.target===e.currentTarget)setDetail(null)}}><div className={`${styles.modal} ${styles.detailModal}`}><div className={styles.modalHead}><div><span>{detail.id} • {detail.companyCode||'PT belum ditetapkan'}</span><h2>{detail.type}</h2><p>{detail.title}</p></div><button onClick={()=>setDetail(null)}><X/></button></div><div className={styles.detailGrid}><div><span>Company / PT</span><b>{detail.companyCode||'-'}</b></div><div><span>Status</span><Badge tone={tone(detail.status)}>{detail.status}</Badge></div><div><span>Risk</span><Badge tone={tone(detail.risk)}>{detail.risk}</Badge></div><div><span>Unit / Area</span><b>{detail.unit} • {detail.area}</b></div><div><span>Supervisor</span><b>{detail.supervisor}</b></div><div><span>Requester</span><b>{detail.requester}</b></div><div><span>Contractor</span><b>{detail.contractor||'Internal'}</b></div><div><span>Validitas</span><b>{fmt(detail.startDate)} {detail.startTime} – {detail.endTime}</b></div><div><span>Approval</span><b>{detail.approval}</b></div></div><div className={styles.descriptionBox}><b>Scope Pekerjaan</b><p>{detail.description}</p></div><div className={styles.detailControls}><div className={styles.controlTitle}><b>Critical Control</b><span>{readiness(detail).score}% ready</span></div>{Object.entries(controlLabels).map(([key,label])=><div key={key} className={detail.controls?.[key]?styles.ok:styles.missing}>{detail.controls?.[key]?<CheckCircle2 size={16}/>:<AlertTriangle size={16}/>}<span>{label}</span></div>)}</div><div className={styles.workflow}><b>Workflow</b><div><span className={styles.doneStep}>Draft</span><span className={['Awaiting Approval','Approved','Active','Suspended','Closed'].includes(detail.status)?styles.doneStep:''}>Approval</span><span className={['Approved','Active','Suspended','Closed'].includes(detail.status)?styles.doneStep:''}>Approved</span><span className={['Active','Suspended','Closed'].includes(detail.status)?styles.doneStep:''}>Active</span><span className={detail.status==='Closed'?styles.doneStep:''}>Closed</span></div></div><div className={styles.modalFoot}>{detail.status==='Draft'&&<button className={styles.primary} onClick={()=>setStatus(detail.id,'Awaiting Approval')}>Submit Approval</button>}{detail.status==='Awaiting Approval'&&<button className={styles.primary} onClick={()=>setStatus(detail.id,'Approved')}>Approve Permit</button>}{detail.status==='Approved'&&<button className={styles.primary} onClick={()=>setStatus(detail.id,'Active')}>Activate Permit</button>}{detail.status==='Active'&&<><button className={styles.secondary} onClick={()=>setStatus(detail.id,'Suspended')}><PauseCircle size={16}/> Suspend</button><button className={styles.primary} onClick={()=>setStatus(detail.id,'Closed')}>Close Permit</button></>}{detail.status==='Suspended'&&<button className={styles.primary} onClick={()=>setStatus(detail.id,'Active')}>Resume Permit</button>}</div></div></div>}
  </Shell>
}
