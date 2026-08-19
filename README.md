# LiftyBot

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

## Your week

Which session lands on which day, Sunday through Saturday. Days of the week
rather than dates, because training repeats weekly: say Push on Monday once and
it is Push every Monday, with nothing to fill in again. Lay out my plan spreads
the sessions across the days most people train and leaves the weekend clear
until there are more sessions than weekdays, and every day can then be moved by
hand.

The Calendar tab opens on what today asks of you, the next ten sessions the
schedule holds with real dates on them, and the streak beside it. The strip
used to be a fixed Sunday to Saturday grid, which spent cells on rest days and
was mostly over by Friday; it now rolls forward, Mon 25, Tue 26, Thu 28,
skipping rest days entirely, today riding along until it is done. Every cell
opens its day for reading, with Start as its own tap inside, so what next
Thursday holds is one tap away and cannot start by accident. The streak was
three taps deep before, which is no use for a number whose whole job is that
you do not want to see it end. Once a schedule exists the streak counts
against the days it asks for rather than the number the questionnaire once
took.

Nothing about it is a rule. Training on a rest day is fine and a session on the
wrong day still counts toward the week: the schedule is a plan, not a gate.

A week runs Sunday to Saturday, defined once in `lib/schedule.ts` and used by
the streak, the coverage count and the training block, so the strip and the
number beside it can never disagree about which week you are in.

## The homepage

Signed out, `/` is a page that says what LiftyBot is. It used to bounce straight
to the login form, which is a door with no building attached to it. Signed in,
the same address is the app.

It is light only, on purpose. It is not the app and does not follow the theme
somebody picked inside it. Sign up and Sign in are the only two things on it,
and Sign up lands on the create-account tab rather than making you find it.

## Getting around

Four destinations and one action across the bottom: Calendar, History, Start,
Ask Lifty, Profile. Starting a workout is the reason the app is open, so it
sits in the middle where the thumb already is, raised off the bar and in the
accent colour: the one thing there that does something rather than takes you
somewhere. Profile sits far right, where every phone puts it.

Each destination is a place you can be rather than a sheet that opens over
where you were, because a nav bar whose items open modals is a menu in a nav
bar's clothes. Ask Lifty and Profile carry the same content in either frame,
and the card colour resolves from the frame rather than each card guessing what
is behind it.

Calendar is the week and whatever you are logging today. Every day of it is a
way into a session, which is the second door: Start picks any workout, the
calendar picks the one your week says belongs to that day. History is
everything behind you.

Records moved onto the profile, next to your bodyweight, because both are
things you go and look at rather than places you work. It keeps its three
views there: this week, all time, and the charts.

The rest timer sits on a shelf just above the bar, off one measurement defined
once, and the bar itself carries the home indicator inset.

## Brand

The palette, the type and the mark come from the LiftyBot brand guide, and the
app is drawn from the same tokens as the marketing page rather than a second
set that drifts.

Midnight `#0B121D` leads and Screen Navy `#131D2B` is the surface, which is the
robot's own screen. Frost `#F5F8FB` is the light background and the body text on
dark. Lift Lime `#C7E45A` is action. Coach Cyan `#7FE3F2` supports.

Two accent tokens, not one, because the guide is explicit that Lime and Cyan are
display colours and neither may be set as text on Frost. So `accent` is the
action fill, always Lime with Midnight on top, and `accent-ink` is what accent
text and outlines take: Deep Teal `#0E7F98` on light, Coach Cyan on dark. Every
button in the app is the same green in both themes; every coach line, record
label and focus ring changes colour with the theme, because it has to.

Baloo 2 carries headings, the wordmark and buttons; Nunito Sans does the body
and the UI. Both are self hosted by `next/font`, so nothing is fetched from
Google at runtime and gym wifi never delays a heading.

The mark is drawn once into the document as a hidden SVG sprite and referenced
by every place that shows it, which keeps the gradient ids unique however many
marks are on a page. The app icons are rasterised from that same vector at build
time rather than committed as PNGs, so there is one definition of the logo in
this repo and the icons cannot drift away from it.

## Selection is not action

The one rule the whole interface hangs off. Lime means two things and only two:
the single primary action on a view, and work you have finished. Nothing else
is allowed to be green.

So a chosen option is not a lime block any more. It is the card colour with an
accent-ink edge and a check, which reads as picked without competing with the
button you are meant to press next. Six answered questions used to look like six
primary actions.

What stays lime: Start, Save, End workout, Save and add, Nice one, Skip on the
rest bar, the day boxes you have trained, the filled rows of a set you have
done, the days in the 28 day grid. What turns into an outline: every option
list, every chip, the goal rows, the theme picker, the schedule picker, the
picker's superset toggle. What turns Midnight: the two places a filter is a
mode rather than a choice, the picker's muscle groups and the profile's section
tabs.

Deleting an account is the one destructive thing here, and it now has its own
colour rather than borrowing the colour of Save.

## Coach chips

When the app has something to say, it says it with a face on. A 24px Midnight
circle with the mark, then the words. Two flavours: a bubble for a remark, which
is a plan note, an answer in Ask Lifty, or the line under a finished session,
and plain accent-ink text for coaching on the thing you are looking at, which is
the line under a set.

It replaced a left-border blockquote, which read as a pull quote from nobody.

## Appearance

Light by default, dark by choice, and System if you want it to follow the phone.
The choice is stored on the device and applied before first paint, so a dark
user never gets a white flash on the way in.

Light is the default rather than System, because a gym is bright and the app
opening light is the answer more often. Following the device is something you
opt into.

## Admin

It lives on the profile page, behind a two-way switch that only an admin ever
sees: You, and Admin. Same page, same address, no second URL to remember and
nothing for anybody else to find.

Two kinds of admin, and they are deliberately not equal.

**Root** is `ADMIN_EMAILS` in the environment: a comma separated allowlist that
cannot be granted or revoked from inside the app at all. An empty one locks
everybody out rather than letting everybody in, which is the direction a mistake
here has to fail in. It is what gets you back in when the table is empty or the
database is having a bad day, and the screen will not let you remove it, because
the screen is not where it came from.

**Granted** is a row in `public.admins`, handed out by an existing admin from a
person's row on that screen. A separate table rather than a flag on settings,
because settings is a row the user owns and can write to, and a flag anybody can
set on their own row is not a permission, it is a suggestion. Row level security
is on and there are deliberately no policies, so no policy ever matches and
nothing reached through the anon key can read or write it. The service role
bypasses RLS, which is how the endpoints get at it, and that key sits behind a
`server-only` import that fails the build if a client component ever pulls it
in.

What the screen shows is the two halves that never meet anywhere else: the auth
table, which knows who exists and when they last signed in, and the app's own
tables, which know whether any of that turned into training. Every person
carries their sessions, sets, weight moved, first and last workout, whether they
finished the questionnaire, and which program they landed on.

The state on each row counts training rather than sign ins, because opening the
app and doing nothing is not training. Training is a session in the last ten
days, slipping is thirty, gone quiet is beyond that, and never started is
somebody who signed up and never logged a set. That last group is called out
above the list on its own, because for an app like this it is the only number
worth acting on.

Actions, each re-checking on the request rather than trusting the page that drew
the button: send a password reset, which goes out through the ordinary flow so
it arrives over the real mail setup and lands on the real form; confirm an email
by hand; block and unblock sign in; make somebody an admin, which asks twice
because it hands them everybody else's training and the ability to delete it;
and delete an account, which is typed rather than tapped. Everything
destructive refuses to point at your own account, because locking yourself out
of your own admin screen is a mistake nobody recovers from in a hurry. There is
a CSV of whatever the list currently shows.

Above the people, the line no snapshot can draw: sessions per week for the
last twelve, empty weeks included because a gap is the shape worth seeing.
Next to it, who went quiet: five or more sessions, nothing in ten days, not
yet sixty. The never-started chip catches the leak at the front door; this is
the leak out the back, and at this scale the fix is not a system, it is a
personal message to somebody you know by name. And a row of adoption counts,
one per shipped feature, because the screen could not previously say whether a
single person had touched any of them.

Every action the admin route takes lands in an audit trail first: who, did
what, to whom, when, shown at the bottom of the screen. Admin can be granted
from the screen itself, and the moment a second admin exists, a ban with no
record of who banned is a hole. The table has row level security enabled with
no policies at all, which locks it to the service role, and the emails in it
are stored as text with no foreign keys because a trail has to survive the
accounts it mentions. There is a check that counts the route's success returns
against its log writes, so an action cannot quietly gain an exemption.

Under the people, what the library is missing. Every custom exercise is
somebody who searched the picker, found nothing, and typed the movement in by
hand, and the report groups those by name across accounts, plurals folded in,
spellings counted, movements the library already has filtered out because
those are people who did not find the search, not gaps. Two users on one row
is the library being told something. Nothing promotes itself: custom names are
personal shorthand, and the library's worth is that every entry has a type, a
group, a rest tier and swap behaviour somebody thought about. The report
points, a person adds the movement properly in lib/exercises.ts, and the
people who invented it keep their own. Names and counts only. What anybody
lifted on their own movements stays theirs.

## Reading the output, not the code

The core and barbell bugs were first session bugs that a six reviewer code
audit missed an hour before they were reported, because the audit read code
and the bugs were in output. So the checks now build the plan across the
answer space, thousands of days, and assert the boring things about each one:
every day has work in it, nothing appears twice, nothing needs equipment the
person does not have, nothing a refused answer removed is present, supersets
stay contiguous, focused work leads its day, and the count fits the clock.

That sweep found one class of failure, and it was mine, shipped the same day.
The red flag patterns matched across muscle groups, because the words they
match are not owned by one region: Press is in Leg Press, Raise is in Calf
Raise, Curl is in Leg Curl. A flagged shoulder was taking the leg machines
away, and on a small kit whole days emptied out. The patterns are scoped to
the groups each joint actually drives now, and a check holds a flagged
shoulder to leaving the squat rack alone while still refusing to load the
shoulder.

What remained after that was legitimate: a red flagged shoulder on a
bodyweight kit really does leave nothing safe for a chest day. So a day the
answers empty is no longer offered as a session. The plan drops it, counts it,
and the plan screen says how many days went and why, because a week that comes
back shorter than the one somebody asked for needs a reason attached rather
than a card promising a workout and opening on nothing.

## The month

The tab called Calendar showed today and nothing else, which on a rest day was
a heading, a line of grey text and half a phone of white. A log is worth
keeping because it accumulates, and the accumulation was three taps away on
another tab.

It now carries the month: six by seven, filled where you trained, outlined
where your week asks for something, ringed on today, greyed either side of the
month so the first row is never ragged. Tapping a filled day opens what you
logged, tapping a planned one opens what it holds, and a rest day does
nothing, which is the point of a rest day.

## Answers the plan asks for reach the plan## Answers the plan asks for reach the plan

A user answered Not interested on barbell lifts, picked Core as the thing to
bring up, and got a first session that opened on a barbell bench press with no
core in it. Both answers were being collected and ignored, which is worse than
never asking.

Not interested in barbells is an equipment answer now. Every barbell movement
swaps the way a missing machine would: the bench lands on its named machine
press, the squat on the leg press, on any plan and on away days too. Never
tried does not ban the bar, because Foundation teaches; only the explicit no
does.

Core carries anywhere. Every other muscle group belongs to a day of the split
and turns up on its day, which is why bringing something up reorders rather
than adds. Core is the exception: it pairs with anything, recovers overnight,
the templates sprinkle it into whole splits, and yet push pull legs carries
none at all, so a core-focused user could go a week without a rep of it. A
focused core that is absent from a day is added to it, one movement, a plank
before the alphabet's ab wheel, competing fairly for a slot inside the time
budget rather than blowing it.

And the clock trims the session, never the reason somebody gave for training:
a circuit that cannot survive the time budget whole used to vanish whole,
which silently deleted the focused work at thirty minutes. A dropped circuit
now leaves its first focused movement behind as a single.

The barbell bug prompted a sweep of every profile field against where it is
read, and two more were being collected and ignored. The red flag question,
which is the worst kind to ignore because it is a safety question, promised
"we will keep suggesting the rest" and changed nothing: a red flagged joint
now loses its work entirely, gentle swaps included, through strict per joint
patterns, because pain that wakes you at night is not something to leg press
around, and clearing the flag restores the gentle swap. The rest of the week
answer had one advisory line for Running and nothing for the other four; its
whole job is the line under it, so every answer has one now, and a check
counts them. Height remains stored and shown back without driving anything,
which is deliberate and marked optional, and is the only field left with no
job beyond being read back to its owner.

The week strip opens for reading. Tapping any planned day shows what is in it
after the profile's swaps and what it costs, with Start as its own tap inside,
so what Friday holds is one tap away and Friday's workout still cannot start
by accident.

## The offers the log earns## The offers the log earns

Two cards on the Calendar tab, each made once, each with a no that sticks.

Graduation. The starting program was sized from the signup answers, and those
answers are frozen history now: the profile no longer lets anybody edit who
they were. So the log makes the offer instead. Twenty four sessions across
eight distinct weeks on Foundation earns the offer of Build; seventy two
across twenty four earns Performance, because blocks and waved effort are a
claim measured in seasons. Accepting stores a promotion, which is its own fact
granted by evidence rather than an edit of history, and the program becomes
the higher of what was answered and what was proved. It can only ever raise:
nothing stored can demote somebody below what they said. Counted from signup,
so imported history from some other life graduates nobody the app has never
seen train.

Advance. The goals are an ordered list and, until now, nothing ever moved it.
Twelve distinct training weeks on the front of the list earns the offer of the
next goal that actually trains differently, with the weeks counted from the
last time the driving goal changed rather than from signup. Saying not yet is
remembered for that goal and re-arms only when the driving goal genuinely
changes, so a no is never nagged and a new goal is never silenced by an old
answer.

The four week check-in outranks both, because a week that is not happening is
a bigger fact than a promotion, and at most one card speaks at a time.

## The audit, and what it changed## The audit, and what it changed

Six parallel reviewers read the whole app, one slice each, and an adversarial
pass re-checked every claim against the cited line before anything got fixed.
The pattern in what survived: the daily loop was good, the edges lied. What
changed, in the order it mattered:

The goal is one answer with one home. The profile's ordered list drives the
prescriptions, saving the profile derives the training goal from the top of
it, Settings shows a link instead of a second radio that used to disagree, and
the header pill says Build muscle rather than a raw internal word.

Closing the profile commits it. Done, the scrim, Escape and switching tabs all
save; Settings had trained everybody that taps stick, and the profile was the
one screen that quietly threw edits away.

Logging a set you already did once is one tap. The ghost column showing last
session's numbers is now a button that fills the row, which turns a twenty set
session from about a hundred touches into about twenty. Fixing a typo in a
logged set no longer restarts the rest clock, a seeded weight no longer paints
a set as done, and End workout sits at the bottom of the session as well as
the top, where the last set left you.

The plan lands on the week at onboarding, so a new account's Today card names
the next session instead of saying Rest day forever. The skip button starts
day one of a sensible plan instead of dumping people on an empty screen, and
the week strip only starts a session from today's cell: the other six are the
week being read, not six ways to start the wrong workout.

A failed load shows a retry screen, never the new-user questionnaire over a
full history. The movement note flushes on close instead of losing the last
half second of typing. The rerun questionnaire has a way out that keeps
everything, and finishing it no longer resets a running block. A shared
workout link survives signing up: the link rides through login, signup and the
confirmation email, and lands back on the workout it came from.

And the copy stopped disagreeing with itself. Ask Lifty no longer gives
directions to tabs that do not exist, the section count in Settings is derived
from the questionnaire so the two cannot drift, the weekly check in wears the
same name in both places, the profile asks questions in the same words the
questionnaire used, and the finish screen only says Nice one when a set was
actually logged. Checks pin the load-bearing ones: directions must name real
tabs, and the goal must stay a single edited state.

The Experience section is gone from the profile page for the same reason. How
long somebody had been lifting, whether they knew their weights and how the
barbell felt were questions about the day they signed up, asked to calibrate
the starting program. Two years later the honest answer to all of them is the
log itself, and an editable snapshot of who somebody used to be is not a
setting, it is a trap: change it and the program quietly re-derives from a
fiction. Rerunning the questionnaire from Settings is the one way to be
re-read, and it asks these in context, once, again.

## Everything you want, in the order you want it## Everything you want, in the order you want it

Goals are an ordered list. Pick as many as you like, because wanting to build
muscle and get stronger and stay capable over the next year is a fact about
somebody rather than a mistake to correct, and put them in the order you want
them because that is what somebody actually means when they list four things.

The order is the answer to which one drives. Whatever is at the top sets the
reps and the rests, because a set cannot be three rep ranges at once. That is
the honest part and the app says it out loud rather than quietly averaging four
answers into something nobody asked for.

Asking for an order rather than a winner is the difference between a
questionnaire and a plan. Somebody who says build muscle first, then get
stronger, has described a year, and the app holds that instead of making them
pretend the other three do not exist. Every card carries its place in the list,
one to four, rather than a tick, so the screen is a running order at a glance.

The order question only appears when the picks genuinely pull in different
directions. Building muscle and leaning out are the same training, so being
asked which comes first would be asking somebody to choose between a thing and
itself; those two just get told they are covered together and the kitchen is
what separates them.

Changing your mind is Start this, one tap, on any row that is not already at
the top. Nothing leaves the list when something else moves up, which is the
whole point: the second goal is queued, not surrendered, and nothing logged
changes when the queue moves.

The sentence underneath leads with the list, not with the winner. It opens by
saying nothing on your list cancels anything else out, and only then names what
is first, what rides along with it, what is next, and what is after that. The
order of that sentence is deliberate. Somebody who wants four things and is
told which one they are getting has been answered; somebody told nothing on
their list is in conflict has been understood, and those are not the same
thing.

Leaning out says lose fat now, in the words people use for it, instead of
gesturing at it. The note under it is warmer for the same reason: lifting is
what keeps the muscle while the fat comes off, so you end up smaller and
stronger rather than just smaller, and the kitchen does the losing.

Every option also says what it does underneath its label. Three of the four used
to say nothing at all, which is what made picking one feel like giving up the
others.

Underneath, one field still drives the prescriptions and it is the same field it
always was, so a profile written before the list existed reads as a list of one
and nothing downstream had to learn about lists. A profile written while the
primary was a separate question can have the one that was steering sitting in
the middle of the list; it reads as first, so nobody's training changed under
them on the day the order shipped.

While in there, a small lie the screen told every time: leaning out advertised
8 to 15 reps and handed out 8 to 12, because it maps to the muscle goal and
always did. It shows 6 to 12 now, the same as building muscle, because that is
the same training and cannot honestly advertise two ranges.

## Six screens, each about one thing

The questionnaire was reordered around a rule: every screen is one subject, and
every answer sits next to the answers it belongs with. Age used to be three
screens from height and weight; the unit picker was four screens from the
first thing measured in it; which gym you train in was filed under scheduling
rather than next to the injuries, which is the other question that decides
what movements you are given.

    You            name, age, height, sex, units, weight today, heading for
    Goals          what you want, in order, and what to bring up
    Experience     years, past training, do you know your numbers
    Your week      days, leg days, session length
    Your gym       equipment, sore joints, the doctor question
    Your plan      what all of it built

The chest pain and dizziness screening question is gone. It was PAR-Q
furniture for a commercial product this is not, and the doctor question
carries the lighter plan on its own.

## Asking what you are, and doing something with the answer

A questionnaire that asks your age, your height, your weight, your injuries and
four goals, and never asks this, does not read as neutral. It reads as an app
whose default person is a man. So it asks: female, male, rather not say.

The rule it is built under is that asking and then handing out the identical
week is worse than never asking, because now the person knows it asked and
ignored them. So the answer does exactly one thing, and it does it in the open.

It ticks the starting answer to the question underneath it, "anything you want
to bring up", which is on the same screen with the muscle groups on it and is
one tap to change. Female starts with glutes and hamstrings ticked. Everything
else starts with nothing ticked. An answer given by hand is never overwritten
by the assumption, including the answer "none of them".

The assumption is not physiology. Rep ranges, rest tiers and split structure
are not sex dependent in anything worth defending. It is about emphasis: the
template distribution here, like most of them, gives the hips and hamstrings
less room than women consistently say they want, and a first session with two
chest movements and no glute work is where somebody decides an app was not
built for them.

What bringing something up actually does is order. Those movements come first
in the session, and they are the last thing dropped when the time budget bites.
Order rather than addition, on purpose: adding a hip thrust to a push day would
break the split, while putting the hip thrust that is already on leg day first
changes what actually gets done, because the first thing in a session is the
thing you do freshest and the thing you never skip. A superset moves as one
unit, since half a circuit at the front and half at the back is not a circuit,
and a day with nothing prioritised comes back exactly as the template wrote it.

It is said out loud on the plan screen rather than working quietly in the
background, and there is a check that reads the source of the admin screen and
the share link to make sure neither can ever see the answer.

## One leg day or two

A question, in the questionnaire next to how many days a week, and on the
profile page afterwards. Once a week, or twice with quads on one day and
hamstrings and glutes on the other. It only appears at four days and up, because
three days a week has nowhere to put a second one.

Both answers give a whole week that makes sense, not the same week with a day
crossed out. Choosing one hands the second leg day back to the upper body, so a
five day week goes from chest, back, quads, shoulders, posterior to chest, back,
legs, shoulders, upper pump.

Unanswered is twice, because at four days and up that is what most people do and
it is what the plans used to fail to offer at all. It used to be one day called
Legs everywhere, and at six days a week the same Legs day run twice, which was
the most common thing new people said was wrong. Making it two for everybody
would have been the same mistake pointing the other way.

## The knee is a question now, not a template

The 4 and 5 day splits used to carry no barbell squat and no heavy hinge
anywhere. That was one person's knee written into what everybody got, and it
went unnoticed until other people started using the app and asked where the
squats were.

The movements are back where they belong. Somebody who flags a sore knee or a
bad back in the questionnaire still never sees them: the ban list takes them out
and the alternative finder puts something else from the same muscle group in
their place, per person, at the moment the day is built.

Putting them back exposed two real bugs that had been sitting behind the
omission. A swap could land on a movement already sitting further down the same
session, which put the leg press in a leg day twice; the used set is seeded with
the whole day now rather than filled as it goes. And joints were banned by a
hand written list of names, so banning the back squat for a sore knee let the
swap land cheerfully on a goblet squat. Families are matched by pattern now, and
the list stays for the odd ones out. Leg press and leg extension are deliberately
outside the knee pattern, because they are what a knee swaps to.

## Setup

1. Create a Supabase project.
2. Run the files in `supabase/migrations/` in the SQL editor, in order, 0001 to
   0014. Clear the editor before each paste: a partial paste fails in confusing
   places. They create the ten tables, the indexes, one row level security
   policy per table so every row is readable only by the user that owns it, the
   atomic save function, the superset and drop set columns, the bodyweight
   table, the start, end and score on a session, and what a custom exercise
   knows about itself, the note on a session, the function that deletes
   your account, the admins table, shared workouts, the push endpoints and
   nudge settings behind the weekly nudge, the notes kept against a
   movement, and the admin audit trail.
3. In Authentication then URL Configuration, add `https://YOUR-DOMAIN/auth/callback`
   as a redirect URL. That one URL covers all three mail flows: confirmation,
   password reset and the magic link.
4. Copy `.env.example` to `.env.local` and fill in the project URL and anon key.
5. For rest alerts on a locked phone, generate a VAPID pair with
   `npx web-push generate-vapid-keys` and fill in the four push variables. The
   public key goes in twice, once for the browser and once for the server.
   Leaving them blank turns the feature off cleanly rather than breaking
   anything.
6. For the weekly nudge, set `CRON_SECRET` to any long random string. Vercel
   signs its own cron requests with it, and without it the endpoint refuses
   everybody, which is the right behaviour for a fork that has not set one up.
   `vercel.json` asks for the job hourly; on a plan that only allows a daily
   cron it still works, because the job sends to whoever is overdue rather than
   to whoever is due this exact hour.
7. `npm install` then `npm run dev`.

Deploying to Vercel: import the repo, leave the root directory alone since the
app is the repo, add the same environment variables, done. Set the framework
preset to Next.js if Vercel has not worked it out.

## Signing in

Email and a password, at least 8 characters. A magic link is four steps and
assumes the mail is on the phone you are standing in the gym with, so it is
still here, one tap away under the password box, but it is no longer the only
door. Forgotten passwords go out as a reset link that lands on a page to set a
new one.

Changing a password you already know is in Settings, under Account, folded away
behind one line. It used to only be possible through the recovery mail, which is
a strange thing to need while signed in, and worse, a recovery link sent from
anywhere other than the app's own forgotten-password button lands on the app
rather than on a form, so the one path that existed could fail quietly.

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

## Substitutions

A Swap button on every exercise, for the movement you do not like, cannot get
to, or whose machine is taken. It opens the picker on things that train the
same muscle, closest swap first, and typing searches everything as usual.

Closeness is mostly how much effort a movement takes, which is a better proxy
for the pattern than equipment: swapping a back squat offers the front squat,
the belt squat, the hack squat and the leg press before it offers a leg
extension. The substitute takes the place of the one it replaced, keeping its
position, its superset and the number of sets laid out. The numbers do not
carry over, because they were for a different movement.

The plan does this on its own too, around a sore joint, which is a different
question with the same answer: `lib/onboarding.ts` swaps at plan time,
`similarTo` in `lib/exercises.ts` offers the list mid-session.

## Starting one

The Start sheet leads with your plan, and each day says what is in it and
roughly what it will cost you: how many movements, the first three by name, and
an estimate in minutes. A choice made before you commit rather than after.

The estimate is forty seconds of work a set, plus the rest the movement earns,
plus the time it takes to find the machine and set the seat. A superset rests
once at the end of the group rather than after each movement, so a supersetted
day genuinely reads shorter, which is the honest answer and the reason people
superset. It rounds to five minutes, because a session claiming to take 47 is
claiming to know something it does not.

There is no empty workout. Starting a workout with nothing in it is a screen
asking you to do the work it exists to save you, and Build one is there for a
session you want to write yourself.

## What it asks you for

A templated session opens with the sets already laid out and the target written
under the movement: four by five to eight on the press, three by twelve to
fifteen on the pushdowns. A plan that does not say how much is not a plan, it is
a list of names.

Nothing is hand written into the templates, because a table of a hundred and
ninety numbers is a hundred and ninety chances to disagree with itself, and it
could not have known what you told the questionnaire. Two things decide it. The
goal you picked sets the rep window, so strength runs low and heavy where the
movement can carry it and staying capable runs long and light. What the movement
costs you sets the number of sets, using the same five tiers the rest timer
already works out: the barbell bench earns four, the cable pushdown earns three,
and nothing earns five sets of anything that is not near maximal.

If the plan put you on the lighter version, because it is your first program or
because of a health answer, every prescription loses a set and keeps its reps.
Fewer sets is easing in. Fewer reps is just a worse set.

The coach then argues with the number you were actually shown. Prescribed ten to
fifteen on a cable curl, twelve reps is mid range and the next step is thirteen.
The goal-wide range would have called the same set far over the top, which is
the sort of contradiction that teaches people to stop reading the coach line.

Everything is a starting point. Add set, delete a row, or write your own day,
and nothing argues.

## Finishing one

End workout stops the clock and asks the one question, and then there is a
screen for having finished. It leads with a headline, then the time, the sets,
the weight moved and how hard it felt, then anything worth naming: records
broken, movement by movement, with what kind of record each one was; a round
number crossed; the weeks strung together; sets that beat the same set last
time out.

Everything on it is something that happened. There is no confetti and nothing
that arrives whatever you did, because praise that turns up every time is not
praise, it is wallpaper, and people stop seeing it inside a week. So the
headline is chosen by what is actually true, in the order things deserve
saying: a record beats a round number, which beats a streak, which beats being
up on last time. When none of it applies the screen says so, that it is done and
written down and most sessions are the ones that make the good ones possible,
which is true and is not nothing.

A round number is announced on the session that crossed it and never again,
measured as the lifetime total before and after this one. And a session with no
sets in it is told exactly that, rather than congratulated for closing an empty
page.

Share is on that screen too, next to Nice one, because the moment somebody
wants to send a session is the moment they finished it.

## Sharing a session

Share is in the header of every session, next to Delete. It hands the phone's
own share sheet a PDF, so it goes wherever you already send things: Messages,
Mail, WhatsApp, AirDrop, a notes app, whatever is on that sheet. The person on
the other end gets a file they can open and keep, rather than a screenshot or a
link into an app they do not have.

The sheet is written again from scratch rather than being a picture of the
screen. The screen is built for one hand in a gym, which means abbreviations,
colour and rows you tap; none of that survives being sent to somebody who was
not there. So it comes out in full words, in the order the session ran: the
title, the date, how long it took, how much was moved, how hard it felt, then
every movement with its sets numbered, supersets labelled and marked as running
straight through, drops written as drops rather than taking a set number, and
the note at the end.

The PDF is written by hand, in about two hundred lines, rather than by pulling
in a library. Every PDF library worth using is larger than this entire app and
would have to come down the wire before a share could happen, which breaks the
one moment that matters: standing in a gym on a bad connection having just
finished. Text set in Helvetica, which every reader has built in, needs no font
embedding and no compression, so what is left is object plumbing, a cross
reference table and real Helvetica metrics so that long movement names wrap
where they should. Pages break before a movement rather than after it, so no
page ever opens with a set whose name is on the one before.

Two fallbacks, in order. A browser that shares but refuses files gets the same
session as text. A browser with no share sheet saves the PDF, and says so, so it
can be attached by hand.

## If you already write your own

The questionnaire asks. Somebody who says yes lands in the builder at the end of
it rather than on day one of a split they never asked for, and the Start sheet
puts Build a workout at the top with the plan demoted underneath it, under a
heading that says it is there if you want one handed to you.

The plan is still built and still saved either way. That is the point: it is not
withheld from anybody, it just stops being the thing the app leads with for
people who arrived knowing what they wanted to do.

Sometimes is not yes. Somebody who occasionally writes their own still gets a
starting point, because that is what occasionally means.

This came from new users, more than one of them, saying they could not find the
door. It was always there, in the Start sheet, as a dashed pill under a plan
that looked like the whole app.

## Your own workouts

Build one from scratch in the Start sheet, or take a copy of any template day
and make it yours: a plan that nearly fits is worth changing rather than
working around every week. A copy is seeded with the template's movements and
saves as your own, leaving the original alone.

Saved workouts can be edited afterwards rather than only deleted and rebuilt.
The list of movements in the builder is a list rather than a cloud of chips,
because the order there is the order they run in and arrows are the only way to
say that. Building saves and starts, since you built it to do it. Editing saves
and stops there, because changing next Tuesday's plan is not the same as
deciding to train right now.

## Passing a workout to somebody

Share, next to Edit on any of your own workouts. It publishes a copy and hands
the link to the phone's share sheet, or the clipboard where there is no share
sheet. Whoever opens it sees the session, and one button puts a copy in their
own workouts.

A copy, not a pointer, in both directions. Editing yours afterwards does not
silently rewrite what you gave somebody, and them editing theirs does not touch
yours. If you want them to have the new version, you share it again.

Only the shape of a session travels: the name, the movements in order, and their
superset tags. Nothing either of you has ever logged is in the link, so it
cannot leak a number somebody lifted.

The link is readable signed out, because a link you have to make an account to
even look at is a link nobody opens. The row is owned and protected by the same
one policy as every other table, so nobody can list what anybody else has
published; reading one goes through a security definer function that takes the
id as its whole argument and returns exactly one row. The id is a uuid, so
knowing it means having been given it, and a link that is not shaped like one is
a 404 before it reaches the database.

This exists instead of a trainer role. A trainer role is a second product: a
roster, an invite anybody has to accept, a program builder, a review surface,
and a rewrite of the row level security on every table so a second person can
read somebody else's training. That last part is the one change here where a
mistake leaks everybody's data rather than breaking a screen. So this is the
cheap version of the same question, which is whether anybody wants to train
somebody else's session at all.

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
    components/FocusField.tsx  what you are, and what you want brought up
    components/ExerciseSheet.tsx  one movement: the note, the chart, every outing
    components/GoalPicker.tsx  goals in the order you want them, shared by both
    components/BottomNav.tsx   four destinations and the start button
    lib/exercises.ts      226 movements across 14 muscle groups, each typed
    lib/onboarding.ts     the questions, the scoring, the three programs, the swaps
    lib/nudge.ts          what the weekly message says, and the rules it says it under
    components/NudgeField.tsx  the question, which is a preference and never a prompt
    lib/nudgeWeek.ts      the week counted in days trained, and your own average
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

## Your own movements

Anything the library has never heard of can be typed in, and the create box
asks four things rather than one: what you measure (weight and reps, reps,
time, weight and distance, cardio), what it trains, how hard it is, and how
many sets to lay out.

The last three are not paperwork. Without a muscle group a custom movement is a
ghost: it never counts toward the weekly target, cannot be swapped for
something else when a joint is sore, and does not rank in the hardest first
ordering. Without a difficulty its rest gets guessed by a classifier reading
its name, which for a movement nobody has named before is a coin toss. The
difficulty choices are worded by effort rather than mechanics, because you know
how hard the thing is without having to decide whether it counts as a compound.

`lib/custom.ts` is the register the library lookups consult first, so a
movement you typed in behaves like one that shipped with the app.

## Set types

Each exercise names its columns above the rows rather than leaning on
placeholder text, because a placeholder disappears the moment you type and
`80 9` is two anonymous numbers.

The first column is what you did on that numbered set last time. It used to be
one line above the exercise summarising the whole of last session, which meant
comparing set three to set three was arithmetic you did in your head. Beside
the row it is reading. The header keeps only the date, since the rows carry the
rest, and a movement you have never logged has no column at all rather than a
column of dashes. A drop set has no previous either: it continues the set above
it and there is nothing it is the same set as.

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

`npm run check` is 117 assertions over everything that is pure logic: the movement
library, the template days, the coach, the importer including drop set shorthand,
CSV, the onboarding score and the three programs, the joint substitutions,
records, rest timing, supersets, drop sets, the charts, the ordering
rules, the check-in gating, unit conversion, the bodyweight summary, the
lifetime record, the redirect guard, the set row columns, session duration and
scoring, the six week block, the prescriptions, the shared sheet and the PDF it
is written into, what the end of a session is allowed to claim, the admin
allowlist and the numbers the admin screen counts,
what a rest alert request is allowed to contain and what the push it sends puts
on the wire, and the knowledge base gate. Every program
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

It lives on the profile, since it is a fact about you rather than about your
training. The card names the three numbers plainly rather than leaving two of
them to be worked out: where you started, where you are, where you are going,
with the distance left to the goal under it. The line is a seven day average
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
In a session, every exercise has a Superset button that asks what to pair it
with, listing everything else in the workout and what each one rests for. A
button sat between two neighbours could only ever offer the pair the order
happened to produce, which is rarely the pair you want. Whatever you pick moves
up beside the anchor, since a superset is consecutive by definition and it had
to go there anyway, and picking again adds a third to the end of the same
group. Unlink on the group header puts them all back. Supersets render as one block, labelled A1 and A2, and
the rest timer waits for the last movement in the group rather than firing
between them, which is the only thing about a superset the app actually has to
understand.

A superset is a tag shared by consecutive exercises, not a table. Order on screen
is the order they run in, so the same tag either side of a gap is two supersets,
and a tagged movement on its own is just a movement.

## Drop sets

Add a set and put the lighter weight in it. That is the whole thing.

There used to be a Drop button that added a row tagged DROP, seeded at 80
percent of the last load. It has gone, because a drop set is running less
weight straight after your working set, and building a button for that is
ceremony around something anybody can already do. The one place it still
appears is history: sessions logged while the button existed keep their drop
rows and the label that goes with them, and the importer still reads the
shorthand from the artifact days, so a pasted `130x15 110x15` becomes a working
set with a drop attached.

Where a set carries that flag, it stays out of everything comparative: records,
the previous column, the top set in history, and the coach line, which reads
your last working set. Nothing new is ever tagged.

## Rest timer

Starts itself the moment a set becomes a set, which is the moment you want it,
and not before: a load with no reps beside it is half a set and starts nothing.

The length comes from what the movement actually costs you, on five tiers
rather than the compound or not it used to be, which put a plate loaded
shoulder press and a barbell squat on the same clock.

    heavy       120s   near max: barbell lifts, weighted dips and pull ups, leg press,
                       hack squat, sleds and carries, Nordic curls
    compound     90s   heavy but supported or one limb: machine and dumbbell presses,
                       pulldowns, rows, dips, pull ups, lunges, single leg press
    isolation    60s   single joint on free weights, or multi joint at bodyweight:
                       curls, lateral raises, leg extensions, push ups, inverted rows
    cable        45s   single joint on a stack: cable curl, pushdown, fly, face pull
    small        30s   core, calves, forearms, and any static hold
    cardio         0   never starts a clock

Being held up by a frame does not make something an accessory. A leg press is
the heaviest thing most people move all week and a sled leaves you on the
floor, so those sit with the barbell work rather than with the machine presses.
Moving your own bodyweight is the other way round: a push up and a bench press
are the same pattern and nothing like the same effort, so bodyweight versions
drop two tiers and earn the barbell clock back the moment you hang a plate on
them.

Three things decide the tier: how much muscle the movement asks for, how many
joints it crosses, and whether you are also holding yourself up under the load.
A dumbbell or single leg version of a heavy lift drops a tier, because half the
load is half the recovery, and a machine or Smith version of a barbell lift is
supported work whatever the word press implies.

The evidence behind the shape of it: the ACSM position stand on progression
models puts core exercises under heavier loads at 2 to 3 minutes and assistance
work at 1 to 2; Schoenfeld et al. (2016) ran trained men at 1 versus 3 minutes
for 8 weeks and the 3 minute group gained more strength and more muscle
thickness, which buried the idea that short rest buys hypertrophy through
metabolic stress; Grgic et al. (2017) found longer intervals favour people with
training experience; and single joint work is widely put at 60 to 90 seconds
because one joint moving leaves far less behind it.

Where this departs from the studies, and why: they chase the most one session
can give and pay for it in minutes. Somebody training most days and
supersetting the accessories is buying the same weekly volume a different way,
and standing about for three minutes is not the shape of that session. So the
top of the ladder is two minutes rather than three. The distances between the
tiers are the part worth keeping.

Then the week moves it. What the block asks for is the app's own read on how
hard today is meant to be, and since RPE went it is the only intensity signal
left, so a peak week where last sets go to the end earns more time than a
groove week spent finding the loads.

    Groove   x0.85     squat 105s
    Build    x1        squat 120s
    Push     x1.1      squat 135s
    Peak     x1.25     squat 150s
    Deload   x0.75     squat 90s

Everything lands on fifteen second steps, because a timer reading 113 is false
precision on a number this soft, and nothing goes under thirty seconds. Off a
block, nothing moves.

Every number here is a suggestion. There is a manual button on every exercise
for the times it guesses wrong, and inside a superset the clock waits for the
last movement in the group, since not resting between them is the point.

The bar counts to an end timestamp rather than ticking a number down, so
locking the phone or reloading the page gives back the right number. It buzzes
and beeps once at zero. Editing a past session never starts anything.

## A screen for one movement

There was nowhere in this app that was about a movement. Exercises existed
inside a picker and inside a session, and what you knew about one was
scattered: the chart lived on the progress tab, the history was buried in
sessions you had to scroll for, and anything you had worked out about how to
set the machine up lived in your head.

Tapping the name of any movement inside a session opens it. The muscle group,
what it is measured in, what it rests for, a note, the chart, and every time
you have done it.

It opens from the picker too, from an i beside each row rather than from the
row itself. Wanting to know what something is before adding it is a different
question from adding it, and a row that does both jobs does neither cleanly.

The note is the reason the screen exists. A session already carries a note and
that is the right home for how a session went. It is the wrong home for "seat
at 4, feet on the plate, elbows tucked", which is true of this movement every
time you do it, and which is exactly the thing people forget between one week
and the next. So the note is kept against the movement. Emptying it deletes the
row rather than storing a blank, so a note nobody wants leaves no trace.

The history is every set, not a summary. Three sets of 105 for 8, 7 and 6 is a
different claim from three by eight at 105, and the screen exists to show what
happened rather than a tidied version of it. Two sessions on the same day both
appear, because they both did; the chart is the thing that takes one point a
day, since a line that doubles back on itself says nothing.

Nothing is above the chart. The chart card already names the movement and the
metric, and a heading saying Estimated max above a card saying Estimated max is
the screen talking to itself.

The name is the key rather than an id, because the library is a static list in
the app and custom movements are named by whoever made them, so there is no id
both kinds share. A movement that gets renamed loses its note, which is the
same thing that already happens to its history. A name the library has never
heard of still opens: it just has no group and no rest to state, which is what
a custom movement looks like and is not an error.

### Why this screen and not a video library

It is worth saying what this is not. The obvious version of an exercise screen
is the one every big app has, with a filmed demonstration at the top, and the
temptation was to build the plumbing for that now and fill it in later.

Nothing was built for video, deliberately. The library here is a static
TypeScript file rather than a table, so adding a field to it later is a type
change and a data fill with no migration behind it, which means there is no
cost to avoid by building early. And the shape is genuinely unknown: one clip
or two angles, self hosted or embedded, owned or licensed, each wants different
data. Guessing now buys a wrong abstraction to unwind on top of the migration
it was supposed to save.

What was worth building was the room rather than the furniture. The note pays
for itself today, and it needed somewhere to live. If video ever arrives it
arrives into a screen that already exists and already earns its place.

## Away from your gym

Equipment is stored as a fact about a person, and a hotel makes it a fact about
today. That is the whole of the travel problem, so that is the whole of the
fix: on the start sheet, under "Away from your gym?", you say what the room has
and get a session for it. Nothing touches the profile. Tomorrow is normal.

Three kits, which are the access levels that already exist, because a hotel gym
is a basic gym, a room with dumbbells is a home, and a room is a body. Picking
one shows two things.

Your plan, on today's kit. Each planned day rebuilt through the same build that
made it, so the swaps land where a sore joint would send them and the day keeps
its intent: a quad day in a hotel is still a quad day, on whatever the hotel
has. It counts toward your week like any other session, because the nudge
should see a hotel workout as training, not as a miss.

Or just for what you have. Muscle group chips and a start button; nothing
picked is a full body session. Movements are dealt round robin, every group
getting its first movement before any group gets its second, so a short
session in a bare room is still about everything that was asked for rather
than four quad movements and an apology. Within a group the most expensive
movement comes first, which is how the template days are written.

Everything else still applies on the road, deliberately. A sore knee does not
stay home, what you asked to bring up still comes first, and the time budget is
the time budget wherever the dumbbells are. A group the kit cannot serve is
dropped rather than faked, because there is no bodyweight biceps isolation
worth pretending about and a session that quietly skips it is more honest than
one that invents towel curls.

## The weekly nudge

One message a week, on a day and at an hour you pick, comparing the week you
said you wanted against the week you have had. Off until you turn it on.

It is deliberately not a streak. A streak punishes a rest day, and this is a
lifting app where the rest day is part of the program: the six day plan already
says out loud that the seventh is a rest day on purpose, and a notification
telling somebody not to break their run on that day would be the app arguing
with its own training. Nothing here counts consecutive anything.

What it counts instead is days trained this week against the days you said you
train, taken from the schedule if you have laid one out, because moving a
session onto Thursday by hand is a more recent statement of intent than
anything said during signup.

Three rules, and every line obeys them.

Never say they failed. A week that can no longer reach the target is a week
with sessions in it, and the sentence names those rather than the shortfall.
Two of four on a Friday reads one more makes it three, and three is a week that
counts.

Never invent a comparison. Anything it claims about your other weeks is
computed from your own logged sessions or it is not said at all. It will tell
you a session would put this week above your usual, and it only says that when
the average it is comparing against is real and the claim is true.

Never use guilt. If a sentence would work as well on a billboard, it is the
wrong sentence. There is no crushing it, no no excuses, and nothing that reads
like it was bought in bulk.

Two states get their own handling. A week that is met is praised once and then
leaves you alone, because nothing is owed. And somebody who has not trained in
three weeks gets no numbers at all: no week, no target, no scoreboard, just
that everything they logged is where they left it. After three of those in a
row with no training in between, the app stops talking. Somebody who has not
trained in two months is not being helped by a fourth reminder that they have
not trained in two months.

### Where the question is asked, and where the prompt is spent

These are two different things and the app treats them that way.

The questionnaire asks whether somebody wants a weekly check in, and on which
day. It stores the answer and asks the browser nothing at all. The finish
screen of a session is where the notification permission is actually
requested, in a card that names the day they picked.

The reason is that the browser's prompt is one shot. A browser that has been
told no cannot be asked again from inside the app, only from its own settings,
which nobody opens. Spending that one chance during a questionnaire means
spending it before anybody has rested between sets or had a week to be checked
in on, which is where it is most likely to be refused. On an iPhone it is
worse than unlikely: web push only works once the app is on the home screen, so
the prompt during onboarding in Safari cannot be granted at all.

The finish screen is the opposite of that moment. They have just trained, and
the screen has just told them something true about it. So the offer sits under
the records, says which day they asked for, and has a Not now that means not
ever on that phone rather than not this time. The switch in settings is still
there, which is the difference between an offer and a nag.

There is one prompt for the whole site rather than one per feature, which is
why the questionnaire never spends it and why granting it here makes the rest
alert switch work later without a second dialog. A check reads the source of
the questionnaire to make sure nothing in that path ever touches permission.

### What had to change underneath

The rest alert stores nothing. Its subscription is handed over at the moment a
set is logged and used inside the same request, which is why there was never a
table of push endpoints in this app. A message sent on a Friday evening to
somebody who has not opened the app since Tuesday cannot work that way, so the
endpoint is written down. It is written down only when the nudge is switched
on, deleted when it is switched off, and deleted again when the push service
reports the browser has replaced it.

The two features are two switches for the same reason. They need the same
permission and go down the same pipe, so it would have been easy to have one
turn the other on. Turning on a weekly message must not start a phone buzzing
between sets, and there is a check that reads the source to make sure neither
function ever touches the other's gate.

They do sit under one heading, though. Two switches is the right number of
decisions and two headings was the wrong amount of furniture, so Settings has
one Notifications section with both inside it. The browser's own state is said
once at the top of it, because there is one permission for the whole site and
saying it twice implied there were two. What the app does not add is a master
off switch: the phone already has one, everybody knows where it is, and
duplicating it only creates a state where the app says on and the phone says
off.

Timezones travel as IANA names rather than offsets, because an offset is wrong
twice a year and this only ever fires in the evening. The job asks who is
overdue rather than who is due exactly now, so it does the right thing whether
it runs every hour or once a day: late is a worse message, but never is a bug.
Running it twice in a row sends nothing twice, because the first run stamps
everybody it reached and six days have to pass before that stamp clears.

Both notifications carry a tag, so a nudge can never replace a rest alert in
the tray and a rest alert can never replace a nudge. The nudge is silent. A
message about your week is not worth a noise; the rest alert is, because it is
the one you are standing there waiting for.

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

## Offline

A service worker holds the app itself, so a cold open in a basement gym shows
your training log rather than the browser's error page. Build output is hashed
and immutable so it is served straight from the cache; everything else goes to
the network first and falls back, which means you get the current version
whenever there is a signal and the last one when there is not.

The data has its own copy. Every successful load is written to the device, and
a load that fails on a dead connection falls back to it with a line saying when
it was taken. A real rejection is still shown as itself, because a broken query
and a missing signal deserve different answers. Anything logged offline goes
through the same save queue as always and lands when the connection returns.

## Notifications

The rest timer buzzes and beeps at zero, and posts a notification when you are
not looking at the screen. Permission is asked for on the first timer rather
than at startup, because a prompt before you have seen the timer is a prompt
about nothing. All three need the page to be awake, which covers checking a
message between sets.

A phone locked in your pocket is a different problem. It suspends the page
entirely, so nothing running inside it can fire, and the only way through is a
message sent from somewhere other than the phone. Rest alerts, in Settings and
off until you ask for it, do that: the browser hands over a push subscription
the moment a set is logged, the server holds the request open for the length of
the rest, and then sends one alert. On for the phone you turned it on, not for
the account, because alerts belong on the phone you train with and not on your
laptop.

Holding a request open is a strange looking way to run a timer, and it is
deliberate. A cron job cannot be more precise than a minute, which turns a 45
second rest into anything from 45 to 105. A queue service is a second account to
sign up for and a second thing to go down. Rest tops out at two minutes, so the
wait fits inside one function invocation with room to spare, and one person
resting is one invocation.

Skipping the rest, starting the next one, or the timer ringing on the phone
because it was awake after all, all abort that request, and the server stops
without sending. This is why the alert never arrives in the middle of your next
set.

Nothing is stored. The subscription arrives with the request, is used once and
goes when the function returns, so there is no table of endpoints to leak and
nothing to clean up when you change phone. The endpoint is signed in only, and
the only address it will make a request to is an https push service.

The encryption and the signature, RFC 8291 and RFC 8292, are the one part of
this app that is not hand written. The PDF writer was written by hand because a
library would have had to come down the wire to a phone on gym wifi before
anything could be shared. This runs on a server where nothing comes down the
wire, and content encryption that is subtly wrong fails silently, which is the
worst way for anything to fail.

On an iPhone this only works once the app is added to the home screen and opened
from there. That is Apple's rule for web push, not a choice made here.

## Not built yet

A one time code by text. The password is in, and the code by text is the half
that needs an SMS provider on the Supabase project before there is anything to
write.

Mail that works. Password resets go through Supabase's built in sender, which
is capped near two an hour and is not meant for real use. Custom SMTP fixes it.
