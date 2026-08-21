'use client'

import { DELOAD_AFTER } from '@/lib/deload'

// One sentence, once, after a long run of hard weeks. It replaced a card that
// sat here every day telling you which of six weeks you were in.
//
// It says what a lighter week is for and then gets out of the way. No week
// number, no target to hit, nothing to fail: taking it is not tracked, because
// a lighter week measured against a scoreboard is not a lighter week.
export default function DeloadCard({
  streak,
  onDismiss,
}: {
  streak: number
  onDismiss: () => void
}) {
  return (
    <div className="mb-4 rounded-2xl bg-card p-4 ring-[1.5px] ring-accent-ink">
      <p className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-accent-ink">
        Worth an easier week
      </p>
      <p className="mt-2 text-[15px] font-bold leading-snug">
        <span className="num">{streak}</span> weeks straight hitting your target.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        A lighter week now is how the last {DELOAD_AFTER} turn into progress: same movements, same
        loads, roughly half the sets, nothing near failure. The version you get by accident, through
        a tweak or losing interest, costs a great deal more than the one you choose.
      </p>
      <button
        onClick={onDismiss}
        className="mt-3 rounded-full bg-ink px-3.5 py-2 text-sm font-bold text-muted ring-1 ring-edge"
      >
        Got it
      </button>
    </div>
  )
}
