import 'server-only'
import { createClient } from '@supabase/supabase-js'

// The service role client. It bypasses row level security completely, which is
// the only way to answer "who signed up" at all, and is also why it may never
// touch the browser.
//
// Three things keep that true. The import of `server-only` makes the build fail
// if any client component pulls this in. The key is read from a variable with
// no NEXT_PUBLIC_ prefix, so Next will not inline it into a bundle. And nothing
// here is exported except a factory, so there is no module-level client sitting
// around in a shared runtime.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
