'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import {
  getCurrentUser, getMyProfile, isSupabaseConfigured, provisionInitialAdmin,
  signInWithPassword, signOut
} from '../../lib/supabase-rest'
import { hydrateCentralData } from '../../lib/central-sync'
import { roles, setSessionRole } from '../../lib/access'
import styles from './login.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [message, setMessage] = useState('')
  const configured = isSupabaseConfigured()

  useEffect(() => {
    let mounted = true
    async function checkSession() {
      if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('reason') === 'inactive') {
        setMessage('Akun kamu sedang nonaktif. Hubungi administrator SINSHE.')
      }
      if (!configured) {
        if (mounted) setChecking(false)
        return
      }
      const user = await getCurrentUser()
      if (user) {
        const profile = await getMyProfile(user)
        if (profile?.active !== false) {
          const role = roles.includes(profile?.role) ? profile.role : 'Viewer'
          setSessionRole(role)
          await hydrateCentralData({ seedIfEmpty: true })
          router.replace('/')
          return
        }
      }
      if (mounted) setChecking(false)
    }
    checkSession()
    return () => { mounted = false }
  }, [configured, router])

  async function completeLogin() {
    const user = await getCurrentUser()
    const profile = await getMyProfile(user)
    if (!profile) throw new Error('Profil user belum tersedia di database.')
    if (profile.active === false) {
      await signOut()
      throw new Error('Akun ini sedang dinonaktifkan.')
    }
    const role = roles.includes(profile.role) ? profile.role : 'Viewer'
    setSessionRole(role)
    await hydrateCentralData({ seedIfEmpty: true })
    router.replace('/')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !password) {
      setMessage('Masukkan email dan password.')
      return
    }
    if (!configured) {
      setMessage('Backend Supabase belum dikonfigurasi.')
      return
    }

    setLoading(true)
    try {
      try {
        await signInWithPassword(normalizedEmail, password)
      } catch (signInError) {
        if (!normalizedEmail.endsWith('@sinshe.local')) throw signInError
        await provisionInitialAdmin(normalizedEmail, password)
        await signInWithPassword(normalizedEmail, password)
      }
      await completeLogin()
    } catch (error) {
      setMessage(error?.message || 'Login gagal. Periksa email dan password.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return <main className={styles.page}><div className={styles.loadingCard}>Memeriksa sesi SINSHE 2.0…</div></main>
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.logo}>S</div>
        <div className={styles.brand}>SINSHE <span>2.0</span></div>
        <p className={styles.tagline}>Smart Integrated Network for Safety, Health & Environment</p>
        <div className={styles.heroCopy}>
          <span>KPN PLANTATIONS • INTERNAL PLATFORM</span>
          <h1>From Reactive to Predictive Safety.</h1>
          <p>Satu platform untuk HSE operations, asset integrity, regulatory compliance, corrective action dan risk intelligence.</p>
        </div>
        <div className={styles.security}><ShieldCheck size={20}/><span>Role-based access • Unit scope • Centralized data</span></div>
      </section>

      <section className={styles.formSide}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <div className={styles.icon}><LockKeyhole size={24}/></div>
            <div><span>SECURE ACCESS</span><h2>Masuk ke SINSHE 2.0</h2></div>
          </div>
          <p className={styles.helper}>Gunakan akun yang telah dibuat oleh administrator SINSHE.</p>

          {!configured && <div className={styles.setupNotice}>
            <b>Supabase belum aktif di deployment ini.</b>
            <span>Backend login belum tersambung.</span>
          </div>}

          {message && <div className={styles.error}>{message}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <label>Email
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@sinshe.local" autoComplete="email" disabled={loading}/>
            </label>
            <label>Password
              <div className={styles.passwordWrap}>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" disabled={loading}/>
                <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
              </div>
            </label>
            <button className={styles.submit} disabled={loading || !configured}>{loading ? 'Memverifikasi…' : 'Masuk'}</button>
          </form>

          {!configured && <button className={styles.prototype} onClick={() => router.push('/')}>Lanjutkan Prototype Tanpa Login</button>}

          <div className={styles.footerNote}>Akses hanya untuk personel yang berwenang. Aktivitas dapat dicatat untuk audit dan keamanan.</div>
        </div>
      </section>
    </main>
  )
}
