'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import { Badge, Panel, Progress, StatCard } from '../../components/Ui'
import {
  AlertTriangle, BrainCircuit, CheckCircle2, Download, Eye, Filter,
  Gauge, Lightbulb, Search, ShieldAlert, Sparkles, Target, Zap
} from 'lucide-react'
import styles from './ai-recommendation.module.css'

const sourceMeta = {
  Incident: { route: '/incident', tone: 'red' },
  'Corrective Action': { route: '/corrective-action', tone: 'orange' },
  'Permit to Work': { route: '/permit-to-work', tone: 'purple' },
  'Asset Integrity': { route: '/asset-integrity', tone: 'blue' },
  'Regulatory Compliance': { route: '/regulatory-compliance', tone: 'green' },
  'Inspection & Observation': { route: '/inspection', tone: 'orange' },
}

const severityWeight = { Critical: 4, High: 3, Medium: 2, Low: 1 }

const demoRecommendations = [
  {
    id: 'AI-DEMO-001', source: 'Asset Integrity', unit: 'PKS C', severity: 'Critical', confidence: 96,
    title: 'Aset kritikal memiliki dokumen pemeriksaan expired',
    reason: 'Crane / pressure vessel yang melewati due date meningkatkan risiko operasional dan ketidakpatuhan.',
    action: 'Hentikan penggunaan bila diperlukan, verifikasi status operasional dan jadwalkan riksa uji segera.',
    ref: 'Asset Register',
  },
  {
    id: 'AI-DEMO-002', source: 'Corrective Action', unit: 'PKS C', severity: 'High', confidence: 93,
    title: 'Corrective action berisiko tinggi melewati due date',
    reason: 'Action yang overdue dapat membuat temuan berulang dan meningkatkan residual risk.',
    action: 'Eskalasi ke owner, tetapkan recovery date dan pastikan evidence closure tersedia.',
    ref: 'Corrective Action Register',
  },
  {
    id: 'AI-DEMO-003', source: 'Regulatory Compliance', unit: 'PKS C', severity: 'High', confidence: 91,
    title: 'Kewajiban compliance membutuhkan tindakan prioritas',
    reason: 'Terdapat kewajiban non-compliant / mendekati jatuh tempo yang berdampak pada audit readiness.',
    action: 'Prioritaskan evidence, PIC dan due date untuk kewajiban dengan priority High/Critical.',
    ref: 'Legal Register',
  },
]

function safeRead(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function daysUntil(value) {
  if (!value) return null
  return Math.ceil((new Date(`${value}T23:59:59`) - new Date()) / 86400000)
}

function assetNearestDays(asset) {
  const dates = [asset.riksaDue, asset.sioDue, asset.siloDue, asset.calibrationDue].filter(Boolean)
  if (!dates.length) return null
  return Math.min(...dates.map(daysUntil))
}

function recId(source, ref, suffix = '') {
  return `AI-${source.replace(/[^A-Z]/gi, '').slice(0, 4).toUpperCase()}-${String(ref || suffix).replace(/[^A-Z0-9]/gi, '').slice(-10).toUpperCase()}`
}

function buildRecommendations(data) {
  const recs = []
  const push = rec => recs.push({ ...rec, id: rec.id || recId(rec.source, rec.ref, rec.title) })

  data.incidents.forEach(item => {
    if (item.status === 'Closed') return
    if (['Critical', 'High'].includes(item.severity)) {
      push({
        source: 'Incident', unit: item.unit || 'Unknown', severity: item.severity, confidence: item.severity === 'Critical' ? 97 : 91,
        title: `${item.severity} incident masih membutuhkan pengendalian`,
        reason: `${item.id || 'Incident'} berstatus ${item.status || 'Open'} di ${item.location || item.unit || 'lokasi terkait'}.`,
        action: item.rootCause ? 'Pastikan corrective action dari RCA memiliki PIC, due date dan evidence closure.' : 'Selesaikan investigasi dan root cause analysis sebelum menutup incident.',
        ref: item.id || 'Incident',
      })
    }
  })

  data.actions.forEach(item => {
    if (item.status === 'Closed') return
    const overdue = item.status === 'Overdue' || (item.dueDate && daysUntil(item.dueDate) < 0)
    if (overdue || ['Critical', 'High'].includes(item.priority)) {
      push({
        source: 'Corrective Action', unit: item.unit || 'Unknown', severity: overdue ? 'Critical' : item.priority || 'High', confidence: overdue ? 95 : 89,
        title: overdue ? 'Corrective action overdue perlu eskalasi' : 'High-risk corrective action perlu dipercepat',
        reason: `${item.id || 'Action'} • ${item.title || 'Tindakan korektif'} • PIC ${item.pic || 'belum ditetapkan'}.`,
        action: overdue ? 'Eskalasi ke owner dan atasan, tetapkan recovery date serta verifikasi evidence.' : 'Review progres dan pastikan kontrol efektif sebelum due date.',
        ref: item.id || item.sourceId || 'Corrective Action',
      })
    }
  })

  data.permits.forEach(item => {
    if (['Closed', 'Expired'].includes(item.status)) {
      if (item.status === 'Expired') push({
        source: 'Permit to Work', unit: item.unit || 'Unknown', severity: 'High', confidence: 92,
        title: 'Permit expired membutuhkan closure / revalidation',
        reason: `${item.id || 'PTW'} untuk ${item.type || 'pekerjaan'} telah expired.`,
        action: 'Pastikan pekerjaan berhenti, lakukan close-out atau terbitkan permit baru setelah risk control diverifikasi ulang.',
        ref: item.id || 'PTW',
      })
      return
    }
    if (['Critical', 'High'].includes(item.risk) && ['Awaiting Approval', 'Approved', 'Active'].includes(item.status)) {
      push({
        source: 'Permit to Work', unit: item.unit || 'Unknown', severity: item.risk === 'Critical' ? 'Critical' : 'High', confidence: item.risk === 'Critical' ? 94 : 87,
        title: `${item.type || 'High-risk work'} memerlukan verifikasi critical control`,
        reason: `${item.id || 'PTW'} berstatus ${item.status} di ${item.area || item.unit || 'area kerja'}.`,
        action: 'Pastikan JSA, toolbox meeting, APD dan kontrol khusus pekerjaan telah diverifikasi sebelum / selama pekerjaan.',
        ref: item.id || 'PTW',
      })
    }
  })

  data.assets.forEach(item => {
    const days = assetNearestDays(item)
    if (days === null) return
    if (days < 0) {
      push({
        source: 'Asset Integrity', unit: item.unit || 'Unknown', severity: 'Critical', confidence: 96,
        title: `${item.name || item.id || 'Asset'} memiliki dokumen inspeksi expired`,
        reason: `Dokumen terdekat telah overdue ${Math.abs(days)} hari. Status operasional: ${item.operational || 'Unknown'}.`,
        action: 'Verifikasi kelayakan operasi, jadwalkan pemeriksaan/renewal dan dokumentasikan evidence sebelum melanjutkan operasi berisiko.',
        ref: item.id || item.name,
      })
    } else if (days <= 30) {
      push({
        source: 'Asset Integrity', unit: item.unit || 'Unknown', severity: days <= 14 ? 'High' : 'Medium', confidence: days <= 14 ? 90 : 82,
        title: `${item.name || item.id || 'Asset'} mendekati due date`,
        reason: `Due date terdekat dalam ${days} hari.`,
        action: 'Siapkan vendor, dokumen dan shutdown window agar renewal selesai sebelum jatuh tempo.',
        ref: item.id || item.name,
      })
    }
  })

  data.regulations.forEach(item => {
    const days = daysUntil(item.dueDate)
    if (item.status === 'Non Compliant' || (item.status !== 'Compliant' && days !== null && days <= 30)) {
      push({
        source: 'Regulatory Compliance', unit: item.unit || 'Unknown', severity: item.status === 'Non Compliant' || item.priority === 'Critical' ? 'Critical' : item.priority === 'High' ? 'High' : 'Medium', confidence: item.status === 'Non Compliant' ? 95 : 88,
        title: item.status === 'Non Compliant' ? 'Non-compliance membutuhkan corrective plan' : 'Kewajiban regulasi mendekati due date',
        reason: `${item.id || 'REG'} • ${item.obligation || item.regulation || 'Kewajiban'} • ${days !== null && days < 0 ? `${Math.abs(days)} hari overdue` : `${days ?? '-'} hari tersisa`}.`,
        action: 'Lengkapi evidence, konfirmasi PIC dan selesaikan kewajiban sebelum audit / jatuh tempo.',
        ref: item.id || item.regulation,
      })
    }
  })

  data.observations.forEach(item => {
    if (item.status === 'Closed') return
    if (['Critical', 'High'].includes(item.risk)) {
      push({
        source: 'Inspection & Observation', unit: item.unit || 'Unknown', severity: item.risk, confidence: item.risk === 'Critical' ? 92 : 85,
        title: `${item.type || 'Safety observation'} berisiko ${item.risk}`,
        reason: `${item.id || 'Observation'} • ${item.description || 'Temuan lapangan'} • status ${item.status || 'Open'}.`,
        action: item.action || 'Tetapkan corrective action, PIC dan due date lalu verifikasi efektivitas penutupan.',
        ref: item.id || 'Observation',
      })
    }
  })

  return recs
    .sort((a, b) => (severityWeight[b.severity] - severityWeight[a.severity]) || (b.confidence - a.confidence))
    .slice(0, 30)
}

export default function AIRecommendation() {
  const [data, setData] = useState({ incidents: [], actions: [], permits: [], assets: [], regulations: [], observations: [] })
  const [reviewed, setReviewed] = useState([])
  const [search, setSearch] = useState('')
  const [source, setSource] = useState('All')
  const [severity, setSeverity] = useState('All')
  const [unit, setUnit] = useState('All')

  useEffect(() => {
    setData({
      incidents: safeRead('sinshe-incidents'),
      actions: safeRead('sinshe-corrective-actions'),
      permits: safeRead('sinshe-permits'),
      assets: safeRead('sinshe-assets'),
      regulations: safeRead('sinshe-regulatory-obligations'),
      observations: safeRead('sinshe-observations'),
    })
    setReviewed(safeRead('sinshe-ai-reviewed'))
  }, [])

  const generated = useMemo(() => buildRecommendations(data), [data])
  const recommendations = generated.length ? generated : demoRecommendations
  const filtered = useMemo(() => recommendations.filter(r => {
    const q = search.trim().toLowerCase()
    const text = [r.id, r.title, r.reason, r.action, r.unit, r.source, r.ref].join(' ').toLowerCase()
    return (!q || text.includes(q)) && (source === 'All' || r.source === source) && (severity === 'All' || r.severity === severity) && (unit === 'All' || r.unit === unit)
  }), [recommendations, search, source, severity, unit])

  const sources = [...new Set(recommendations.map(r => r.source))]
  const units = [...new Set(recommendations.map(r => r.unit))]
  const critical = recommendations.filter(r => r.severity === 'Critical').length
  const high = recommendations.filter(r => r.severity === 'High').length
  const avgConfidence = recommendations.length ? Math.round(recommendations.reduce((a, b) => a + b.confidence, 0) / recommendations.length) : 0
  const riskIndex = recommendations.length ? Math.min(100, Math.round(recommendations.reduce((sum, r) => sum + severityWeight[r.severity] * r.confidence / 4, 0) / recommendations.length)) : 0

  const unitRisk = useMemo(() => {
    const map = new Map()
    recommendations.forEach(r => map.set(r.unit, (map.get(r.unit) || 0) + severityWeight[r.severity]))
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [recommendations])

  function toggleReviewed(id) {
    const next = reviewed.includes(id) ? reviewed.filter(x => x !== id) : [...reviewed, id]
    setReviewed(next)
    try { localStorage.setItem('sinshe-ai-reviewed', JSON.stringify(next)) } catch {}
  }

  function exportCSV() {
    const header = ['Recommendation ID', 'Source', 'Unit', 'Severity', 'Confidence', 'Title', 'Reason', 'Recommended Action', 'Reference', 'Reviewed']
    const rows = filtered.map(r => [r.id, r.source, r.unit, r.severity, `${r.confidence}%`, r.title, r.reason, r.action, r.ref, reviewed.includes(r.id) ? 'Yes' : 'No'])
    const csv = [header, ...rows].map(row => row.map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `SINSHE_AI_Recommendation_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return <Shell title="AI Recommendation Engine" subtitle="Analitik prediktif untuk memprioritaskan risiko, compliance, asset, incident dan tindak lanjut operasional.">
    <div className="stats-grid four">
      <StatCard label="Critical Recommendation" value={critical} hint={`${high} high priority`} tone="red" icon={<ShieldAlert/>}/>
      <StatCard label="Rekomendasi Aktif" value={recommendations.length} hint={`${reviewed.length} sudah direview`} tone="green" icon={<Lightbulb/>}/>
      <StatCard label="Risk Priority Index" value={`${riskIndex}%`} hint="berdasarkan severity & confidence" tone="orange" icon={<Gauge/>}/>
      <StatCard label="Confidence" value={`${avgConfidence}%`} hint={`${sources.length} sumber data`} tone="purple" icon={<BrainCircuit/>}/>
    </div>

    <div className={styles.hero}>
      <div className={styles.heroIcon}><Sparkles size={26}/></div>
      <div>
        <span>SINSHE INTELLIGENCE</span>
        <h2>From reactive safety to predictive action</h2>
        <p>Engine membaca data dari modul operasional dan mengurutkan tindakan berdasarkan tingkat risiko, urgensi dan confidence.</p>
      </div>
      <button onClick={exportCSV}><Download size={17}/> Export Recommendation</button>
    </div>

    <div className={styles.grid}>
      <Panel className={styles.mainPanel}>
        <div className={styles.toolbar}>
          <label className={styles.search}><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari rekomendasi, unit, reference..."/></label>
          <label><Filter size={15}/><select value={source} onChange={e => setSource(e.target.value)}><option>All</option>{sources.map(v => <option key={v}>{v}</option>)}</select></label>
          <label><select value={severity} onChange={e => setSeverity(e.target.value)}><option>All</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label>
          <label><select value={unit} onChange={e => setUnit(e.target.value)}><option>All</option>{units.map(v => <option key={v}>{v}</option>)}</select></label>
        </div>

        <div className={styles.list}>
          {filtered.map(r => {
            const meta = sourceMeta[r.source] || { route: '/', tone: 'blue' }
            const done = reviewed.includes(r.id)
            return <article className={`${styles.card} ${done ? styles.reviewed : ''}`} key={r.id}>
              <div className={styles.priority}><span className={`${styles.dot} ${styles[r.severity.toLowerCase()]}`}/><b>{r.severity}</b></div>
              <div className={styles.body}>
                <div className={styles.cardHead}>
                  <div><small>{r.id} • {r.source} • {r.unit}</small><h3>{r.title}</h3></div>
                  <Badge tone={meta.tone}>{r.confidence}% confidence</Badge>
                </div>
                <p>{r.reason}</p>
                <div className={styles.actionBox}><Target size={17}/><span><b>Recommended action</b>{r.action}</span></div>
                <div className={styles.confidence}><span>Confidence</span><Progress value={r.confidence} tone={meta.tone}/><b>{r.confidence}%</b></div>
                <div className={styles.cardFooter}>
                  <span>Reference: <b>{r.ref}</b></span>
                  <div>
                    <Link href={meta.route}><Eye size={15}/> Buka Modul</Link>
                    <button onClick={() => toggleReviewed(r.id)}>{done ? <CheckCircle2 size={15}/> : <Sparkles size={15}/>} {done ? 'Reviewed' : 'Mark Reviewed'}</button>
                  </div>
                </div>
              </div>
            </article>
          })}
          {!filtered.length && <div className={styles.empty}>Tidak ada rekomendasi yang sesuai filter.</div>}
        </div>
      </Panel>

      <div className={styles.side}>
        <Panel title="Risk Concentration">
          <div className={styles.unitList}>{unitRisk.map(([name, score], index) => <div key={name}><span><b>#{index + 1}</b>{name}</span><strong>{score} pts</strong></div>)}</div>
        </Panel>
        <Panel title="Data Sources">
          <div className={styles.sourceList}>
            <div><span>Incident Management</span><b>{data.incidents.length}</b></div>
            <div><span>Corrective Action</span><b>{data.actions.length}</b></div>
            <div><span>Permit to Work</span><b>{data.permits.length}</b></div>
            <div><span>Asset Integrity</span><b>{data.assets.length}</b></div>
            <div><span>Regulatory Compliance</span><b>{data.regulations.length}</b></div>
            <div><span>Inspection & Observation</span><b>{data.observations.length}</b></div>
          </div>
        </Panel>
        <div className={styles.aiNote}>
          <Zap size={22}/><div><b>Prototype intelligence engine</b><p>Saat ini rekomendasi dihitung dari rules dan data modul di browser. Tahap berikutnya dapat dihubungkan ke database dan model AI/ML agar prediksi menggunakan data seluruh unit secara terpusat.</p></div>
        </div>
      </div>
    </div>

    <div className="benefit-row">
      <div><BrainCircuit/><b>AI & Analitik</b><span>Prioritas risiko dari lintas modul.</span></div>
      <div><AlertTriangle/><b>Early Warning</b><span>Temukan risiko sebelum menjadi insiden.</span></div>
      <div><Target/><b>Actionable</b><span>Setiap insight memiliki tindakan yang disarankan.</span></div>
      <div><CheckCircle2/><b>Continuous Review</b><span>Status rekomendasi dapat ditandai dan ditindaklanjuti.</span></div>
    </div>
  </Shell>
}
