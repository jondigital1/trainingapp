'use client'

import { useEffect, useState } from 'react'
import { groupOf, lookupType } from '@/lib/exercises'
import { historyFor, seriesFor } from '@/lib/progress'
import { fmtDate } from '@/lib/format'
import { restFor } from '@/lib/rest'
import { fmtTime } from '@/lib/format'
import { SET_TYPES, type Goal, type Workout } from '@/lib/types'
import ProgressChart from './ProgressChart'
import Sheet from './Sheet'

/**
 * One movement, everything the app knows about it.
 *
 * There was nowhere in this app that was about a movement. Exercises existed
 * inside a picker and inside a session, and what you knew about one was
 * scattered: the chart lived on the progress tab, the history was buried in
 * sessions you had to scroll for, and anything you had worked out about how to
 * set the machine up lived in your head.
 *
 * The note is the reason this screen exists. A session note is the right home
 * for how a session went and the wrong home for "seat at 4, feet on the plate",
 * which is true every time you do this movement and is exactly the thing people
 * forget between one week and the next.
 */
export default function ExerciseSheet({
  name,
  workouts,
  goal,
  note,
  onNote,
  onClose,
}: {
  name: string
  workouts: Workout[]
  goal: Goal
  note: string
  onNote: (note: string) => void
  onClose: () => void
}) {
  // Local while typing, pushed up when they stop. Saving every keystroke would
  // be a write per letter.
  const [draft, setDraft] = useState(note)
  useEffect(() => setDraft(note), [note, name])
  useEffect(() => {
    if (draft === note) return
    const timer = setTimeout(() => onNote(draft), 600)
    return () => clearTimeout(timer)
  }, [draft, note, onNote])

  const type = lookupType(name) ?? 'W'
  const group = groupOf(name)
  const series = seriesFor(workouts, name)
  const history = historyFor(workouts, name)
  const rest = restFor(name, type, goal, 1)
  const typeLabel = SET_TYPES.find((t) => t.type === type)?.label

  return (
    <Sheet title={name} onClose={onClose}>
      <div className="pb-2">
        <p className="text-xs font-bold uppercase tracking-[1.5px] text-faint">
          {[group, typeLabel, rest ? `${fmtTime(rest)} rest` : null].filter(Boolean).join(' · ')}
        </p>

        <section className="mt-5">
          <h4 className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">Your note</h4>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Seat at 4, feet on the plate, elbows tucked."
            className="surface mt-2 w-full rounded-xl px-3 py-3 text-sm leading-relaxed text-bright ring-1 ring-edge outline-none focus:ring-accent-ink"
          />
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Kept against the movement, not the session, so it is here every time you come back to it.
          </p>
        </section>

        {/* No heading over the chart: the card already names the movement and
            the metric, and a heading saying Estimated max above a card saying
            Estimated max is the screen talking to itself. */}
        {series ? (
          <div className="mt-6">
            <ProgressChart series={series} />
          </div>
        ) : null}

        <section className="mt-6">
          <h4 className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">History</h4>
          {history.length ? (
            <ul className="mt-2 flex flex-col gap-1.5">
              {history.map((outing, i) => (
                <li key={`${outing.date}-${i}`} className="surface rounded-2xl px-3.5 py-3 ring-1 ring-edge">
                  <p className="text-xs font-bold text-faint">{fmtDate(outing.date)}</p>
                  <p className="num mt-1 text-sm leading-snug">{outing.sets.join('  ·  ')}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Nothing logged yet. Every set you do of this fills this in, and the note above is
              worth writing before the first one.
            </p>
          )}
        </section>
      </div>
    </Sheet>
  )
}
