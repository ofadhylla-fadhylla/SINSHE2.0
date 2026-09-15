'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import CompanyScopeBar from '../../components/CompanyScopeBar'
import { Badge, Panel, Progress, StatCard } from '../../components/Ui'
import {
  AlertTriangle, BrainCircuit, CheckCircle2, Download, Eye, Filter,
  Gauge, GraduationCap, Lightbulb, Search, ShieldAlert, Sparkles, Target, Zap
} from 'lucide-react'
import { DEFAULT_COMPANY_FILTERS, companyCodeOf, filteredCompanies, scopeLabel } from '../../lib/company-master'
import styles from './ai-recommendation.module.css'

const sourceMeta = {
  Incident: { route: '/incident', tone: 'red' },
  'Corrective Action': { route: '/corrective-action', tone: 'orange' },
  'Permit to Work': { route: '/permit-to-work', tone: 'purple' },
  'Asset Integrity': { route: '/asset-integrity', tone: 'blue' },
  'Regulatory Compliance': { route: '/regulatory-compliance', tone: 'green' },
  'Inspection & Observation': { route: '/inspection', tone: 'orange' },
  'Hazard & Risk': { route: '/hazard-risk', tone: 'red' },
  'Learning & Competency': { route: '/learning-competency', tone: 'blue' },
}

const severityWeight = { Critical: 4, High: 3, Medium: 2, Low: 1 }

const demoRecommendations = [
  {
    id: 'AI-DEMO-001', companyCode: '', source: 'Asset Integrity', unit: 'PKS C', severity: 'Critical', confidence: 96,
    title: 'Aset kritikal memiliki dokumen pemeriksaan expired',
    reason: 'Crane / pressure vessel yang melewati due date meningkatkan risiko operasional dan ketidakpatuhan.',
    action: 'Hentikan penggunaan bila diperlukan, verifikasi status operasional dan jadwalkan riksa uji segera.', ref: 'Asset Register',
  },
  {
    id: 'AI-DEMO-002', companyCode: '', source: 'Corrective Action', unit: 'PKS C', severity: 'High', confidence: 93,
    title: 'Corrective action berisiko tinggi melewati due date',
    reason: 'Action yang overdue dapat membuat temuan berulang dan meningkatkan residual risk.',
    action: 'Eskalasi ke owner, tetapkan recovery date dan pastikan evidence closure tersedia.', ref: 'Corrective Action Register',
  },
  {
    id: 'AI-DEMO-003', companyCode: '', source: 'Regulatory Compliance', unit: 'PKS C', severity: 'High', confidence: 91,
    title: 'Kewajiban compliance membutuhkan tindakan prioritas',
    reason: 'Terdapat kewajiban non-compliant / mendekati jatuh tempo yang berdampak pada audit readiness.',
    action: 'Prioritaskan evidence, PIC dan due date untuk kewajiban dengan priority High/Critical.', ref: 'Legal Register',
  },
]

const emptyData = { incidents: [], actions: [], permits: [], assets: [], regulations: [], observations: [], hazards: [], learning: [] }

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
  return Math.ceil((new Date(`${String(value).slice(0,10)}T23:59:59`) - new Date()) / 86400000)
}

function assetNearestDays(asset) {
  const dates = [asset.riksaDue, asset.sioDue, asset.siloDue, asset.calibrationDue].filter(Boolean)
  if (!dates.length) return null
  return Math.min(...dates.map(daysUntil))
}

function riskScore(item) {
  const residual = Number(item.residualLikelihood || item.residual_likelihood || 0) * Number(item.residualSeverity || item.residual_severity || 0)
  if (residual) return residual
  return Number(item.likelihood || 0) * Number(item.severity || 0)
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
        companyCode: companyCodeOf(item), source: 'Incident', unit: item.unit || 'Unknown', severity: item.severity,
        confidence: item.severity === 'Critical' ? 97 : 91,
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
        companyCode: companyCodeOf(item), source: 'Corrective Action', unit: item.unit || 'Unknown',
        severity: overdue ? 'Critical' : item.priority || 'High', confidence: overdue ? 95 : 89,
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
        companyCode: companyCodeOf(item), source: 'Permit to Work', unit: item.unit || 'Unknown', severity: 'High', confidence: 92,
        title: 'Permit expired membutuhkan closure / revalidation', reason: `${item.id || 'PTW'} untuk ${item.type || 'pekerjaan'} telah expired.`,
        action: 'Pastikan pekerjaan berhenti, lakukan close-out atau terbitkan permit baru setelah risk control diverifikasi ulang.', ref: item.id || 'PTW',
      })
      return
    }
    if (['Critical', 'High'].includes(item.risk) && ['Awaiting Approval', 'Approved', 'Active'].includes(item.status)) {
      push({
        companyCode: companyCodeOf(item), source: 'Permit to Work', unit: item.unit || 'Unknown', severity: item.risk === 'Critical' ? 'Critical' : 'High',
        confidence: item.risk === 'Critical' ? 94 : 87, title: `${item.type || 'High-risk work'} memerlukan verifikasi critical control`,
        reason: `${item.id || 'PTW'} berstatus ${item.status} di ${item.area || item.unit || 'area kerja'}.`,
        action: 'Pastikan JSA, toolbox meeting, APD dan kontrol khusus pekerjaan telah diverifikasi sebelum / selama pekerjaan.', ref: item.id || 'PTW',
      })
    }
  })

  data.assets.forEach(item => {
    const days = assetNearestDays(item)
    if (days === null) return
    if (days < 0) {
      push({
        companyCode: companyCodeOf(item), source: 'Asset Integrity', unit: item.unit || 'Unknown', severity: 'Critical', confidence: 96,
        title: `${item.name || item.id || 'Asset'} memiliki dokumen inspeksi expired`,
        reason: `Dokumen terdekat telah overdue ${Math.abs(days)} hari. Status operasional: ${item.operational || 'Unknown'}.`,
        action: 'Verifikasi kelayakan operasi, jadwalkan pemeriksaan/renewal dan dokumentasikan evidence sebelum melanjutkan operasi berisiko.', ref: item.id || item.name,
      })
    } else if (days <= 30) {
      push({
        companyCode: companyCodeOf(item), source: 'Asset Integrity', unit: item.unit || 'Unknown', severity: days <= 14 ? 'High' : 'Medium',
        confidence: days <= 14 ? 90 : 82, title: `${item.name || item.id || 'Asset'} mendekati due date`, reason: `Due date terdekat dalam ${days} hari.`,
        action: 'Siapkan vendor, dokumen dan shutdown window agar renewal selesai sebelum jatuh tempo.', ref: item.id || item.name,
      })
    }
  })

  data.regulations.forEach(item => {
    const days = daysUntil(item.dueDate)
    if (item.status === 'Non Compliant' || (item.status !== 'Compliant' && days !== null && days <= 30)) {
      push({
        companyCode: companyCodeOf(item), source: 'Regulatory Compliance', unit: item.unit || 'Unknown',
        severity: item.status === 'Non Compliant' || item.priority === 'Critical' ? 'Critical' : item.priority === 'High' ? 'High' : 'Medium',
        confidence: item.status === 'Non Compliant' ? 95 : 88,
        title: item.status === 'Non Compliant' ? 'Non-compliance membutuhkan corrective plan' : 'Kewajiban regulasi mendekati due date',
        reason: `${item.id || 'REG'} • ${item.obligation || item.regulation || 'Kewajiban'} • ${days !== null && days < 0 ? `${Math.abs(days)} hari overdue` : `${days ?? '-'} hari tersisa`}.`,
        action: 'Lengkapi evidence, konfirmasi PIC dan selesaikan kewajiban sebelum audit / jatuh tempo.', ref: item.id || item.regulation,
      })
    }
  })

  data.observations.forEach(item => {
    if (item.status === 'Closed') return
    if (['Critical', 'High'].includes(item.risk)) {
      push({
        companyCode: companyCodeOf(item), source: 'Inspection & Observation', unit: item.unit || 'Unknown', severity: item.risk,
        confidence: item.risk === 'Critical' ? 92 : 85, title: `${item.type || 'Safety observation'} berisiko ${item.risk}`,
        reason: `${item.id || 'Observation'} • ${item.description || 'Temuan lapangan'} • status ${item.status || 'Open'}.`,
        action: item.action || 'Tetapkan corrective action, PIC dan due date lalu verifikasi efektivitas penutupan.', ref: item.id || 'Observation',
      })
    }
  })

  data.hazards.forEach(item => {
    if (item.status === 'Closed') return
    const score = riskScore(item)
    if (score >= 9) {
      push({
        companyCode: companyCodeOf(item), source: 'Hazard & Risk', unit: item.unit || 'Unknown', severity: score >= 15 ? 'Critical' : 'High',
        confidence: score >= 15 ? 96 : 90, title: `${item.title || item.activity || 'Hazard'} memiliki residual risk tinggi`,
        reason: `${item.id || 'Risk'} • residual risk score ${score} • status ${item.status || 'Open'}.`,
        action: item.additionalControls || item.additional_controls || 'Review hierarchy of control, tetapkan owner dan turunkan residual risk sebelum aktivitas dilanjutkan.',
        ref: item.id || item.jsaNo || item.jsa_no || 'Risk Register',
      })
    }
  })

  data.learning.forEach(item => {
    const days = daysUntil(item.validUntil || item.valid_until)
    if (days !== null && days <= 30 && item.mandatory !== false) {
      push({
        companyCode: companyCodeOf(item), source: 'Learning & Competency', unit: item.unit || 'Unknown', severity: days < 0 ? 'High' : 'Medium',
        confidence: days < 0 ? 91 : 84, title: `${item.trainingName || item.training_name || 'Kompetensi wajib'} ${days < 0 ? 'expired' : 'mendekati expiry'}`,
        reason: `${item.employeeName || item.employee_name || 'Personel'} • ${days < 0 ? `${Math.abs(days)} hari expired` : `${days} hari tersisa`}.`,
        action: 'Jadwalkan refresh training / renewal sertifikasi dan pastikan personel memenuhi competency requirement sebelum penugasan.',
        ref: item.certificateNo || item.certificate_no || item.id || 'Training Register',
      })
    }
  })

  return recs.sort((a, b) => (severityWeight[b.severity] - severityWeight[a.severity]) || (b.confidence - a.confidence)).slice(0, 50)
}

export default function AIRecommendation() {
  const [data, setData] = useState(emptyData)
  const [reviewed, setReviewed] = useState([])
  const [companyFilters, setCompanyFilters] = useState(DEFAULT_COMPANY_FILTERS)
  const [search, setSearch] = useState('')
  const [source, setSource] = useState('All')
  const [severity, setSeverity] = useState('All')
  const [unit, setUnit] = useState('All')

  useEffect(() => {
    const load = () => setData({
      incidents: safeRead('sinshe-incidents'), actions: safeRead('sinshe-corrective-actions'), permits: safeRead('sinshe-permits'),
      assets: safeRead('sinshe-assets'), regulations: safeRead('sinshe-regulatory-obligations'), observations: safeRead('sinshe-observations'),
      hazards: safeRead('sinshe-hazards'), learning: safeRead('sinshe-learning-records'),
    })
    load()
    setReviewed(safeRead('sinshe-ai-reviewed'))
    window.addEventListener('sinshe-central-data', load)
    window.addEventListener('sinshe-central-sync-complete', load)
    return () => {
      window.removeEventListener('sinshe-central-data', load)
      window.removeEventListener('sinshe-central-sync-complete', load)
    }
  }, [])

  const scopedData = useMemo(() => {
    const allowed = new Set(filteredCompanies(companyFilters).map(c => c.code))
    const specific = companyFilters.company !== 'All' || companyFilters.region !== 'All' || companyFilters.province !== 'All' || companyFilters.pic !== 'All'
    const apply = rows => rows.filter(row => {
      const code = companyCodeOf(row)
      if (!code) return !specific
      return allowed.has(code)
    })
    return Object.fromEntries(Object.entries(data).map(([key, rows]) => [key, apply(rows)]))
  }, [data, companyFilters])

  const generated = useMemo(() => buildRecommendations(scopedData), [scopedData])
  const referenceMode = !generated.length && companyFilters.company === 'All' && companyFilters.region === 'All' && companyFilters.province === 'All' && companyFilters.pic === 'All'
  const recommendations = generated.length ? generated : referenceMode ? demoRecommendations : []

  const filtered = useMemo(() => recommendations.filter(r => {
    const q = search.trim().toLowerCase()
    const text = [r.id, r.companyCode, r.title, r.reason, r.action, r.unit, r.source, r.ref].join(' ').toLowerCase()
    return (!q || text.includes(q)) && (source === 'All' || r.source === source) && (severity === 'All' || r.severity === severity) && (unit === 'All' || r.unit === unit)
  }), [recommendations, search, source, severity, unit])

  const sources = [...new Set(recommendations.map(r => r.source))]
  const units = [...new Set(recommendations.map(r => r.unit))]
  const critical = recommendations.filter(r => r.severity === 'Critical').length
  const high = recommendations.filter(r => r.severity === 'High').length
  const reviewedScoped = recommendations.filter(r => reviewed.includes(r.id)).length
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
    const header = ['Recommendation ID', 'Company/PT', 'Source', 'Unit', 'Severity', 'Confidence', 'Title', 'Reason', 'Recommended Action', 'Reference', 'Reviewed']
    const rows = filtered.map(r => [r.id, r.companyCode || '', r.source, r.unit, r.severity, `${r.confidence}%`, r.title, r.reason, r.action, r.ref, reviewed.includes(r.id) ? 'Yes' : 'No'])
    const csv = [header, ...rows].map(row => row.map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url
    a.download = `SINSHE_AI_Recommendation_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  return <Shell title="AI Recommendation Engine" subtitle="Analitik prediktif untuk memprioritaskan risiko, compliance, asset, incident dan tindak lanjut operasional.">
    <CompanyScopeBar filters={companyFilters} onChange={setCompanyFilters} onReset={() => setCompanyFilters(DEFAULT_COMPANY_FILTERS)}/>
    <div style={{marginBottom:14,padding:'9px 12px',border:'1px solid #d9e9dd',background:'#f1f8f3',borderRadius:10,fontSize:11,fontWeight:800,color:'#176b34'}}>
      Intelligence scope: {scopeLabel(companyFilters)} • {referenceMode ? 'REFERENCE MODE — belum ada sinyal operasional pada data live' : `${recommendations.length} rekomendasi dari data modul`}
    </div>

    <div className="stats-grid four">
      <StatCard label="Critical Recommendation" value={critical} hint={`${high} high priority`} tone="red" icon={<ShieldAlert/>}/>
      <StatCard label="Rekomendasi Aktif" value={recommendations.length} hint={`${reviewedScoped} sudah direview`} tone="green" icon={<Lightbulb/>}/>
      <StatCard label="Risk Priority Index" value={`${riskIndex}%`} hint="severity × confidence" tone="orange" icon={<Gauge/>}/>
      <StatCard label="Confidence" value={`${avgConfidence}%`} hint={`${sources.length} sumber data`} tone="purple" icon={<BrainCircuit/>}/>
    </div>

    <div className={styles.hero}>
      <div className={styles.heroIcon}><Sparkles size={26}/></div>
      <div><span>SINSHE INTELLIGENCE</span><h2>From reactive safety to predictive action</h2><p>Engine membaca data operasional pada scope PT yang dipilih dan mengurutkan tindakan berdasarkan risiko, urgensi dan confidence.</p></div>
      <button onClick={exportCSV}><Download size={17}/> Export Recommendation</button>
    </div>

    <div className={styles.grid}>
      <Panel className={styles.mainPanel}>
        <div className={styles.toolbar}>
          <label className={styles.search}><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari rekomendasi, PT, unit, reference..."/></label>
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
                <div className={styles.cardHead}><div><small>{r.id} • {r.companyCode || 'PT unassigned'} • {r.source} • {r.unit}</small><h3>{r.title}</h3></div><Badge tone={meta.tone}>{r.confidence}% confidence</Badge></div>
                <p>{r.reason}</p>
                <div className={styles.actionBox}><Target size={17}/><span><b>Recommended action</b>{r.action}</span></div>
                <div className={styles.confidence}><span>Confidence</span><Progress value={r.confidence} tone={meta.tone}/><b>{r.confidence}%</b></div>
                <div className={styles.cardFooter}><span>Reference: <b>{r.ref}</b></span><div><Link href={meta.route}><Eye size={15}/> Buka Modul</Link><button onClick={() => toggleReviewed(r.id)}>{done ? <CheckCircle2 size={15}/> : <Sparkles size={15}/>} {done ? 'Reviewed' : 'Mark Reviewed'}</button></div></div>
              </div>
            </article>
          })}
          {!filtered.length && <div className={styles.empty}>Tidak ada rekomendasi pada scope/filter ini. Data lama tanpa Company/PT hanya muncul pada All Companies.</div>}
        </div>
      </Panel>

      <div className={styles.side}>
        <Panel title="Risk Concentration"><div className={styles.unitList}>{unitRisk.map(([name, score], index) => <div key={name}><span><b>#{index + 1}</b>{name}</span><strong>{score} pts</strong></div>)}{!unitRisk.length&&<div style={{fontSize:12,color:'#7c858e'}}>Belum ada risk concentration.</div>}</div></Panel>
        <Panel title="Data Sources — Current PT Scope"><div className={styles.sourceList}>
          <div><span>Incident Management</span><b>{scopedData.incidents.length}</b></div><div><span>Corrective Action</span><b>{scopedData.actions.length}</b></div><div><span>Permit to Work</span><b>{scopedData.permits.length}</b></div><div><span>Asset Integrity</span><b>{scopedData.assets.length}</b></div><div><span>Regulatory Compliance</span><b>{scopedData.regulations.length}</b></div><div><span>Inspection & Observation</span><b>{scopedData.observations.length}</b></div><div><span>Hazard & Risk</span><b>{scopedData.hazards.length}</b></div><div><span>Learning & Competency</span><b>{scopedData.learning.length}</b></div>
        </div></Panel>
        <div className={styles.aiNote}><Zap size={22}/><div><b>Rule-based intelligence — current stage</b><p>Rekomendasi saat ini dihitung dari data modul yang sudah disinkronkan dan aturan risiko. Ini belum model machine learning; tahap berikutnya dapat memakai data historis terpusat untuk predictive modelling dan anomaly detection.</p></div></div>
      </div>
    </div>

    <div className="benefit-row"><div><BrainCircuit/><b>AI & Analitik</b><span>Prioritas risiko dari lintas modul.</span></div><div><AlertTriangle/><b>Early Warning</b><span>Temukan risiko sebelum menjadi insiden.</span></div><div><Target/><b>Actionable</b><span>Setiap insight memiliki tindakan yang disarankan.</span></div><div><GraduationCap/><b>Competency Aware</b><span>Expiry training wajib ikut menjadi sinyal.</span></div></div>
  </Shell>
}
