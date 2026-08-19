import { redirect } from 'next/navigation'
import LoginForm from '@/components/LoginForm'
import { supabaseServer } from '@/lib/supabase/server'
import { safeNext } from '@/lib/redirect'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string; mode?: string; next?: string }>
}) {
  const sb = await supabaseServer()
  const {
    data: { user },
  } = await sb.auth.getUser()
  const { expired, mode, next } = await searchParams
  if (user) redirect(safeNext(next))
  return (
    <LoginForm expired={expired === '1'} start={mode === 'signup' ? 'signup' : undefined} next={next} />
  )
}
