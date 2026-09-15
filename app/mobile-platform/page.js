'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge, Panel, StatCard } from '../../components/Ui'
import {
  AlertTriangle, Camera, CheckCircle2, ClipboardCheck, Clock3, FileSearch,
  MapPin, QrCode, Search, Send, ShieldCheck, Siren, Smartphone, Wifi, WifiOff
} from 'lucide-react'
import { COMPANY_MASTER, DEFAULT_COMPANY_FILTERS, companyCodeOf, filteredCompanies } from '../../lib/company-master'
import styles from './mobile-platform.module.css'

const DRAFT_KEY = 'sinshe-mobile-drafts'
const reportTypes = ['Unsafe Action','Unsafe Condition','Near Miss','Positive Act']

function safeRead(key){
  try { const raw=localStorage.getItem(key); return raw?JSON.parse(raw):[] } catch { return [] }
}
function safeWrite(key,value){
  try { localStorage.setItem(key,JSON.stringify(value)) } catch {}
}
function scopeRows(rows,filters){
  const allowed=new Set(filteredCompanies(filters).map(c=>c.code))
  const specific=filters.company!=='All'||filters.region!=='All'||filters.province!=='All'||filters.pic!=='All'
  return (Array.isArray(rows)?rows:[]).filter(item=>{
    const code=companyCodeOf(item)
    return !code ? !specific : allowed.has(code)
  })
}
function fmtDateTime(value){
  if(!value) return '-'
  const d=new Date(value)
  return Number.isNaN(d.getTime())?'-':new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(d)
}

export default function MobilePlatform(){
  const [filters,setFilters]=useState(DEFAULT_COMPANY_FILTERS)
  const [online,setOnline]=useState(true)
  const [location,setLocation]=useState(null)
  const [locationStatus,setLocationStatus]=useState('Belum diambil')
  const [drafts,setDrafts]=useState([])
  const [assets,setAssets]=useState([])
  const [query,setQuery]=useState('')
  const [assetResult,setAssetResult]=useState(null)
  const [notice,setNotice]=useState('')
  const [form,setForm]=useState({companyCode:'ACP',type:'Unsafe Action',title:'',locationText:'',notes:'',photoName:''})

  useEffect(()=>{
    const sync=()=>setOnline(navigator.onLine)
    sync()
    window.addEventListener('online',sync)
    window.addEventListener('offline',sync)
    setDrafts(safeRead(DRAFT_KEY))
    setAssets(safeRead('sinshe-assets'))
    return()=>{window.removeEventListener('online',sync);window.removeEventListener('offline',sync)}
  },[])

  const companies=useMemo(()=>filteredCompanies(filters),[filters])
  const scopedDrafts=useMemo(()=>scopeRows(drafts,filters),[drafts,filters])
  const scopedAssets=useMemo(()=>scopeRows(assets,filters),[assets,filters])
  const scopedObs=useMemo(()=>scopeRows(typeof window==='undefined'?[]:safeRead('sinshe-observations'),filters),[filters,drafts])
  const scopedIncidents=useMemo(()=>scopeRows(typeof window==='undefined'?[]:safeRead('sinshe-incidents'),filters),[filters,drafts])
  const scopedPermits=useMemo(()=>scopeRows(typeof window==='undefined'?[]:safeRead('sinshe-permits'),filters),[filters,drafts])

  function flash(text){setNotice(text);setTimeout(()=>setNotice(''),3200)}

  function getLocation(){
    if(!navigator.geolocation){setLocationStatus('GPS tidak didukung browser');return}
    setLocationStatus('Mengambil lokasi…')
    navigator.geolocation.getCurrentPosition(
      pos=>{
        const next={lat:pos.coords.latitude,long:pos.coords.longitude,accuracy:pos.coords.accuracy}
        setLocation(next)
        setLocationStatus(`Akurasi ±${Math.round(pos.coords.accuracy)} m`)
      },
      ()=>setLocationStatus('Izin lokasi tidak diberikan / lokasi gagal dibaca'),
      {enableHighAccuracy:true,timeout:10000,maximumAge:60000}
    )
  }

  function saveDraft(e){
    e.preventDefault()
    if(!form.title.trim()||!form.locationText.trim()){flash('Lengkapi ringkasan laporan dan lokasi kerja.');return}
    const item={
      id:`MOB-${Date.now()}`,
      ...form,
      gps:location?`${location.lat.toFixed(6)},${location.long.toFixed(6)}`:'',
      createdAt:new Date().toISOString(),
      status:'Draft',
    }
    const next=[item,...drafts]
    setDrafts(next);safeWrite(DRAFT_KEY,next)
    setForm(prev=>({...prev,title:'',locationText:'',notes:'',photoName:''}))
    flash('Draft mobile tersimpan di perangkat ini. Bisa dikirim saat koneksi tersedia.')
  }

  function sendDraft(item){
    if(!online){flash('Perangkat sedang offline. Draft tetap aman di perangkat.');return}
    try{
      const observations=safeRead('sinshe-observations')
      const obs={
        id:`OBS-${String(Date.now()).slice(-6)}`,
        companyCode:item.companyCode,
        date:new Date().toISOString().slice(0,10),
        type:item.type,
        description:item.title,
        unit:'Field / Mobile',
        location:item.gps?`${item.locationText} • GPS ${item.gps}`:item.locationText,
        risk:item.type==='Near Miss'?'High':'Medium',
        status:'Open',pic:'',dueDate:'',action:item.notes||'',evidence:item.photoName||'',
      }
      safeWrite('sinshe-observations',[obs,...observations])
      const next=drafts.map(d=>d.id===item.id?{...d,status:'Submitted',submittedAt:new Date().toISOString()}:d)
      setDrafts(next);safeWrite(DRAFT_KEY,next)
      window.dispatchEvent(new CustomEvent('sinshe-central-data',{detail:{key:'sinshe-observations'}}))
      flash(`${item.id} dikirim ke Inspection & Observation.`)
    }catch{flash('Draft belum dapat dikirim. Data tetap tersimpan di perangkat.')}
  }

  function lookupAsset(raw=query){
    const q=String(raw||'').trim().toLowerCase()
    if(!q){setAssetResult(null);return}
    const found=scopedAssets.find(a=>[a.id,a.serial,a.name].some(v=>String(v||'').toLowerCase()===q)) || scopedAssets.find(a=>[a.id,a.serial,a.name].join(' ').toLowerCase().includes(q))
    setAssetResult(found||false)
  }

  async function scanQrImage(file){
    if(!file)return
    if(!('BarcodeDetector' in window)){flash('QR detector browser belum tersedia. Gunakan pencarian Asset ID / Serial.');return}
    try{
      const bitmap=await createImageBitmap(file)
      const detector=new window.BarcodeDetector({formats:['qr_code']})
      const codes=await detector.detect(bitmap)
      const value=codes?.[0]?.rawValue||''
      if(!value){flash('QR tidak terbaca dari gambar.');return}
      setQuery(value);lookupAsset(value);flash(`QR terbaca: ${value}`)
    }catch{flash('QR belum dapat dibaca. Coba foto yang lebih jelas atau gunakan pencarian manual.')}
  }

  return <Shell title="Mobile Platform" subtitle="Akses lapangan SINSHE 2.0 melalui web mobile untuk pelaporan cepat, lokasi, kamera, QR dan workflow operasional.">
    {notice&&<div className={styles.notice}><CheckCircle2 size={18}/>{notice}</div>}

    <CompanyScopeBar filters={filters} onChange={setFilters} onReset={()=>setFilters(DEFAULT_COMPANY_FILTERS)}/>

    <div className="stats-grid four">
      <StatCard label="Connectivity" value={online?'Online':'Offline'} hint={online?'siap akses central sync':'draft tetap dapat disimpan lokal'} tone={online?'green':'orange'} icon={online?<Wifi/>:<WifiOff/>}/>
      <StatCard label="Mobile Draft" value={scopedDrafts.filter(d=>d.status!=='Submitted').length} hint={`${scopedDrafts.filter(d=>d.status==='Submitted').length} sudah dikirim`} tone="blue" icon={<Smartphone/>}/>
      <StatCard label="Safety Observation" value={scopedObs.length} hint="scope PT terpilih" tone="green" icon={<ClipboardCheck/>}/>
      <StatCard label="Active PTW" value={scopedPermits.filter(p=>p.status==='Active').length} hint={`${scopedIncidents.filter(i=>i.status!=='Closed').length} incident aktif`} tone="purple" icon={<ShieldCheck/>}/>
    </div>

    <div className={styles.mobileGrid}>
      <Panel title="Field Quick Actions">
        <div className={styles.quickGrid}>
          <Link href="/inspection"><ClipboardCheck/><b>Safety Observation</b><span>Unsafe action, unsafe condition, near miss.</span></Link>
          <Link href="/incident"><Siren/><b>Report Incident</b><span>Pelaporan insiden dan investigasi.</span></Link>
          <Link href="/hazard-risk"><AlertTriangle/><b>Hazard / HIRA</b><span>Risk register dan residual risk.</span></Link>
          <Link href="/permit-to-work"><ShieldCheck/><b>Permit to Work</b><span>Cek approval dan permit aktif.</span></Link>
        </div>
      </Panel>

      <Panel title="Device Capability">
        <div className={styles.deviceList}>
          <div><span className={styles.deviceIcon}><MapPin/></span><span><b>GPS Location</b><small>{location?`${location.lat.toFixed(5)}, ${location.long.toFixed(5)}`:locationStatus}</small></span><button onClick={getLocation}>Ambil GPS</button></div>
          <label className={styles.cameraRow}><span className={styles.deviceIcon}><Camera/></span><span><b>Camera Evidence</b><small>{form.photoName||'Ambil foto untuk draft laporan'}</small></span><input type="file" accept="image/*" capture="environment" onChange={e=>setForm({...form,photoName:e.target.files?.[0]?.name||''})}/><em>Camera</em></label>
          <label className={styles.cameraRow}><span className={styles.deviceIcon}><QrCode/></span><span><b>QR Asset Scan</b><small>Browser yang mendukung BarcodeDetector</small></span><input type="file" accept="image/*" capture="environment" onChange={e=>scanQrImage(e.target.files?.[0])}/><em>Scan</em></label>
        </div>
      </Panel>
    </div>

    <div className={styles.mobileGrid}>
      <Panel title="Quick Safety Draft">
        <form className={styles.form} onSubmit={saveDraft}>
          <div className={styles.formGrid}>
            <label>Company / PT<select value={form.companyCode} onChange={e=>setForm({...form,companyCode:e.target.value})}>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
            <label>Jenis Laporan<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>{reportTypes.map(v=><option key={v}>{v}</option>)}</select></label>
            <label className={styles.span2}>Ringkasan<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Contoh: Guard conveyor terbuka"/></label>
            <label className={styles.span2}>Lokasi Kerja<input value={form.locationText} onChange={e=>setForm({...form,locationText:e.target.value})} placeholder="Workshop / Mill / Block / Station"/></label>
            <label className={styles.span2}>Tindakan / Catatan<textarea rows="3" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Tindakan awal atau informasi tambahan..."/></label>
          </div>
          <div className={styles.draftMeta}><span><Camera size={14}/> {form.photoName||'Tanpa foto'}</span><span><MapPin size={14}/> {location?'GPS tersimpan':'GPS belum diambil'}</span></div>
          <button className={styles.primary} type="submit"><Smartphone size={17}/> Simpan Draft di Perangkat</button>
        </form>
      </Panel>

      <Panel title="QR / Asset Lookup">
        <div className={styles.lookup}>
          <label><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();lookupAsset()}}} placeholder="Asset ID / serial / nama asset"/></label>
          <button onClick={()=>lookupAsset()}><FileSearch size={16}/> Cari Asset</button>
        </div>
        {assetResult===false&&<div className={styles.empty}>Asset tidak ditemukan pada scope PT yang dipilih.</div>}
        {assetResult&&<div className={styles.assetCard}>
          <div><span>{assetResult.id}</span><h3>{assetResult.name}</h3><p>{assetResult.category} • {assetResult.unit}</p></div>
          <Badge tone={assetResult.operational==='Active'?'green':'red'}>{assetResult.operational||'Unknown'}</Badge>
          <div className={styles.assetDetails}><span>Serial<b>{assetResult.serial||'-'}</b></span><span>Monitoring<b>{assetResult.monitoring||'-'}</b></span><span>Owner<b>{assetResult.owner||'-'}</b></span></div>
          <Link href="/asset-integrity">Buka Asset Integrity →</Link>
        </div>}
        {!assetResult&&<div className={styles.scanHint}><QrCode size={44}/><b>Scan QR atau ketik Asset ID</b><span>QR dari foto bekerja pada browser yang mendukung BarcodeDetector. Pencarian manual selalu tersedia.</span></div>}
      </Panel>
    </div>

    <Panel title="Offline Draft Queue" className="mt">
      <div className="table-wrap"><table>
        <thead><tr><th>Draft</th><th>PT</th><th>Jenis</th><th>Lokasi</th><th>Waktu</th><th>Evidence</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>{scopedDrafts.map(d=><tr key={d.id}>
          <td><b>{d.title}</b><small className={styles.block}>{d.id}</small></td>
          <td>{d.companyCode||'-'}</td><td>{d.type}</td><td>{d.locationText}{d.gps&&<small className={styles.block}>GPS {d.gps}</small>}</td>
          <td>{fmtDateTime(d.createdAt)}</td><td>{d.photoName||'-'}</td><td><Badge tone={d.status==='Submitted'?'green':'orange'}>{d.status}</Badge></td>
          <td>{d.status!=='Submitted'?<button className={styles.sendBtn} disabled={!online} onClick={()=>sendDraft(d)}><Send size={14}/> Kirim</button>:<span className={styles.done}><CheckCircle2 size={14}/> Done</span>}</td>
        </tr>)}{!scopedDrafts.length&&<tr><td colSpan="8" className={styles.empty}>Belum ada draft mobile pada scope ini.</td></tr>}</tbody>
      </table></div>
    </Panel>

    <div className={styles.footnote}><Clock3 size={18}/><div><b>Mobile implementation status</b><span>Responsive web access, local offline draft, GPS browser, camera capture, QR image detection bila didukung browser, dan asset lookup sudah tersedia. Penyimpanan file foto ke cloud dan background offline sync penuh memerlukan storage/PWA service worker pada tahap berikutnya.</span></div></div>
  </Shell>
}
