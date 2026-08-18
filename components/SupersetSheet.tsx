'use client'

import { partnersFor } from '@/lib/superset'
import { restFor } from '@/lib/rest'
import { fmtTime } from '@/lib/format'
import type { Exercise, Goal } from '@/lib/types'
import Sheet from './Sheet'

// Pick what to superset with, rather than being offered whatever happens to be
// next in the list. A superset is consecutive exercises sharing a tag, so
// choosing something from further down the session brings it up beside this
// one, which is where it was going to have to go anyway.
export default function SupersetSheet({
  exercises,
  anchorId,
  goal,
  effort = 1,
  onPick,
  onClose,
}: {
  exercises: Exercise[]
  anchorId: string
  goal: Goal
  effort?: number
  onPick: (partnerId: string) => void
  onClose: () => void
}) {
  const anchor = exercises.find((e) => e.id === anchorId)
  const partners = partnersFor(exercises, anchorId)
  const already = !!anchor?.superset

  return (
    <Sheet title={already ? 'Add to this superset' : 'Superset with'} onClose={onClose}>
      <p className="text-sm text-muted">
        {anchor?.name}
        {already ? ' and its group run straight through.' : ' runs straight through into whatever you pick.'}
      </p>

      {partners.length ? (
        <div className="mt-4 flex flex-col gap-2">
          {partners.map((e) => (
            <button
              key={e.id}
              onClick={() => onPick(e.id)}
              className="flex items-center justify-between gap-3 rounded-xl bg-ink px-3 py-3 text-left ring-1 ring-edge"
            >
              <span className="min-w-0 flex-1 truncate text-sm">{e.name}</span>
              <span className="num shrink-0 text-xs text-muted">
                {e.type === 'C' ? 'cardio' : fmtTime(restFor(e.name, e.type, goal, effort))}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-ink p-4 text-sm leading-relaxed text-muted ring-1 ring-edge">
          Nothing else in this session to pair with yet. Add another movement first.
        </p>
      )}

      <p className="mt-5 text-xs leading-relaxed text-muted">
        Whatever you pick moves up next to {anchor?.name ?? 'this'} and the two run with no rest
        between them. The clock waits for the last movement in the group, and the longer of the two
        rest times is the one it uses.
      </p>
    </Sheet>
  )
}
