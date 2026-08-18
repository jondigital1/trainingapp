import { redirect } from 'next/navigation'
import ResetForm from '@/components/ResetForm'
import { supabaseServer } from '@/lib/supabase/server'

// The reset link lands on /auth/callback, which trades the code for a session
// and forwards here. No session means the link was old or already used, and
// saying so beats a form that cannot work.
export default async function ResetPage() {
  const sb = await supabaseServer()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) redirect('/login?expired=1')
  return <ResetForm email={user.email ?? ''} />
}
