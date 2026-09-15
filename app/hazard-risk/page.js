'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge, Panel, Progress, StatCard } from '../../components/Ui'
import {
  AlertTriangle, CheckCircle2, ClipboardList, Download, Edit3, Filter,
  Layers, Plus, Search, ShieldAlert, Target, X
} from 'lucide-react'
import { dbSelect, dbUpsert, isSupabaseConfigured } from '../../lib/supabase-rest'
import { COMPANY_MASTER, DEFAULT_COMPANY_FILTERS, companyCodeOf, filteredCompanies } from '../../lib/company-master'
import styles from './hazard-risk.module.css'

const STORAGE_KEY = 'sinshe-hazards'
const categories = ['Kebakaran','Alat Berat','Bahan Kimia','Kelistrikan','Confined Space','Mekanik','Ergonomi','Fisik','Biologi','Lingkungan','Lainnya']
const units = ['Head Office','PKS A','PKS B','PKS C','Estate 1','Estate 2','Estate 3','Laboratorium']
const assessmentTypes = ['HIRA','JSA','Risk Assessment']
const controlTypes = ['Eliminasi','Substitusi','Engineering','Administratif','APD']
const statuses = ['Open','Controlled','Monitoring','Closed']

const emptyForm = {
  companyCode:'ACP', assessmentType:'HIRA', jsaNo:'', activity:'', title:'', category:'Kebakaran',
  unit:'PKS A', location:'', consequence:'', likelihood:1, severity:1, existingControls:'',
  controlType:'Administratif', additionalControls:'', residualLikelihood:1, residualSeverity:1,
  owner:'', status:'Open', dueDate:'', reviewDate:'', notes:''
}

function readLocal(){ try { const raw=localStorage.getItem(STORAGE_KEY); return raw?JSON.parse(raw):[] } catch { return [] } }
function writeLocal(rows){ try { localStorage.setItem(STORAGE_KEY,JSON.stringify(rows)); window.dispatchEvent(new CustomEvent('sinshe-central-data',{detail:{key:STORAGE_KEY,count:rows.length}})) } catch {} }
function riskMeta(likelihood,severity){
  const score=Number(likelihood||0)*Number(severity||0)
  if(score>=15) return {score,label:'Extreme',tone:'red'}
  if(score>=9) return {score,label:'High',tone:'orange'}
  if(score>=4) return {score,label:'Medium',tone:'blue'}
  return {score,label:'Low',tone:'green'}
}
function matrixTone(score){ return score>=15?'h-crit':score>=9?'h-high':score>=4?'h-med':'h-low' }
function isoDate(value){ if(!value)return ''; const text=String(value); return text.includes('T')?text.slice(0,10):text }
function fmt(value){ return value?new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${isoDate(value)}T00:00:00`)):'-' }
function daysTo(value){ if(!value)return null; const t=new Date();t.setHours(0,0,0,0); const d=new Date(`${isoDate(value)}T00:00:00`); return Math.ceil((d-t)/86400000) }
function statusTone(status){ return status==='Closed'||status==='Controlled'?'green':status==='Monitoring'?'blue':'orange' }
function fromDb(r){
  return {
    id:r.id, companyCode:r.company_code||'', assessmentType:r.assessment_type||'HIRA', jsaNo:r.jsa_no||'',
    activity:r.activity||'', title:r.title||'', category:r.hazard_category||'', unit:r.unit||'', location:r.location||'',
    consequence:r.consequence||'', likelihood:Number(r.likelihood||1), severity:Number(r.severity||1),
    existingControls:r.controls||'', controlType:r.control_type||'Administratif', additionalControls:r.additional_controls||'',
    residualLikelihood:Number(r.residual_likelihood||r.likelihood||1), residualSeverity:Number(r.residual_severity||r.severity||1),
    owner:r.owner||'', status:r.status||'Open', dueDate:isoDate(r.due_date), reviewDate:isoDate(r.review_date), notes:r.notes||''
  }
}
function toDb(r){
  const initial=riskMeta(r.likelihood,r.severity)
  const residual=riskMeta(r.residualLikelihood,r.residualSeverity)
  return {
    id:r.id, company_code:r.companyCode, title:r.title, hazard_category:r.category, unit:r.unit, location:r.location||null,
    likelihood:Number(r.likelihood), severity:Number(r.severity), risk_level:initial.label, controls:r.existingControls||null,
    owner:r.owner||null, status:r.status, review_date:r.reviewDate||null, activity:r.activity||null, consequence:r.consequence||null,
    jsa_no:r.jsaNo||null, assessment_type:r.assessmentType, residual_likelihood:Number(r.residualLikelihood),
    residual_severity:Number(r.residualSeverity), residual_risk_level:residual.label, control_type:r.controlType||null,
    additional_controls:r.additionalControls||null, due_date:r.dueDate||null, notes:r.notes||null
  }
}

export default function HazardRisk(){
  const [items,setItems]=useState([])
  const [filters,setFilters]=useState(DEFAULT_COMPANY_FILTERS)
  const [search,setSearch]=useState('')
  const [levelFilter,setLevelFilter]=useState('All')
  const [categoryFilter,setCategoryFilter]=useState('All')
  const [statusFilter,setStatusFilter]=useState('All')
  const [selectedId,setSelectedId]=useState('')
  const [modalOpen,setModalOpen]=useState(false)
  const [editingId,setEditingId]=useState('')
  const [form,setForm]=useState(emptyForm)
  const [notice,setNotice]=useState('')
  const [source,setSource]=useState('local')

  useEffect(()=>{
    let active=true
    async function load(){
      if(isSupabaseConfigured()){
        try{
          const rows=await dbSelect('hazards','select=*&order=created_at.desc')
          if(active&&Array.isArray(rows)&&rows.length){
            const mapped=rows.map(fromDb); setItems(mapped); writeLocal(mapped); setSelectedId(mapped[0]?.id||''); setSource('central'); return
          }
        }catch{}
      }
      const local=readLocal(); if(active){setItems(local);setSelectedId(local[0]?.id||'');setSource(local.length?'local':'empty')}
    }
    load(); return()=>{active=false}
  },[])

  const scopedCompanies=useMemo(()=>filteredCompanies(filters),[filters])
  const allowedCodes=useMemo(()=>new Set(scopedCompanies.map(c=>c.code)),[scopedCompanies])
  const scopedItems=useMemo(()=>items.filter(item=>{
    const code=companyCodeOf(item)
    const specific=filters.company!=='All'||filters.region!=='All'||filters.province!=='All'||filters.pic!=='All'
    return code?allowedCodes.has(code):!specific
  }),[items,allowedCodes,filters])

  const rows=useMemo(()=>scopedItems.filter(item=>{
    const q=search.trim().toLowerCase()
    const initial=riskMeta(item.likelihood,item.severity)
    const text=[item.id,item.companyCode,item.title,item.activity,item.category,item.unit,item.location,item.owner,item.jsaNo,item.assessmentType].join(' ').toLowerCase()
    return (!q||text.includes(q))&&(levelFilter==='All'||initial.label===levelFilter)&&(categoryFilter==='All'||item.category===categoryFilter)&&(statusFilter==='All'||item.status===statusFilter)
  }),[scopedItems,search,levelFilter,categoryFilter,statusFilter])

  const selected=items.find(x=>x.id===selectedId)||rows[0]||null
  const highCount=scopedItems.filter(x=>['Extreme','High'].includes(riskMeta(x.likelihood,x.severity).label)&&x.status!=='Closed').length
  const activeAssessments=scopedItems.filter(x=>x.status!=='Closed').length
  const mitigated=scopedItems.filter(x=>['Controlled','Closed'].includes(x.status)).length
  const mitigationRate=scopedItems.length?Math.round(mitigated/scopedItems.length*100):0
  const overdueReviews=scopedItems.filter(x=>x.status!=='Closed'&&x.reviewDate&&daysTo(x.reviewDate)<0).length

  const matrixCounts=useMemo(()=>{
    const map={}
    rows.forEach(r=>{ const key=`${r.likelihood}-${r.severity}`; map[key]=(map[key]||0)+1 })
    return map
  },[rows])

  const hierarchy=useMemo(()=>controlTypes.map(type=>{
    const count=scopedItems.filter(x=>x.controlType===type).length
    const pct=scopedItems.length?Math.round(count/scopedItems.length*100):0
    const tone=type==='Eliminasi'?'red':type==='Substitusi'?'orange':type==='Engineering'?'blue':type==='Administratif'?'purple':'green'
    return [type,count,pct,tone]
  }),[scopedItems])

  function flash(text){ setNotice(text); window.setTimeout(()=>setNotice(''),3200) }
  function updateForm(field,value){ setForm(prev=>({...prev,[field]:value})) }
  function openCreate(){
    const companyCode=filters.company!=='All'?filters.company:(scopedCompanies[0]?.code||COMPANY_MASTER[0]?.code||'ACP')
    setEditingId(''); setForm({...emptyForm,companyCode}); setModalOpen(true)
  }
  function openEdit(item){ setEditingId(item.id); setForm({...item}); setModalOpen(true) }
  async function persist(item){
    const next=editingId?items.map(x=>x.id===item.id?item:x):[item,...items]
    setItems(next); writeLocal(next); setSelectedId(item.id)
    if(isSupabaseConfigured()){
      try{ await dbUpsert('hazards',toDb(item)); setSource('central'); return true }catch{return false}
    }
    return true
  }
  async function saveHazard(e){
    e.preventDefault()
    if(!form.companyCode||!form.title.trim()||!form.activity.trim()||!form.owner.trim()||!form.reviewDate){ flash('Lengkapi PT, aktivitas, bahaya, owner/PIC dan review date.'); return }
    const item={...form,id:editingId||`RSK-${String(Date.now()).slice(-8)}`}
    const synced=await persist(item); setModalOpen(false); setEditingId('')
    flash(synced?`${item.id} tersimpan di Risk Register.`:`${item.id} tersimpan lokal; sinkronisasi Supabase akan dicoba kembali.`)
  }
  async function markControlled(item){
    const next={...item,status:item.status==='Closed'?'Closed':'Controlled'}
    const previous=editingId; setEditingId(item.id); await persist(next); setEditingId(previous); flash(`${item.id} ditandai Controlled.`)
  }
  function exportCSV(){
    const header=['Risk ID','Company','Assessment','JSA No','Activity','Hazard','Category','Unit','Location','Consequence','Likelihood','Severity','Initial Risk','Existing Controls','Control Type','Additional Controls','Residual Likelihood','Residual Severity','Residual Risk','Owner','Status','Due Date','Review Date','Notes']
    const data=rows.map(r=>{const a=riskMeta(r.likelihood,r.severity);const b=riskMeta(r.residualLikelihood,r.residualSeverity);return[r.id,r.companyCode,r.assessmentType,r.jsaNo,r.activity,r.title,r.category,r.unit,r.location,r.consequence,r.likelihood,r.severity,a.label,r.existingControls,r.controlType,r.additionalControls,r.residualLikelihood,r.residualSeverity,b.label,r.owner,r.status,r.dueDate,r.reviewDate,r.notes]})
    const csv=[header,...data].map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n')
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`SINSHE_Risk_Register_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url)
  }

  const initialSelected=selected?riskMeta(selected.likelihood,selected.severity):null
  const residualSelected=selected?riskMeta(selected.residualLikelihood,selected.residualSeverity):null

  return <Shell title="Hazard & Risk Management" subtitle="HIRA, JSA, Risk Register, risk control dan monitoring terintegrasi lintas PT.">
    <CompanyScopeBar filters={filters} onChange={setFilters} onReset={()=>setFilters(DEFAULT_COMPANY_FILTERS)}/>
    {notice&&<div className={styles.notice}><CheckCircle2 size={17}/>{notice}</div>}

    <div className={styles.flowStrip}>
      {['1. Hazard Identification','2. Risk Assessment','3. Risk Control','4. Risk Monitoring'].map((x,i)=><div key={x}><span>{i+1}</span><b>{x.replace(/^\d\. /,'')}</b></div>)}
    </div>

    <div className="stats-grid four">
      <StatCard label="Total Hazard" value={scopedItems.length} hint={`${rows.length} sesuai filter register`} tone="blue" icon={<AlertTriangle/>}/>
      <StatCard label="Extreme / High" value={highCount} hint="prioritas mitigasi" tone="red" icon={<ShieldAlert/>}/>
      <StatCard label="HIRA / JSA Aktif" value={activeAssessments} hint={`${overdueReviews} review overdue`} tone="green" icon={<ClipboardList/>}/>
      <StatCard label="Mitigasi Selesai" value={`${mitigationRate}%`} hint={`${mitigated} controlled / closed`} tone="purple" icon={<Target/>}/>
    </div>

    <div className={styles.toolbar}>
      <div><h2>Digital Risk Register</h2><p>{source==='central'?'Supabase central data':source==='local'?'Browser cache / local data':'Belum ada risk register'} • filter PT tetap aktif.</p></div>
      <div className={styles.buttons}><button className={styles.secondary} onClick={exportCSV}><Download size={17}/> Export CSV</button><button className={styles.primary} onClick={openCreate}><Plus size={18}/> Tambah Risk</button></div>
    </div>

    <div className={styles.filters}>
      <label className={styles.search}><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari risk ID, aktivitas, bahaya, lokasi, owner, JSA..."/></label>
      <label><Filter size={14}/><select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option>All</option>{categories.map(v=><option key={v}>{v}</option>)}</select></label>
      <label><select value={levelFilter} onChange={e=>setLevelFilter(e.target.value)}><option>All</option><option>Extreme</option><option>High</option><option>Medium</option><option>Low</option></select></label>
      <label><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All</option>{statuses.map(v=><option key={v}>{v}</option>)}</select></label>
    </div>

    <div className="dashboard-split">
      <Panel className="table-panel" title="Risk Register" action={`${rows.length} records`}>
        <div className="table-wrap"><table>
          <thead><tr><th>ID / PT</th><th>Aktivitas & Bahaya</th><th>Unit / Lokasi</th><th>Assessment</th><th>Initial Risk</th><th>Residual Risk</th><th>Status</th><th>Review</th><th></th></tr></thead>
          <tbody>{rows.map(r=>{const initial=riskMeta(r.likelihood,r.severity);const residual=riskMeta(r.residualLikelihood,r.residualSeverity);const review=daysTo(r.reviewDate);return <tr key={r.id} onClick={()=>setSelectedId(r.id)} className={r.id===selectedId?styles.selectedRow:''}>
            <td><b>{r.id}</b><small className={styles.block}>{r.companyCode||'-'}</small></td>
            <td><b>{r.activity}</b><small className={styles.block}>{r.title}</small></td>
            <td>{r.unit}<small className={styles.block}>{r.location||'-'}</small></td>
            <td>{r.assessmentType}<small className={styles.block}>{r.jsaNo||'No ref'}</small></td>
            <td><Badge tone={initial.tone}>{initial.label} · {initial.score}</Badge></td>
            <td><Badge tone={residual.tone}>{residual.label} · {residual.score}</Badge></td>
            <td><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
            <td className={review!==null&&review<0?'red-text':''}>{fmt(r.reviewDate)}<small className={styles.block}>{review===null?'':review<0?`${Math.abs(review)}d overdue`:`${review}d lagi`}</small></td>
            <td><button className={styles.iconButton} onClick={e=>{e.stopPropagation();openEdit(r)}} title="Edit"><Edit3 size={15}/></button></td>
          </tr>})}
          {!rows.length&&<tr><td colSpan="9" className={styles.empty}>Belum ada risk register pada scope/filter ini. Klik “Tambah Risk” untuk mulai.</td></tr>}
          </tbody>
        </table></div>
      </Panel>

      <Panel title="Risk Detail & Monitoring">
        {selected?<div className={styles.detail}>
          <div className={styles.detailHead}><div><small>{selected.companyCode} • {selected.assessmentType}</small><h3>{selected.activity}</h3><p>{selected.title}</p></div><Badge tone={initialSelected.tone}>{initialSelected.label}</Badge></div>
          <div className={styles.scorePair}><div><small>Initial Risk</small><b>{initialSelected.score}</b><span>L{selected.likelihood} × S{selected.severity}</span></div><div><small>Residual Risk</small><b>{residualSelected.score}</b><span>L{selected.residualLikelihood} × S{selected.residualSeverity}</span></div></div>
          <div className={styles.detailList}>
            <div><span>Kategori</span><b>{selected.category}</b></div><div><span>Unit / Lokasi</span><b>{selected.unit} • {selected.location||'-'}</b></div>
            <div><span>Consequence</span><b>{selected.consequence||'-'}</b></div><div><span>Owner / PIC</span><b>{selected.owner||'-'}</b></div>
            <div><span>Existing Control</span><b>{selected.existingControls||'-'}</b></div><div><span>Control Type</span><b>{selected.controlType||'-'}</b></div>
            <div><span>Additional Control</span><b>{selected.additionalControls||'-'}</b></div><div><span>Due / Review</span><b>{fmt(selected.dueDate)} / {fmt(selected.reviewDate)}</b></div>
          </div>
          <div className={styles.detailActions}><button className={styles.secondary} onClick={()=>openEdit(selected)}><Edit3 size={15}/> Edit</button>{!['Controlled','Closed'].includes(selected.status)&&<button className={styles.primary} onClick={()=>markControlled(selected)}><CheckCircle2 size={15}/> Mark Controlled</button>}</div>
        </div>:<div className={styles.empty}>Pilih risk dari register untuk melihat detail.</div>}
      </Panel>
    </div>

    <div className="exec-grid two">
      <Panel title="Risk Matrix 5×5" action="Count dari filter register">
        <div className="risk-matrix">
          <div className="rm-corner">L / S</div>{[1,2,3,4,5].map(s=><div key={s} className="rm-head">{s}</div>)}
          {[5,4,3,2,1].map(l=><div className="rm-row" key={l}><div className="rm-head">{l}</div>{[1,2,3,4,5].map(s=>{const count=matrixCounts[`${l}-${s}`]||0;return <div key={s} className={`rm-cell ${matrixTone(l*s)}`} title={`${count} risk`}>{count||l*s}</div>})}</div>)}
        </div>
        <p className="matrix-note">Jika cell memiliki risk, angka menunjukkan jumlah risk. Cell kosong menampilkan skor Likelihood × Severity sebagai referensi.</p>
      </Panel>
      <Panel title="Hirarki Pengendalian" action="Coverage dari current PT scope">
        <div className={styles.hierarchyList}>{hierarchy.map(([name,count,pct,tone])=><div key={name}><div><span><Layers size={15}/><b>{name}</b></span><strong>{count} risk</strong></div><Progress value={pct} tone={tone}/></div>)}</div>
      </Panel>
    </div>

    {modalOpen&&<div className={styles.modalBackdrop} onMouseDown={e=>{if(e.target===e.currentTarget)setModalOpen(false)}}><form className={styles.modal} onSubmit={saveHazard}>
      <div className={styles.modalHead}><div><small>{editingId?'UPDATE RISK':'NEW RISK ASSESSMENT'}</small><h2>{editingId?editingId:'Tambah Hazard / Risk'}</h2></div><button type="button" onClick={()=>setModalOpen(false)}><X size={20}/></button></div>
      <div className={styles.formGrid}>
        <label><span>Company / PT *</span><select value={form.companyCode} onChange={e=>updateForm('companyCode',e.target.value)}>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
        <label><span>Assessment Type *</span><select value={form.assessmentType} onChange={e=>updateForm('assessmentType',e.target.value)}>{assessmentTypes.map(v=><option key={v}>{v}</option>)}</select></label>
        <label><span>JSA / HIRA Reference</span><input value={form.jsaNo} onChange={e=>updateForm('jsaNo',e.target.value)} placeholder="JSA-2026-001"/></label>
        <label><span>Unit *</span><select value={form.unit} onChange={e=>updateForm('unit',e.target.value)}>{units.map(v=><option key={v}>{v}</option>)}</select></label>
        <label className={styles.span2}><span>Aktivitas / Pekerjaan *</span><input value={form.activity} onChange={e=>updateForm('activity',e.target.value)} placeholder="Contoh: Pengelasan pipa steam"/></label>
        <label className={styles.span2}><span>Bahaya *</span><input value={form.title} onChange={e=>updateForm('title',e.target.value)} placeholder="Contoh: Paparan api / hot work"/></label>
        <label><span>Kategori *</span><select value={form.category} onChange={e=>updateForm('category',e.target.value)}>{categories.map(v=><option key={v}>{v}</option>)}</select></label>
        <label><span>Lokasi</span><input value={form.location} onChange={e=>updateForm('location',e.target.value)} placeholder="Area / station"/></label>
        <label className={styles.span2}><span>Potential Consequence</span><input value={form.consequence} onChange={e=>updateForm('consequence',e.target.value)} placeholder="Cedera, kebakaran, kerusakan aset..."/></label>
        <label><span>Likelihood (1–5)</span><select value={form.likelihood} onChange={e=>updateForm('likelihood',Number(e.target.value))}>{[1,2,3,4,5].map(v=><option key={v}>{v}</option>)}</select></label>
        <label><span>Severity (1–5)</span><select value={form.severity} onChange={e=>updateForm('severity',Number(e.target.value))}>{[1,2,3,4,5].map(v=><option key={v}>{v}</option>)}</select></label>
        <label className={styles.span2}><span>Existing Controls</span><textarea value={form.existingControls} onChange={e=>updateForm('existingControls',e.target.value)} placeholder="Kontrol yang sudah tersedia"/></label>
        <label><span>Hierarchy Control</span><select value={form.controlType} onChange={e=>updateForm('controlType',e.target.value)}>{controlTypes.map(v=><option key={v}>{v}</option>)}</select></label>
        <label><span>Status</span><select value={form.status} onChange={e=>updateForm('status',e.target.value)}>{statuses.map(v=><option key={v}>{v}</option>)}</select></label>
        <label className={styles.span2}><span>Additional / Mitigation Controls</span><textarea value={form.additionalControls} onChange={e=>updateForm('additionalControls',e.target.value)} placeholder="Action untuk menurunkan residual risk"/></label>
        <label><span>Residual Likelihood</span><select value={form.residualLikelihood} onChange={e=>updateForm('residualLikelihood',Number(e.target.value))}>{[1,2,3,4,5].map(v=><option key={v}>{v}</option>)}</select></label>
        <label><span>Residual Severity</span><select value={form.residualSeverity} onChange={e=>updateForm('residualSeverity',Number(e.target.value))}>{[1,2,3,4,5].map(v=><option key={v}>{v}</option>)}</select></label>
        <label><span>Owner / PIC *</span><input value={form.owner} onChange={e=>updateForm('owner',e.target.value)} placeholder="Nama / jabatan PIC"/></label>
        <label><span>Due Date</span><input type="date" value={form.dueDate} onChange={e=>updateForm('dueDate',e.target.value)}/></label>
        <label><span>Review Date *</span><input type="date" value={form.reviewDate} onChange={e=>updateForm('reviewDate',e.target.value)}/></label>
        <label><span>Initial Risk</span><div className={styles.readonlyRisk}>{riskMeta(form.likelihood,form.severity).label} · {riskMeta(form.likelihood,form.severity).score}</div></label>
        <label><span>Residual Risk</span><div className={styles.readonlyRisk}>{riskMeta(form.residualLikelihood,form.residualSeverity).label} · {riskMeta(form.residualLikelihood,form.residualSeverity).score}</div></label>
        <label className={styles.span2}><span>Notes</span><textarea value={form.notes} onChange={e=>updateForm('notes',e.target.value)} placeholder="Catatan monitoring / evidence"/></label>
      </div>
      <div className={styles.modalActions}><button type="button" className={styles.secondary} onClick={()=>setModalOpen(false)}>Batal</button><button type="submit" className={styles.primary}>{editingId?'Simpan Perubahan':'Tambah ke Risk Register'}</button></div>
    </form></div>}
  </Shell>
}
