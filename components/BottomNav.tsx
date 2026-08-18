'use client'

export type Tab = 'calendar' | 'history' | 'lifty' | 'profile'

// Four destinations and one action. Starting a workout is the reason the app
// is open, so it sits in the middle where the thumb already is, raised and in
// the accent colour: the one thing on this bar that does something rather than
// takes you somewhere.
const LEFT: NavItem[] = [
  {
    id: 'calendar',
    label: 'Calendar',
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" fillOpacity="0.2" />
        <rect x="3" y="5" width="18" height="4.5" rx="2" />
        <rect x="6.5" y="2.5" width="2.2" height="4" rx="1.1" />
        <rect x="15.3" y="2.5" width="2.2" height="4" rx="1.1" />
        <rect x="6.5" y="12" width="3.2" height="3.2" rx="1" />
        <rect x="14.3" y="12" width="3.2" height="3.2" rx="1" />
        <rect x="6.5" y="16.6" width="3.2" height="3.2" rx="1" />
      </>
    ),
  },
  {
    id: 'history',
    label: 'History',
    icon: (
      <>
        <path d="M12 4.5a7.5 7.5 0 1 0 7.2 9.6l-2.1-.6A5.4 5.4 0 1 1 12 6.6V9l4-3.4L12 2.2Z" />
        <rect x="11" y="8.5" width="1.9" height="5" rx="0.95" />
        <rect x="11.6" y="11.6" width="4.2" height="1.9" rx="0.95" />
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
