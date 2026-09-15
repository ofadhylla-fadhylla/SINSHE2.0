'use client'
import Shell from '../../components/Shell'
import { Badge, SectionTitle, StatCard } from '../../components/Ui'
import { AlertTriangle, CheckCircle2, Clock3, Factory, Flame, Gauge, QrCode, Search, ShieldCheck, Wrench } from 'lucide-react'
import { useMemo, useState } from 'react'

const assets = [
  ['AST-BOI-001','Boiler 1','Boiler','PKS A','Normal','12 Aug 2026','15 Jul 2026','Online'],
  ['AST-PV-015','Pressure Vessel 15','Pressure Vessel','PKS B','Due Soon','28 Jul 2026','10 Jul 2026','Online'],
  ['AST-FK-023','Forklift 23','Forklift','Estate 3','Normal','10 Sep 2026','20 Aug 2026','Online'],
  ['AST-CR-004','Crane Overhead 4','Crane','PKS C','Expired','15 Jun 2026','12 May 2026','Offline'],
  ['AST-EL-067','Panel LVMDP 67','Electrical','PKS A','Normal','30 Oct 2026','-','Online'],
  ['AST-FP-010','Fire Pump 10','Fire Protection','PKS B','Due Soon','05 Aug 2026','-','Online'],
  ['AST-HY-021','Hydrant 21','Hydrant','Estate 2','Normal','20 Nov 2026','-','Online'],
  ['AST-PV-028','Pressure Vessel 28','Pressure Vessel','PKS C','Expired','01 Jun 2026','25 May 2026','Offline'],
]

export default function AssetIntegrity(){
  const [q,setQ]=useState('')
  const rows=useMemo(()=>assets.filter(a=>a.join(' ').toLowerCase().includes(q.toLowerCase())),[q])
  return <Shell title="Asset Integrity Management" subtitle="Pengelolaan aset kritikal untuk memastikan keandalan, keselamatan, kepatuhan dan umur aset yang optimal.">
    <div className="stats-grid four">
      <StatCard label="Normal" value="326" hint="66.5% aset" tone="green" icon={<CheckCircle2/>}/>
      <StatCard label="Due Soon" value="112" hint="22.9% aset" tone="orange" icon={<Clock3/>}/>
      <StatCard label="Expired / Overdue" value="52" hint="10.6% aset" tone="red" icon={<AlertTriangle/>}/>
      <StatCard label="Total Asset" value="490" hint="476 aktif" tone="blue" icon={<Factory/>}/>
    </div>

    <div className="dashboard-split">
      <div className="panel table-panel">
        <div className="table-toolbar"><SectionTitle title="Dashboard Asset Integrity"/><div className="mini-search"><Search size={16}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari aset..."/></div></div>
        <div className="table-wrap"><table><thead><tr><th>No</th><th>Asset ID</th><th>Nama Aset</th><th>Kategori</th><th>Lokasi</th><th>Status</th><th>Riksa Uji Next Due</th><th>SIO Next Due</th><th>Monitoring</th><th>QR</th></tr></thead>
        <tbody>{rows.map((a,i)=>{const tone=a[4]==='Normal'?'green':a[4]==='Due Soon'?'orange':'red';return <tr key={a[0]}><td>{i+1}</td><td><b>{a[0]}</b></td><td>{a[1]}</td><td>{a[2]}</td><td>{a[3]}</td><td><Badge tone={tone}>{a[4]}</Badge></td><td className={a[4]==='Expired'?'red-text':''}>{a[5]}</td><td>{a[6]}</td><td><Badge tone={a[7]==='Online'?'green':'red'}>{a[7]}</Badge></td><td><QrCode size={20}/></td></tr>})}</tbody></table></div>
      </div>
      <div className="panel detail-panel">
        <SectionTitle title="Detail Asset" />
        <div className="asset-visual"><div className="boiler-shape"><span/></div></div>
        <h3 className="asset-title">Boiler 1 (AST-BOI-001)</h3>
        <div className="detail-list"><div><span>Lokasi</span><b>PKS A</b></div><div><span>Tahun Pembuatan</span><b>2019</b></div><div><span>Manufacturer</span><b>PT. Boiler Indonesia</b></div><div><span>Kapasitas</span><b>10 Ton/Hour</b></div><div><span>Tekanan Kerja</span><b>12 Bar</b></div><div><span>Status Operasional</span><Badge tone="green">Aktif</Badge></div></div>
        <div className="due-box"><span>Next Riksa Uji</span><b>12 Aug 2026</b><strong>48 Hari</strong></div>
        <button className="primary-btn">Riwayat & Dokumen</button>
      </div>
    </div>

    <div className="benefit-row">
      <div><ShieldCheck/><b>Keselamatan Terjamin</b><span>Mengurangi risiko kegagalan aset.</span></div>
      <div><Wrench/><b>Biaya Terkendali</b><span>Perawatan tepat waktu.</span></div>
      <div><Gauge/><b>Kinerja Optimal</b><span>Aset andal dan proses stabil.</span></div>
      <div><Flame/><b>Umur Aset Maksimal</b><span>Perawatan terencana memperpanjang umur.</span></div>
    </div>
  </Shell>
}
