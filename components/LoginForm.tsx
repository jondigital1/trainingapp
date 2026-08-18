'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'

// Password first, because a magic link is four steps and assumes the mail is
// on the phone you are standing in the gym with. The link is still here for
// anyone who wants it, and for getting back in when the password is gone.
type Mode = 'signin' | 'signup' | 'magic' | 'forgot'

const MIN_PASSWORD = 8

const INPUT =
  'w-full rounded-xl bg-card px-4 py-3 text-base outline-none ring-1 ring-edge focus:ring-accent'

export default function LoginForm({ expired }: { expired?: boolean }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState<'link' | 'confirm' | 'reset' | null>(null)

  function go(next: Mode) {
    setMode(next)
    setError('')
    setSent(null)
  }

  async function submit() {
    const address = email.trim()
    if (!address) return setError('Enter your email')
    if ((mode === 'signin' || mode === 'signup') && password.length < MIN_PASSWORD) {
      return setError(`Passwords here are at least ${MIN_PASSWORD} characters`)
    }

    setBusy(true)
    setError('')
    const sb = supabaseBrowser()
    const origin = window.location.origin

    try {
      if (mode === 'signin') {
        const { error } = await sb.auth.signInWithPassword({ email: address, password })
        if (error) throw error
        // The session is a cookie the server has to read, so the server
        // component decides where we land rather than the client guessing.
        router.replace('/')
        router.refresh()
        return
      }

      if (mode === 'signup') {
        const { data, error } = await sb.auth.signUp({
          email: address,
          password,
          options: { emailRedirectTo: `${origin}/auth/callback` },
        })
        if (error) throw error
        // With email confirmation on, signUp comes back with a user and no
        // session. With it off, the session is already live.
        if (data.session) {
          router.replace('/')
          router.refresh()
          return
        }
        setSent('confirm')
        return
      }

      if (mode === 'magic') {
        const { error } = await sb.auth.signInWithOtp({
          email: address,
          options: { emailRedirectTo: `${origin}/auth/callback` },
        })
        if (error) throw error
        setSent('link')
        return
      }

      const { error } = await sb.auth.resetPasswordForEmail(address, {
        redirectTo: `${origin}/auth/callback?next=/reset`,
      })
      if (error) throw error
      setSent('reset')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    const body =
      sent === 'confirm'
        ? 'Account created. Confirm it from the email we just sent, then sign in.'
        : sent === 'reset'
          ? 'If that address has an account, a reset link is on its way. Open it on this device.'
          : 'Link sent. Open it on this device.'
    return (
      <Shell>
        <p className="mt-8 rounded-xl bg-card p-4 text-sm leading-relaxed">
          {body} <span className="text-accent">{email.trim()}</span>
        </p>
        <button onClick={() => go('signin')} className="mt-4 text-sm text-muted underline">
          Back to sign in
        </button>
      </Shell>
    )
  }

  const wantsPassword = mode === 'signin' || mode === 'signup'
  const action =
    mode === 'signin'
      ? 'Sign in'
      : mode === 'signup'
        ? 'Create account'
        : mode === 'magic'
          ? 'Email me a link'
          : 'Send reset link'

  return (
    <Shell>
      {expired ? (
        <p className="mt-6 rounded-xl bg-card p-3 text-sm leading-relaxed ring-1 ring-edge">
          That link has expired or has already been used. Sign in, or send yourself a new one.
        </p>
      ) : null}

      <div className="mt-8 flex gap-1 rounded-xl bg-card p-1 ring-1 ring-edge">
        {(['signin', 'signup'] as const).map((m) => (
          <button
            key={m}
            onClick={() => go(m)}
            aria-pressed={mode === m || (m === 'signin' && (mode === 'magic' || mode === 'forgot'))}
            className={`flex-1 rounded-lg py-2.5 text-sm ${
              mode === m ? 'bg-accent font-medium text-on-accent' : 'text-muted'
            }`}
          >
            {m === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      {mode === 'forgot' ? (
        <p className="mt-4 text-sm text-muted">
          Give us the address on the account and we will send a link to set a new password.
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-3">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !wantsPassword) void submit()
          }}
          placeholder="you@example.com"
          aria-label="Email"
          className={INPUT}
        />

        {wantsPassword ? (
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submit()
              }}
              placeholder="Password"
              aria-label="Password"
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
        ) : null}

        {mode === 'signup' ? (
          <p className="text-xs text-muted">At least {MIN_PASSWORD} characters. Nothing else to remember.</p>
        ) : null}

        <button
          onClick={() => void submit()}
          disabled={busy}
          className="rounded-xl bg-accent px-4 py-3 text-base font-medium text-on-accent disabled:opacity-50"
        >
          {busy ? 'One moment' : action}
        </button>

        {error ? <p className="text-sm text-accent">{error}</p> : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
        {mode === 'signin' ? (
          <button onClick={() => go('forgot')} className="underline">
            Forgotten your password
          </button>
        ) : null}
        {mode !== 'magic' ? (
          <button onClick={() => go('magic')} className="underline">
            Email me a link instead
          </button>
        ) : (
          <button onClick={() => go('signin')} className="underline">
            Use a password instead
          </button>
        )}
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Training Log</h1>
        <p className="mt-2 text-sm text-muted">Log every set. See the last session. Know what to do next.</p>
        {children}
      </div>
    </main>
  )
}
