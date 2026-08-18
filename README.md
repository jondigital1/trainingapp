# Training Log

The artifact build, moved onto Next.js, Supabase and Vercel. Same app: log every
set, see what you did last time on the line above the inputs, get told what to do
next when the reps say the load should move.

## Why it moved

Artifact storage does not follow the code between threads, so the history was one
lost thread away from gone. Postgres holds it now, the phone is just a client, and
everything can leave as CSV.

## Ask Lifty

A built-in knowledge base on the nav bar: 45
answers across the basics (supersets, drop sets, how hard to push, soreness,
failure), getting
stronger (double progression, increment sizes, plateaus, deloads), the app
itself, and what its numbers mean. Before you have asked anything it shows
four questions and four topic chips, not a wall of forty five: a suggestion
list long enough to scroll is the thing a search box exists to avoid. Search is
local scoring over authored text and nothing else: a question Lifty cannot
answer says so plainly instead of guessing, and nothing ever searches the
internet. Nutrition, supplements and
pain are answered with an honest gate rather than silence. lib/knowledge.ts is
the content, sourced from the beginner questions people actually ask.

## Getting around

Four destinations and one action across the bottom: Workout, Records, Start,
Ask Lifty, Profile. Starting a workout is the reason the app is open, so it
sits in the middle where the thumb already is, raised off the bar and in the
accent colour: the one thing there that does something rather than takes you
somewhere. Profile sits far right, where every phone puts it.

Each destination is a place you can be rather than a sheet that opens over
where you were, because a nav bar whose items open modals is a menu in a nav
bar's clothes. Ask Lifty and Profile carry the same content in either frame,
and the card colour resolves from the frame rather than each card guessing what
is behind it.

Workout is today's sessions with everything earlier underneath, since the log
is the history and splitting them was a tab that need not have existed. Records
answers how am I doing, in three views: this week, all time, and the charts.
The rest timer sits on a shelf just above the bar, off one measurement defined
once, and the bar itself carries the home indicator inset.

## Appearance

Light and dark, from one token set. The app follows the device by default, pure
CSS, and Settings carries a System / Light / Dark choice that beats the device
and survives reload without a flash. The accent darkens in light mode so small
accent text keeps its contrast on white.

## Setup

1. Create a Supabase project.
2. Run the files in `supabase/migrations/` in the SQL editor, in order, 0001 to
   0007. Clear the editor before each paste: a partial paste fails in confusing
   places. They create the seven tables, the indexes, one row level security
   policy per table so every row is readable only by the user that owns it, the
   atomic save function, the superset and drop set columns, the bodyweight
   table, and the start, end and score on a session.
3. In Authentication then URL Configuration, add `https://YOUR-DOMAIN/auth/callback`
   as a redirect URL. That one URL covers all three mail flows: confirmation,
   password reset and the magic link.
4. Copy `.env.example` to `.env.local` and fill in the project URL and anon key.
5. `npm install` then `npm run dev`.

Deploying to Vercel: import the repo, leave the root directory alone since the
app is the repo, add the same two environment variables, done. Set the framework
preset to Next.js if Vercel has not worked it out.

## Signing in

Email and a password, at least 8 characters. A magic link is four steps and
assumes the mail is on the phone you are standing in the gym with, so it is
still here, one tap away under the password box, but it is no longer the only
door. Forgotten passwords go out as a reset link that lands on a page to set a
new one.

Every mail flow lands on `/auth/callback`, which trades the code for a session
cookie and forwards on. Where it forwards is checked: a path on this site and
nothing else, since `//evil.example` is a valid relative URL that a browser
reads as a link to somewhere else entirely.

A one time code by text is the next thing here. It needs an SMS provider
configured in Supabase, which is a paid account with Twilio or similar, so it
is a decision to make rather than code to write.

## Records

The all time view for the numbers that only go up: sessions, sets, reps
and total pounds lifted, the week streak you are on, the longest one you have
ever strung together, and the heaviest set you have put up on each of the
movements you train most. A bad month does not delete the winter you strung
twelve weeks together, which is the whole reason the longest streak sits next
to the current one. Beside it, this week carries the streak, the 28 day grid
and the muscle coverage, and charts carries the progression lines and
bodyweight.

## Bringing the artifact history over

Open the v4 artifact, read `training-data-v2` out of `window.storage`, copy the
JSON. In this app, Settings then paste it into the import box. The importer takes
the v2 shape and the v1 `workout-log` shape, parses old string sets like
`135x8 @8` and `20:00 2.1mi` back into fields, and mints fresh uuids because
Postgres wants uuids and the artifact did not use them.

## Layout

    app/                  routes, the auth gate and the magic link callback
    components/App.tsx    tabs, state, the debounced writer
    components/           editor, exercise block, set row, picker, builder, sheets
    components/Form.tsx   the form vocabulary the questionnaire and profile share
    components/BottomNav.tsx   four destinations and the start button
    lib/exercises.ts      226 movements across 14 muscle groups, each typed
    lib/onboarding.ts     the questions, the scoring, the three programs, the swaps
    lib/units.ts          pounds in the database, kilos on the screen
    lib/body.ts           bodyweight against day one, the goal, and a weekly average
    lib/gamify.ts         records, beat the ghost, coverage, the grid, the streak
    lib/block.ts          the six week training block and what each week asks
    lib/session.ts        start, end, duration and the 1 to 10 dial
    lib/rest.ts           when a set counts as done and how long it earns
    lib/superset.ts       which consecutive exercises run together
    lib/progress.ts       one point per movement per day, and what to measure
    lib/order.ts          hardest first, and moving things by hand
    lib/columns.ts        what each column of a set row is, per movement type
    lib/templates.ts      6 splits, 24 days
    lib/redirect.ts       an auth redirect can only land on this site
    lib/coach.ts          goal rep ranges and double progression
    lib/importer.ts       artifact v1 and v2 blobs in
    lib/csv.ts            one row per set out
    lib/db.ts             every read and write
    supabase/migrations/  schema and row level security

## Set types

Each exercise names its columns above the rows rather than leaning on
placeholder text, because a placeholder disappears the moment you type and
`80 9` is two anonymous numbers.

    W   weight and reps
    R   reps only
    T   time
    WD  weight and distance in feet
    C   cardio, time and optional miles

## Writes

Edits land in React state immediately and reach Postgres a beat later, so typing
a set never waits on the network. A workout saves whole in one save_workout call.

A failed save is never dropped. The queue holds it, retries with backoff, and
flushes again the moment the connection returns. Everything unsaved is also
mirrored to the device, keyed per user and per tab, so a tab that dies offline
replays its work on the next open. Deletes ride the same queue. A dead
connection gets a reassuring banner; a real rejection shows its message. What
does not exist yet is offline boot: reloading with no network still cannot
load the app itself.

## Checks

`npm run check` is 75 assertions over everything that is pure logic: the movement
library, the template days, the coach, the importer including drop set shorthand,
CSV, the onboarding score and the three programs, the joint substitutions,
records, rest timing, supersets, drop sets, the charts, the ordering
rules, the check-in gating, unit conversion, the bodyweight summary, the
lifetime record, the redirect guard, the set row columns, session duration and
scoring, the six week block, and the knowledge base gate. Every program
is walked across every day count it offers, so a week nobody has tried cannot
point at a template day that does not exist. `npm run build` type checks the app.

The schema is checked differently, by running it. All seven migrations have
been executed against a real PostgreSQL 16, which creates the seven tables, the
indexes and the policies clean; `save_workout` has been called with a payload
carrying a superset tag and a drop set to confirm both survive the round trip;
a session has been saved with a start, an end and a score, re-saved to confirm
it updates rather than duplicates, and a score of 11 confirmed refused by the
constraint; and a bodyweight has been written twice on the same date to confirm
the second reading edits the first rather than doubling it.

The questionnaire is checked by driving it. A headless browser walks all five
sections at phone size, fills every field, steps back through the rail to
confirm the answers survive navigation, and reads what comes out the far end:
the program, the split, the day it starts on, the weight in pounds and the
height in inches. The same pass drives a three day week and a seven day week,
the sign in form including the password rule and the expired link notice, and
the profile page saving a weigh in.

## Onboarding

First sign in lands straight in the first question. There is no splash to tap
through: the account is new, there is no history to look at, and the plan is
the reason they are here. Skipping is still one line away at the bottom of the
first screen.

Each section fits a phone screen without scrolling, give or take the last one,
so browsing it is tapping rather than hunting. Options sit two to a row where
the labels allow it.

Five sections rather than a dozen full screen taps, because answers that belong
together should be asked together: who you are, what you have done, what your
week looks like, where your body is starting from, then the plan. Nothing is
required, the rail at the top walks back to any section you have been through,
and every answer is editable afterwards on the profile page using the same
controls, so a question does not look like one thing on the way in and
something else on the way back.

Settings carries a row to run it again, which starts from the answers already
given rather than from nothing: changing your mind about one of them should not
mean typing the other twelve a second time. Nothing logged is touched, and the
weigh in box on a rerun is a fresh reading rather than a new day one.

The answers land you on one of three programs.

    Foundation    Learn the movements, build the habit, add weight as it gets easy
    Build         You know the lifts. Now add muscle and load, one session at a time
    Performance   Long training age. Six week training blocks from day one

Four questions score it: training age, whether you have trained seriously
before, whether you could name the weight you last used, and barbell
confidence. That last pair matters. The weights question is the most honest
experience question there is, and asking about the barbell up front is what
makes the top tier reachable at all, which the version this replaced never was.
Landing on Performance starts a six week block on day one rather than making
somebody who has trained for years go hunting for structure in Settings.

The program then picks a split from the 24 template days, decides how many
movements fit the session length, swaps movements around sore joints, and
filters to the equipment on hand. Three days a week through six, and the number
you give is the number you get: six used to be quietly served back as five,
which is the app telling somebody what their week is. Six is push pull legs
twice through, and the plan says once that six weeks in a row is a lot rather
than arguing about it every time you open the app.

Two and seven are not offered. Two is not enough to hold a split together, and
seven leaves no rest day at all. A profile that still says two or seven from
before is clamped into the range rather than pointing at a week that no longer
exists. Somebody rebuilding after a layoff gets a
note and a gentler first month, not a beginner course.

Two health questions sit at the end of the body section, and a flagged answer
is a lighter plan rather than a paragraph: fewer sets, no effort targets to
chase and no block, whatever the experience score said. The goal you pick is
never quietly rewritten either. Leaning out runs as muscle work and staying
capable runs as endurance work, and the plan screen says so in as many words.

Tier 2 questions still arrive later, in context: how long you have got at the
first session start, sore joints on a visit after a session is behind you.
Four weeks in, if the last four weeks ran thin, the app offers the shorter plan
exactly once: either answer is final, and the sore joints question is a quiet
card on the log tab rather than anything that blocks a tap.

`docs/onboarding-research.md` is the evidence and the tables.
`docs/onboarding-prototype.html` is the clickable version of every screen.
`lib/onboarding.ts` is the implementation.

## Bodyweight

Its own table, one reading per day, stored in pounds like every other load
here. Weighing again the same morning replaces the number rather than adding a
second point, because weighing twice before breakfast is noise.

It sits on the Progress tab beside the lifts on purpose: strength climbing
while bodyweight holds is a different story from both climbing together, and
the two lines have to be in the same place to tell them apart. The card carries
the current number, day one and the date it was taken, the change between them,
and the road to a goal weight if you set one. The line is a seven day average
rather than the raw readings, since day to day swings are water and a big
dinner, and a chart of those tells a story that is not happening.

## Units

Pounds or kilos, set on the profile and applied at the edges. The database
never changes: switching shows you the same history re-expressed rather than a
different history.

## What the log gives back

PRs fire on four things and are flagged on the set as you type it: heaviest
load, most reps at that load or heavier, best estimated max (Epley, so 80 x 9
beats 80 x 8 without touching the plates), and best session volume for that
movement. A grindy single does not count as a record unless strength is the
stated goal.

Beat the ghost: a set that clears the same numbered set from last session gets a
quiet mark. Different bar to a PR, and it fires far more often.

History carries the last 28 days as a dot per day and the week streak, counted in
weeks that met the days you said rather than consecutive days, so a rest day
costs nothing. Under it, sets per muscle group this week against the 10 set
target, which is the only number here that tells you what to do differently.

## Order

Sessions generated from the plan come out hardest first: multi joint before
single joint, big muscle before small, and heavier before lighter judged on this
person's own logged numbers. A day picked by name from the templates, or built by
hand, keeps the order it was written in: ordering with intent is not a mistake to
correct, so the app neither re-sorts it nor offers to.

Arrows on each exercise move it by hand, and a superset moves as one thing. On
generated sessions only, pushing something genuinely out of order surfaces an
offer to put the hardest back at the front.

## Progression charts

A third tab. One chart per movement, never two movements on one axis: a leg press
and a lateral raise sharing a scale says nothing true. Weighted work is charted on
the estimated max, so a rep added at the same load shows up as progress, and
everything else on the thing it is measured in.

Each chart carries the current number, the change since the first session, a
crosshair you can drag along to read any session, and a Numbers toggle that opens
the same data as a table. A movement needs two sessions before it gets a line. The
top three by frequency show by default, which surfaces the numbers somebody
actually tracks without asking which they are.

## Supersets

The picker and the workout builder both carry a Superset toggle. Turn it on and
everything you pick joins the same group until you turn it off, so two taps and
two movements is a superset. Saved workouts keep their groups. Templates can
carry them too: the core circuit in the 4 day and 5 day splits is one, and
the session time cap treats a group as atomic, whole or absent, never sliced.
In a session, a Link button between any two neighbouring blocks joins them, and
Unlink puts them back. Supersets render as one block, labelled A1 and A2, and
the rest timer waits for the last movement in the group rather than firing
between them, which is the only thing about a superset the app actually has to
understand.

A superset is a tag shared by consecutive exercises, not a table. Order on screen
is the order they run in, so the same tag either side of a gap is two supersets,
and a tagged movement on its own is just a movement.

## Drop sets

A Drop button sits next to Add set on any weighted exercise once the last row
has a load on it. It adds a row tagged DROP, seeded at 80 percent of that load
rounded to real plates. It carries no set number of its own, because it is a
continuation of the set above it rather than a set in its own right.

Drops count toward volume and they are excluded from everything comparative:
records, the ghost line, the top set in history, and the coach line, which reads
your last working set. The importer understands the shorthand from the artifact
days too, so a pasted `130x15 110x15` becomes a working set with a drop attached.

## Rest timer

Starts itself the moment a set becomes a set, which is the moment you want it,
and not before: a load with no reps beside it is half a set and starts nothing.
The suggested length comes from the movement and the goal, longer for the big
lifts, shorter for the arms and calves, none at all for cardio. There is a manual
button on every exercise for the times it guesses wrong.

The bar counts to an end timestamp rather than ticking a number down, so locking
the phone or reloading the page gives back the right number. It buzzes and beeps
once at zero. Editing a past session never starts anything.

## Sessions

A workout has a start and an end, so it has a duration. Starting one stamps the
clock; a bar at the top of the live session counts up from that timestamp
rather than ticking a counter, so locking the phone gives back the right
number. End workout closes it.

Then one question, once: **how was that, 1 to 10**, on a dial that names every
number rather than leaving you to guess what a 7 is. 1 is easy peasy and 10 is
what was I thinking. Skipping is fine, and the question stays available on the
session afterwards rather than being lost.

That one number replaced per-set RPE, which is gone. RPE asked you to estimate
reps in reserve while out of breath, between sets, ten times a session, and
beginners are wrong about it by 4 to 5 reps. One honest answer after the fact
beats ten guesses during. The set row is down to weight and reps, and the coach
line runs double progression on the reps you actually did: one more rep at the
same load until you clear the top of the range, then about 5 percent more
weight and back to the bottom of it.

Sessions logged before any of this existed carry no start, no end and no score.
That is the honest answer for them rather than a number invented afterwards.

## Training blocks

Optional, off by default, switched on in Settings. Six weeks: a groove week to
find the loads, two build weeks at two in reserve, a push week at one, a peak
week where last sets go to the end, then a deload at half the sets.

Six is the floor rather than the target. The three week cycle this replaced was
too short to be a block at all: the cycle restarted before the body had
finished adapting to it, and there was no deload, so it was just the same three
weeks forever. The deload is the point of having a block, since it is the week
the other five turn into progress.

The card on the Workout tab says which block and which week, what the week asks
for on the same 1 to 10 dial the session score uses, and reads your scores this
week back against it. A weekly cycle read from one number a session is a
straighter line than one averaged from numbers scribbled between sets.

## All time

Total lifted, sessions and sets, each with the next round number to chase, plus
reps and time under holds. The only numbers here that never go down, which is
what makes them worth having on a bad week.

## Not built yet

Everything on the original backlog is built, the migrations have run, and the app
is deployed. What is genuinely missing:

Offline boot. Unsaved work survives a dead connection and replays, but opening
the app cold with no network still fails, because the app itself has to come down
the wire. A service worker fixes it.

A one time code by text. The password is in, and the code by text is the half
that needs an SMS provider on the Supabase project before there is anything to
write.

Deleting your account. Everything can leave as CSV, but there is no button that
takes it all away.
