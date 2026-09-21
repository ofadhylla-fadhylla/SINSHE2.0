'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge, Panel, StatCard } from '../../components/Ui'
import {
  AlertTriangle, CheckCircle2, ClipboardCheck, Download, HardHat, PackageCheck,
  Plus, Search, ShoppingCart, Users
} from 'lucide-react'
import { COMPANY_MASTER, DEFAULT_COMPANY_FILTERS, companyCodeOf, filteredCompanies } from '../../lib/company-master'
import { dbSelect, dbUpsert, getStoredProfile, isSupabaseConfigured } from '../../lib/supabase-rest'
import { PPE_CATALOG, PPE_FORM_REFERENCES, PPE_JOB_STANDARDS, catalogItem, standardForJob } from '../../lib/ppe-master'
import styles from './ppe-management.module.css'

const today=()=>new Date().toISOString().slice(0,10)
const daysBetween=(a,b)=>{if(!a||!b)return null;return Math.round((new Date(`${b}T00:00:00`)-new Date(`${a}T00:00:00`))/86400000)}
const daysTo=value=>value?Math.ceil((new Date(`${value}T23:59:59`)-new Date())/86400000):null
const fmt=value=>value?new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${value}T00:00:00`)):'-'
const csvDownload=(name,rows)=>{
  const csv=rows.map(row=>row.map(value=>`"${String(value??'').replaceAll('"','""')}"`).join(',')).join('\n')
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
  const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)
}
const monitoringStatus=row=>{
  const shortage=Math.max(0,Number(row.shortageQty??row.shortage_qty??0))
  if(row.status==='Closed')return'Closed'
  if(shortage>0)return'Shortage'
  const replacement=daysTo(row.replacementDue||row.replacement_due)
  if(replacement!==null&&replacement<0)return'Replacement Due'
  const pr=daysTo(row.nextPrDate||row.next_pr_date)
  if(pr!==null&&pr<=30)return'PR Due Soon'
  return'Covered'
}
const tone=value=>value==='Covered'||value==='GRN Complete'||value==='Acknowledged'?'green':value==='Shortage'||value==='Replacement Due'?'red':value==='PR Due Soon'||value==='Approval'||value==='Purchasing'?'orange':'blue'

function monFromDb(r){return{
  id:r.id,companyCode:r.company_code||'',unit:r.unit||'',formCode:r.form_code||'',jobTitle:r.job_title||'',workArea:r.work_area||'',
  workerCount:Number(r.worker_count||0),ppeType:r.ppe_type||'',materialCode:r.material_code||'',usagePeriod:r.usage_period||'',
  requiredQty:Number(r.required_qty||0),givenQty:Number(r.given_qty||0),shortageQty:Number(r.shortage_qty||0),
  handoverStart:r.handover_start||'',handoverEnd:r.handover_end||'',replacementDue:r.replacement_due||'',nextPrDate:r.next_pr_date||'',
  documentationRef:r.documentation_ref||'',status:r.status||'Covered',notes:r.notes||''
}}
function handFromDb(r){return{
  id:r.id,companyCode:r.company_code||'',unit:r.unit||'',formCode:r.form_code||'',handoverDate:r.handover_date||'',
  employeeName:r.employee_name||'',nik:r.nik||'',jobTitle:r.job_title||'',ppeType:r.ppe_type||'',qty:Number(r.qty||1),
  acknowledgement:Boolean(r.acknowledgement),handoverRef:r.handover_ref||'',notes:r.notes||''
}}
function prFromDb(r){return{
  id:r.id,companyCode:r.company_code||'',unit:r.unit||'',formCode:r.form_code||'',estate:r.estate||'',prNo:r.pr_no||'',description:r.description||'',
  prDate:r.pr_date||'',signEm:r.sign_em||'',signGem:r.sign_gem||'',signRh:r.sign_rh||'',receiveEpdLo:r.receive_epd_lo||'',
  approvalHp:r.approval_hp||'',epdLoToRo:r.epd_lo_to_ro||'',epdRoToPurch:r.epd_ro_to_purch||'',poDate:r.po_date||'',grnDate:r.grn_date||'',
  status:r.status||'PR Open',notes:r.notes||''
}}

const emptyMonitoring={companyCode:'ACP',unit:'Estate',jobTitle:'Staff',workerCount:1,workArea:'Kebun',ppeType:'Safety Helmet + chinstrap',requiredQty:1,givenQty:0,handoverStart:'',handoverEnd:'',replacementDue:'',nextPrDate:'',documentationRef:'',notes:''}
const emptyHandover={companyCode:'ACP',unit:'Estate',handoverDate:today(),employeeName:'',nik:'',jobTitle:'Staff',ppeType:'Safety Helmet + chinstrap',qty:1,acknowledgement:true,handoverRef:'',notes:''}
const emptyPr={companyCode:'ACP',unit:'Estate',estate:'',prNo:'',description:'',prDate:today(),signEm:'',signGem:'',signRh:'',receiveEpdLo:'',approvalHp:'',epdLoToRo:'',epdRoToPurch:'',poDate:'',grnDate:'',status:'PR Open',notes:''}

export default function PpeManagement(){
  const [filters,setFilters]=useState(DEFAULT_COMPANY_FILTERS)
  const [tab,setTab]=useState('standard')
  const [monitoring,setMonitoring]=useState([])
  const [handover,setHandover]=useState([])
  const [prs,setPrs]=useState([])
  const [search,setSearch]=useState('')
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(true)
  const [monForm,setMonForm]=useState(emptyMonitoring)
  const [handForm,setHandForm]=useState(emptyHandover)
  const [prForm,setPrForm]=useState(emptyPr)
  const [selectedJob,setSelectedJob]=useState('Staff')
  const [standardSearch,setStandardSearch]=useState('')
  const profile=getStoredProfile()
  const canManage=!profile||profile.role!=='Viewer'

  useEffect(()=>{
    let alive=true
    async function load(){
      if(!isSupabaseConfigured()){setError('Supabase belum dikonfigurasi.');setLoading(false);return}
      try{
        const [m,h,p]=await Promise.all([
          dbSelect('ppe_monitoring','select=*&order=updated_at.desc'),
          dbSelect('ppe_handover','select=*&order=handover_date.desc,updated_at.desc'),
          dbSelect('ppe_pr_monitoring','select=*&order=pr_date.desc,updated_at.desc'),
        ])
        if(alive){setMonitoring((m||[]).map(monFromDb));setHandover((h||[]).map(handFromDb));setPrs((p||[]).map(prFromDb))}
      }catch(e){if(alive)setError(e?.message||'Gagal mengambil data APD dari database pusat.')}
      finally{if(alive)setLoading(false)}
    }
    load();return()=>{alive=false}
  },[])

  const companies=useMemo(()=>filteredCompanies(filters),[filters])
  const allowed=useMemo(()=>new Set(companies.map(c=>c.code)),[companies])
  const scoped=rows=>rows.filter(row=>{const code=companyCodeOf(row);return code?allowed.has(code):true})
  const scopedMonitoring=useMemo(()=>scoped(monitoring),[monitoring,allowed])
  const scopedHandover=useMemo(()=>scoped(handover),[handover,allowed])
  const scopedPr=useMemo(()=>scoped(prs),[prs,allowed])
  const query=search.trim().toLowerCase()
  const monRows=useMemo(()=>scopedMonitoring.filter(r=>!query||[r.id,r.companyCode,r.unit,r.jobTitle,r.ppeType,r.materialCode,r.status].join(' ').toLowerCase().includes(query)),[scopedMonitoring,query])
  const handRows=useMemo(()=>scopedHandover.filter(r=>!query||[r.id,r.companyCode,r.employeeName,r.nik,r.jobTitle,r.ppeType,r.handoverRef].join(' ').toLowerCase().includes(query)),[scopedHandover,query])
  const prRows=useMemo(()=>scopedPr.filter(r=>!query||[r.id,r.companyCode,r.prNo,r.description,r.estate,r.status].join(' ').toLowerCase().includes(query)),[scopedPr,query])

  const shortage=scopedMonitoring.reduce((s,r)=>s+Math.max(0,Number(r.shortageQty||0)),0)
  const dueSoon=scopedMonitoring.filter(r=>{const d=daysTo(r.replacementDue);return d!==null&&d<=30}).length
  const totalRequired=scopedMonitoring.reduce((s,r)=>s+Number(r.requiredQty||0),0)
  const acknowledged=scopedHandover.filter(r=>r.acknowledgement).length

  function flash(t){setNotice(t);setTimeout(()=>setNotice(''),3200)}
  function companySelect(value,setter){setter(prev=>({...prev,companyCode:value}))}

  async function saveMonitoringRow(row){
    const item=catalogItem(row.ppeType)
    const shortageQty=Math.max(0,Number(row.requiredQty||0)-Number(row.givenQty||0))
    const id=row.id||`APD-${row.companyCode}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`
    const normalized={...row,id,materialCode:row.materialCode||item.materialCode,usagePeriod:row.usagePeriod||item.usagePeriod,shortageQty}
    normalized.status=monitoringStatus(normalized)
    const db={id,company_code:normalized.companyCode,unit:normalized.unit||'Unknown',form_code:'KPNPLT-FORM-SST-003.02/003.03',job_title:normalized.jobTitle,work_area:normalized.workArea||null,worker_count:Number(normalized.workerCount||0),ppe_type:normalized.ppeType,material_code:normalized.materialCode||null,usage_period:normalized.usagePeriod||null,required_qty:Number(normalized.requiredQty||0),given_qty:Number(normalized.givenQty||0),shortage_qty:shortageQty,handover_start:normalized.handoverStart||null,handover_end:normalized.handoverEnd||null,replacement_due:normalized.replacementDue||null,next_pr_date:normalized.nextPrDate||null,documentation_ref:normalized.documentationRef||null,status:normalized.status,notes:normalized.notes||null}
    await dbUpsert('ppe_monitoring',[db],'id')
    setMonitoring(prev=>[normalized,...prev.filter(x=>x.id!==id)])
    return normalized
  }

  async function saveMonitoring(e){
    e.preventDefault()
    if(!canManage)return
    if(!monForm.companyCode||!monForm.jobTitle||!monForm.ppeType){flash('PT, pekerjaan dan jenis APD wajib diisi.');return}
    try{await saveMonitoringRow(monForm);setMonForm({...emptyMonitoring,companyCode:monForm.companyCode,unit:monForm.unit});flash('Monitoring APD tersimpan ke database pusat.')}
    catch(e){flash(`Gagal menyimpan: ${e.message}`)}
  }

  async function generateStandard(){
    if(!canManage)return
    const standard=standardForJob(monForm.jobTitle)
    if(!standard?.ppe?.length){flash('Matriks standar APD untuk pekerjaan ini tidak ditemukan.');return}
    try{
      const count=Math.max(0,Number(monForm.workerCount||0))
      const created=[]
      for(const ppeType of standard.ppe){
        const item=catalogItem(ppeType)
        created.push(await saveMonitoringRow({...monForm,id:'',ppeType,materialCode:item.materialCode,usagePeriod:item.usagePeriod,requiredQty:count,givenQty:0,workArea:(standard.workArea||[]).join(' / ')}))
      }
      flash(`${created.length} item kebutuhan APD dibuat dari KPNPLT-FORM-SST-003.01.`)
      setTab('monitoring')
    }catch(e){flash(`Generate gagal: ${e.message}`)}
  }

  async function saveHandover(e){
    e.preventDefault()
    if(!canManage)return
    if(!handForm.companyCode||!handForm.employeeName.trim()||!handForm.ppeType){flash('PT, nama karyawan dan APD wajib diisi.');return}
    const id=`BAST-APD-${handForm.companyCode}-${Date.now()}`
    const row={...handForm,id}
    const db={id,company_code:row.companyCode,unit:row.unit||'Unknown',form_code:'KPNPLT-FORM-SST-003.04',handover_date:row.handoverDate,employee_name:row.employeeName,nik:row.nik||null,job_title:row.jobTitle||null,ppe_type:row.ppeType,qty:Number(row.qty||1),acknowledgement:Boolean(row.acknowledgement),handover_ref:row.handoverRef||null,notes:row.notes||null}
    try{await dbUpsert('ppe_handover',[db],'id');setHandover(prev=>[row,...prev]);setHandForm({...emptyHandover,companyCode:row.companyCode,unit:row.unit,handoverDate:row.handoverDate});flash('BAST APD tersimpan.')}
    catch(e){flash(`Gagal menyimpan BAST: ${e.message}`)}
  }

  async function savePr(e){
    e.preventDefault()
    if(!canManage)return
    if(!prForm.companyCode||!prForm.prNo.trim()){flash('PT dan PR No. wajib diisi.');return}
    const id=`PR-APD-${prForm.companyCode}-${Date.now()}`
    const row={...prForm,id}
    const db={id,company_code:row.companyCode,unit:row.unit||'Unknown',form_code:'KPNPLT-FORM-SST-003.07',estate:row.estate||null,pr_no:row.prNo,description:row.description||null,pr_date:row.prDate||null,sign_em:row.signEm||null,sign_gem:row.signGem||null,sign_rh:row.signRh||null,receive_epd_lo:row.receiveEpdLo||null,approval_hp:row.approvalHp||null,epd_lo_to_ro:row.epdLoToRo||null,epd_ro_to_purch:row.epdRoToPurch||null,po_date:row.poDate||null,grn_date:row.grnDate||null,status:row.status,notes:row.notes||null}
    try{await dbUpsert('ppe_pr_monitoring',[db],'id');setPrs(prev=>[row,...prev]);setPrForm({...emptyPr,companyCode:row.companyCode,unit:row.unit});flash('Monitoring PR APD tersimpan.')}
    catch(e){flash(`Gagal menyimpan PR: ${e.message}`)}
  }

  function exportActive(){
    if(tab==='monitoring')return csvDownload(`SINSHE_APD_Monitoring_${today()}.csv`,[['ID','PT','Unit','Pekerjaan','Tenaga Kerja','APD','Material Code','Masa Pakai','Required','Given','Shortage','Replacement Due','Next PR','Status'],...monRows.map(r=>[r.id,r.companyCode,r.unit,r.jobTitle,r.workerCount,r.ppeType,r.materialCode,r.usagePeriod,r.requiredQty,r.givenQty,r.shortageQty,r.replacementDue,r.nextPrDate,monitoringStatus(r)])])
    if(tab==='handover')return csvDownload(`SINSHE_APD_BAST_${today()}.csv`,[['ID','PT','Tanggal','Nama','NIK','Pekerjaan','APD','Qty','Acknowledgement','Ref'],...handRows.map(r=>[r.id,r.companyCode,r.handoverDate,r.employeeName,r.nik,r.jobTitle,r.ppeType,r.qty,r.acknowledgement?'Yes':'No',r.handoverRef])])
    if(tab==='pr')return csvDownload(`SINSHE_APD_PR_${today()}.csv`,[['ID','PT','PR No','Description','PR Date','PO Date','GRN Date','Durasi','Status'],...prRows.map(r=>[r.id,r.companyCode,r.prNo,r.description,r.prDate,r.poDate,r.grnDate,daysBetween(r.prDate,r.grnDate)??'',r.status])])
  }

  const selectedStandard=standardForJob(selectedJob)
  const standardRows=(selectedStandard?.ppe||[]).map(name=>catalogItem(name)).filter(item=>!standardSearch.trim()||[item.name,item.materialCode,item.usagePeriod].join(' ').toLowerCase().includes(standardSearch.toLowerCase()))

  return <Shell title="APD Management" subtitle="Digitalisasi Matriks Standar, Identifikasi Kebutuhan, Monitoring, BAST dan Monitoring PR APD sesuai form KPN Plantations.">
    <CompanyScopeBar filters={filters} onChange={setFilters} onReset={()=>setFilters(DEFAULT_COMPANY_FILTERS)}/>
    {notice&&<div className={styles.notice}><CheckCircle2 size={18}/>{notice}</div>}
    {error&&<div className={styles.error}><AlertTriangle size={18}/>{error}</div>}
    <div className="stats-grid four">
      <StatCard label="Kebutuhan APD" value={totalRequired} hint="qty dari monitoring scope" tone="blue" icon={<HardHat/>}/>
      <StatCard label="Kekurangan" value={shortage} hint="required - diberikan" tone={shortage?'red':'green'} icon={<AlertTriangle/>}/>
      <StatCard label="Replacement ≤30 Hari" value={dueSoon} hint="berdasarkan batas masa pakai" tone={dueSoon?'orange':'green'} icon={<PackageCheck/>}/>
      <StatCard label="BAST Acknowledged" value={acknowledged} hint={`${scopedHandover.length} record serah terima`} tone="green" icon={<Users/>}/>
    </div>

    <div className={styles.sourceBar}>
      <div><b>Form sumber yang didigitalisasi</b><span>{PPE_FORM_REFERENCES.map(x=>x.code).join(' • ')}</span></div>
      <small>Data operasional di bawah tidak diisi dummy; register mulai dari data aktual yang dimasukkan user.</small>
    </div>

    <div className={styles.tabs}>
      <button className={tab==='standard'?styles.activeTab:''} onClick={()=>setTab('standard')}>Matriks Standar</button>
      <button className={tab==='monitoring'?styles.activeTab:''} onClick={()=>setTab('monitoring')}>Kebutuhan & Monitoring</button>
      <button className={tab==='handover'?styles.activeTab:''} onClick={()=>setTab('handover')}>BAST APD</button>
      <button className={tab==='pr'?styles.activeTab:''} onClick={()=>setTab('pr')}>Monitoring PR</button>
      {tab!=='standard'&&<button className={styles.export} onClick={exportActive}><Download size={15}/> Export CSV</button>}
    </div>

    {tab==='standard'&&<div className={styles.twoCol}>
      <Panel title="KPNPLT-FORM-SST-003.01 · Matriks Standar Kebutuhan APD">
        <div className={styles.formRow}>
          <label>Pekerjaan<select value={selectedJob} onChange={e=>selectedJob!==e.target.value&&setSelectedJob(e.target.value)}>{PPE_JOB_STANDARDS.map(x=><option key={x.job}>{x.job}</option>)}</select></label>
          <label>Cari APD<input value={standardSearch} onChange={e=>setStandardSearch(e.target.value)} placeholder="Nama / material code..."/></label>
        </div>
        <div className={styles.jobMeta}><span>Area kerja</span><b>{(selectedStandard?.workArea||[]).join(' / ')||'-'}</b><span>Jumlah item standar</span><b>{selectedStandard?.ppe?.length||0}</b></div>
        <div className="table-wrap"><table><thead><tr><th>Jenis APD</th><th>Material Code</th><th>Standar Masa Pakai</th></tr></thead><tbody>{standardRows.map(row=><tr key={row.name}><td><b>{row.name}</b></td><td>{row.materialCode||'-'}</td><td>{row.usagePeriod||'-'}</td></tr>)}</tbody></table></div>
      </Panel>
      <Panel title="Generate Identifikasi Kebutuhan APD">
        <p className={styles.help}>Pilih PT, unit, pekerjaan dan jumlah tenaga kerja. Sistem membuat satu baris kebutuhan untuk setiap APD yang ditandai wajib pada matriks sumber.</p>
        <form className={styles.form} onSubmit={e=>e.preventDefault()}>
          <label>Company / PT<select value={monForm.companyCode} onChange={e=>companySelect(e.target.value,setMonForm)}>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
          <label>Unit / Lokasi<input value={monForm.unit} onChange={e=>setMonForm({...monForm,unit:e.target.value})}/></label>
          <label>Pekerjaan<select value={monForm.jobTitle} onChange={e=>{const st=standardForJob(e.target.value);setMonForm({...monForm,jobTitle:e.target.value,workArea:(st?.workArea||[]).join(' / ')})}}>{PPE_JOB_STANDARDS.map(x=><option key={x.job}>{x.job}</option>)}</select></label>
          <label>Jumlah Tenaga Kerja<input type="number" min="0" value={monForm.workerCount} onChange={e=>setMonForm({...monForm,workerCount:e.target.value})}/></label>
          <button type="button" className={styles.primary} onClick={generateStandard} disabled={!canManage}><Plus size={17}/> Generate dari Matriks Standar</button>
        </form>
      </Panel>
    </div>}

    {tab==='monitoring'&&<>
      <Panel title="Kebutuhan & Monitoring APD" action={<span className={styles.formCode}>KPNPLT-FORM-SST-003.02 / 003.03</span>}>
        {canManage&&<form className={styles.inlineForm} onSubmit={saveMonitoring}>
          <select value={monForm.companyCode} onChange={e=>companySelect(e.target.value,setMonForm)}>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code}</option>)}</select>
          <input value={monForm.unit} onChange={e=>setMonForm({...monForm,unit:e.target.value})} placeholder="Unit"/>
          <select value={monForm.jobTitle} onChange={e=>setMonForm({...monForm,jobTitle:e.target.value})}>{PPE_JOB_STANDARDS.map(x=><option key={x.job}>{x.job}</option>)}</select>
          <select value={monForm.ppeType} onChange={e=>setMonForm({...monForm,ppeType:e.target.value})}>{PPE_CATALOG.map(x=><option key={x.name}>{x.name}</option>)}</select>
          <input type="number" min="0" value={monForm.requiredQty} onChange={e=>setMonForm({...monForm,requiredQty:e.target.value})} placeholder="Required"/>
          <input type="number" min="0" value={monForm.givenQty} onChange={e=>setMonForm({...monForm,givenQty:e.target.value})} placeholder="Given"/>
          <input type="date" value={monForm.replacementDue} onChange={e=>setMonForm({...monForm,replacementDue:e.target.value})} title="Batas masa pakai"/>
          <input type="date" value={monForm.nextPrDate} onChange={e=>setMonForm({...monForm,nextPrDate:e.target.value})} title="PR berikutnya"/>
          <button className={styles.primary}><Plus size={16}/> Simpan</button>
        </form>}
        <div className={styles.search}><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari pekerjaan, APD, status, material code..."/></div>
        <div className="table-wrap"><table><thead><tr><th>PT</th><th>Pekerjaan</th><th>APD</th><th>Material</th><th>Masa Pakai</th><th>Required</th><th>Diberikan</th><th>Kekurangan</th><th>Replacement</th><th>Next PR</th><th>Status</th></tr></thead><tbody>{monRows.map(r=>{const status=monitoringStatus(r);return <tr key={r.id}><td><b>{r.companyCode}</b><small className={styles.block}>{r.unit}</small></td><td>{r.jobTitle}<small className={styles.block}>{r.workerCount} tenaga kerja</small></td><td><b>{r.ppeType}</b></td><td>{r.materialCode||'-'}</td><td>{r.usagePeriod||'-'}</td><td>{r.requiredQty}</td><td>{r.givenQty}</td><td><b>{r.shortageQty}</b></td><td>{fmt(r.replacementDue)}</td><td>{fmt(r.nextPrDate)}</td><td><Badge tone={tone(status)}>{status}</Badge></td></tr>})}{!loading&&!monRows.length&&<tr><td colSpan="11" className={styles.empty}>Belum ada data monitoring APD aktual pada scope ini.</td></tr>}</tbody></table></div>
      </Panel>
    </>}

    {tab==='handover'&&<div className={styles.twoCol}>
      <Panel title="Berita Acara Serah Terima APD" action={<span className={styles.formCode}>KPNPLT-FORM-SST-003.04</span>}>
        {canManage&&<form className={styles.form} onSubmit={saveHandover}>
          <label>Company / PT<select value={handForm.companyCode} onChange={e=>companySelect(e.target.value,setHandForm)}>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
          <label>Unit<input value={handForm.unit} onChange={e=>setHandForm({...handForm,unit:e.target.value})}/></label>
          <label>Tanggal<input type="date" value={handForm.handoverDate} onChange={e=>setHandForm({...handForm,handoverDate:e.target.value})}/></label>
          <label>Nama Karyawan<input value={handForm.employeeName} onChange={e=>setHandForm({...handForm,employeeName:e.target.value})}/></label>
          <label>NIK<input value={handForm.nik} onChange={e=>setHandForm({...handForm,nik:e.target.value})}/></label>
          <label>Pekerjaan<select value={handForm.jobTitle} onChange={e=>setHandForm({...handForm,jobTitle:e.target.value})}>{PPE_JOB_STANDARDS.map(x=><option key={x.job}>{x.job}</option>)}</select></label>
          <label>Jenis APD<select value={handForm.ppeType} onChange={e=>setHandForm({...handForm,ppeType:e.target.value})}>{PPE_CATALOG.map(x=><option key={x.name}>{x.name}</option>)}</select></label>
          <label>Qty<input type="number" min="1" value={handForm.qty} onChange={e=>setHandForm({...handForm,qty:e.target.value})}/></label>
          <label>Referensi / Dokumentasi<input value={handForm.handoverRef} onChange={e=>setHandForm({...handForm,handoverRef:e.target.value})}/></label>
          <label className={styles.check}><input type="checkbox" checked={handForm.acknowledgement} onChange={e=>setHandForm({...handForm,acknowledgement:e.target.checked})}/> Karyawan menyatakan menerima dan wajib menggunakan APD dengan benar</label>
          <button className={styles.primary}><ClipboardCheck size={17}/> Simpan Serah Terima</button>
        </form>}
      </Panel>
      <Panel title={`Register BAST · ${handRows.length} record`}>
        <div className={styles.search}><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama, NIK, APD..."/></div>
        <div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>PT</th><th>Nama / NIK</th><th>Pekerjaan</th><th>APD</th><th>Qty</th><th>Ack</th></tr></thead><tbody>{handRows.map(r=><tr key={r.id}><td>{fmt(r.handoverDate)}</td><td><b>{r.companyCode}</b></td><td><b>{r.employeeName}</b><small className={styles.block}>{r.nik||'-'}</small></td><td>{r.jobTitle||'-'}</td><td>{r.ppeType}</td><td>{r.qty}</td><td><Badge tone={r.acknowledgement?'green':'orange'}>{r.acknowledgement?'Acknowledged':'Pending'}</Badge></td></tr>)}{!handRows.length&&<tr><td colSpan="7" className={styles.empty}>Belum ada BAST APD aktual.</td></tr>}</tbody></table></div>
      </Panel>
    </div>}

    {tab==='pr'&&<>
      <Panel title="Monitoring PR APD" action={<span className={styles.formCode}>KPNPLT-FORM-SST-003.07</span>}>
        {canManage&&<form className={styles.prForm} onSubmit={savePr}>
          <select value={prForm.companyCode} onChange={e=>companySelect(e.target.value,setPrForm)}>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code}</option>)}</select>
          <input value={prForm.unit} onChange={e=>setPrForm({...prForm,unit:e.target.value})} placeholder="Unit"/>
          <input value={prForm.estate} onChange={e=>setPrForm({...prForm,estate:e.target.value})} placeholder="Kebun / Estate"/>
          <input value={prForm.prNo} onChange={e=>setPrForm({...prForm,prNo:e.target.value})} placeholder="PR No."/>
          <input value={prForm.description} onChange={e=>setPrForm({...prForm,description:e.target.value})} placeholder="Descriptions"/>
          <label>PR Date<input type="date" value={prForm.prDate} onChange={e=>setPrForm({...prForm,prDate:e.target.value})}/></label>
          <label>Sign EM<input type="date" value={prForm.signEm} onChange={e=>setPrForm({...prForm,signEm:e.target.value})}/></label>
          <label>Sign GEM<input type="date" value={prForm.signGem} onChange={e=>setPrForm({...prForm,signGem:e.target.value})}/></label>
          <label>Sign RH<input type="date" value={prForm.signRh} onChange={e=>setPrForm({...prForm,signRh:e.target.value})}/></label>
          <label>Terima EPD LO<input type="date" value={prForm.receiveEpdLo} onChange={e=>setPrForm({...prForm,receiveEpdLo:e.target.value})}/></label>
          <label>Approval HP<input type="date" value={prForm.approvalHp} onChange={e=>setPrForm({...prForm,approvalHp:e.target.value})}/></label>
          <label>EPD LO → RO<input type="date" value={prForm.epdLoToRo} onChange={e=>setPrForm({...prForm,epdLoToRo:e.target.value})}/></label>
          <label>EPD RO → Purch<input type="date" value={prForm.epdRoToPurch} onChange={e=>setPrForm({...prForm,epdRoToPurch:e.target.value})}/></label>
          <label>PO Date<input type="date" value={prForm.poDate} onChange={e=>setPrForm({...prForm,poDate:e.target.value})}/></label>
          <label>GRN Date<input type="date" value={prForm.grnDate} onChange={e=>setPrForm({...prForm,grnDate:e.target.value})}/></label>
          <select value={prForm.status} onChange={e=>setPrForm({...prForm,status:e.target.value})}><option>PR Open</option><option>Approval</option><option>Purchasing</option><option>PO Issued</option><option>GRN Complete</option><option>Cancelled</option></select>
          <button className={styles.primary}><ShoppingCart size={16}/> Simpan PR</button>
        </form>}
        <div className={styles.search}><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari PR No., description, PT..."/></div>
        <div className="table-wrap"><table><thead><tr><th>PT</th><th>PR No.</th><th>Description</th><th>PR Date</th><th>PO Date</th><th>GRN Date</th><th>Durasi Realisasi</th><th>Status</th></tr></thead><tbody>{prRows.map(r=><tr key={r.id}><td><b>{r.companyCode}</b><small className={styles.block}>{r.estate||r.unit}</small></td><td><b>{r.prNo}</b></td><td>{r.description||'-'}</td><td>{fmt(r.prDate)}</td><td>{fmt(r.poDate)}</td><td>{fmt(r.grnDate)}</td><td>{daysBetween(r.prDate,r.grnDate)===null?'-':`${daysBetween(r.prDate,r.grnDate)} hari`}</td><td><Badge tone={tone(r.status)}>{r.status}</Badge></td></tr>)}{!prRows.length&&<tr><td colSpan="8" className={styles.empty}>Belum ada monitoring PR APD aktual.</td></tr>}</tbody></table></div>
      </Panel>
    </>}
  </Shell>
}
