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
  // Light unless the app itself is in dark, which the browser cannot know, so
  // the light value is the honest default for the chrome around the page.
  themeColor: '#f1f2f5',
  width: 'device-width',
  initialScale: 1,
  // cover lets the page reach the bottom edge on a phone with a home
  // indicator; the safe area utilities in globals.css keep controls above it.
  viewportFit: 'cover',
  // Pinch zoom stays available on purpose. Locking it stops accidental zooms
  // mid set and stops anyone who needs to zoom, and the second cost is worse.
}

// Applies the theme before first paint. Light is the default, so an unset
// choice needs no attribute at all and the stylesheet is already right; only
// dark and system have to be stamped on, and system is what lets the media
// query follow the device.
const themeInit = `try{var t=localStorage.getItem('training-log-theme');if(t==='dark'||t==='system')document.documentElement.dataset.theme=t}catch(e){}`

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
