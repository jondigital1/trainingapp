'use client'

import { fmtDuration, intensityLabel } from '@/lib/session'
import { recordText, type Summary } from '@/lib/summary'
import { shareWorkout } from '@/lib/share'
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
  onClose,
}: {
  workout: Workout
  summary: Summary
  onClose: () => void
}) {
  const duration = fmtDuration(summary.duration)
  const feel = intensityLabel(summary.intensity)

  const stats: { label: string; value: string }[] = []
  if (duration) stats.push({ label: 'Time', value: duration })
  stats.push({ label: 'Sets', value: String(summary.sets) })
  if (summary.volume > 0) {
    stats.push({ label: 'Moved', value: `${Math.round(summary.volume).toLocaleString('en-US')} lb` })
  }
  if (summary.intensity != null) stats.push({ label: 'Felt like', value: `${summary.intensity} of 10` })

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
              <div key={s.label} className="rounded-2xl bg-ink px-3 py-2.5 ring-1 ring-edge">
                <dt className="text-[11px] uppercase tracking-wide text-muted">{s.label}</dt>
                <dd className="num mt-0.5 text-lg font-semibold">{s.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {feel && summary.intensity != null ? (
          <p className="mt-2 text-xs text-muted">{feel}</p>
        ) : null}

        {summary.records.length ? (
          <section className="mt-5">
            <h4 className="text-[11px] uppercase tracking-wide text-muted">
              {summary.records.length === 1 ? 'Record' : 'Records'}
            </h4>
            <ul className="mt-2 flex flex-col gap-1.5">
              {summary.records.map((record) => (
                <li key={record.name} className="rounded-2xl bg-ink px-3 py-2.5 ring-1 ring-accent-ink">
                  <p className="text-sm font-medium leading-snug">{record.name}</p>
                  <p className="mt-0.5 text-xs leading-snug text-accent-ink">{recordText(record)}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {summary.milestones.length ? (
          <ul className="mt-3 flex flex-col gap-1.5">
            {summary.milestones.map((m) => (
              <li key={m.label} className="rounded-2xl bg-ink px-3 py-2.5 text-sm ring-1 ring-edge">
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

        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl bg-accent py-3.5 text-base font-medium text-on-accent"
          >
            Nice one
          </button>
          <button
            onClick={() => void shareWorkout(workout)}
            className="rounded-2xl px-5 py-3.5 text-base text-muted ring-1 ring-edge"
          >
            Share
          </button>
        </div>
      </div>
    </Sheet>
  )
}
