export const SAFETY_BRIEFING_MATERIALS = [
  {id:1,title:'Sapta Disiplin Safety',category:'Safety Fundamental'},
  {id:2,title:'Hirarki Pengendalian Risiko',category:'Safety Fundamental'},
  {id:3,title:'Piramida Kecelakaan Kerja',category:'Safety Fundamental'},
  {id:4,title:'Empat Penyebab Kecelakaan',category:'Safety Fundamental'},
  {id:5,title:'Cegah Kecelakaan di Masa Depan',category:'Safety Fundamental'},
  {id:6,title:'Near Miss, Unsafe Action, dan Unsafe Condition',category:'Safety Fundamental'},
  {id:7,title:'Ayo Lakukan PHBS di Rumah Tangga',category:'Health & Environment'},
  {id:8,title:'Langkah-langkah Pengelolaan Sampah',category:'Health & Environment'},
  {id:9,title:'Reuse Reduce Recycle (3R)',category:'Health & Environment'},
  {id:10,title:'Pengelolaan Sampah',category:'Health & Environment'},
  {id:11,title:'Ayo Lakukan Pengelolaan Sampah',category:'Health & Environment'},
  {id:12,title:'Peran HSE 5 Detik Sebelum Bertindak',category:'Safety Fundamental'},
  {id:13,title:'Windsock',category:'Emergency & Safety'},
  {id:14,title:'Perhitungan Total Jarak Saat Jatuh',category:'Working at Height'},
  {id:15,title:'3 Unsur Pembentukan Api',category:'Fire Safety'},
  {id:16,title:'Pengelolaan B3',category:'Environment & Chemical'},
  {id:17,title:'Pengelolaan LB3 & Non LB3',category:'Environment & Chemical'},
  {id:18,title:'Bekerja dengan Bahan Kimia',category:'Environment & Chemical'},
  {id:19,title:'Panen Tandan Buah Segar',category:'Plantation Operation'},
  {id:20,title:'Prosedur Panen Tandan Buah Segar',category:'Plantation Operation'},
  {id:21,title:'Penyemprotan Pestisida dan Herbisida',category:'Plantation Operation'},
  {id:22,title:'Kewajiban Larangan Penyemprotan',category:'Plantation Operation'},
  {id:23,title:'Kewajiban Larangan Pupuk',category:'Plantation Operation'},
  {id:24,title:'Larangan Mempekerjakan Anak',category:'Social & Compliance'},
  {id:25,title:'Pekerjaan Panas, Pemotongan, dan Pengelasan',category:'High Risk Work'},
  {id:26,title:'Bekerja Aman di Ruang Terbatas',category:'High Risk Work'},
  {id:27,title:'Bekerja Aman di Ruang Terbatas - Lanjutan',category:'High Risk Work'},
  {id:28,title:'Prosedur Investigasi Kecelakaan',category:'Incident Management'},
  {id:29,title:'Lockout Tagout (LOTO)',category:'High Risk Work'},
  {id:30,title:'Lockout Tagout (LOTO) - Lanjutan 1',category:'High Risk Work'},
  {id:31,title:'Lockout Tagout (LOTO) - Lanjutan 2',category:'High Risk Work'},
  {id:32,title:'Fatigue',category:'Occupational Health'},
  {id:33,title:'Work Permit',category:'Permit to Work'},
  {id:34,title:'Work Permit - Lanjutan 1',category:'Permit to Work'},
  {id:35,title:'Work Permit - Lanjutan 2',category:'Permit to Work'},
  {id:36,title:'Cek Keselamatan Untuk Gerinda Potong',category:'High Risk Work'},
  {id:37,title:'Bahaya Asap Saat Pengelasan',category:'Occupational Health'},
  {id:38,title:'Pekerjaan Penggalian',category:'High Risk Work'},
  {id:39,title:'Bahaya Ular Berbisa di Perkebunan Kelapa Sawit',category:'Plantation Safety'},
  {id:40,title:'Teknik Pengangkatan Beban yang Aman',category:'Manual Handling'},
  {id:41,title:'Pertolongan Pertama Pada Kecelakaan di Tempat Kerja',category:'Emergency & First Aid'},
].map(item=>({
  ...item,
  code:`KPNPLT-HSE-SK-${String(item.id).padStart(3,'0')}`,
  source:'Materi Safety Briefing KPN Plantations Progress',
  storagePath:`safety-briefing-materials/${String(item.id).padStart(2,'0')}.png`,
}))

export const SAFETY_MATERIAL_CATEGORIES = ['All', ...new Set(SAFETY_BRIEFING_MATERIALS.map(item=>item.category))]

export function safetyMaterialById(id){
  return SAFETY_BRIEFING_MATERIALS.find(item=>item.id===Number(id)) || null
}

export function safetyMaterialStoragePath(id){
  return safetyMaterialById(id)?.storagePath || ''
}
