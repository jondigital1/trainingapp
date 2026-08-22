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
  // The question that was actually sent, as opposed to what is in the box.
  const [asked, setAsked] = useState('')
  const [answer, setAnswer] = useState('')
  const [thinking, setThinking] = useState(false)
  // No key on the server, so there is nothing to ask. The sheet goes back to
  // looking answers up, which is what it did before and beats an error.
  const [offline, setOffline] = useState(false)
  const running = useRef<AbortController | null>(null)

  useEffect(() => () => running.current?.abort(), [])

  // Only while the model is unavailable. Searching the library was the front
  // door for a long time and it was wrong about one question in five: it
  // scored word overlap, so "is soreness a sign of a good workout" was
  // answered with "what happens if I lose signal mid workout". Measured over
  // 68 questions written before anybody looked at what the library held.
  const results = useMemo(() => (offline && asked ? searchKnowledge(asked) : null), [offline, asked])

  async function ask(question: string) {
    const trimmed = question.trim()
    if (trimmed.length < 2) return
    running.current?.abort()
    const control = new AbortController()
    running.current = control

    setAsked(trimmed)
    setOpen(null)
    setGroup(null)
    setAnswer('')
    setThinking(true)
    try {
      const res = await fetch('/api/lifty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
        signal: control.signal,
      })
      if (res.status === 503) return setOffline(true)
      if (res.status === 429) return setAnswer('That is a lot of questions for one day. Ask again tomorrow.')
      if (!res.ok || !res.body) return setAnswer('Could not reach Lifty just then. Try again in a minute.')
      // Painted as it arrives. A coach who takes four seconds and then says
      // everything at once reads as a broken box.
      const reader = res.body.getReader()
      const decode = new TextDecoder()
      setThinking(false)
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        setAnswer((prev) => prev + decode.decode(value, { stream: true }))
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return
      setAnswer('Could not reach Lifty just then. Try again in a minute.')
    } finally {
      setThinking(false)
    }
  }

  // Recorded once the typing stops, not per keystroke, so "how" and "how m"
  // and "how much" are not three questions. Each wording is recorded once per
  // visit, because one person searching the same thing eleven times is one
  // person who could not find it.
  const logged = useRef(new Set<string>())
  useEffect(() => {
    if (!onAsk || !asked) return
    const key = asked.toLowerCase()
    if (logged.current.has(key)) return
    logged.current.add(key)
    // Answered is now a note about coverage rather than about what the person
    // saw, since the model answers either way. It is what says which answers
    // are worth writing by hand next.
    onAsk(asked, searchKnowledge(asked).length > 0)
  }, [asked, onAsk])
  const common = useMemo(() => commonQuestions(), [])
  const browse = useMemo(() => (group ? KNOWLEDGE.filter((e) => e.group === group) : []), [group])
  // Something is on screen in answer to a question, whichever way it got there.
  const answering = !!asked && (thinking || !!answer || !!results)

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
        {/* It used to say the number of answers and that Lifty looked them up
            rather than making them up. That was the most trustworthy thing
            about it and it is no longer what happens, so it does not say it. */}
        <p className="text-[13px] font-bold leading-snug text-muted">
          {offline
            ? `${KNOWLEDGE.length} answers, written by hand. Looking them up.`
            : `Ask anything about training. ${KNOWLEDGE.length} answers written by hand sit behind it.`}
        </p>
      </div>
      {/* A question is sent, not typed at. It used to search on every
          keystroke, which is right for a lookup and wrong for asking somebody
          something: a half typed question is not a question. */}
      <form onSubmit={(e) => { e.preventDefault(); void ask(query) }} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={offline ? 'Search the answers' : 'Ask Lifty anything'}
          aria-label={offline ? "Search Lifty's answers" : 'Ask Lifty a question'}
          enterKeyHint="send"
          className="min-w-0 flex-1 rounded-xl surface px-4 py-3 text-base outline-none ring-1 ring-edge focus:ring-accent-ink"
        />
        <button
          type="submit"
          disabled={query.trim().length < 2 || thinking}
          className="shrink-0 rounded-xl bg-accent px-4 text-sm font-bold text-on-accent disabled:opacity-40"
        >
          Ask
        </button>
      </form>

      {answering ? (
        <div className="mt-4">
          <p className="mb-1.5 text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">
            You asked
          </p>
          <p className="mb-3 text-sm font-bold">{asked}</p>
          {offline ? (
            results && results.length ? (
              <Answers entries={results} open={open} onOpen={setOpen} className="" />
            ) : (
              <CoachChip bubble>
                Lifty cannot reach its coach right now, and the written answers do not cover that
                one. Try one of the topics below.
              </CoachChip>
            )
          ) : (
            <CoachChip bubble>{answer || (thinking ? 'Thinking about it.' : '')}</CoachChip>
          )}
          {/* A way back. Without it the topics below sit behind the first
              question and the only exit is closing the sheet. */}
          {!thinking ? (
            <button
              onClick={() => {
                setAsked('')
                setAnswer('')
                setQuery('')
              }}
              className="mt-2 px-1 py-1.5 text-[12.5px] font-extrabold text-muted"
            >
              Ask something else
            </button>
          ) : null}
        </div>
      ) : (
        <>
          {/* Four, not forty five. A list long enough to scroll is a wall of
              text, which is the thing the search box exists to avoid. */}
          <p className="mt-5 text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">Asked most</p>
          <Answers entries={common} open={open} onOpen={setOpen} className="mt-1.5" />
        </>
      )}

      {/* Always. A list of everything under a heading is a different job from
          answering a question, and it is the one scoring never got wrong. */}
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

        {group ? <Answers entries={browse} open={open} onOpen={setOpen} /> : null}
      </div>
    </Sheet>
  )
}
