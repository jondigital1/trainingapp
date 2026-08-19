import { NextResponse, type NextRequest } from 'next/server'
import { pushConfigured, sendNudge } from '@/lib/alert'
import { dueNudges, forgetDevice, stampNudge } from '@/lib/nudgeData'

// The job that sends the weekly nudges.
//
// Called on a schedule rather than by anybody using the app, because the whole
// point is to reach somebody who is not using the app. Vercel signs its own
// cron requests with CRON_SECRET, and without that variable set this endpoint
// refuses everybody, which is the right behaviour for a fork that has not set
// one up.
//
// It asks who is overdue rather than who is due exactly now, so it does the
// right thing whether it runs every hour or once a day. Running it twice in a
// row is a no-op: the first run stamps everybody it sent to, and six days have
// to pass before that stamp clears.

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'no cron secret' }, { status: 501 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'not authorised' }, { status: 401 })
  }
  if (!pushConfigured()) return NextResponse.json({ error: 'push is not configured' }, { status: 501 })

  const now = new Date()
  const due = await dueNudges(now)

  let sent = 0
  let gone = 0
  for (const person of due) {
    // Every device they train with, because the phone in the gym and the phone
    // in the kitchen are often not the same one.
    for (const device of person.devices) {
      try {
        const result = await sendNudge(device, person.nudge.title, person.nudge.body)
        if (result === 'gone') {
          await forgetDevice(device.endpoint)
          gone += 1
        } else {
          sent += 1
        }
      } catch {
        // One phone's push service being down is not a reason to skip the rest
        // of the week's nudges. The stamp below still lands, so nobody gets
        // two of these because one send failed.
        gone += 0
      }
    }
    await stampNudge(person.userId, now, person.trained, person.misses)
  }

  return NextResponse.json({ due: due.length, sent, gone })
}
