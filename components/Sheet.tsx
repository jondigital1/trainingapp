'use client'

import { useEffect } from 'react'

// The same content in two frames. As a sheet it slides over whatever you were
// doing and hands you a Done button. As a screen it is simply where you are,
// which is what a thing on the nav bar should be: a place, not an interruption.
export default function Sheet({
  title,
  onClose,
  inline,
  action,
  children,
}: {
  title: string
  onClose: () => void
  inline?: boolean
  // Something to sit opposite the title on a screen, where there is no Done.
  action?: React.ReactNode
  children: React.ReactNode
}) {
  useEffect(() => {
    if (inline) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, inline])

  if (inline) {
    return (
      <section className="frame-page">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
          {action}
        </div>
        {children}
      </section>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div
        className="frame-sheet max-h-[88vh] overflow-y-auto rounded-t-3xl bg-card px-4 pb-safe-lg pt-3 ring-1 ring-edge"
        onClick={(e) => e.stopPropagation()}
      >
        {/* The grabber says this is a sheet before you have read a word of it. */}
        <div className="sticky top-0 -mx-4 mb-3 bg-card px-4 pb-3 pt-2">
          <div className="mx-auto mb-2.5 h-1 w-9 rounded-full bg-edge" />
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold">{title}</h2>
            <button onClick={onClose} className="px-2 py-1 text-[12.5px] font-extrabold text-muted">
              Done
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
