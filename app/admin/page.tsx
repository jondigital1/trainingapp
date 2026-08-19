import { notFound } from 'next/navigation'
import AdminDashboard from '@/components/AdminDashboard'
import { adminConfigured } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin'
import { loadUsers } from '@/lib/adminData'
import { today } from '@/lib/format'
import { supabaseServer } from '@/lib/supabase/server'

// Not linked from anywhere and not discoverable. Anybody who is not on the
// allowlist gets the same 404 as a page that does not exist, because a 403
// tells them there is something here worth coming back for.
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const sb = await supabaseServer()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user || !isAdmin(user.email)) notFound()

  if (!adminConfigured()) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <h1 className="font-display text-xl font-bold">Admin is not configured</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Set <span className="num">SUPABASE_SERVICE_ROLE_KEY</span> in the environment and redeploy.
          It is the only key that can read the auth table, which is why it lives on the server and
          never in the browser.
        </p>
      </main>
    )
  }

  const users = await loadUsers()
  return <AdminDashboard users={users ?? []} today={today()} me={user.email ?? ''} />
}
