'use client'

import { useEffect, useMemo, useState } from 'react'
import Shell from '../components/Shell'
import { Badge, BarList, Donut, Panel, Progress, StatCard } from '../components/Ui'
import { AlertTriangle, Award, CheckCircle2, Clock3, FileCheck2, Flame, Gauge, ShieldCheck, Siren, TrendingDown } from 'lucide-react'

const estates = ['PKS A', 'PKS B', 'PKS C', 'Estate 1', 'Estate 2', 'Estate 3']
const risks = ['Kebakaran', 'Alat Berat', 'Bahan Kimia', 'Kelistrikan', 'Confined Space']
const heat = [
  [1, 2, 1, 3, 2, 1],
  [3, 4, 2, 2, 3, 2],
  [2, 1, 3, 1, 2, 4],
  [2, 3, 1, 4, 1, 2],
  [4, 2, 3, 2, 3, 1],
]
const heatTone = v => v >= 4 ? 'h-crit' : v === 3 ? 'h-high' : v === 2 ? 'h-med' : 'h-low'

const fallbackIncidentBars = [
  { label: 'Near Miss', value: 34, tone: 'blue' },
  { label: 'First Aid', value: 21, tone: 'green' },
  { label: 'Medical Treatment', value: 12, tone: 'orange' },
  { label: 'Lost Time Injury', value: 4, tone: 'red' },
  { label: 'Property Damage', value: 9, tone: 'purple' },
]

const reminders = [
  ['Riksa Uji Boiler 1', 'PKS A', '12 Hari', 'red'],
  ['SIO Forklift 23', 'Estate 3', '20 Hari', 'orange'],
  ['Audit SMK3 Internal', 'Head Office', '45 Hari', 'blue'],
  ['Renewal Izin Lingkungan', 'PKS B', '58 Hari', 'green'],
]

function safeRead(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export default function Executive(){
  const [operational, setOperational] = useState({ incidents: [], actions: [], observations: [], loaded: false })

  useEffect(() => {
    setOperational({
      incidents: safeRead('sinshe-incidents'),
      actions: safeRead('sinshe-corrective-actions'),
      observations: safeRead('sinshe-observations'),
      loaded: true,
    })
  }, [])

  const metrics = useMemo(() => {
    const { incidents, actions, observations, loaded } = operational
    if (!loaded || (!incidents.length && !actions.length && !observations.length)) {
      return {
        openIncidents: 7,
        highPriority: 3,
        overdueActions: 12,
        closureRate: 96,
        daysWithoutLTI: 184,
        safetyIndex: 87,
        incidentBars: fallbackIncidentBars,
        live: false,
      }
    }

    const openIncidents = incidents.filter(i => i.status !== 'Closed').length
    const highPriority = incidents.filter(i => ['High', 'Critical'].includes(i.severity) && i.status !== 'Closed').length
    const overdueActions = actions.filter(a => {
      if (a.status === 'Closed') return false
      if (a.status === 'Overdue') return true
      if (!a.dueDate) return false
      return new Date(`${a.dueDate}T23:59:59`) < new Date()
    }).length
    const closedActions = actions.filter(a => a.status === 'Closed').length
    const closureRate = actions.length ? Math.round((closedActions / actions.length) * 100) : 0
    const latestLTI = [...incidents].filter(i => i.type === 'Lost Time Injury').sort((a,b) => b.date.localeCompare(a.date))[0]
    const daysWithoutLTI = latestLTI ? Math.max(0, Math.floor((new Date() - new Date(`${latestLTI.date}T00:00:00`)) / 86400000)) : 0
    const criticalOpen = incidents.filter(i => i.severity === 'Critical' && i.status !== 'Closed').length
    const unsafeOpen = observations.filter(o => o.status !== 'Closed' && ['High', 'Critical'].includes(o.risk)).length
    const safetyIndex = Math.max(35, Math.min(100, 96 - criticalOpen * 8 - overdueActions * 3 - unsafeOpen * 2 + Math.min(closedActions, 8)))

    const types = ['Near Miss', 'First Aid', 'Medical Treatment', 'Lost Time Injury', 'Property Damage', 'Environmental', 'Fire']
    const incidentBars = types.map(type => ({
      label: type,
      value: incidents.filter(i => i.type === type).length,
      tone: type === 'Lost Time Injury' || type === 'Fire' ? 'red' : type === 'Medical Treatment' ? 'orange' : type === 'Near Miss' ? 'blue' : 'green',
    })).filter(x => x.value > 0)

    return {
      openIncidents,
      highPriority,
      overdueActions,
      closureRate,
      daysWithoutLTI,
      safetyIndex,
      incidentBars: incidentBars.length ? incidentBars : fallbackIncidentBars,
      live: true,
    }
  }, [operational])

  return <Shell title="Executive Dashboard" subtitle="Ringkasan kinerja Safety, Health & Environment lintas unit operasi secara real-time.">
    {metrics.live && <div style={{marginBottom:14,padding:'9px 12px',border:'1px solid #d9e9dd',background:'#f1f8f3',borderRadius:10,fontSize:11,fontWeight:800,color:'#176b34'}}>LIVE BROWSER DATA • KPI membaca data dari Inspection, Incident dan Corrective Action di browser ini.</div>}

    <div className="stats-grid six">
      <StatCard label="TRIFR" value="1.42" hint="-18% vs 2025" tone="green" icon={<TrendingDown/>}/>
      <StatCard label="LTIFR" value="0.36" hint="Target < 0.50" tone="green" icon={<ShieldCheck/>}/>
      <StatCard label="Open Incident" value={metrics.openIncidents} hint={`${metrics.highPriority} high / critical`} tone="orange" icon={<Siren/>}/>
      <StatCard label="Overdue Action" value={metrics.overdueActions} hint="perlu tindak lanjut" tone="red" icon={<AlertTriangle/>}/>
      <StatCard label="Compliance" value="92.4%" hint="+8.6% vs bulan lalu" tone="blue" icon={<FileCheck2/>}/>
      <StatCard label="Active Permit" value="28" hint="hari ini" tone="purple" icon={<Award/>}/>
    </div>

    <div className="exec-grid">
      <Panel title="Tren Insiden & Observasi (12 Bulan)" action="2026">
        <div className="chart-card">
          <svg viewBox="0 0 700 300" role="img" aria-label="Tren insiden dan observasi">
            <g className="grid-lines"><line x1="45" y1="40" x2="675" y2="40"/><line x1="45" y1="105" x2="675" y2="105"/><line x1="45" y1="170" x2="675" y2="170"/><line x1="45" y1="235" x2="675" y2="235"/></g>
            <polyline className="line green" points="45,150 100,135 157,145 214,120 271,110 328,95 385,100 442,85 499,78 556,70 613,62 670,55"/>
            <polyline className="line orange" points="45,200 100,205 157,190 214,195 271,180 328,185 385,170 442,175 499,160 556,165 613,150 670,148"/>
            <polyline className="line red" points="45,240 100,238 157,242 214,230 271,232 328,225 385,228 442,220 499,222 556,215 613,214 670,208"/>
          </svg>
          <div className="chart-legend"><span><i className="dot d-green"/>Safety Observation</span><span><i className="dot d-orange"/>Near Miss</span><span><i className="dot d-red"/>Recordable Incident</span></div>
        </div>
      </Panel>

      <Panel title="Safety Performance Index">
        <div className="donut-wrap"><Donut value={metrics.safetyIndex} tone="green" label="Index"/></div>
        <div className="mini-metric-list">
          <div><span>Leading Indicator</span><b className="green-text">Baik</b></div>
          <div><span>Lagging Indicator</span><b className={metrics.highPriority > 2 ? 'red-text' : 'green-text'}>{metrics.highPriority > 2 ? 'Perlu Perhatian' : 'Terkendali'}</b></div>
          <div><span>Days Without LTI</span><b>{metrics.daysWithoutLTI} Hari</b></div>
        </div>
      </Panel>
    </div>

    <div className="exec-grid two">
      <Panel title="Risk Heatmap per Unit">
        <div className="heatmap">
          <div className="heat-corner" />
          {estates.map(e => <div key={e} className="heat-col-head">{e}</div>)}
          {risks.map((r, ri) => (
            <div className="heat-row" key={r}>
              <div className="heat-row-head">{r}</div>
              {heat[ri].map((v, ci) => <div key={ci} className={`heat-cell ${heatTone(v)}`}>{v}</div>)}
            </div>
          ))}
        </div>
        <div className="heat-legend">
          <span><i className="hl h-low"/>Rendah</span><span><i className="hl h-med"/>Sedang</span><span><i className="hl h-high"/>Tinggi</span><span><i className="hl h-crit"/>Kritis</span>
        </div>
      </Panel>

      <Panel title="Insiden per Kategori">
        <BarList data={metrics.incidentBars}/>
      </Panel>
    </div>

    <div className="exec-grid two">
      <Panel title="Compliance per Standar">
        <div className="perspective-list">
          {[['SMK3 (PP 50/2012)', 94, 'green'], ['ISPO', 89, 'orange'], ['RSPO', 88, 'orange'], ['ISO 45001', 95, 'green'], ['ISO 14001', 91, 'green']].map(([n, v, t]) => (
            <div key={n}><div><b>{n}</b><span>{v}%</span></div><Progress value={v} tone={t}/></div>
          ))}
        </div>
      </Panel>

      <Panel title="Upcoming & Reminder" action="Prioritas">
        <div className="reminder-list">
          {reminders.map(([t, loc, due, tone]) => (
            <div key={t}><Clock3/><span><b>{t}</b><small>{loc}</small></span><Badge tone={tone}>{due}</Badge></div>
          ))}
        </div>
      </Panel>
    </div>

    <div className="impact-grid">
      <div><ShieldCheck/><b>0</b><span>Fatality (Zero Harm)</span></div>
      <div><CheckCircle2/><b>{metrics.closureRate}%</b><span>Action closure rate</span></div>
      <div><Gauge/><b>-30%</b><span>Response time</span></div>
      <div><Flame/><b>{metrics.highPriority}</b><span>High / critical incident</span></div>
    </div>
  </Shell>
}
