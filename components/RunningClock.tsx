'use client'

import { useEffect, useState } from 'react'
import { fmtTime } from '@/lib/format'

// Counts up from the moment the session started, read off a timestamp rather
// than a ticking counter, so locking the phone or reloading the page gives
// back the right number instead of starting again from zero.
export default function RunningClock({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const started = new Date(startedAt).getTime()
  const seconds = Number.isFinite(started) ? Math.max(0, Math.round((now - started) / 1000)) : 0

  return (
    <span className="num text-sm text-muted">
      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-accent align-middle" aria-hidden />
      {fmtTime(seconds)}
    </span>
  )
}
