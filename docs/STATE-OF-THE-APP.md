# LiftyBot: what exists, as of 22 August 2026

Written to be read cold by someone who has never seen this codebase, so that they
can estimate what it would cost to take it to the App Store. Everything below was
measured from the repository rather than remembered. Where something is missing or
half built, it says so.

Repository: `jondigital1/trainingapp`. Live at liftybot.com. 184 commits.

---

## 1. What it is today

A workout logging PWA. Installable to a home screen, works offline, no App Store
presence of any kind. It is one codebase serving a mobile web app; there is no
native code, no Xcode project, no Swift, no React Native, no Capacitor.

**Stack**

| Layer | What |
|---|---|
| Framework | Next.js 16, App Router, React 19, TypeScript |
| Styling | Tailwind 4, custom `@theme` tokens, no component library |
| Backend | Supabase (Postgres, Auth, row level security) |
| Hosting | Vercel, auto deploy from `main` |
| Push | `web-push`, VAPID, own service worker |
| Model | Anthropic API, Claude Opus 5, server route only |

Eight runtime dependencies in total. No UI kit, no state library, no ORM, no
analytics SDK, no error reporting SDK.

**Size**

| | |
|---|---|
| Source files | 111 TypeScript / TSX |
| Application code | ~20,500 lines |
| React components | 48 |
| Test suite | 6,267 lines, 232 assertions |
| Database tables | 13 |
| API routes | 5, plus an auth callback |
| Pages | 4 (`/`, `/login`, `/reset`, `/w/[share]`) |
| Migrations | 16 |

The app is essentially one page. `app/page.tsx` mounts a single client component
that owns all state and switches tabs internally.

---

## 2. Features that actually work

**Logging.** Log sets by weight and reps, by reps only, by time, by distance, or
as cardio. Previous session shows as a ghost line above the inputs and prefills.
Rest timer with a push alert that fires with the screen off. Drop sets. Session
notes. Perceived intensity at the end. Duration.

**Supersets.** Any two adjacent movements join at the seam between them; any
number in a row makes a group of any size. One rest clock per group, set by the
hungriest movement in it. Splitting a group at a seam leaves both halves standing.

**Plans.** An onboarding questionnaire produces a training split from days
available, session length, equipment, goal, sore joints, age, barbell confidence,
and dislikes. Six splits across 24 distinct named session days. Plans rebuild in
place when equipment changes. A deload nudge after six consecutive weeks.

**Session generator.** Pick up to three muscle groups and a session length and it
builds a balanced session that fits the clock. Time model validated against three
real logged one hour sessions: predicted 64, 64 and 57 minutes against 60 actual.

**Exercise library.** 320 movements across 15 muscle groups, multi group tagging,
plural tolerant search, equipment classification, and user created movements that
file themselves alongside the built in ones.

**Custom workouts.** Build by hand or have one generated, save for later or start
now, edit, copy, share by link, delete.

**Progress.** Per movement charts, estimated one rep max, personal bests, body
weight tracking, volume and set counts, a calendar.

**Ask Lifty.** 145 hand written answers. As of this week a Claude Opus 5 route
answers over the top of them, grounded in the person's last twelve sessions. Dark
until `ANTHROPIC_API_KEY` is set, and currently unset in production.

**Housekeeping.** CSV import and export, PDF session sharing, weekly push nudge,
account deletion, an admin dashboard.

**Row level security is complete.** All 13 tables have RLS enabled. The 11 user
owned tables each carry an owner policy keyed on `auth.uid()`. The two admin
tables have RLS on with all grants revoked from `anon` and `authenticated`, which
denies everything except the service role. The service role key is server side
only, behind a `server-only` import, and a check walks every file in `components`
and `lib` to prove nothing else reads it. The same check now covers the Anthropic
key. Sensitive profile fields never reach the admin screen or a share link, and
that is enforced by a check rather than by convention.

---

## 3. What is missing for the App Store

This is the part a costing exercise most needs, because none of it exists.

**There is no app.** No native project, no wrapper, no build pipeline producing a
binary. The choice between a WKWebView wrapper, Capacitor, React Native, or a
native rewrite has not been made, and the four differ by roughly an order of
magnitude in cost.

**No Apple Developer account** ($99/year), no bundle identifier, no provisioning,
no signing, no TestFlight.

**No icon set or store assets.** `public/` contains one SVG favicon. The web
manifest points at `/icons/192` and `/icons/512` which are generated routes, not
files. An App Store submission needs a full icon set, screenshots at several
device sizes, a preview video if wanted, and store copy.

**No payments.** Nothing in the codebase touches billing. There is no paywall, no
subscription, no entitlement check, no receipt validation. If the app charges,
Apple's in app purchase is mandatory for digital goods and takes 15 to 30 percent.

**No privacy paperwork.** No privacy policy page, no App Privacy nutrition labels,
no `PrivacyInfo.xcprivacy` manifest, no third party SDK disclosures. Account
deletion exists in the app, which Apple requires, so that box is already ticked.

**Push works differently on iOS.** Web push currently requires the user to add the
site to their home screen. A native app uses APNs instead, which means an APNs
key, a different token flow, and rewriting the `push_devices` path.

**No HealthKit, no Apple Watch, no Sign in with Apple.** Sign in with Apple
becomes mandatory the moment any other third party sign in is offered. Today auth
is email and password plus a magic link, so it is not yet triggered, but it is a
likely reviewer conversation.

**App Review itself** is a real cost. Health and fitness apps get scrutiny, and
an AI coach answering training questions invites more. The prompt already forbids
diagnosing anything and routes pain to a professional, which helps, but expect at
least one rejection cycle.

---

## 4. Honest technical debt

Things that work fine for one user and will not survive a store launch.

**The admin dashboard reads whole tables.** `lib/adminData.ts` says so in a
comment: "Whole table, like the rest of this file, and for the same reason: there
is one user today." Every admin view needs pagination and filtering before there
are thousands of rows.

**No CI.** No `.github/workflows`. The 232 checks and the typecheck run when
someone runs them by hand. A team, or an app store release train, needs them
gated on every push.

**No error monitoring.** Nothing reports a runtime exception from a real device.
Today a crash on someone's phone is invisible.

**No end to end tests.** The 232 checks are logic tests and source reading
invariants. They are unusually thorough about behaviour rules, but nothing drives
a real browser in CI. Screens are verified by rendering probes by hand during
development, which does not survive as a regression net.

**Migrations are applied by hand** in the Supabase SQL editor. There is no
migration runner in the deploy.

**Single Supabase project.** No staging environment; `main` deploys to production.

**No load testing.** Nothing here has been run against more than a handful of
rows or a single concurrent user.

---

## 5. Running costs today

| | |
|---|---|
| Vercel | Free tier |
| Supabase | Free tier |
| Domain | ~$15/year |
| Anthropic | Roughly $0.008 per question asked, after caching. Currently $0 because the key is unset |

Nothing here has been load tested. The free tiers are the binding constraint at
any real user count, not the model spend.

---

## 6. What to ask the costing thread

Useful framing, since the number swings enormously on these:

1. **Wrapper or rewrite?** A WKWebView or Capacitor shell around the existing PWA
   is weeks. A native rewrite is months and throws away most of the 20,500 lines.
2. **Free, paid, or subscription?** Subscription means IAP, entitlements, receipt
   validation, restore purchases, and a server side source of truth for who has
   paid. None of that exists.
3. **iOS only, or Android too?** Play Store has its own account, review, and
   billing work.
4. **Does it need HealthKit, Watch, or Live Activities?** Each is a real project.
5. **Who operates it after launch?** Support, review responses, incident
   response, and OS version churn are ongoing, not one off.

---

## 7. Reproducing these numbers

```
find app components lib -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1
npm run check        # 232 assertions
npm run typecheck
npm run build
```
