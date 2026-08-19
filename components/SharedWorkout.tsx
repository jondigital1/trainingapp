'use client'

import { useState } from 'react'
import Link from 'next/link'
import { estimateSeconds, fmtEstimate } from '@/lib/estimate'
import { groupOf } from '@/lib/exercises'
import { supabaseBrowser } from '@/lib/supabase/client'
import { saveCustomWorkout } from '@/lib/db'
import { uid } from '@/lib/format'
import LiftyMark from './LiftyMark'
import type { SharedWorkout as Shared } from '@/lib/types'

// The other end of a share link.
//
// It shows the session and one button. Signed in, that button copies it into
// your own workouts, where it is yours: editing it afterwards changes nothing
// for the person who sent it, and them editing theirs changes nothing here.
// Signed out, the same button is the reason to make an account.
export default function SharedWorkout({ workout, signedIn }: { workout: Shared; signedIn: boolean }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Supersets are contiguous runs sharing a tag, the same as everywhere else.
  const runs: { tag: string | null; names: string[] }[] = []
  for (const item of workout.items) {
    const last = runs[runs.length - 1]
    if (last && item.superset && last.tag === item.superset) last.names.push(item.name)
    else runs.push({ tag: item.superset ?? null, names: [item.name] })
  }

  const estimate = fmtEstimate(estimateSeconds(workout.items, 'muscle'))

  async function save() {
    setSaving(true)
    setError('')
    try {
      const sb = supabaseBrowser()
      const {
        data: { user },
      } = await sb.auth.getUser()
      if (!user) throw new Error('Sign in first')
      await saveCustomWorkout(sb, user.id, {
        id: uid(),
        name: workout.name,
        items: workout.items,
      })
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-8">
      <div className="flex items-center gap-2.5">
        <LiftyMark size={30} />
        <span className="font-display text-xl font-bold tracking-tight">LiftyBot</span>
      </div>

      <p className="mt-6 text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">
        Somebody sent you a workout
      </p>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">{workout.name}</h1>
      <p className="num mt-1 text-sm font-bold text-faint">
        {workout.items.length} movement{workout.items.length === 1 ? '' : 's'}
        {estimate ? ` · ${estimate}` : ''}
      </p>

      <ol className="mt-5 flex flex-col gap-2">
        {runs.map((run, i) => (
          <li
            key={i}
            className={
              run.names.length > 1
                ? 'rounded-[18px] bg-tint-cool p-2 ring-[1.5px] ring-accent-ink'
                : ''
            }
          >
            {run.names.length > 1 ? (
              <p className="px-2 pb-1.5 pt-0.5 text-[10.5px] font-extrabold uppercase tracking-[1.2px] text-accent-ink">
                Superset · straight through
              </p>
            ) : null}
            <div className="flex flex-col gap-2">
              {run.names.map((name) => (
                <div key={name} className="rounded-[14px] bg-card px-3.5 py-3 ring-1 ring-edge">
                  <p className="text-sm font-bold leading-snug">{name}</p>
                  <p className="mt-0.5 text-xs text-faint">{groupOf(name) ?? 'Your own movement'}</p>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>

      {saved ? (
        <div className="mt-7">
          <p className="text-sm font-bold text-accent-ink">Saved to your workouts.</p>
          <Link
            href="/"
            className="mt-3 block rounded-2xl bg-accent py-3.5 text-center font-display text-base font-bold text-on-accent"
          >
            Open LiftyBot
          </Link>
        </div>
      ) : signedIn ? (
        <>
          <button
            onClick={() => void save()}
            disabled={saving}
            className="mt-7 rounded-2xl bg-accent py-3.5 font-display text-base font-bold text-on-accent disabled:opacity-45"
          >
            {saving ? 'Saving' : 'Save to my workouts'}
          </button>
          {error ? <p className="mt-2 text-sm font-bold text-alert">{error}</p> : null}
        </>
      ) : (
        <>
          <Link
            href="/login?mode=signup"
            className="mt-7 rounded-2xl bg-accent py-3.5 text-center font-display text-base font-bold text-on-accent"
          >
            Create an account to save it
          </Link>
          <Link href="/login" className="mt-3 text-center text-sm font-extrabold text-teal">
            Already have one? Sign in
          </Link>
        </>
      )}

      <p className="mt-8 text-xs leading-relaxed text-muted">
        A copy lands in your workouts and is yours from then on. Nothing either of you has logged is
        in this link, only the movements.
      </p>
    </main>
  )
}
