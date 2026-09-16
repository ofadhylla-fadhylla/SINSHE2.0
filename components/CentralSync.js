'use client'

import { useEffect, useRef, useState } from 'react'
import { CENTRAL_SYNC_KEYS, hydrateCentralData, syncLocalModule } from '../lib/central-sync'

const DATA_RESET_VERSION = 'sinshe-real-data-reset-20260916-v1'
const LEGACY_DATA_KEYS = [
  ...CENTRAL_SYNC_KEYS,
  'sinshe-hazards',
  'sinshe-learning-records',
  'sinshe-safety-sessions',
  'sinshe-safety-attendance',
  'sinshe-jsa-assessments',
  'sinshe-jsa-steps',
  'sinshe-reminder-actions',
  'sinshe-audit-plans',
  'sinshe-audit-checklist',
  'sinshe-audit-findings',
  'sinshe-evidence-documents',
  'sinshe-qr-inspection-runs',
  'sinshe-qr-inspection-items',
  'sinshe-environmental-metrics',
  'sinshe-environmental-events',
  'sinshe-gis-points',
  'sinshe-contractors',
  'sinshe-contractor-workers',
  'sinshe-contractor-events',
  'sinshe-exposure-hours',
]

function clearLegacyLocalDataOnce() {
  if (typeof window === 'undefined') return
  if (window.localStorage.getItem(DATA_RESET_VERSION) === 'done') return
  LEGACY_DATA_KEYS.forEach(key => window.localStorage.setItem(key, '[]'))
  window.localStorage.setItem(DATA_RESET_VERSION, 'done')
}

export default function CentralSync({ enabled = false }) {
  const lastSeen = useRef({})
  const busy = useRef(false)
  const [state, setState] = useState('idle')

  if (enabled && typeof window !== 'undefined') clearLegacyLocalDataOnce()

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    let cancelled = false

    const capture = () => {
      CENTRAL_SYNC_KEYS.forEach(key => {
        lastSeen.current[key] = window.localStorage.getItem(key) || ''
      })
    }

    async function boot() {
      setState('syncing')
      try {
        await hydrateCentralData({ seedIfEmpty: false })
        if (cancelled) return
        capture()
        setState('synced')
      } catch {
        if (!cancelled) setState('offline')
      }
    }

    boot()

    const pushTimer = window.setInterval(async () => {
      if (busy.current) return
      const changed = CENTRAL_SYNC_KEYS.filter(key => (window.localStorage.getItem(key) || '') !== (lastSeen.current[key] || ''))
      if (!changed.length) return

      busy.current = true
      setState('syncing')
      try {
        for (const key of changed) {
          await syncLocalModule(key)
          lastSeen.current[key] = window.localStorage.getItem(key) || ''
        }
        if (!cancelled) setState('synced')
      } catch {
        if (!cancelled) setState('offline')
      } finally {
        busy.current = false
      }
    }, 4000)

    const pullTimer = window.setInterval(async () => {
      if (busy.current) return
      busy.current = true
      try {
        await hydrateCentralData({ seedIfEmpty: false })
        capture()
        if (!cancelled) setState('synced')
      } catch {
        if (!cancelled) setState('offline')
      } finally {
        busy.current = false
      }
    }, 60000)

    return () => {
      cancelled = true
      window.clearInterval(pushTimer)
      window.clearInterval(pullTimer)
    }
  }, [enabled])

  if (!enabled) return null
  return <span data-central-sync={state} style={{ display: 'none' }} aria-hidden="true" />
}
