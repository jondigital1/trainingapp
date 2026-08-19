'use client'

import {
  COVERAGE_TARGET, LADDERS, lifetime, nextLandmark, trainingGrid, weeklyCoverage, weeklyStreak,
} from '@/lib/gamify'
import { fmtTime } from '@/lib/format'
import type { Workout } from '@/lib/types'

function Landmark({
  label,
  value,
  ladder,
  suffix = '',
}: {
  label: string
  value: number
  ladder: number[]
  suffix?: string
}) {
  const { next, pct } = nextLandmark(value, ladder)
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-bold text-muted">{label}</span>
        <span className="num font-display text-lg font-bold">
          {Math.round(value).toLocaleString()}
          {suffix}
        </span>
      </div>
      <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-track">
        <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </span>
      {next != null ? (
        <p className="mt-1 text-right text-xs text-muted num">next at {next.toLocaleString()}{suffix}</p>
      ) : null}
    </div>
  )
}

export default function StatsPanel({
  workouts,
  today,
  target,
}: {
  workouts: Workout[]
  today: string
  target: number
}) {
  const coverage = weeklyCoverage(workouts, today)
  const grid = trainingGrid(workouts, today)
  const streak = weeklyStreak(workouts, today, target)
  const month = grid.filter((d) => d.trained).length
  const totals = lifetime(workouts)

  return (
    <div className="mb-4 flex flex-col gap-4">
      <div className="rounded-2xl bg-card p-4 ring-1 ring-edge">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">Last 28 days</h2>
          <span className="text-xs text-muted num">{month} sessions</span>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {grid.map((day) => (
            <span
              key={day.date}
              title={day.date}
              className={`aspect-square rounded-[5px] ${day.trained ? 'bg-accent' : 'bg-track'}`}
            />
          ))}
        </div>

        <p className="mt-3 text-sm">
          {streak > 0 ? (
            <>
              <span className="num text-accent-ink">{streak}</span>
              <span className="text-muted">
                {' '}
                {streak === 1 ? 'week' : 'weeks'} running at {target} days or better
              </span>
            </>
          ) : (
            <span className="text-muted">
              Hit {target} days this week and the count starts. Rest days cost nothing.
            </span>
          )}
        </p>
      </div>

      <div className="rounded-2xl bg-card p-4 ring-1 ring-edge">
        <h2 className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">All time</h2>
        <div className="mt-3 flex flex-col gap-3">
          <Landmark label="Lifted" value={totals.volume} suffix=" lb" ladder={LADDERS.volume} />
          <Landmark label="Sessions" value={totals.sessions} ladder={LADDERS.sessions} />
          <Landmark label="Sets" value={totals.sets} ladder={LADDERS.sets} />
        </div>
        <p className="mt-3 border-t border-edge pt-3 text-xs text-muted num">
          {totals.reps.toLocaleString()} reps
          {totals.seconds > 0 ? ` · ${fmtTime(totals.seconds)} of holds and cardio` : ''}
        </p>
      </div>

      <div className="rounded-2xl bg-card p-4 ring-1 ring-edge">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">This week, sets per muscle</h2>
          <span className="text-xs text-muted num">target {COVERAGE_TARGET}</span>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {coverage.map((g) => {
            const pct = Math.min(100, (g.sets / COVERAGE_TARGET) * 100)
            return (
              <div key={g.group} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs text-muted">{g.group}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink ring-1 ring-edge">
                  <span
                    className={`block h-full rounded-full ${g.sets >= COVERAGE_TARGET ? 'bg-accent' : 'bg-faint'}`}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="w-5 shrink-0 text-right text-xs num text-muted">{g.sets}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
