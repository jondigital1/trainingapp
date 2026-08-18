'use client'

import { useEffect } from 'react'

// Registers the worker that makes a cold open with no signal show your
// training log rather than the browser's error page. Nothing else depends on
// it, so a refusal is silent: the app works, it just cannot boot offline.
export default function ServiceWorker() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    const register = () => navigator.serviceWorker.register('/sw.js').catch(() => undefined)
    // After load rather than during, so the worker never competes with the app
    // it exists to make faster.
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])

  return null
}
