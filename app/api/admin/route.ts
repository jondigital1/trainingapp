import { NextResponse, type NextRequest } from 'next/server'
import { resolveAdmin } from '@/lib/adminAuth'
import { loadAdminLog, loadAskedRows, loadGapRows, loadPulse, loadUsers, logAdminAction } from '@/lib/adminData'
import { failedSearches, gapReport } from '@/lib/gaps'
import { askedReport } from '@/lib/asked'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { weeklyTrend, wentQuiet } from '@/lib/admin'
import { supabaseServer } from '@/lib/supabase/server'

// Everything the admin screen can do to somebody else's account.
//
// The guard runs on every request rather than once at the page, because a page
// check protects a view and this is an endpoint. Session first, then the
// allowlist, and a refusal is a 404 rather than a 403 so the route does not
// announce itself to anyone poking at it.

export const runtime = 'nodejs'

type Action = 'reset' | 'confirm' | 'ban' | 'unban' | 'delete' | 'grant' | 'revoke'

// The list itself, so the profile screen can load it when the toggle flips
// rather than every profile visit paying for a read of the auth table.
export async function GET() {
  const sb = await supabaseServer()
  const { data } = await sb.auth.getUser()
  const me = data.user
  if (!me || !(await resolveAdmin(me.email, me.id)).admin) {
    return new NextResponse('Not found', { status: 404 })
  }
  try {
    const [users, gapRows, pulse, log, askedRows] = await Promise.all([
      loadUsers(),
      loadGapRows(),
      loadPulse(),
      loadAdminLog(),
      loadAskedRows(),
    ])
    const today = new Date().toISOString().slice(0, 10)
    return NextResponse.json({
      users: users ?? [],
      gaps: gapReport(gapRows),
      failedSearches: failedSearches(gapRows),
      asked: askedReport(askedRows),
      trend: weeklyTrend(pulse.dates, today),
      quiet: wentQuiet(users ?? [], today).map((u) => u.id),
      adoption: {
        shares: pulse.shares,
        customWorkouts: pulse.customWorkouts,
        notes: pulse.notes,
        nudgesOn: pulse.nudgesOn,
        devices: pulse.devices,
      },
      log,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'could not load' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const sb = await supabaseServer()
  const { data, error } = await sb.auth.getUser()
  const grant = data.user ? await resolveAdmin(data.user.email, data.user.id) : null
  if (error || !data.user || !grant?.admin) {
    return new NextResponse('Not found', { status: 404 })
  }

  const admin = supabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'admin is not configured' }, { status: 501 })

  let body: { action?: Action; id?: string; email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'unreadable body' }, { status: 400 })
  }

  const { action, id, email } = body
  if (!action || !id) return NextResponse.json({ error: 'nothing to do' }, { status: 400 })

  // Locking yourself out of your own admin screen is a mistake nobody recovers
  // from in a hurry, so the destructive actions refuse to point at you.
  if (id === data.user.id && (action === 'delete' || action === 'ban' || action === 'revoke')) {
    return NextResponse.json({ error: 'that is your own account' }, { status: 400 })
  }

  // Written before the action returns, whatever the action is, because a
  // trail with exceptions is not a trail. The email in the body is what the
  // screen believes; good enough for a log line read by the person who was
  // sitting at that screen.
  const stamp = () =>
    logAdminAction({ id: data.user!.id, email: data.user!.email ?? '' }, action, {
      id,
      email: email ?? '',
    })

  try {
    switch (action) {
      case 'reset': {
        if (!email) return NextResponse.json({ error: 'no email' }, { status: 400 })
        // Sent through the ordinary flow, not a generated link, so it goes out
        // over the real mail setup and lands on the real reset form.
        const origin = new URL(request.url).origin
        const { error: failed } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/auth/callback?next=/reset`,
        })
        if (failed) throw new Error(failed.message)
        await stamp()
        return NextResponse.json({ ok: 'Reset link sent' })
      }
      case 'confirm': {
        const { error: failed } = await admin.auth.admin.updateUserById(id, { email_confirm: true })
        if (failed) throw new Error(failed.message)
        await stamp()
        return NextResponse.json({ ok: 'Email confirmed' })
      }
      case 'ban': {
        const { error: failed } = await admin.auth.admin.updateUserById(id, { ban_duration: '87600h' })
        if (failed) throw new Error(failed.message)
        await stamp()
        return NextResponse.json({ ok: 'Signed out and blocked' })
      }
      case 'unban': {
        const { error: failed } = await admin.auth.admin.updateUserById(id, { ban_duration: 'none' })
        if (failed) throw new Error(failed.message)
        await stamp()
        return NextResponse.json({ ok: 'Allowed back in' })
      }
      case 'grant': {
        if (!email) return NextResponse.json({ error: 'no email' }, { status: 400 })
        // Admin is not a preference, it is being handed the keys to everybody
        // else's training and the ability to delete it, so it is recorded with
        // who granted it and when.
        const { error: failed } = await admin
          .from('admins')
          .upsert({ user_id: id, email, granted_by: data.user!.id })
        if (failed) throw new Error(failed.message)
        await stamp()
        return NextResponse.json({ ok: 'Made an admin' })
      }
      case 'revoke': {
        // A root admin came from the deploy, so the screen cannot take it away;
        // saying so beats a button that silently does nothing.
        if ((await resolveAdmin(email, id)).root) {
          return NextResponse.json(
            { error: 'that one is set in the environment, not here' },
            { status: 400 },
          )
        }
        const { error: failed } = await admin.from('admins').delete().eq('user_id', id)
        if (failed) throw new Error(failed.message)
        await stamp()
        return NextResponse.json({ ok: 'Admin removed' })
      }
      case 'delete': {
        // Every table cascades from auth.users, so this is the whole account:
        // sessions, sets, bodyweight, profile, the lot.
        const { error: failed } = await admin.auth.admin.deleteUser(id)
        if (failed) throw new Error(failed.message)
        await stamp()
        return NextResponse.json({ ok: 'Account deleted' })
      }
      default:
        return NextResponse.json({ error: 'unknown action' }, { status: 400 })
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'that did not work' }, { status: 500 })
  }
}
