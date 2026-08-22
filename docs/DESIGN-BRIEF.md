# LiftyBot: a reface brief for Claude Design

Paste this into Claude Design along with the screenshots. It is written to be
read cold.

**The job is a reface, not a redesign.** Every screen keeps its function, its
controls and its words. What changes is how it looks.

---

## 1. What this is, and where it gets used

LiftyBot is a workout logging app. Somebody opens it standing in a gym, between
sets, out of breath, holding a phone in one hand. They are looking at it for
three to five seconds at a time, twenty times an hour, and then putting it down
to go and lift something heavy.

That context is the whole design problem. It means:

- **Numbers are the content.** Weight and reps are what people came for. They
  have to be readable at arm's length, at a glance, in bad gym lighting.
- **Taps have to be forgiving.** Sweaty thumbs, a phone propped on a bench.
- **Nothing may need two hands or careful aim.**
- **Quiet, not exciting.** This is a tool somebody uses every day for years. It
  is not a place for celebration animations, streak guilt, or motivational copy.

The current design is honest and clean and a bit plain. That is the thing to fix.
It should feel considered and modern without becoming decorative, and without
adding anything that costs a tap.

---

## 2. Screens to reface

There are 14 surfaces. All are one phone-width column.

**Four tabs**, from a bottom nav: Calendar, Progress, Ask Lifty, Profile. The nav
also carries the primary action, which starts a workout.

**Eight sheets**, which slide up over whatever you were doing and have a Done
button top right: Start a workout, Build a workout, Exercise picker, Superset
picker, Finish a session, Settings, Profile edit, Ask Lifty.

**Two full screens**: the live workout editor, which is where nearly all the time
is spent, and the onboarding questionnaire.

The live workout editor is the most important screen in the app by a wide margin.
If only one screen gets real attention, make it that one.

---

## 3. Design the states, not just the happy screens

This is where a reface usually breaks an app. Pretty mockups show a full, tidy
screen. Real users see these:

- **Empty.** No sessions logged yet. No plan yet. No custom workouts. No progress
  chart because there is only one data point.
- **Long content.** An exercise called "Single Arm Cable Lateral Raise". A workout
  with nine movements. A superset of six. A session name somebody typed.
- **In progress.** A rest timer counting down at the bottom of the screen while
  the list scrolls behind it. A set half filled in. The first set of the day next
  to last week's numbers as a faint ghost line.
- **Something went wrong.** Offline. A save that failed. A question that could not
  reach the coach. "You have asked enough for today."
- **Destructive.** Two-tap confirmations: "Discard it?" where Done was, deleting a
  movement, deleting an account.

If a state is not in the mockups, it will get missed in the build. Please cover
them.

---

## 4. Hard constraints

These are not preferences.

1. **Phone first, 390px wide.** Design at that width. It scales up to a 32rem
   column on desktop and never wider.
2. **Light is the default.** Dark mode exists and every colour must have a dark
   counterpart. Do not design dark first and let light fall out of it.
3. **Every colour must be a named token.** See the table below. Return a
   replacement value for each name rather than inventing a new vocabulary. If a
   token should be split or dropped, say so explicitly.
4. **Touch targets 44px minimum.**
5. **No new dependencies.** This is hand-written Tailwind with no component
   library, and it should stay that way. Anything that needs a UI kit, an icon
   package, or an animation library is out of scope.
6. **No em dashes or en dashes anywhere in copy.** Ranges are written "8 to 12".

---

## 5. The palette to replace

Fourteen semantic tokens, each with a light and a dark value. The names carry
meaning, so please return the same names with new values.

| Token | Light | Dark | What it is for |
|---|---|---|---|
| `ink` | `#f5f8fb` | `#0b121d` | Page background |
| `card` | `#ffffff` | `#131d2b` | Any raised surface |
| `edge` | `#dce4ee` | `#243349` | Hairlines and rings |
| `accent` | `#c7e45a` | `#c7e45a` | The committing action, and only that |
| `on-accent` | `#0b121d` | `#0b121d` | Text on the accent |
| `accent-ink` | `#0e7f98` | `#7fe3f2` | Accent as readable text |
| `muted` | `#5c6b7e` | `#8e99a8` | Secondary text |
| `faint` | `#8e99a8` | `#8e99a8` | Labels and section headings |
| `bright` | `#0b121d` | `#f5f8fb` | Primary text |
| `track` | `#edf1f6` | `#1b2738` | Quiet fill: control tracks, unreached rows |
| `lime-ink` | `#7a9a1f` | `#c7e45a` | Lime dark enough to read as text |
| `tint-done` | `#f2f8dc` | `#212c17` | Wash on a set you have finished |
| `tint-cool` | `#eaf6f9` | `#16303c` | Wash on anything the bot says |
| `alert` | `#c4442a` | `#e0614a` | Destructive, and only destructive |

**The brand is lime `#c7e45a` and teal `#0e7f98`, on midnight `#0b121d`.** Lime
leads action, teal supports. You may propose changing these, but say so loudly if
you do, because the logo and the marketing site are drawn with them.

Two rules the current palette enforces and the new one should too. **Lime means
commit**, so it belongs on the button that saves or finishes and nowhere else.
**Alert means destructive**, so deleting an account can never be mistaken for the
primary action.

Type is Nunito for body and Baloo for display.

---

## 6. Please return a scale, not a set of one-offs

The single biggest problem in the current UI is that it has **30 different type
sizes**, most of them arbitrary: `13.5px`, `10.5px`, `12.5px`, `16.5px`. It reads
as slightly unresolved everywhere and it makes any change expensive.

Return **six or seven named steps** covering everything from a section label to
the big number on a finished session, and say which step each kind of content
uses. Same for spacing and for corner radii, where there are currently 10
different values in play.

A tight scale is worth more to this app than any individual screen.

---

## 7. What to hand back

So this can be implemented directly:

1. **The token table**, same 14 names, new light and dark values.
2. **The type scale.** Six or seven steps, each with size, weight, line height,
   letter spacing, and what it is for.
3. **The spacing and radius scales.** Same idea, kept short.
4. **Component specs** for the pieces that repeat everywhere: the sheet, the card,
   the list row, the chip, the primary button, the quiet button, the text input,
   the section label, and the bot's speech bubble. Nearly the whole app is built
   from these, so getting them right does most of the work.
5. **The artboards**, at 390px, covering the 14 surfaces and the states in
   section 3.

Please avoid: screenshots of a different app, a redesigned information
architecture, new features, or anything that needs a library to build.

---

## 8. What the implementation will do with it

For context on why the handback is shaped that way. The codebase is unusually
ready for this:

- Colour is already fully centralised. Across 111 source files there are only 53
  hardcoded hex values and **38 of them are inside the logo SVG**. There is
  effectively no hardcoded colour in the UI chrome, so a palette change is a
  change to 14 token definitions.
- 212 of the app's 232 automated checks test behaviour rather than appearance, so
  they will prove the functionality did not move while the look changed.
- The friction is the 310 ad-hoc size values in the components, which is exactly
  what section 6 is asking you to replace.
