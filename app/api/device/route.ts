import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { parseDevice } from '@/lib/device'

// Where a phone puts its push subscription so the weekly nudge can find it
// later.
//
// The rest alert deliberately stores nothing: it is sent seconds after the
// phone hands the subscription over, inside the same request. A message sent
// on a Friday evening to somebody who has not opened the app since Tuesday
// cannot work that way, so the endpoint is written down. It is written down
// only when somebody turns the nudge on, and deleting it is the same one tap.
//
// Written under the person's own session rather than with the service role, so
// row level security is what guarantees a row can only ever belong to whoever
// created it.

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const sb = await supabaseServer()
  const { data, error } = await sb.auth.getUser()
  if (error || !data.user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'unreadable body' }, { status: 400 })
  }

  const parsed = parseDevice(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { error: wrote } = await sb.from('push_devices').upsert(
    {
      endpoint: parsed.device.endpoint,
      user_id: data.user.id,
      p256dh: parsed.device.p256dh,
      auth: parsed.device.auth,
      zone: parsed.device.zone,
      seen_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  )
  if (wrote) return NextResponse.json({ error: 'could not save' }, { status: 502 })
  return new NextResponse(null, { status: 204 })
}

export async function DELETE(request: NextRequest) {
  const sb = await supabaseServer()
  const { data, error } = await sb.auth.getUser()
  if (error || !data.user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const endpoint = (body as { endpoint?: unknown }).endpoint
  // No endpoint means this phone could not tell us which one it was, so every
  // device on the account goes. Turning the nudge off has to mean off.
  const query = sb.from('push_devices').delete().eq('user_id', data.user.id)
  if (typeof endpoint === 'string' && endpoint) await query.eq('endpoint', endpoint)
  else await query
  return new NextResponse(null, { status: 204 })
}
