import Shell from '../../components/Shell'
import { Badge, Panel, Progress, StatCard } from '../../components/Ui'
import { AlertTriangle, ClipboardList, Layers, ShieldAlert, Target } from 'lucide-react'

const register = [
  ['RSK-001', 'Kebakaran tangki CPO', 'PKS A', 'Kebakaran', 4, 4, 'Extreme'],
  ['RSK-014', 'Terjepit alat berat', 'Estate 3', 'Mekanik', 3, 4, 'High'],
  ['RSK-022', 'Paparan bahan kimia', 'Laboratorium', 'Kimia', 3, 3, 'High'],
  ['RSK-031', 'Sengatan listrik panel', 'PKS B', 'Kelistrikan', 2, 4, 'High'],
  ['RSK-045', 'Confined space WWTP', 'PKS C', 'Confined Space', 4, 3, 'High'],
  ['RSK-058', 'Kelelahan operator', 'Estate 1', 'Ergonomi', 2, 2, 'Medium'],
  ['RSK-067', 'Kebisingan turbin', 'PKS A', 'Fisik', 2, 1, 'Low'],
]

const level = (l, s) => {
  const score = l * s
  if (score >= 15) return { label: 'Extreme', tone: 'red' }
  if (score >= 9) return { label: 'High', tone: 'orange' }
  if (score >= 4) return { label: 'Medium', tone: 'blue' }
  return { label: 'Low', tone: 'green' }
}

const matrixTone = score => score >= 15 ? 'h-crit' : score >= 9 ? 'h-high' : score >= 4 ? 'h-med' : 'h-low'

export default function HazardRisk(){
  return <Shell title="Hazard & Risk Management" subtitle="Identifikasi bahaya (HIRA/JSA), penilaian risiko, dan pengendalian berbasis hirarki kontrol.">
    <div className="stats-grid four">
      <StatCard label="Total Hazard" value="248" hint="teridentifikasi" tone="blue" icon={<AlertTriangle/>}/>
      <StatCard label="Extreme / High" value="36" hint="prioritas mitigasi" tone="red" icon={<ShieldAlert/>}/>
      <StatCard label="JSA Aktif" value="164" hint="dokumen terkini" tone="green" icon={<ClipboardList/>}/>
      <StatCard label="Mitigasi Selesai" value="78%" hint="+6% bulan ini" tone="purple" icon={<Target/>}/>
    </div>

    <div className="dashboard-split">
      <Panel className="table-panel" title="Risk Register">
        <div className="table-wrap"><table>
          <thead><tr><th>ID</th><th>Bahaya</th><th>Lokasi</th><th>Kategori</th><th>Likelihood</th><th>Severity</th><th>Risk Level</th></tr></thead>
          <tbody>{register.map(r => {
            const lv = level(r[4], r[5])
            return <tr key={r[0]}><td><b>{r[0]}</b></td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td>{r[4]}</td><td>{r[5]}</td><td><Badge tone={lv.tone}>{lv.label}</Badge></td></tr>
          })}</tbody>
        </table></div>
      </Panel>

      <Panel title="Risk Matrix 5×5">
        <div className="risk-matrix">
          <div className="rm-corner">L / S</div>
          {[1,2,3,4,5].map(s => <div key={s} className="rm-head">{s}</div>)}
          {[5,4,3,2,1].map(l => (
            <div className="rm-row" key={l}>
              <div className="rm-head">{l}</div>
              {[1,2,3,4,5].map(s => <div key={s} className={`rm-cell ${matrixTone(l*s)}`}>{l*s}</div>)}
            </div>
          ))}
        </div>
        <p className="matrix-note">Likelihood (baris) × Severity (kolom). Skor menentukan level risiko.</p>
      </Panel>
    </div>

    <Panel title="Hirarki Pengendalian" className="mt">
      <div className="hierarchy-row">
        {[['Eliminasi', 'Hilangkan sumber bahaya', 'red', 90], ['Substitusi', 'Ganti dengan lebih aman', 'orange', 75], ['Engineering', 'Isolasi & rekayasa teknik', 'blue', 82], ['Administratif', 'SOP, pelatihan, rambu', 'purple', 68], ['APD', 'Alat pelindung diri', 'green', 95]].map(([t, d, tone, v]) => (
          <div className="hier-card" key={t}><Layers/><b>{t}</b><small>{d}</small><Progress value={v} tone={tone}/></div>
        ))}
      </div>
    </Panel>
  </Shell>
}
