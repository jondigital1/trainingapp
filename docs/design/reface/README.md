# Handoff: LiftyBot Reface

## Overview
A visual reface of the LiftyBot workout logging app (repo: `jondigital1/trainingapp`, branch `main`). Every screen keeps its function, controls and words (three deliberate copy changes are listed below). What changes is the look: tabs get a midnight header and dark bottom nav, sheets stay light, the type/spacing/radius chaos collapses to a short scale, and the Start button becomes a floating lime pill.

## About the Design Files
`LiftyBot Reface.dc.html` (+ `support.js`, its runtime) is a **design reference created in HTML** — open it in a browser to see every artboard. It is NOT production code. The task is to **recreate these designs inside the existing Next.js + Tailwind codebase** using its established patterns: the semantic tokens in `app/globals.css`, the existing components (`SetRow`, `ExerciseBlock`, `RestTimer`, `BottomNav`, `SettingsSheet`, `Onboarding`, etc.), and no new dependencies. The 212 behavior tests should still pass.

## Fidelity
**High-fidelity.** Colors, type, spacing and radii in the artboards are the intended final values (snap any ±1px drift to the scales below). Recreate pixel-perfectly with Tailwind classes bound to the tokens.

## The one-line summary of the direction
"Midnight cockpit": the brand midnight `#0b121d` owns the chrome of **tabs** (header band + bottom nav); content sits on light `ink` with white cards; **sheets stay all-light** with a grabber and Done; lime appears ONLY on the committing action; teal does all other accent work.

## Design Tokens

### Color — same 14 names, values UNCHANGED
The palette survives the reface untouched (light and dark values exactly as in `app/globals.css` today). What changed is **application**, not values. Two exceptions:

1. **Split `faint`.** Add one token:
   - `ghost` — light `#b6bfca`, dark `#3a4a63`. For rows/controls that exist but have not earned attention: waiting set rows, disabled buttons/inputs, chevrons, unpicked "optional" markers. `faint` (`#8e99a8`) stays for labels and secondary meta. (Artboards also use `#c3cbd6` for chevrons — snap that to `ghost`.)
2. **Fixed brand values now appear in light-mode chrome.** Tab headers/nav use `midnight #0b121d`, `navy #131d2b`, `track-on-dark #1b2738`, `edge-on-dark #243349`, `cyan #7fe3f2` — all already defined as fixed brand values in globals.css. In dark mode the header band and page merge (both midnight); keep the nav border to separate them.

Rules preserved: **lime = commit, and only commit** (End workout, Save, Start, Ask, Continue, Skip-rest). **Alert = destructive only** (delete arm state, red-flag marker, failed-save line).

### Type scale — 7 steps (replaces the 30 ad-hoc sizes)
| Step | Font | Size/LH | Weight | Tracking | Used for |
|---|---|---|---|---|---|
| display | Baloo 2 | 34/1.0 | 700 | 0 | session clock, bodyweight headline, the rating number (64px is display×~2, one-off) |
| title | Baloo 2 | 26/1.15 | 700 | 0 | screen titles in midnight header ("Rest day", onboarding step names) |
| heading | Baloo 2 | 18/1.2 | 700 | 0 | card titles, exercise names, sheet titles (19–21px in artboards → snap to 18, or title for page names) |
| body | Nunito | 15/1.5 | 600–800 | 0 | row text, inputs, buttons ≥15 |
| meta | Nunito | 13/1.45 | 700 | 0 | dates, prescriptions, chips, quiet buttons |
| small | Nunito | 12/1.5 | 600 | 0 | explanations, hints, option notes |
| label | Nunito | 11/1.3 | 800 | +1px, uppercase | section labels, column headers, step counters (10px uses → snap to 11) |
Numbers everywhere use `tabular-nums` (the existing `.num` class).

### Spacing scale
`4 / 8 / 12 / 16 / 24` px, plus 1px hairlines. Cards inset 12 from the screen edge; card padding 14–16 → use 16; sibling gaps 6–8 → use 8 (chips may use 6); question blocks separated by 16–18 → use 16.

### Radius scale
| Value | Used for |
|---|---|
| 8 | tiny badges (superset letters, pick-order number) |
| 12 | set rows/receipts, fields inside cards, Lifty bubbles, day chips |
| 16 | inset panels (current-set), rest bar, option cells (14 in artboards → 14 is fine as the control radius if you prefer 5 steps: 8/12/14/22/999) |
| 22 | cards |
| 999 | pills: chips, buttons, toggles, segmented controls, Start |

### Shadows
- Card: `0 2px 12px rgba(11,18,29,.06)` (or `0 0 0 1px edge` ring for flat cards on sheets)
- Active card: `0 0 0 2px accent-ink` + `0 6px 18px rgba(14,127,152,.10)`
- Floating (rest bar): `0 12px 32px rgba(11,18,29,.16)`; on midnight: `rgba(11,18,29,.30)`
- Start pill: `0 8px 20px rgba(199,228,90,.30)` + `0 0 0 5px <nav background>`
- Lime buttons: `0 2px 8px rgba(122,154,31,.28)`

## Component Specs

**Midnight header (tabs + onboarding only).** `bg midnight`, padding 18/16. Carries: screen title (title step, frost), meta (meta, faint), the screen's headline number (display, lime or frost), segmented controls (`bg navy` track, active pill `bg frost` + midnight text), week strip / progress rail. Never on sheets.

**Bottom nav.** `bg midnight`, icons+labels label-step; inactive `muted #5c6b7e`, active `cyan`. Center: **Start pill** — lime, 52px tall, radius 999, play icon + "Start" (body 800), raised -28px, ring 5px midnight.

**Sheet.** All-light. Grabber 44×5 radius 999 `edge`. Title row: heading + "Done" (body 800, accent-ink) top right. No nav.

**Card.** White, radius 22 (18 for list cards), shadow per above. Active exercise card gets the 2px accent-ink ring.

**List row.** 48–56px tall, 16px side padding, 1px `track` dividers inside the card, primary text body 700–800, trailing meta/chevron in faint/ghost. Row titles that navigate are accent-ink.

**Chip.** 36px pill, white + 1px edge ring, meta 800 muted. Selected: `tint-cool` bg + 1.5px accent-ink ring + bright text (optionally ✓ prefix). Overflowing chip rows fade out at the right edge (48px gradient) with a half-visible chip as the scroll hint.

**Option cell (questionnaire/settings).** Min 48px, radius 14, white + edge ring; selected: tint-cool + 1.5px accent-ink ring + 20px teal ✓ circle. Optional note line beneath the label in small/ghost.

**Primary button (lime).** 44–56px, radius 999 (14–16 in dense contexts), `bg accent`, `on-accent` text, body 800 (Baloo 700/16 for full-width onboarding Continue).

**Quiet button.** Text-only body/meta 800 in muted, or white pill + edge ring for secondary actions (Copy, +30s, Edit).

**Text input.** 48px, radius 14, white, 1px edge ring, body text; focus ring 2px accent-ink; suffix units in meta faint.

**Section label.** label step in faint, 16px side padding, 16 above / 8 below. "· optional" suffix in ghost, not uppercase.

**Lifty bubble.** `tint-cool` panel, radius 12, padding 12, small/body 600 bright, prefixed "**Lifty** ·" in accent-ink 800. Also used for coach advice and empty-state explanations.

**Set rows (live editor, from artboard 2a).** Done = one-line receipt: 42px `tint-done` pill, ✓ lime-ink, "185 lb × 5" body 800 tabular, "set n" small lime-ink right. Current = inset `tint-cool` panel radius 16: "SET 3 OF 4" label accent-ink, two 64px white fields with 2px accent-ink rings (Baloo 28 tabular), full-width "Log same as last time · 185 × 4" white pill (accent-ink). Waiting = 42px `track` pill in ghost. Remove ×: two-tap (arms to alert bg, disarms after 3s) — unchanged behavior.

**Rest bar.** Floating above nav: midnight card radius 16, 5px progress strip (lime on track-on-dark), RESTING label, name (meta frost), clock Baloo 28 lime, +30s quiet ring button, Skip lime.

**Toggle.** 44×26 pill; off `track`, on `accent-ink` (teal — a toggle is a setting, not a commit); 20px white knob.

## Interactions & Behavior (unchanged unless listed)
All navigation, timers, two-tap destructive patterns, and data flows stay as-is. **Deliberate changes:**
1. **Exercise picker default** (artboard 3b): default shows search + muscle chips + "Recent" (last ~4 movements) + "Browse" group rows with counts. The flat full list renders only after a chip tap or search. (`ExercisePicker.tsx`)
2. **Done sets fold into receipts; current set enlarged** with one-tap "log same as last time" (already exists per-column; becomes one button). (`SetRow.tsx`, `ExerciseBlock.tsx`)
3. **Ask Lifty daily-cap copy**: "Lifty is tired, come back tomorrow for more answers." under label "Lifty is tired". Replaces "You have asked enough for today."
4. **Notifications block** (user's field note, final labels): "Rest timer" and "Weekly check-in", one card, day/time picker between switch 2 and its explanation; blocked/unsupported states are single messages; failed save is one alert line. (`SettingsSheet.tsx`, artboards 9a–9e)
5. **Profile trouble block** (user's field note): read-first card with Edit/Done, six states in artboards 7a–7f. (`ProfileSheet.tsx`, `FocusField.tsx`)
6. **Product note, NOT to build without a decision**: consider making the Performance program earned via two consistent logged weeks rather than claimed via the experience answer.

## State coverage in the artboards
Empty (8b, 11d, coming list), long content (11c), in-progress (2a, rest bar), offline + failed save (11a), errors (11b, 9c–9e), destructive (10b, armed set-remove per existing code).

## Assets
- Logo: use the existing `LiftyMark.tsx` sprite exactly (never redrawn, never below 32px).
- Nav icons: existing inline SVGs in `BottomNav.tsx`.
- Fonts: Nunito (body) and Baloo 2 (display), already wired via `--font-nunito` / `--font-baloo`.

## Files
- `LiftyBot Reface.dc.html` — all artboards, newest turn at top. Approved direction: 2a (live editor), 3a (Calendar), 3b (picker), 4a (Progress), 4b (Start sheet, light), 5-series rejected, 6a/6b (Ask Lifty/Profile), 7a–7f (trouble block), 8a–8c (finish + Settings top), 9a–9e (notifications), 10a/10b (Settings bottom + delete), 11a–11d (states), 12a–12f (onboarding).
- `support.js` — runtime for the .dc.html; not part of the implementation.

## Artboard → codebase map
| Artboards | Files |
|---|---|
| 2a, 11a, 11c | App.tsx, ExerciseBlock.tsx, SetRow.tsx, RestTimer.tsx |
| 3a | Homepage.tsx, ScheduleCard.tsx, BottomNav.tsx |
| 3b | ExercisePicker.tsx |
| 4a, 11d | ProgressTab.tsx, BodyWeightCard.tsx, ProgressChart.tsx |
| 4b | App.tsx (start sheet), KitPill.tsx |
| 6a, 11b | Homepage/HelpSheet, lib/lifty.ts copy |
| 6b, 7a–7f | ProfileSheet.tsx, FocusField.tsx |
| 8a, 8b | IntensitySheet.tsx, DoneSheet.tsx |
| 8c, 9a–9e, 10a, 10b | SettingsSheet.tsx, GoalPicker.tsx, NudgeField.tsx |
| 12a–12f | Onboarding.tsx, Form.tsx |
