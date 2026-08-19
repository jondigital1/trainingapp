import LiftyMark from './LiftyMark'

// The bot, saying something.
//
// Two flavours of the same idea, and the difference is who is talking to whom.
// A bubble is a remark: a note on the plan, an answer in Ask Lifty, the line
// under a finished session. A plain chip is coaching on the thing you are
// looking at, so it sits under the sets it is about with no bubble around it.
//
// Either way the mark is there, at 24px, on Midnight. A coach line without a
// face reads as the app talking; with one it reads as somebody talking, which
// is the whole point of having named it.
export default function CoachChip({
  children,
  bubble,
  className = '',
}: {
  children: React.ReactNode
  bubble?: boolean
  className?: string
}) {
  return (
    <div className={`flex items-start gap-2 ${className}`}>
      <span className="mt-px grid h-6 w-6 flex-none place-items-center rounded-full bg-midnight">
        <LiftyMark size={16} />
      </span>
      {bubble ? (
        <span className="rounded-[4px_12px_12px_12px] bg-tint-cool px-3 py-2 text-[13px] leading-relaxed text-bright">
          {children}
        </span>
      ) : (
        <span className="pt-0.5 text-[13px] font-bold leading-snug text-accent-ink">{children}</span>
      )}
    </div>
  )
}
