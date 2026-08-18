import { NextResponse, type NextRequest } from 'next/server'
import { parseAlert, pushConfigured, sendRestAlert, wait } from '@/lib/alert'
import { supabaseServer } from '@/lib/supabase/server'

// The push server, such as it is.
//
// A rest timer that has to reach a locked phone needs a message sent from
// somewhere other than the phone, because a locked phone has suspended the
// page that was counting. So the browser hands over its push subscription the
// moment a set is logged, this holds the request open for the length of the
// rest, and then sends one alert.
//
// Holding a request open is a strange looking way to run a timer, and it is
// deliberate. The alternatives are a cron job, which cannot be more precise
// than a minute and would turn a 45 second rest into anything from 45 to 105,
// or a queue service, which is a second account to sign up for and a second
// thing to go down. Rest is two minutes at the very top of the ladder, so the
// wait fits inside one invocation with room to spare, and one person resting
// is one invocation.
//
// Nothing is stored. The subscription arrives with the request, is used once,
// and goes when the function returns, so there is no table of endpoints to
// leak and nothing to clean up when somebody changes phone.

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  if (!pushConfigured()) {
    return NextResponse.json({ error: 'push is not configured' }, { status: 501 })
  }

  // Signed in only. The endpoint sends nothing an attacker could aim anywhere
  // useful, since a subscription only accepts messages signed with this app's
  // key, but an open endpoint that holds a connection for five minutes is a
  // free way to tie up the server and does not need to exist.
  const sb = await supabaseServer()
  const { data, error } = await sb.auth.getUser()
  if (error || !data.user) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'unreadable body' }, { status: 400 })
  }

  const parsed = parseAlert(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const cancelled = await wait(parsed.alert.seconds * 1000, request.signal)
  if (cancelled) return new NextResponse(null, { status: 204 })

  try {
    await sendRestAlert(parsed.alert)
  } catch {
    return NextResponse.json({ error: 'could not send' }, { status: 502 })
  }
  return new NextResponse(null, { status: 204 })
}
