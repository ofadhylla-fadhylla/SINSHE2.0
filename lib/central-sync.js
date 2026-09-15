import { dbSelect, dbUpsert, getStoredProfile, isSupabaseConfigured } from './supabase-rest'

const day = value => value ? String(value).slice(0, 10) : ''
const nil = value => value || null

function splitDateTime(value) {
  if (!value) return { date: '', time: '' }
  const d = new Date(value)
  const pad = n => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

function toIso(date, time) {
  if (!date) return null
  const safeTime = time || '00:00'
  const d = new Date(`${date}T${safeTime}:00`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

const configs = [
  {
    key: 'sinshe-observations',
    table: 'observations',
    toDb: o => ({
      id: o.id,
      observation_date: o.date,
      observation_type: o.type,
      description: o.description,
      unit: o.unit,
      location: o.location,
      risk: o.risk,
      status: o.status || 'Open',
      pic: o.pic || '',
      due_date: nil(o.dueDate),
      action: o.action || '',
      evidence: o.evidence || '',
    }),
    fromDb: r => ({
      id: r.id,
      date: r.observation_date,
      type: r.observation_type,
      description: r.description,
      unit: r.unit,
      location: r.location,
      risk: r.risk,
      status: r.status,
      pic: r.pic || '',
      dueDate: r.due_date || '',
      action: r.action || '',
      evidence: r.evidence || '',
    }),
  },
  {
    key: 'sinshe-corrective-actions',
    table: 'corrective_actions',
    toDb: a => ({
      id: a.id,
      source: a.source || '',
      source_id: a.sourceId || '',
      title: a.title,
      unit: a.unit,
      location: a.location || '',
      category: a.category || '',
      priority: a.priority || 'Medium',
      pic: a.pic || '',
      due_date: nil(a.dueDate),
      status: a.status || 'Open',
      progress: Math.max(0, Math.min(100, Number(a.progress || 0))),
      evidence: a.evidence || '',
    }),
    fromDb: r => ({
      id: r.id,
      source: r.source || '',
      sourceId: r.source_id || '',
      title: r.title,
      unit: r.unit,
      location: r.location || '',
      category: r.category || '',
      priority: r.priority || 'Medium',
      pic: r.pic || '',
      dueDate: r.due_date || '',
      status: r.status,
      progress: Number(r.progress || 0),
      evidence: r.evidence || '',
      createdAt: day(r.created_at),
    }),
  },
  {
    key: 'sinshe-incidents',
    table: 'incidents',
    toDb: i => ({
      id: i.id,
      incident_date: i.date,
      incident_time: nil(i.time),
      incident_type: i.type,
      severity: i.severity,
      description: i.description,
      unit: i.unit,
      location: i.location || '',
      reporter: i.reporter || '',
      investigator: i.investigator || '',
      status: i.status || 'Reported',
      immediate_action: i.immediateAction || '',
      root_cause: i.rootCause || '',
      corrective_action: i.correctiveAction || '',
      due_date: nil(i.dueDate),
    }),
    fromDb: r => ({
      id: r.id,
      date: r.incident_date,
      time: r.incident_time ? String(r.incident_time).slice(0, 5) : '',
      type: r.incident_type,
      severity: r.severity,
      description: r.description,
      unit: r.unit,
      location: r.location || '',
      reporter: r.reporter || '',
      investigator: r.investigator || '',
      status: r.status,
      immediateAction: r.immediate_action || '',
      rootCause: r.root_cause || '',
      correctiveAction: r.corrective_action || '',
      dueDate: r.due_date || '',
    }),
  },
  {
    key: 'sinshe-permits',
    table: 'permits',
    toDb: p => ({
      id: p.id,
      permit_type: p.type,
      title: p.title,
      unit: p.unit,
      area: p.area,
      requester: p.requester || '',
      contractor: p.contractor || '',
      supervisor: p.supervisor || '',
      start_at: toIso(p.startDate, p.startTime),
      end_at: toIso(p.endDate, p.endTime),
      risk: p.risk,
      status: p.status || 'Draft',
      jsa_no: p.jsaNo || '',
      description: p.description || '',
      controls: p.controls || {},
      approval: p.approval || '',
    }),
    fromDb: r => {
      const start = splitDateTime(r.start_at)
      const end = splitDateTime(r.end_at)
      return {
        id: r.id,
        type: r.permit_type,
        title: r.title,
        unit: r.unit,
        area: r.area,
        requester: r.requester || '',
        contractor: r.contractor || '',
        supervisor: r.supervisor || '',
        startDate: start.date,
        startTime: start.time,
        endDate: end.date,
        endTime: end.time,
        risk: r.risk,
        status: r.status,
        jsaNo: r.jsa_no || '',
        description: r.description || '',
        controls: r.controls || {},
        approval: r.approval || '',
        createdAt: day(r.created_at),
      }
    },
  },
  {
    key: 'sinshe-assets',
    table: 'assets',
    toDb: a => ({
      id: a.id,
      name: a.name,
      category: a.category,
      unit: a.unit,
      operational: a.operational || 'Active',
      monitoring: a.monitoring || 'Online',
      manufacture_year: a.year ? Number(a.year) : null,
      manufacturer: a.manufacturer || '',
      capacity: a.capacity || '',
      working_pressure: a.workingPressure || '',
      riksa_due: nil(a.riksaDue),
      sio_due: nil(a.sioDue),
      silo_due: nil(a.siloDue),
      calibration_due: nil(a.calibrationDue),
      serial: a.serial || '',
      owner: a.owner || '',
      notes: a.notes || '',
    }),
    fromDb: r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      unit: r.unit,
      operational: r.operational,
      monitoring: r.monitoring,
      year: r.manufacture_year ? String(r.manufacture_year) : '',
      manufacturer: r.manufacturer || '',
      capacity: r.capacity || '',
      workingPressure: r.working_pressure || '',
      riksaDue: r.riksa_due || '',
      sioDue: r.sio_due || '',
      siloDue: r.silo_due || '',
      calibrationDue: r.calibration_due || '',
      serial: r.serial || '',
      owner: r.owner || '',
      notes: r.notes || '',
    }),
  },
  {
    key: 'sinshe-regulatory-obligations',
    table: 'regulatory_obligations',
    toDb: i => ({
      id: i.id,
      regulation: i.regulation,
      category: i.category,
      obligation: i.obligation,
      unit: i.unit,
      owner: i.owner || '',
      due_date: nil(i.dueDate),
      status: i.status || 'Needs Action',
      priority: i.priority || 'Medium',
      evidence: i.evidence || '',
      reference: i.reference || '',
    }),
    fromDb: r => ({
      id: r.id,
      regulation: r.regulation,
      category: r.category,
      obligation: r.obligation,
      unit: r.unit,
      owner: r.owner || '',
      dueDate: r.due_date || '',
      status: r.status,
      priority: r.priority || 'Medium',
      evidence: r.evidence || '',
      reference: r.reference || '',
    }),
  },
]

export const CENTRAL_SYNC_KEYS = configs.map(c => c.key)

function safeRead(key) {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(key)
    const value = raw ? JSON.parse(raw) : []
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function safeWrite(key, value) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
  window.dispatchEvent(new CustomEvent('sinshe-central-data', { detail: { key, count: value.length } }))
}

function canWriteRow(row) {
  const profile = getStoredProfile()
  if (!profile?.active) return false
  if (profile.role === 'Viewer') return false
  if (['Admin', 'Manager'].includes(profile.role)) return true
  return ['Editor', 'Contributor'].includes(profile.role) && row.unit === profile.unit
}

export async function syncLocalModule(key) {
  if (!isSupabaseConfigured()) return { key, skipped: true }
  const cfg = configs.find(c => c.key === key)
  if (!cfg) return { key, skipped: true }
  const local = safeRead(key)
  const writable = local.filter(canWriteRow)
  if (!writable.length) return { key, count: 0 }
  const payload = writable.map(cfg.toDb).filter(row => row.id && row.unit)
  if (!payload.length) return { key, count: 0 }
  await dbUpsert(cfg.table, payload, 'id')
  return { key, count: payload.length }
}

export async function syncAllLocalData() {
  const results = []
  for (const cfg of configs) {
    try {
      results.push(await syncLocalModule(cfg.key))
    } catch (error) {
      results.push({ key: cfg.key, error: error?.message || 'Sync gagal' })
    }
  }
  return results
}

export async function hydrateCentralData({ seedIfEmpty = true } = {}) {
  if (!isSupabaseConfigured() || typeof window === 'undefined') return []
  const results = []

  for (const cfg of configs) {
    try {
      const rows = await dbSelect(cfg.table, 'select=*&order=updated_at.desc')
      const local = safeRead(cfg.key)

      if (Array.isArray(rows) && rows.length) {
        const central = rows.map(cfg.fromDb)
        const centralIds = new Set(central.map(item => item.id))
        const localOnly = local.filter(item => item?.id && !centralIds.has(item.id))
        const merged = [...central, ...localOnly]
        safeWrite(cfg.key, merged)
        results.push({ key: cfg.key, source: 'central', count: central.length, localOnly: localOnly.length })
      } else if (seedIfEmpty && local.length) {
        const seeded = await syncLocalModule(cfg.key)
        results.push({ key: cfg.key, source: 'seeded', count: seeded.count || 0 })
      } else {
        results.push({ key: cfg.key, source: 'empty', count: 0 })
      }
    } catch (error) {
      results.push({ key: cfg.key, source: 'error', error: error?.message || 'Hydration gagal' })
    }
  }

  window.dispatchEvent(new CustomEvent('sinshe-central-sync-complete', { detail: results }))
  return results
}
