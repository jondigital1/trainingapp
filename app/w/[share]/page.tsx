import { notFound } from 'next/navigation'
import SharedWorkout from '@/components/SharedWorkout'
import { supabaseServer } from '@/lib/supabase/server'
import type { CustomWorkoutItem } from '@/lib/types'

// A workout somebody sent you. Readable signed out, because a link you have to
// make an account to even look at is a link nobody opens.
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function SharePage({ params }: { params: Promise<{ share: string }> }) {
  const { share } = await params
  // Postgres throws on a malformed uuid rather than returning nothing, so the
  // shape is checked here and a wrong-looking link is simply a missing page.
  if (!UUID.test(share)) notFound()

  const sb = await supabaseServer()
  const { data, error } = await sb.rpc('shared_workout', { share })
  const row = (data as { id: string; name: string; items: CustomWorkoutItem[] }[] | null)?.[0]
  if (error || !row) notFound()

  const {
    data: { user },
  } = await sb.auth.getUser()

  return (
    <SharedWorkout
      workout={{ id: row.id, name: row.name, items: row.items ?? [] }}
      signedIn={!!user}
    />
  )
}
