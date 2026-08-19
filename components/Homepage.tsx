import Link from 'next/link'
import LiftyMark from './LiftyMark'

// The page somebody sees before they have an account.
//
// Light only, and drawn from the brand tokens rather than the app's semantic
// ones, because this page is not the app and does not follow the theme a user
// picked inside it. Midnight text on Frost, Lime for the thing you want them
// to press, Deep Teal for the thing you do not mind them pressing, and Cyan
// only on the one dark band, which is the rule the brand guide is firmest
// about.

const CARD = 'rounded-[20px] border border-edge bg-white p-7'
const PILL = 'inline-block rounded-full font-display font-bold transition-colors'
const LIME = `${PILL} bg-lime text-midnight hover:bg-lime-hover`
const OUTLINE = `${PILL} border-2 border-teal text-teal hover:border-lime-deep hover:text-lime-deep`

export default function Homepage() {
  return (
    <div className="min-h-screen bg-frost text-midnight">
      <header className="sticky top-0 z-10 border-b border-hair bg-frost/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-6 px-6 py-3.5 sm:px-8">
          <div className="flex items-center gap-2.5">
            <LiftyMark size={34} />
            <span className="font-display text-[21px] font-bold text-midnight">LiftyBot</span>
          </div>
          <nav className="flex items-center gap-5 text-[14.5px] font-bold sm:gap-6">
            <Link href="/login" className="text-teal hover:text-lime-deep">
              Sign in
            </Link>
            <Link href="/login?mode=signup" className={`${LIME} px-5 py-2.5 text-[15px]`}>
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      {/* Two soft glows, cyan top right and lime bottom left, which is the only
          place either colour appears on a light surface: as light, not as ink. */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 720px 420px at 78% 20%,rgba(127,227,242,0.14),transparent 70%),radial-gradient(ellipse 600px 400px at 12% 90%,rgba(199,228,90,0.14),transparent 70%)',
          }}
        />
        <div className="relative mx-auto grid max-w-[1120px] items-center gap-14 px-6 pb-20 pt-14 sm:px-8 sm:pt-[76px] lg:grid-cols-2">
          <div>
            <p className="inline-flex items-center rounded-full border border-edge bg-white px-3.5 py-1.5 text-[12.5px] font-extrabold tracking-[1.5px] text-teal">
              EARLY ACCESS · FALL 2026
            </p>
            <h1 className="mt-4 font-display text-[42px] font-bold leading-[1.04] tracking-[-0.5px] sm:text-[58px]">
              Train smarter.
              <br />
              Lift heavier.
            </h1>
            <p className="mt-4 max-w-[460px] text-[17px] leading-relaxed text-muted sm:text-[18px]">
              LiftyBot builds your program, watches your bar speed, and coaches every set, a lifting
              buddy with a very visible brain.
            </p>
            <div className="mt-7 flex flex-wrap gap-3.5">
              <Link href="/login?mode=signup" className={`${LIME} px-[30px] py-3.5 text-[17px]`}>
                Sign up
              </Link>
              <Link href="/login" className={`${OUTLINE} px-7 py-3 text-[17px]`}>
                Sign in
              </Link>
            </div>
            <p className="mt-6 text-[13.5px] font-bold text-faint">
              Free during beta · Works with any gym, any gear
            </p>
          </div>

          <ChatCard />
        </div>
      </section>

      <section id="features" className="mx-auto max-w-[1120px] px-6 pt-10 sm:px-8">
        <h2 className="text-center font-display text-[30px] font-semibold tracking-[-0.3px] sm:text-[36px]">
          Strength plus smarts
        </h2>
        <p className="mx-auto mb-9 mt-3 max-w-[520px] text-center leading-relaxed text-muted">
          Everything a good coach does, minus the hourly rate.
        </p>
        <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          <Feature
            tint="lime"
            title="Plans that adapt"
            body="Progressive overload, handled. Every session adjusts to what you actually lifted, not what the spreadsheet hoped."
            icon={
              <>
                <rect x="2" y="9" width="3.5" height="6" rx="1" />
                <rect x="18.5" y="9" width="3.5" height="6" rx="1" />
                <line x1="5.5" y1="12" x2="18.5" y2="12" />
              </>
            }
          />
          <Feature
            tint="cyan"
            title="Cues in real time"
            body="Your phone's camera reads bar speed and range of motion, and LiftyBot calls the cue before the rep gets ugly."
            icon={<polyline points="2,14 6,14 9,6 13,19 16,11 18,14 22,14" />}
          />
          <Feature
            tint="lime"
            title="PRs, remembered"
            body="Every rep logged without typing. When a personal record falls, you'll hear about it, briefly and with feeling."
            icon={
              <>
                <path d="M 5 21 h 14" />
                <path d="M 12 17 v 4" />
                <path d="M 7 3 h 10 v 6 a 5 5 0 0 1 -10 0 Z" />
                <path d="M 17 5 h 3 a 3 3 0 0 1 -3 4" />
                <path d="M 7 5 H 4 a 3 3 0 0 0 3 4" />
              </>
            }
          />
        </div>
      </section>

      <section id="how" className="mx-auto max-w-[1120px] px-6 pt-[84px] sm:px-8">
        <h2 className="text-center font-display text-[30px] font-semibold tracking-[-0.3px] sm:text-[36px]">
          How it works
        </h2>
        <div className="mt-9 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          <Step
            n="01"
            title="Tell it your gear"
            body="Barbell in a garage or a full rack row, LiftyBot builds the plan around what you have."
          />
          <Step
            n="02"
            title="Lift, it watches the bar"
            body="Prop your phone anywhere. It counts reps, reads speed, and talks you through the set."
          />
          <Step
            n="03"
            title="Get next week's plan"
            body="Sunday night, your week arrives: loads, sets, and one honest note on what to fix."
          />
        </div>
      </section>

      {/* The one dark surface, and so the one place Cyan is allowed to be text. */}
      <section className="mx-auto max-w-[1120px] px-6 pt-[84px] sm:px-8">
        <div className="grid place-items-center rounded-[26px] bg-midnight px-8 py-14 text-center">
          <LiftyMark size={110} />
          <p className="mt-6 max-w-[600px] font-display text-[26px] font-semibold leading-[1.25] text-frost sm:text-[32px]">
            &ldquo;New PR. I&rsquo;d flex, but I don&rsquo;t have arms.&rdquo;
          </p>
          <p className="mt-3.5 text-[13px] font-extrabold tracking-[2px] text-cyan">
            LIFTYBOT · AFTER YOUR NEXT DEADLIFT DAY
          </p>
        </div>
      </section>

      <section id="access" className="mx-auto max-w-[1120px] px-6 pb-10 pt-24 text-center sm:px-8">
        <h2 className="font-display text-[34px] font-bold tracking-[-0.4px] sm:text-[42px]">
          Early access opens this fall.
        </h2>
        <p className="mx-auto mt-3.5 max-w-[440px] leading-relaxed text-muted">
          First wave gets the beta free, and a say in what LiftyBot learns next.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3.5">
          <Link href="/login?mode=signup" className={`${LIME} px-8 py-3.5 text-[17px]`}>
            Sign up
          </Link>
          <Link href="/login" className={`${OUTLINE} px-[30px] py-3 text-[17px]`}>
            Sign in
          </Link>
        </div>
      </section>

      <footer className="mt-14 border-t border-hair">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3.5 px-6 py-6 sm:px-8">
          <div className="flex items-center gap-2.5">
            <LiftyMark size={24} />
            <span className="font-display text-[15px] font-bold text-midnight">LiftyBot</span>
          </div>
          <Link href="/login?mode=signup" className="text-[13.5px] font-bold text-teal hover:text-lime-deep">
            Sign up
          </Link>
          <p className="text-[13px] font-bold text-faint">© 2026 LiftyBot</p>
        </div>
      </footer>
    </div>
  )
}

function Feature({
  tint,
  title,
  body,
  icon,
}: {
  tint: 'lime' | 'cyan'
  title: string
  body: string
  icon: React.ReactNode
}) {
  return (
    <div className={CARD}>
      <div
        className={`grid h-12 w-12 place-items-center rounded-[14px] ${
          tint === 'lime' ? 'bg-lime-tint' : 'bg-cyan-tint'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          width="26"
          height="26"
          fill="none"
          stroke={tint === 'lime' ? '#7A9A1F' : '#0E7F98'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          {icon}
        </svg>
      </div>
      <h3 className="mt-4 font-display text-[21px] font-semibold">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">{body}</p>
    </div>
  )
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className={CARD}>
      <p className="font-display text-[15px] font-bold tracking-[3px] text-lime-deep">{n}</p>
      <h3 className="mt-2.5 font-display text-[20px] font-semibold">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">{body}</p>
    </div>
  )
}

// A picture of a conversation, not a widget. Static on purpose.
function ChatCard() {
  return (
    <div className="grid place-items-center">
      <div className="w-full max-w-[380px] overflow-hidden rounded-3xl border border-edge bg-white shadow-[0_20px_50px_rgba(11,18,29,0.10)]">
        <div className="flex items-center gap-2.5 border-b border-[#EAF0F6] px-[18px] py-3.5">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-midnight">
            <LiftyMark size={27} />
          </div>
          <div>
            <p className="font-display text-[16px] font-bold leading-tight">LiftyBot</p>
            <p className="text-xs font-bold text-teal">Coaching · Bench day</p>
          </div>
          <p className="ml-auto text-[11.5px] font-extrabold tracking-[1px] text-faint">LIVE</p>
        </div>
        <div className="flex flex-col gap-2.5 p-[18px]">
          <p className="max-w-[85%] self-start rounded-[4px_14px_14px_14px] bg-cyan-tint px-3.5 py-2.5 text-sm leading-normal">
            Warm-up logged. Working weight today: <strong>62.5 kg</strong>, bar speed says you&rsquo;ve
            got it.
          </p>
          <p className="max-w-[75%] self-end rounded-[14px_4px_14px_14px] bg-lime-tint px-3.5 py-2.5 text-sm leading-normal">
            felt easy tbh
          </p>
          <p className="max-w-[85%] self-start rounded-[4px_14px_14px_14px] bg-cyan-tint px-3.5 py-2.5 text-sm leading-normal">
            Good. Last set: slow on the way down, I&rsquo;m counting.
          </p>
          <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-hair bg-frost px-3.5 py-3">
            <p className="text-xs font-extrabold tracking-[1.2px] text-teal">SET 3 · 8 REPS · 62.5 KG</p>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-hair">
              <div className="h-full w-[66%] rounded-full bg-lime" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
