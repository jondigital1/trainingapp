'use client'

import { useState } from 'react'
import Sheet from './Sheet'
import CoachChip from './CoachChip'
import { Chips } from './Form'
import { SORE_JOINTS } from '@/lib/onboarding'

/**
 * The word before the first session of the day.
 *
 * Three steps and every one of them has a way straight out, because this sits
 * between somebody and the thing they opened the app to do. Nothing is wrong
 * is one tap. Saying a knee is sore and then deciding to train it normally
 * anyway is two, and that answer is respected rather than argued with: the
 * question was whether they want the session eased, not whether they should.
 */
export default function HelloSheet({
  name,
  onStart,
  onClose,
}: {
  name?: string
  // The joints to go easier on today, empty for none.
  onStart: (eased: string[]) => void
  onClose: () => void
}) {
  const [step, setStep] = useState<'hello' | 'where' | 'offer'>('hello')
  const [picked, setPicked] = useState<string[]>([])

  const hello = name ? `Good to see you, ${name}.` : 'Good to see you.'

  return (
    <Sheet title="Before you start" onClose={onClose}>
      <CoachChip bubble className="mb-4">
        {step === 'hello'
          ? `${hello} Anything giving you trouble today?`
          : step === 'where'
            ? 'Where is it?'
            : 'Want today to go easier on that?'}
      </CoachChip>

      {step === 'where' ? (
        <div className="mb-4">
          <Chips
            options={SORE_JOINTS}
            selected={picked}
            onToggle={(v) => setPicked((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))}
          />
        </div>
      ) : null}

      {step === 'offer' ? (
        <p className="mb-4 text-sm leading-relaxed text-muted">
          Anything working your {picked.join(' and ').toLowerCase()} runs a set shorter today. The
          session keeps all its movements, and tomorrow is unaffected.
        </p>
      ) : null}

      <div className="flex flex-col gap-2 pb-2">
        {step === 'hello' ? (
          <>
            <button
              onClick={() => onStart([])}
              className="w-full rounded-2xl bg-accent py-3.5 font-display text-[15px] font-bold text-on-accent"
            >
              All good, let us go
            </button>
            <button
              onClick={() => setStep('where')}
              className="w-full rounded-2xl py-3.5 font-display text-[15px] font-bold text-accent-ink ring-[1.5px] ring-accent-ink"
            >
              Something is bothering me
            </button>
          </>
        ) : null}

        {step === 'where' ? (
          <>
            <button
              onClick={() => setStep('offer')}
              disabled={!picked.length}
              className="w-full rounded-2xl bg-accent py-3.5 font-display text-[15px] font-bold text-on-accent disabled:opacity-40"
            >
              Next
            </button>
            <button onClick={() => onStart([])} className="w-full py-2 text-[12.5px] font-extrabold text-muted">
              Never mind, start the session
            </button>
          </>
        ) : null}

        {step === 'offer' ? (
          <>
            <button
              onClick={() => onStart(picked)}
              className="w-full rounded-2xl bg-accent py-3.5 font-display text-[15px] font-bold text-on-accent"
            >
              Yes, go easier today
            </button>
            {/* Respected rather than argued with. The question was whether they
                want the session eased, not whether they ought to. */}
            <button
              onClick={() => onStart([])}
              className="w-full rounded-2xl py-3.5 font-display text-[15px] font-bold text-accent-ink ring-[1.5px] ring-accent-ink"
            >
              No, train it as normal
            </button>
          </>
        ) : null}
      </div>
    </Sheet>
  )
}
