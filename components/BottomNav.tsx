'use client'

export type Tab = 'calendar' | 'progress' | 'lifty' | 'profile'

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
    // Was History, which the month calendar made redundant as a navigator:
    // tapping a filled day opens what you did, and the sessions themselves
    // moved onto the Calendar tab underneath it. The slot went to the numbers,
    // which were three taps deep inside a form and which nobody would guess
    // lived there.
    id: 'progress',
    label: 'Progress',
    icon: (
      <>
        <rect x="3.2" y="13" width="3.6" height="7.5" rx="1.4" />
        <rect x="10.2" y="8.5" width="3.6" height="12" rx="1.4" />
        <rect x="17.2" y="4" width="3.6" height="16.5" rx="1.4" />
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
        className={`flex w-full flex-col items-center gap-1 py-2 ${on ? 'text-accent-ink' : 'text-faint'}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden className="h-[22px] w-[22px]" fill="currentColor">
          {item.icon}
        </svg>
        <span className="text-[10.5px] font-extrabold leading-none">{item.label}</span>
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
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg border-t border-edge bg-ink/97 pb-safe-nav backdrop-blur"
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
            <span className="-mt-[26px] flex h-[54px] w-[54px] items-center justify-center rounded-full bg-accent text-on-accent shadow-[0_6px_16px_rgba(122,154,31,0.4)] ring-4 ring-ink">
              <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" fill="currentColor">
                <rect x="10.6" y="4.5" width="2.8" height="15" rx="1.4" />
                <rect x="4.5" y="10.6" width="15" height="2.8" rx="1.4" />
              </svg>
            </span>
            <span className="text-[10.5px] font-extrabold leading-none text-lime-ink">Start</span>
          </button>
        </li>

        {RIGHT.map((item) => (
          <Item key={item.id} item={item} on={tab === item.id} onPick={onPick} />
        ))}
      </ul>
    </nav>
  )
}
