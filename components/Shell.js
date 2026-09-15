'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Activity, AlertTriangle, BarChart3, Bell, BrainCircuit, ClipboardCheck, FileCheck2,
  GraduationCap, LayoutDashboard, ListTodo, LogIn, LogOut, Menu, Network, Search,
  ShieldCheck, Siren, Settings, UserCircle2, Wrench, X
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { canAccess, getSessionRole, roles, setSessionRole } from '../lib/access'
import {
  getCurrentUser, getMyProfile, getStoredProfile, isSupabaseConfigured,
  signOut as supabaseSignOut
} from '../lib/supabase-rest'
import CentralSync from './CentralSync'

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
      { href: '/learning-competency', label: 'Learning & Competency', icon: GraduationCap },
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

const initials = value => (value || 'User').split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase()

const accountActionStyle = {
  width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
  border:'1px solid rgba(255,255,255,.18)', background:'rgba(255,255,255,.08)', color:'#fff',
  borderRadius:10, padding:'9px 10px', fontWeight:800, fontSize:12, cursor:'pointer', textDecoration:'none'
}

const topAuthStyle = {
  display:'inline-flex', alignItems:'center', gap:7, border:'1px solid var(--line)', background:'#fff',
  borderRadius:11, padding:'9px 12px', fontWeight:850, color:'#0c5a2b', cursor:'pointer', textDecoration:'none'
}

export default function Shell({ children, title, subtitle }) {
  const path = usePathname()
  const router = useRouter()
  const configured = isSupabaseConfigured()
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState('Admin')
  const [profile, setProfile] = useState(() => getStoredProfile())
  const [authReady, setAuthReady] = useState(!configured)

  useEffect(() => {
    if (configured) return
    const syncRole = () => setRole(getSessionRole())
    syncRole()
    window.addEventListener('storage', syncRole)
    window.addEventListener('sinshe-role-change', syncRole)
    return () => {
      window.removeEventListener('storage', syncRole)
      window.removeEventListener('sinshe-role-change', syncRole)
    }
  }, [configured])

  useEffect(() => {
    if (!configured) {
      setAuthReady(true)
      return
    }

    let active = true
    async function loadIdentity() {
      try {
        const user = await getCurrentUser()
        if (!active) return
        if (!user) {
          router.replace('/login')
          return
        }
        const nextProfile = await getMyProfile(user)
        if (!active) return
        if (!nextProfile || nextProfile.active === false) {
          await supabaseSignOut()
          router.replace('/login?reason=inactive')
          return
        }
        const nextRole = roles.includes(nextProfile.role) ? nextProfile.role : 'Viewer'
        setSessionRole(nextRole)
        setRole(nextRole)
        setProfile({ ...nextProfile, email: user.email })
        setAuthReady(true)
      } catch {
        router.replace('/login')
      }
    }

    loadIdentity()
    return () => { active = false }
  }, [configured, router])

  function changeRole(nextRole) {
    if (configured) return
    setSessionRole(nextRole)
    setRole(nextRole)
  }

  async function handleLogout() {
    await supabaseSignOut()
    router.replace('/login')
  }

  const visibleGroups = useMemo(() => groups.map(group => ({
    ...group,
    items: group.items.filter(item => canAccess(role, item.href)),
  })).filter(group => group.items.length), [role])

  if (!authReady && configured) {
    return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#f5f7f8',fontWeight:850,color:'#0c5a2b'}}>Memuat sesi SINSHE 2.0…</div>
  }

  return (
    <div className="app-shell">
      <CentralSync enabled={configured && authReady} />
      {open && <div className="scrim mobile-only" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand-block">
          <img className="brand-logo" src="/sinshe-logo.svg" alt="SINSHE 2.0 - Smart Integrated Network for Safety, Health & Environment" />
          <button className="icon-btn mobile-only" aria-label="Tutup menu" onClick={() => setOpen(false)}><X size={20}/></button>
        </div>

        <nav className="nav-list">
          {visibleGroups.map(group => (
            <div className="nav-group" key={group.title}>
              <div className="nav-section">{group.title}</div>
              {group.items.map(item => {
                const Icon = item.icon
                const active = path === item.href
                return (
                  <Link key={item.href} href={item.href} className={`nav-item ${active ? 'active' : ''}`} onClick={() => setOpen(false)}>
                    <Icon size={18}/><span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          {configured ? (
            <button type="button" onClick={handleLogout} style={accountActionStyle}><LogOut size={16}/> Logout</button>
          ) : (
            <Link href="/login" onClick={() => setOpen(false)} style={accountActionStyle}><LogIn size={16}/> Login</Link>
          )}
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
            {!configured && <select
              value={role}
              onChange={e => changeRole(e.target.value)}
              title="Prototype role preview"
              aria-label="Pilih role prototype"
              style={{border:'1px solid var(--line)',background:'#fff',borderRadius:11,padding:'9px 10px',fontWeight:800,color:'#46505c'}}
            >
              {roles.map(item => <option key={item}>{item}</option>)}
            </select>}
            {configured && <div style={{display:'flex',alignItems:'center',gap:9,padding:'6px 9px',border:'1px solid var(--line)',borderRadius:12,background:'#fff'}}>
              <UserCircle2 size={18} color="var(--green)"/>
              <div style={{display:'grid',lineHeight:1.15}}><b style={{fontSize:12}}>{profile?.full_name || profile?.email || 'SINSHE User'}</b><span style={{fontSize:10,color:'#7b858f'}}>{role} • {profile?.unit || '-'} • Central Sync</span></div>
            </div>}
            <button className="icon-btn notification" aria-label="Notifikasi"><Bell size={20}/><span/></button>
            <div className="avatar">{initials(profile?.full_name || (configured ? profile?.email : role))}</div>
            {configured ? (
              <button type="button" onClick={handleLogout} style={topAuthStyle}><LogOut size={17}/> Logout</button>
            ) : (
              <Link href="/login" style={topAuthStyle}><LogIn size={17}/> Login</Link>
            )}
          </div>
        </header>
        <section className="page-content">{children}</section>
      </main>
    </div>
  )
}
