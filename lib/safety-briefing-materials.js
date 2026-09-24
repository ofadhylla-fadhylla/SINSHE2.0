export const SAFETY_BRIEFING_MATERIALS = [
  {id:1,title:'Sapta Disiplin Safety',category:'Safety Fundamental'},
  {id:2,title:'Hirarki Pengendalian Risiko',category:'Safety Fundamental'},
  {id:3,title:'Piramida Kecelakaan dan Gunung Es',category:'Safety Fundamental'},
  {id:4,title:'4 Penyebab Kecelakaan Kerja',category:'Safety Fundamental'},
  {id:5,title:'Cegah Kecelakaan di Masa Depan',category:'Safety Fundamental'},
  {id:6,title:'Near Miss, Unsafe Action, dan Unsafe Condition',category:'Safety Fundamental'},
  {id:7,title:'Ayo Lakukan 10 PHBS di Rumah Tangga',category:'Health & Environment'},
  {id:8,title:'Ayo Lakukan Pengelolaan Sampah',category:'Health & Environment'},
  {id:9,title:'Langkah-Langkah Pengelolaan Sampah',category:'Health & Environment'},
  {id:10,title:'Jaga Bumi Kita dengan 3R',category:'Health & Environment'},
  {id:11,title:'Pengelolaan Sampah - Mekanisme di TPS 3R',category:'Health & Environment'},
  {id:12,title:'Peran HSE, 5 Detik Sebelum Bertindak',category:'Safety Fundamental'},
  {id:13,title:'Windsock',category:'Emergency & Safety'},
  {id:14,title:'Perhitungan Total Jarak Saat Jatuh',category:'Working at Height'},
  {id:15,title:'3 Unsur Pembentuk Api, Kelas Kebakaran, dan Jenis APAR',category:'Fire Safety'},
  {id:16,title:'Pengelolaan B3',category:'Environment & Chemical'},
  {id:17,title:'Pengelolaan LB3 & Non LB3',category:'Environment & Chemical'},
  {id:18,title:'Bekerja dengan Bahan Kimia',category:'Environment & Chemical'},
  {id:19,title:'Panen Tandan Buah Segar (TBS)',category:'Plantation Operation'},
  {id:20,title:'Panen Tandan Buah Segar (TBS) Vol. 2',category:'Plantation Operation'},
  {id:21,title:'Penyemprotan Pestisida / Herbisida',category:'Plantation Operation'},
  {id:22,title:'Penyemprotan Vol. 2',category:'Plantation Operation'},
  {id:23,title:'Pupuk',category:'Plantation Operation'},
  {id:24,title:'Larangan Mempekerjakan Anak',category:'Social & Compliance'},
  {id:25,title:'Pekerjaan Panas, Pemotongan dan Pengelasan',category:'High Risk Work'},
  {id:26,title:'Bekerja Aman di Ruang Terbatas (Confined Space)',category:'High Risk Work'},
  {id:27,title:'Bekerja Aman di Ruang Terbatas (Confined Space) Vol. 2',category:'High Risk Work'},
  {id:28,title:'Prosedur Investigasi Kecelakaan',category:'Incident Management'},
  {id:29,title:'Lockout Tagout (LOTO)',category:'High Risk Work'},
  {id:30,title:'Lockout Tagout (LOTO) Vol. 2',category:'High Risk Work'},
  {id:31,title:'Lockout Tagout (LOTO) Vol. 3',category:'High Risk Work'},
  {id:32,title:'Fatigue (Kelelahan)',category:'Occupational Health'},
  {id:33,title:'Work Permit - Izin Kerja',category:'Permit to Work'},
  {id:34,title:'Work Permit - Izin Kerja Vol. 2',category:'Permit to Work'},
  {id:35,title:'Work Permit - Izin Kerja Vol. 3',category:'Permit to Work'},
  {id:36,title:'Cek Keselamatan untuk Gerinda Potong',category:'High Risk Work'},
  {id:37,title:'Bahaya Asap Saat Pengelasan',category:'Occupational Health'},
  {id:38,title:'Pekerjaan Penggalian (Excavation)',category:'High Risk Work'},
  {id:39,title:'Bahaya Ular Berbisa di Perkebunan Kelapa Sawit',category:'Plantation Safety'},
  {id:40,title:'Teknik Pengangkatan Beban yang Aman',category:'Manual Handling'},
  {id:41,title:'Pertolongan Pertama pada Kecelakaan di Tempat Kerja (P3K)',category:'Emergency & First Aid'},
].map(item=>({...item,code:`KPNPLT-HSE-SK-${String(item.id).padStart(3,'0')}`}))

export const SAFETY_MATERIAL_CATEGORIES = ['All', ...new Set(SAFETY_BRIEFING_MATERIALS.map(item=>item.category))]

export function safetyMaterialById(id){
  return SAFETY_BRIEFING_MATERIALS.find(item=>item.id===Number(id)) || null
}

export async function loadSafetyMaterialImage(id){
  const n=Number(id)
  let images={}
  if(n>=1&&n<=5) images=(await import('./safety-material-images/chunk01')).default
  else if(n<=10) images=(await import('./safety-material-images/chunk02')).default
  else if(n<=15) images=(await import('./safety-material-images/chunk03')).default
  else if(n<=20) images=(await import('./safety-material-images/chunk04')).default
  else if(n<=25) images=(await import('./safety-material-images/chunk05')).default
  else if(n<=30) images=(await import('./safety-material-images/chunk06')).default
  else if(n<=35) images=(await import('./safety-material-images/chunk07')).default
  else if(n<=40) images=(await import('./safety-material-images/chunk08')).default
  else if(n===41) images=(await import('./safety-material-images/chunk09')).default
  return images[n] || ''
}
