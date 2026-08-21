'use client'

import { useState } from 'react'
import BodyWeightCard from './BodyWeightCard'
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
  today,
  target,
  weights,
  goalWeight,
  unit,
  onLogWeight,
}: {
  workouts: Workout[]
  today: string
  target: number
  // Bodyweight came back here from the profile, where it was the one thing on
  // a page of facts and settings that was neither: a measurement that moves.
  //
  // This tab answers one question, how is it going, and weight is most of the
  // answer for most people. It also has to be next to the lifts to be read
  // properly: strength climbing while weight holds is a different story from
  // both climbing together, and you cannot tell them apart from two tabs.
  weights: BodyWeight[]
  goalWeight?: number
  unit: Unit
  onLogWeight: (pounds: number) => void
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

      {view === 'week' ? (
        <>
          <BodyWeightCard weights={weights} goalWeight={goalWeight} unit={unit} onLog={onLogWeight} />
          <div className="mt-4">
            <StatsPanel workouts={workouts} today={today} target={target} />
          </div>
        </>
      ) : null}

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
