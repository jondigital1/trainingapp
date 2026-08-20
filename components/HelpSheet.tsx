'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  commonQuestions,
  KNOWLEDGE,
  KNOWLEDGE_GROUPS,
  searchKnowledge,
  type KnowledgeEntry,
} from '@/lib/knowledge'
import CoachChip from './CoachChip'
import LiftyMark from './LiftyMark'
import Sheet from './Sheet'

function Entry({ entry, open, onToggle }: { entry: KnowledgeEntry; open: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-edge last:border-0">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 py-3 text-left"
      >
        <span className="text-sm font-bold">{entry.q}</span>
        <span aria-hidden className="shrink-0 text-xs text-faint">
          {open ? '−' : '+'}
        </span>
      </button>
      {/* The answer arrives as Lifty saying it, since Lifty is who was asked. */}
      {open ? <CoachChip bubble className="pb-3">{entry.a}</CoachChip> : null}
    </div>
  )
}

export default function HelpSheet({
  onClose,
  inline,
  onAsk,
}: {
  onClose: () => void
  inline?: boolean
  // A question that settled, and whether the library had anything for it.
  // What Lifty cannot answer is the list of what to write next, and before
  // this it vanished the moment somebody closed the sheet.
  onAsk?: (question: string, answered: boolean) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [group, setGroup] = useState<string | null>(null)

  const results = useMemo(() => (query.trim() ? searchKnowledge(query) : null), [query])

  // Recorded once the typing stops, not per keystroke, so "how" and "how m"
  // and "how much" are not three questions. Each wording is recorded once per
  // visit, because one person searching the same thing eleven times is one
  // person who could not find it.
  const logged = useRef(new Set<string>())
  useEffect(() => {
    if (!onAsk) return
    const asked = query.trim()
    if (asked.length < 4) return
    const timer = setTimeout(() => {
      const key = asked.toLowerCase()
      if (logged.current.has(key)) return
      logged.current.add(key)
      onAsk(asked, searchKnowledge(asked).length > 0)
    }, 1200)
    return () => clearTimeout(timer)
  }, [query, onAsk])
  const common = useMemo(() => commonQuestions(), [])
  const browse = useMemo(() => (group ? KNOWLEDGE.filter((e) => e.group === group) : []), [group])
  const searching = results !== null

  return (
    <Sheet title="Ask Lifty" onClose={onClose} inline={inline}>
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-[42px] w-[42px] flex-none place-items-center rounded-full bg-midnight">
          <LiftyMark size={28} />
        </span>
        {/* A round avatar over a text box is the shape of a chat window, and
            people read shapes before they read words. This is a lookup over
            answers somebody sat down and wrote, so the line under the name
            says the number out loud rather than implying a coach who is
            listening. */}
        <p className="text-[13px] font-bold leading-snug text-muted">
          {KNOWLEDGE.length} answers, written by hand. Lifty looks them up rather than
          making them up.
        </p>
      </div>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(null)
        }}
        placeholder="Search the answers"
        aria-label="Search Lifty's answers"
        className="w-full rounded-xl surface px-4 py-3 text-base outline-none ring-1 ring-edge focus:ring-accent-ink"
      />

      {searching ? (
        results.length ? (
          <div className="mt-2 flex flex-col">
            {results.map((entry) => (
              <Entry
                key={entry.id}
                entry={entry}
                open={open === entry.id}
                onToggle={() => setOpen(open === entry.id ? null : entry.id)}
              />
            ))}
          </div>
        ) : (
          <CoachChip bubble className="mt-4">
            Lifty does not know that one. It only knows what is written into the app and never
            searches the internet, so it would rather say so than make something up.
          </CoachChip>
        )
      ) : (
        <>
          {/* Four, not forty five. A list long enough to scroll is a wall of
              text, which is the thing the search box exists to avoid. */}
          <p className="mt-5 text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">Asked most</p>
          <div className="mt-1 flex flex-col">
            {common.map((entry) => (
              <Entry
                key={entry.id}
                entry={entry}
                open={open === entry.id}
                onToggle={() => setOpen(open === entry.id ? null : entry.id)}
              />
            ))}
          </div>
        </>
      )}

      {!searching || results.length === 0 ? (
        <div className="mt-5">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">Browse by topic</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {KNOWLEDGE_GROUPS.map((g) => (
              <button
                key={g}
                onClick={() => {
                  setGroup(group === g ? null : g)
                  setOpen(null)
                }}
                aria-pressed={group === g}
                className={`rounded-full px-3 py-2 text-sm font-bold ${
                  group === g
                    ? 'bg-tint-cool text-accent-ink ring-[1.5px] ring-accent-ink'
                    : 'surface text-muted ring-1 ring-edge'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {group ? (
            <div className="mt-1 flex flex-col">
              {browse.map((entry) => (
                <Entry
                  key={entry.id}
                  entry={entry}
                  open={open === entry.id}
                  onToggle={() => setOpen(open === entry.id ? null : entry.id)}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Said here rather than left to be inferred. The library drifted into
          answering health questions once and it read well, which is what made
          it a problem. */}
      <p className="mt-6 border-t border-edge pt-3 text-xs leading-relaxed text-muted">
        Every answer here is written into the app. Nothing searches the internet, and a question
        Lifty cannot answer says so rather than guessing. This is a training log and not a medical
        or nutrition service: anything about an injury, a condition, medication or what you should
        be eating belongs with a doctor, a physio or a dietitian, and the answers here say so.
      </p>
    </Sheet>
  )
}
