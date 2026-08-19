import { redirect } from 'next/navigation'
import LoginForm from '@/components/LoginForm'
import { supabaseServer } from '@/lib/supabase/server'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string; mode?: string }>
}) {
  const sb = await supabaseServer()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (user) redirect('/')
  const { expired, mode } = await searchParams
  return <LoginForm expired={expired === '1'} start={mode === 'signup' ? 'signup' : undefined} />
}
