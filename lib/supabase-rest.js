const projectUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''

const SESSION_KEY = 'sinshe-supabase-session'
const PROFILE_KEY = 'sinshe-auth-profile'

export function isSupabaseConfigured() {
  return Boolean(projectUrl && publishableKey)
}

function assertConfigured() {
  if (!isSupabaseConfigured()) throw new Error('Supabase belum dikonfigurasi.')
}

function authHeaders(accessToken) {
  return {
    apikey: publishableKey,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }
}

async function parseResponse(response) {
  const text = await response.text()
  let body = null
  if (text) {
    try { body = JSON.parse(text) } catch { body = text }
  }
  if (!response.ok) {
    const message = body?.msg || body?.message || body?.error_description || body?.error || `HTTP ${response.status}`
    throw new Error(message)
  }
  return body
}

export function getStoredSession() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSession(session) {
  if (typeof window === 'undefined') return
  const normalized = {
    ...session,
    expires_at_ms: Date.now() + Math.max(0, Number(session?.expires_in || 3600) - 30) * 1000,
  }
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent('sinshe-auth-change', { detail: { type: 'SIGNED_IN' } }))
  return normalized
}

export function getStoredProfile() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveStoredProfile(profile) {
  if (typeof window === 'undefined') return
  if (profile) window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  else window.localStorage.removeItem(PROFILE_KEY)
  window.dispatchEvent(new CustomEvent('sinshe-profile-change', { detail: profile || null }))
}

export async function signInWithPassword(email, password) {
  assertConfigured()
  const response = await fetch(`${projectUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })
  const session = await parseResponse(response)
  return saveSession(session)
}

export async function refreshSession() {
  assertConfigured()
  const current = getStoredSession()
  if (!current?.refresh_token) return null
  const response = await fetch(`${projectUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: current.refresh_token }),
  })
  const session = await parseResponse(response)
  return saveSession(session)
}

export async function getValidSession() {
  const current = getStoredSession()
  if (!current?.access_token) return null
  const expiry = Number(current.expires_at_ms || 0)
  if (expiry && expiry <= Date.now()) {
    try { return await refreshSession() } catch { clearLocalAuth(); return null }
  }
  return current
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured()) return null
  const session = await getValidSession()
  if (!session?.access_token) return null
  try {
    const response = await fetch(`${projectUrl}/auth/v1/user`, {
      headers: authHeaders(session.access_token),
      cache: 'no-store',
    })
    return await parseResponse(response)
  } catch {
    clearLocalAuth()
    return null
  }
}

export async function getMyProfile(userArg) {
  if (!isSupabaseConfigured()) return null
  const user = userArg || await getCurrentUser()
  if (!user?.id) return null
  const session = await getValidSession()
  if (!session?.access_token) return null
  const response = await fetch(`${projectUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=*`, {
    headers: authHeaders(session.access_token),
    cache: 'no-store',
  })
  const rows = await parseResponse(response)
  const profile = Array.isArray(rows) ? rows[0] || null : null
  if (profile) saveStoredProfile(profile)
  return profile
}

export async function signOut() {
  const session = getStoredSession()
  if (isSupabaseConfigured() && session?.access_token) {
    try {
      await fetch(`${projectUrl}/auth/v1/logout`, {
        method: 'POST',
        headers: authHeaders(session.access_token),
      })
    } catch {
      // Local sign-out still proceeds when the network is unavailable.
    }
  }
  clearLocalAuth()
}

export function clearLocalAuth() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(SESSION_KEY)
  window.localStorage.removeItem(PROFILE_KEY)
  window.dispatchEvent(new CustomEvent('sinshe-auth-change', { detail: { type: 'SIGNED_OUT' } }))
}

async function dbRequest(path, options = {}) {
  assertConfigured()
  const session = await getValidSession()
  if (!session?.access_token) throw new Error('Sesi login tidak tersedia.')
  const response = await fetch(`${projectUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...authHeaders(session.access_token),
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...(options.headers || {}),
    },
    cache: 'no-store',
  })
  return parseResponse(response)
}

export async function dbSelect(table, query = 'select=*') {
  return dbRequest(`${table}?${query}`, { method: 'GET', prefer: 'return=representation' })
}

export async function dbInsert(table, values) {
  return dbRequest(table, { method: 'POST', body: JSON.stringify(values), prefer: 'return=representation' })
}

export async function dbUpsert(table, values, onConflict = 'id') {
  return dbRequest(`${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
    method: 'POST',
    body: JSON.stringify(values),
    prefer: 'resolution=merge-duplicates,return=representation',
  })
}

export async function dbUpdate(table, filters, values) {
  const query = new URLSearchParams(filters).toString()
  return dbRequest(`${table}?${query}`, { method: 'PATCH', body: JSON.stringify(values), prefer: 'return=representation' })
}

export async function dbDelete(table, filters) {
  const query = new URLSearchParams(filters).toString()
  return dbRequest(`${table}?${query}`, { method: 'DELETE', prefer: 'return=representation' })
}
