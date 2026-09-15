'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../components/Shell'
import { Badge, BarList, Donut, Panel, Progress, StatCard } from '../components/Ui'
import { AlertTriangle, Award, CheckCircle2, Clock3, FileCheck2, Flame, Gauge, ShieldCheck, Siren, TrendingDown } from 'lucide-react'
import { dbSelect, isSupabaseConfigured } from '../lib/supabase-rest'

const units = ['PKS A', 'PKS B', 'PKS C', 'Estate 1', 'Estate 2', 'Estate 3']
const riskCategories = ['Kebakaran', 'Alat Berat', 'Bahan Kimia', 'Kelistrikan', 'Confined Space']
const fallbackHeat = [
  [1, 2, 1, 3, 2, 1],
  [3, 4, 2, 2, 3, 2],
  [2, 1, 3, 1, 2, 4],
  [2, 3, 1, 4, 1, 2],
  [4, 2, 3, 2, 3, 1],
]
const heatTone = v => v >= 4 ? 'h-crit' : v === 3 ? 'h-high' : v === 2 ? 'h-med' : 'h-low'
const incidentTypes = ['Near Miss', 'First Aid', 'Medical Treatment', 'Lost Time Injury', 'Property Damage', 'Environmental', 'Fire']

const fallbackIncidentBars = [
  { label: 'Near Miss', value: 34, tone: 'blue' },
  { label: 'First Aid', value: 21, tone: 'green' },
  { label: 'Medical Treatment', value: 12, tone: 'orange' },
  { label: 'Lost Time Injury', value: 4, tone: 'red' },
  { label: 'Property Damage', value: 9, tone: 'purple' },
]

const fallbackCompliance = [
  ['SMK3', 94, 'green'], ['ISPO', 89, 'orange'], ['RSPO', 88, 'orange'], ['ISO 45001', 95, 'green'], ['ISO 14001', 91, 'green']
]

const emptyData = {
  incidents: [], actions: [], observations: [], permits: [], assets: [], compliance: [], hazards: [],
  loaded: false, centralTables: 0, localTables: 0,
}

function safeRead(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function isoDate(value) {
  if (!value) return ''
  const text = String(value)
  return text.includes('T') ? text.slice(0, 10) : text
}

function normalizeDb(table, rows) {
  const list = Array.isArray(rows) ? rows : []
  if (table === 'incidents') return list.map(x => ({ ...x, date: isoDate(x.incident_date), type: x.incident_type, dueDate: isoDate(x.due_date) }))
  if (table === 'corrective_actions') return list.map(x => ({ ...x, dueDate: isoDate(x.due_date) }))
  if (table === 'observations') return list.map(x => ({ ...x, date: isoDate(x.observation_date), type: x.observation_type, dueDate: isoDate(x.due_date) }))
  if (table === 'permits') return list.map(x => ({ ...x, type: x.permit_type, startDate: isoDate(x.start_at), endDate: isoDate(x.end_at) }))
  if (table === 'assets') return list.map(x => ({ ...x, riksaDue: isoDate(x.riksa_due), sioDue: isoDate(x.sio_due), siloDue: isoDate(x.silo_due), calibrationDue: isoDate(x.calibration_due) }))
  if (table === 'regulatory_obligations') return list.map(x => ({ ...x, dueDate: isoDate(x.due_date) }))
  if (table === 'hazards') return list.map(x => ({ ...x, category: x.hazard_category, riskLevel: x.risk_level, reviewDate: isoDate(x.review_date) }))
  return list
}

function isOverdue(dateValue) {
  if (!dateValue) return false
  return new Date(`${isoDate(dateValue)}T23:59:59`) < new Date()
}

function daysTo(dateValue) {
  if (!dateValue) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const due = new Date(`${isoDate(dateValue)}T00:00:00`)
  return Math.ceil((due - today) / 86400000)
}

function classifyHazard(item) {
  const text = `${item.category || ''} ${item.hazard_category || ''} ${item.title || ''} ${item.description || ''}`.toLowerCase()
  if (/(fire|kebakaran|hot work|api)/.test(text)) return 'Kebakaran'
  if (/(forklift|crane|alat berat|lifting|excav)/.test(text)) return 'Alat Berat'
  if (/(chemical|kimia|b3|hazmat)/.test(text)) return 'Bahan Kimia'
  if (/(electr|listrik|panel|lvmdp)/.test(text)) return 'Kelistrikan'
  if (/(confined|ruang terbatas|chamber|tank)/.test(text)) return 'Confined Space'
  return null
}

function riskScore(item) {
  const level = String(item.riskLevel || item.risk_level || item.risk || '').toLowerCase()
  if (level.includes('critical') || level.includes('kritis')) return 4
  if (level.includes('high') || level.includes('tinggi')) return 3
  if (level.includes('medium') || level.includes('sedang')) return 2
  if (level.includes('low') || level.includes('rendah')) return 1
  const raw = Number(item.likelihood || 0) * Number(item.severity || 0)
  if (raw >= 16) return 4
  if (raw >= 10) return 3
  if (raw >= 5) return 2
  return raw > 0 ? 1 : 0
}

function monthKey(date) {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function linePoints(values, maxValue) {
  return values.map((value, index) => {
    const x = 45 + index * (625 / Math.max(1, values.length - 1))
    const y = 235 - ((value || 0) / Math.max(1, maxValue)) * 180
    return `${Math.round(x)},${Math.round(y)}`
  }).join(' ')
}

export default function Executive(){
  const [data, setData] = useState(emptyData)

  useEffect(() => {
    let active = true
    async function load() {
      const configs = [
        ['incidents', 'sinshe-incidents', 'incidents'],
        ['corrective_actions', 'sinshe-corrective-actions', 'actions'],
        ['observations', 'sinshe-observations', 'observations'],
        ['permits', 'sinshe-permits', 'permits'],
        ['assets', 'sinshe-assets', 'assets'],
        ['regulatory_obligations', 'sinshe-compliance', 'compliance'],
        ['hazards', 'sinshe-hazards', 'hazards'],
      ]

      const next = { ...emptyData, loaded: true }
      let centralTables = 0
      let localTables = 0

      await Promise.all(configs.map(async ([table, storageKey, stateKey]) => {
        let central = []
        if (isSupabaseConfigured()) {
          try { central = normalizeDb(table, await dbSelect(table, 'select=*')) } catch { central = [] }
        }
        if (central.length) {
          next[stateKey] = central
          centralTables += 1
          return
        }
        const local = safeRead(storageKey)
        next[stateKey] = Array.isArray(local) ? local : []
        if (next[stateKey].length) localTables += 1
      }))

      next.centralTables = centralTables
      next.localTables = localTables
      if (active) setData(next)
    }
    load()
    return () => { active = false }
  }, [])

  const dashboard = useMemo(() => {
    if (!data.loaded) return null
    const { incidents, actions, observations, permits, assets, compliance, hazards } = data
    const now = new Date()

    const openIncidents = incidents.filter(i => i.status !== 'Closed').length
    const highPriority = incidents.filter(i => ['High','Critical'].includes(i.severity) && i.status !== 'Closed').length
    const overdueActions = actions.filter(a => a.status !== 'Closed' && (a.status === 'Overdue' || isOverdue(a.dueDate || a.due_date))).length
    const closedActions = actions.filter(a => a.status === 'Closed').length
    const closureRate = actions.length ? Math.round((closedActions / actions.length) * 100) : 0
    const activePermits = permits.filter(p => p.status === 'Active').length

    const compliantCount = compliance.filter(c => ['Compliant','Closed','Complete','Completed'].includes(c.status)).length
    const complianceRate = compliance.length ? Math.round((compliantCount / compliance.length) * 1000) / 10 : 0
    const complianceCritical = compliance.filter(c => ['Non Compliant','Expired'].includes(c.status) || (c.status !== 'Compliant' && isOverdue(c.dueDate || c.due_date))).length

    const assetDates = asset => [asset.riksaDue || asset.riksa_due, asset.sioDue || asset.sio_due, asset.siloDue || asset.silo_due, asset.calibrationDue || asset.calibration_due].filter(Boolean)
    const assetOverdue = assets.filter(asset => assetDates(asset).some(isOverdue)).length
    const assetDueSoon = assets.filter(asset => !assetDates(asset).some(isOverdue) && assetDates(asset).some(d => { const days = daysTo(d); return days !== null && days >= 0 && days <= 30 })).length

    const latestLTI = [...incidents].filter(i => (i.type || i.incident_type) === 'Lost Time Injury').sort((a,b) => String(b.date || b.incident_date || '').localeCompare(String(a.date || a.incident_date || '')))[0]
    const daysWithoutLTI = latestLTI ? Math.max(0, Math.floor((now - new Date(`${isoDate(latestLTI.date || latestLTI.incident_date)}T00:00:00`)) / 86400000)) : 0
    const criticalOpen = incidents.filter(i => i.severity === 'Critical' && i.status !== 'Closed').length
    const unsafeOpen = observations.filter(o => o.status !== 'Closed' && ['High','Critical'].includes(o.risk)).length
    const highRiskPermit = permits.filter(p => p.status === 'Active' && ['High','Critical'].includes(p.risk)).length
    const highHazards = hazards.filter(h => h.status !== 'Closed' && riskScore(h) >= 3).length
    const safetyIndex = Math.max(25, Math.min(100, 96 - criticalOpen * 8 - overdueActions * 3 - unsafeOpen * 2 - assetOverdue * 2 - complianceCritical * 3 - highHazards * 2 + Math.min(closedActions, 8)))

    const incidentBars = incidentTypes.map(type => ({
      label: type,
      value: incidents.filter(i => (i.type || i.incident_type) === type).length,
      tone: type === 'Lost Time Injury' || type === 'Fire' ? 'red' : type === 'Medical Treatment' ? 'orange' : type === 'Near Miss' ? 'blue' : 'green',
    })).filter(x => x.value > 0)

    const dynamicHeat = riskCategories.map(category => units.map(unit => {
      const matched = hazards.filter(h => h.unit === unit && classifyHazard(h) === category)
      return matched.length ? Math.max(...matched.map(riskScore), 1) : 0
    }))
    const hasHazardMatrix = dynamicHeat.some(row => row.some(Boolean))

    const complianceGroups = Object.entries(compliance.reduce((acc, item) => {
      const key = item.category || item.regulation || 'General Compliance'
      if (!acc[key]) acc[key] = { total: 0, compliant: 0 }
      acc[key].total += 1
      if (['Compliant','Closed','Complete','Completed'].includes(item.status)) acc[key].compliant += 1
      return acc
    }, {})).map(([name, group]) => {
      const value = Math.round((group.compliant / Math.max(1, group.total)) * 100)
      return [name, value, value >= 90 ? 'green' : value >= 75 ? 'orange' : 'red']
    }).sort((a,b) => b[1] - a[1]).slice(0,5)

    const reminderCandidates = []
    assets.forEach(asset => {
      const fields = [
        ['Riksa Uji', asset.riksaDue || asset.riksa_due], ['SIO', asset.sioDue || asset.sio_due],
        ['SILO', asset.siloDue || asset.silo_due], ['Kalibrasi', asset.calibrationDue || asset.calibration_due],
      ]
      fields.forEach(([label,date]) => { if (date) reminderCandidates.push({ title:`${label} ${asset.name || asset.id}`, loc:asset.unit || '-', date }) })
    })
    compliance.forEach(item => { const date = item.dueDate || item.due_date; if (date && item.status !== 'Compliant') reminderCandidates.push({ title:item.obligation || item.regulation || item.id, loc:item.unit || '-', date }) })
    actions.forEach(item => { const date = item.dueDate || item.due_date; if (date && item.status !== 'Closed') reminderCandidates.push({ title:`Action: ${item.title || item.id}`, loc:item.unit || '-', date }) })
    permits.forEach(item => { const date = item.endDate || item.end_at; if (date && ['Active','Approved'].includes(item.status)) reminderCandidates.push({ title:`PTW: ${item.title || item.id}`, loc:item.unit || '-', date }) })

    const reminders = reminderCandidates.map(item => ({ ...item, days: daysTo(item.date) })).filter(item => item.days !== null && item.days <= 60).sort((a,b) => a.days - b.days).slice(0,6)

    const months = []
    for (let offset = 11; offset >= 0; offset--) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
    }
    const obsSeries = months.map(m => observations.filter(o => monthKey(o.date || o.observation_date || o.createdAt || o.created_at) === m).length)
    const nearMissSeries = months.map(m => incidents.filter(i => monthKey(i.date || i.incident_date || i.createdAt || i.created_at) === m && (i.type || i.incident_type) === 'Near Miss').length)
    const recordableSeries = months.map(m => incidents.filter(i => monthKey(i.date || i.incident_date || i.createdAt || i.created_at) === m && !['Near Miss'].includes(i.type || i.incident_type)).length)
    const trendMax = Math.max(1, ...obsSeries, ...nearMissSeries, ...recordableSeries)

    const aiPriority = criticalOpen + overdueActions + assetOverdue + complianceCritical + highRiskPermit + highHazards

    return {
      openIncidents, highPriority, overdueActions, closureRate, activePermits, complianceRate,
      assetOverdue, assetDueSoon, daysWithoutLTI, safetyIndex, aiPriority,
      incidentBars: incidentBars.length ? incidentBars : fallbackIncidentBars,
      heat: hasHazardMatrix ? dynamicHeat : fallbackHeat,
      heatLive: hasHazardMatrix,
      complianceGroups: complianceGroups.length ? complianceGroups : fallbackCompliance,
      complianceLive: complianceGroups.length > 0,
      reminders,
      trend: {
        observation: linePoints(obsSeries, trendMax),
        nearMiss: linePoints(nearMissSeries, trendMax),
        recordable: linePoints(recordableSeries, trendMax),
      },
      hasOperationalData: incidents.length + actions.length + observations.length + permits.length + assets.length + compliance.length + hazards.length > 0,
    }
  }, [data])

  const sourceLabel = data.centralTables > 0
    ? `CENTRAL DATA • ${data.centralTables} modul membaca Supabase${data.localTables ? ` • ${data.localTables} modul fallback browser` : ''}`
    : data.localTables > 0 ? `MODULE DATA • ${data.localTables} modul membaca data browser; sinkronisasi Supabase siap digunakan` : 'REFERENCE MODE • belum ada data operasional tersimpan'

  return <Shell title="Executive Dashboard" subtitle="Ringkasan kinerja Safety, Health & Environment lintas unit operasi secara real-time.">
    <div style={{marginBottom:14,padding:'9px 12px',border:'1px solid #d9e9dd',background:'#f1f8f3',borderRadius:10,fontSize:11,fontWeight:800,color:'#176b34'}}>{sourceLabel}</div>

    <div className="stats-grid six">
      <StatCard label="TRIFR" value="—" hint="butuh data man-hours" tone="green" icon={<TrendingDown/>}/>
      <StatCard label="LTIFR" value="—" hint={`${dashboard?.daysWithoutLTI ?? 0} hari tanpa LTI`} tone="green" icon={<ShieldCheck/>}/>
      <StatCard label="Open Incident" value={dashboard?.openIncidents ?? 0} hint={`${dashboard?.highPriority ?? 0} high / critical`} tone="orange" icon={<Siren/>}/>
      <StatCard label="Overdue Action" value={dashboard?.overdueActions ?? 0} hint="perlu tindak lanjut" tone="red" icon={<AlertTriangle/>}/>
      <StatCard label="Compliance" value={`${dashboard?.complianceRate ?? 0}%`} hint="dari Regulatory Compliance" tone="blue" icon={<FileCheck2/>}/>
      <StatCard label="Active Permit" value={dashboard?.activePermits ?? 0} hint="dari Permit to Work" tone="purple" icon={<Award/>}/>
    </div>

    <div className="exec-grid">
      <Panel title="Tren Insiden & Observasi (12 Bulan)" action="Live Module Data">
        <div className="chart-card">
          <svg viewBox="0 0 700 300" role="img" aria-label="Tren insiden dan observasi">
            <g className="grid-lines"><line x1="45" y1="40" x2="675" y2="40"/><line x1="45" y1="105" x2="675" y2="105"/><line x1="45" y1="170" x2="675" y2="170"/><line x1="45" y1="235" x2="675" y2="235"/></g>
            <polyline className="line green" points={dashboard?.trend.observation || ''}/>
            <polyline className="line orange" points={dashboard?.trend.nearMiss || ''}/>
            <polyline className="line red" points={dashboard?.trend.recordable || ''}/>
          </svg>
          <div className="chart-legend"><span><i className="dot d-green"/>Safety Observation</span><span><i className="dot d-orange"/>Near Miss</span><span><i className="dot d-red"/>Recordable Incident</span></div>
        </div>
      </Panel>

      <Panel title="Safety Performance Index">
        <div className="donut-wrap"><Donut value={dashboard?.safetyIndex ?? 0} tone="green" label="Index"/></div>
        <div className="mini-metric-list">
          <div><span>Asset Due / Overdue</span><b className={(dashboard?.assetOverdue ?? 0) > 0 ? 'red-text' : 'green-text'}>{dashboard?.assetDueSoon ?? 0} / {dashboard?.assetOverdue ?? 0}</b></div>
          <div><span>AI Priority Signals</span><b className={(dashboard?.aiPriority ?? 0) > 0 ? 'red-text' : 'green-text'}>{dashboard?.aiPriority ?? 0}</b></div>
          <div><span>Days Without LTI</span><b>{dashboard?.daysWithoutLTI ?? 0} Hari</b></div>
        </div>
      </Panel>
    </div>

    <div className="exec-grid two">
      <Panel title="Risk Heatmap per Unit" action={dashboard?.heatLive ? 'Hazard Register' : 'Reference'}>
        <div className="heatmap">
          <div className="heat-corner" />
          {units.map(e => <div key={e} className="heat-col-head">{e}</div>)}
          {riskCategories.map((r, ri) => (
            <div className="heat-row" key={r}>
              <div className="heat-row-head">{r}</div>
              {(dashboard?.heat?.[ri] || fallbackHeat[ri]).map((v, ci) => <div key={ci} className={`heat-cell ${heatTone(v || 1)}`}>{dashboard?.heatLive && !v ? '–' : v}</div>)}
            </div>
          ))}
        </div>
        <div className="heat-legend"><span><i className="hl h-low"/>Rendah</span><span><i className="hl h-med"/>Sedang</span><span><i className="hl h-high"/>Tinggi</span><span><i className="hl h-crit"/>Kritis</span></div>
      </Panel>

      <Panel title="Insiden per Kategori">
        <BarList data={dashboard?.incidentBars || fallbackIncidentBars}/>
      </Panel>
    </div>

    <div className="exec-grid two">
      <Panel title="Compliance per Kategori" action={dashboard?.complianceLive ? 'Regulatory Register' : 'Reference'}>
        <div className="perspective-list">
          {(dashboard?.complianceGroups || fallbackCompliance).map(([n, v, t]) => (
            <div key={n}><div><b>{n}</b><span>{v}%</span></div><Progress value={v} tone={t}/></div>
          ))}
        </div>
      </Panel>

      <Panel title="Upcoming & Reminder" action="≤ 60 Hari">
        <div className="reminder-list">
          {(dashboard?.reminders || []).map(item => {
            const tone = item.days < 0 ? 'red' : item.days <= 14 ? 'red' : item.days <= 30 ? 'orange' : 'blue'
            const due = item.days < 0 ? `${Math.abs(item.days)} Hari Overdue` : item.days === 0 ? 'Hari Ini' : `${item.days} Hari`
            return <div key={`${item.title}-${item.date}`}><Clock3/><span><b>{item.title}</b><small>{item.loc}</small></span><Badge tone={tone}>{due}</Badge></div>
          })}
          {!dashboard?.reminders?.length && <div style={{padding:'18px 4px',fontSize:12,color:'#7c858e'}}>Belum ada reminder ≤ 60 hari dari Asset, Compliance, Corrective Action atau PTW.</div>}
        </div>
      </Panel>
    </div>

    <div className="impact-grid">
      <div><ShieldCheck/><b>0</b><span>Fatality (Zero Harm)</span></div>
      <div><CheckCircle2/><b>{dashboard?.closureRate ?? 0}%</b><span>Action closure rate</span></div>
      <div><Gauge/><b>{dashboard?.activePermits ?? 0}</b><span>Active permit</span></div>
      <div><Flame/><b>{dashboard?.aiPriority ?? 0}</b><span>Priority signals</span></div>
    </div>
  </Shell>
}
