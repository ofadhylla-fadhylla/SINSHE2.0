'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import { Badge, Panel, StatCard } from '../../components/Ui'
import {
  Building2, CheckCircle2, Database, Filter, KeyRound, Plus, Search,
  Settings, ShieldCheck, UserCog, Users, X, XCircle
} from 'lucide-react'
import { getSessionRole, roleMeta, roles, setSessionRole } from '../../lib/access'
import styles from './administration.module.css'

const defaultUsers = [
  {id:'USR-001',name:'Sari Melati',email:'sari.melati@kpn.co.id',position:'HSE Manager',unit:'Head Office',role:'Admin',status:'Active',lastActive:'2026-09-15'},
  {id:'USR-002',name:'Ahmad Rizki',email:'ahmad.rizki@kpn.co.id',position:'Safety Officer',unit:'PKS A',role:'Editor',status:'Active',lastActive:'2026-09-15'},
  {id:'USR-003',name:'Budi Santoso',email:'budi.santoso@kpn.co.id',position:'Mill Manager',unit:'PKS B',role:'Manager',status:'Active',lastActive:'2026-09-15'},
  {id:'USR-004',name:'Citra Dewi',email:'citra.dewi@kpn.co.id',position:'Inspector',unit:'PKS C',role:'Contributor',status:'Active',lastActive:'2026-09-14'},
  {id:'USR-005',name:'Dedi Pratama',email:'dedi.pratama@kpn.co.id',position:'Operator',unit:'Estate 2',role:'Viewer',status:'Inactive',lastActive:'2026-08-30'},
  {id:'USR-006',name:'Eka Wulandari',email:'eka.wulandari@kpn.co.id',position:'Compliance Officer',unit:'Head Office',role:'Editor',status:'Active',lastActive:'2026-09-15'},
]

const units = ['Head Office','PKS A','PKS B','PKS C','Estate 1','Estate 2','Estate 3','Laboratorium']
const emptyForm = {name:'',email:'',position:'',unit:'Head Office',role:'Viewer',status:'Active'}

const permissionRows = [
  ['Executive / KPI','Full','Approve','Manage','View','View'],
  ['Hazard & Risk','Full','Approve','Manage','Create','View'],
  ['Inspection & Observation','Full','Approve','Manage','Create','View'],
  ['Corrective Action','Full','Approve','Manage','Create','View'],
  ['Incident Management','Full','Approve','Manage','Create','View'],
  ['Permit to Work','Full','Approve','Manage','Create','View'],
  ['Asset Integrity','Full','Approve','Manage','—','View'],
  ['Regulatory Compliance','Full','Approve','Manage','—','View'],
  ['AI Recommendation','Full','View','View','—','View'],
  ['Administration','Full','—','—','—','—'],
]

const master = [
  ['Unit Kerja / Lokasi','8 entri',Building2],
  ['Kategori Bahaya','12 entri',ShieldCheck],
  ['Jenis Aset','7 kategori',Database],
  ['Standar & Regulasi','10 kelompok',Settings],
]

const accessClass = value => value === 'Full' ? styles.accessFull : value === 'Approve' ? styles.accessApprove : value === 'Manage' ? styles.accessManage : value === 'Create' ? styles.accessCreate : value === 'View' ? styles.accessView : styles.accessNone
const initials = name => name.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()

export default function Administration(){
  const [users,setUsers] = useState(defaultUsers)
  const [search,setSearch] = useState('')
  const [filterRole,setFilterRole] = useState('All')
  const [filterStatus,setFilterStatus] = useState('All')
  const [modalOpen,setModalOpen] = useState(false)
  const [form,setForm] = useState(emptyForm)
  const [sessionRole,setRolePreview] = useState('Admin')
  const [notice,setNotice] = useState('')

  useEffect(()=>{
    try{
      const saved = localStorage.getItem('sinshe-users')
      if(saved) setUsers(JSON.parse(saved))
      setRolePreview(getSessionRole())
    }catch{}
  },[])

  useEffect(()=>{
    try{ localStorage.setItem('sinshe-users',JSON.stringify(users)) }catch{}
  },[users])

  const rows = useMemo(()=>users.filter(u=>{
    const q = search.trim().toLowerCase()
    const matchSearch = !q || [u.id,u.name,u.email,u.position,u.unit,u.role].join(' ').toLowerCase().includes(q)
    return matchSearch && (filterRole==='All'||u.role===filterRole) && (filterStatus==='All'||u.status===filterStatus)
  }),[users,search,filterRole,filterStatus])

  const active = users.filter(u=>u.status==='Active').length
  const adminCount = users.filter(u=>u.role==='Admin').length
  const roleCounts = Object.fromEntries(roles.map(r=>[r,users.filter(u=>u.role===r).length]))

  function flash(text){ setNotice(text); setTimeout(()=>setNotice(''),3000) }
  function changeUserRole(id,role){ setUsers(prev=>prev.map(u=>u.id===id?{...u,role}:u)); flash(`${id} diubah menjadi ${role}.`) }
  function toggleStatus(id){
    const item = users.find(u=>u.id===id); if(!item) return
    const next = item.status==='Active'?'Inactive':'Active'
    setUsers(prev=>prev.map(u=>u.id===id?{...u,status:next}:u)); flash(`${item.name} sekarang ${next}.`)
  }
  function changePreviewRole(role){ setSessionRole(role); setRolePreview(role); flash(`Preview akses berubah ke role ${role}.`) }
  function saveUser(e){
    e.preventDefault()
    if(!form.name.trim()||!form.email.trim()||!form.position.trim()){ flash('Lengkapi nama, email dan jabatan.'); return }
    if(users.some(u=>u.email.toLowerCase()===form.email.toLowerCase())){ flash('Email sudah terdaftar.'); return }
    const seq = Math.max(6,...users.map(u=>Number(u.id.split('-').pop())||0))+1
    const item = {id:`USR-${String(seq).padStart(3,'0')}`,...form,lastActive:'Belum pernah'}
    setUsers(prev=>[item,...prev]); setForm(emptyForm); setModalOpen(false); flash(`${item.name} berhasil ditambahkan.`)
  }

  return <Shell title="Administration" subtitle="Manajemen user, role-based access, unit kerja dan konfigurasi SINSHE 2.0.">
    {notice && <div className={styles.notice}><CheckCircle2 size={18}/>{notice}</div>}

    <div className="stats-grid four">
      <StatCard label="Total Pengguna" value={users.length} hint={`${active} user aktif`} tone="blue" icon={<Users/>}/>
      <StatCard label="Administrator" value={adminCount} hint="akses penuh sistem" tone="red" icon={<UserCog/>}/>
      <StatCard label="Role Aktif" value={roles.length} hint="RBAC prototype" tone="green" icon={<KeyRound/>}/>
      <StatCard label="Unit Kerja" value={units.length} hint="scope akses unit" tone="purple" icon={<Building2/>}/>
    </div>

    <div className={styles.toolbar}>
      <div><h2>User & Access Management</h2><p>Kelola pengguna, role, unit dan status akses dari satu tempat.</p></div>
      <button className={styles.primary} onClick={()=>setModalOpen(true)}><Plus size={18}/> Tambah User</button>
    </div>

    <div className="dashboard-split">
      <Panel className="table-panel">
        <div className={styles.filters}>
          <label><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama, email, unit, jabatan..."/></label>
          <label><Filter size={14}/><select value={filterRole} onChange={e=>setFilterRole(e.target.value)}><option>All</option>{roles.map(r=><option key={r}>{r}</option>)}</select></label>
          <label><select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option>All</option><option>Active</option><option>Inactive</option></select></label>
        </div>
        <div className="table-wrap"><table>
          <thead><tr><th>User</th><th>Jabatan</th><th>Unit</th><th>Role</th><th>Status</th><th>Last Active</th><th>Aksi</th></tr></thead>
          <tbody>{rows.map(u=><tr key={u.id}>
            <td><div className={styles.userCell}><div className={styles.userAvatar}>{initials(u.name)}</div><div className={styles.userText}><b>{u.name}</b><small>{u.email} • {u.id}</small></div></div></td>
            <td>{u.position}</td><td>{u.unit}</td>
            <td><select className={styles.roleSelect} value={u.role} onChange={e=>changeUserRole(u.id,e.target.value)}>{roles.map(r=><option key={r}>{r}</option>)}</select></td>
            <td><Badge tone={u.status==='Active'?'green':'red'}>{u.status}</Badge></td>
            <td>{u.lastActive}</td>
            <td><div className={styles.rowActions}><button className={u.status==='Active'?styles.dangerButton:styles.smallButton} onClick={()=>toggleStatus(u.id)}>{u.status==='Active'?<XCircle size={14}/>:<CheckCircle2 size={14}/>} {u.status==='Active'?'Disable':'Enable'}</button></div></td>
          </tr>)}
          {!rows.length&&<tr><td colSpan="7" style={{textAlign:'center',padding:24,color:'#7c858e'}}>Tidak ada user sesuai filter.</td></tr>}</tbody>
        </table></div>
      </Panel>

      <div>
        <div className={styles.sessionCard}>
          <span>Prototype Access Preview</span>
          <h3>{sessionRole}</h3>
          <p>Gunakan selector ini untuk mensimulasikan menu yang terlihat oleh masing-masing role. Ini belum autentikasi keamanan production.</p>
          <select value={sessionRole} onChange={e=>changePreviewRole(e.target.value)}>{roles.map(r=><option key={r}>{r}</option>)}</select>
        </div>
        <Panel title="Peran & Hak Akses">
          <div className={styles.roleList}>{roles.map(role=><div className={styles.roleCard} key={role}>
            <div className={styles.roleTop}><b>{role}</b><Badge tone={roleMeta[role].tone}>{roleCounts[role]} user</Badge></div>
            <p>{roleMeta[role].description}</p>
          </div>)}</div>
        </Panel>
      </div>
    </div>

    <Panel title="Permission Matrix" className="mt">
      <div className={styles.permissionTable}><table>
        <thead><tr><th>Module</th>{roles.map(r=><th key={r}>{r}</th>)}</tr></thead>
        <tbody>{permissionRows.map(row=><tr key={row[0]}><td><b>{row[0]}</b></td>{row.slice(1).map((v,i)=><td key={i}><span className={accessClass(v)}>{v}</span></td>)}</tr>)}</tbody>
      </table></div>
    </Panel>

    <Panel title="Data Master & Konfigurasi" className="mt">
      <div className={styles.masterGrid}>{master.map(([title,count,Icon])=><div className={styles.masterCard} key={title}><Icon/><div><b>{title}</b><span>{count}</span></div></div>)}</div>
      <div className={styles.prototypeNote}><ShieldCheck size={20}/><div><b>RBAC saat ini masih prototype browser-side</b><p>Menu sudah menyesuaikan role yang dipilih, tetapi keamanan sesungguhnya harus dipindahkan ke login + database + server-side authorization pada tahap berikutnya.</p></div></div>
    </Panel>

    {modalOpen&&<div className={styles.modalBackdrop} onMouseDown={e=>{if(e.target===e.currentTarget)setModalOpen(false)}}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}><div><span>SINSHE 2.0</span><h2>Tambah User</h2><p>Daftarkan user prototype dan tentukan scope akses awal.</p></div><button className={styles.iconClose} onClick={()=>setModalOpen(false)}><X size={19}/></button></div>
        <form className={styles.form} onSubmit={saveUser}>
          <div className={styles.formGrid}>
            <label>Nama Lengkap<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Nama user"/></label>
            <label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="nama@kpn.co.id"/></label>
            <label>Jabatan<input value={form.position} onChange={e=>setForm({...form,position:e.target.value})} placeholder="HSE Officer / Manager / Inspector"/></label>
            <label>Unit<select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>{units.map(v=><option key={v}>{v}</option>)}</select></label>
            <label>Role<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{roles.map(v=><option key={v}>{v}</option>)}</select></label>
            <label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Active</option><option>Inactive</option></select></label>
          </div>
          <div className={styles.modalActions}><button type="button" className={styles.secondary} onClick={()=>setModalOpen(false)}>Batal</button><button className={styles.primary}>Simpan User</button></div>
        </form>
      </div>
    </div>}
  </Shell>
}
