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
// The rest alert stores nothing. Its subscription is handed over at the moment
// a set is logged and forgotten when the alert fires, so there is no table of
// endpoints behind it and nothing to clean up when somebody changes phone.
//
// The weekly nudge cannot work that way. A message sent on a Friday evening to
// somebody who has not opened the app since Tuesday has nowhere to be sent
// from unless the endpoint is on disk. So turning the nudge on writes this
// phone down, and turning it off deletes it. That is the whole of the
// difference, and it is why the two live behind two separate switches rather
// than one.

export const PUSH_KEY = 'training-log-push'
// Somebody who said not now on the finish screen is not asked again on this
// phone. The switch in settings is still there, and that is the difference
// between an offer and a nag.
export const ASK_KEY = 'training-log-push-asked'

export type PushState = 'unsupported' | 'off' | 'on' | 'denied' | 'unregistered'

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

// Permission and a live subscription, and nothing else. Two features want
// this and only one of them is the rest alert, so it deliberately does not
// touch the flag that says the rest alert is wanted: switching the weekly
// nudge on must not quietly start buzzing somebody between sets.
async function ready(): Promise<'on' | 'denied' | 'unsupported'> {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'default') {
    try {
      await Notification.requestPermission()
    } catch {
      return 'denied'
    }
  }
  if (Notification.permission !== 'granted') return 'denied'
  return (await subscribe()) ? 'on' : 'denied'
}

// Turning it on is the one moment a permission prompt is fair: they just asked
// for the thing the prompt is about.
export async function enablePush(): Promise<PushState> {
  const state = await ready()
  if (state !== 'on') return state
  try {
    localStorage.setItem(PUSH_KEY, 'on')
  } catch {
    // A browser refusing storage still has a live subscription this session.
  }
  return 'on'
}

// Only the rest alert. The subscription itself stays, because the weekly nudge
// may still be on and unsubscribing here would take it down with it. The flag
// is what stops the alerts, and it always did; unsubscribing was only ever
// tidiness.
export async function disablePush(): Promise<PushState> {
  try {
    localStorage.setItem(PUSH_KEY, 'off')
  } catch {
    // ignore
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

// The nudge, which is a different promise from the rest alert and so a
// different switch: it needs the same permission, and it also needs this phone
// written down on the server.
export async function enableNudge(): Promise<PushState> {
  const state = await ready()
  if (state !== 'on') return state
  const subscription = await subscribe()
  if (!subscription) return 'denied'
  // The registration is the feature. Without a row on the server there is
  // nowhere to send a Friday evening message from, so a failure here is
  // reported rather than swallowed: a switch that says on over a feature that
  // can never fire is the worst of both, and it is how this one went a month
  // without ever delivering anything.
  try {
    const res = await fetch('/api/device', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subscription, zone: zoneOf() }),
    })
    if (!res.ok) return 'unregistered'
  } catch {
    return 'unregistered'
  }
  return 'on'
}

// Forgetting the phone is the point, so this runs even when there is no
// subscription left to read: without an endpoint the server drops every device
// on the account, because off has to mean off.
export async function forgetNudge(): Promise<void> {
  let endpoint: string | null = null
  try {
    const registration = await navigator.serviceWorker.ready
    endpoint = (await registration.pushManager.getSubscription())?.endpoint ?? null
  } catch {
    // No worker, no endpoint, and the request below takes the lot.
  }
  try {
    await fetch('/api/device', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    })
  } catch {
    // Offline. The day is already null on the server side of the next save,
    // and a nudge is only ever sent to somebody with a day set.
  }
}

// An IANA name, so the evening stays the evening through a clock change.
export function zoneOf(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

// Whether the finish screen should offer to turn the nudge on.
//
// The permission prompt is one shot: a browser that has been told no cannot be
// asked again from inside the app, only from its own settings, which nobody
// opens. So it is spent at the best moment there is rather than the earliest,
// and 'default' is the whole test: it means the question has never been put to
// this browser and is still ours to ask.
//
// There is only one prompt for the whole site, not one per feature. Granting
// it here is what makes the rest alert switch work later without a second
// dialog, which is why the questionnaire never spends it.
export function nudgeAskable(): boolean {
  if (!pushSupported()) return false
  if (Notification.permission !== 'default') return false
  try {
    return localStorage.getItem(ASK_KEY) !== 'no'
  } catch {
    return true
  }
}

export function dismissNudgeAsk() {
  try {
    localStorage.setItem(ASK_KEY, 'no')
  } catch {
    // No storage means it may be offered again next time, which is a smaller
    // failure than never offering it at all.
  }
}
