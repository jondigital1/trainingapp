import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Training Log',
  description: 'Log every set, see the last session, know what to do next.',
  applicationName: 'Training Log',
  // Installed to a home screen this is the name under the icon and the title
  // bar of the standalone window.
  appleWebApp: { capable: true, title: 'Training Log', statusBarStyle: 'default' },
  icons: {
    icon: [
      { url: '/icons/192', sizes: '192x192', type: 'image/png' },
      { url: '/icons/512', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/180', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0c0e12' },
    { media: '(prefers-color-scheme: light)', color: '#f1f2f5' },
  ],
  width: 'device-width',
  initialScale: 1,
  // cover lets the page reach the bottom edge on a phone with a home
  // indicator; the safe area utilities in globals.css keep controls above it.
  viewportFit: 'cover',
  // Pinch zoom stays available on purpose. Locking it stops accidental zooms
  // mid set and stops anyone who needs to zoom, and the second cost is worse.
}

// Applies a hand-picked theme before first paint. System preference needs no
// script at all: the stylesheet handles it.
const themeInit = `try{var t=localStorage.getItem('training-log-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-ink text-bright antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {children}
      </body>
    </html>
  )
}
