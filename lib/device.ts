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

export function parseDevice(body: unknown): ParsedDevice {
  const b = (body ?? {}) as {
    subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }
    zone?: unknown
  }
  const endpoint = b.subscription?.endpoint
  const p256dh = b.subscription?.keys?.p256dh
  const auth = b.subscription?.keys?.auth

  if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string') {
    return { ok: false, error: 'no subscription' }
  }
  if (!/^https:\/\//.test(endpoint)) return { ok: false, error: 'bad endpoint' }
  if (endpoint.length > 2000) return { ok: false, error: 'bad endpoint' }

  // An IANA name and nothing else. It is interpolated into a date format on
  // the server, and an unknown one falls back to UTC there, but a string of
  // any length has no business being stored.
  const raw = typeof b.zone === 'string' ? b.zone : ''
  const zone = /^[A-Za-z][A-Za-z0-9+_\-]*(\/[A-Za-z0-9+_\-]+){0,2}$/.test(raw) && raw.length <= 64 ? raw : 'UTC'

  return { ok: true, device: { endpoint, p256dh, auth, zone } }
}
