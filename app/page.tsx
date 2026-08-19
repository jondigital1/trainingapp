import type { Metadata } from 'next'
import App from '@/components/App'
import Homepage from '@/components/Homepage'
import { resolveAdmin } from '@/lib/adminAuth'
import { supabaseServer } from '@/lib/supabase/server'

// One address, two things. Signed in you get the app; signed out you get the
// page that explains what it is. This used to bounce straight to the login
// form, which is a door with no building attached to it.
export async function generateMetadata(): Promise<Metadata> {
  const sb = await supabaseServer()
  const {
    data: { user },
  } = await sb.auth.getUser()
  return user ? {} : { title: 'LiftyBot · Your AI lifting coach' }
}

export default async function Page() {
  const sb = await supabaseServer()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return <Homepage />
  const { admin } = await resolveAdmin(user.email, user.id)
  return <App userId={user.id} email={user.email ?? ''} admin={admin} />
}
