'use client'

import { useState } from 'react'
import StatsPanel from './StatsPanel'
import RecordPanel from './RecordPanel'
import ProgressTab from './ProgressTab'
import type { BodyWeight, Workout } from '@/lib/types'
import type { Unit } from '@/lib/units'

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
  weights,
  goalWeight,
  unit,
  today,
  target,
  onLogWeight,
}: {
  workouts: Workout[]
  weights: BodyWeight[]
  goalWeight: number | undefined
  unit: Unit
  today: string
  target: number
  onLogWeight: (pounds: number) => void
}) {
  const [view, setView] = useState<View>('week')

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold tracking-tight">Records</h2>

      <div className="mb-4 flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            aria-current={view === v.id ? 'page' : undefined}
            className={`rounded-full px-3 py-2 text-sm ring-1 ${
              view === v.id ? 'bg-accent text-on-accent ring-accent' : 'bg-card text-muted ring-edge'
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
        <ProgressTab
          workouts={workouts}
          weights={weights}
          goalWeight={goalWeight}
          unit={unit}
          onLogWeight={onLogWeight}
        />
      ) : null}
    </section>
  )
}
