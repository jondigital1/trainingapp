'use client'

import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'

const MIN_PASSWORD = 8

// Changing your password without being locked out first.
//
// Until now the only way to set one was the recovery email, which is a strange
// thing to need when you are already signed in and know the old one. Worse, a
// recovery link sent from anywhere other than the app's own forgotten-password
// button lands on the app rather than on a form, so the one path that existed
// could fail silently.
//
// Folded away behind a single line, because it is a thing people do roughly
// never and it should not sit open taking up the screen.
export default function PasswordChange() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function save() {
    if (password.length < MIN_PASSWORD) return setError(`At least ${MIN_PASSWORD} characters`)
    if (password !== again) return setError('Those two do not match')
    setBusy(true)
    setError('')
    const { error: failed } = await supabaseBrowser().auth.updateUser({ password })
    setBusy(false)
    if (failed) return setError(failed.message)
    // The session survives a password change, so there is nothing to do here
    // but say so and get out of the way.
    setPassword('')
    setAgain('')
    setOpen(false)
    setDone(true)
  }

  if (!open) {
    return (
      <>
        <button
          onClick={() => {
            setDone(false)
            setOpen(true)
          }}
          className="mt-2 w-full rounded-xl bg-ink py-3 text-sm ring-1 ring-edge"
        >
          Change password
        </button>
        {done ? <p className="mt-2 text-xs text-accent-ink">Password changed</p> : null}
      </>
    )
  }

  const input =
    'w-full rounded-xl bg-ink px-4 py-3 text-base outline-none ring-1 ring-edge focus:ring-accent-ink'

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          aria-label="New password"
          className={`${input} pr-16`}
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
        placeholder="Again"
        aria-label="New password again"
        className={input}
      />
      {error ? <p className="text-xs text-accent-ink">{error}</p> : null}
      <div className="flex gap-2">
        <button
          onClick={() => void save()}
          disabled={busy}
          className="flex-1 rounded-xl bg-accent py-3 text-sm font-medium text-on-accent disabled:opacity-40"
        >
          {busy ? 'Saving' : 'Save password'}
        </button>
        <button
          onClick={() => {
            setOpen(false)
            setPassword('')
            setAgain('')
            setError('')
          }}
          className="rounded-xl px-4 py-3 text-sm text-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
