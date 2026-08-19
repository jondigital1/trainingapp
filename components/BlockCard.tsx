'use client'

import { BLOCK, BLOCK_WEEKS, readBlock, type BlockWeek } from '@/lib/block'
import type { Workout } from '@/lib/types'

export default function BlockCard({
  week,
  number,
  workouts,
  today,
}: {
  week: BlockWeek
  number: number
  workouts: Workout[]
  today: string
}) {
  const read = readBlock(workouts, week, today)
  const [lo, hi] = week.score

  return (
    <div className="mb-4 rounded-2xl bg-card p-4 ring-1 ring-edge">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="num text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-accent-ink">
          Block {number} · Week {week.index} of {BLOCK_WEEKS}
        </h2>
        <span className="text-xs font-bold text-faint">{week.name}</span>
      </div>

      {/* Six segments, one per week. Behind you is filled, this week is
          outlined so it reads as where you are rather than where you got to,
          and ahead is the quiet track. */}
      <div className="mt-2.5 flex gap-1.5">
        {BLOCK.map((w) => (
          <span
            key={w.index}
            className={`h-2 flex-1 rounded-full ${
              w.index === week.index
                ? 'bg-card ring-[1.5px] ring-accent-ink'
                : w.index < week.index
                  ? 'bg-accent'
                  : 'bg-track'
            }`}
          />
        ))}
      </div>

      <p className="mt-3 text-sm font-bold text-accent-ink">{week.rir}</p>

      <p className="mt-3 text-sm leading-relaxed text-muted">{week.note}</p>

      <div className="mt-3 flex items-center justify-between border-t border-edge pt-3 text-sm">
        <span className="text-muted">
          Aim{' '}
          <span className="num text-bright">
            {lo} to {hi}
          </span>{' '}
          out of 10
        </span>
        {read.average == null ? (
          <span className="text-xs text-muted">nothing scored yet</span>
        ) : (
          <span className="num">
            <span className={read.verdict === 'on' ? 'text-bright' : 'text-accent-ink'}>{read.average}</span>
            <span className="ml-2 text-xs text-muted">
              {read.verdict === 'on'
                ? 'on target'
                : read.verdict === 'under'
                  ? 'easier than the week asks'
                  : 'harder than the week asks'}
            </span>
          </span>
        )}
      </div>
    </div>
  )
}
