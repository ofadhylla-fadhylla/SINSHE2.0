export const roles = ['Admin','Manager','Editor','Contributor','Viewer']

export const roleMeta = {
  Admin: { label:'Admin', description:'Akses penuh ke seluruh modul, user, role dan konfigurasi.', tone:'red' },
  Manager: { label:'Manager', description:'Akses dashboard lintas unit, approval dan monitoring tindakan.', tone:'purple' },
  Editor: { label:'Editor', description:'Kelola data operasional dan tindak lanjut pada modul HSE.', tone:'blue' },
  Contributor: { label:'Contributor', description:'Input laporan, inspeksi, observasi dan permit sesuai unit.', tone:'green' },
  Viewer: { label:'Viewer', description:'Akses baca dashboard dan laporan tanpa perubahan data.', tone:'orange' },
}

export const moduleAccess = {
  '/': ['Admin','Manager','Editor','Contributor','Viewer'],
  '/ecosystem': ['Admin','Manager','Editor','Contributor','Viewer'],
  '/kpi': ['Admin','Manager','Editor','Contributor','Viewer'],
  '/safety-briefing': ['Admin','Manager','Editor','Contributor','Viewer'],
  '/learning-competency': ['Admin','Manager','Editor','Contributor','Viewer'],
  '/hazard-risk': ['Admin','Manager','Editor','Contributor','Viewer'],
  '/digital-jsa': ['Admin','Manager','Editor','Contributor','Viewer'],
  '/inspection': ['Admin','Manager','Editor','Contributor','Viewer'],
  '/corrective-action': ['Admin','Manager','Editor','Contributor','Viewer'],
  '/incident': ['Admin','Manager','Editor','Contributor','Viewer'],
  '/permit-to-work': ['Admin','Manager','Editor','Contributor','Viewer'],
  '/asset-integrity': ['Admin','Manager','Editor','Viewer'],
  '/regulatory-compliance': ['Admin','Manager','Editor','Viewer'],
  '/ai-recommendation': ['Admin','Manager','Editor','Viewer'],
  '/mobile-platform': ['Admin','Manager','Editor','Contributor','Viewer'],
  '/mobile': ['Admin','Manager','Editor','Contributor','Viewer'],
  '/company-master': ['Admin','Manager'],
  '/administration': ['Admin'],
}

export function canAccess(role, href) {
  return (moduleAccess[href] || roles).includes(role)
}

export function getSessionRole() {
  if (typeof window === 'undefined') return 'Admin'
  const saved = window.localStorage.getItem('sinshe-session-role')
  return roles.includes(saved) ? saved : 'Admin'
}

export function setSessionRole(role) {
  if (typeof window === 'undefined' || !roles.includes(role)) return
  window.localStorage.setItem('sinshe-session-role', role)
  window.dispatchEvent(new CustomEvent('sinshe-role-change', { detail: { role } }))
}
