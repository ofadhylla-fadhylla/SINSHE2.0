'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity, AlertTriangle, BarChart3, Bell, BrainCircuit, ClipboardCheck,
  FileCheck2, LayoutDashboard, ListTodo, Menu, Network, Search, ShieldCheck, Siren,
  Settings, Wrench, X
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { canAccess, getSessionRole, roles, setSessionRole } from '../lib/access'

const groups = [
  {
    title: 'OVERVIEW',
    items: [
      { href: '/', label: 'Executive Dashboard', icon: LayoutDashboard },
      { href: '/ecosystem', label: 'Ecosystem', icon: Network },
      { href: '/kpi', label: 'KPI Dashboard', icon: BarChart3 },
    ],
  },
  {
    title: 'HSE OPERATIONS',
    items: [
      { href: '/hazard-risk', label: 'Hazard & Risk Management', icon: AlertTriangle },
      { href: '/inspection', label: 'Inspection & Observation', icon: ClipboardCheck },
      { href: '/corrective-action', label: 'Corrective Action Tracking', icon: ListTodo },
      { href: '/incident', label: 'Incident Management', icon: Siren },
      { href: '/permit-to-work', label: 'Permit to Work', icon: ShieldCheck },
    ],
  },
  {
    title: 'ASSET & COMPLIANCE',
    items: [
      { href: '/asset-integrity', label: 'Asset Integrity Management', icon: Wrench },
      { href: '/regulatory-compliance', label: 'Regulatory Compliance', icon: FileCheck2 },
    ],
  },
  {
    title: 'INTELLIGENCE & SYSTEM',
    items: [
      { href: '/ai-recommendation', label: 'AI Recommendation', icon: BrainCircuit },
      { href: '/administration', label: 'Administration', icon: Settings },
    ],
  },
]

export default function Shell({ children, title, subtitle }) {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState('Admin')

  useEffect(() => {
    const syncRole = () => setRole(getSessionRole())
    syncRole()
    window.addEventListener('storage', syncRole)
    window.addEventListener('sinshe-role-change', syncRole)
    return () => {
      window.removeEventListener('storage', syncRole)
      window.removeEventListener('sinshe-role-change', syncRole)
    }
  }, [])

  function changeRole(nextRole) {
    setSessionRole(nextRole)
    setRole(nextRole)
  }

  return (
    <div className="app-shell">
      {open && <div className="scrim mobile-only" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand-block">
          <div className="brand-mark">S</div>
          <div>
            <div className="brand-name">SINSHE <span>2.0</span></div>
            <div className="brand-sub">Safety • Health • Environment</div>
          </div>
          <button className="icon-btn mobile-only" aria-label="Tutup menu" onClick={() => setOpen(false)}><X size={20}/></button>
        </div>

        <nav className="nav-list">
          {groups.map(group => {
            const visibleItems = group.items.filter(item => canAccess(role, item.href))
            if (!visibleItems.length) return null
            return (
              <div key={group.title}>
                <div className="nav-section">{group.title}</div>
                {visibleItems.map(item => {
                  const Icon = item.icon
                  const active = path === item.href
                  return (
                    <Link key={item.href} href={item.href} className={`nav-item ${active ? 'active' : ''}`} onClick={() => setOpen(false)}>
                      <Icon size={18}/><span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="predictive-pill"><Activity size={18}/> From Reactive to Predictive Safety</div>
          <div className="small-note">KPN Plantations • Internal Platform</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="top-left">
            <button className="icon-btn mobile-only" aria-label="Buka menu" onClick={() => setOpen(true)}><Menu size={22}/></button>
            <div>
              <div className="eyebrow">KPN PLANTATIONS</div>
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
          <div className="top-actions">
            <div className="search-box"><Search size={18}/><input placeholder="Cari data, aset, regulasi..."/></div>
            <select
              value={role}
              onChange={e => changeRole(e.target.value)}
              title="Prototype role preview"
              aria-label="Pilih role prototype"
              style={{border:'1px solid var(--line)',background:'#fff',borderRadius:11,padding:'9px 10px',fontWeight:800,color:'#46505c'}}
            >
              {roles.map(item => <option key={item}>{item}</option>)}
            </select>
            <button className="icon-btn notification" aria-label="Notifikasi"><Bell size={20}/><span/></button>
            <div className="avatar">{role.slice(0,2).toUpperCase()}</div>
          </div>
        </header>
        <section className="page-content">{children}</section>
      </main>
    </div>
  )
}
