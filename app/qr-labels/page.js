'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge, Panel, StatCard } from '../../components/Ui'
import { CheckSquare2, ExternalLink, Factory, Printer, QrCode, Search, Square, Tags } from 'lucide-react'
import { dbSelect, isSupabaseConfigured } from '../../lib/supabase-rest'
import { DEFAULT_COMPANY_FILTERS, companyCodeOf, filteredCompanies } from '../../lib/company-master'
import styles from './qr-labels.module.css'

const ASSET_KEY='sinshe-assets'
const sizes=[
  {value:'50x40',label:'50 × 40 mm · Small'},
  {value:'70x50',label:'70 × 50 mm · Standard'},
  {value:'100x70',label:'100 × 70 mm · Large'},
]
const categories=['All','Boiler','Pressure Vessel','Forklift','Crane','Electrical','Fire Protection','Hydrant']

function safeRead(){try{const raw=localStorage.getItem(ASSET_KEY);const rows=raw?JSON.parse(raw):[];return Array.isArray(rows)?rows:[]}catch{return[]}}
function mergeById(local,central){const map=new Map();(local||[]).forEach(r=>r?.id&&map.set(r.id,r));(central||[]).forEach(r=>r?.id&&map.set(r.id,r));return [...map.values()]}
function fromDb(r){return{id:r.id,companyCode:r.company_code||'',name:r.name||'',category:r.category||'',unit:r.unit||'',operational:r.operational||'Active',monitoring:r.monitoring||'Online',year:r.manufacture_year||'',manufacturer:r.manufacturer||'',capacity:r.capacity||'',workingPressure:r.working_pressure||'',riksaDue:r.riksa_due||'',sioDue:r.sio_due||'',siloDue:r.silo_due||'',calibrationDue:r.calibration_due||'',serial:r.serial||'',owner:r.owner||'',notes:r.notes||''}}
function qrImage(payload){return `https://quickchart.io/qr?text=${encodeURIComponent(payload)}&size=260&margin=1&ecLevel=H&dark=0c5a2b&light=ffffff`}

export default function QrLabels(){
  const [assets,setAssets]=useState([])
  const [filters,setFilters]=useState(DEFAULT_COMPANY_FILTERS)
  const [search,setSearch]=useState('')
  const [category,setCategory]=useState('All')
  const [operational,setOperational]=useState('All')
  const [labelSize,setLabelSize]=useState('70x50')
  const [selectedIds,setSelectedIds]=useState([])
  const [origin,setOrigin]=useState('')
  const [source,setSource]=useState('Local cache')
  const [loading,setLoading]=useState(true)
  const queryHandled=useRef(false)

  useEffect(()=>{
    setOrigin(window.location.origin)
    let active=true
    async function load(){
      const local=safeRead();if(active)setAssets(local)
      if(isSupabaseConfigured()){
        try{const central=await dbSelect('assets','select=*&order=name.asc');const next=mergeById(local,(central||[]).map(fromDb));if(active){setAssets(next);setSource('Supabase central data')}}catch{if(active)setSource('Offline / local cache')}
      }
      if(active)setLoading(false)
    }
    load();return()=>{active=false}
  },[])

  useEffect(()=>{
    if(queryHandled.current||!assets.length||typeof window==='undefined')return
    const id=new URLSearchParams(window.location.search).get('asset')
    if(id&&assets.some(a=>a.id===id)){setSelectedIds([id]);const asset=assets.find(a=>a.id===id);if(asset?.companyCode)setFilters(prev=>({...prev,company:asset.companyCode}))}
    queryHandled.current=true
  },[assets])

  const companies=useMemo(()=>filteredCompanies(filters),[filters])
  const allowed=useMemo(()=>new Set(companies.map(c=>c.code)),[companies])
  const specific=filters.company!=='All'||filters.region!=='All'||filters.province!=='All'||filters.pic!=='All'
  const rows=useMemo(()=>assets.filter(a=>{
    const code=companyCodeOf(a);const q=search.trim().toLowerCase();const text=[a.id,a.companyCode,a.name,a.category,a.unit,a.serial,a.owner].join(' ').toLowerCase()
    return(code?allowed.has(code):!specific)&&(!q||text.includes(q))&&(category==='All'||a.category===category)&&(operational==='All'||a.operational===operational)
  }).sort((a,b)=>String(a.companyCode||'').localeCompare(String(b.companyCode||''))||String(a.name||'').localeCompare(String(b.name||''))),[assets,allowed,specific,search,category,operational])
  const selected=useMemo(()=>assets.filter(a=>selectedIds.includes(a.id)),[assets,selectedIds])

  function toggle(id){setSelectedIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id])}
  function selectVisible(){setSelectedIds(prev=>[...new Set([...prev,...rows.map(a=>a.id)])])}
  function clear(){setSelectedIds([])}
  function payload(asset){return origin?`${origin}/qr-inspection?asset=${encodeURIComponent(asset.id)}`:`SINSHE:ASSET:${asset.id}`}
  function openTest(asset){if(typeof window==='undefined')return;window.open(`${window.location.origin}/qr-inspection?asset=${encodeURIComponent(asset.id)}`,'_blank','noopener,noreferrer')}
  function printLabels(){if(!selected.length)return;window.print()}

  return <Shell title="QR Label Generator" subtitle="Generate, preview dan print QR label asset SINSHE untuk workflow QR Inspection end-to-end.">
    <div className={styles.noPrint}>
      <CompanyScopeBar filters={filters} onChange={setFilters} onReset={()=>setFilters(DEFAULT_COMPANY_FILTERS)}/>
      <div className="stats-grid four">
        <StatCard label="Asset Scope" value={rows.length} hint={loading?'memuat asset…':source} tone="blue" icon={<Factory/>}/>
        <StatCard label="Selected" value={selected.length} hint="siap dibuat label" tone="green" icon={<CheckSquare2/>}/>
        <StatCard label="Label Size" value={labelSize.replace('x','×')} hint="millimeter" tone="purple" icon={<Tags/>}/>
        <StatCard label="QR Destination" value="Inspection" hint="langsung buka asset checklist" tone="orange" icon={<QrCode/>}/>
      </div>

      <div className={styles.toolbar}><div><h2>Asset QR Label</h2><p>Pilih asset yang akan dicetak. QR membuka QR Inspection dengan Asset ID terisi otomatis.</p></div><div className={styles.buttons}><button className={styles.secondary} onClick={selectVisible}><CheckSquare2 size={17}/> Select Visible</button><button className={styles.secondary} onClick={clear}><Square size={17}/> Clear</button><button className={styles.primary} onClick={printLabels} disabled={!selected.length}><Printer size={17}/> Print {selected.length||''} Label</button></div></div>

      <Panel>
        <div className={styles.controls}>
          <label><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari Asset ID, nama, PT, serial, owner..."/></label>
          <label><select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(v=><option key={v}>{v==='All'?'All Categories':v}</option>)}</select></label>
          <label><select value={operational} onChange={e=>setOperational(e.target.value)}><option>All</option><option>Active</option><option>Inactive</option></select></label>
          <label><select value={labelSize} onChange={e=>setLabelSize(e.target.value)}>{sizes.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
        </div>
        <div className={styles.selectionBar}><span><b>{selected.length}</b> label dipilih dari {rows.length} asset sesuai filter.</span><span className={styles.source}>{source}</span></div>
        <div className={styles.assetGrid}>{rows.map(asset=>{const checked=selectedIds.includes(asset.id);return <div key={asset.id} className={`${styles.assetCard} ${checked?styles.assetCardSelected:''}`} onClick={()=>toggle(asset.id)}>
          <div className={styles.assetTop}><label><input type="checkbox" checked={checked} onChange={()=>toggle(asset.id)} onClick={e=>e.stopPropagation()}/><span>{asset.name}</span></label><Badge tone={asset.operational==='Active'?'green':'red'}>{asset.operational}</Badge></div>
          <b>{asset.id}</b>
          <div className={styles.assetMeta}><span>PT <b>{asset.companyCode||'-'}</b></span><span>Unit <b>{asset.unit||'-'}</b></span><span>Category <b>{asset.category||'-'}</b></span><span>Serial <b>{asset.serial||'-'}</b></span></div>
        </div>})}{!rows.length&&<div className={styles.empty}>Tidak ada asset sesuai filter.</div>}</div>
      </Panel>

      <div className={styles.info}><QrCode size={20}/><div><b>Payload QR tidak berisi data sensitif.</b><div>QR hanya mengarahkan ke route QR Inspection berdasarkan Asset ID. Nama PT, owner dan detail teknis tetap dibaca dari SINSHE setelah user login.</div></div></div>
    </div>

    <div className={styles.previewWrap}>
      <div className={`${styles.printHeader} ${styles.noPrint}`}><div><h2>Print Preview</h2><p>{selected.length?`${selected.length} label siap dicetak.`:'Pilih minimal satu asset untuk menampilkan preview.'}</p></div>{selected.length>0&&<button className={styles.primary} onClick={printLabels}><Printer size={17}/> Print</button>}</div>
      {selected.length>0?<div className={styles.labels}>{selected.map(asset=><div className={styles.label} data-size={labelSize} key={asset.id}>
        <div><img className={styles.qrImg} src={qrImage(payload(asset))} alt={`QR ${asset.id}`}/><button className={`${styles.secondary} ${styles.noPrint}`} style={{width:'100%',marginTop:6,padding:'6px 8px',fontSize:10}} onClick={()=>openTest(asset)}><ExternalLink size={12}/> Test</button></div>
        <div className={styles.labelInfo}><div className={styles.brandRow}><img src="/sinshe-logo.jpg" alt="SINSHE 2.0"/><span>KPN PLANTATIONS<br/>ASSET QR</span></div><h3 className={styles.assetName}>{asset.name}</h3><div className={styles.assetId}>{asset.id}</div><div className={styles.details}><span>PT: <b>{asset.companyCode||'-'}</b></span><span>Unit: <b>{asset.unit||'-'}</b></span><span>Category: <b>{asset.category||'-'}</b></span><span>Serial: <b>{asset.serial||'-'}</b></span><span>Status: <b>{asset.operational||'-'}</b></span></div><div className={styles.scanNote}>SCAN UNTUK DIGITAL INSPECTION</div></div>
      </div>)}</div>:<div className={styles.empty}>Belum ada label dipilih.</div>}
    </div>
  </Shell>
}
