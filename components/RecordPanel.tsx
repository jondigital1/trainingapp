'use client'

import { bestLifts, lifetime, longestStreak, weeklyStreak } from '@/lib/gamify'
import { fmtDate, today } from '@/lib/format'
import type { Workout } from '@/lib/types'
import { Field, Note } from './Form'

// What the log gives back when you stand still and look at it. Nothing here is
// a target and nothing here goes down, which is what makes it worth reading on
// a week that went badly.
export default function RecordPanel({ workouts, days }: { workouts: Workout[]; days: number }) {
  const totals = lifetime(workouts)
  const now = today()
  const current = weeklyStreak(workouts, now, days)
  const longest = longestStreak(workouts, days)
  const lifts = bestLifts(workouts)

  if (!totals.sessions) {
    return (
      <p className="rounded-2xl surface p-4 text-sm leading-relaxed text-muted ring-1 ring-edge">
        Nothing here yet. Log a session and this fills itself in: what you have lifted, how long you have
        kept it up, and the heaviest you have put on each movement.
      </p>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Sessions" value={totals.sessions.toLocaleString()} />
        <Stat label="Sets" value={totals.sets.toLocaleString()} />
        <Stat label="Reps" value={totals.reps.toLocaleString()} />
        <Stat label="Weight moved" value={`${Math.round(totals.volume).toLocaleString()} lb`} />
      </div>

      <Field label="Weeks in a row that met your plan">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="On now" value={String(current)} />
          <Stat label="Longest ever" value={String(longest)} />
        </div>
        {longest > current ? (
          <Note>{longest} weeks is the one to beat. It stays on the board whatever this month does.</Note>
        ) : null}
      </Field>

      {lifts.length ? (
        <Field label="Heaviest you have put up" hint="On the movements you train most.">
          <div className="flex flex-col gap-2">
            {lifts.map((l) => (
              <div
                key={l.name}
                className="flex items-baseline justify-between gap-3 rounded-xl surface px-3 py-2.5 ring-1 ring-edge"
              >
                <span className="min-w-0 flex-1 truncate text-sm">{l.name}</span>
                <span className="num shrink-0 text-sm">
                  {l.weight} x {l.reps}
                </span>
                <span className="num shrink-0 text-xs text-muted">{fmtDate(l.date)}</span>
              </div>
            ))}
          </div>
        </Field>
      ) : null}
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl surface px-3 py-2.5 ring-1 ring-edge">
      <p className="text-xs text-muted">{label}</p>
      <p className="num mt-0.5 text-lg leading-none">{value}</p>
    </div>
  )
}
