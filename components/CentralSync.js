'use client'

import { useEffect, useRef, useState } from 'react'
import { CENTRAL_SYNC_KEYS, hydrateCentralData, syncLocalModule } from '../lib/central-sync'

export default function CentralSync({ enabled = false }) {
  const lastSeen = useRef({})
  const busy = useRef(false)
  const [state, setState] = useState('idle')

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
        await hydrateCentralData({ seedIfEmpty: true })
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
