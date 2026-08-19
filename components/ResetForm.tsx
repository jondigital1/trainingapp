'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'

const MIN_PASSWORD = 8
const INPUT =
  'w-full rounded-xl bg-card px-4 py-3 text-base outline-none ring-1 ring-edge focus:ring-accent-ink'

export default function ResetForm({ email }: { email: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (password.length < MIN_PASSWORD) return setError(`At least ${MIN_PASSWORD} characters`)
    if (password !== again) return setError('Those two do not match')
    setBusy(true)
    setError('')
    const { error } = await supabaseBrowser().auth.updateUser({ password })
    setBusy(false)
    if (error) return setError(error.message)
    router.replace('/')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">New password</h1>
        {email ? <p className="mt-2 text-sm text-muted">For {email}</p> : null}

        <div className="mt-8 flex flex-col gap-3">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              aria-label="New password"
              className={`${INPUT} pr-16`}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted"
            >
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={again}
            onChange={(e) => setAgain(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save()
            }}
            placeholder="And again"
            aria-label="Repeat the new password"
            className={INPUT}
          />
          <button
            onClick={() => void save()}
            disabled={busy}
            className="rounded-xl bg-accent px-4 py-3 text-base font-medium text-on-accent disabled:opacity-50"
          >
            {busy ? 'Saving' : 'Save and carry on'}
          </button>
          {error ? <p className="text-sm text-accent-ink">{error}</p> : null}
        </div>
      </div>
    </main>
  )
}
