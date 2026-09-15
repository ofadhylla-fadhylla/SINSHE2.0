'use client'

import { COMPANY_MASTER, filteredCompanies } from '../lib/company-master'

const uniq = values => [...new Set(values.filter(Boolean))].sort((a,b) => a.localeCompare(b))

const selectStyle = {
  width:'100%', minWidth:0, border:'1px solid #dfe5e7', borderRadius:10, background:'#fff',
  padding:'10px 12px', fontSize:12, fontWeight:750, color:'#17212b', outline:'none'
}

export default function CompanyScopeBar({ filters, onChange, onReset }) {
  const base = COMPANY_MASTER.filter(item => filters.status === 'All' || item.status === filters.status)
  const regions = uniq(base.map(item => item.region))
  const provinces = uniq(base.filter(item => filters.region === 'All' || item.region === filters.region).map(item => item.province))
  const pics = uniq(base.filter(item => (filters.region === 'All' || item.region === filters.region) && (filters.province === 'All' || item.province === filters.province)).map(item => item.pic))
  const companies = filteredCompanies({ ...filters, company:'All' })

  const set = (key, value) => {
    const next = { ...filters, [key]: value }
    if (key === 'region') { next.province = 'All'; next.company = 'All' }
    if (key === 'province') next.company = 'All'
    if (key === 'pic') next.company = 'All'
    onChange(next)
  }

  return <div style={{marginBottom:14,border:'1px solid #dce8e0',borderRadius:14,overflow:'hidden',background:'#fff'}}>
    <div style={{background:'#0d4d36',padding:'10px 14px',color:'#fff'}}>
      <div style={{fontSize:10,fontWeight:900,letterSpacing:1.1}}>OVERVIEW FILTER · COMPANY / PT</div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1.15fr 1fr auto',gap:10,padding:12,alignItems:'end'}}>
      <label style={{display:'grid',gap:5}}><span style={{fontSize:10,fontWeight:850,color:'#6f7a84'}}>Company / PT</span><select value={filters.company} onChange={e=>set('company',e.target.value)} style={selectStyle}><option value="All">All Companies</option>{companies.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
      <label style={{display:'grid',gap:5}}><span style={{fontSize:10,fontWeight:850,color:'#6f7a84'}}>Region</span><select value={filters.region} onChange={e=>set('region',e.target.value)} style={selectStyle}><option value="All">All Regions</option>{regions.map(v=><option key={v}>{v}</option>)}</select></label>
      <label style={{display:'grid',gap:5}}><span style={{fontSize:10,fontWeight:850,color:'#6f7a84'}}>Province</span><select value={filters.province} onChange={e=>set('province',e.target.value)} style={selectStyle}><option value="All">All Provinces</option>{provinces.map(v=><option key={v}>{v}</option>)}</select></label>
      <label style={{display:'grid',gap:5}}><span style={{fontSize:10,fontWeight:850,color:'#6f7a84'}}>PIC</span><select value={filters.pic} onChange={e=>set('pic',e.target.value)} style={selectStyle}><option value="All">All PIC</option>{pics.map(v=><option key={v}>{v}</option>)}</select></label>
      <button type="button" onClick={onReset} style={{border:'1px solid #dfe5e7',background:'#f7f9f8',borderRadius:10,padding:'10px 14px',fontWeight:850,color:'#0d4d36',cursor:'pointer'}}>Reset</button>
    </div>
    <div style={{padding:'0 13px 11px',fontSize:10,color:'#77818b'}}>{companies.length} PT sesuai filter master data</div>
  </div>
}
