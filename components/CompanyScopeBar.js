'use client'

import { filteredCompanies } from '../lib/company-master'

const selectStyle = {
  width:'100%', minWidth:0, border:'1px solid #dfe5e7', borderRadius:10, background:'#fff',
  padding:'10px 12px', fontSize:12, fontWeight:750, color:'#17212b', outline:'none'
}

export default function CompanyScopeBar({ filters, onChange }) {
  const companies = filteredCompanies({
    ...filters,
    region:'All',
    province:'All',
    pic:'All',
    company:'All'
  })

  const setCompany = value => onChange({
    ...filters,
    company:value,
    region:'All',
    province:'All',
    pic:'All'
  })

  return <div style={{marginBottom:14,border:'1px solid #dce8e0',borderRadius:14,overflow:'hidden',background:'#fff'}}>
    <div style={{background:'#0d4d36',padding:'10px 14px',color:'#fff'}}>
      <div style={{fontSize:10,fontWeight:900,letterSpacing:1.1}}>OVERVIEW FILTER · COMPANY / PT</div>
    </div>
    <div style={{padding:12}}>
      <label style={{display:'grid',gap:5,maxWidth:560}}>
        <span style={{fontSize:10,fontWeight:850,color:'#6f7a84'}}>Company / PT</span>
        <select value={filters.company} onChange={e=>setCompany(e.target.value)} style={selectStyle}>
          <option value="All">All Companies</option>
          {companies.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
        </select>
      </label>
    </div>
    <div style={{padding:'0 13px 11px',fontSize:10,color:'#77818b'}}>{companies.length} PT tersedia</div>
  </div>
}
