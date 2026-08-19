'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fmtTime } from '@/lib/format'
import { askToNotify, restDone } from '@/lib/notify'
import { cancelAlert, scheduleAlert } from '@/lib/push'
import { REST_KEY, type RestState } from '@/lib/rest'

// One timer at a time, keyed to an end timestamp rather than a countdown, so a
// phone that locks mid rest comes back with the right number on it. Survives a
// reload too, which matters when the gym wifi drops and the page reloads.
export function useRest() {
  const [rest, setRest] = useState<RestState | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const rang = useRef(false)
  const asked = useRef(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REST_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved) as RestState
      if (parsed.endsAt > Date.now()) setRest(parsed)
      else localStorage.removeItem(REST_KEY)
    } catch {
      // nothing worth doing if the value is unreadable
    }
  }, [])

  useEffect(() => {
    if (!rest) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [rest])

  const stop = useCallback(() => {
    setRest(null)
    rang.current = false
    // Skipping the rest has to stop the alert that is already waiting on the
    // server, or it arrives in the middle of the next set.
    cancelAlert()
    try {
      localStorage.removeItem(REST_KEY)
    } catch {
      // ignore
    }
  }, [])

  const start = useCallback((exerciseId: string, name: string, seconds: number) => {
    if (seconds <= 0) return
    const next: RestState = { exerciseId, name, endsAt: Date.now() + seconds * 1000, total: seconds }
    rang.current = false
    setRest(next)
    setNow(Date.now())
    try {
      localStorage.setItem(REST_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
    // And one from outside the device, for the phone that goes in a pocket.
    // Does nothing unless it has been turned on.
    void scheduleAlert(name, seconds)
  }, [])

  const extend = useCallback((seconds: number) => {
    setRest((prev) => {
      if (!prev) return prev
      const next = { ...prev, endsAt: prev.endsAt + seconds * 1000, total: prev.total + seconds }
      rang.current = false
      // The waiting alert is for the old end time, so it is replaced rather
      // than left to fire early.
      void scheduleAlert(prev.name, Math.max(1, Math.round((next.endsAt - Date.now()) / 1000)))
      try {
        localStorage.setItem(REST_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const remaining = rest ? Math.max(0, Math.round((rest.endsAt - now) / 1000)) : 0

  // Asked the first time a timer runs, which is the first moment the question
  // means anything. Asking at startup is asking about nothing.
  useEffect(() => {
    if (!rest || asked.current) return
    asked.current = true
    void askToNotify()
  }, [rest])

  // Buzz and beep once, at zero. The tap that started the timer is the gesture
  // that lets audio play later, so this works without asking for anything.
  useEffect(() => {
    if (!rest || remaining > 0 || rang.current) return
    rang.current = true
    try {
      navigator.vibrate?.([120, 80, 120])
    } catch {
      // ignore
    }
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      const ctx = new Ctx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 660
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45)
      osc.connect(gain).connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.5)
      osc.onended = () => void ctx.close()
    } catch {
      // no audio, the number on screen still counts down
    }
    // And a notification for the times the screen is not what you are looking
    // at. It says nothing when the app is in front of you.
    void restDone(rest.name)
    // The page was awake after all, so the alert waiting on the server has
    // nothing left to tell anybody.
    cancelAlert()
  }, [rest, remaining])

  return { rest, remaining, start, stop, extend }
}

export default function RestBar({
  rest,
  remaining,
  onExtend,
  onStop,
}: {
  rest: RestState
  remaining: number
  onExtend: (seconds: number) => void
  onStop: () => void
}) {
  const done = remaining === 0
  const pct = Math.max(0, Math.min(100, (remaining / rest.total) * 100))

  return (
    <div className="above-nav fixed inset-x-0 z-40 mx-auto max-w-lg px-3">
      <div className="overflow-hidden rounded-2xl bg-card shadow-[0_12px_32px_rgba(11,18,29,0.16)] ring-1 ring-edge">
        {/* The strip is the clock you read without reading. */}
        <div className="h-1 bg-track">
          <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center gap-2.5 px-3.5 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-[1px] text-faint">
              {done ? 'Rest is up' : 'Resting'}
            </p>
            <p className="truncate text-[13px] font-bold">{rest.name}</p>
          </div>
          <span className={`num font-display text-2xl font-bold ${done ? 'text-accent-ink' : 'text-accent-ink'}`}>
            {fmtTime(remaining)}
          </span>
          <button
            onClick={() => onExtend(30)}
            className="rounded-[10px] px-2.5 py-[7px] text-xs font-extrabold text-muted ring-[1.5px] ring-edge"
          >
            +30s
          </button>
          <button
            onClick={onStop}
            className="rounded-[10px] bg-accent px-3.5 py-2 text-[12.5px] font-extrabold text-on-accent"
          >
            {done ? 'Done' : 'Skip'}
          </button>
        </div>
      </div>
    </div>
  )
}
