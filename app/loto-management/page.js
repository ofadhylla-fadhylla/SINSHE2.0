'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge, Panel, StatCard } from '../../components/Ui'
import { AlertTriangle, CheckCircle2, ClipboardCheck, Download, Lock, Package, Plus, Search, ShieldCheck, Unlock } from 'lucide-react'
import { COMPANY_MASTER, DEFAULT_COMPANY_FILTERS, filteredCompanies } from '../../lib/company-master'
import { dbSelect, dbUpdate, dbUpsert, getStoredProfile, isSupabaseConfigured } from '../../lib/supabase-rest'
import styles from './loto-management.module.css'

const INSTALL_FORM = [
  { no:1, title:'PERSIAPAN PENERAPAN', question:'Apakah identifikasi dan control bahaya telah dilakukan dan didiskusikan dengan operator dan pegawai terkait lainnya?' },
  { no:2, title:'PEMBERITAHUAN MENJELANG PEMASANGAN', question:'Apakah operator dan pekerja terkait telah diberitahukan bahwa prosedur akan diterapkan?' },
  { no:3, title:'PERSIAPAN MEMATIKAN MESIN / PERALATAN / FASILITAS', question:'Apakah mekanik/pekerja terkait telah mengidentifikasi kemampuan alat pengisolasi energi sebelum melakukan shutdown?' },
  { no:4, title:'ISOLASI SUMBER ENERGI', question:'Apakah semua alat pengisolasi energi telah dioperasikan untuk pengisolasian dan apakah kunci dan label telah dipasang oleh mekanik/pekerja terkait?' },
  { no:5, title:'PELEPASAN ENERGI TERSIMPAN', question:'Apakah energi sisa/tersimpan telah dilepas/dinetralkan oleh mekanik/pekerja yang berwenang?' },
  { no:6, title:'PEMERIKSAAN KUNCI DAN LABEL OLEH PEKERJA BERWENANG', question:'Apakah kunci dan label telah dipasangkan pada alat pengisolasi energi oleh pegawai berwenang dan apakah alat tersebut telah terpasang dengan sempurna?' },
  { no:7, title:'PEMASTIAN PENGISOLASIAN ENERGI OLEH PEKERJA BERWENANG', question:'Apakah alat pengisolasi telah diuji, dan apakah penghilangan energi tersimpan telah dipastikan? (misal: volt meter telah digunakan untuk memeriksa beban energi)' },
]

const RELEASE_FORM = [
  { no:1, title:'PERIKSA MESIN / PERALATAN DAN KEADAAN SEKITAR', question:'Apakah mesin dan peralatan bebas dari pekerja & perkakas dan apakah komponen mesin sudah pada posisi yang benar?' },
  { no:2, title:'HUBUNGI OPERATOR', question:'Apakah operator sudah diberi tahu bahwa pekerjaan perbaikan telah selesai atau diperlukan pengujian yang mana kunci dan label akan dicabut?' },
  { no:3, title:'PERSIAPAN PENGOPERASIAN', question:'Apakah Operator/Mandor/Asisten menyatakan sudah siap untuk mengoperasikan peralatan/mesin/fasilitas?' },
  { no:4, title:'CABUT KUNCI DAN LABEL, BERI ENERGI KE MESIN DAN PERALATAN', question:'Apakah kunci dan label siap untuk dicabut?' },
  { no:5, title:'KEMBALIKAN MESIN / PERALATAN KE KEADAAN SEMULA', question:'Apakah pengoperasian berjalan lancar?' },
]

const makeChecklist = source => source.map(item => ({ ...item, answer:'', remarks:'' }))
const today = () => new Date().toISOString().slice(0,10)
const makeId = prefix => `${prefix}-${today().replaceAll('-','')}-${String(Date.now()).slice(-6)}`
const fmt = value => value ? new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value.length===10?`${value}T00:00:00`:value)) : '-'
const allYes = rows => rows.length > 0 && rows.every(row => row.answer === 'Yes')
const badgeTone = value => ['Applied','Released','Good'].includes(value) ? 'green' : ['Draft','Need Repair'].includes(value) ? 'orange' : ['Cancelled','Unserviceable','No'].includes(value) ? 'red' : 'blue'

const emptyInstall = () => ({
  companyCode:'ACP', unit:'Maintenance', lotoDate:today(), lotoTime:'', energyType:'', location:'', equipment:'', validUntil:'',
  requester:'', authorizedWorker:'', assistantReviewer:'', managerApprover:'', evidenceRef:'', permitRef:'', jsaRef:'', notes:'', checklist:makeChecklist(INSTALL_FORM)
})
const emptyRelease = () => ({
  installationId:'', companyCode:'ACP', unit:'Maintenance', lotoDate:today(), lotoTime:'', energyType:'', location:'', equipment:'', validUntil:'',
  requester:'', authorizedWorker:'', assistantReviewer:'', managerApprover:'', evidenceRef:'', notes:'', checklist:makeChecklist(RELEASE_FORM)
})
const emptyInventory = () => ({ companyCode:'ACP', unit:'Maintenance', location:'', deviceType:'Padlock / Gembok LOTO', deviceCode:'', quantity:1, condition:'Good', custodian:'', lastCheck:today(), evidenceRef:'', notes:'' })

function installFromDb(r){ return { id:r.id, companyCode:r.company_code, unit:r.unit, lotoDate:r.loto_date, lotoTime:r.loto_time||'', energyType:r.energy_type, location:r.location, equipment:r.equipment, validUntil:r.valid_until||'', requester:r.requester||'', authorizedWorker:r.authorized_worker||'', assistantReviewer:r.assistant_reviewer||'', managerApprover:r.manager_approver||'', checklist:Array.isArray(r.checklist)?r.checklist:makeChecklist(INSTALL_FORM), evidenceRef:r.evidence_ref||'', permitRef:r.permit_ref||'', jsaRef:r.jsa_ref||'', status:r.status, notes:r.notes||'' } }
function releaseFromDb(r){ return { id:r.id, installationId:r.installation_id||'', companyCode:r.company_code, unit:r.unit, lotoDate:r.loto_date, lotoTime:r.loto_time||'', energyType:r.energy_type, location:r.location, equipment:r.equipment, validUntil:r.valid_until||'', requester:r.requester||'', authorizedWorker:r.authorized_worker||'', assistantReviewer:r.assistant_reviewer||'', managerApprover:r.manager_approver||'', checklist:Array.isArray(r.checklist)?r.checklist:makeChecklist(RELEASE_FORM), evidenceRef:r.evidence_ref||'', status:r.status, notes:r.notes||'' } }
function inventoryFromDb(r){ return { id:r.id, companyCode:r.company_code, unit:r.unit, location:r.location, deviceType:r.device_type, deviceCode:r.device_code||'', quantity:Number(r.quantity||0), condition:r.condition, custodian:r.custodian||'', lastCheck:r.last_check||'', evidenceRef:r.evidence_ref||'', notes:r.notes||'' } }

export default function LotoManagement(){
  const [filters,setFilters] = useState(DEFAULT_COMPANY_FILTERS)
  const [tab,setTab] = useState('installation')
  const [installations,setInstallations] = useState([])
  const [releases,setReleases] = useState([])
  const [inventory,setInventory] = useState([])
  const [installForm,setInstallForm] = useState(emptyInstall)
  const [releaseForm,setReleaseForm] = useState(emptyRelease)
  const [inventoryForm,setInventoryForm] = useState(emptyInventory)
  const [search,setSearch] = useState('')
  const [loading,setLoading] = useState(true)
  const [notice,setNotice] = useState('')
  const [error,setError] = useState('')
  const profile = getStoredProfile()
  const canManage = !profile || profile.role !== 'Viewer'

  useEffect(()=>{
    let alive=true
    async function load(){
      if(!isSupabaseConfigured()){ setError('Supabase belum dikonfigurasi.'); setLoading(false); return }
      try{
        const [a,b,c] = await Promise.all([
          dbSelect('loto_installations','select=*&order=loto_date.desc,updated_at.desc'),
          dbSelect('loto_releases','select=*&order=loto_date.desc,updated_at.desc'),
          dbSelect('loto_inventory','select=*&order=updated_at.desc'),
        ])
        if(alive){ setInstallations((a||[]).map(installFromDb)); setReleases((b||[]).map(releaseFromDb)); setInventory((c||[]).map(inventoryFromDb)) }
      }catch(e){ if(alive)setError(e?.message||'Gagal mengambil data LOTO.') }
      finally{ if(alive)setLoading(false) }
    }
    load(); return()=>{alive=false}
  },[])

  const companies = useMemo(()=>filteredCompanies(filters),[filters])
  const allowed = useMemo(()=>new Set(companies.map(c=>c.code)),[companies])
  const scoped = rows => rows.filter(r=>allowed.has(r.companyCode))
  const scopedInstall = useMemo(()=>scoped(installations),[installations,allowed])
  const scopedRelease = useMemo(()=>scoped(releases),[releases,allowed])
  const scopedInventory = useMemo(()=>scoped(inventory),[inventory,allowed])
  const releasedInstallIds = useMemo(()=>new Set(releases.filter(r=>r.status==='Released'&&r.installationId).map(r=>r.installationId)),[releases])
  const activeInstall = scopedInstall.filter(r=>r.status==='Applied'&&!releasedInstallIds.has(r.id))
  const totalInventory = scopedInventory.reduce((s,r)=>s+Number(r.quantity||0),0)
  const badInventory = scopedInventory.filter(r=>r.condition!=='Good').reduce((s,r)=>s+Number(r.quantity||0),0)
  const q = search.trim().toLowerCase()
  const visibleInstall = scopedInstall.filter(r=>!q||[r.id,r.companyCode,r.unit,r.energyType,r.location,r.equipment,r.requester,r.status].join(' ').toLowerCase().includes(q))
  const visibleRelease = scopedRelease.filter(r=>!q||[r.id,r.installationId,r.companyCode,r.unit,r.energyType,r.location,r.equipment,r.status].join(' ').toLowerCase().includes(q))
  const visibleInventory = scopedInventory.filter(r=>!q||[r.id,r.companyCode,r.unit,r.location,r.deviceType,r.deviceCode,r.custodian,r.condition].join(' ').toLowerCase().includes(q))

  function flash(text){ setNotice(text); setTimeout(()=>setNotice(''),3500) }
  function updateChecklist(setter,index,field,value){ setter(prev=>({...prev,checklist:prev.checklist.map((row,i)=>i===index?{...row,[field]:value}:row)})) }
  function approvalsComplete(form){ return [form.requester,form.authorizedWorker,form.assistantReviewer,form.managerApprover].every(v=>String(v||'').trim()) }

  async function persistInstallation(status){
    if(!canManage)return
    const f=installForm
    if(!f.companyCode||!f.unit.trim()||!f.energyType.trim()||!f.location.trim()||!f.equipment.trim()){ flash('PT, unit, jenis energi, lokasi dan peralatan/mesin wajib diisi.'); return }
    if(status==='Applied'&&(!allYes(f.checklist)||!approvalsComplete(f))){ flash('Pemasangan LOTO hanya dapat diterapkan jika seluruh checklist Ya dan seluruh kolom otorisasi terisi.'); return }
    const id=f.id||makeId('LOTO-IN')
    const row={...f,id,status}
    const db={id,company_code:f.companyCode,unit:f.unit,form_code:'KPNPLT-FORM-SST-008.06',loto_date:f.lotoDate,loto_time:f.lotoTime||null,energy_type:f.energyType,location:f.location,equipment:f.equipment,valid_until:f.validUntil||null,requester:f.requester||null,authorized_worker:f.authorizedWorker||null,assistant_reviewer:f.assistantReviewer||null,manager_approver:f.managerApprover||null,checklist:f.checklist,evidence_ref:f.evidenceRef||null,permit_ref:f.permitRef||null,jsa_ref:f.jsaRef||null,status,notes:f.notes||null}
    try{ await dbUpsert('loto_installations',[db],'id'); setInstallations(prev=>[row,...prev.filter(x=>x.id!==id)]); setInstallForm({...emptyInstall(),companyCode:f.companyCode,unit:f.unit}); flash(status==='Applied'?`${id} diterapkan. Mesin/peralatan tetap dianggap terisolasi sampai Form Pelepasan LOTO selesai.`:`${id} tersimpan sebagai Draft.`) }
    catch(e){ flash(`Gagal menyimpan pemasangan LOTO: ${e.message}`) }
  }

  function chooseInstallation(id){
    const src=installations.find(x=>x.id===id)
    if(!src){ setReleaseForm(emptyRelease()); return }
    setReleaseForm(prev=>({...prev,installationId:src.id,companyCode:src.companyCode,unit:src.unit,energyType:src.energyType,location:src.location,equipment:src.equipment,validUntil:src.validUntil||'',requester:src.requester||'',authorizedWorker:src.authorizedWorker||'',assistantReviewer:src.assistantReviewer||'',managerApprover:src.managerApprover||'',checklist:makeChecklist(RELEASE_FORM)}))
  }

  async function persistRelease(status){
    if(!canManage)return
    const f=releaseForm
    if(!f.installationId){ flash('Pilih Form Pemasangan LOTO yang akan dilepas.'); return }
    if(status==='Released'&&(!allYes(f.checklist)||!approvalsComplete(f))){ flash('Pelepasan LOTO hanya dapat diselesaikan jika seluruh checklist Ya dan seluruh kolom otorisasi terisi.'); return }
    const id=f.id||makeId('LOTO-OUT')
    const row={...f,id,status}
    const db={id,installation_id:f.installationId,company_code:f.companyCode,unit:f.unit,form_code:'KPNPLT-FORM-SST-008.07',loto_date:f.lotoDate,loto_time:f.lotoTime||null,energy_type:f.energyType,location:f.location,equipment:f.equipment,valid_until:f.validUntil||null,requester:f.requester||null,authorized_worker:f.authorizedWorker||null,assistant_reviewer:f.assistantReviewer||null,manager_approver:f.managerApprover||null,checklist:f.checklist,evidence_ref:f.evidenceRef||null,status,notes:f.notes||null}
    try{ await dbUpsert('loto_releases',[db],'id'); setReleases(prev=>[row,...prev.filter(x=>x.id!==id)]); setReleaseForm(emptyRelease()); flash(status==='Released'?`${id} selesai. LOTO ${f.installationId} telah dilepas sesuai checklist.`:`${id} tersimpan sebagai Draft.`) }
    catch(e){ flash(`Gagal menyimpan pelepasan LOTO: ${e.message}`) }
  }

  async function saveInventory(e){
    e.preventDefault(); if(!canManage)return
    const f=inventoryForm
    if(!f.companyCode||!f.unit.trim()||!f.location.trim()||!f.deviceType.trim()){ flash('PT, unit, lokasi dan jenis alat LOTO wajib diisi.'); return }
    const id=f.id||makeId('LOTO-INV')
    const row={...f,id,quantity:Number(f.quantity||0)}
    const db={id,company_code:f.companyCode,unit:f.unit,location:f.location,device_type:f.deviceType,device_code:f.deviceCode||null,quantity:Number(f.quantity||0),condition:f.condition,custodian:f.custodian||null,last_check:f.lastCheck||null,evidence_ref:f.evidenceRef||null,notes:f.notes||null}
    try{ await dbUpsert('loto_inventory',[db],'id'); setInventory(prev=>[row,...prev.filter(x=>x.id!==id)]); setInventoryForm({...emptyInventory(),companyCode:f.companyCode,unit:f.unit,location:f.location}); flash('Inventaris alat LOTO tersimpan.') }
    catch(e){ flash(`Gagal menyimpan inventaris: ${e.message}`) }
  }

  async function cancelInstallation(id){
    if(!canManage)return
    try{ await dbUpdate('loto_installations',{id:`eq.${id}`},{status:'Cancelled'}); setInstallations(prev=>prev.map(r=>r.id===id?{...r,status:'Cancelled'}:r)); flash(`${id} dibatalkan.`) }catch(e){flash(e.message)}
  }

  function exportCSV(){
    let rows
    if(tab==='installation') rows=[['ID','PT','Unit','Tanggal','Jenis Energi','Lokasi','Peralatan/Mesin','Masa Berlaku','Pemohon','Pekerja Berwenang','Asisten Maintenance/Operasional','Manajer/Kepala Dept','Permit Ref','JSA Ref','Status'],...visibleInstall.map(r=>[r.id,r.companyCode,r.unit,r.lotoDate,r.energyType,r.location,r.equipment,r.validUntil,r.requester,r.authorizedWorker,r.assistantReviewer,r.managerApprover,r.permitRef,r.jsaRef,r.status])]
    else if(tab==='release') rows=[['ID','Pemasangan LOTO','PT','Unit','Tanggal','Jenis Energi','Lokasi','Peralatan/Mesin','Pemohon','Pekerja Berwenang','Asisten Maintenance/Operasional','Manajer/Kepala Dept','Status'],...visibleRelease.map(r=>[r.id,r.installationId,r.companyCode,r.unit,r.lotoDate,r.energyType,r.location,r.equipment,r.requester,r.authorizedWorker,r.assistantReviewer,r.managerApprover,r.status])]
    else rows=[['ID','PT','Unit','Lokasi','Jenis Alat','Kode Alat','Qty','Kondisi','PIC/Custodian','Last Check','Evidence'],...visibleInventory.map(r=>[r.id,r.companyCode,r.unit,r.location,r.deviceType,r.deviceCode,r.quantity,r.condition,r.custodian,r.lastCheck,r.evidenceRef])]
    const csv=rows.map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n')
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})); const a=document.createElement('a'); a.href=url; a.download=`SINSHE_LOTO_${tab}_${today()}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  const formHeader=(form,setter)=><div className={styles.formGrid}>
    <label>Company / PT<select value={form.companyCode} onChange={e=>setter(p=>({...p,companyCode:e.target.value}))}>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
    <label>Unit<input value={form.unit} onChange={e=>setter(p=>({...p,unit:e.target.value}))} placeholder="Maintenance / PKS / Estate"/></label>
    <label>Tanggal<input type="date" value={form.lotoDate} onChange={e=>setter(p=>({...p,lotoDate:e.target.value}))}/></label>
    <label>Waktu<input type="time" value={form.lotoTime} onChange={e=>setter(p=>({...p,lotoTime:e.target.value}))}/></label>
    <label>Jenis Energi<input value={form.energyType} onChange={e=>setter(p=>({...p,energyType:e.target.value}))} placeholder="Listrik / mekanik / tekanan / steam..."/></label>
    <label>Lokasi<input value={form.location} onChange={e=>setter(p=>({...p,location:e.target.value}))} placeholder="Lokasi pekerjaan"/></label>
    <label>Peralatan / Mesin<input value={form.equipment} onChange={e=>setter(p=>({...p,equipment:e.target.value}))} placeholder="Nama mesin / peralatan"/></label>
    <label>Masa Berlaku<input type="datetime-local" value={form.validUntil?String(form.validUntil).slice(0,16):''} onChange={e=>setter(p=>({...p,validUntil:e.target.value}))}/></label>
  </div>

  const checklistEditor=(rows,setter)=><div className={styles.checklist}>
    {rows.map((row,index)=><div className={styles.checkRow} key={row.no}>
      <div className={styles.num}>{row.no}</div><div className={styles.checkText}><b>{row.title}</b><p>{row.question}</p></div>
      <select value={row.answer} onChange={e=>updateChecklist(setter,index,'answer',e.target.value)}><option value="">Pilih</option><option>Yes</option><option>No</option></select>
      <input value={row.remarks} onChange={e=>updateChecklist(setter,index,'remarks',e.target.value)} placeholder="Keterangan"/>
    </div>)}
  </div>

  const approvals=(form,setter)=><div className={styles.approvalGrid}>
    <label>Dibuat Oleh — Pemohon<input value={form.requester} onChange={e=>setter(p=>({...p,requester:e.target.value}))}/></label>
    <label>Diperiksa — Pekerja Berwenang<input value={form.authorizedWorker} onChange={e=>setter(p=>({...p,authorizedWorker:e.target.value}))}/></label>
    <label>Diperiksa — Asisten Maintenance/Operasional<input value={form.assistantReviewer} onChange={e=>setter(p=>({...p,assistantReviewer:e.target.value}))}/></label>
    <label>Disetujui — Manajer/Kepala Dept.<input value={form.managerApprover} onChange={e=>setter(p=>({...p,managerApprover:e.target.value}))}/></label>
  </div>

  return <Shell title="LOTO Management" subtitle="Digitalisasi Form Pemasangan dan Pelepasan Lock Out Tag Out KPN Plantations serta inventaris alat LOTO.">
    {notice&&<div className={styles.notice}><CheckCircle2 size={18}/>{notice}</div>}
    {error&&<div className={styles.error}><AlertTriangle size={18}/>{error}</div>}

    <CompanyScopeBar filters={filters} onChange={setFilters} onReset={()=>setFilters(DEFAULT_COMPANY_FILTERS)}/>

    <div className="stats-grid four">
      <StatCard label="LOTO Aktif" value={activeInstall.length} hint="Applied dan belum Released" tone="red" icon={<Lock/>}/>
      <StatCard label="Pemasangan" value={scopedInstall.length} hint="KPNPLT-FORM-SST-008.06" tone="blue" icon={<ShieldCheck/>}/>
      <StatCard label="Pelepasan" value={scopedRelease.filter(r=>r.status==='Released').length} hint="KPNPLT-FORM-SST-008.07" tone="green" icon={<Unlock/>}/>
      <StatCard label="Alat LOTO" value={totalInventory} hint={`${badInventory} perlu perhatian`} tone={badInventory?'orange':'green'} icon={<Package/>}/>
    </div>

    <div className={styles.sourceStrip}><ClipboardCheck/><div><b>Sumber form aktual</b><span>Pemasangan: KPNPLT-FORM-SST-008.06 (7 checkpoint). Pelepasan: KPNPLT-FORM-SST-008.07 (5 checkpoint). Inventaris dan rekap lokasi disediakan untuk kebutuhan handover dokumen LOTO.</span></div></div>

    <div className={styles.toolbar}>
      <div className={styles.tabs}><button className={tab==='installation'?styles.active:''} onClick={()=>setTab('installation')}>Pemasangan LOTO</button><button className={tab==='release'?styles.active:''} onClick={()=>setTab('release')}>Pelepasan LOTO</button><button className={tab==='inventory'?styles.active:''} onClick={()=>setTab('inventory')}>Inventaris & Lokasi</button></div>
      <div className={styles.toolbarRight}><label className={styles.search}><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari LOTO, lokasi, mesin..."/></label><button className={styles.secondary} onClick={exportCSV}><Download size={16}/> CSV</button></div>
    </div>

    {tab==='installation'&&<>
      {canManage&&<Panel title="Formulir Pemasangan Lock Out Tag Out (LOTO) · KPNPLT-FORM-SST-008.06">
        {formHeader(installForm,setInstallForm)}
        <h4 className={styles.sectionTitle}>Daftar Periksa · Kondisi Lingkungan Disekitar Area Kerja</h4>
        {checklistEditor(installForm.checklist,setInstallForm)}
        {approvals(installForm,setInstallForm)}
        <div className={styles.formGrid}>
          <label>Referensi Work Permit<input value={installForm.permitRef} onChange={e=>setInstallForm(p=>({...p,permitRef:e.target.value}))} placeholder="Nomor izin kerja (jika ada)"/></label>
          <label>Referensi JSA<input value={installForm.jsaRef} onChange={e=>setInstallForm(p=>({...p,jsaRef:e.target.value}))} placeholder="Nomor JSA (jika ada)"/></label>
          <label>Dokumentasi / Evidence<input value={installForm.evidenceRef} onChange={e=>setInstallForm(p=>({...p,evidenceRef:e.target.value}))} placeholder="Link / nomor dokumen / foto evidence"/></label>
          <label>Catatan<input value={installForm.notes} onChange={e=>setInstallForm(p=>({...p,notes:e.target.value}))}/></label>
        </div>
        <div className={styles.actions}><button className={styles.secondary} onClick={()=>persistInstallation('Draft')}>Simpan Draft</button><button className={styles.primary} onClick={()=>persistInstallation('Applied')}><Lock size={16}/> Terapkan LOTO</button></div>
      </Panel>}
      <Panel title="Register Pemasangan LOTO" className="mt"><div className="table-wrap"><table><thead><tr><th>ID</th><th>PT</th><th>Tanggal</th><th>Energi</th><th>Lokasi / Peralatan</th><th>Otorisasi</th><th>Masa Berlaku</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
        {visibleInstall.map(r=><tr key={r.id}><td><b>{r.id}</b><small className={styles.block}>008.06</small></td><td><b>{r.companyCode}</b><small className={styles.block}>{r.unit}</small></td><td>{fmt(r.lotoDate)}<small className={styles.block}>{r.lotoTime||'-'}</small></td><td>{r.energyType}</td><td><b>{r.equipment}</b><small className={styles.block}>{r.location}</small></td><td><small>Pemohon: {r.requester||'-'}</small><small className={styles.block}>Authorized: {r.authorizedWorker||'-'}</small></td><td>{r.validUntil?fmt(r.validUntil):'-'}</td><td><Badge tone={badgeTone(r.status)}>{r.status}</Badge></td><td>{r.status==='Applied'&&!releasedInstallIds.has(r.id)?<button className={styles.linkButton} onClick={()=>{setTab('release');chooseInstallation(r.id)}}><Unlock size={14}/> Pelepasan</button>:r.status==='Draft'?<button className={styles.linkButton} onClick={()=>cancelInstallation(r.id)}>Cancel</button>:'-'}</td></tr>)}
        {!visibleInstall.length&&<tr><td colSpan="9" className={styles.empty}>{loading?'Memuat data...':'Belum ada data pemasangan LOTO.'}</td></tr>}
      </tbody></table></div></Panel>
    </>}

    {tab==='release'&&<>
      {canManage&&<Panel title="Formulir Pelepasan Lock Out Tag Out (LOTO) · KPNPLT-FORM-SST-008.07">
        <div className={styles.selectInstall}><label>Pilih Pemasangan LOTO Aktif<select value={releaseForm.installationId} onChange={e=>chooseInstallation(e.target.value)}><option value="">Pilih LOTO aktif</option>{activeInstall.map(r=><option key={r.id} value={r.id}>{r.id} · {r.companyCode} · {r.equipment} · {r.location}</option>)}</select></label></div>
        {formHeader(releaseForm,setReleaseForm)}
        <h4 className={styles.sectionTitle}>Daftar Periksa · Kondisi Lingkungan Disekitar Area Kerja</h4>
        {checklistEditor(releaseForm.checklist,setReleaseForm)}
        {approvals(releaseForm,setReleaseForm)}
        <div className={styles.formGrid}><label>Dokumentasi / Evidence<input value={releaseForm.evidenceRef} onChange={e=>setReleaseForm(p=>({...p,evidenceRef:e.target.value}))} placeholder="Link / nomor dokumen / foto evidence"/></label><label>Catatan<input value={releaseForm.notes} onChange={e=>setReleaseForm(p=>({...p,notes:e.target.value}))}/></label></div>
        <div className={styles.actions}><button className={styles.secondary} onClick={()=>persistRelease('Draft')}>Simpan Draft</button><button className={styles.primary} onClick={()=>persistRelease('Released')}><Unlock size={16}/> Selesaikan Pelepasan</button></div>
      </Panel>}
      <Panel title="Register Pelepasan LOTO" className="mt"><div className="table-wrap"><table><thead><tr><th>ID</th><th>Pemasangan</th><th>PT</th><th>Tanggal</th><th>Lokasi / Peralatan</th><th>Energi</th><th>Status</th><th>Evidence</th></tr></thead><tbody>
        {visibleRelease.map(r=><tr key={r.id}><td><b>{r.id}</b><small className={styles.block}>008.07</small></td><td>{r.installationId||'-'}</td><td><b>{r.companyCode}</b><small className={styles.block}>{r.unit}</small></td><td>{fmt(r.lotoDate)}<small className={styles.block}>{r.lotoTime||'-'}</small></td><td><b>{r.equipment}</b><small className={styles.block}>{r.location}</small></td><td>{r.energyType}</td><td><Badge tone={badgeTone(r.status)}>{r.status}</Badge></td><td>{r.evidenceRef||'-'}</td></tr>)}
        {!visibleRelease.length&&<tr><td colSpan="8" className={styles.empty}>Belum ada data pelepasan LOTO.</td></tr>}
      </tbody></table></div></Panel>
    </>}

    {tab==='inventory'&&<>
      {canManage&&<Panel title="Inventaris Alat LOTO & Rekap Lokasi">
        <form onSubmit={saveInventory} className={styles.formGrid}>
          <label>Company / PT<select value={inventoryForm.companyCode} onChange={e=>setInventoryForm(p=>({...p,companyCode:e.target.value}))}>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
          <label>Unit<input value={inventoryForm.unit} onChange={e=>setInventoryForm(p=>({...p,unit:e.target.value}))}/></label>
          <label>Lokasi<input value={inventoryForm.location} onChange={e=>setInventoryForm(p=>({...p,location:e.target.value}))} placeholder="Workshop / Boiler / Panel..."/></label>
          <label>Jenis Alat LOTO<input value={inventoryForm.deviceType} onChange={e=>setInventoryForm(p=>({...p,deviceType:e.target.value}))}/></label>
          <label>Kode / ID Alat<input value={inventoryForm.deviceCode} onChange={e=>setInventoryForm(p=>({...p,deviceCode:e.target.value}))}/></label>
          <label>Jumlah<input type="number" min="0" value={inventoryForm.quantity} onChange={e=>setInventoryForm(p=>({...p,quantity:e.target.value}))}/></label>
          <label>Kondisi<select value={inventoryForm.condition} onChange={e=>setInventoryForm(p=>({...p,condition:e.target.value}))}><option>Good</option><option>Need Repair</option><option>Unserviceable</option></select></label>
          <label>PIC / Custodian<input value={inventoryForm.custodian} onChange={e=>setInventoryForm(p=>({...p,custodian:e.target.value}))}/></label>
          <label>Pemeriksaan Terakhir<input type="date" value={inventoryForm.lastCheck} onChange={e=>setInventoryForm(p=>({...p,lastCheck:e.target.value}))}/></label>
          <label>Dokumentasi / Evidence<input value={inventoryForm.evidenceRef} onChange={e=>setInventoryForm(p=>({...p,evidenceRef:e.target.value}))}/></label>
          <label className={styles.span2}>Catatan<input value={inventoryForm.notes} onChange={e=>setInventoryForm(p=>({...p,notes:e.target.value}))}/></label>
          <div className={styles.actions}><button className={styles.primary} type="submit"><Plus size={16}/> Simpan Inventaris</button></div>
        </form>
      </Panel>}
      <Panel title="Tabel Inventarisasi Alat LOTO" className="mt"><div className="table-wrap"><table><thead><tr><th>ID</th><th>PT</th><th>Lokasi</th><th>Jenis Alat</th><th>Kode</th><th>Qty</th><th>Kondisi</th><th>PIC</th><th>Last Check</th><th>Evidence</th></tr></thead><tbody>
        {visibleInventory.map(r=><tr key={r.id}><td><b>{r.id}</b></td><td><b>{r.companyCode}</b><small className={styles.block}>{r.unit}</small></td><td>{r.location}</td><td>{r.deviceType}</td><td>{r.deviceCode||'-'}</td><td><b>{r.quantity}</b></td><td><Badge tone={badgeTone(r.condition)}>{r.condition}</Badge></td><td>{r.custodian||'-'}</td><td>{fmt(r.lastCheck)}</td><td>{r.evidenceRef||'-'}</td></tr>)}
        {!visibleInventory.length&&<tr><td colSpan="10" className={styles.empty}>Belum ada inventaris alat LOTO.</td></tr>}
      </tbody></table></div></Panel>
    </>}
  </Shell>
}
