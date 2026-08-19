'use client'

import { useState } from 'react'
import StatsPanel from './StatsPanel'
import RecordPanel from './RecordPanel'
import ProgressTab from './ProgressTab'
import type { Workout } from '@/lib/types'

// Everything that answers "how am I doing", in one place. Three questions,
// three views, and they are worth having together: this week, all time, and
// the lines over time.
const VIEWS = [
  { id: 'week', label: 'This week' },
  { id: 'record', label: 'All time' },
  { id: 'charts', label: 'Charts' },
] as const

type View = (typeof VIEWS)[number]['id']

export default function RecordsTab({
  workouts,
  today,
  target,
}: {
  workouts: Workout[]
  today: string
  target: number
}) {
  const [view, setView] = useState<View>('week')

  return (
    <section>
      <div className="mb-4 flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            aria-current={view === v.id ? 'page' : undefined}
            className={`rounded-full px-3 py-2 text-sm ring-1 ${
              view === v.id ? 'bg-midnight text-frost ring-midnight' : 'surface text-muted ring-edge'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'week' ? <StatsPanel workouts={workouts} today={today} target={target} /> : null}

      {view === 'record' ? (
        <div className="frame-page">
          <RecordPanel workouts={workouts} days={target} />
        </div>
      ) : null}

      {view === 'charts' ? (
        <ProgressTab workouts={workouts} />
      ) : null}
    </section>
  )
}
