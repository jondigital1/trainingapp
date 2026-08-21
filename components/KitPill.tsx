'use client'

import { ACCESS, accessLabel } from '@/lib/questions'
import { Options } from './Form'
import type { Profile } from '@/lib/onboarding'

// Where you are training today, on both screens that build a session.
//
// One component rather than two that look alike. It was a line of grey small
// print in the builder and a different line of grey small print on the start
// sheet, which is a strange treatment for the control with the most reach on
// either: at bodyweight only, chest goes from 26 movements to 8.
//
// A pill, tinted, sitting above whatever it shapes. It says where it thinks
// you are and opens only when that is wrong, because the honest answer is "my
// gym" almost every day and a selector sitting open asks everybody a question
// that matters to somebody a few times a year.
export default function KitPill({
  kit,
  home,
  open,
  note,
  onToggle,
  onPick,
}: {
  kit: Profile['access']
  // The gym that is actually yours, so the prompt can offer the situation
  // rather than the setting: somebody in a hotel is looking for "somewhere
  // else?", not for "change".
  home: Profile['access']
  open: boolean
  // What picking one does not do, which differs by screen: a plan day is for
  // today, a workout you are building is for that workout.
  note: string
  onToggle: (open: boolean) => void
  onPick: (kit: Profile['access']) => void
}) {
  const away = (kit ?? 'full') !== (home ?? 'full')
  return (
    <>
      <button
        onClick={() => onToggle(!open)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold ${
          open ? 'bg-midnight text-frost' : 'bg-tint-cool text-accent-ink ring-1 ring-accent-ink/30'
        }`}
      >
        <span aria-hidden>&#9679;</span>
        {accessLabel(kit)}
        <span className="text-xs font-extrabold opacity-60">
          {open ? 'close' : away ? 'change' : 'somewhere else?'}
        </span>
      </button>
      {open ? (
        <div className="mt-2">
          <Options
            value={kit ?? 'full'}
            onPick={(v) => {
              onPick(v)
              onToggle(false)
            }}
            options={ACCESS.options}
            columns={ACCESS.columns}
          />
          <p className="mt-1.5 text-xs leading-relaxed text-muted">{note}</p>
        </div>
      ) : null}
    </>
  )
}
