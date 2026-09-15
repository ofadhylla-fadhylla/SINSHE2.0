'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import { Badge, Panel, StatCard } from '../../components/Ui'
import {
  AlertTriangle, CheckCircle2, Clock3, Download, Factory, Filter, Gauge,
  Plus, QrCode, Search, ShieldCheck, Wifi, WifiOff, Wrench, X
} from 'lucide-react'
import styles from './asset-integrity.module.css'

const defaultAssets = [
  {id:'AST-BOI-001',name:'Boiler 1',category:'Boiler',unit:'PKS A',operational:'Active',monitoring:'Online',year:'2019',manufacturer:'PT Boiler Indonesia',capacity:'10 Ton/Hour',workingPressure:'12 Bar',riksaDue:'2026-10-28',sioDue:'2026-11-15',siloDue:'',calibrationDue:'2026-12-10',serial:'BLR-2019-001',owner:'Maintenance PKS A',notes:'Boiler utama proses produksi.'},
  {id:'AST-PV-015',name:'Pressure Vessel 15',category:'Pressure Vessel',unit:'PKS B',operational:'Active',monitoring:'Online',year:'2020',manufacturer:'PT Vessel Teknik',capacity:'8 m3',workingPressure:'10 Bar',riksaDue:'2026-09-25',sioDue:'',siloDue:'2026-10-05',calibrationDue:'2026-11-02',serial:'PV-2020-015',owner:'Maintenance PKS B',notes:'Receiver tank area compressor.'},
  {id:'AST-FK-023',name:'Forklift 23',category:'Forklift',unit:'Estate 3',operational:'Active',monitoring:'Online',year:'2022',manufacturer:'Toyota',capacity:'3 Ton',workingPressure:'-',riksaDue:'2026-11-10',sioDue:'2026-10-20',siloDue:'',calibrationDue:'',serial:'FLT-22-023',owner:'Warehouse Estate 3',notes:'Unit material handling.'},
  {id:'AST-CR-004',name:'Crane Overhead 4',category:'Crane',unit:'PKS C',operational:'Inactive',monitoring:'Offline',year:'2018',manufacturer:'Konecranes',capacity:'5 Ton',workingPressure:'-',riksaDue:'2026-08-15',sioDue:'2026-08-30',siloDue:'',calibrationDue:'',serial:'CRN-18-004',owner:'Maintenance PKS C',notes:'Tidak boleh dioperasikan sebelum renewal.'},
  {id:'AST-EL-067',name:'Panel LVMDP 67',category:'Electrical',unit:'PKS A',operational:'Active',monitoring:'Online',year:'2021',manufacturer:'Schneider',capacity:'1600 A',workingPressure:'-',riksaDue:'2026-12-30',sioDue:'',siloDue:'',calibrationDue:'2026-10-30',serial:'LVM-21-067',owner:'Electrical PKS A',notes:'Main LV distribution panel.'},
  {id:'AST-FP-010',name:'Fire Pump 10',category:'Fire Protection',unit:'PKS B',operational:'Active',monitoring:'Online',year:'2020',manufacturer:'Ebara',capacity:'1500 GPM',workingPressure:'10 Bar',riksaDue:'2026-09-20',sioDue:'',siloDue:'',calibrationDue:'2026-10-10',serial:'FP-20-010',owner:'HSE PKS B',notes:'Diesel fire pump utama.'},
  {id:'AST-HY-021',name:'Hydrant 21',category:'Hydrant',unit:'Estate 2',operational:'Active',monitoring:'Online',year:'2023',manufacturer:'Local Fabrication',capacity:'-',workingPressure:'7 Bar',riksaDue:'2026-12-20',sioDue:'',siloDue:'',calibrationDue:'2026-11-18',serial:'HY-23-021',owner:'HSE Estate 2',notes:'Hydrant pillar area workshop.'},
  {id:'AST-PV-028',name:'Pressure Vessel 28',category:'Pressure Vessel',unit:'PKS C',operational:'Inactive',monitoring:'Offline',year:'2017',manufacturer:'PT Vessel Teknik',capacity:'5 m3',workingPressure:'8 Bar',riksaDue:'2026-07-01',sioDue:'',siloDue:'2026-08-25',calibrationDue:'2026-08-10',serial:'PV-17-028',owner:'Maintenance PKS C',notes:'Isolasi sampai pemeriksaan ulang selesai.'}
]

const categories=['Boiler','Pressure Vessel','Forklift','Crane','Electrical','Fire Protection','Hydrant']
const units=['PKS A','PKS B','PKS C','Estate 1','Estate 2','Estate 3','Head Office','Laboratorium']
const categoryReference={Boiler:12,'Pressure Vessel':28,Forklift:56,Crane:18,Electrical:63,'Fire Protection':31,Hydrant:37}
const emptyForm={name:'',category:'Boiler',unit:'PKS A',operational:'Active',monitoring:'Online',year:'2026',manufacturer:'',capacity:'',workingPressure:'',riksaDue:'',sioDue:'',siloDue:'',calibrationDue:'',serial:'',owner:'',notes:''}

function parseDate(value){return value?new Date(`${value}T23:59:59`):null}
function daysTo(value){if(!value)return null;return Math.ceil((parseDate(value)-new Date())/86400000)}
function assetStatus(asset){
  const dates=[asset.riksaDue,asset.sioDue,asset.siloDue,asset.calibrationDue].filter(Boolean)
  if(!dates.length)return 'Normal'
  const days=Math.min(...dates.map(daysTo))
  if(days<0)return 'Expired'
  if(days<=30)return 'Due Soon'
  return 'Normal'
}
function statusTone(status){return status==='Normal'?'green':status==='Due Soon'?'orange':'red'}
function fmt(value){return value?new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${value}T00:00:00`)):'-'}
function nearestDue(asset){
  const docs=[['Riksa Uji',asset.riksaDue],['SIO',asset.sioDue],['SILO',asset.siloDue],['Calibration',asset.calibrationDue]].filter(x=>x[1])
  if(!docs.length)return null
  return docs.sort((a,b)=>parseDate(a[1])-parseDate(b[1]))[0]
}

export default function AssetIntegrity(){
  const [assets,setAssets]=useState(defaultAssets)
  const [selectedId,setSelectedId]=useState(defaultAssets[0].id)
  const [search,setSearch]=useState('')
  const [filterCategory,setFilterCategory]=useState('All')
  const [filterStatus,setFilterStatus]=useState('All')
  const [filterUnit,setFilterUnit]=useState('All')
  const [modalOpen,setModalOpen]=useState(false)
  const [form,setForm]=useState(emptyForm)
  const [notice,setNotice]=useState('')

  useEffect(()=>{try{const saved=localStorage.getItem('sinshe-assets');if(saved){const parsed=JSON.parse(saved);setAssets(parsed);if(parsed.length)setSelectedId(parsed[0].id)}}catch{}},[])
  useEffect(()=>{try{localStorage.setItem('sinshe-assets',JSON.stringify(assets))}catch{}},[assets])

  const selected=assets.find(a=>a.id===selectedId)||assets[0]
  const rows=useMemo(()=>assets.filter(a=>{
    const q=search.trim().toLowerCase()
    const text=[a.id,a.name,a.category,a.unit,a.manufacturer,a.serial,a.owner].join(' ').toLowerCase()
    const status=assetStatus(a)
    return (!q||text.includes(q))&&(filterCategory==='All'||a.category===filterCategory)&&(filterStatus==='All'||status===filterStatus)&&(filterUnit==='All'||a.unit===filterUnit)
  }),[assets,search,filterCategory,filterStatus,filterUnit])

  const counts={Normal:assets.filter(a=>assetStatus(a)==='Normal').length,'Due Soon':assets.filter(a=>assetStatus(a)==='Due Soon').length,Expired:assets.filter(a=>assetStatus(a)==='Expired').length}
  const active=assets.filter(a=>a.operational==='Active').length
  const online=assets.filter(a=>a.monitoring==='Online').length
  const nearest=selected?nearestDue(selected):null
  const nearestDays=nearest?daysTo(nearest[1]):null

  function flash(text){setNotice(text);setTimeout(()=>setNotice(''),3000)}
  function saveAsset(e){
    e.preventDefault()
    if(!form.name.trim()||!form.manufacturer.trim()||!form.serial.trim()||!form.owner.trim()){flash('Lengkapi nama aset, manufacturer, serial number dan asset owner.');return}
    const prefix={Boiler:'BOI','Pressure Vessel':'PV',Forklift:'FK',Crane:'CR',Electrical:'EL','Fire Protection':'FP',Hydrant:'HY'}[form.category]||'AST'
    const seq=Math.max(0,...assets.map(a=>Number(a.id.split('-').pop())||0))+1
    const item={id:`AST-${prefix}-${String(seq).padStart(3,'0')}`,...form}
    setAssets(prev=>[item,...prev]);setSelectedId(item.id);setForm(emptyForm);setModalOpen(false);flash(`${item.id} berhasil ditambahkan ke Asset Register.`)
  }
  function toggleOperational(){
    if(!selected)return
    const next=selected.operational==='Active'?'Inactive':'Active'
    setAssets(prev=>prev.map(a=>a.id===selected.id?{...a,operational:next}:a));flash(`${selected.id} status operasional: ${next}.`)
  }
  function exportCSV(){
    const header=['Asset ID','Asset Name','Category','Unit','Status','Operational','Monitoring','Riksa Uji Due','SIO Due','SILO Due','Calibration Due','Manufacturer','Serial','Owner']
    const data=rows.map(a=>[a.id,a.name,a.category,a.unit,assetStatus(a),a.operational,a.monitoring,a.riksaDue,a.sioDue,a.siloDue,a.calibrationDue,a.manufacturer,a.serial,a.owner])
    const csv=[header,...data].map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n')
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const el=document.createElement('a');el.href=url;el.download=`SINSHE_Asset_Register_${new Date().toISOString().slice(0,10)}.csv`;el.click();URL.revokeObjectURL(url)
  }

  return <Shell title="Asset Integrity Management" subtitle="Pengelolaan aset kritikal terintegrasi untuk keandalan, keselamatan, kepatuhan dan umur aset optimal.">
    {notice&&<div className={styles.notice}><CheckCircle2 size={18}/>{notice}</div>}

    <div className="stats-grid four">
      <StatCard label="Normal" value={counts.Normal} hint="dokumen >30 hari" tone="green" icon={<CheckCircle2/>}/>
      <StatCard label="Due Soon" value={counts['Due Soon']} hint="jatuh tempo ≤30 hari" tone="orange" icon={<Clock3/>}/>
      <StatCard label="Expired / Overdue" value={counts.Expired} hint="perlu tindakan segera" tone="red" icon={<AlertTriangle/>}/>
      <StatCard label="Asset Register" value={assets.length} hint={`${active} aktif • ${online} online`} tone="blue" icon={<Factory/>}/>
    </div>

    <div className={styles.categoryGrid}>
      {categories.map(c=><div className={styles.categoryCard} key={c}><span>{c}</span><b>{categoryReference[c]}</b><small className={styles.muted}>reference portfolio</small></div>)}
    </div>

    <div className={styles.toolbar}>
      <div><h2>Dashboard Asset Integrity</h2><p>Monitor riksa uji, SIO, SILO, kalibrasi dan status operasional seluruh aset kritikal.</p></div>
      <div className={styles.buttons}><button className={styles.secondary} onClick={exportCSV}><Download size={17}/> Export CSV</button><button className={styles.primary} onClick={()=>setModalOpen(true)}><Plus size={18}/> Tambah Asset</button></div>
    </div>

    <div className="dashboard-split">
      <Panel className="table-panel">
        <div className={styles.filters}>
          <label><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari asset ID, nama, serial, owner..."/></label>
          <label><Filter size={14}/><select value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}><option>All</option>{categories.map(v=><option key={v}>{v}</option>)}</select></label>
          <label><select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option>All</option><option>Normal</option><option>Due Soon</option><option>Expired</option></select></label>
          <label><select value={filterUnit} onChange={e=>setFilterUnit(e.target.value)}><option>All</option>{units.map(v=><option key={v}>{v}</option>)}</select></label>
        </div>
        <div className="table-wrap"><table>
          <thead><tr><th>Asset ID</th><th>Nama Aset</th><th>Kategori</th><th>Lokasi</th><th>Status</th><th>Riksa Uji</th><th>SIO</th><th>SILO</th><th>Calibration</th><th>Monitoring</th><th>QR</th></tr></thead>
          <tbody>{rows.map(a=>{const status=assetStatus(a);return <tr key={a.id} onClick={()=>setSelectedId(a.id)} className={`${styles.clickable} ${selectedId===a.id?styles.selectedRow:''}`}>
            <td><div className={styles.assetId}><b>{a.id}</b><small>{a.serial}</small></div></td><td><b>{a.name}</b></td><td>{a.category}</td><td>{a.unit}</td><td><Badge tone={statusTone(status)}>{status}</Badge></td>
            {[a.riksaDue,a.sioDue,a.siloDue,a.calibrationDue].map((d,i)=><td key={i}><div className={styles.dueCell}><span className={d&&daysTo(d)<0?styles.overdue:''}>{fmt(d)}</span>{d&&<small>{daysTo(d)<0?`${Math.abs(daysTo(d))} hari overdue`:`${daysTo(d)} hari`}</small>}</div></td>)}
            <td><Badge tone={a.monitoring==='Online'?'green':'red'}>{a.monitoring==='Online'?<Wifi size={12}/>:<WifiOff size={12}/>} {a.monitoring}</Badge></td><td><QrCode size={20}/></td>
          </tr>})}{!rows.length&&<tr><td colSpan="11" style={{textAlign:'center',padding:24,color:'var(--muted)'}}>Tidak ada asset yang sesuai filter.</td></tr>}</tbody>
        </table></div>
      </Panel>

      {selected&&<Panel className="detail-panel" title="Detail Asset">
        <div className={styles.detailHeader}><div><h3>{selected.name}</h3><p>{selected.id} • {selected.category}</p></div><Badge tone={statusTone(assetStatus(selected))}>{assetStatus(selected)}</Badge></div>
        <div className={styles.detailVisual}><div className={styles.machine}/><div className={styles.qr}><QrCode size={42}/></div></div>
        <div className={styles.detailGrid}>
          <div className={styles.detailItem}><span>Lokasi</span><b>{selected.unit}</b></div><div className={styles.detailItem}><span>Tahun</span><b>{selected.year||'-'}</b></div>
          <div className={styles.detailItem}><span>Manufacturer</span><b>{selected.manufacturer}</b></div><div className={styles.detailItem}><span>Serial No.</span><b>{selected.serial}</b></div>
          <div className={styles.detailItem}><span>Kapasitas</span><b>{selected.capacity||'-'}</b></div><div className={styles.detailItem}><span>Tekanan Kerja</span><b>{selected.workingPressure||'-'}</b></div>
          <div className={styles.detailItem}><span>Asset Owner</span><b>{selected.owner}</b></div><div className={styles.detailItem}><span>Status Operasional</span><b>{selected.operational}</b></div>
        </div>
        {nearest&&<div className={styles.dueBox}><div className={styles.dueBoxTop}><span>Next Due: {nearest[0]}</span><Badge tone={nearestDays<0?'red':nearestDays<=30?'orange':'green'}>{nearestDays<0?`${Math.abs(nearestDays)} hari overdue`:`${nearestDays} hari`}</Badge></div><b>{fmt(nearest[1])}</b><div className={styles.healthBar}><span style={{width:`${Math.max(5,Math.min(100,nearestDays>90?100:nearestDays<0?5:(nearestDays/90)*100))}%`}}/></div></div>}
        <div className={styles.docList}>
          {[['Riksa Uji',selected.riksaDue],['SIO',selected.sioDue],['SILO',selected.siloDue],['Calibration',selected.calibrationDue]].map(([label,date])=><div className={styles.docItem} key={label}><span>{label}</span><b className={date&&daysTo(date)<0?styles.overdue:''}>{fmt(date)}</b></div>)}
        </div>
        <button className="primary-btn" onClick={toggleOperational}>{selected.operational==='Active'?'Nonaktifkan Asset':'Aktifkan Asset'}</button>
      </Panel>}
    </div>

    <div className="benefit-row">
      <div><ShieldCheck/><b>Keselamatan Terjamin</b><span>Risiko kegagalan asset dikendalikan.</span></div><div><Wrench/><b>Kepatuhan Terpenuhi</b><span>Riksa uji & izin terpantau.</span></div><div><Gauge/><b>Kinerja Optimal</b><span>Maintenance lebih terencana.</span></div><div><Factory/><b>Umur Asset Maksimal</b><span>Lifecycle asset terdokumentasi.</span></div>
    </div>

    {modalOpen&&<div className={styles.modalBackdrop} onMouseDown={e=>{if(e.target===e.currentTarget)setModalOpen(false)}}><div className={styles.modal} role="dialog" aria-modal="true">
      <div className={styles.modalHeader}><div><h2>Tambah Asset Kritikal</h2><p>Registrasi asset baru ke SINSHE 2.0 Asset Integrity.</p></div><button className={styles.iconButton} onClick={()=>setModalOpen(false)}><X size={18}/></button></div>
      <form className={styles.form} onSubmit={saveAsset}><div className={styles.formGrid}>
        <label>Nama Asset<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Contoh: Boiler 2"/></label>
        <label>Kategori<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(v=><option key={v}>{v}</option>)}</select></label>
        <label>Unit / Lokasi<select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>{units.map(v=><option key={v}>{v}</option>)}</select></label>
        <label>Manufacturer<input value={form.manufacturer} onChange={e=>setForm({...form,manufacturer:e.target.value})}/></label><label>Serial Number<input value={form.serial} onChange={e=>setForm({...form,serial:e.target.value})}/></label><label>Tahun Pembuatan<input type="number" value={form.year} onChange={e=>setForm({...form,year:e.target.value})}/></label>
        <label>Kapasitas<input value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})}/></label><label>Tekanan Kerja<input value={form.workingPressure} onChange={e=>setForm({...form,workingPressure:e.target.value})}/></label><label>Asset Owner<input value={form.owner} onChange={e=>setForm({...form,owner:e.target.value})}/></label>
        <label>Riksa Uji Next Due<input type="date" value={form.riksaDue} onChange={e=>setForm({...form,riksaDue:e.target.value})}/></label><label>SIO Next Due<input type="date" value={form.sioDue} onChange={e=>setForm({...form,sioDue:e.target.value})}/></label><label>SILO Next Due<input type="date" value={form.siloDue} onChange={e=>setForm({...form,siloDue:e.target.value})}/></label>
        <label>Calibration Next Due<input type="date" value={form.calibrationDue} onChange={e=>setForm({...form,calibrationDue:e.target.value})}/></label><label>Status Operasional<select value={form.operational} onChange={e=>setForm({...form,operational:e.target.value})}><option>Active</option><option>Inactive</option></select></label><label>Monitoring<select value={form.monitoring} onChange={e=>setForm({...form,monitoring:e.target.value})}><option>Online</option><option>Offline</option></select></label>
        <label className={styles.span3}>Catatan<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Catatan kondisi, pembatasan operasi, atau informasi teknis lain..."/></label>
      </div><div className={styles.formFooter}><button type="button" className={styles.secondary} onClick={()=>setModalOpen(false)}>Batal</button><button type="submit" className={styles.primary}>Simpan Asset</button></div></form>
    </div></div>}
  </Shell>
}
