// Source: KPNPLT-FORM-SST-003.01 - Matriks Standar Kebutuhan APD.xlsx
// Values are preserved from the user-provided KPN Plantations form.
export const PPE_CATALOG = [
  {"name":"Safety Helmet + chinstrap","materialCode":"934.303.007","usagePeriod":"24 Bulan"},
  {"name":"Topi/ Caping","materialCode":"Caping : 934.303.004 / Topi : 934.303.008","usagePeriod":"6 Bulan"},
  {"name":"Sebo Tutup Kepala","materialCode":"934.303.008","usagePeriod":"1 Tahun"},
  {"name":"Kedok Las","materialCode":"934.303.001","usagePeriod":"1 Tahun"},
  {"name":"Face Shield","materialCode":"934.304.017","usagePeriod":"1 Tahun"},
  {"name":"Chemical Googles","materialCode":"934.301.004","usagePeriod":"4 Bulan"},
  {"name":"Safety glass","materialCode":"934.301.Z03","usagePeriod":"4 Bulan"},
  {"name":"Ear Plug","materialCode":"934.307.107","usagePeriod":"3 Bulan"},
  {"name":"Ear Muff","materialCode":"934.307.003","usagePeriod":"1 Tahun"},
  {"name":"Respirator & Cartridge","materialCode":"934.304.011","usagePeriod":"1 tahun Respirator/3 bulan Cartridge"},
  {"name":"Dust Mask","materialCode":"934.304.025","usagePeriod":"1 Minggu"},
  {"name":"Karet","materialCode":"934.302.408","usagePeriod":"4 Bulan"},
  {"name":"Kain","materialCode":"934.302.001","usagePeriod":"Consumable"},
  {"name":"Kulit","materialCode":"934.302.202","usagePeriod":"4 Bulan"},
  {"name":"Pakaian Kerja","materialCode":"Kode Material","usagePeriod":"1 Tahun"},
  {"name":"Jaket Las Kulit","materialCode":"934.312.007","usagePeriod":"1 Tahun"},
  {"name":"Apron Las Kulit","materialCode":"934.308.137","usagePeriod":"1 Tahun"},
  {"name":"Apron Parasut","materialCode":"934.308.002","usagePeriod":"6 Bulan"},
  {"name":"Rompi Reflektor","materialCode":"934.312.004","usagePeriod":"1 Tahun"},
  {"name":"Life Jacket","materialCode":"934.312.013","usagePeriod":"1 Tahun"},
  {"name":"Belt Body Harness","materialCode":"934.305.001","usagePeriod":"1 Tahun"},
  {"name":"Safety Shoes Tinggi","materialCode":"934.306.010","usagePeriod":"1 Tahun"},
  {"name":"Safety Shoes Pendek","materialCode":"934.306.083","usagePeriod":"1 Tahun (Office)"},
  {"name":"Boot Karet","materialCode":"934.306.803","usagePeriod":"6 Bulan"},
  {"name":"Sarung Kapak","materialCode":"964.310.Z10","usagePeriod":"6 Bulan"},
  {"name":"Sarung Egrek","materialCode":"964.310.011","usagePeriod":"6 Bulan"},
  {"name":"Sarung Dodos","materialCode":"964.310.088","usagePeriod":"6 Bulan"},
  {"name":"Sarung Tojok","materialCode":"Bisa pakai potongan selang air","usagePeriod":"6 Bulan"},
  {"name":"Senter Kepala","materialCode":"947.361.004","usagePeriod":"6 Bulan"},
  {"name":"Pelampung kapal (Ring Buoy)","materialCode":"Cap 2,5 Kg : 949.100.015 / Cap 4,3 Kg : 949.100.023","usagePeriod":"1 Tahun"}
]

export const PPE_JOB_STANDARDS = [
  {"job":"Staff","workArea":["Kebun","Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Safety glass","Dust Mask","Safety Shoes Tinggi","Safety Shoes Pendek"]},
  {"job":"Pengawas/Krani Panen/petugas sensus","workArea":["Kebun"],"ppe":["Safety Helmet + chinstrap","Safety glass","Dust Mask","Kain","Boot Karet"]},
  {"job":"Potong Buah / Panen","workArea":["Kebun"],"ppe":["Safety Helmet + chinstrap","Safety glass","Kain","Boot Karet","Sarung Kapak","Sarung Egrek","Sarung Dodos"]},
  {"job":"Kutip Brondolan","workArea":["Kebun"],"ppe":["Topi/ Caping","Kain","Boot Karet"]},
  {"job":"Tunas","workArea":["Kebun"],"ppe":["Safety Helmet + chinstrap","Safety glass","Kain","Boot Karet","Sarung Egrek","Sarung Dodos"]},
  {"job":"Muat TBS","workArea":["Kebun"],"ppe":["Safety Helmet + chinstrap","Safety glass","Dust Mask","Kain","Boot Karet","Sarung Tojok","Senter Kepala"]},
  {"job":"Semprot","workArea":["Kebun"],"ppe":["Sebo Tutup Kepala","Face Shield","Respirator & Cartridge","Karet","Pakaian Kerja","Apron Parasut","Boot Karet"]},
  {"job":"Gudang Kimia","workArea":["Kebun"],"ppe":["Safety Helmet + chinstrap","Safety glass","Respirator & Cartridge","Karet","Pakaian Kerja","Apron Parasut","Safety Shoes Tinggi"]},
  {"job":"Pupuk / Until","workArea":["Kebun"],"ppe":["Sebo Tutup Kepala","Face Shield","Dust Mask","Kain","Pakaian Kerja","Apron Parasut","Boot Karet"]},
  {"job":"Grading TBS","workArea":["Kebun"],"ppe":["Safety Helmet + chinstrap","Safety glass","Dust Mask","Kain","Rompi Reflektor","Boot Karet"]},
  {"job":"Gudang pupuk / umum","workArea":["Kebun"],"ppe":["Safety Helmet + chinstrap","Safety glass","Dust Mask","Kain","Pakaian Kerja","Safety Shoes Tinggi"]},
  {"job":"Civil","workArea":["Kebun"],"ppe":["Safety Helmet + chinstrap","Safety glass","Dust Mask","Kain","Pakaian Kerja","Boot Karet"]},
  {"job":"Sopir","workArea":["Kebun","Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Safety glass","Dust Mask","Kain","Pakaian Kerja","Safety Shoes Tinggi"]},
  {"job":"Operator Alat Berat","workArea":["Kebun","Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Safety glass","Ear Plug","Dust Mask","Kain","Pakaian Kerja","Safety Shoes Tinggi"]},
  {"job":"Operator Genset","workArea":["Kebun","Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Safety glass","Ear Muff","Dust Mask","Kain","Pakaian Kerja","Safety Shoes Tinggi"]},
  {"job":"Perawatan perumahan","workArea":["Kebun","Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Safety glass","Dust Mask","Kain","Pakaian Kerja","Boot Karet"]},
  {"job":"Perawatan Umum","workArea":["Kebun","Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Safety glass","Dust Mask","Kain","Pakaian Kerja","Boot Karet"]},
  {"job":"Perawatan / Tukang Rumput","workArea":["Kebun","Pabrik Kelapa Sawit"],"ppe":["Sebo Tutup Kepala","Face Shield","Ear Plug","Dust Mask","Kain","Pakaian Kerja","Safety Shoes Tinggi"]},
  {"job":"Transportasi air","workArea":["Kebun"],"ppe":["Safety Helmet + chinstrap","Safety glass","Dust Mask","Kain","Life Jacket","Boot Karet","Senter Kepala","Pelampung kapal (Ring Buoy)"]},
  {"job":"Operator air /Operator lamdor (ponton RORO )","workArea":["Kebun","Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Safety glass","Ear Muff","Dust Mask","Kain","Kulit","Pakaian Kerja","Life Jacket","Safety Shoes Tinggi","Senter Kepala","Pelampung kapal (Ring Buoy)"]},
  {"job":"Pekerja panjat / di ketinggian","workArea":["Kebun"],"ppe":["Safety Helmet + chinstrap","Safety glass","Kain","Pakaian Kerja","Belt Body Harness","Safety Shoes Pendek"]},
  {"job":"Operator air","workArea":["Kebun","Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Safety glass","Dust Mask","Kain","Pakaian Kerja","Boot Karet","Senter Kepala","Pelampung kapal (Ring Buoy)"]},
  {"job":"Teknisi Listrik","workArea":["Kebun","Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Safety glass","Ear Plug","Dust Mask","Kain","Pakaian Kerja","Safety Shoes Pendek"]},
  {"job":"Mekanik","workArea":["Kebun","Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Safety glass","Ear Plug","Dust Mask","Kain","Pakaian Kerja","Safety Shoes Pendek"]},
  {"job":"Pasang Rantai","workArea":["Kebun","Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Kain","Kulit","Pakaian Kerja","Safety Shoes Tinggi"]},
  {"job":"Opr. St. Penerimaan","workArea":["Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Dust Mask","Kain","Rompi Reflektor","Safety Shoes Tinggi"]},
  {"job":"Opr. St. Rebusan","workArea":["Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Ear Plug","Kulit","Rompi Reflektor","Safety Shoes Tinggi"]},
  {"job":"Opr. St. Pemisahan Berondolan","workArea":["Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Ear Plug","Kulit","Rompi Reflektor","Safety Shoes Tinggi"]},
  {"job":"Opr. St. Pengadukan dan Pengempaan","workArea":["Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Ear Plug","Kulit","Rompi Reflektor","Safety Shoes Tinggi"]},
  {"job":"Opr. St. Pemurnian","workArea":["Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Ear Plug","Rompi Reflektor","Safety Shoes Tinggi"]},
  {"job":"Opr. St. Pemisahan Nut dan Fibre","workArea":["Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Ear Plug","Dust Mask","Rompi Reflektor","Safety Shoes Tinggi"]},
  {"job":"Opr. St. Kernel","workArea":["Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Ear Plug","Dust Mask","Rompi Reflektor","Safety Shoes Tinggi"]},
  {"job":"Opr. St. Boiler","workArea":["Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Face Shield","Ear Plug","Dust Mask","Kulit","Rompi Reflektor","Safety Shoes Tinggi"]},
  {"job":"Opr. St. Engine Room","workArea":["Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Ear Muff","Dust Mask","Rompi Reflektor","Safety Shoes Tinggi"]},
  {"job":"Opr. St. Water Treatment","workArea":["Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Safety glass","Ear Plug","Dust Mask","Karet","Rompi Reflektor","Safety Shoes Tinggi"]},
  {"job":"Petugas Laboratorium","workArea":["Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Safety glass","Ear Plug","Dust Mask","Karet","Kain","Safety Shoes Tinggi"]},
  {"job":"Petugas IPAL","workArea":["Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Dust Mask","Safety Shoes Tinggi"]},
  {"job":"Opr. St. Dispatch CPO / Kernel","workArea":["Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Dust Mask","Safety Shoes Tinggi"]},
  {"job":"Pekerja ruang terbatas","workArea":["Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Safety glass","Respirator & Cartridge","Dust Mask","Kain","Pakaian Kerja","Belt Body Harness","Safety Shoes Tinggi"]},
  {"job":"Karyawan Bengkel","workArea":["Kebun","Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Safety glass","Ear Plug","Dust Mask","Kain","Pakaian Kerja","Safety Shoes Tinggi"]},
  {"job":"Pengelasan (cutting and welding)","workArea":["Kebun","Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Sebo Tutup Kepala","Kedok Las","Safety glass","Ear Plug","Dust Mask","Kulit","Pakaian Kerja","Jaket Las Kulit","Apron Las Kulit","Safety Shoes Tinggi"]},
  {"job":"Kantor","workArea":["Kebun","Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Dust Mask","Safety Shoes Pendek"]},
  {"job":"Tamu / Pengunjung","workArea":["Kebun","Pabrik Kelapa Sawit"],"ppe":["Safety Helmet + chinstrap","Safety glass","Dust Mask","Kain","Safety Shoes Tinggi","Boot Karet"]}
]

export const PPE_FORM_REFERENCES = [
  {code:'KPNPLT-FORM-SST-003.01',name:'Matriks Standar Kebutuhan APD'},
  {code:'KPNPLT-FORM-SST-003.02',name:'Identifikasi Kebutuhan APD'},
  {code:'KPNPLT-FORM-SST-003.03',name:'Monitoring APD (kode berdasarkan nama file sumber)'},
  {code:'KPNPLT-FORM-SST-003.04',name:'Berita Acara Serah Terima APD'},
  {code:'KPNPLT-FORM-SST-003.07',name:'Monitoring PR APD'},
]

export function catalogItem(name){
  return PPE_CATALOG.find(item=>item.name===name)||{name,materialCode:'',usagePeriod:''}
}
export function standardForJob(job){
  return PPE_JOB_STANDARDS.find(item=>item.job===job)||null
}
