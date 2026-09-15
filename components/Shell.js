'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity, AlertTriangle, BarChart3, Bell, Building2, ClipboardCheck,
  FileCheck2, Gauge, Home, Leaf, Menu, Search, ShieldCheck, Siren,
  Wrench, X
} from 'lucide-react'
import { useState } from 'react'

const nav = [
  { href: '/', label: 'Ecosystem', icon: Home },
  { href: '/kpi', label: 'KPI Dashboard', icon: BarChart3 },
  { href: '/asset-integrity', label: 'Asset Integrity', icon: Wrench },
  { href: '/regulatory-compliance', label: 'Regulatory Compliance', icon: FileCheck2 },
]

const coming = [
  ['Hazard & Risk', AlertTriangle],
  ['Inspection & Observation', ClipboardCheck],
  ['Incident Management', Siren],
  ['Permit to Work', ShieldCheck],
]

export default function Shell({ children, title, subtitle }) {
  const path = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand-block">
          <div className="brand-mark">S</div>
          <div>
            <div className="brand-name">SHINSE <span>2.0</span></div>
            <div className="brand-sub">Safety • Health • Environment</div>
          </div>
          <button className="icon-btn mobile-only" onClick={() => setOpen(false)}><X size={20}/></button>
        </div>

        <nav className="nav-list">
          <div className="nav-section">MAIN MODULES</div>
          {nav.map(item => {
            const Icon = item.icon
            const active = path === item.href
            return <Link key={item.href} href={item.href} className={`nav-item ${active ? 'active' : ''}`} onClick={()=>setOpen(false)}>
              <Icon size={19}/><span>{item.label}</span>
            </Link>
          })}
          <div className="nav-section">NEXT MODULES</div>
          {coming.map(([label, Icon]) => <div key={label} className="nav-item muted"><Icon size={18}/><span>{label}</span><span className="soon">Soon</span></div>)}
        </nav>

        <div className="sidebar-footer">
          <div className="predictive-pill"><Activity size={18}/> From Reactive to Predictive Safety</div>
          <div className="small-note">KPN Plantations • Internal Prototype</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="top-left">
            <button className="icon-btn mobile-only" onClick={() => setOpen(true)}><Menu size={22}/></button>
            <div>
              <div className="eyebrow">KPN PLANTATIONS</div>
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
          <div className="top-actions">
            <div className="search-box"><Search size={18}/><input placeholder="Cari data, aset, regulasi..."/></div>
            <button className="icon-btn notification"><Bell size={20}/><span/></button>
            <div className="avatar">SM</div>
          </div>
        </header>
        <section className="page-content">{children}</section>
      </main>
    </div>
  )
}
