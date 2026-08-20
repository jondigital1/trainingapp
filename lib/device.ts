// What a phone has to say to be written down.
//
// Same shape as the rest alert's subscription, plus the timezone, and checked
// the same way: this is the one field that says where a server will later make
// a request to, so it does not get to be anything but a push service over TLS.

export interface Device {
  endpoint: string
  p256dh: string
  auth: string
  zone: string
}

export type ParsedDevice = { ok: true; device: Device } | { ok: false; error: string }

// The web push subscription itself, checked the same way wherever it arrives.
// This was written out twice, once here and once in the rest alert, and the
// copies had already come apart: only one of them capped the length of the
// endpoint, and the endpoint is the single field that decides where the server
// will make a request to.
export type Subscription = { endpoint: string; p256dh: string; auth: string }

export function parseSubscription(body: unknown): { ok: true; sub: Subscription } | { ok: false; error: string } {
  const b = (body ?? {}) as {
    subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }
  }
  const endpoint = b.subscription?.endpoint
  const p256dh = b.subscription?.keys?.p256dh
  const auth = b.subscription?.keys?.auth

  if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string') {
    return { ok: false, error: 'no subscription' }
  }
  // Only a real push service, over TLS, and no longer than a real one is.
  if (!/^https:\/\//.test(endpoint)) return { ok: false, error: 'bad endpoint' }
  if (endpoint.length > 2000) return { ok: false, error: 'bad endpoint' }
  return { ok: true, sub: { endpoint, p256dh, auth } }
}

export function parseDevice(body: unknown): ParsedDevice {
  const b = (body ?? {}) as { zone?: unknown }
  const parsed = parseSubscription(body)
  if (!parsed.ok) return { ok: false, error: parsed.error }

  // An IANA name and nothing else. It is interpolated into a date format on
  // the server, and an unknown one falls back to UTC there, but a string of
  // any length has no business being stored.
  const raw = typeof b.zone === 'string' ? b.zone : ''
  const zone = /^[A-Za-z][A-Za-z0-9+_\-]*(\/[A-Za-z0-9+_\-]+){0,2}$/.test(raw) && raw.length <= 64 ? raw : 'UTC'

  return { ok: true, device: { ...parsed.sub, zone } }
}
