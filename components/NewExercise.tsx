'use client'

import { useState } from 'react'
import { MUSCLE_GROUPS } from '@/lib/exercises'
import { TextInput } from './Form'
import { fmtTime, uid } from '@/lib/format'
import { TIER_LABELS, restForTier, type RestTier } from '@/lib/rest'
import { SET_TYPES, type CustomExercise, type Goal, type SetType } from '@/lib/types'

/**
 * A movement the library has never heard of.
 *
 * Four questions, because the answers are what let it behave like one the
 * library does know: counted in the weekly total, swapped around a sore joint,
 * and rested properly. A name on its own would be a row that sits outside
 * everything else the app can reason about.
 *
 * One component rather than one per screen. This used to live only inside the
 * picker you get during a session, so typing a movement into the workout
 * builder was a dead end while typing the same movement thirty seconds later,
 * mid session, worked fine. Two screens answering the same question
 * differently is how that happens, and sharing the answer is how it stops.
 *
 * The same four questions come back to change an answer. They had to: getting
 * one wrong used to be permanent, and these are not decorative. A movement
 * filed under the wrong group credits the wrong muscle in the weekly count
 * every week, and the wrong tier rests the wrong length every session. You
 * could fix it by hand in the session you were in and it was wrong again the
 * next time.
 */
export default function NewExercise({
  name,
  action,
  goal,
  editing,
  taken: isTaken,
  onCreate,
  onDelete,
}: {
  name: string
  action: string
  // Read from the real rest table so the promise on this screen and the timer
  // in the session are the same number.
  goal: Goal
  // The movement being changed, or nothing when making a new one. Editing
  // keeps the id, so a rename moves the movement you have rather than leaving
  // the old spelling behind next to the new one.
  editing?: CustomExercise | null
  // Names already spoken for, so a second Bench Press cannot be made from a
  // screen with no search box to have found the first one.
  taken?: (name: string) => boolean
  onCreate: (exercise: CustomExercise) => void
  onDelete?: (exercise: CustomExercise) => void
}) {
  const [type, setType] = useState<SetType>(editing?.type ?? 'W')
  const [group, setGroup] = useState<string>(editing?.group ?? MUSCLE_GROUPS[0])
  const [tier, setTier] = useState<RestTier>(editing?.tier ?? 'compound')
  const [sets, setSets] = useState(editing?.sets ?? 3)
  // Only editable when editing. While creating, the name is whatever you typed
  // into the search box above, and two places to type it is one too many.
  const [named, setNamed] = useState(editing?.name ?? '')
  const [confirm, setConfirm] = useState(false)
  // Type it here when the caller has not got a name to hand. The pickers do:
  // it is whatever you searched for and did not find, and asking for it twice
  // on one screen is asking for it twice. Editing does, and My movements does
  // not, because there is no search box above it.
  const typing = !!editing || !name.trim()
  const finalName = (typing ? named : name).trim()
  const taken = !!finalName && finalName !== editing?.name && !!isTaken?.(finalName)

  return (
    <div className="surface mt-4 rounded-[14px] p-3.5 ring-1 ring-edge">
      {typing ? (
        <>
          <Label>Called</Label>
          <div className="mt-1.5">
            <TextInput value={named} onChange={setNamed} placeholder="What is it called" />
          </div>
          {taken ? (
            <p className="mt-1.5 text-xs text-alert">
              {finalName} is already a movement. Search for it rather than making a second one.
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm">
          Create <span className="text-accent-ink">{name}</span>
        </p>
      )}

      <Label>What do you measure</Label>
      <Chips
        options={SET_TYPES.map((t) => ({ v: t.type as string, label: t.label }))}
        value={type}
        onPick={(v) => setType(v as SetType)}
      />

      <Label>What does it train</Label>
      <Chips options={MUSCLE_GROUPS.map((g) => ({ v: g, label: g }))} value={group} onPick={setGroup} />

      <Label>How hard is it</Label>
      <Chips
        options={TIER_LABELS.map((t) => ({ v: t.tier as string, label: t.label }))}
        value={tier}
        onPick={(v) => setTier(v as RestTier)}
      />
      <p className="mt-1 text-xs text-muted">
        {TIER_LABELS.find((t) => t.tier === tier)?.hint}. Rests{' '}
        <span className="num">{fmtTime(restForTier(tier, goal))}</span>.
      </p>

      <Label>Sets to lay out</Label>
      <Chips
        options={[1, 2, 3, 4, 5].map((n) => ({ v: String(n), label: String(n) }))}
        value={String(sets)}
        onPick={(v) => setSets(Number(v))}
      />

      <button
        disabled={!finalName || taken}
        onClick={() =>
          onCreate({ id: editing?.id ?? uid(), name: finalName, type, group, tier, sets })
        }
        className="mt-4 w-full rounded-xl bg-accent py-2.5 font-display text-sm font-bold text-on-accent disabled:opacity-40"
      >
        {action}
      </button>

      {/* Two taps, because this is the one button here that cannot be undone.
          Everything else on this screen can be changed back. */}
      {editing && onDelete ? (
        <button
          onClick={() => (confirm ? onDelete(editing) : setConfirm(true))}
          className="mt-2 w-full rounded-xl py-2.5 text-sm font-bold text-alert"
        >
          {confirm ? 'Tap again to delete it' : 'Delete this movement'}
        </button>
      ) : null}

      {editing ? (
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Changes apply from here on. Sessions you have already logged keep what
          they were logged with.
        </p>
      ) : null}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">{children}</p>
}

function Chips({
  options,
  value,
  onPick,
}: {
  options: { v: string; label: string }[]
  value: string
  onPick: (v: string) => void
}) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onPick(o.v)}
          aria-pressed={value === o.v}
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
            value === o.v ? 'bg-card text-bright ring-[1.5px] ring-accent-ink' : 'bg-card text-muted ring-1 ring-edge'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
