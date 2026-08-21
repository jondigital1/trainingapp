'use client'

import { useEffect, useState } from 'react'

// The same content in two frames. As a sheet it slides over whatever you were
// doing and hands you a Done button. As a screen it is simply where you are,
// which is what a thing on the nav bar should be: a place, not an interruption.
export default function Sheet({
  title,
  onClose,
  inline,
  dirty,
  action,
  children,
}: {
  title: string
  onClose: () => void
  inline?: boolean
  // There is unsaved work in here, so leaving throws it away.
  //
  // A click on the dark area behind a sheet closes it, which is right for a
  // sheet that asks one question and wrong for one you have spent two minutes
  // filling in. Reported by somebody who lost a half built workout twice to a
  // stray click on a desktop browser, which is where the backdrop is a big
  // target and the pointer is imprecise in a way a thumb is not.
  dirty?: boolean
  // Something to sit opposite the title on a screen, where there is no Done.
  action?: React.ReactNode
  children: React.ReactNode
}) {
  const [confirming, setConfirming] = useState(false)
  useEffect(() => {
    if (!dirty) setConfirming(false)
  }, [dirty])

  // Nothing to lose leaves on the first tap, as it always has. With work in
  // it, the first tap arms and the second one leaves, the same two taps this
  // app already uses for deleting a movement and skipping a session.
  //
  // The backdrop arms rather than being ignored outright. A click that does
  // nothing at all reads as a stuck screen, and this way the way out is
  // visibly sitting in the corner where it always was.
  function leave() {
    if (!dirty || confirming) return onClose()
    setConfirming(true)
  }

  useEffect(() => {
    if (inline) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (dirty && !confirming) return setConfirming(true)
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, inline, dirty, confirming])

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
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={leave}>
      {/* Capped and centred to the width the rest of the app is capped to.
          Without this a sheet stretched to the whole viewport on a desktop
          browser while the page behind it sat in a 32rem column, which turned
          a seven day picker into seven enormous buttons and an At row wide
          enough to land a plane on. */}
      <div
        className="frame-sheet mx-auto max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card px-4 pb-safe-lg pt-3 ring-1 ring-edge"
        onClick={(e) => {
          e.stopPropagation()
          setConfirming(false)
        }}
      >
        {/* The grabber says this is a sheet before you have read a word of it. */}
        <div className="sticky top-0 -mx-4 mb-3 bg-card px-4 pb-3 pt-2">
          <div className="mx-auto mb-2.5 h-1 w-9 rounded-full bg-edge" />
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold">{title}</h2>
            <button
              onClick={leave}
              className={`px-2 py-1 text-[12.5px] font-extrabold ${confirming ? 'text-alert' : 'text-muted'}`}
            >
              {confirming ? 'Discard it?' : 'Done'}
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
