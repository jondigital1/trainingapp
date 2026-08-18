// Alerts that reach a phone locked in a pocket.
//
// The rest timer already buzzes, beeps and posts a notification, and all three
// need the page to be alive. A locked phone suspends the page entirely, so
// nothing running inside it can fire. The only way through is a message sent
// from outside the device, which is what this is: the browser hands us a push
// subscription, we hand it back to our own server along with how long to wait,
// and the server sends the alert when the rest is up whether the phone is
// awake or not.
//
// The subscription is never stored anywhere. It is handed over at the moment a
// set is logged and forgotten when the alert fires, so there is no table of
// endpoints to leak and nothing to clean up when somebody changes phone.

export const PUSH_KEY = 'training-log-push'

export type PushState = 'unsupported' | 'off' | 'on' | 'denied'

// Set at build time. Without it the whole feature is off, which is the right
// behaviour for a fork of this app that has not set up its own keys.
const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!PUBLIC_KEY &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// Whether the person asked for this. Kept locally rather than on the profile
// because it is a property of this phone, not of the account: alerts on the
// phone you train with, nothing on the laptop.
export function pushWanted(): boolean {
  try {
    return localStorage.getItem(PUSH_KEY) === 'on'
  } catch {
    return false
  }
}

export function pushState(): PushState {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return pushWanted() ? 'on' : 'off'
}

// Turning it on is the one moment a permission prompt is fair: they just asked
// for the thing the prompt is about.
export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'default') {
    try {
      await Notification.requestPermission()
    } catch {
      return 'denied'
    }
  }
  if (Notification.permission !== 'granted') return 'denied'
  const subscription = await subscribe()
  if (!subscription) return 'denied'
  try {
    localStorage.setItem(PUSH_KEY, 'on')
  } catch {
    // A browser refusing storage still has a live subscription this session.
  }
  return 'on'
}

export async function disablePush(): Promise<PushState> {
  try {
    localStorage.setItem(PUSH_KEY, 'off')
  } catch {
    // ignore
  }
  try {
    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    await existing?.unsubscribe()
  } catch {
    // Unsubscribing is tidiness. The flag above is what stops the alerts.
  }
  return 'off'
}

async function subscribe(): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    if (existing) return existing
    return await registration.pushManager.subscribe({
      // Required by every browser: a push may only result in something the
      // person can see. Silent pushes are not on offer and should not be.
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBytes(PUBLIC_KEY),
    })
  } catch {
    return null
  }
}

// One alert in flight at a time. Starting a new rest, or skipping the current
// one, aborts the request that is holding the old one open, and the server
// stops without sending. This is why the alert never arrives after you have
// already started the next set.
let inFlight: AbortController | null = null

export function cancelAlert() {
  inFlight?.abort()
  inFlight = null
}

export async function scheduleAlert(name: string, seconds: number): Promise<void> {
  cancelAlert()
  if (!pushSupported() || !pushWanted() || seconds <= 0) return

  const subscription = await subscribe()
  if (!subscription) return

  const controller = new AbortController()
  inFlight = controller
  try {
    await fetch('/api/rest-alert', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ subscription, seconds, name }),
    })
  } catch {
    // Aborted, offline, or the server said no. The on-device timer is still
    // running and is still the thing you are looking at.
  } finally {
    if (inFlight === controller) inFlight = null
  }
}

// The VAPID public key travels as base64url and has to reach the browser as
// bytes.
function urlBase64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=')
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i)
  return out
}
