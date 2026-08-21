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

/**
 * A list of questions, on a card.
 *
 * These sat as bare rows on the page background with hairlines between them,
 * while every other list in the app is on a card. It read as unfinished rather
 * than as a decision, and it was the same fault the upcoming days had: rows
 * are right, rows floating on the background are not.
 *
 * One of these rather than three, because the same list is drawn for a search,
 * for the four asked most and for a topic, and three copies is how they come
 * to disagree.
 */
function Answers({
  entries,
  open,
  onOpen,
  className = 'mt-2',
}: {
  entries: KnowledgeEntry[]
  open: string | null
  onOpen: (id: string | null) => void
  className?: string
}) {
  if (!entries.length) return null
  return (
    <ul className={`${className} overflow-hidden rounded-2xl bg-card ring-1 ring-edge`}>
      {entries.map((entry) => (
        <li key={entry.id} className="border-b border-edge last:border-b-0">
          <button
            onClick={() => onOpen(open === entry.id ? null : entry.id)}
            aria-expanded={open === entry.id}
            className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
          >
            <span className="text-sm font-bold">{entry.q}</span>
            <span aria-hidden className="shrink-0 text-xs text-faint">
              {open === entry.id ? '−' : '+'}
            </span>
          </button>
          {/* The answer arrives as Lifty saying it, since Lifty is who was asked. */}
          {open === entry.id ? (
            <div className="px-3.5 pb-3">
              <CoachChip bubble>{entry.a}</CoachChip>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
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
          <Answers entries={results} open={open} onOpen={setOpen} />
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
          <Answers entries={common} open={open} onOpen={setOpen} className="mt-1.5" />
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
            <Answers entries={browse} open={open} onOpen={setOpen} />
          ) : null}
        </div>
      ) : null}

      {/* Said here rather than left to be inferred. The library drifted into
          answering health questions once and it read well, which is what made
          it a problem. */}
      <p className="mt-6 border-t border-edge pt-3 text-xs leading-relaxed text-muted">
        Every answer here is written into the app. Nothing searches the internet, and a question
        Lifty cannot answer says so rather than guessing. It answers training questions, eating to
        train among them. Anything about an injury, a condition or medication belongs with a
        doctor or a physio, and those answers say so rather than guessing at it.
      </p>
    </Sheet>
  )
}
