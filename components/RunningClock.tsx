'use client'

import { useEffect, useState } from 'react'
import { fmtTime } from '@/lib/format'

// Counts up from the moment the session started, read off a timestamp rather
// than a ticking counter, so locking the phone or reloading the page gives
// back the right number instead of starting again from zero.
//
// The clock only starts once mounted. Reading Date.now() during the first
// render would have the server and the browser produce different text a
// fraction of a second apart, which React sees as a hydration mismatch and
// answers by throwing the tree away and rebuilding it.
export default function RunningClock({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const started = new Date(startedAt).getTime()
  const seconds =
    now == null || !Number.isFinite(started) ? null : Math.max(0, Math.round((now - started) / 1000))

  return (
    <span className="num text-sm text-muted">
      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-accent align-middle" aria-hidden />
      {seconds == null ? '––:––' : fmtTime(seconds)}
    </span>
  )
}
