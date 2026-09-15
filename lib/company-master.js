export const COMPANY_MASTER = [
  ['ACP','Agrinusa Cipta Persada','Fabian','Merauke','Papua Barat','Active'],
  ['AJP','Alam Jaya Persada','Kurniadi','Kutai Kartanegara','Kalimantan Timur','Active'],
  ['APM','Agricipta Persada Mulia','Fabian','Merauke','Papua Barat','Active'],
  ['BAS','Bumi Alam Sentosa','Romawanto','Kubu Raya','Kalimantan Barat','Active'],
  ['BSU','Berkat Sawit Utama','Endri Yeni','Sungai Kandang','Jambi','Active'],
  ['CMA','Citra Mahkota','Komang','Nanga Pinoh','Kalimantan Barat','Active'],
  ['CRS','Citra Riau Sarana','Kengjas','Kuantan Singingi','Pekanbaru','Active'],
  ['GAN','Graha Agro Nusantara','Erna','Kubu Raya','Kalimantan Barat','Active'],
  ['HSS','HSS','Kurniadi','Paser','Kalimantan Timur','Active'],
  ['IBP','Intitama Berlian Perkebunan','Adi Iswanto','Bengkayang','Kalimantan Barat','Active'],
  ['IKU','Indo Kebun Unggul','Endri Yeni','Sungai Kandang','Jambi','Active'],
  ['JJP','Jatim Jaya Perkasa','Azzah','Bagan Siapi api','Pekanbaru','Active'],
  ['KAMU','KAMU','Daud Boma','Agam','Sumatera Barat','Active'],
  ['NJP','Nusa Jaya Perkasa','Romawanto','Kubu Raya','Kalimantan Barat','Active'],
  ['PLDK','Putra Lirik Domas','Romawanto','Kubu Raya','Kalimantan Barat','Active'],
  ['PLDS','Putra Lirik Domas','Sandi','Sambas','Kalimantan Barat','Active'],
  ['PNPP','Perkebunan Anak Negeri Pasaman','Daud Boma','Agam','Sumatera Barat','Active'],
  ['PNPS','Perkebunan Anak Negeri Pasaman','Sandi','Sambas','Kalimantan Barat','Active'],
  ['PNPL','Perkebunan Anak Negeri Pasaman','Jaya','Landak','Kalimantan Barat','Active'],
  ['PTW','Patiware','Jaya','Bengkayang','Kalimantan Barat','Active'],
  ['SAM','Sentosa Asih Makmur','Sandi','Sambas','Kalimantan Barat','Active'],
  ['SIP','Swadaya Indopalma','Markoni','Palembang','Sumatera Selatan','Active'],
  ['SUAN','SUAN','Guntur','Kutai Kartanegara','Kalimantan Timur','Active'],
  ['SUMK','Sumatera Unggul Makmur','Romawanto','Kubu Raya','Kalimantan Barat','Active'],
  ['SUMS','Sumatera Unggul Makmur','Jaya','Sambas','Kalimantan Barat','Active'],
  ['THP','TH Indo Plantation','Said','Indragiri Hilir','Pekanbaru','Active'],
  ['TSB','Tritunggal Sentra Buana','Guntur','Kutai Kartanegara','Kalimantan Timur','Active'],
  ['WKN','Wawasan Kebun Nusantara','Adi Iswanto','Bengkayang','Kalimantan Barat','Active'],
  ['WKSM','Wahana Karya Sejahtera Mandiri','Erik Sihombing','Tobadak','Mamuju','Active'],
].map(([code,name,pic,region,province,status]) => ({ code,name,pic,region,province,status }))

export const DEFAULT_COMPANY_FILTERS = { company:'All', region:'All', province:'All', pic:'All', status:'Active' }

export const companyCodeOf = record => String(record?.companyCode || record?.company_code || record?.company || '').trim().toUpperCase()

export function filteredCompanies(filters = DEFAULT_COMPANY_FILTERS) {
  return COMPANY_MASTER.filter(item =>
    (filters.status === 'All' || item.status === filters.status) &&
    (filters.region === 'All' || item.region === filters.region) &&
    (filters.province === 'All' || item.province === filters.province) &&
    (filters.pic === 'All' || item.pic === filters.pic) &&
    (filters.company === 'All' || item.code === filters.company)
  )
}

export function scopeLabel(filters = DEFAULT_COMPANY_FILTERS) {
  if (filters.company !== 'All') {
    const company = COMPANY_MASTER.find(item => item.code === filters.company)
    return company ? `${company.code} — ${company.name}` : filters.company
  }
  const parts = []
  if (filters.region !== 'All') parts.push(filters.region)
  if (filters.province !== 'All') parts.push(filters.province)
  if (filters.pic !== 'All') parts.push(`PIC ${filters.pic}`)
  return parts.length ? parts.join(' • ') : 'All Companies'
}
