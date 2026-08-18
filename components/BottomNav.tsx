'use client'

export type Tab = 'log' | 'history' | 'progress' | 'lifty' | 'profile'

// Five destinations, which is the most a thumb can hit reliably across the
// bottom of a phone. Each one is a place you can be, not a modal that opens
// over where you were: a nav bar whose items open sheets is a menu wearing a
// nav bar's clothes.
const ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
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
    id: 'history',
    label: 'History',
    icon: (
      <>
        <rect x="3" y="4.5" width="18" height="16" rx="3" fillOpacity="0.25" />
        <rect x="3" y="4.5" width="18" height="4" rx="2" />
        <circle cx="8" cy="13" r="1.4" />
        <circle cx="12" cy="13" r="1.4" />
        <circle cx="16" cy="13" r="1.4" />
        <circle cx="8" cy="17" r="1.4" />
        <circle cx="12" cy="17" r="1.4" />
      </>
    ),
  },
  {
    id: 'progress',
    label: 'Progress',
    icon: (
      <>
        <rect x="3" y="14" width="4" height="6.5" rx="1.4" />
        <rect x="10" y="9" width="4" height="11.5" rx="1.4" />
        <rect x="17" y="4" width="4" height="16.5" rx="1.4" />
      </>
    ),
  },
  {
    id: 'lifty',
    label: 'Ask Lifty',
    icon: (
      <>
        <path d="M12 3.5c-4.7 0-8.5 3.2-8.5 7.2 0 2.3 1.3 4.4 3.3 5.7v3.6l3.4-2a10 10 0 0 0 1.8.2c4.7 0 8.5-3.2 8.5-7.5S16.7 3.5 12 3.5Z" />
      </>
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

export default function BottomNav({ tab, onPick }: { tab: Tab; onPick: (tab: Tab) => void }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg border-t border-edge bg-ink/95 pb-safe-nav backdrop-blur"
    >
      <ul className="flex">
        {ITEMS.map((item) => {
          const on = tab === item.id
          return (
            <li key={item.id} className="flex-1">
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
        })}
      </ul>
    </nav>
  )
}
