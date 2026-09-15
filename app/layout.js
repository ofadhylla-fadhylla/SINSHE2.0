import './globals.css'

export const metadata = {
  title: 'SHINSE 2.0 | KPN Plantations',
  description: 'Smart Integrated Network for Safety, Health & Environment',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
