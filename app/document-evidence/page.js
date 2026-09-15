'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge, Panel, StatCard } from '../../components/Ui'
import {
  AlertTriangle, CheckCircle2, Clock3, Download, ExternalLink, FileArchive,
  FileCheck2, Plus, Search, UploadCloud, X
} from 'lucide-react'
import {
  dbSelect, dbUpsert, getStoredProfile, isSupabaseConfigured,
  storageSignedUrl, storageUpload
} from '../../lib/supabase-rest'
import { COMPANY_MASTER, DEFAULT_COMPANY_FILTERS, companyCodeOf, filteredCompanies } from '../../lib/company-master'
import styles from './document-evidence.module.css'

const STORAGE_KEY='sinshe-evidence-documents'
const BUCKET='sinshe-evidence'
const units=['Head Office','PKS A','PKS B','PKS C','Estate 1','Estate 2','Estate 3','Laboratorium']
const modules=['Audit Management','Asset Integrity','Regulatory Compliance','Corrective Action','Incident','Inspection & Observation','Permit to Work','Hazard & Risk','Digital JSA','Learning & Competency','Safety Briefing','Other']
const documentTypes=['Audit Report','BA / Berita Acara','Photo Evidence','Certificate','SIO','SILO','Riksa Uji','Training Certificate','Permit Attachment','Compliance Evidence','Legal Document','Other']
const statuses=['Active','Draft','Superseded','Archived']
const today=()=>new Date().toISOString().slice(0,10)
const emptyForm=()=>({companyCode:'ACP',module:'Audit Management',recordId:'',documentType:'Audit Report',title:'',unit:'PKS A',referenceNo:'',issuedDate:today(),validUntil:'',status:'Active',notes:''})

function safeRead(){try{const raw=localStorage.getItem(STORAGE_KEY);const rows=raw?JSON.parse(raw):[];return Array.isArray(rows)?rows:[]}catch{return[]}}
function safeWrite(rows){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(rows));window.dispatchEvent(new CustomEvent('sinshe-central-data',{detail:{key:STORAGE_KEY,count:rows.length}}))}catch{}}
function mergeById(local,central){const map=new Map();(local||[]).forEach(r=>r?.id&&map.set(r.id,r));(central||[]).forEach(r=>r?.id&&map.set(r.id,r));return [...map.values()]}
function fmt(value){return value?new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${String(value).slice(0,10)}T00:00:00`)):'-'}
function daysTo(value){if(!value)return null;const now=new Date();now.setHours(0,0,0,0);const d=new Date(`${String(value).slice(0,10)}T00:00:00`);return Math.ceil((d-now)/86400000)}
function expiryState(row){if(['Archived','Superseded'].includes(row.status))return row.status;const d=daysTo(row.validUntil);if(d===null)return row.status||'Active';if(d<0)return'Expired';if(d<=30)return'Due Soon';return row.status||'Active'}
function stateTone(value){return value==='Expired'?'red':value==='Due Soon'?'orange':value==='Active'?'green':value==='Draft'?'blue':'purple'}
function sizeText(value){const n=Number(value||0);if(!n)return'-';if(n>=1048576)return`${(n/1048576).toFixed(1)} MB`;return`${Math.max(1,Math.round(n/1024))} KB`}
function sanitize(value){return String(value||'file').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-')}
function fromDb(r){return{id:r.id,companyCode:r.company_code||'',module:r.module||'',recordId:r.record_id||'',documentType:r.document_type||'',title:r.title||'',unit:r.unit||'',referenceNo:r.reference_no||'',issuedDate:r.issued_date||'',validUntil:r.valid_until||'',status:r.status||'Active',fileName:r.file_name||'',storagePath:r.storage_path||'',mimeType:r.mime_type||'',fileSize:Number(r.file_size||0),notes:r.notes||'',createdAt:r.created_at||''}}
function toDb(r){return{id:r.id,company_code:r.companyCode,module:r.module,record_id:r.recordId||null,document_type:r.documentType,title:r.title,unit:r.unit,reference_no:r.referenceNo||null,issued_date:r.issuedDate||null,valid_until:r.validUntil||null,status:r.status,file_name:r.fileName||null,storage_path:r.storagePath||null,mime_type:r.mimeType||null,file_size:r.fileSize||null,notes:r.notes||null}}

export default function DocumentEvidence(){
  const [items,setItems]=useState([])
  const [filters,setFilters]=useState(DEFAULT_COMPANY_FILTERS)
  const [search,setSearch]=useState('')
  const [moduleFilter,setModuleFilter]=useState('All')
  const [stateFilter,setStateFilter]=useState('All')
  const [modal,setModal]=useState(false)
  const [form,setForm]=useState(()=>emptyForm())
  const [file,setFile]=useState(null)
  const [saving,setSaving]=useState(false)
  const [notice,setNotice]=useState('')
  const [source,setSource]=useState('Local cache')
  const profile=getStoredProfile()
  const canManage=!profile||profile.role!=='Viewer'

  useEffect(()=>{
    let active=true
    async function load(){
      const local=safeRead();if(active)setItems(local)
      if(!isSupabaseConfigured())return
      try{
        const central=await dbSelect('evidence_documents','select=*&order=updated_at.desc')
        const merged=mergeById(local,(central||[]).map(fromDb))
        if(active){setItems(merged);safeWrite(merged);setSource('Supabase + private evidence storage')}
      }catch{if(active)setSource('Offline / local metadata cache')}
    }
    load();return()=>{active=false}
  },[])

  const companies=useMemo(()=>filteredCompanies(filters),[filters])
  const allowed=useMemo(()=>new Set(companies.map(c=>c.code)),[companies])
  const specific=filters.company!=='All'||filters.region!=='All'||filters.province!=='All'||filters.pic!=='All'
  const scoped=useMemo(()=>items.filter(item=>{const code=companyCodeOf(item);return code?allowed.has(code):!specific}),[items,allowed,specific])
  const rows=useMemo(()=>scoped.filter(item=>{
    const q=search.trim().toLowerCase();const state=expiryState(item)
    const text=[item.id,item.companyCode,item.module,item.recordId,item.documentType,item.title,item.referenceNo,item.unit,item.fileName].join(' ').toLowerCase()
    return(!q||text.includes(q))&&(moduleFilter==='All'||item.module===moduleFilter)&&(stateFilter==='All'||state===stateFilter)
  }),[scoped,search,moduleFilter,stateFilter])
  const expired=scoped.filter(r=>expiryState(r)==='Expired').length
  const dueSoon=scoped.filter(r=>expiryState(r)==='Due Soon').length
  const files=scoped.filter(r=>r.storagePath).length

  function flash(text){setNotice(text);setTimeout(()=>setNotice(''),3600)}
  function update(field,value){setForm(prev=>({...prev,[field]:value}))}
  function openCreate(){if(!canManage){flash('Role Viewer hanya dapat melihat dokumen.');return};setForm({...emptyForm(),companyCode:filters.company!=='All'?filters.company:(companies[0]?.code||'ACP')});setFile(null);setModal(true)}

  async function save(e){
    e.preventDefault();if(!canManage)return
    if(!form.companyCode||!form.title.trim()||!form.module||!form.documentType||!form.unit){flash('Lengkapi PT, judul, module, document type dan unit.');return}
    if(file&&file.size>15*1024*1024){flash('Ukuran file maksimum 15 MB.');return}
    setSaving(true)
    const id=`DOC-${Date.now().toString().slice(-10)}`
    let storagePath='',fileName='',mimeType='',fileSize=0
    try{
      if(file){
        if(!isSupabaseConfigured())throw new Error('Upload file memerlukan koneksi Supabase.')
        fileName=file.name;mimeType=file.type||'application/octet-stream';fileSize=file.size
        const moduleSlug=sanitize(form.module.toLowerCase());const recordSlug=sanitize(form.recordId||'general')
        storagePath=`${sanitize(form.companyCode)}/${moduleSlug}/${recordSlug}/${id}-${sanitize(file.name)}`
        await storageUpload(BUCKET,storagePath,file)
      }
      const item={...form,id,fileName,storagePath,mimeType,fileSize,createdAt:new Date().toISOString()}
      const next=[item,...items];setItems(next);safeWrite(next)
      if(isSupabaseConfigured())await dbUpsert('evidence_documents',[toDb(item)],'id')
      setModal(false);setFile(null);setSource('Supabase + private evidence storage');flash(`${id} berhasil disimpan${fileName?' beserta file evidence.':'.'}`)
    }catch(err){flash(`Gagal menyimpan dokumen: ${err.message}`)}finally{setSaving(false)}
  }

  async function openFile(item){
    if(!item.storagePath){flash('Record ini belum memiliki file tersimpan.');return}
    const popup=window.open('about:blank','_blank')
    try{
      const url=await storageSignedUrl(BUCKET,item.storagePath,3600)
      if(popup)popup.location.href=url;else window.location.href=url
    }catch(err){if(popup)popup.close();flash(`Gagal membuka file: ${err.message}`)}
  }

  function exportCSV(){
    const header=['Document ID','Company/PT','Module','Record ID','Document Type','Title','Unit','Reference No','Issued Date','Valid Until','Expiry State','Status','File Name','File Size','Notes']
    const data=rows.map(r=>[r.id,r.companyCode,r.module,r.recordId,r.documentType,r.title,r.unit,r.referenceNo,r.issuedDate,r.validUntil,expiryState(r),r.status,r.fileName,r.fileSize,r.notes])
    const csv=[header,...data].map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n')
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`SINSHE_Document_Evidence_${today()}.csv`;a.click();URL.revokeObjectURL(url)
  }

  return <Shell title="Document & Evidence Management" subtitle="Private evidence repository untuk sertifikat, BA, foto, laporan audit, SIO/SILO, Riksa Uji dan bukti closure per Company/PT.">
    <CompanyScopeBar filters={filters} onChange={setFilters} onReset={()=>setFilters(DEFAULT_COMPANY_FILTERS)}/>
    {notice&&<div className={styles.notice}><CheckCircle2 size={18}/>{notice}</div>}

    <div className="stats-grid four">
      <StatCard label="Document Register" value={scoped.length} hint={source} tone="blue" icon={<FileArchive/>}/>
      <StatCard label="File Evidence" value={files} hint="private Supabase Storage" tone="green" icon={<FileCheck2/>}/>
      <StatCard label="Due Soon" value={dueSoon} hint="validity ≤30 hari" tone="orange" icon={<Clock3/>}/>
      <StatCard label="Expired" value={expired} hint="perlu renewal / supersede" tone="red" icon={<AlertTriangle/>}/>
    </div>

    <div className={styles.toolbar}><div><h2>Evidence Register</h2><p>Metadata + file evidence tersimpan terpusat dan dapat ditautkan ke record module SINSHE.</p></div><div className={styles.actions}><button className={styles.secondary} onClick={exportCSV}><Download size={17}/> Export CSV</button>{canManage&&<button className={styles.primary} onClick={openCreate}><Plus size={18}/> Upload Evidence</button>}</div></div>

    <Panel>
      <div className={styles.filters}><label className={styles.search}><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari document, record ID, PT, reference, file..."/></label><select value={moduleFilter} onChange={e=>setModuleFilter(e.target.value)}><option>All</option>{modules.map(v=><option key={v}>{v}</option>)}</select><select value={stateFilter} onChange={e=>setStateFilter(e.target.value)}><option>All</option><option>Active</option><option>Due Soon</option><option>Expired</option><option>Draft</option><option>Superseded</option><option>Archived</option></select></div>
      <div className="table-wrap"><table><thead><tr><th>Document</th><th>PT</th><th>Module / Record</th><th>Type / Reference</th><th>Validity</th><th>File</th><th>Status</th><th></th></tr></thead><tbody>
        {rows.map(r=>{const state=expiryState(r);return <tr key={r.id}><td><b>{r.title}</b><small className={styles.block}>{r.id} • {r.unit}</small></td><td><b>{r.companyCode||'-'}</b></td><td>{r.module}<small className={styles.block}>{r.recordId||'General evidence'}</small></td><td>{r.documentType}<small className={styles.block}>{r.referenceNo||'-'}</small></td><td>{fmt(r.validUntil)}<small className={styles.block}>{r.validUntil?(daysTo(r.validUntil)<0?`${Math.abs(daysTo(r.validUntil))} hari overdue`:`${daysTo(r.validUntil)} hari lagi`):'No expiry'}</small></td><td>{r.fileName?<><b>{r.fileName}</b><small className={styles.block}>{sizeText(r.fileSize)}</small></>:'Metadata only'}</td><td><Badge tone={stateTone(state)}>{state}</Badge></td><td>{r.storagePath&&<button className={styles.openBtn} onClick={()=>openFile(r)}><ExternalLink size={14}/> Open</button>}</td></tr>})}
        {!rows.length&&<tr><td colSpan="8" className={styles.empty}>Belum ada document/evidence sesuai filter.</td></tr>}
      </tbody></table></div>
    </Panel>

    <div className={styles.info}><UploadCloud size={20}/><div><b>Private evidence storage</b><span>File disimpan pada bucket private. Akses file menggunakan signed URL sementara; link tidak dibuat public permanen. Maksimum file 15 MB.</span></div></div>

    {modal&&<div className={styles.backdrop} onMouseDown={e=>{if(e.target===e.currentTarget&&!saving)setModal(false)}}><form className={styles.modal} onSubmit={save}><div className={styles.modalHeader}><div><span>DOCUMENT CONTROL</span><h2>Upload Evidence</h2><p>Hubungkan evidence ke Company/PT dan record module terkait.</p></div><button type="button" onClick={()=>!saving&&setModal(false)}><X size={19}/></button></div><div className={styles.formGrid}>
      <Field label="Company / PT"><select value={form.companyCode} onChange={e=>update('companyCode',e.target.value)}>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></Field>
      <Field label="Unit"><select value={form.unit} onChange={e=>update('unit',e.target.value)}>{units.map(v=><option key={v}>{v}</option>)}</select></Field>
      <Field label="Module"><select value={form.module} onChange={e=>update('module',e.target.value)}>{modules.map(v=><option key={v}>{v}</option>)}</select></Field>
      <Field label="Record ID"><input value={form.recordId} onChange={e=>update('recordId',e.target.value)} placeholder="Contoh: FND-AUD-2026-0001-001"/></Field>
      <Field label="Document Type"><select value={form.documentType} onChange={e=>update('documentType',e.target.value)}>{documentTypes.map(v=><option key={v}>{v}</option>)}</select></Field>
      <Field label="Reference No"><input value={form.referenceNo} onChange={e=>update('referenceNo',e.target.value)} placeholder="Nomor sertifikat / BA / dokumen"/></Field>
      <Field label="Document Title" full><input value={form.title} onChange={e=>update('title',e.target.value)} placeholder="Judul evidence / dokumen"/></Field>
      <Field label="Issued Date"><input type="date" value={form.issuedDate} onChange={e=>update('issuedDate',e.target.value)}/></Field>
      <Field label="Valid Until"><input type="date" value={form.validUntil} onChange={e=>update('validUntil',e.target.value)}/></Field>
      <Field label="Status"><select value={form.status} onChange={e=>update('status',e.target.value)}>{statuses.map(v=><option key={v}>{v}</option>)}</select></Field>
      <Field label="Evidence File"><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx" onChange={e=>setFile(e.target.files?.[0]||null)}/></Field>
      <Field label="Notes" full><textarea value={form.notes} onChange={e=>update('notes',e.target.value)} rows="3" placeholder="Keterangan tambahan, sumber dokumen, approval, dll."/></Field>
    </div><div className={styles.fileHint}><UploadCloud size={18}/><span>{file?`${file.name} • ${sizeText(file.size)}`:'PDF/JPG/PNG/WEBP/DOCX/XLSX • maksimum 15 MB'}</span></div><div className={styles.modalActions}><button type="button" className={styles.secondary} onClick={()=>setModal(false)} disabled={saving}>Batal</button><button type="submit" className={styles.primary} disabled={saving}><UploadCloud size={16}/>{saving?' Uploading…':' Simpan Evidence'}</button></div></form></div>}
  </Shell>
}

function Field({label,full=false,children}){return <label className={full?styles.full:''}><span>{label}</span>{children}</label>}
