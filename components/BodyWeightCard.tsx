'use client'

import { useState } from 'react'
import { summarise, trend } from '@/lib/body'
import { fmtDelta, fmtWeight, toDisplay, toPounds, unitLabel, type Unit } from '@/lib/units'
import { fmtDate, today } from '@/lib/format'
import type { BodyWeight } from '@/lib/types'
import { NumberInput } from './Form'

// Bodyweight sits on the Progress tab beside the lifts on purpose. Strength
// climbing while bodyweight holds is a different story from both climbing
// together, and the two lines have to be in the same place to tell them apart.
//
// The line is the seven day average, not the raw readings: day to day swings
// are water and a big dinner, and a chart of those tells a story that is not
// happening.

const W = 340
const H = 96
const PAD = { top: 10, right: 10, bottom: 14, left: 10 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

export default function BodyWeightCard({
  weights,
  goalWeight,
  unit,
  onLog,
}: {
  weights: BodyWeight[]
  goalWeight: number | undefined
  unit: Unit
  onLog: (pounds: number) => void
}) {
  const [entry, setEntry] = useState('')
  const [open, setOpen] = useState(false)
  const body = summarise(weights, goalWeight)
  const line = trend(weights)

  function log() {
    const n = Number(entry)
    if (entry.trim() === '' || !Number.isFinite(n) || n <= 0) return
    onLog(toPounds(n, unit))
    setEntry('')
    setOpen(false)
  }

  const alreadyToday = body.currentDate === today()

  return (
    <section className="rounded-2xl bg-card p-4 ring-1 ring-edge">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Bodyweight</h3>
          <p className="text-xs text-muted">
            {body.currentDate ? `Last weighed ${fmtDate(body.currentDate)}` : 'Nothing logged yet'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl leading-none">
            {body.current != null ? Math.round(toDisplay(body.current, unit) * 10) / 10 : '--'}
            <span className="ml-1 text-sm text-muted">{unitLabel(unit)}</span>
          </p>
          {body.change != null ? (
            <p className="text-xs text-muted">{fmtDelta(body.change, unit)} since the start</p>
          ) : null}
        </div>
      </div>

      {line.length >= 2 ? <Sparkline points={line} /> : null}

      {/* The three numbers that matter, said rather than implied: where you
          started, where you are, where you are going. */}
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-edge pt-3 text-center">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted">Starting</p>
          <p className="num mt-0.5 text-sm">{fmtWeight(body.first, unit)}</p>
          {body.firstDate ? (
            <p className="num text-[11px] text-muted">{fmtDate(body.firstDate)}</p>
          ) : null}
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted">Current</p>
          <p className="num mt-0.5 text-sm text-accent">{fmtWeight(body.current, unit)}</p>
          {body.currentDate ? (
            <p className="num text-[11px] text-muted">{fmtDate(body.currentDate)}</p>
          ) : null}
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted">Goal</p>
          <p className="num mt-0.5 text-sm">{fmtWeight(body.goal, unit)}</p>
          {body.goal != null && body.current != null ? (
            <p className="num text-[11px] text-muted">
              {Math.abs(Math.round((body.current - body.goal) * 10) / 10)} to go
            </p>
          ) : null}
        </div>
      </div>

      {body.goal != null && body.toGoal != null ? (
        <>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-edge">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(body.toGoal * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {body.reached
              ? 'Goal reached. Worth setting the next one, or holding here on purpose.'
              : `${Math.round(body.toGoal * 100)} percent of the way there.`}
          </p>
        </>
      ) : null}

      {open ? (
        <div className="mt-3 flex gap-2">
          <div className="flex-1">
            <NumberInput
              decimal
              value={entry}
              onChange={setEntry}
              suffix={unitLabel(unit)}
              placeholder={unit === 'kg' ? '82' : '180'}
            />
          </div>
          <button onClick={log} className="rounded-xl bg-accent px-4 text-sm font-medium text-on-accent">
            Save
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 w-full rounded-xl bg-ink py-2.5 text-sm text-muted ring-1 ring-edge"
        >
          {alreadyToday ? 'Weighed in today. Change it' : 'Weigh in'}
        </button>
      )}
    </section>
  )
}

function Sparkline({ points }: { points: BodyWeight[] }) {
  const values = points.map((p) => p.weight)
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = hi - lo || Math.max(1, hi * 0.02)
  const first = new Date(points[0].date + 'T00:00:00').getTime()
  const last = new Date(points[points.length - 1].date + 'T00:00:00').getTime()
  const range = last - first || 1

  const coords = points.map((p) => ({
    cx: PAD.left + ((new Date(p.date + 'T00:00:00').getTime() - first) / range) * PLOT_W,
    cy: PAD.top + (1 - (p.weight - (lo - span * 0.2)) / (span * 1.4)) * PLOT_H,
  }))
  const path = coords.map((c, i) => `${i ? 'L' : 'M'}${c.cx.toFixed(1)} ${c.cy.toFixed(1)}`).join(' ')
  const end = coords[coords.length - 1]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-3 w-full"
      role="img"
      aria-label={`Bodyweight over ${points.length} readings, seven day average`}
    >
      <path
        d={`${path} L${end.cx.toFixed(1)} ${PAD.top + PLOT_H} L${coords[0].cx.toFixed(1)} ${PAD.top + PLOT_H} Z`}
        fill="var(--color-accent)"
        opacity="0.1"
      />
      <path
        d={path}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={end.cx} cy={end.cy} r="4" fill="var(--color-accent)" stroke="var(--color-card)" strokeWidth="2" />
    </svg>
  )
}
