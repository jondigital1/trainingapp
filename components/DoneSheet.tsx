'use client'

import { fmtDuration, intensityLabel } from '@/lib/session'
import { recordText, type Summary } from '@/lib/summary'
import { shareWorkout } from '@/lib/share'
import { dismissNudgeAsk, enableNudge, nudgeAskable } from '@/lib/push'
import { NUDGE_DAYS } from '@/lib/nudge'
import { useEffect, useState } from 'react'
import LiftyMark from './LiftyMark'
import type { Workout } from '@/lib/types'
import Sheet from './Sheet'

// The screen at the end of a session.
//
// Everything on it is something that happened. There is no confetti and no
// "great work", because praise that arrives whatever you did is not praise, it
// is wallpaper, and people stop seeing it. What it can say is what is true: the
// records, the round numbers crossed, the weeks strung together, and when none
// of that applies, that the work is done and written down, which is the honest
// thing to say about most sessions and is not nothing.
export default function DoneSheet({
  workout,
  summary,
  nudge,
  onClose,
}: {
  workout: Workout
  summary: Summary
  // What they said in the questionnaire. A day means they asked for the weekly
  // check in and the browser has still never been asked to allow it.
  nudge: { day: number | null; hour: number }
  onClose: () => void
}) {
  const duration = fmtDuration(summary.duration)
  const feel = intensityLabel(summary.intensity)

  // The one moment worth spending the permission prompt on. They have just
  // trained, they have just been told something true about it, and the prompt
  // is one shot: a no can never be taken back from inside the app. Read after
  // mount because permission and localStorage do not exist on the server.
  const [ask, setAsk] = useState(false)
  const [asking, setAsking] = useState(false)
  useEffect(() => setAsk(nudge.day !== null && nudgeAskable()), [nudge.day])

  async function allow() {
    setAsking(true)
    await enableNudge()
    setAsk(false)
    setAsking(false)
  }

  function never() {
    dismissNudgeAsk()
    setAsk(false)
  }

  // Sets and reps share a card and sit at opposite ends of it, because two
  // numbers this close together in meaning blur into one if they are only a
  // few pixels apart.
  const stats: { label: string; value: string; second?: { label: string; value: string } }[] = []
  if (duration) stats.push({ label: 'Workout duration', value: duration })
  stats.push({
    label: 'Sets',
    value: String(summary.sets),
    second: summary.reps > 0 ? { label: 'Reps', value: String(summary.reps) } : undefined,
  })
  if (summary.volume > 0) {
    stats.push({ label: 'Weight moved', value: `${Math.round(summary.volume).toLocaleString('en-US')} lb` })
  }
  if (summary.intensity != null) stats.push({ label: 'Intensity level', value: `${summary.intensity} of 10` })

  return (
    <Sheet title={workout.title} onClose={onClose}>
      <div className="pb-2">
        <h3 className="text-2xl font-semibold leading-tight tracking-tight text-accent-ink">
          {summary.headline}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{summary.line}</p>

        {stats.length ? (
          <dl className="mt-5 grid grid-cols-2 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="surface flex gap-7 rounded-2xl px-3.5 py-3 ring-1 ring-edge">
                <Half label={s.label} value={s.value} wide={!s.second} />
                {s.second ? <Half label={s.second.label} value={s.second.value} /> : null}
              </div>
            ))}
          </dl>
        ) : null}

        {feel && summary.intensity != null ? (
          <p className="mt-2 text-xs text-muted">{feel}</p>
        ) : null}

        {summary.records.length ? (
          <section className="mt-5">
            <h4 className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">
              {summary.records.length === 1 ? 'Record' : 'Records'}
            </h4>
            <ul className="mt-2 flex flex-col gap-1.5">
              {summary.records.map((record) => (
                <li key={record.name} className="surface rounded-2xl px-3.5 py-3 ring-[1.5px] ring-accent-ink">
                  <p className="text-sm font-bold leading-snug">{record.name}</p>
                  <p className="mt-0.5 text-xs leading-snug text-accent-ink">{recordText(record)}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {summary.milestones.length ? (
          <ul className="mt-3 flex flex-col gap-1.5">
            {summary.milestones.map((m) => (
              <li key={m.label} className="surface rounded-2xl px-3.5 py-3 text-sm font-bold ring-1 ring-edge">
                {m.label}
              </li>
            ))}
          </ul>
        ) : null}

        {/* Said here only when it is not already the headline, so the screen
            never tells you the same thing twice. */}
        {summary.streak >= 2 && !summary.headline.includes('weeks in a row') ? (
          <p className="mt-3 text-sm text-muted">
            <span className="num text-fg">{summary.streak} weeks</span> in a row hitting your target.
          </p>
        ) : null}

        {summary.beat > 0 && summary.records.length ? (
          <p className="mt-3 text-sm text-muted">
            And <span className="num text-fg">{summary.beat}</span>{' '}
            {summary.beat === 1 ? 'set was' : 'sets were'} up on the same{' '}
            {summary.beat === 1 ? 'set' : 'sets'} last time out.
          </p>
        ) : null}

        {ask ? (
          <section className="surface mt-5 rounded-2xl px-3.5 py-3 ring-[1.5px] ring-accent-ink">
            <p className="text-sm font-bold leading-snug">
              You asked me to check in on your {NUDGE_DAYS[nudge.day ?? 0].label}s.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Your phone has to allow it before I can reach you. One message a week, and nothing
              else.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => void allow()}
                disabled={asking}
                className="flex-1 rounded-xl bg-accent py-2.5 font-display text-sm font-bold text-on-accent disabled:opacity-45"
              >
                Allow it
              </button>
              <button onClick={never} className="rounded-xl px-4 py-2.5 text-sm font-extrabold text-muted">
                Not now
              </button>
            </div>
          </section>
        ) : null}

        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl bg-accent py-3.5 font-display text-base font-bold text-on-accent"
          >
            Nice one
          </button>
          <button
            onClick={() => void shareWorkout(workout)}
            className="rounded-2xl px-5 py-3.5 text-base font-extrabold text-muted ring-[1.5px] ring-edge"
          >
            Share
          </button>
        </div>
      </div>
    </Sheet>
  )
}

// Two lines of room for the label whether it needs them or not, so the values
// sit on the same lines rather than stepping down wherever a label wraps.
//
// A pair sits side by side with a fixed gap rather than pushed to both edges:
// far enough apart to read as two numbers, close enough to read as one card.
function Half({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'flex-1' : ''}>
      <dt className="flex min-h-[2.1em] items-start text-[10.5px] font-extrabold uppercase leading-tight tracking-[1.5px] text-faint">
        {label}
      </dt>
      <dd className="num mt-1 font-display text-xl font-bold">{value}</dd>
    </div>
  )
}
