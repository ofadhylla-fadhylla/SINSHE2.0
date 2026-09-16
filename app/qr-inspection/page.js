'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge, Panel, Progress, StatCard } from '../../components/Ui'
import {
  AlertTriangle, Camera, CheckCircle2, ClipboardCheck, Download, ImagePlus,
  PlayCircle, QrCode, RefreshCw, ScanLine, Search, ShieldCheck, X, XCircle
} from 'lucide-react'
import {
  dbSelect, dbUpsert, getStoredProfile, isSupabaseConfigured, storageUpload
} from '../../lib/supabase-rest'
import { DEFAULT_COMPANY_FILTERS, companyCodeOf, filteredCompanies } from '../../lib/company-master'
import styles from './qr-inspection.module.css'

const RUN_KEY='sinshe-qr-inspections'
const ITEM_KEY='sinshe-qr-inspection-items'
const ASSET_KEY='sinshe-assets'
const OBS_KEY='sinshe-observations'
const CA_KEY='sinshe-corrective-actions'
const BUCKET='sinshe-evidence'
const JSQR_SRC='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'
let jsQrLoader=null

const templates={
  Boiler:[
    ['Mechanical','Tidak ada kebocoran steam/water/fuel pada body, valve dan piping','High'],
    ['Safety Device','Safety valve, pressure gauge dan low-water cut-off berfungsi','Critical'],
    ['Housekeeping','Area boiler bersih, akses dan jalur evakuasi tidak terhalang','Medium'],
    ['Fire Safety','APAR/hydrant aksesibel dan inspeksi visual baik','High'],
    ['Documentation','Logsheet operasi dan pemeriksaan tersedia/terisi','Medium'],
  ],
  'Pressure Vessel':[
    ['Integrity','Tidak ada korosi berat, deformasi atau kebocoran','High'],
    ['Safety Device','Pressure gauge dan safety relief device dalam kondisi baik','Critical'],
    ['Support','Foundation, support dan anchoring stabil','High'],
    ['Identification','Nameplate/identitas dan pressure rating terbaca','Medium'],
  ],
  Forklift:[
    ['Pre-use','Brake, steering, horn, lampu dan reverse alarm berfungsi','High'],
    ['Lifting','Fork, mast, chain dan hydraulic hose tidak rusak/bocor','Critical'],
    ['Operator','Operator memiliki SIO yang masih berlaku','High'],
    ['Safety','Seat belt dan overhead guard tersedia/berfungsi','High'],
  ],
  Crane:[
    ['Structure','Hook, wire rope, sling point dan struktur tidak menunjukkan kerusakan','Critical'],
    ['Limit Device','Limit switch, overload protection dan emergency stop berfungsi','Critical'],
    ['Operator','Operator/rigger memiliki kompetensi yang sesuai','High'],
    ['Area','Exclusion zone dan warning sign tersedia','High'],
  ],
  Electrical:[
    ['Panel','Panel tertutup, terkunci dan label bahaya terbaca','High'],
    ['Protection','MCB/MCCB, grounding dan proteksi kelistrikan dalam kondisi baik','Critical'],
    ['Housekeeping','Tidak ada material mudah terbakar/air di sekitar panel','High'],
    ['Access','Akses panel dan emergency isolation tidak terhalang','High'],
  ],
  'Fire Protection':[
    ['Readiness','Peralatan siap pakai dan tidak terhalang','Critical'],
    ['Condition','Seal, hose, nozzle, pressure/indicator dalam kondisi baik','High'],
    ['Identification','Signage dan identifikasi lokasi terlihat jelas','Medium'],
    ['Inspection','Tag/checklist inspeksi rutin terisi','Medium'],
  ],
  Hydrant:[
    ['Access','Hydrant mudah diakses dan tidak terhalang','High'],
    ['Condition','Valve, coupling, hose/nozzle tidak rusak atau bocor','High'],
    ['Pressure','Indikator/hasil uji tekanan memenuhi standar internal','Critical'],
    ['Signage','Signage dan nomor hydrant terlihat jelas','Medium'],
  ],
  Generic:[
    ['Condition','Kondisi fisik objek aman dan layak digunakan','High'],
    ['Guarding','Guard/protection dan safety device tersedia serta berfungsi','High'],
    ['Housekeeping','Area kerja bersih dan akses tidak terhalang','Medium'],
    ['Identification','Label, signage dan identitas objek tersedia','Medium'],
  ],
}

const today=()=>new Date().toISOString().slice(0,10)
const addDays=n=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
const safeRead=key=>{try{const raw=localStorage.getItem(key);const rows=raw?JSON.parse(raw):[];return Array.isArray(rows)?rows:[]}catch{return[]}}
const safeWrite=(key,rows)=>{try{localStorage.setItem(key,JSON.stringify(rows));window.dispatchEvent(new CustomEvent('sinshe-central-data',{detail:{key,count:rows.length}}))}catch{}}
const mergeById=(local,central)=>{const map=new Map();(local||[]).forEach(r=>r?.id&&map.set(r.id,r));(central||[]).forEach(r=>r?.id&&map.set(r.id,r));return [...map.values()]}
const fmt=value=>value?new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${String(value).slice(0,10)}T00:00:00`)):'-'
const statusTone=value=>value==='Completed'?'green':value==='Cancelled'?'red':'orange'
const resultTone=value=>value==='OK'?'green':value==='NG'?'red':value==='N/A'?'blue':'orange'
const riskTone=value=>value==='Critical'?'red':value==='High'?'orange':value==='Medium'?'blue':'green'
const dueForRisk=risk=>risk==='Critical'?addDays(1):risk==='High'?addDays(3):risk==='Medium'?addDays(7):addDays(14)
const safeName=value=>String(value||'file').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-90)

function ensureJsQr(){
  if(typeof window==='undefined')return Promise.reject(new Error('Browser tidak tersedia.'))
  if(window.jsQR)return Promise.resolve(window.jsQR)
  if(jsQrLoader)return jsQrLoader
  jsQrLoader=new Promise((resolve,reject)=>{
    const existing=document.querySelector('script[data-sinshe-jsqr="1"]')
    if(existing){
      existing.addEventListener('load',()=>window.jsQR?resolve(window.jsQR):reject(new Error('QR decoder gagal dimuat.')),{once:true})
      existing.addEventListener('error',()=>reject(new Error('QR decoder gagal dimuat.')),{once:true})
      return
    }
    const script=document.createElement('script')
    script.src=JSQR_SRC
    script.async=true
    script.dataset.sinsheJsqr='1'
    script.onload=()=>window.jsQR?resolve(window.jsQR):reject(new Error('QR decoder gagal dimuat.'))
    script.onerror=()=>reject(new Error('QR decoder gagal dimuat. Periksa koneksi internet.'))
    document.head.appendChild(script)
  })
  return jsQrLoader
}

function assetFromDb(r){return{
  id:r.id,companyCode:r.company_code||'',name:r.name||'',category:r.category||'',unit:r.unit||'',operational:r.operational||'Active',monitoring:r.monitoring||'Online',
  year:r.manufacture_year||'',manufacturer:r.manufacturer||'',capacity:r.capacity||'',workingPressure:r.working_pressure||'',riksaDue:r.riksa_due||'',sioDue:r.sio_due||'',siloDue:r.silo_due||'',calibrationDue:r.calibration_due||'',serial:r.serial||'',owner:r.owner||'',notes:r.notes||''
}}
function runFromDb(r){return{id:r.id,companyCode:r.company_code||'',targetType:r.target_type||'Asset',targetId:r.target_id,targetName:r.target_name,unit:r.unit,location:r.location||'',inspector:r.inspector||'',inspectionDate:r.inspection_date,status:r.status||'Draft',score:r.score===null?null:Number(r.score),qrValue:r.qr_value||'',notes:r.notes||''}}
function runToDb(r){return{id:r.id,company_code:r.companyCode||null,target_type:r.targetType,target_id:r.targetId,target_name:r.targetName,unit:r.unit,location:r.location||'',inspector:r.inspector||'',inspection_date:r.inspectionDate,status:r.status,score:r.score===null||r.score===undefined?null:Number(r.score),qr_value:r.qrValue||null,notes:r.notes||null}}
function itemFromDb(r){return{id:r.id,runId:r.run_id,companyCode:r.company_code||'',unit:r.unit,seq:Number(r.seq),category:r.category||'',checkpoint:r.checkpoint,result:r.result||'Pending',risk:r.risk||'Medium',note:r.note||'',evidenceDocumentId:r.evidence_document_id||''}}
function itemToDb(r){return{id:r.id,run_id:r.runId,company_code:r.companyCode||null,unit:r.unit,seq:Number(r.seq),category:r.category||null,checkpoint:r.checkpoint,result:r.result,risk:r.risk,note:r.note||null,evidence_document_id:r.evidenceDocumentId||null}}
function observationToDb(o){return{id:o.id,company_code:o.companyCode||null,observation_date:o.date,observation_type:o.type,description:o.description,unit:o.unit,location:o.location,risk:o.risk,status:o.status,pic:o.pic||null,due_date:o.dueDate||null,action:o.action||null,evidence:o.evidence||null}}
function correctiveToDb(a){return{id:a.id,company_code:a.companyCode||null,source:a.source,source_id:a.sourceId,title:a.title,unit:a.unit,location:a.location||'',category:a.category||'',priority:a.priority,pic:a.pic||'',due_date:a.dueDate||null,status:a.status,progress:Number(a.progress||0),evidence:a.evidence||''}}
function evidenceToDb(d){return{id:d.id,company_code:d.companyCode||null,module:'QR Inspection',record_id:d.recordId,document_type:'Photo Evidence',title:d.title,unit:d.unit,reference_no:d.referenceNo||null,issued_date:d.issuedDate||null,valid_until:null,status:'Active',file_name:d.fileName,storage_path:d.storagePath,mime_type:d.mimeType||null,file_size:d.fileSize||null,notes:d.notes||null}}

export default function QrInspection(){
  const [assets,setAssets]=useState([])
  const [runs,setRuns]=useState([])
  const [items,setItems]=useState([])
  const [filters,setFilters]=useState(DEFAULT_COMPANY_FILTERS)
  const [search,setSearch]=useState('')
  const [manualCode,setManualCode]=useState('')
  const [target,setTarget]=useState(null)
  const [activeRunId,setActiveRunId]=useState('')
  const [inspector,setInspector]=useState(()=>getStoredProfile()?.full_name||'')
  const [files,setFiles]=useState({})
  const [notice,setNotice]=useState('')
  const [loading,setLoading]=useState(true)
  const [source,setSource]=useState('Local cache')
  const [scannerOpen,setScannerOpen]=useState(false)
  const [cameraStream,setCameraStream]=useState(null)
  const [scanning,setScanning]=useState(false)
  const [scannerMessage,setScannerMessage]=useState('Menyiapkan kamera…')
  const videoRef=useRef(null)
  const canvasRef=useRef(null)
  const detectorRef=useRef(null)
  const scannerModeRef=useRef('native')
  const scanTimerRef=useRef(null)
  const queryHandled=useRef(false)
  const profile=getStoredProfile()
  const canManage=!profile||profile.role!=='Viewer'

  useEffect(()=>{
    let active=true
    async function load(){
      const localAssets=safeRead(ASSET_KEY),localRuns=safeRead(RUN_KEY),localItems=safeRead(ITEM_KEY)
      if(active){setAssets(localAssets);setRuns(localRuns);setItems(localItems)}
      if(!isSupabaseConfigured()){setLoading(false);return}
      try{
        const [a,r,i]=await Promise.all([
          dbSelect('assets','select=*&order=name.asc'),
          dbSelect('qr_inspection_runs','select=*&order=inspection_date.desc,updated_at.desc'),
          dbSelect('qr_inspection_items','select=*&order=run_id.asc,seq.asc'),
        ])
        const nextA=mergeById(localAssets,(a||[]).map(assetFromDb)),nextR=mergeById(localRuns,(r||[]).map(runFromDb)),nextI=mergeById(localItems,(i||[]).map(itemFromDb))
        if(active){setAssets(nextA);setRuns(nextR);setItems(nextI);safeWrite(RUN_KEY,nextR);safeWrite(ITEM_KEY,nextI);setSource('Supabase central data')}
      }catch{if(active)setSource('Offline / local cache')}
      if(active)setLoading(false)
    }
    load();return()=>{active=false;stopScanner()}
  },[])

  useEffect(()=>{
    if(queryHandled.current||!assets.length||typeof window==='undefined')return
    const id=new URLSearchParams(window.location.search).get('asset')
    if(id){const found=assets.find(a=>a.id===id||a.serial===id);if(found){setTarget(found);setManualCode(found.id)}}
    queryHandled.current=true
  },[assets])

  useEffect(()=>{
    if(!scannerOpen||!cameraStream||!videoRef.current)return
    const video=videoRef.current
    video.srcObject=cameraStream
    video.play().catch(()=>{})
    setScanning(true)
    setScannerMessage('Arahkan QR ke kotak kamera…')
    let cancelled=false
    async function tick(){
      if(cancelled||!videoRef.current)return
      try{
        let raw=''
        if(scannerModeRef.current==='native'&&detectorRef.current){
          const codes=await detectorRef.current.detect(videoRef.current)
          raw=codes?.[0]?.rawValue||''
        }else if(window.jsQR&&video.videoWidth>0&&video.videoHeight>0){
          const canvas=canvasRef.current
          if(canvas){
            canvas.width=video.videoWidth;canvas.height=video.videoHeight
            const ctx=canvas.getContext('2d',{willReadFrequently:true})
            ctx.drawImage(video,0,0,canvas.width,canvas.height)
            const image=ctx.getImageData(0,0,canvas.width,canvas.height)
            raw=window.jsQR(image.data,image.width,image.height,{inversionAttempts:'attemptBoth'})?.data||''
          }
        }
        if(raw){resolveCode(raw);stopScanner();return}
      }catch{}
      scanTimerRef.current=setTimeout(tick,250)
    }
    tick()
    return()=>{cancelled=true;if(scanTimerRef.current)clearTimeout(scanTimerRef.current)}
  },[scannerOpen,cameraStream])

  const companies=useMemo(()=>filteredCompanies(filters),[filters])
  const allowed=useMemo(()=>new Set(companies.map(c=>c.code)),[companies])
  const specific=filters.company!=='All'||filters.region!=='All'||filters.province!=='All'||filters.pic!=='All'
  const scopedAssets=useMemo(()=>assets.filter(a=>{const code=companyCodeOf(a);return code?allowed.has(code):!specific}),[assets,allowed,specific])
  const rows=useMemo(()=>runs.filter(r=>{const code=companyCodeOf(r);const q=search.trim().toLowerCase();const text=[r.id,r.companyCode,r.targetId,r.targetName,r.unit,r.location,r.inspector].join(' ').toLowerCase();return(code?allowed.has(code):!specific)&&(!q||text.includes(q))}).sort((a,b)=>String(b.inspectionDate||'').localeCompare(String(a.inspectionDate||''))),[runs,allowed,specific,search])
  const activeRun=runs.find(r=>r.id===activeRunId)||null
  const activeItems=useMemo(()=>activeRun?items.filter(i=>i.runId===activeRun.id).sort((a,b)=>a.seq-b.seq):[],[items,activeRun])
  const completed=rows.filter(r=>r.status==='Completed').length
  const findingCount=useMemo(()=>{const ids=new Set(rows.map(r=>r.id));return items.filter(i=>ids.has(i.runId)&&i.result==='NG').length},[rows,items])
  const avgScore=(()=>{const scored=rows.filter(r=>r.status==='Completed'&&Number.isFinite(Number(r.score)));return scored.length?Math.round(scored.reduce((s,r)=>s+Number(r.score),0)/scored.length):0})()

  function flash(text){setNotice(text);setTimeout(()=>setNotice(''),3600)}
  function stopScanner(){
    if(scanTimerRef.current)clearTimeout(scanTimerRef.current)
    setScanning(false);setScannerOpen(false);setScannerMessage('Menyiapkan kamera…')
    if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());setCameraStream(null)}
  }
  async function startScanner(){
    if(!canManage){flash('Role Viewer hanya dapat melihat QR Inspection.');return}
    if(typeof window==='undefined'||!navigator.mediaDevices?.getUserMedia){flash('Camera API tidak tersedia di browser ini. Buka SINSHE melalui HTTPS di Chrome/Safari terbaru.');return}
    try{
      if('BarcodeDetector' in window){
        try{detectorRef.current=new window.BarcodeDetector({formats:['qr_code']});scannerModeRef.current='native'}
        catch{await ensureJsQr();detectorRef.current=null;scannerModeRef.current='jsqr'}
      }else{
        await ensureJsQr();detectorRef.current=null;scannerModeRef.current='jsqr'
      }
      setScannerOpen(true)
      setScannerMessage('Meminta izin kamera…')
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false})
      setCameraStream(stream)
    }catch(err){
      setScannerOpen(false)
      const name=err?.name||''
      if(name==='NotAllowedError'||name==='PermissionDeniedError')flash('Izin kamera ditolak. Izinkan Camera untuk sinshe2-0.vercel.app di pengaturan browser lalu tekan Scan QR lagi.')
      else if(name==='NotFoundError'||name==='DevicesNotFoundError')flash('Kamera tidak ditemukan pada perangkat ini.')
      else flash(`Kamera/QR scanner tidak dapat dibuka: ${err?.message||'Unknown error'}`)
    }
  }
  async function scanImageFile(file){
    if(!file)return
    try{
      await ensureJsQr()
      const url=URL.createObjectURL(file)
      const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=url})
      const canvas=document.createElement('canvas');canvas.width=image.naturalWidth||image.width;canvas.height=image.naturalHeight||image.height
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,canvas.width,canvas.height)
      const data=ctx.getImageData(0,0,canvas.width,canvas.height)
      URL.revokeObjectURL(url)
      const raw=window.jsQR(data.data,data.width,data.height,{inversionAttempts:'attemptBoth'})?.data
      if(raw){resolveCode(raw);stopScanner()}else flash('QR tidak terbaca dari foto. Pastikan QR memenuhi frame dan tidak blur.')
    }catch(err){flash(`Foto QR gagal dibaca: ${err?.message||'Unknown error'}`)}
  }
  function resolveCode(raw){
    const value=String(raw||'').trim();if(!value){flash('Kode QR kosong.');return}
    let token=value
    try{const url=new URL(value);token=url.searchParams.get('asset')||value}catch{}
    token=token.replace(/^SINSHE:ASSET:/i,'').trim()
    const found=assets.find(a=>String(a.id).toLowerCase()===token.toLowerCase()||String(a.serial||'').toLowerCase()===token.toLowerCase())
    if(!found){setManualCode(value);flash(`Asset tidak ditemukan untuk kode: ${value}`);return}
    setTarget(found);setManualCode(found.id);setFilters(prev=>({...prev,company:found.companyCode||'All'}));flash(`${found.id} · ${found.name} berhasil dikenali.`)
  }
  function resolveManual(){resolveCode(manualCode)}

  async function persistRun(run,nextItems,message){
    const nextRuns=mergeById(runs,[run]),mergedItems=mergeById(items,nextItems)
    setRuns(nextRuns);setItems(mergedItems);safeWrite(RUN_KEY,nextRuns);safeWrite(ITEM_KEY,mergedItems);setActiveRunId(run.id)
    if(isSupabaseConfigured()){
      try{await Promise.all([dbUpsert('qr_inspection_runs',[runToDb(run)],'id'),dbUpsert('qr_inspection_items',nextItems.map(itemToDb),'id')]);setSource('Supabase central data')}catch(err){flash(`Tersimpan lokal, sync central gagal: ${err.message}`);return false}
    }
    if(message)flash(message);return true
  }

  async function startInspection(){
    if(!canManage){flash('Role Viewer hanya dapat melihat QR Inspection.');return}
    if(!target){flash('Scan QR atau pilih Asset ID terlebih dahulu.');return}
    if(!inspector.trim()){flash('Nama inspector wajib diisi.');return}
    const runId=`QRI-${today().replaceAll('-','')}-${String(Date.now()).slice(-6)}`
    const rows=(templates[target.category]||templates.Generic).map((t,index)=>({id:`${runId}-I${String(index+1).padStart(2,'0')}`,runId,companyCode:target.companyCode||'',unit:target.unit,seq:index+1,category:t[0],checkpoint:t[1],result:'Pending',risk:t[2],note:'',evidenceDocumentId:''}))
    const run={id:runId,companyCode:target.companyCode||'',targetType:'Asset',targetId:target.id,targetName:target.name,unit:target.unit,location:target.unit,inspector:inspector.trim(),inspectionDate:today(),status:'Draft',score:null,qrValue:`SINSHE:ASSET:${target.id}`,notes:''}
    setFiles({});await persistRun(run,rows,`${runId} dimulai untuk ${target.name}.`)
  }

  function patchItem(id,patch){
    const next=items.map(i=>i.id===id?{...i,...patch}:i);setItems(next);safeWrite(ITEM_KEY,next)
  }
  function setPhoto(id,file){setFiles(prev=>({...prev,[id]:file||null}))}

  async function uploadEvidence(run,item,file){
    if(!file)return''
    const docId=`DOC-${item.id}`
    const storagePath=`${run.companyCode||'UNASSIGNED'}/qr-inspection/${run.id}/${item.id}-${safeName(file.name)}`
    await storageUpload(BUCKET,storagePath,file,{upsert:true})
    const doc={id:docId,companyCode:run.companyCode,recordId:item.id,title:`${run.id} · ${item.checkpoint}`,unit:run.unit,referenceNo:run.targetId,issuedDate:run.inspectionDate,fileName:file.name,storagePath,mimeType:file.type,fileSize:file.size,notes:`Photo evidence QR Inspection ${run.id}`}
    await dbUpsert('evidence_documents',[evidenceToDb(doc)],'id')
    return docId
  }

  async function createFindingRecords(run,ngItems){
    const localObs=safeRead(OBS_KEY),localCa=safeRead(CA_KEY)
    const obsRows=[],caRows=[]
    ngItems.forEach((item,index)=>{
      const obsId=`OBS-QR-${run.id}-${String(index+1).padStart(2,'0')}`
      const action=`Tindak lanjuti hasil QR Inspection ${run.targetId}: ${item.checkpoint}`
      const dueDate=dueForRisk(item.risk)
      const obs={id:obsId,companyCode:run.companyCode,date:run.inspectionDate,type:'Unsafe Condition',description:`[${run.id}] ${item.checkpoint}${item.note?` — ${item.note}`:''}`,unit:run.unit,location:run.location||run.targetName,risk:item.risk,status:'Open',pic:target?.owner||run.inspector,dueDate,action,evidence:item.evidenceDocumentId||''}
      const ca={id:`CA-${obsId}`,companyCode:run.companyCode,source:'QR Inspection',sourceId:obsId,title:action,unit:run.unit,location:run.location||run.targetName,category:'Engineering Control',priority:item.risk,pic:target?.owner||run.inspector,dueDate,status:'Open',progress:0,evidence:item.evidenceDocumentId||'',createdAt:run.inspectionDate}
      obsRows.push(obs);caRows.push(ca)
    })
    safeWrite(OBS_KEY,mergeById(localObs,obsRows));safeWrite(CA_KEY,mergeById(localCa,caRows))
    if(isSupabaseConfigured()&&obsRows.length){await Promise.all([dbUpsert('observations',obsRows.map(observationToDb),'id'),dbUpsert('corrective_actions',caRows.map(correctiveToDb),'id')])}
  }

  async function completeInspection(){
    if(!canManage||!activeRun)return
    const pending=activeItems.filter(i=>i.result==='Pending')
    if(pending.length){flash(`${pending.length} checkpoint masih Pending.`);return}
    try{
      let completedItems=[...activeItems]
      if(isSupabaseConfigured()){
        for(const item of activeItems){const file=files[item.id];if(file){const docId=await uploadEvidence(activeRun,item,file);completedItems=completedItems.map(x=>x.id===item.id?{...x,evidenceDocumentId:docId}:x)}}
      }
      const assessed=completedItems.filter(i=>i.result!=='N/A'),ok=assessed.filter(i=>i.result==='OK').length
      const score=assessed.length?Math.round(ok/assessed.length*100):100
      const run={...activeRun,status:'Completed',score}
      await persistRun(run,completedItems,'')
      const ng=completedItems.filter(i=>i.result==='NG')
      await createFindingRecords(run,ng)
      setItems(prev=>mergeById(prev,completedItems));safeWrite(ITEM_KEY,mergeById(items,completedItems));setFiles({})
      flash(`${run.id} Completed · score ${score}%. ${ng.length} finding dibuat ke Observation & Corrective Action.`)
    }catch(err){flash(`Completion gagal: ${err.message}`)}
  }

  function exportCSV(){
    const header=['Run ID','Company/PT','Asset ID','Asset','Category','Unit','Inspector','Date','Status','Score','Checkpoint','Result','Risk','Note','Evidence Document']
    const data=[]
    rows.forEach(run=>{const list=items.filter(i=>i.runId===run.id);if(!list.length)data.push([run.id,run.companyCode,run.targetId,run.targetName,'',run.unit,run.inspector,run.inspectionDate,run.status,run.score??'']);else list.forEach(i=>data.push([run.id,run.companyCode,run.targetId,run.targetName,i.category,run.unit,run.inspector,run.inspectionDate,run.status,run.score??'',i.checkpoint,i.result,i.risk,i.note,i.evidenceDocumentId]))})
    const csv=[header,...data].map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n')
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`SINSHE_QR_Inspection_${today()}.csv`;a.click();URL.revokeObjectURL(url)
  }

  return <Shell title="QR Inspection" subtitle="Scan asset → checklist → photo evidence → finding → corrective action dalam satu workflow digital.">
    <CompanyScopeBar filters={filters} onChange={setFilters} onReset={()=>setFilters(DEFAULT_COMPANY_FILTERS)}/>
    {notice&&<div className={styles.notice}><CheckCircle2 size={18}/>{notice}</div>}

    <div className="stats-grid four">
      <StatCard label="Inspection Run" value={rows.length} hint={source} tone="blue" icon={<ClipboardCheck/>}/>
      <StatCard label="Completed" value={completed} hint="QR inspection selesai" tone="green" icon={<CheckCircle2/>}/>
      <StatCard label="Findings" value={findingCount} hint="checkpoint NG" tone="red" icon={<XCircle/>}/>
      <StatCard label="Average Score" value={`${avgScore}%`} hint="completed inspections" tone="purple" icon={<ShieldCheck/>}/>
    </div>

    <div className={styles.scanGrid}>
      <Panel title="1 · Scan / Identify Asset">
        <div className={styles.scannerBox}><QrCode size={44}/><div><b>QR Payload Standard</b><span>SINSHE:ASSET:AST-XXX-000 atau Asset ID / Serial Number</span></div></div>
        <div className={styles.manualRow}><input value={manualCode} onChange={e=>setManualCode(e.target.value)} placeholder="Asset ID / Serial / QR payload"/><button className={styles.secondary} onClick={resolveManual}><Search size={16}/> Find</button><button className={styles.primary} onClick={startScanner}><ScanLine size={17}/> Scan QR</button></div>
        <div className={styles.assetList}><span>Asset sesuai filter PT</span>{scopedAssets.slice(0,8).map(a=><button key={a.id} onClick={()=>{setTarget(a);setManualCode(a.id)}} className={target?.id===a.id?styles.assetActive:''}><b>{a.id}</b><small>{a.name} · {a.unit}</small></button>)}{!scopedAssets.length&&<div className={styles.empty}>Belum ada asset pada scope PT ini.</div>}</div>
      </Panel>

      <Panel title="2 · Inspection Target">
        {target?<><div className={styles.targetCard}><div className={styles.targetIcon}><QrCode/></div><div><span>{target.companyCode||'-'} · {target.category}</span><h3>{target.name}</h3><p>{target.id} · Serial {target.serial||'-'} · {target.unit}</p><small>Owner: {target.owner||'-'} · Status: {target.operational||'-'}</small></div></div><label className={styles.inspector}>Inspector<input value={inspector} onChange={e=>setInspector(e.target.value)} placeholder="Nama inspector"/></label><button className={styles.startBtn} onClick={startInspection} disabled={activeRun?.status==='Draft'}><PlayCircle size={18}/> Start Inspection</button></>:<div className={styles.emptyLarge}><ScanLine size={38}/><b>Belum ada target</b><span>Scan QR atau pilih asset dari daftar.</span></div>}
      </Panel>
    </div>

    {activeRun&&<Panel title={`${activeRun.id} · ${activeRun.targetName}`} action={<Badge tone={statusTone(activeRun.status)}>{activeRun.status}</Badge>} className="mt">
      <div className={styles.runMeta}><div><span>PT</span><b>{activeRun.companyCode||'-'}</b></div><div><span>Asset</span><b>{activeRun.targetId}</b></div><div><span>Inspector</span><b>{activeRun.inspector}</b></div><div><span>Tanggal</span><b>{fmt(activeRun.inspectionDate)}</b></div></div>
      <div className="table-wrap"><table><thead><tr><th>#</th><th>Checkpoint</th><th>Result</th><th>Risk</th><th>Note</th><th>Photo Evidence</th></tr></thead><tbody>{activeItems.map(item=><tr key={item.id} className={item.result==='NG'?styles.ngRow:''}><td><b>{item.seq}</b><small className={styles.block}>{item.category}</small></td><td><b>{item.checkpoint}</b></td><td><div className={styles.resultButtons}>{['OK','NG','N/A'].map(v=><button key={v} disabled={activeRun.status==='Completed'} onClick={()=>patchItem(item.id,{result:v})} className={item.result===v?styles[`r${v.replace('/','')}`]:''}>{v}</button>)}</div></td><td><select value={item.risk} disabled={activeRun.status==='Completed'} onChange={e=>patchItem(item.id,{risk:e.target.value})}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select><div className={styles.riskMini}><Badge tone={riskTone(item.risk)}>{item.risk}</Badge></div></td><td><textarea value={item.note} disabled={activeRun.status==='Completed'} onChange={e=>patchItem(item.id,{note:e.target.value})} placeholder={item.result==='NG'?'Jelaskan kondisi/temuan...':'Catatan opsional'}/></td><td>{activeRun.status==='Completed'?item.evidenceDocumentId?<Badge tone="green">Evidence linked</Badge>:'-':<label className={styles.photoBtn}><ImagePlus size={15}/>{files[item.id]?.name||'Tambah Foto'}<input type="file" accept="image/*" capture="environment" onChange={e=>setPhoto(item.id,e.target.files?.[0]||null)}/></label>}</td></tr>)}</tbody></table></div>
      {activeRun.status==='Draft'&&<div className={styles.completeBar}><div><b>Checklist completion</b><span>{activeItems.filter(i=>i.result!=='Pending').length}/{activeItems.length} checkpoint terisi</span><Progress value={activeItems.length?Math.round(activeItems.filter(i=>i.result!=='Pending').length/activeItems.length*100):0} tone="green"/></div><button className={styles.completeBtn} onClick={completeInspection}><CheckCircle2 size={18}/> Complete Inspection</button></div>}
      {activeRun.status==='Completed'&&<div className={styles.completedBox}><ShieldCheck size={21}/><span><b>Inspection Completed · Score {activeRun.score}%</b>Finding NG otomatis dibuat menjadi Safety Observation dan Corrective Action.</span></div>}
    </Panel>}

    <Panel title="QR Inspection History" className="mt" action={<button className={styles.exportBtn} onClick={exportCSV}><Download size={15}/> Export CSV</button>}>
      <div className={styles.historyFilter}><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari run, asset, PT, inspector..."/><button onClick={()=>window.location.reload()}><RefreshCw size={15}/> Refresh</button></div>
      <div className="table-wrap"><table><thead><tr><th>Run</th><th>PT</th><th>Asset</th><th>Unit</th><th>Inspector</th><th>Date</th><th>Findings</th><th>Score</th><th>Status</th></tr></thead><tbody>{rows.map(r=>{const list=items.filter(i=>i.runId===r.id),ng=list.filter(i=>i.result==='NG').length;return <tr key={r.id} onClick={()=>setActiveRunId(r.id)} className={activeRunId===r.id?styles.selectedRow:''}><td><b>{r.id}</b></td><td><b>{r.companyCode||'-'}</b></td><td><b>{r.targetName}</b><small className={styles.block}>{r.targetId}</small></td><td>{r.unit}</td><td>{r.inspector}</td><td>{fmt(r.inspectionDate)}</td><td>{ng?<Badge tone="red">{ng} NG</Badge>:<Badge tone="green">0</Badge>}</td><td>{r.score===null||r.score===undefined?'-':`${r.score}%`}</td><td><Badge tone={statusTone(r.status)}>{r.status}</Badge></td></tr>})}{!rows.length&&<tr><td colSpan="9" className={styles.empty}>Belum ada QR inspection pada scope ini.</td></tr>}</tbody></table></div>
    </Panel>

    <div className={styles.info}><Camera size={19}/><div><b>Scanner QR menggunakan kamera perangkat.</b><span>Izinkan akses Camera saat browser meminta permission. Jika live scan sulit membaca QR, gunakan tombol Ambil Foto QR sebagai fallback.</span></div></div>

    {scannerOpen&&<div className={styles.backdrop}><div className={styles.scannerModal}><div className={styles.modalHead}><div><span>QR SCANNER</span><h2>Arahkan kamera ke QR asset</h2></div><button onClick={stopScanner}><X size={20}/></button></div><video ref={videoRef} className={styles.video} playsInline muted/><canvas ref={canvasRef} style={{display:'none'}}/><div className={styles.scanLine}/><p>{scanning?scannerMessage:'Menyiapkan kamera…'}</p><label className={styles.secondary} style={{marginTop:10,cursor:'pointer'}}>Ambil Foto QR<input type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={e=>scanImageFile(e.target.files?.[0]||null)}/></label></div></div>}
  </Shell>
}
