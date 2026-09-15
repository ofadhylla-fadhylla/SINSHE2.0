import './globals.css'

export const metadata = {
  title: 'SHINSE 2.0 | KPN Plantations',
  description: 'Smart Integrated Network for Safety, Health & Environment — HSE dashboard for KPN Plantations.',
  generator: 'v0.app',
}

export const viewport = {
  themeColor: '#0c5a2b',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
