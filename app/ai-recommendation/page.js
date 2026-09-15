import Shell from '../../components/Shell'
import { Badge, Panel, Progress, StatCard } from '../../components/Ui'
import { BrainCircuit, Lightbulb, Sparkles, TrendingUp, Zap } from 'lucide-react'

const recommendations = [
  ['Prediksi kegagalan Boiler 1', 'Pola getaran & suhu menunjukkan potensi kegagalan bearing dalam 3 minggu. Jadwalkan inspeksi prediktif.', 'PKS A', 'Critical', 'red', 92],
  ['Cluster temuan housekeeping', 'Lonjakan temuan housekeeping di Estate 2. Rekomendasi audit 5S & refresh training.', 'Estate 2', 'High', 'orange', 84],
  ['Risiko kelelahan operator', 'Data shift menunjukkan lembur berlebih pada tim malam. Sesuaikan rotasi untuk cegah fatigue.', 'PKS B', 'High', 'orange', 79],
  ['Optimasi jadwal riksa uji', 'Konsolidasi jadwal riksa uji 8 aset di lokasi berdekatan untuk hemat downtime 22%.', 'PKS C', 'Medium', 'blue', 71],
  ['Anomali kualitas air limbah', 'Nilai COD mendekati ambang batas. Rekomendasi kalibrasi sensor SPARING & cek dosing.', 'PKS A', 'Medium', 'blue', 68],
]

const models = [
  ['Predictive Maintenance', 94, 'green'],
  ['Incident Risk Forecast', 88, 'blue'],
  ['Anomaly Detection (IoT)', 91, 'purple'],
  ['Compliance Risk Scoring', 86, 'orange'],
]

export default function AIRecommendation(){
  return <Shell title="AI Recommendation" subtitle="Mesin rekomendasi berbasis AI untuk prediksi risiko, deteksi anomali, dan saran tindakan proaktif.">
    <div className="stats-grid four">
      <StatCard label="Rekomendasi Aktif" value="24" hint="7 prioritas tinggi" tone="green" icon={<Lightbulb/>}/>
      <StatCard label="Risiko Terprediksi" value="11" hint="30 hari ke depan" tone="red" icon={<TrendingUp/>}/>
      <StatCard label="Anomali Terdeteksi" value="5" hint="dari sensor IoT" tone="orange" icon={<Zap/>}/>
      <StatCard label="Akurasi Model" value="90%" hint="rata-rata 4 model" tone="purple" icon={<BrainCircuit/>}/>
    </div>

    <div className="dashboard-split">
      <Panel className="table-panel" title="Rekomendasi AI Prioritas">
        <div className="rec-list">
          {recommendations.map((r, i) => (
            <div className="rec-card" key={i}>
              <div className="rec-icon"><Sparkles size={18}/></div>
              <div className="rec-body">
                <div className="rec-head"><b>{r[0]}</b><Badge tone={r[4]}>{r[3]}</Badge></div>
                <p>{r[2]}</p>
                <small>{r[1]}</small>
                <div className="rec-conf"><span>Confidence</span><Progress value={r[5]} tone={r[4]}/><b>{r[5]}%</b></div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Performa Model AI">
        <div className="perspective-list">
          {models.map(([n, v, t]) => <div key={n}><div><b>{n}</b><span>{v}%</span></div><Progress value={v} tone={t}/></div>)}
        </div>
        <div className="ai-card" style={{marginTop:16}}>
          <BrainCircuit/><div><b>Insight Mingguan</b><p>Model memproyeksikan penurunan insiden recordable sebesar 8% jika 3 rekomendasi kritis diterapkan minggu ini.</p></div>
        </div>
      </Panel>
    </div>

    <div className="benefit-row">
      <div><TrendingUp/><b>Prediktif</b><span>Antisipasi risiko sebelum terjadi.</span></div>
      <div><Zap/><b>Real-time</b><span>Deteksi anomali dari data sensor.</span></div>
      <div><Lightbulb/><b>Actionable</b><span>Rekomendasi tindakan yang jelas.</span></div>
      <div><BrainCircuit/><b>Continuous Learning</b><span>Akurasi model meningkat seiring data.</span></div>
    </div>
  </Shell>
}
