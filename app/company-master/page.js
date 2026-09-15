'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import { Badge, Panel, StatCard } from '../../components/Ui'
import { AlertTriangle, Building2, CheckCircle2, Database, Download, Filter, Link2, Search, ShieldCheck } from 'lucide-react'
import { COMPANY_MASTER } from '../../lib/company-master'
import styles from './company-master.module.css'

const SOURCES = [
  ['Inspection & Observation','sinshe-observations'],
  ['Corrective Action','sinshe-corrective-actions'],
  ['Incident','sinshe-incidents'],
  ['Permit to Work','sinshe-permits'],
  ['Asset Integrity','sinshe-assets'],
  ['Regulatory Compliance','sinshe-regulatory-obligations'],
  ['Hazard & Risk','sinshe-hazards'],
  ['Learning & Competency','sinshe-learning-records'],
]

const uniq = values => [...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b))
const companyOf = item => String(item?.companyCode || item?.company_code || '').trim().toUpperCase()

function safeRead(key){
  try { const raw=localStorage.getItem(key); return raw ? JSON.parse(raw) : [] } catch { return [] }
}

function recordTitle(item){
  return item?.title || item?.description || item?.name || item?.obligation || item?.trainingName || item?.training_name || item?.activity || item?.hazard || item?.id || 'Record'
}

export default function CompanyMaster(){
  const [search,setSearch]=useState('')
  const [region,setRegion]=useState('All')
  const [province,setProvince]=useState('All')
  const [pic,setPic]=useState('All')
  const [status,setStatus]=useState('Active')
  const [sourceFilter,setSourceFilter]=useState('All')
  const [snapshot,setSnapshot]=useState({records:[],loaded:false})
  const [assignments,setAssignments]=useState({})
  const [notice,setNotice]=useState('')

  function loadSnapshot(){
    if(typeof window==='undefined') return
    const records=[]
    SOURCES.forEach(([source,key])=>{
      const rows=safeRead(key)
      if(Array.isArray(rows)) rows.forEach((item,index)=>records.push({source,key,index,item,companyCode:companyOf(item)}))
    })
    setSnapshot({records,loaded:true})
  }

  useEffect(()=>{loadSnapshot()},[])

  const regions=useMemo(()=>uniq(COMPANY_MASTER.filter(c=>status==='All'||c.status===status).map(c=>c.region)),[status])
  const provinces=useMemo(()=>uniq(COMPANY_MASTER.filter(c=>(status==='All'||c.status===status)&&(region==='All'||c.region===region)).map(c=>c.province)),[status,region])
  const pics=useMemo(()=>uniq(COMPANY_MASTER.filter(c=>(status==='All'||c.status===status)&&(region==='All'||c.region===region)&&(province==='All'||c.province===province)).map(c=>c.pic)),[status,region,province])

  const rows=useMemo(()=>COMPANY_MASTER.filter(c=>{
    const q=search.trim().toLowerCase()
    const matchSearch=!q||[c.code,c.name,c.pic,c.region,c.province].join(' ').toLowerCase().includes(q)
    return matchSearch&&(status==='All'||c.status===status)&&(region==='All'||c.region===region)&&(province==='All'||c.province===province)&&(pic==='All'||c.pic===pic)
  }),[search,status,region,province,pic])

  const counts=useMemo(()=>{
    const map={}
    snapshot.records.forEach(r=>{if(r.companyCode)map[r.companyCode]=(map[r.companyCode]||0)+1})
    return map
  },[snapshot])

  const unassigned=useMemo(()=>snapshot.records.filter(r=>{
    if(r.companyCode) return false
    if(sourceFilter!=='All'&&r.source!==sourceFilter) return false
    const q=search.trim().toLowerCase()
    return !q||[r.source,r.item?.id,recordTitle(r.item),r.item?.unit,r.item?.location].join(' ').toLowerCase().includes(q)
  }),[snapshot,sourceFilter,search])

  function resetFilters(){setSearch('');setRegion('All');setProvince('All');setPic('All');setStatus('Active');setSourceFilter('All')}
  function flash(text){setNotice(text);setTimeout(()=>setNotice(''),3200)}

  function assignRecord(row){
    const code=assignments[`${row.key}:${row.index}`]
    if(!code){flash('Pilih Company/PT tujuan terlebih dahulu.');return}
    const data=safeRead(row.key)
    if(!Array.isArray(data)||!data[row.index]){flash('Record berubah. Muat ulang halaman lalu coba lagi.');loadSnapshot();return}
    data[row.index]={...data[row.index],companyCode:code}
    try{
      localStorage.setItem(row.key,JSON.stringify(data))
      window.dispatchEvent(new CustomEvent('sinshe-central-data',{detail:{key:row.key}}))
      setAssignments(prev=>{const next={...prev};delete next[`${row.key}:${row.index}`];return next})
      loadSnapshot()
      flash(`${row.item?.id||'Record'} berhasil ditautkan ke PT ${code}. Central Sync akan mengirim perubahan ke database.`)
    }catch{flash('Gagal menyimpan assignment ke browser.')}
  }

  function exportCSV(){
    const header=['Code','Company / PT','PIC','Region','Province','Status','Linked Records']
    const data=rows.map(c=>[c.code,c.name,c.pic,c.region,c.province,c.status,counts[c.code]||0])
    const csv=[header,...data].map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n')
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`SINSHE_Master_PT_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url)
  }

  const assigned=snapshot.records.filter(r=>r.companyCode).length
  const total=snapshot.records.length

  return <Shell title="Master Data PT" subtitle="Satu sumber master Company/PT untuk filter lintas modul, data quality dan assignment record SINSHE 2.0.">
    {notice&&<div className={styles.notice}><CheckCircle2 size={18}/>{notice}</div>}

    <div className="stats-grid four">
      <StatCard label="Master PT" value={COMPANY_MASTER.length} hint={`${uniq(COMPANY_MASTER.map(c=>c.region)).length} region`} tone="green" icon={<Building2/>}/>
      <StatCard label="Province" value={uniq(COMPANY_MASTER.map(c=>c.province)).length} hint={`${uniq(COMPANY_MASTER.map(c=>c.pic)).length} PIC master`} tone="blue" icon={<ShieldCheck/>}/>
      <StatCard label="Linked Records" value={assigned} hint={`${total} record terbaca di browser`} tone="purple" icon={<Link2/>}/>
      <StatCard label="Unassigned PT" value={total-assigned} hint="perlu data cleansing" tone={total-assigned?'red':'green'} icon={<AlertTriangle/>}/>
    </div>

    <div className={styles.toolbar}><div><h2>Company / PT Master Register</h2><p>Master 29 PT menjadi referensi dropdown dan filter seluruh modul.</p></div><button className={styles.secondary} onClick={exportCSV}><Download size={17}/> Export CSV</button></div>

    <Panel>
      <div className={styles.filters}>
        <label className={styles.search}><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari kode PT, nama, PIC, region, province..."/></label>
        <label><Filter size={15}/><select value={region} onChange={e=>{setRegion(e.target.value);setProvince('All')}}><option value="All">All Regions</option>{regions.map(v=><option key={v}>{v}</option>)}</select></label>
        <label><select value={province} onChange={e=>setProvince(e.target.value)}><option value="All">All Provinces</option>{provinces.map(v=><option key={v}>{v}</option>)}</select></label>
        <label><select value={pic} onChange={e=>setPic(e.target.value)}><option value="All">All PIC</option>{pics.map(v=><option key={v}>{v}</option>)}</select></label>
        <label><select value={status} onChange={e=>setStatus(e.target.value)}><option>All</option><option>Active</option></select></label>
        <button className={styles.reset} onClick={resetFilters}>Reset</button>
      </div>
      <div className="table-wrap"><table><thead><tr><th>Code</th><th>Company / PT</th><th>PIC</th><th>Region</th><th>Province</th><th>Status</th><th>Linked Data</th></tr></thead><tbody>{rows.map(c=><tr key={c.code}><td><b>{c.code}</b></td><td><b>{c.name}</b></td><td>{c.pic}</td><td>{c.region}</td><td>{c.province}</td><td><Badge tone="green">{c.status}</Badge></td><td><b>{counts[c.code]||0}</b> record</td></tr>)}{!rows.length&&<tr><td colSpan="7" className={styles.empty}>Tidak ada PT sesuai filter.</td></tr>}</tbody></table></div>
    </Panel>

    <Panel title="Data Quality · Unassigned Company/PT" className="mt">
      <div className={styles.qualityHead}><div><Database/><span><b>{total-assigned} record belum memiliki Company/PT</b><small>Data lama tidak ditebak otomatis agar tidak salah atribusi. Assign PT secara manual di bawah.</small></span></div><select value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)}><option value="All">All Modules</option>{SOURCES.map(([label])=><option key={label}>{label}</option>)}</select></div>
      <div className="table-wrap"><table><thead><tr><th>Module</th><th>ID</th><th>Record</th><th>Unit / Location</th><th>Assign Company / PT</th><th>Aksi</th></tr></thead><tbody>{unassigned.map(r=>{const key=`${r.key}:${r.index}`;return <tr key={key}><td><Badge tone="orange">{r.source}</Badge></td><td><b>{r.item?.id||'-'}</b></td><td><b>{recordTitle(r.item)}</b></td><td>{r.item?.unit||'-'}<small className={styles.block}>{r.item?.location||r.item?.area||'-'}</small></td><td><select className={styles.companySelect} value={assignments[key]||''} onChange={e=>setAssignments(prev=>({...prev,[key]:e.target.value}))}><option value="">Pilih PT...</option>{COMPANY_MASTER.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></td><td><button className={styles.assign} onClick={()=>assignRecord(r)}><Link2 size={14}/> Assign</button></td></tr>})}{!unassigned.length&&<tr><td colSpan="6" className={styles.empty}>{snapshot.loaded?'Semua record pada filter ini sudah memiliki Company/PT.':'Memuat data quality...'}</td></tr>}</tbody></table></div>
    </Panel>

    <div className={styles.info}><ShieldCheck size={19}/><div><b>Data governance</b><span>Form operasional baru sudah mewajibkan Company/PT. Halaman ini dipakai untuk membersihkan record lama yang masih unassigned agar filter Executive Dashboard, KPI dan AI Recommendation konsisten.</span></div></div>
  </Shell>
}
