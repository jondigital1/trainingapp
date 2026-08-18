'use client'

export type Tab = 'log' | 'records' | 'lifty' | 'profile'

// Four destinations and one action. Starting a workout is the reason the app
// is open, so it sits in the middle where the thumb already is, raised and in
// the accent colour: the one thing on this bar that does something rather than
// takes you somewhere.
const LEFT: NavItem[] = [
  {
    id: 'log',
    label: 'Workout',
    icon: (
      <>
        <rect x="2.5" y="9.5" width="2.5" height="5" rx="1" />
        <rect x="6" y="7" width="3" height="10" rx="1.2" />
        <rect x="10" y="10.75" width="4" height="2.5" rx="1" />
        <rect x="15" y="7" width="3" height="10" rx="1.2" />
        <rect x="19" y="9.5" width="2.5" height="5" rx="1" />
      </>
    ),
  },
  {
    id: 'records',
    label: 'Records',
    icon: (
      <>
        <path d="M7 3.5h10v5a5 5 0 0 1-10 0Z" />
        <path d="M7 5H4.5v1.5A3.5 3.5 0 0 0 8 10V8.5A2 2 0 0 1 7 7Z" />
        <path d="M17 5h2.5v1.5A3.5 3.5 0 0 1 16 10V8.5A2 2 0 0 0 17 7Z" />
        <rect x="10.75" y="13" width="2.5" height="4" rx="1" />
        <rect x="7.5" y="17.5" width="9" height="2.6" rx="1.2" />
      </>
    ),
  },
]

const RIGHT: NavItem[] = [
  {
    id: 'lifty',
    label: 'Ask Lifty',
    icon: (
      <path d="M12 3.5c-4.7 0-8.5 3.2-8.5 7.2 0 2.3 1.3 4.4 3.3 5.7v3.6l3.4-2a10 10 0 0 0 1.8.2c4.7 0 8.5-3.2 8.5-7.5S16.7 3.5 12 3.5Z" />
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: (
      <>
        <circle cx="12" cy="8" r="3.6" />
        <path d="M4.5 20.5c0-3.9 3.4-6.5 7.5-6.5s7.5 2.6 7.5 6.5Z" />
      </>
    ),
  },
]

interface NavItem {
  id: Tab
  label: string
  icon: React.ReactNode
}

function Item({ item, on, onPick }: { item: NavItem; on: boolean; onPick: (tab: Tab) => void }) {
  return (
    <li className="flex-1">
      <button
        onClick={() => onPick(item.id)}
        aria-current={on ? 'page' : undefined}
        className={`flex w-full flex-col items-center gap-1 py-2 ${on ? 'text-accent' : 'text-muted'}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" fill="currentColor">
          {item.icon}
        </svg>
        <span className="text-[11px] leading-none">{item.label}</span>
      </button>
    </li>
  )
}

export default function BottomNav({
  tab,
  onPick,
  onStart,
}: {
  tab: Tab
  onPick: (tab: Tab) => void
  onStart: () => void
}) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg border-t border-edge bg-ink/95 pb-safe-nav backdrop-blur"
    >
      <ul className="flex items-end">
        {LEFT.map((item) => (
          <Item key={item.id} item={item} on={tab === item.id} onPick={onPick} />
        ))}

        <li className="flex-1">
          <button
            onClick={onStart}
            className="flex w-full flex-col items-center gap-1 pb-2"
            aria-label="Start a workout"
          >
            {/* Lifted above the bar rather than merely coloured, so the thumb
                finds it without reading anything. */}
            <span className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-on-accent shadow-lg ring-4 ring-ink">
              <svg viewBox="0 0 24 24" aria-hidden className="h-7 w-7" fill="currentColor">
                <rect x="10.6" y="4.5" width="2.8" height="15" rx="1.4" />
                <rect x="4.5" y="10.6" width="15" height="2.8" rx="1.4" />
              </svg>
            </span>
            <span className="text-[11px] font-medium leading-none text-accent">Start</span>
          </button>
        </li>

        {RIGHT.map((item) => (
          <Item key={item.id} item={item} on={tab === item.id} onPick={onPick} />
        ))}
      </ul>
    </nav>
  )
}
