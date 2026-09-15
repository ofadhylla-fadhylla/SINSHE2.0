'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge, Panel, StatCard } from '../../components/Ui'
import {
  AlertTriangle, CheckCircle2, Crosshair, Download, ExternalLink, LocateFixed,
  Map as MapIcon, MapPin, Plus, RefreshCw, Search, ShieldAlert, X
} from 'lucide-react'
import { dbSelect, dbUpsert, getStoredProfile, isSupabaseConfigured } from '../../lib/supabase-rest'
import { COMPANY_MASTER, DEFAULT_COMPANY_FILTERS, companyCodeOf, filteredCompanies } from '../../lib/company-master'
import styles from './gis-map.module.css'

const KEY='sinshe-gis-points'
const SOURCE_MODULES=['Manual','Incident','Hazard & Risk','Environmental ESG','QR Inspection','Inspection','Asset Integrity','Audit']
const POINT_TYPES=['Incident','Hazard','Environmental Event','Asset','Inspection Finding','Hotspot','High Risk Area','Other']
const RISKS=['Low','Medium','High','Critical']
const STATUSES=['Active','Monitoring','Controlled','Closed']
const UNITS=['Head Office','PKS A','PKS B','PKS C','Estate 1','Estate 2','Estate 3','Laboratorium']
const RISK_COLOR={Low:'#1d8d4f',Medium:'#d79b00',High:'#ef7d00',Critical:'#c62828'}
const emptyForm={companyCode:'ACP',sourceModule:'Manual',sourceRecordId:'',title:'',pointType:'Hazard',unit:'PKS A',location:'',latitude:'',longitude:'',riskLevel:'Medium',status:'Active',owner:'',observedDate:new Date().toISOString().slice(0,10),notes:''}

const safeRead=()=>{try{const raw=localStorage.getItem(KEY);const rows=raw?JSON.parse(raw):[];return Array.isArray(rows)?rows:[]}catch{return[]}}
const safeWrite=rows=>{try{localStorage.setItem(KEY,JSON.stringify(rows));window.dispatchEvent(new CustomEvent('sinshe-central-data',{detail:{key:KEY,count:rows.length}}))}catch{}}
const mergeById=(local,central)=>{const map=new Map();(local||[]).forEach(r=>r?.id&&map.set(r.id,r));(central||[]).forEach(r=>r?.id&&map.set(r.id,r));return [...map.values()]}
const fmt=v=>v?new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${String(v).slice(0,10)}T00:00:00`)):'-'
const tone=v=>v==='Critical'?'red':v==='High'?'orange':v==='Medium'?'blue':v==='Low'?'green':v==='Closed'?'green':v==='Controlled'?'blue':v==='Monitoring'?'orange':'red'
function fromDb(r){return{id:r.id,companyCode:r.company_code||'',sourceModule:r.source_module||'Manual',sourceRecordId:r.source_record_id||'',title:r.title||'',pointType:r.point_type||'Hazard',unit:r.unit||'',location:r.location||'',latitude:Number(r.latitude),longitude:Number(r.longitude),riskLevel:r.risk_level||'Medium',status:r.status||'Active',owner:r.owner||'',observedDate:r.observed_date||'',notes:r.notes||''}}
function toDb(r){return{id:r.id,company_code:r.companyCode||null,source_module:r.sourceModule,source_record_id:r.sourceRecordId||null,title:r.title,point_type:r.pointType,unit:r.unit,location:r.location||null,latitude:Number(r.latitude),longitude:Number(r.longitude),risk_level:r.riskLevel,status:r.status,owner:r.owner||null,observed_date:r.observedDate||null,notes:r.notes||null}}

export default function GisMap(){
  const [points,setPoints]=useState([])
  const [filters,setFilters]=useState(DEFAULT_COMPANY_FILTERS)
  const [search,setSearch]=useState('')
  const [typeFilter,setTypeFilter]=useState('All')
  const [riskFilter,setRiskFilter]=useState('All')
  const [statusFilter,setStatusFilter]=useState('All')
  const [selectedId,setSelectedId]=useState('')
  const [modalOpen,setModalOpen]=useState(false)
  const [form,setForm]=useState(emptyForm)
  const [notice,setNotice]=useState('')
  const [loading,setLoading]=useState(true)
  const [source,setSource]=useState('Local cache')
  const [mapReady,setMapReady]=useState(false)
  const [mapError,setMapError]=useState('')
  const mapNode=useRef(null)
  const mapRef=useRef(null)
  const layerRef=useRef(null)
  const profile=getStoredProfile()
  const canManage=!profile||profile.role!=='Viewer'

  useEffect(()=>{
    let active=true
    async function load(){
      const local=safeRead();if(active)setPoints(local)
      if(!isSupabaseConfigured()){setLoading(false);return}
      try{const central=await dbSelect('gis_points','select=*&order=observed_date.desc,updated_at.desc');const next=mergeById(local,(central||[]).map(fromDb));if(active){setPoints(next);safeWrite(next);setSource('Supabase central data')}}catch{if(active)setSource('Offline / local cache')}
      if(active)setLoading(false)
    }
    load();return()=>{active=false}
  },[])

  useEffect(()=>{
    if(typeof window==='undefined')return
    let cancelled=false
    const init=()=>{
      if(cancelled||mapRef.current||!window.L||!mapNode.current)return
      const map=window.L.map(mapNode.current,{zoomControl:true,attributionControl:true}).setView([-2.5,118],5)
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map)
      layerRef.current=window.L.layerGroup().addTo(map);mapRef.current=map;setMapReady(true);setTimeout(()=>map.invalidateSize(),0)
    }
    if(window.L){init();return()=>{cancelled=true}}
    if(!document.getElementById('sinshe-leaflet-css')){const link=document.createElement('link');link.id='sinshe-leaflet-css';link.rel='stylesheet';link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(link)}
    let script=document.getElementById('sinshe-leaflet-js')
    if(!script){script=document.createElement('script');script.id='sinshe-leaflet-js';script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';script.async=true;script.onload=init;script.onerror=()=>setMapError('Basemap gagal dimuat. Register koordinat tetap dapat digunakan.');document.body.appendChild(script)}else script.addEventListener('load',init,{once:true})
    return()=>{cancelled=true;if(mapRef.current){mapRef.current.remove();mapRef.current=null;layerRef.current=null}}
  },[])

  const companies=useMemo(()=>filteredCompanies(filters),[filters])
  const allowed=useMemo(()=>new Set(companies.map(c=>c.code)),[companies])
  const specific=filters.company!=='All'||filters.region!=='All'||filters.province!=='All'||filters.pic!=='All'
  const rows=useMemo(()=>points.filter(p=>{const code=companyCodeOf(p);const q=search.trim().toLowerCase();const text=[p.id,p.companyCode,p.sourceModule,p.sourceRecordId,p.title,p.pointType,p.unit,p.location,p.owner].join(' ').toLowerCase();return(code?allowed.has(code):!specific)&&(!q||text.includes(q))&&(typeFilter==='All'||p.pointType===typeFilter)&&(riskFilter==='All'||p.riskLevel===riskFilter)&&(statusFilter==='All'||p.status===statusFilter)}),[points,allowed,specific,search,typeFilter,riskFilter,statusFilter])
  const selected=points.find(p=>p.id===selectedId)||rows[0]||null
  const active=rows.filter(p=>p.status!=='Closed').length
  const critical=rows.filter(p=>p.status!=='Closed'&&p.riskLevel==='Critical').length
  const environmental=rows.filter(p=>p.pointType==='Environmental Event').length
  const highRisk=rows.filter(p=>p.status!=='Closed'&&['High','Critical'].includes(p.riskLevel)).length

  useEffect(()=>{
    if(!mapReady||!window.L||!layerRef.current)return
    layerRef.current.clearLayers()
    const valid=[]
    rows.forEach(p=>{const lat=Number(p.latitude),lng=Number(p.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lng))return;valid.push([lat,lng]);const marker=window.L.circleMarker([lat,lng],{radius:p.riskLevel==='Critical'?10:p.riskLevel==='High'?9:8,color:'#fff',weight:2,fillColor:RISK_COLOR[p.riskLevel]||'#5b6470',fillOpacity:.92});marker.bindPopup(`<b>${p.title}</b><br/>${p.companyCode||'-'} · ${p.pointType}<br/>${p.riskLevel} · ${p.status}<br/><small>${p.location||p.unit||''}</small>`);marker.on('click',()=>setSelectedId(p.id));marker.addTo(layerRef.current)})
    if(valid.length&&mapRef.current){if(valid.length===1)mapRef.current.setView(valid[0],13);else mapRef.current.fitBounds(valid,{padding:[28,28],maxZoom:13})}
  },[rows,mapReady])

  function flash(text){setNotice(text);setTimeout(()=>setNotice(''),3600)}
  function locate(){
    if(!navigator.geolocation){flash('GPS browser tidak tersedia. Isi latitude/longitude secara manual.');return}
    navigator.geolocation.getCurrentPosition(pos=>setForm(prev=>({...prev,latitude:pos.coords.latitude.toFixed(7),longitude:pos.coords.longitude.toFixed(7)})),err=>flash(`GPS tidak dapat dibaca: ${err.message}`),{enableHighAccuracy:true,timeout:12000,maximumAge:30000})
  }
  async function savePoint(e){
    e.preventDefault();if(!canManage){flash('Role Viewer hanya dapat melihat GIS Map.');return}
    const lat=Number(form.latitude),lng=Number(form.longitude)
    if(!form.companyCode||!form.title.trim()||!form.unit||!Number.isFinite(lat)||!Number.isFinite(lng)||lat<-90||lat>90||lng<-180||lng>180){flash('Lengkapi PT, judul, unit serta koordinat latitude/longitude yang valid.');return}
    const item={...form,id:`GIS-${Date.now().toString().slice(-8)}`,latitude:lat,longitude:lng}
    const next=[item,...points];setPoints(next);safeWrite(next);setSelectedId(item.id);setFilters(prev=>({...prev,company:item.companyCode}));setModalOpen(false);setForm({...emptyForm,companyCode:item.companyCode});
    if(isSupabaseConfigured()){try{await dbUpsert('gis_points',[toDb(item)],'id');flash(`${item.id} tersimpan ke GIS central data.`)}catch(err){flash(`Tersimpan lokal, sync GIS gagal: ${err.message}`)}}else flash(`${item.id} tersimpan lokal.`)
  }
  async function updateStatus(point,status){
    if(!canManage)return;const item={...point,status};const next=points.map(p=>p.id===item.id?item:p);setPoints(next);safeWrite(next);if(isSupabaseConfigured()){try{await dbUpsert('gis_points',[toDb(item)],'id')}catch{}}flash(`${item.id} diperbarui menjadi ${status}.`)
  }
  function centerSelected(){if(!selected||!mapRef.current)return;mapRef.current.setView([Number(selected.latitude),Number(selected.longitude)],15)}
  function exportCSV(){const header=['ID','Company/PT','Source Module','Source Record','Type','Title','Unit','Location','Latitude','Longitude','Risk','Status','Owner','Observed Date','Notes'];const data=rows.map(p=>[p.id,p.companyCode,p.sourceModule,p.sourceRecordId,p.pointType,p.title,p.unit,p.location,p.latitude,p.longitude,p.riskLevel,p.status,p.owner,p.observedDate,p.notes]);const csv=[header,...data].map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`SINSHE_GIS_Map_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url)}

  return <Shell title="GIS Safety & Environmental Map" subtitle="Peta spasial terpadu untuk incident, hazard, environmental event, asset, inspection finding, hotspot dan high-risk area per Company/PT.">
    <CompanyScopeBar filters={filters} onChange={setFilters} onReset={()=>setFilters(DEFAULT_COMPANY_FILTERS)}/>
    {notice&&<div className={styles.notice}><CheckCircle2 size={18}/>{notice}</div>}

    <div className="stats-grid four">
      <StatCard label="Mapped Points" value={rows.length} hint={`${source}${loading?' · loading…':''}`} tone="blue" icon={<MapPin/>}/>
      <StatCard label="Active / Monitoring" value={active} hint="belum closed" tone="orange" icon={<Crosshair/>}/>
      <StatCard label="High / Critical" value={highRisk} hint={`${critical} critical`} tone="red" icon={<ShieldAlert/>}/>
      <StatCard label="Environmental Event" value={environmental} hint="spatial environment layer" tone="green" icon={<MapIcon/>}/>
    </div>

    <div className={styles.toolbar}><div><h2>Geospatial Risk Overview</h2><p>Koordinat berasal dari record yang diregistrasikan, bukan lokasi yang ditebak sistem.</p></div><div className={styles.actions}><button className={styles.secondary} onClick={exportCSV}><Download size={17}/> Export CSV</button>{canManage&&<button className={styles.primary} onClick={()=>setModalOpen(true)}><Plus size={18}/> Tambah Titik</button>}</div></div>

    <Panel>
      <div className={styles.filters}>
        <label className={styles.search}><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari PT, source ID, lokasi, owner..."/></label>
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option>All</option>{POINT_TYPES.map(v=><option key={v}>{v}</option>)}</select>
        <select value={riskFilter} onChange={e=>setRiskFilter(e.target.value)}><option>All</option>{RISKS.map(v=><option key={v}>{v}</option>)}</select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All</option>{STATUSES.map(v=><option key={v}>{v}</option>)}</select>
        <button className={styles.secondary} onClick={()=>{setSearch('');setTypeFilter('All');setRiskFilter('All');setStatusFilter('All')}}><RefreshCw size={15}/> Reset Layer</button>
      </div>
      <div className={styles.mapWrap}>
        <div ref={mapNode} className={styles.map}/>
        {!mapReady&&<div className={styles.mapLoading}>{mapError||'Memuat basemap OpenStreetMap…'}</div>}
        <div className={styles.legend}>{RISKS.map(r=><span key={r}><i style={{background:RISK_COLOR[r]}}/>{r}</span>)}</div>
      </div>
    </Panel>

    <div className="dashboard-split mt">
      <Panel title="GIS Point Register"><div className="table-wrap"><table><thead><tr><th>Point</th><th>PT</th><th>Type</th><th>Source</th><th>Coordinate</th><th>Risk</th><th>Status</th></tr></thead><tbody>
        {rows.map(p=><tr key={p.id} onClick={()=>setSelectedId(p.id)} className={selected?.id===p.id?styles.selectedRow:''}><td><b>{p.title}</b><small className={styles.block}>{p.id} · {p.location||p.unit}</small></td><td><b>{p.companyCode||'-'}</b></td><td>{p.pointType}</td><td>{p.sourceModule}<small className={styles.block}>{p.sourceRecordId||'-'}</small></td><td><code>{Number(p.latitude).toFixed(5)}, {Number(p.longitude).toFixed(5)}</code></td><td><Badge tone={tone(p.riskLevel)}>{p.riskLevel}</Badge></td><td><Badge tone={tone(p.status)}>{p.status}</Badge></td></tr>)}
        {!rows.length&&<tr><td colSpan="7" className={styles.empty}>Belum ada titik GIS sesuai filter. Tambahkan titik dengan koordinat aktual atau GPS browser.</td></tr>}
      </tbody></table></div></Panel>

      <Panel title="Selected Point">{selected?<div className={styles.detail}><div className={styles.detailHead}><div><h3>{selected.title}</h3><p>{selected.id} · {selected.companyCode} · {selected.pointType}</p></div><Badge tone={tone(selected.riskLevel)}>{selected.riskLevel}</Badge></div><div className={styles.detailGrid}><div><span>Location</span><b>{selected.location||selected.unit}</b></div><div><span>Coordinate</span><b>{Number(selected.latitude).toFixed(6)}, {Number(selected.longitude).toFixed(6)}</b></div><div><span>Source</span><b>{selected.sourceModule} · {selected.sourceRecordId||'-'}</b></div><div><span>Owner / PIC</span><b>{selected.owner||'-'}</b></div><div><span>Observed</span><b>{fmt(selected.observedDate)}</b></div><div><span>Status</span><b>{selected.status}</b></div></div>{selected.notes&&<p className={styles.notes}>{selected.notes}</p>}<div className={styles.detailActions}><button className={styles.secondary} onClick={centerSelected}><LocateFixed size={15}/> Center Map</button><a className={styles.secondary} target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${selected.latitude}&mlon=${selected.longitude}#map=16/${selected.latitude}/${selected.longitude}`}><ExternalLink size={15}/> Open OSM</a>{canManage&&selected.status!=='Closed'&&<button className={styles.primary} onClick={()=>updateStatus(selected,'Closed')}><CheckCircle2 size={15}/> Close Point</button>}</div></div>:<div className={styles.emptyDetail}><MapPin size={32}/><p>Pilih titik dari peta atau register.</p></div>}</Panel>
    </div>

    <div className={styles.info}><AlertTriangle size={19}/><div><b>GIS foundation</b><span>Incident, hazard, environmental event, asset dan finding dapat ditautkan melalui Source Module + Source Record ID. Data yang belum mempunyai koordinat tidak dipetakan otomatis agar tidak menghasilkan lokasi palsu.</span></div></div>

    {modalOpen&&<div className={styles.modalBackdrop} onMouseDown={e=>{if(e.target===e.currentTarget)setModalOpen(false)}}><div className={styles.modal} role="dialog" aria-modal="true"><div className={styles.modalHeader}><div><h2>Tambah GIS Point</h2><p>Registrasikan koordinat aktual dan hubungkan dengan source record SINSHE.</p></div><button onClick={()=>setModalOpen(false)} className={styles.icon}><X size={18}/></button></div><form onSubmit={savePoint} className={styles.form}><div className={styles.formGrid}>
      <label>Company / PT<select value={form.companyCode} onChange={e=>setForm({...form,companyCode:e.target.value})}>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
      <label>Point Type<select value={form.pointType} onChange={e=>setForm({...form,pointType:e.target.value})}>{POINT_TYPES.map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Source Module<select value={form.sourceModule} onChange={e=>setForm({...form,sourceModule:e.target.value})}>{SOURCE_MODULES.map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Source Record ID<input value={form.sourceRecordId} onChange={e=>setForm({...form,sourceRecordId:e.target.value})} placeholder="INC-..., GIS event, asset ID..."/></label>
      <label className={styles.span2}>Title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Contoh: Hotspot gambut area blok A"/></label>
      <label>Unit<select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>{UNITS.map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Location<input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Blok / area / station"/></label>
      <label>Latitude<input type="number" step="0.0000001" value={form.latitude} onChange={e=>setForm({...form,latitude:e.target.value})} placeholder="-2.1234567"/></label>
      <label>Longitude<input type="number" step="0.0000001" value={form.longitude} onChange={e=>setForm({...form,longitude:e.target.value})} placeholder="118.1234567"/></label>
      <div className={styles.gpsCell}><button type="button" className={styles.secondary} onClick={locate}><LocateFixed size={16}/> Gunakan GPS Browser</button></div>
      <label>Risk<select value={form.riskLevel} onChange={e=>setForm({...form,riskLevel:e.target.value})}>{RISKS.map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{STATUSES.map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Owner / PIC<input value={form.owner} onChange={e=>setForm({...form,owner:e.target.value})}/></label>
      <label>Observed Date<input type="date" value={form.observedDate} onChange={e=>setForm({...form,observedDate:e.target.value})}/></label>
      <label className={styles.span2}>Notes<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Kondisi lapangan, mitigasi, referensi koordinat..."/></label>
    </div><div className={styles.formFooter}><button type="button" className={styles.secondary} onClick={()=>setModalOpen(false)}>Batal</button><button className={styles.primary} type="submit"><MapPin size={16}/> Simpan GIS Point</button></div></form></div></div>}
  </Shell>
}
