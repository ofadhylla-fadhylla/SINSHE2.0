'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge, Panel, Progress, StatCard } from '../../components/Ui'
import { AlertTriangle, CheckCircle2, Clock3, Download, GraduationCap, Plus, Search, X } from 'lucide-react'
import { dbSelect, dbUpsert, isSupabaseConfigured } from '../../lib/supabase-rest'
import { COMPANY_MASTER, DEFAULT_COMPANY_FILTERS, companyCodeOf, filteredCompanies } from '../../lib/company-master'

const STORAGE_KEY='sinshe-learning-records'
const categories=['Safety Induction','Technical Training','License / Certification','Emergency Response','Environmental','Leadership','Other']
const units=['Head Office','PKS A','PKS B','PKS C','Estate 1','Estate 2','Estate 3','Laboratorium']
const emptyForm={companyCode:'ACP',employeeName:'',employeeId:'',unit:'PKS A',trainingName:'',category:'Safety Induction',trainingDate:'',validUntil:'',competency:'',provider:'',certificateNo:'',mandatory:true}

function readLocal(){try{const raw=localStorage.getItem(STORAGE_KEY);return raw?JSON.parse(raw):[]}catch{return[]}}
function writeLocal(rows){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(rows));window.dispatchEvent(new CustomEvent('sinshe-central-data',{detail:{key:STORAGE_KEY,count:rows.length}}))}catch{}}
function daysTo(value){if(!value)return null;const t=new Date();t.setHours(0,0,0,0);const d=new Date(`${value}T00:00:00`);return Math.ceil((d-t)/86400000)}
function derivedStatus(row){const d=daysTo(row.validUntil||row.valid_until);if(d===null)return row.status||'Valid';if(d<0)return 'Expired';if(d<=30)return 'Due Soon';return 'Valid'}
function tone(status){return status==='Valid'?'green':status==='Due Soon'?'orange':'red'}
function fmt(value){return value?new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${value}T00:00:00`)):'-'}
function fromDb(r){return{id:r.id,companyCode:r.company_code||'',employeeName:r.employee_name||'',employeeId:r.employee_id||'',unit:r.unit||'',trainingName:r.training_name||'',category:r.category||'',trainingDate:r.training_date||'',validUntil:r.valid_until||'',status:r.status||'Valid',competency:r.competency||'',provider:r.provider||'',certificateNo:r.certificate_no||'',mandatory:r.mandatory!==false}}
function toDb(r){return{id:r.id,company_code:r.companyCode,employee_name:r.employeeName,employee_id:r.employeeId||null,unit:r.unit,training_name:r.trainingName,category:r.category,training_date:r.trainingDate||null,valid_until:r.validUntil||null,status:derivedStatus(r),competency:r.competency||null,provider:r.provider||null,certificate_no:r.certificateNo||null,mandatory:r.mandatory!==false}}

export default function LearningCompetency(){
  const [items,setItems]=useState([])
  const [filters,setFilters]=useState(DEFAULT_COMPANY_FILTERS)
  const [search,setSearch]=useState('')
  const [statusFilter,setStatusFilter]=useState('All')
  const [categoryFilter,setCategoryFilter]=useState('All')
  const [modal,setModal]=useState(false)
  const [form,setForm]=useState(emptyForm)
  const [notice,setNotice]=useState('')

  useEffect(()=>{
    let active=true
    async function load(){
      let rows=[]
      if(isSupabaseConfigured()){
        try{rows=(await dbSelect('learning_records','select=*&order=updated_at.desc')).map(fromDb)}catch{rows=[]}
      }
      if(!rows.length) rows=readLocal()
      if(active){setItems(Array.isArray(rows)?rows:[]);writeLocal(Array.isArray(rows)?rows:[])}
    }
    load();return()=>{active=false}
  },[])

  const companies=useMemo(()=>filteredCompanies(filters),[filters])
  const allowed=new Set(companies.map(c=>c.code))
  const specific=filters.company!=='All'||filters.region!=='All'||filters.province!=='All'||filters.pic!=='All'
  const filtered=useMemo(()=>items.filter(row=>{
    const code=companyCodeOf(row)
    const companyMatch=!code?!specific:allowed.has(code)
    const q=search.trim().toLowerCase()
    const searchMatch=!q||[row.id,row.employeeName,row.employeeId,row.trainingName,row.category,row.unit,row.provider,row.certificateNo].join(' ').toLowerCase().includes(q)
    const status=derivedStatus(row)
    return companyMatch&&searchMatch&&(statusFilter==='All'||status===statusFilter)&&(categoryFilter==='All'||row.category===categoryFilter)
  }),[items,filters,search,statusFilter,categoryFilter])

  const valid=filtered.filter(r=>derivedStatus(r)==='Valid').length
  const dueSoon=filtered.filter(r=>derivedStatus(r)==='Due Soon').length
  const expired=filtered.filter(r=>derivedStatus(r)==='Expired').length
  const compliance=filtered.length?Math.round(valid/filtered.length*100):0

  function flash(text){setNotice(text);setTimeout(()=>setNotice(''),3000)}
  function update(field,value){setForm(prev=>({...prev,[field]:value}))}
  async function save(e){
    e.preventDefault()
    if(!form.companyCode||!form.employeeName.trim()||!form.trainingName.trim()||!form.unit){flash('Lengkapi PT, nama pekerja, training dan unit.');return}
    const seq=Math.max(0,...items.map(i=>Number(String(i.id||'').split('-').pop())||0))+1
    const item={id:`TRN-${String(seq).padStart(5,'0')}`,...form,status:'Valid'}
    const next=[item,...items];setItems(next);writeLocal(next)
    if(isSupabaseConfigured()){try{await dbUpsert('learning_records',[toDb(item)],'id')}catch(err){flash(`Tersimpan lokal, sync Supabase gagal: ${err.message}`);return}}
    setForm({...emptyForm,companyCode:filters.company!=='All'?filters.company:'ACP'});setModal(false);flash(`${item.id} berhasil ditambahkan.`)
  }
  function exportCSV(){
    const header=['ID','Company/PT','Employee','Employee ID','Unit','Training','Category','Training Date','Valid Until','Status','Competency','Provider','Certificate No','Mandatory']
    const rows=filtered.map(r=>[r.id,r.companyCode,r.employeeName,r.employeeId,r.unit,r.trainingName,r.category,r.trainingDate,r.validUntil,derivedStatus(r),r.competency,r.provider,r.certificateNo,r.mandatory?'Yes':'No'])
    const csv=[header,...rows].map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n')
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`SINSHE_Learning_Competency_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url)
  }

  return <Shell title="Learning & Competency" subtitle="Training, sertifikasi, kompetensi dan lisensi pekerja untuk memastikan kesiapan personel.">
    <CompanyScopeBar filters={filters} onChange={setFilters} onReset={()=>setFilters(DEFAULT_COMPANY_FILTERS)}/>
    {notice&&<div style={{marginBottom:12,padding:'10px 12px',borderRadius:10,background:'#f0f8f3',border:'1px solid #d5e9da',color:'#176b34',fontSize:12,fontWeight:800}}>{notice}</div>}

    <div className="stats-grid four">
      <StatCard label="Training Compliance" value={`${compliance}%`} hint={`${valid} valid dari ${filtered.length}`} tone="green" icon={<GraduationCap/>}/>
      <StatCard label="Valid" value={valid} hint="kompetensi aktif" tone="green" icon={<CheckCircle2/>}/>
      <StatCard label="Due Soon" value={dueSoon} hint="≤30 hari" tone="orange" icon={<Clock3/>}/>
      <StatCard label="Expired" value={expired} hint="perlu renewal" tone="red" icon={<AlertTriangle/>}/>
    </div>

    <Panel title="Learning & Competency Register" action={`${filtered.length} record`} className="mt">
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr auto auto',gap:10,alignItems:'center',marginBottom:14}}>
        <label style={{display:'flex',alignItems:'center',gap:8,border:'1px solid #dfe5e7',borderRadius:10,padding:'9px 11px',background:'#fff'}}><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari pekerja, training, sertifikat..." style={{border:0,outline:0,width:'100%',fontSize:12}}/></label>
        <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} style={{padding:'10px',border:'1px solid #dfe5e7',borderRadius:10}}><option>All</option>{categories.map(v=><option key={v}>{v}</option>)}</select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{padding:'10px',border:'1px solid #dfe5e7',borderRadius:10}}><option>All</option><option>Valid</option><option>Due Soon</option><option>Expired</option></select>
        <button onClick={exportCSV} style={{padding:'10px 12px',border:'1px solid #dfe5e7',borderRadius:10,background:'#fff',fontWeight:800,cursor:'pointer'}}><Download size={15} style={{verticalAlign:'middle',marginRight:6}}/>CSV</button>
        <button onClick={()=>setModal(true)} style={{padding:'10px 13px',border:0,borderRadius:10,background:'#0d6b3d',color:'#fff',fontWeight:850,cursor:'pointer'}}><Plus size={16} style={{verticalAlign:'middle',marginRight:6}}/>Tambah</button>
      </div>
      <div className="table-wrap"><table><thead><tr><th>ID</th><th>PT</th><th>Pekerja</th><th>Training / Kompetensi</th><th>Unit</th><th>Training Date</th><th>Valid Until</th><th>Status</th></tr></thead><tbody>
        {filtered.map(r=><tr key={r.id}><td><b>{r.id}</b></td><td>{r.companyCode||'-'}</td><td><b>{r.employeeName}</b><br/><small>{r.employeeId||'-'}</small></td><td>{r.trainingName}<br/><small>{r.category}</small></td><td>{r.unit}</td><td>{fmt(r.trainingDate)}</td><td>{fmt(r.validUntil)}</td><td><Badge tone={tone(derivedStatus(r))}>{derivedStatus(r)}</Badge></td></tr>)}
        {!filtered.length&&<tr><td colSpan="8" style={{padding:24,textAlign:'center',color:'#7c858e'}}>Belum ada data training pada filter ini. Gunakan tombol Tambah.</td></tr>}
      </tbody></table></div>
      <div style={{marginTop:14}}><Progress value={compliance} tone={compliance>=90?'green':'orange'}/></div>
    </Panel>

    {modal&&<div style={{position:'fixed',inset:0,background:'rgba(15,25,22,.52)',zIndex:1000,display:'grid',placeItems:'center',padding:20}} onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}>
      <form onSubmit={save} style={{width:'min(780px,96vw)',maxHeight:'90vh',overflow:'auto',background:'#fff',borderRadius:16,padding:20,boxShadow:'0 24px 70px rgba(0,0,0,.25)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}><div><h2 style={{margin:0}}>Tambah Training Record</h2><p style={{margin:'4px 0 0',color:'#7b858f',fontSize:12}}>Data akan masuk ke Learning & Competency Register dan Executive Dashboard.</p></div><button type="button" onClick={()=>setModal(false)} style={{border:0,background:'#f3f5f5',borderRadius:10,padding:8,cursor:'pointer'}}><X size={18}/></button></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12}}>
          <Field label="Company / PT"><select value={form.companyCode} onChange={e=>update('companyCode',e.target.value)}>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></Field>
          <Field label="Unit"><select value={form.unit} onChange={e=>update('unit',e.target.value)}>{units.map(v=><option key={v}>{v}</option>)}</select></Field>
          <Field label="Nama Pekerja"><input value={form.employeeName} onChange={e=>update('employeeName',e.target.value)}/></Field>
          <Field label="Employee ID"><input value={form.employeeId} onChange={e=>update('employeeId',e.target.value)}/></Field>
          <Field label="Training / Certification"><input value={form.trainingName} onChange={e=>update('trainingName',e.target.value)}/></Field>
          <Field label="Category"><select value={form.category} onChange={e=>update('category',e.target.value)}>{categories.map(v=><option key={v}>{v}</option>)}</select></Field>
          <Field label="Training Date"><input type="date" value={form.trainingDate} onChange={e=>update('trainingDate',e.target.value)}/></Field>
          <Field label="Valid Until"><input type="date" value={form.validUntil} onChange={e=>update('validUntil',e.target.value)}/></Field>
          <Field label="Competency"><input value={form.competency} onChange={e=>update('competency',e.target.value)} placeholder="Contoh: Fire Fighting Level 1"/></Field>
          <Field label="Provider"><input value={form.provider} onChange={e=>update('provider',e.target.value)}/></Field>
          <Field label="Certificate No"><input value={form.certificateNo} onChange={e=>update('certificateNo',e.target.value)}/></Field>
          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:12,fontWeight:800}}><input type="checkbox" checked={form.mandatory} onChange={e=>update('mandatory',e.target.checked)}/> Mandatory training</label>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:18}}><button type="button" onClick={()=>setModal(false)} style={{padding:'10px 14px',border:'1px solid #dfe5e7',borderRadius:10,background:'#fff',fontWeight:800}}>Batal</button><button type="submit" style={{padding:'10px 15px',border:0,borderRadius:10,background:'#0d6b3d',color:'#fff',fontWeight:850}}>Simpan Record</button></div>
      </form>
    </div>}
  </Shell>
}

function Field({label,children}){return <label style={{display:'grid',gap:5,fontSize:11,fontWeight:850,color:'#56616b'}}><span>{label}</span><div style={{display:'grid'}}>{children}</div><style jsx>{`input,select{width:100%;border:1px solid #dfe5e7;border-radius:9px;padding:10px 11px;font-size:12px;outline:none;background:#fff}`}</style></label>}
