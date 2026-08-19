import webpush from 'web-push'

// The parts of the rest alert that are worth testing on their own: what a
// request has to look like to be accepted, how the wait is cancelled, and what
// actually goes on the wire. The route around them is authentication and
// plumbing.

// Leaves room under the function's time limit for the send itself. Rest tops
// out at two minutes, and a peak week plus a couple of taps on +30s does not
// get near this.
export const MAX_WAIT = 280

export interface Alert {
  endpoint: string
  p256dh: string
  auth: string
  seconds: number
  name: string | null
}

export type Parsed = { ok: true; alert: Alert } | { ok: false; error: string }

export function parseAlert(body: unknown): Parsed {
  const b = (body ?? {}) as {
    subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }
    seconds?: unknown
    name?: unknown
  }
  const endpoint = b.subscription?.endpoint
  const p256dh = b.subscription?.keys?.p256dh
  const auth = b.subscription?.keys?.auth

  if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string') {
    return { ok: false, error: 'no subscription' }
  }
  // Only a real push service, over TLS. This is the one field that says where
  // the server will make a request to, so it does not get to be anything else.
  if (!/^https:\/\//.test(endpoint)) return { ok: false, error: 'bad endpoint' }

  const seconds = Math.round(Number(b.seconds))
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > MAX_WAIT) {
    return { ok: false, error: 'bad wait' }
  }

  return {
    ok: true,
    alert: {
      endpoint,
      p256dh,
      auth,
      seconds,
      // Movement names come from the person's own library, but a name is still
      // going into a notification, so it is bounded.
      name: typeof b.name === 'string' && b.name.trim() ? b.name.trim().slice(0, 80) : null,
    },
  }
}

// Resolves true if the request was abandoned before the time was up. Skipping
// the rest, or starting the next one, aborts from the page, and that has to
// stop the send rather than only close the connection.
export function wait(ms: number, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(true)
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve(false)
    }, ms)
    function onAbort() {
      clearTimeout(timer)
      resolve(true)
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

export function pushConfigured(): boolean {
  return !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY
}

// The encryption and the signature are RFC 8291 and RFC 8292, and they are the
// one part of this app that is not hand written. The PDF writer was written by
// hand because a library would have had to come down the wire to a phone on
// gym wifi before anything could be shared. This runs on a server where
// nothing comes down the wire, and getting content encryption subtly wrong
// fails silently, which is the worst way for anything to fail.
function configure() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:nobody@example.com',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
}

export function alertBody(alert: Alert): string {
  return JSON.stringify({
    title: 'Rest is up',
    body: alert.name ? `Next set of ${alert.name}` : 'Next set',
    tag: 'training-log-rest',
  })
}

// The weekly nudge goes down the same pipe with a different tag, so a nudge
// can never replace a rest alert in the tray and a rest alert can never
// replace a nudge.
export function nudgeBody(title: string, body: string): string {
  return JSON.stringify({ title, body, tag: 'training-log-nudge' })
}

// Not urgent, and worth holding for a phone that is off. A day is the point at
// which it stops being this week's message.
const WEEKLY = { TTL: 86400, urgency: 'normal' as const }

export async function sendNudge(
  device: { endpoint: string; p256dh: string; auth: string },
  title: string,
  body: string,
): Promise<'sent' | 'gone'> {
  configure()
  try {
    await webpush.sendNotification(
      { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
      nudgeBody(title, body),
      WEEKLY,
    )
    return 'sent'
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode
    if (status === 404 || status === 410) return 'gone'
    throw e
  }
}

// No point delivering this in ten minutes. If it cannot go now it is already
// the wrong answer.
const OPTIONS = { TTL: 60, urgency: 'high' as const }

// Everything the send would put on the wire, built but not sent, so what
// actually goes out can be read rather than assumed.
export function alertRequest(alert: Alert) {
  configure()
  return webpush.generateRequestDetails(
    { endpoint: alert.endpoint, keys: { p256dh: alert.p256dh, auth: alert.auth } },
    alertBody(alert),
    OPTIONS,
  )
}

export async function sendRestAlert(alert: Alert): Promise<'sent' | 'gone'> {
  configure()
  try {
    await webpush.sendNotification(
      { endpoint: alert.endpoint, keys: { p256dh: alert.p256dh, auth: alert.auth } },
      alertBody(alert),
      OPTIONS,
    )
    return 'sent'
  } catch (e) {
    // A subscription the browser has replaced comes back 404 or 410. There is
    // nothing to clean up, because nothing was stored.
    const status = (e as { statusCode?: number }).statusCode
    if (status === 404 || status === 410) return 'gone'
    throw e
  }
}
