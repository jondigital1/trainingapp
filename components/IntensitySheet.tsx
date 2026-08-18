'use client'

import { useState } from 'react'
import { INTENSITY, fmtDuration } from '@/lib/session'
import Sheet from './Sheet'

// One question, once, when the session is over. A dial rather than ten buttons
// because the answer is a feeling on a continuum, and the label under it does
// the work of telling you what the number means: nobody knows what a 7 is
// until something says "properly hard".
export default function IntensitySheet({
  title,
  seconds,
  initial,
  onSave,
  onSkip,
}: {
  title: string
  seconds: number | null
  initial?: number | null
  onSave: (score: number) => void
  onSkip: () => void
}) {
  const [score, setScore] = useState(initial ?? 6)
  const label = INTENSITY.find((i) => i.score === score)?.label ?? ''
  const duration = fmtDuration(seconds)

  return (
    <Sheet title="How was that?" onClose={onSkip}>
      <p className="text-sm text-muted">
        {title}
        {duration ? ` · ${duration}` : ''}
      </p>

      <div className="mt-6 text-center">
        <p className="num text-6xl font-semibold leading-none text-accent">{score}</p>
        <p className="mt-3 text-base">{label}</p>
      </div>

      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={score}
        aria-label="How hard was that, 1 to 10"
        onChange={(e) => setScore(Number(e.target.value))}
        className="dial mt-6 w-full"
      />
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>1 easy peasy</span>
        <span>10 what was I thinking</span>
      </div>

      <div className="mt-7 flex gap-2">
        <button
          onClick={() => onSave(score)}
          className="flex-1 rounded-2xl bg-accent py-3.5 text-base font-medium text-on-accent"
        >
          Save it
        </button>
        <button onClick={onSkip} className="rounded-2xl px-5 py-3.5 text-base text-muted">
          Skip
        </button>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        One honest number after the fact, rather than a guess between every set. It is what the block
        reads to tell you whether the week went the way it was meant to.
      </p>
    </Sheet>
  )
}
