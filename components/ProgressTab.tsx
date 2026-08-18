'use client'

import { useMemo, useState } from 'react'
import { seriesFor, trackedNames } from '@/lib/progress'
import ProgressChart from './ProgressChart'
import BodyWeightCard from './BodyWeightCard'
import type { BodyWeight, Workout } from '@/lib/types'
import type { Unit } from '@/lib/units'

const SHOWN = 3

export default function ProgressTab({
  workouts,
  weights,
  goalWeight,
  unit,
  onLogWeight,
}: {
  workouts: Workout[]
  weights: BodyWeight[]
  goalWeight: number | undefined
  unit: Unit
  onLogWeight: (pounds: number) => void
}) {
  const [all, setAll] = useState(false)

  const series = useMemo(
    () => trackedNames(workouts).map((name) => seriesFor(workouts, name)).filter((s) => s !== null),
    [workouts],
  )

  const bodyCard = (
    <BodyWeightCard weights={weights} goalWeight={goalWeight} unit={unit} onLog={onLogWeight} />
  )

  if (!series.length) {
    return (
      <div className="flex flex-col gap-4">
        {bodyCard}
        <p className="rounded-2xl bg-card p-4 text-sm text-muted ring-1 ring-edge">
          Nothing to chart yet. A movement needs two sessions behind it before there is a line to draw.
        </p>
      </div>
    )
  }

  const visible = all ? series : series.slice(0, SHOWN)

  return (
    <div className="flex flex-col gap-4">
      {bodyCard}
      {visible.map((s) => (
        <ProgressChart key={s.name} series={s} />
      ))}

      {series.length > SHOWN ? (
        <button
          onClick={() => setAll((v) => !v)}
          className="rounded-xl bg-card py-3 text-sm text-muted ring-1 ring-edge"
        >
          {all ? 'Show the top three' : `Show all ${series.length} movements`}
        </button>
      ) : null}
    </div>
  )
}
