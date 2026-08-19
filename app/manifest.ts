import type { MetadataRoute } from 'next'

// What turns this from a page into something that lives on a home screen:
// standalone drops the address bar, and the icons let the install prompt fire.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lifty',
    short_name: 'Lifty',
    description: 'Log every set, see the last session, know what to do next.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0c0e12',
    theme_color: '#0c0e12',
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
