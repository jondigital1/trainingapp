import 'server-only'
import { isRootAdmin } from './admin'
import { supabaseAdmin } from './supabase/admin'

// Two ways to be an admin, and they are not equal.
//
// Named in ADMIN_EMAILS is the root: it lives in the deploy, cannot be granted
// or revoked from inside the app, and is what gets you back in when the table
// is empty or the database is having a bad day.
//
// A row in public.admins is granted, by a root or by another admin, from the
// screen. It can be taken away the same way.
export interface Grant {
  admin: boolean
  root: boolean
}

export async function resolveAdmin(
  email: string | null | undefined,
  id: string | null | undefined,
): Promise<Grant> {
  if (isRootAdmin(email)) return { admin: true, root: true }
  if (!id) return { admin: false, root: false }
  const sb = supabaseAdmin()
  if (!sb) return { admin: false, root: false }
  const { data } = await sb.from('admins').select('user_id').eq('user_id', id).maybeSingle()
  return { admin: !!data, root: false }
}

export async function grantedAdminIds(): Promise<Set<string>> {
  const sb = supabaseAdmin()
  if (!sb) return new Set()
  const { data } = await sb.from('admins').select('user_id')
  return new Set((data ?? []).map((r) => r.user_id as string))
}
