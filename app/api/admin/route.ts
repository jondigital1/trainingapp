import { NextResponse, type NextRequest } from 'next/server'
import { isAdmin } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { supabaseServer } from '@/lib/supabase/server'

// Everything the admin screen can do to somebody else's account.
//
// The guard runs on every request rather than once at the page, because a page
// check protects a view and this is an endpoint. Session first, then the
// allowlist, and a refusal is a 404 rather than a 403 so the route does not
// announce itself to anyone poking at it.

export const runtime = 'nodejs'

type Action = 'reset' | 'confirm' | 'ban' | 'unban' | 'delete'

export async function POST(request: NextRequest) {
  const sb = await supabaseServer()
  const { data, error } = await sb.auth.getUser()
  if (error || !data.user || !isAdmin(data.user.email)) {
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
  if (id === data.user.id && (action === 'delete' || action === 'ban')) {
    return NextResponse.json({ error: 'that is your own account' }, { status: 400 })
  }

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
        return NextResponse.json({ ok: 'Reset link sent' })
      }
      case 'confirm': {
        const { error: failed } = await admin.auth.admin.updateUserById(id, { email_confirm: true })
        if (failed) throw new Error(failed.message)
        return NextResponse.json({ ok: 'Email confirmed' })
      }
      case 'ban': {
        const { error: failed } = await admin.auth.admin.updateUserById(id, { ban_duration: '87600h' })
        if (failed) throw new Error(failed.message)
        return NextResponse.json({ ok: 'Signed out and blocked' })
      }
      case 'unban': {
        const { error: failed } = await admin.auth.admin.updateUserById(id, { ban_duration: 'none' })
        if (failed) throw new Error(failed.message)
        return NextResponse.json({ ok: 'Allowed back in' })
      }
      case 'delete': {
        // Every table cascades from auth.users, so this is the whole account:
        // sessions, sets, bodyweight, profile, the lot.
        const { error: failed } = await admin.auth.admin.deleteUser(id)
        if (failed) throw new Error(failed.message)
        return NextResponse.json({ ok: 'Account deleted' })
      }
      default:
        return NextResponse.json({ error: 'unknown action' }, { status: 400 })
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'that did not work' }, { status: 500 })
  }
}
