'use client'

import { useEffect, useRef, useState } from 'react'
import { fmtDate } from '@/lib/format'
import type { Share } from '@/lib/types'

/**
 * Every link you have handed out, and a way to take one back.
 *
 * Sharing inserts rather than upserts, so tapping Share on the same workout
 * three times publishes three separate links, all live forever. Until this
 * screen there was no way to know that had happened, no way to see what was
 * out there, and no way to stop any of it. Deleting the workout did not help
 * either: the published copy lives in its own table and kept serving.
 *
 * Loaded when you open the section rather than at startup, because this is a
 * screen people visit rarely and the app already waits on six queries to draw
 * the first thing.
 */
export default function SharedLinks({
  origin,
  onList,
  onRevoke,
}: {
  // Passed in rather than read here, so the list renders the same on a server
  // pass as it does in the browser.
  origin: string
  onList: () => Promise<Share[]>
  onRevoke: (id: string) => Promise<void>
}) {
  const [shares, setShares] = useState<Share[] | null>(null)
  const [failed, setFailed] = useState('')
  const [confirm, setConfirm] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  // Once, when the section opens. The handler is a new function on every
  // render of the sheet around this, so depending on it would refetch the list
  // every time somebody typed a character into the import box further up the
  // page, and would clear a half confirmed revoke while they did it.
  const list = useRef(onList)
  list.current = onList
  useEffect(() => {
    let live = true
    list
      .current()
      .then((rows) => live && setShares(rows))
      .catch((e: unknown) => live && setFailed(e instanceof Error ? e.message : 'Could not read your links'))
    return () => {
      live = false
    }
  }, [])

  async function revoke(id: string) {
    setBusy(id)
    try {
      await onRevoke(id)
      setShares((prev) => (prev ?? []).filter((s) => s.id !== id))
    } catch (e) {
      setFailed(e instanceof Error ? e.message : 'Could not revoke that one')
    } finally {
      setBusy(null)
      setConfirm(null)
    }
  }

  async function copy(share: Share) {
    const url = `${origin}/w/${share.id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(share.id)
    } catch {
      // A clipboard that refused gets the raw link, which is uglier and true.
      setFailed(url)
    }
  }

  if (failed && !shares) return <p className="mt-2 text-xs font-bold text-alert">{failed}</p>
  if (!shares) return <p className="mt-2 text-xs text-muted">Reading your links</p>

  if (!shares.length) {
    return (
      <p className="mt-2 text-xs leading-relaxed text-muted">
        Nothing shared. Sharing a workout publishes a copy of its movements, and
        the link you get works for anybody who has it.
      </p>
    )
  }

  return (
    <>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        Each of these is a live link. Revoking one stops it opening. Anyone who
        already saved it to their own workouts keeps their copy.
      </p>
      <div className="mt-2 flex flex-col gap-1">
        {shares.map((s) => (
          <div key={s.id} className="surface rounded-xl px-3 py-2.5 ring-1 ring-edge">
            <div className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-sm font-bold">{s.name}</span>
              <span className="num shrink-0 text-xs text-faint">{fmtDate(s.created_at.slice(0, 10))}</span>
            </div>
            <div className="mt-1.5 flex gap-2">
              <button
                onClick={() => void copy(s)}
                className="rounded-lg px-2.5 py-1 text-xs font-bold text-muted ring-1 ring-edge"
              >
                {copied === s.id ? 'Copied' : 'Copy link'}
              </button>
              {/* Two taps. The link stops working for everybody, and there is
                  no putting it back: revoking and sharing again makes a new
                  link, not the old one. */}
              <button
                disabled={busy === s.id}
                onClick={() => (confirm === s.id ? void revoke(s.id) : setConfirm(s.id))}
                className="rounded-lg px-2.5 py-1 text-xs font-bold text-alert ring-1 ring-edge disabled:opacity-40"
              >
                {busy === s.id ? 'Revoking' : confirm === s.id ? 'Tap again to revoke' : 'Revoke'}
              </button>
            </div>
          </div>
        ))}
      </div>
      {failed ? <p className="mt-2 text-xs font-bold leading-relaxed text-alert">{failed}</p> : null}
    </>
  )
}
