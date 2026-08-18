'use client'

import { useMemo, useState } from 'react'
import {
  commonQuestions,
  KNOWLEDGE,
  KNOWLEDGE_GROUPS,
  searchKnowledge,
  type KnowledgeEntry,
} from '@/lib/knowledge'
import Sheet from './Sheet'

function Entry({ entry, open, onToggle }: { entry: KnowledgeEntry; open: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-edge last:border-0">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 py-3 text-left"
      >
        <span className="text-sm">{entry.q}</span>
        <span aria-hidden className="shrink-0 text-xs text-muted">
          {open ? '−' : '+'}
        </span>
      </button>
      {open ? <p className="pb-3 text-sm leading-relaxed text-muted">{entry.a}</p> : null}
    </div>
  )
}

export default function HelpSheet({ onClose, inline }: { onClose: () => void; inline?: boolean }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [group, setGroup] = useState<string | null>(null)

  const results = useMemo(() => (query.trim() ? searchKnowledge(query) : null), [query])
  const common = useMemo(() => commonQuestions(), [])
  const browse = useMemo(() => (group ? KNOWLEDGE.filter((e) => e.group === group) : []), [group])
  const searching = results !== null

  return (
    <Sheet title="Ask Lifty" onClose={onClose} inline={inline}>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(null)
        }}
        placeholder="Ask about training or the app"
        aria-label="Ask about training or the app"
        className="w-full rounded-xl surface px-4 py-3 text-base outline-none ring-1 ring-edge focus:ring-accent"
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
          <p className="mt-4 rounded-xl surface p-4 text-sm leading-relaxed text-muted ring-1 ring-edge">
            Lifty does not know that one. It only knows what is written into the app and never
            searches the internet, so it would rather say so than make something up.
          </p>
        )
      ) : (
        <>
          {/* Four, not forty five. A list long enough to scroll is a wall of
              text, which is the thing the search box exists to avoid. */}
          <p className="mt-5 text-xs uppercase tracking-wide text-muted">Asked most</p>
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
          <p className="text-xs uppercase tracking-wide text-muted">Browse by topic</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {KNOWLEDGE_GROUPS.map((g) => (
              <button
                key={g}
                onClick={() => {
                  setGroup(group === g ? null : g)
                  setOpen(null)
                }}
                aria-pressed={group === g}
                className={`rounded-full px-3 py-2 text-sm ${
                  group === g ? 'bg-accent text-on-accent' : 'surface text-muted ring-1 ring-edge'
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

      <p className="mt-6 border-t border-edge pt-3 text-xs leading-relaxed text-muted">
        Every answer here is written into the app. Nothing searches the internet, and a question
        Lifty cannot answer says so rather than guessing.
      </p>
    </Sheet>
  )
}
