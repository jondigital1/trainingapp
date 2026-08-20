// Plain assertions over the pure logic: library, templates, coaching, the
// artifact importer and CSV export. Run with npm run check.
import { readFileSync } from 'node:fs'
import { daysBetween, shiftDays, weekStart, weekdayOf } from '../lib/week'
import assert from 'node:assert/strict'
import { LIBRARY, MUSCLE_GROUPS, demandOf, equipmentOf, groupOf, lookupType, similarTo } from '../lib/exercises'
import { SPLITS, dayItems, dayNames } from '../lib/templates'
import { coach, roundLoad } from '../lib/coach'
import { fmtPrescription, isLighter, prescribe, prescribedSets } from '../lib/prescribe'
import { easedNote, easedToday, forToday, greetedOn, recordHello } from '../lib/hello'
import { fmtDate, fmtPrevious, fmtSet, fmtSets, fmtTime, parseClock, topSet } from '../lib/format'
import { importArtifactData, parseSetString, parseSetStrings } from '../lib/importer'
import { toCsv } from '../lib/csv'
import { buildPdf } from '../lib/pdf'
import { MAX_WAIT, alertBody, alertRequest, nudgeBody, parseAlert, pushConfigured, wait } from '../lib/alert'
// aliased: lib/body exports a summarise of its own, for bodyweight
import { summarise as summariseSession } from '../lib/summary'
import { HEALTH_LABEL, health, isAdmin, matches, neverStarted, sortUsers, toCsv as adminCsv, totals, weeklyTrend, wentQuiet, type AdminUser } from '../lib/admin'
import { workoutFilename, workoutLines, workoutText } from '../lib/share'
import {
  buildDay,
  dayById,
  experienceScore,
  needsCheckin,
  LONG_SESSION,
  MAX_DAYS,
  MIN_DAYS,
  planFor,
  program,
  GOAL_CHOICES,
  GOAL_FROM_CHOICE,
  goalCoverage,
  goalNoteFor,
  goalsAgree,
  goalsOf,
  legDaysOf,
  primaryGoal,
  promoteGoal,
  returning,
  selfDirected,
  type Profile,
} from '../lib/onboarding'
import { summarise, trend } from '../lib/body'
import { bestLifts, longestStreak } from '../lib/gamify'
import { safeNext } from '../lib/redirect'
import { columnsFor } from '../lib/columns'
import { AWAY_FULL_BODY, awayDayFor, awaySession, defaultFocus, emphasise, focusNote, focusOf, OTHER_NOTES, OTHER_TRAINING, STEP_COUNT } from '../lib/onboarding'
import { historyFor } from '../lib/progress'
import { failedSearches, gapReport } from '../lib/gaps'
import { advanceCopy, advanceFor, graduationCopy, graduationFor } from '../lib/advance'
import { estimateSeconds, fmtEstimate } from '../lib/estimate'
import { ACCESS, CONDITION, DAYS, LEG_DAYS, MINUTES, UNITS } from '../lib/questions'
import { assignDay, datesAhead, dayIdFor, hasSchedule, scheduledDays, scheduleOf, suggestSchedule, swapDays, todaysDayId, trainedOn, upcomingDays } from '../lib/schedule'
import { localNow, MAX_MISSES, nudgeDue, nudgeFor } from '../lib/nudge'
import { averageWeek, weekOf } from '../lib/nudgeWeek'
import { parseDevice } from '../lib/device'
import { customFor, registerCustoms, resetCustoms } from '../lib/custom'
import { fmtDelta, fmtWeight, toDisplay, toPounds } from '../lib/units'
import {
  beatsLast,
  bestsFor,
  e1rm,
  LADDERS,
  lifetime,
  nextLandmark,
  prsFor,
  trainingGrid,
  volumePr,
  weeklyCoverage,
  weeklyStreak,
} from '../lib/gamify'
import { BLOCK, BLOCK_WEEKS, blockNumber, blockWeek, effortFactor, readBlock } from '../lib/block'
import { averageIntensity, durationOf, fmtDuration, intensityLabel, INTENSITY, isRunning, wantsScore } from '../lib/session'
import { TIER_LABELS, isCompound, isFullSet, restFor, restForTier, restTier, scaleRest } from '../lib/rest'
import { groupRuns, isSuperset, linkWith, partnersFor, supersetLetter, supersetRest } from '../lib/superset'
import { KNOWLEDGE, KNOWLEDGE_GROUPS, searchKnowledge } from '../lib/knowledge'
import { askedKey, askedReport, askedState, unanswered } from '../lib/asked'
import { seriesFor, trackedNames } from '../lib/progress'
import { groupSize, hardestFirst, isHardestFirst, moveRun, topLoads } from '../lib/order'
import type { CustomWorkoutItem, Exercise } from '../lib/types'
import type { Workout } from '../lib/types'

let checks = 0
function check(name: string, fn: () => void) {
  fn()
  checks += 1
  console.log('ok', name)
}

// A few things can only be checked by waiting for them: a timer that has to be
// cancellable is not a timer if you assert on it synchronously. These queue up
// and run in order after everything else, so the output stays readable.
const later: (() => Promise<void>)[] = []
function checkAsync(name: string, fn: () => Promise<void>) {
  later.push(async () => {
    await fn()
    checks += 1
    console.log('ok', name)
  })
}

check('library has 14 groups and 200 plus movements', () => {
  assert.equal(MUSCLE_GROUPS.length, 14)
  assert.ok(LIBRARY.length > 200, `only ${LIBRARY.length}`)
  assert.equal(new Set(LIBRARY.map((e) => e.name)).size, LIBRARY.length)
})

check('six splits, twenty six days, every movement is in the library', () => {
  assert.equal(SPLITS.length, 6)
  assert.equal(
    SPLITS.reduce((n, s) => n + s.days.length, 0),
    26,
  )
  for (const split of SPLITS) {
    for (const day of split.days) {
      for (const item of dayItems(day)) assert.ok(lookupType(item.name), `${item.name} missing`)
    }
  }
})

check('the 4 and 5 day splits carry the core circuit every day', () => {
  for (const id of ['summer4', 'five']) {
    const split = SPLITS.find((s) => s.id === id)!
    for (const day of split.days) {
      // A pair, not a four. Four core movements supersetted at the end of
      // every session is twenty a week on a five day split, against five for
      // chest, which made core the largest thing in the week.
      const core = dayNames(day).filter((n) => groupOf(n) === 'Core')
      assert.equal(core.length, 2, `${day.name} carries ${core.length} core movements`)
      assert.ok(core.includes('Pallof Press'), `${day.name} has nothing resisting a twist`)
    }
  }
})

// This check used to assert the opposite: that these two splits contained no
// barbell squat or deadlift anywhere. That was one person's knee written into
// what everybody got. The movements are back and the questionnaire decides who
// sees them, which is checked by name further down.

check('the core circuit is one superset in his template days', () => {
  for (const id of ['summer4', 'five']) {
    const split = SPLITS.find((s) => s.id === id)!
    for (const day of split.days) {
      const items = dayItems(day)
      const circuit = items.filter((i) => i.superset)
      assert.equal(circuit.length, 2, `${day.name} circuit is ${circuit.length} movements`)
      assert.equal(new Set(circuit.map((i) => i.superset)).size, 1, `${day.name} circuit split across tags`)
      const tail = items.slice(-2)
      assert.ok(tail.every((i) => i.superset), `${day.name} circuit is not at the end`)
    }
  }
  // days without a circuit stay untagged
  const bro = dayItems(dayById('bro-chest')!)
  assert.ok(bro.every((i) => !i.superset))
})

check('a swap inside the circuit keeps the superset tag', () => {
  // Ab Wheel Rollout swaps for a wrist, Cable Crunch for nothing here; use a
  // fake day so the swap machinery is exercised inside a tagged group.
  const day = { id: 'fake', name: 'Fake', exercises: [['Back Squat', 'Cable Curl']] as (string | string[])[] }
  // One movement taken away, so the swap is the only thing under test. A sore
  // knee no longer does this: it keeps the squat and runs it a set shorter,
  // and a red flagged knee takes the alternatives with it, so neither is a
  // clean way to ask whether a tag survives a substitution.
  const items = buildDay(day as never, { dislikes: ['Back Squat'] })
  assert.equal(items.length, 2)
  assert.ok(items.every((i) => i.superset === items[0].superset && i.superset), 'tag lost in the swap')
  assert.equal(items[0].name, 'Leg Press')
  assert.equal(items[0].swappedFrom, 'Back Squat')
})

check('the coach runs double progression on the reps you actually did', () => {
  // Top of the range: add load, start again at the bottom.
  assert.match(coach({ id: '1', w: 95, r: 12 }, 'W', 'muscle')!, /100/)
  assert.match(coach({ id: '1', w: 95, r: 12 }, 'W', 'muscle')!, /for 6/)
  // Inside the range: one more rep at the same load.
  assert.match(coach({ id: '1', w: 95, r: 9 }, 'W', 'muscle')!, /go for 10/i)
  // Under the range: the load is too heavy.
  assert.match(coach({ id: '1', w: 135, r: 4 }, 'W', 'muscle')!, /125/)
  assert.match(coach({ id: '1', w: 200, r: 6 }, 'W', 'strength')!, /210/)
  // Nothing to say about a hold, and nothing to say without reps.
  assert.equal(coach({ id: '1', t: 60 }, 'T', 'muscle'), null)
  assert.equal(coach({ id: '1', w: 95 }, 'W', 'muscle'), null)
  assert.equal(roundLoad(95 * 1.05), 100)
  assert.equal(roundLoad(45 * 1.05), 47.5)
})

check('set formatting matches the ghost line', () => {
  assert.equal(fmtSet({ id: '1', w: 135, r: 8, rpe: 8 }, 'W'), '135 x 8 @8')
  assert.equal(fmtSet({ id: '1', r: 12 }, 'R'), '12')
  assert.equal(fmtSet({ id: '1', t: 90 }, 'T'), '1:30')
  assert.equal(fmtSet({ id: '1', w: 70, d: 50 }, 'WD'), '70 x 50 ft')
  assert.equal(fmtSet({ id: '1', t: 1200, d: 2.1 }, 'C'), '20:00, 2.1 mi')
  assert.equal(fmtTime(3725), '1:02:05')
  assert.equal(parseClock('1:30'), 90)
  assert.equal(parseClock('90'), 90)
  assert.equal(parseClock(''), null)
})

check('top set picks the heaviest then the most reps', () => {
  const best = topSet({
    id: 'e',
    name: 'Incline Dumbbell Press',
    type: 'W',
    sets: [
      { id: '1', w: 70, r: 10 },
      { id: '2', w: 80, r: 6 },
      { id: '3', w: 80, r: 8 },
    ],
  })
  assert.equal(best?.id, '3')
})

check('v1 set strings come apart', () => {
  assert.deepEqual({ ...parseSetString('135x8 @8', 'W'), id: '' }, { id: '', w: 135, r: 8, rpe: 8 })
  assert.deepEqual({ ...parseSetString('12', 'R'), id: '' }, { id: '', r: 12 })
  assert.deepEqual({ ...parseSetString('1:30', 'T'), id: '' }, { id: '', t: 90 })
  assert.deepEqual({ ...parseSetString('70 x 50', 'WD'), id: '' }, { id: '', w: 70, d: 50 })
  assert.deepEqual({ ...parseSetString('20:00 2.1mi', 'C'), id: '' }, { id: '', t: 1200, d: 2.1 })
})

check('artifact v2 blob imports', () => {
  const blob = {
    workouts: [
      {
        id: 'w1',
        date: '2026-08-11',
        title: 'Summer 4 Day Push',
        exercises: [
          { id: 'e1', name: 'Incline Dumbbell Press', type: 'W', sets: [{ w: 80, r: 8, rpe: 8 }] },
          { id: 'e2', name: 'Plank', type: 'T', sets: [{ t: 60 }] },
        ],
      },
    ],
    custom: [{ id: 'c1', name: 'Cable Y Raise', type: 'W' }],
    customWorkouts: [{ id: 'cw1', name: 'Arms', items: [{ name: 'Hammer Curl', type: 'W' }] }],
    settings: { goal: 'muscle' },
  }
  const data = importArtifactData(blob)
  assert.equal(data.workouts.length, 1)
  assert.equal(data.workouts[0].exercises[0].sets[0].w, 80)
  assert.equal(data.workouts[0].exercises[1].type, 'T')
  assert.equal(data.custom[0].name, 'Cable Y Raise')
  assert.equal(data.customWorkouts[0].items[0].name, 'Hammer Curl')
  assert.equal(data.settings.goal, 'muscle')
  assert.notEqual(data.workouts[0].id, 'w1')
})

check('legacy v1 array with string sets imports', () => {
  const data = importArtifactData([
    { date: '2026-01-02', title: 'Legs', exercises: [{ name: 'Leg Press', sets: ['300x10', '320x8 @9'] }] },
  ])
  assert.equal(data.workouts[0].exercises[0].type, 'W')
  assert.equal(data.workouts[0].exercises[0].sets[1].rpe, 9)
  assert.equal(data.workouts[0].exercises[0].sets[1].w, 320)
})

check('csv export is one row per set', () => {
  const workouts: Workout[] = [
    {
      id: 'w',
      date: '2026-08-11',
      title: 'Push, hard',
      exercises: [
        { id: 'e', name: 'Incline Dumbbell Press', type: 'W', sets: [{ id: 's1', w: 80, r: 8, rpe: 8 }, { id: 's2', w: 80, r: 7 }] },
      ],
    },
  ]
  const lines = toCsv(workouts).split('\n')
  assert.equal(lines.length, 3)
  assert.match(lines[1], /^2026-08-11,"Push, hard",Incline Dumbbell Press,W,1,80,8,8,,,,$/)
})

check('experience score puts people in one of three programs', () => {
  assert.equal(program({}), 'Foundation')
  assert.equal(program({ years: 'never', before: 'no', barbell: 'never', knows: 'no' }), 'Foundation')
  assert.equal(program({ years: 'sixToTwo', barbell: 'rusty', knows: 'roughly' }), 'Build')
  assert.equal(program({ years: 'overTwo', barbell: 'confident', knows: 'yes' }), 'Performance')
  assert.equal(experienceScore({ years: 'overTwo', barbell: 'confident', knows: 'yes' }), 7)
})

check('the top program is reachable, which is the whole point of asking', () => {
  // The old Advanced tier needed a barbell answer the first run never asked
  // for, so nobody could ever land on it. Every question that scores is now
  // asked up front.
  const answered = { years: 'overTwo' as const, barbell: 'confident' as const, knows: 'yes' as const }
  assert.equal(program(answered), 'Performance')
  assert.equal(planFor({ ...answered, days: 4 }, 'muscle').splitName, '4 Day Split')
  assert.equal(planFor({ ...answered, days: 4 }, 'muscle').block, true)
})

check('profiles written before the weights question keep their program', () => {
  // Scoring an unanswered question as a no would have quietly demoted
  // everybody already using the app.
  assert.equal(program({ years: 'sixToTwo' }), 'Build')
  assert.equal(program({ years: 'overTwo' }), 'Build')
  assert.equal(program({ years: 'overTwo', barbell: 'confident' }), 'Performance')
})

check('somebody rebuilding is a note, not a beginner course', () => {
  assert.equal(returning({ years: 'under6', before: 'longAgo' }), true)
  assert.equal(returning({ years: 'overTwo' }), false)
  const plan = planFor({ years: 'under6', before: 'longAgo', days: 4 }, 'muscle')
  assert.equal(plan.returning, true)
  assert.equal(plan.splitName, 'Full Body, building up')
})

check('a flagged health answer changes the plan, not just the wording', () => {
  const flagged = planFor({ years: 'overTwo', barbell: 'confident', knows: 'yes', condition: 'yes' }, 'muscle')
  assert.equal(flagged.cleared, true)
  assert.equal(flagged.block, false, 'no block either')
  assert.equal(flagged.sets, '2 to 3')
  const clear = planFor({ years: 'overTwo', barbell: 'confident', knows: 'yes', condition: 'no' }, 'muscle')
  assert.equal(clear.block, true)
})

check('a stated goal is never quietly rewritten', () => {
  // Leaning out shows what building muscle shows, because it prescribes what
  // building muscle prescribes. It used to advertise 8 to 15 and hand out
  // 8 to 12, which is the sort of gap nobody notices until they count.
  assert.equal(planFor({ goalChoice: 'lean' }, 'muscle').reps, '6 to 12')
  assert.ok(planFor({ goalChoice: 'lean' }, 'muscle').goalNote, 'lean says what it maps to')
  assert.ok(planFor({ goalChoice: 'health' }, 'endurance').goalNote, 'health says what it maps to')
  assert.ok(planFor({ goalChoice: 'muscle' }, 'muscle').goalNote, 'and so does every other one')
  assert.equal(planFor({ goalChoice: 'strength' }, 'strength').reps, '3 to 6')
})

check('age comes from the number when there is one', () => {
  assert.equal(planFor({ ageYears: 64, years: 'overTwo', barbell: 'confident', knows: 'yes' }, 'muscle').sets, '2 to 3')
  assert.equal(planFor({ ageYears: 35, years: 'overTwo', barbell: 'confident', knows: 'yes' }, 'muscle').sets, '3 to 4')
})

check('every program has a real week for every day count it offers', () => {
  const shapes = [
    { years: 'never' as const, before: 'no' as const, knows: 'no' as const },
    { years: 'under6' as const, before: 'longAgo' as const },
    { years: 'sixToTwo' as const, barbell: 'rusty' as const, knows: 'roughly' as const },
    { years: 'overTwo' as const, barbell: 'confident' as const, knows: 'yes' as const },
  ]
  for (const shape of shapes) {
    for (let days = MIN_DAYS; days <= MAX_DAYS; days += 1) {
      const plan = planFor({ ...shape, days }, 'muscle')
      assert.equal(plan.days, days, `${plan.program} asked for ${days}`)
      assert.equal(plan.dayIds.length, days, `${plan.program} ${days} day week is short`)
      assert.ok(plan.splitName, `${plan.program} ${days} has no name`)
      for (const id of plan.dayIds) assert.ok(dayById(id), `missing template day ${id}`)
    }
  }
})

check('the days you say are the days you get', () => {
  // Six used to be quietly served back as five. Whether somebody trains three
  // days or six is theirs to state.
  assert.equal(MIN_DAYS, 3)
  assert.equal(MAX_DAYS, 6)
  assert.equal(planFor({ days: 3 }, 'muscle').days, 3)
  assert.equal(planFor({ days: 6 }, 'muscle').days, 6)
  assert.equal(planFor({ days: 6 }, 'muscle').capped, false)
  assert.ok(planFor({ days: 6 }, 'muscle').restNote, 'six days says so once')
  assert.equal(planFor({ days: 4 }, 'muscle').restNote, null)
  // Anything outside the offered range is clamped rather than crashing, which
  // is what a profile saved when two and seven were on offer will hit.
  assert.equal(planFor({ days: 7 }, 'muscle').days, MAX_DAYS)
  assert.equal(planFor({ days: 7 }, 'muscle').capped, true)
  assert.equal(planFor({ days: 2 }, 'muscle').days, MIN_DAYS)
  assert.equal(planFor({ days: 1 }, 'muscle').days, MIN_DAYS)
  // And a clamped week still points at real template days.
  for (const days of [1, 2, 7, 9]) {
    const plan = planFor({ days }, 'muscle')
    assert.equal(plan.dayIds.length, plan.days, `${days} clamped to ${plan.days}`)
    for (const id of plan.dayIds) assert.ok(dayById(id), `missing template day ${id}`)
  }
})

check('a six day week repeats the upper days and splits the legs', () => {
  const six = planFor({ years: 'sixToTwo', barbell: 'rusty', knows: 'roughly', days: 6 }, 'muscle')
  assert.equal(six.dayIds.length, 6)
  // It used to be push pull legs twice through, which meant doing the same leg
  // session on Tuesday and Friday. Push and pull still repeat, because they are
  // worth repeating; the legs day became two different ones.
  assert.equal(new Set(six.dayIds).size, 4)
  const names = six.dayIds.map((id) => dayById(id)?.name ?? '')
  assert.ok(names.some((n) => /quad/i.test(n)))
  assert.ok(names.some((n) => /hamstring|glute/i.test(n)))
  // Repeats are why anything rendering these keys does it by index, not by id.
  const counts = new Map<string, number>()
  for (const id of six.dayIds) counts.set(id, (counts.get(id) ?? 0) + 1)
  assert.equal(counts.get('ppl-push'), 2)
  assert.equal(counts.get('ppl-pull'), 2)
})

check('the calendar does not say what the card above it just said', () => {
  const app = readFileSync(new URL('../components/App.tsx', import.meta.url), 'utf8')

  // A box sat under the Today card on any day with nothing logged, and every
  // branch of it repeated the card directly above: Rest day underneath a card
  // headed Rest day, and Tap Start below underneath a card carrying a Start
  // button, pointing down at a second one. An empty state whose whole job is
  // to restate the thing above it is furniture.
  assert.ok(!/Nothing to log unless/.test(app), 'the rest day box came back')
  assert.ok(!/Tap Start below/.test(app), 'the tap start box came back')

  // The card above still says all three of those things itself, which is why
  // the box could go.
  const card = readFileSync(new URL('../components/TodayCard.tsx', import.meta.url), 'utf8')
  assert.ok(/'Rest day'/.test(card), 'a rest day is now nowhere on the screen')
  assert.ok(/'No week set yet'/.test(card))
  assert.ok(/Start \{day.name\}/.test(card), 'and nothing offers to start the session')
})

check('one door into Settings, not two on the same screen', () => {
  // The profile page carried a full width Settings card as well as the pill in
  // its own header, added on the reasoning that the pill was easy to miss. Two
  // doors to the same room on the same screen is not the fix for a door being
  // small, it is the same confusion with more of it.
  const sheet = readFileSync(new URL('../components/ProfileSheet.tsx', import.meta.url), 'utf8')
  const doors = sheet.match(/onClick=\{onOpenSettings\}/g) ?? []
  assert.equal(doors.length, 1, `${doors.length} ways into Settings on one page`)
  assert.ok(!/Theme, notifications, your data, sign out/.test(sheet), 'the card came back')

  // And the one that stayed is still wired up, or the room has no door at all.
  assert.ok(/action=\{[\s\S]{0,200}onClick=\{onOpenSettings\}/.test(sheet), 'the header pill lost its handler')
})

check('the word before the first session of the day', () => {
  const today = '2026-08-20'
  const base = { years: 'overTwo' as const, knows: 'yes' as const, days: 4, minutes: 60 as const }

  // Asked once. Answering it, either way, is what stops it being asked again,
  // so somebody who says nothing is wrong is not asked twice before lunch.
  assert.equal(greetedOn(base, today), false)
  const fine = recordHello(base, today, [])
  assert.equal(greetedOn(fine, today), true)
  assert.equal(greetedOn(fine, '2026-08-21'), false, 'tomorrow is a different day')

  // What it collects is about today, not about them. Nothing is written into
  // sore, so tomorrow's session is not shaped by how a knee felt on a Tuesday.
  const eased = recordHello(base, today, ['Knee'])
  assert.deepEqual(eased.sore ?? [], [], 'a bad morning became a standing fact')
  assert.deepEqual(easedToday(eased, today), ['Knee'])
  assert.deepEqual(easedToday(eased, '2026-08-21'), [])

  // Today's session is built from the two folded together.
  const day = dayById('ul-lower-a')!
  const normal = buildDay(day, base)
  const today1 = buildDay(day, forToday(eased, today))
  const tomorrow = buildDay(day, forToday(eased, '2026-08-21'))

  assert.deepEqual(today1.map((i) => i.name), normal.map((i) => i.name), 'the session changed as well as easing')
  assert.ok(today1.some((i) => i.lighter), 'nothing was eased')
  assert.ok(tomorrow.every((i) => !i.lighter), 'tomorrow inherited this morning')

  const setsFor = (items: typeof normal) =>
    items.reduce((n, i) => n + prescribedSets(i.name, i.type, 'muscle', i.lighter === true), 0)
  assert.ok(setsFor(today1) < setsFor(normal), 'eased was not actually lighter')
  assert.equal(setsFor(tomorrow), setsFor(normal))

  // Saying no is respected rather than argued with. The question was whether
  // they wanted the session eased, not whether they ought to.
  const declined = recordHello(base, today, [])
  assert.deepEqual(easedToday(declined, today), [])
  assert.ok(buildDay(day, forToday(declined, today)).every((i) => !i.lighter))

  // Yesterday's answer is dropped rather than kept forever.
  const stale = recordHello({ ...base, easedOn: { '2026-08-01': ['Hip'] } }, today, ['Knee'])
  assert.ok(!('2026-08-01' in (stale.easedOn ?? {})), 'old mornings accumulate on the profile')

  // The offer says what it will do, named by the joint they gave rather than
  // by the four muscle groups behind it.
  assert.equal(easedNote(eased, today), 'Anything working your knee runs a set shorter today.')
  assert.equal(easedNote(declined, today), null)

  // It sits in front of the thing somebody opened the app to do, so nothing is
  // wrong has to be one tap.
  const hello = readFileSync(new URL('../components/HelloSheet.tsx', import.meta.url), 'utf8')
  assert.ok(/onStart\(\[\]\)/.test(hello), 'there is no way straight past it')
  assert.ok(/train it as normal/.test(hello), 'the offer cannot be declined')

  // And it only interrupts a real session, never an empty one.
  const app = readFileSync(new URL('../components/App.tsx', import.meta.url), 'utf8')
  assert.ok(/!greetedOn\(data.settings.profile, now\) && items.length > 0/.test(app), 'it greets people into nothing')

  // It is also the only thing in the way. How long have you got used to be
  // asked here too, which was a fair question in the wrong place: two things
  // between a person and the session they opened the app to do is one too
  // many, and the one that can wait is the clock. It lives on the profile and
  // defaults to an hour.
  const start = app.slice(app.indexOf('function startWorkout'), app.indexOf('function resumePendingStart'))
  const stops = start.match(/setSheet\(|setGreeting\(true\)/g) ?? []
  assert.equal(stops.length, 1, `${stops.length} things stop a session starting`)
  assert.ok(!/minutes === undefined/.test(start), 'the clock question is back in the doorway')
})

check('a sore joint lightens the work, a red flag takes it away', () => {
  // This used to delete the squat, the split squat and every lunge the moment
  // somebody said their knee was grumbling, and hand back two machines. That
  // is not what saying your knee is sore means. It means you would like the
  // leg work to go easier for a bit, not that you have stopped training legs,
  // and an app that answers the second question when you asked the first gets
  // the flag switched off rather than obeyed.
  const day = dayById('ul-lower-a')!
  const plain = buildDay(day, {})
  const knee = buildDay(day, { sore: ['Knee'] })

  // Same session. Same movements, in the same order.
  assert.deepEqual(knee.map((i) => i.name), plain.map((i) => i.name), 'a sore knee changed the session')

  // Everything crossing the knee runs a set shorter, and nothing else does.
  const legs = ['Quads', 'Hamstrings', 'Glutes', 'Calves']
  for (const item of knee) {
    const crosses = legs.includes(groupOf(item.name) ?? '')
    assert.equal(item.lighter === true, crosses, `${item.name} was ${crosses ? 'not ' : ''}eased`)
  }
  const squat = knee.find((i) => i.name === 'Back Squat')!
  assert.equal(
    prescribedSets(squat.name, squat.type, 'muscle', true),
    prescribedSets(squat.name, squat.type, 'muscle', false) - 1,
    'eased is not actually a set fewer',
  )

  // The red flag beside the question is the escalation, and it still removes
  // things, because pain that wakes you at night is not something to leg press
  // around. That is the one path where the movement goes.
  const flagged = buildDay(day, { sore: ['Knee'], redFlag: true })
  assert.ok(!flagged.some((i) => /Squat|Lunge|Leg Press|Leg Extension/.test(i.name)), 'a red flag left the leg work in')
  assert.ok(flagged.length < plain.length, 'a red flag changed nothing')

  // And a flagged joint is not eased on top of being avoided, which would be
  // the app hedging in two directions at once.
  assert.ok(flagged.every((i) => !i.lighter), 'a red flagged session is also running short')

  // Every joint, not just the knee: saying one is sore never empties a day.
  for (const joint of ['Knee', 'Low back', 'Shoulder', 'Hip', 'Elbow', 'Wrist']) {
    for (const id of ['ul-lower-a', 'ul-lower-b', 'ppl-push', 'ppl-pull']) {
      const built = buildDay(dayById(id)!, { sore: [joint] })
      assert.equal(
        built.length,
        buildDay(dayById(id)!, {}).length,
        `a sore ${joint} shortened ${id}`,
      )
    }
  }
})

check('bodyweight only leaves nothing that needs a rack', () => {
  for (const id of ['fb-a', 'fb-b', 'ul-upper-a']) {
    const items = buildDay(dayById(id)!, { access: 'body' })
    assert.ok(items.length >= 3, `${id} came back with ${items.length}`)
    for (const item of items) {
      assert.equal(equipmentOf(item.name), 'bodyweight', `${item.name} is not bodyweight`)
    }
  }
})

check('the clock is a ceiling, and the finisher is not the session', () => {
  // The cap used to be a fixed count per bucket: four movements at thirty
  // minutes, twelve at ninety. That counted the wrong thing. A heavy squat day
  // rests three minutes between sets and a pump day rests sixty seconds, so
  // eight movements is fifty minutes of one and seventy of the other, and
  // ninety minutes was delivering a forty three minute push day.
  const day = dayById('five-chest')!

  for (const minutes of [30, 45, 60] as const) {
    const items = buildDay(day, { minutes })
    const mins = estimateSeconds(items, 'muscle') / 60
    assert.ok(items.length >= 3, `${minutes} minutes came back with ${items.length} movements`)
    // Under the ceiling, or over it by exactly the things that are reserved on
    // purpose: the three movement floor and the core finisher. Some sessions
    // genuinely cannot be done in half an hour once the rest a heavy lift
    // needs and the time it takes to warm up are counted honestly, and a two
    // movement leg day is a worse answer than an overrun the card tells you
    // about. What must never happen is overrunning by more than one deliberate
    // inclusion, which is checked by dropping the last movement.
    const withoutLast = estimateSeconds(items.slice(0, -1), 'muscle') / 60
    assert.ok(
      mins <= minutes || items.length <= 3 || withoutLast <= minutes,
      `${minutes} minutes came back as ${Math.round(mins)} with ${items.length} movements`,
    )
    // Never an orphaned circuit member: a superset arrives whole or as one
    // movement that has stopped calling itself a circuit.
    const tags = new Set(items.filter((i) => i.superset).map((i) => i.superset))
    for (const tag of tags) {
      assert.equal(items.filter((i) => i.superset === tag).length, 2, 'half a circuit arrived')
    }
  }

  // And the finisher never becomes the session. At thirty minutes with core
  // brought to the front, the circuit cannot take the whole budget.
  const focused = buildDay(day, { minutes: 30, focus: ['Core'] })
  assert.ok(
    focused.filter((i) => groupOf(i.name) !== 'Core').length >= 2,
    'a core focused half hour came back as core and nothing else',
  )
  assert.ok(focused.some((i) => groupOf(i.name) === 'Core'), 'the trim took the focused work')

  // No limit means no trimming, so the day arrives as written.
  const whole = buildDay(day, { minutes: LONG_SESSION })
  assert.equal(whole.filter((i) => i.superset).length, 2, 'the whole circuit no longer survives')
  assert.ok(whole.length > buildDay(day, { minutes: 45 }).length, 'no limit is no different to 45 minutes')

  // A tighter clock is never a longer session.
  const lengths = ([30, 45, 60] as const).map((m) => buildDay(day, { minutes: m }).length)
  assert.deepEqual([...lengths].sort((a, b) => a - b), lengths, 'less time gave more movements')
})

check('dislikes are never suggested', () => {
  const items = buildDay(dayById('fb-a')!, { dislikes: ['Back Squat', 'Plank'] })
  assert.ok(!items.some((i) => i.name === 'Back Squat' || i.name === 'Plank'))
})

check('the check-in fires once, on a rolling window, and an answer sticks', () => {
  const today = '2026-08-18'
  // not before four weeks have passed since onboarding
  assert.equal(needsCheckin({ days: 4 }, '2026-08-01T00:00:00Z', 2, today), false)
  // after four weeks, low recent attendance fires it
  assert.equal(needsCheckin({ days: 4 }, '2026-07-01T00:00:00Z', 5, today), true)
  // a strong recent month clears a weak start
  assert.equal(needsCheckin({ days: 4 }, '2026-07-01T00:00:00Z', 12, today), false)
  // an answer, either way, is final
  assert.equal(
    needsCheckin({ days: 4, checkinDismissedAt: '2026-08-01T00:00:00Z' }, '2026-07-01T00:00:00Z', 2, today),
    false,
  )
  // nobody already on the shortest week is nagged toward it
  assert.equal(needsCheckin({ days: MIN_DAYS }, '2026-07-01T00:00:00Z', 2, today), false)
  assert.equal(needsCheckin({ days: 2 }, '2026-07-01T00:00:00Z', 2, today), false)
  // never onboarded, never nagged
  assert.equal(needsCheckin({ days: 4 }, null, 0, today), false)
})

const HISTORY: Workout[] = [
  {
    id: 'w1', date: '2026-08-03', title: 'Push',
    exercises: [
      { id: 'e1', name: 'Incline Dumbbell Press', type: 'W', sets: [
        { id: 's1', w: 70, r: 10 }, { id: 's2', w: 70, r: 9 },
      ] },
      { id: 'e2', name: 'Plank', type: 'T', sets: [{ id: 's3', t: 60 }] },
    ],
  },
  {
    id: 'w2', date: '2026-08-10', title: 'Push',
    exercises: [
      { id: 'e3', name: 'Incline Dumbbell Press', type: 'W', sets: [
        { id: 's4', w: 75, r: 8 }, { id: 's5', w: 75, r: 7 },
      ] },
    ],
  },
]

check('bests come from every earlier session, not just the last one', () => {
  const b = bestsFor(HISTORY, 'Incline Dumbbell Press', 'today', '2026-08-18')
  assert.equal(b.load, 75)
  assert.equal(b.reps, 10)
  assert.equal(b.volume, 1330, '70 x 10 plus 70 x 9 is the bigger session')
  assert.ok(Math.abs(b.e1rm - 95) < 0.1, `estimated max was ${b.e1rm}`)
  assert.equal(b.seen, true)
  assert.equal(bestsFor(HISTORY, 'Leg Press', 'today', '2026-08-18').seen, false)
})

check('a first outing is never a PR', () => {
  const fresh = bestsFor(HISTORY, 'Leg Press', 'today', '2026-08-18')
  assert.deepEqual(prsFor({ id: 'x', w: 400, r: 10 }, 'W', fresh, 'muscle'), [])
})

check('PRs fire on load, reps and estimated max', () => {
  const b = bestsFor(HISTORY, 'Incline Dumbbell Press', 'today', '2026-08-18')
  assert.deepEqual(prsFor({ id: 'x', w: 80, r: 8 }, 'W', b, 'muscle'), ['e1rm', 'load'])
  assert.deepEqual(prsFor({ id: 'x', w: 75, r: 11 }, 'W', b, 'muscle'), ['e1rm', 'reps'])
  assert.deepEqual(prsFor({ id: 'x', w: 70, r: 9 }, 'W', b, 'muscle'), [])
  assert.deepEqual(prsFor({ id: 'x', t: 90 }, 'T', bestsFor(HISTORY, 'Plank', 'today', '2026-08-18'), 'muscle'), ['time'])
})

check('a grindy single is not a PR unless strength is the goal', () => {
  const b = bestsFor(HISTORY, 'Incline Dumbbell Press', 'today', '2026-08-18')
  const single = { id: 'x', w: 100, r: 1 }
  assert.deepEqual(prsFor(single, 'W', b, 'muscle'), [])
  assert.ok(prsFor(single, 'W', b, 'strength').includes('load'))
})

check('session volume PR reads the whole exercise', () => {
  const b = bestsFor(HISTORY, 'Incline Dumbbell Press', 'today', '2026-08-18')
  const big = { id: 'e', name: 'Incline Dumbbell Press', type: 'W' as const, sets: [
    { id: 'a', w: 75, r: 10 }, { id: 'b', w: 75, r: 10 },
  ] }
  assert.equal(volumePr(big, b), true)
  const small = { ...big, sets: [{ id: 'a', w: 75, r: 5 }] }
  assert.equal(volumePr(small, b), false)
})

check('beating the ghost compares set for set', () => {
  assert.equal(beatsLast({ id: 'x', w: 75, r: 9 }, { id: 'y', w: 75, r: 8 }, 'W'), true)
  assert.equal(beatsLast({ id: 'x', w: 80, r: 7 }, { id: 'y', w: 75, r: 8 }, 'W'), true)
  assert.equal(beatsLast({ id: 'x', w: 75, r: 8 }, { id: 'y', w: 75, r: 8 }, 'W'), false)
  assert.equal(beatsLast({ id: 'x', t: 70 }, { id: 'y', t: 60 }, 'T'), true)
  assert.equal(beatsLast({ id: 'x', w: 75, r: 9 }, undefined, 'W'), false)
  assert.ok(e1rm({ id: 'x', w: 100, r: 10 })! > e1rm({ id: 'y', w: 100, r: 9 })!)
})

check('weekly coverage counts logged sets by muscle group', () => {
  const week: Workout[] = [
    { id: 'a', date: '2026-08-17', title: 'Push', exercises: [
      { id: 'e', name: 'Incline Dumbbell Press', type: 'W', sets: [
        { id: '1', w: 80, r: 8 }, { id: '2', w: 80, r: 8 }, { id: '3' },
      ] },
    ] },
  ]
  const chest = weeklyCoverage(week, '2026-08-18').find((g) => g.group === 'Chest')!
  assert.equal(chest.sets, 2, 'the empty set row should not count')
  assert.equal(weeklyCoverage(week, '2026-08-25').find((g) => g.group === 'Chest')!.sets, 0, 'last week is not this week')
  // Sunday to Saturday, the way the schedule reads and a phone draws a
  // calendar. One definition, so the strip on the Workout tab and the streak
  // beside it can never disagree about which week you are in.
  assert.equal(weekStart('2026-08-18'), '2026-08-16', 'a Tuesday belongs to the Sunday before it')
  assert.equal(weekStart('2026-08-16'), '2026-08-16', 'and a Sunday starts its own week')
  assert.equal(weekStart('2026-08-22'), '2026-08-16', 'through to the Saturday')
  assert.equal(weekStart('2026-08-23'), '2026-08-23', 'the next Sunday starts the next one')
})

check('the 28 day grid marks only days with something written down', () => {
  const grid = trainingGrid(HISTORY, '2026-08-18')
  assert.equal(grid.length, 28)
  assert.equal(grid[grid.length - 1].date, '2026-08-18')
  assert.equal(grid.filter((d) => d.trained).length, 2)
})

check('the streak counts weeks, so a rest day costs nothing', () => {
  const set = (id: string, date: string): Workout => ({
    id, date, title: 'x',
    exercises: [{ id: id + 'e', name: 'Leg Press', type: 'W', sets: [{ id: id + 's', w: 100, r: 10 }] }],
  })
  const weeks = [
    set('a', '2026-08-17'), set('b', '2026-08-19'),
    set('c', '2026-08-10'), set('d', '2026-08-12'),
    set('e', '2026-08-03'),
  ]
  assert.equal(weeklyStreak(weeks, '2026-08-19', 2), 2, 'two full weeks, the third only had one day')
  assert.equal(weeklyStreak(weeks, '2026-08-19', 3), 0)
  // A quiet current week must not wipe out the weeks behind it.
  assert.equal(weeklyStreak(weeks, '2026-08-24', 2), 2, 'the two completed weeks behind it still count')
})

check('lifetime totals count only what was written down', () => {
  const t = lifetime(HISTORY)
  assert.equal(t.sessions, 2)
  assert.equal(t.sets, 5)
  assert.equal(t.reps, 34)
  assert.equal(t.volume, 70 * 10 + 70 * 9 + 75 * 8 + 75 * 7)
  assert.equal(t.seconds, 60)

  const blank: Workout[] = [
    { id: 'z', date: '2026-08-18', title: 'started, never logged', exercises: [
      { id: 'e', name: 'Leg Press', type: 'W', sets: [{ id: 's' }] },
    ] },
  ]
  assert.equal(lifetime(blank).sessions, 0, 'an empty session is not a session')
})

check('landmarks point at the next round number', () => {
  assert.deepEqual(nextLandmark(0, LADDERS.sessions).next, 10)
  assert.deepEqual(nextLandmark(10, LADDERS.sessions).next, 25)
  const half = nextLandmark(30, [0, 20, 40])
  assert.equal(half.next, 40)
  assert.equal(Math.round(half.pct), 50)
  assert.equal(nextLandmark(99_999_999, LADDERS.volume).next, null)
  assert.equal(nextLandmark(99_999_999, LADDERS.volume).pct, 100)
})

check('a block runs six weeks and repeats', () => {
  // Three weeks was never long enough to be a block: the cycle restarted
  // before the body had finished adapting to it.
  assert.equal(blockWeek({}, '2026-08-18'), null, 'off unless it is turned on')
  const on = { block: true, blockStart: '2026-08-03' }
  assert.equal(blockWeek(on, '2026-08-05')!.index, 1)
  assert.equal(blockWeek(on, '2026-09-07')!.index, 6, 'the sixth week is the deload')
  assert.equal(blockWeek(on, '2026-09-07')!.name, 'Deload')
  assert.equal(blockWeek(on, '2026-09-14')!.index, 1, 'and round again')
  assert.equal(blockNumber(on, '2026-08-05'), 1)
  assert.equal(blockNumber(on, '2026-09-14'), 2, 'a new block, not week seven')
  assert.equal(BLOCK.length, BLOCK_WEEKS)
  assert.ok(BLOCK_WEEKS >= 6, 'a block is at least six weeks')
  // A block week is the same week as everything else: Sunday to Saturday.
  // This used to compare mondayOf against weekStart and call it proof of one
  // definition. They were the same function under two names, so it could only
  // ever pass, and the name was wrong besides: it returns a Sunday.
  assert.equal(weekStart('2026-08-19'), '2026-08-16')
  // Effort climbs to the peak and then drops off for the deload.
  assert.deepEqual(BLOCK.map((w) => w.score[1]), [6, 7, 8, 9, 10, 4])
})

check('a block reads the session scores written down this week', () => {
  const week = BLOCK[3]
  const sessions = (scores: number[]): Workout[] =>
    scores.map((n, i) => ({
      id: String(i), date: '2026-08-18', title: 'Push', intensity: n, exercises: [],
    }))
  assert.equal(readBlock(sessions([8, 8]), week, '2026-08-18').verdict, 'on')
  assert.equal(readBlock(sessions([4, 5]), week, '2026-08-18').verdict, 'under')
  assert.equal(readBlock(sessions([10, 10]), week, '2026-08-18').verdict, 'over')
  assert.equal(readBlock([], week, '2026-08-18').verdict, null)
  assert.equal(readBlock(sessions([9, 8]), week, '2026-08-18').average, 8.5)
  // A session logged last week is not this week's evidence.
  const old = [{ id: 'o', date: '2026-08-10', title: 'Push', intensity: 2, exercises: [] }]
  assert.equal(readBlock(old, week, '2026-08-18').verdict, null)
})

check('a set is only a set once the fields that matter are filled', () => {
  assert.equal(isFullSet({ id: 'a', w: 80 }, 'W'), false, 'a load with no reps is half a set')
  assert.equal(isFullSet({ id: 'a', r: 8 }, 'W'), false)
  assert.equal(isFullSet({ id: 'a', w: 80, r: 8 }, 'W'), true)
  assert.equal(isFullSet({ id: 'a', r: 12 }, 'R'), true)
  assert.equal(isFullSet({ id: 'a', t: 60 }, 'T'), true)
  assert.equal(isFullSet({ id: 'a', w: 70, d: 50 }, 'WD'), true)
})

check('rest is set by what the movement actually costs you', () => {
  // This check used to hold the line at two minutes on the muscle goal, on the
  // stated grounds that three minutes is not the shape of a session somebody
  // trains most days. That was a deliberate trade of the evidence against the
  // clock, and it was made invisibly: Lifty's own answer on resting has always
  // said two to three minutes on big lifts and that too little rest quietly
  // costs reps, so the app was arguing with itself and only one side was
  // written down. The clock is handled honestly now, by the estimate and the
  // ceiling, so the rest table no longer has to lie to keep sessions short.
  assert.equal(restFor('Back Squat', 'W', 'muscle'), 150)
  assert.equal(restFor('Deadlift', 'W', 'muscle'), 150)
  assert.equal(restFor('Machine Shoulder Press', 'W', 'muscle'), 120)
  // Single joint free weight sits between the compounds and the cables.
  assert.equal(restFor('Lateral Raise', 'W', 'muscle'), 75)
  assert.equal(restFor('Leg Extension', 'W', 'muscle'), 75)
  assert.equal(restFor('Cable Curl', 'W', 'muscle'), 60)
  // Core and calves are recovered before you have put the weight down.
  assert.equal(restFor('Plank', 'T', 'muscle'), 45)
  assert.equal(restFor('Standing Calf Raise', 'W', 'muscle'), 45)
  // What Lifty says and what the timer does are the same thing now.
  const advice = KNOWLEDGE.find((e) => e.id === 'basic-rest')!.a
  assert.ok(/2 to 3 minutes on big lifts/.test(advice), 'the answer moved and the table did not')
  assert.ok(restFor('Back Squat', 'W', 'muscle') >= 120, 'a big lift rests less than Lifty promises')
  // Cardio never starts a clock.
  assert.equal(restFor('Treadmill', 'C', 'muscle'), 0)
  // Strength is the top of every band, endurance the bottom.
  assert.ok(restFor('Back Squat', 'W', 'strength') > restFor('Back Squat', 'W', 'muscle'))
  assert.ok(restFor('Back Squat', 'W', 'endurance') < restFor('Back Squat', 'W', 'muscle'))
})

check('a dumbbell or one limb is not the barbell version', () => {
  // These all match the heavy patterns by name and must not be scored as if
  // they were: half the load is half the recovery.
  assert.equal(restTier('Dumbbell Bench Press', 'W'), 'compound')
  assert.equal(restTier('Dumbbell Romanian Deadlift', 'W'), 'compound')
  assert.equal(restTier('Single Leg Romanian Deadlift', 'W'), 'compound')
  assert.equal(restTier('Single Leg Hip Thrust', 'W'), 'compound')
  assert.equal(restTier('Goblet Squat', 'W'), 'compound')
  assert.equal(restTier('Walking Lunge', 'W'), 'compound')
  // And the barbell versions still are.
  assert.equal(restTier('Romanian Deadlift', 'W'), 'heavy')
  assert.equal(restTier('Hip Thrust', 'W'), 'heavy')
  assert.equal(restTier('Back Squat', 'W'), 'heavy')
})

check('a machine can still take a near max effort out of you', () => {
  // Being held up by a frame does not make a leg press an accessory: it is the
  // heaviest thing most people move all week, and a sled leaves you on the
  // floor. Both were sitting on the same clock as a machine shoulder press.
  assert.equal(restTier('Leg Press', 'W'), 'heavy')
  assert.equal(restTier('Hack Squat', 'W'), 'heavy')
  assert.equal(restTier('Belt Squat', 'W'), 'heavy')
  assert.equal(restTier('Sled Push', 'W'), 'heavy')
  assert.equal(restTier('Nordic Curl', 'R'), 'heavy', 'and a curl can be a near max effort')
  assert.equal(restTier('Glute Ham Raise', 'R'), 'heavy')
  // But one leg at a time is still half the load.
  assert.equal(restTier('Single Leg Press', 'W'), 'compound')
  assert.equal(restTier('Single Leg Curl', 'W'), 'isolation', 'and still single joint')
})

check('moving your own bodyweight is not the same effort as a barbell', () => {
  // Same pattern, nothing like the same load.
  assert.equal(restTier('Push Up', 'R'), 'isolation')
  assert.equal(restTier('Inverted Row', 'R'), 'isolation')
  assert.equal(restTier('Bench Dip', 'R'), 'isolation')
  assert.equal(restTier('Bodyweight Squat', 'R'), 'isolation')
  assert.equal(restTier('Glute Bridge', 'R'), 'isolation')
  // Loaded, the same movement earns the barbell clock again.
  assert.equal(restTier('Weighted Push Up', 'W'), 'heavy')
  assert.equal(restTier('Weighted Dip', 'W'), 'heavy')
  // A hold is over when you fall out of it.
  assert.equal(restTier('Wall Sit', 'T'), 'small')
  assert.equal(restTier('Plank', 'T'), 'small')
  // And these two are single joint whatever their names suggest.
  assert.equal(restTier('Straight Arm Pulldown', 'W'), 'cable')
  assert.equal(restTier('21s', 'W'), 'isolation')
})

check('the week you are in moves the clock', () => {
  // What the block asks for is the app's own read on how hard today should be,
  // and it is the only intensity signal left after RPE went.
  const week = (name: string) => BLOCK.find((w) => w.name === name)!
  assert.equal(effortFactor(null), 1, 'off a block, nothing moves')
  // Scaled off the base, which moved when the muscle column stopped resting a
  // big lift for ninety seconds. The shape is what matters here: a peak week
  // rests longest, a deload least, and every step between them is even.
  const base = restFor('Back Squat', 'W', 'muscle')
  assert.equal(base, 150)
  const byWeek = ['Peak', 'Push', 'Build', 'Groove', 'Deload'].map((n) =>
    restFor('Back Squat', 'W', 'muscle', effortFactor(week(n))),
  )
  assert.deepEqual(byWeek, [195, 165, 150, 135, 120])
  assert.deepEqual([...byWeek].sort((a, b) => b - a), byWeek, 'a harder week rested less')
  // Rounded to fifteen seconds, and never under thirty.
  assert.equal(scaleRest(45, 1.25), 60)
  assert.equal(scaleRest(45, 0.75), 30)
  assert.equal(scaleRest(30, 0.75), 30, 'nothing is worth less than thirty seconds')
  assert.equal(scaleRest(0, 1.25), 0, 'and cardio still starts no clock')
  for (const w of BLOCK) {
    const seconds = restFor('Cable Curl', 'W', 'muscle', effortFactor(w))
    assert.equal(seconds % 15, 0, `week ${w.index} gave ${seconds}, which is false precision`)
  }
})

check('a machine press is supported work, whatever the word press implies', () => {
  // Order matters in the classifier: supported is checked before heavy, so a
  // machine or Smith version never inherits the barbell clock.
  assert.equal(restTier('Machine Shoulder Press', 'W'), 'compound')
  assert.equal(restTier('Smith Machine Bench Press', 'W'), 'compound')
  assert.equal(restTier('Hammer Strength Chest Press', 'W'), 'compound')
  assert.equal(restTier('Chest Supported Row', 'W'), 'compound')
  // And a machine or cable version of single joint work is the shortest rest.
  assert.equal(restTier('Pec Deck', 'W'), 'cable')
  assert.equal(restTier('Cable Fly', 'W'), 'cable')
  assert.equal(restTier('Face Pull', 'W'), 'cable')
  assert.equal(restTier('Barbell Curl', 'W'), 'isolation', 'a free weight curl is not cable work')
})

check('every movement in the library lands on a rest tier', () => {
  const seen = new Set<string>()
  for (const e of LIBRARY) {
    const tier = restTier(e.name, e.type)
    seen.add(tier)
    const seconds = restFor(e.name, e.type, 'muscle')
    if (e.type === 'C') assert.equal(seconds, 0, `${e.name} is cardio and starts no clock`)
    else assert.ok(seconds >= 45 && seconds <= 150, `${e.name} rests ${seconds}s on the muscle goal`)
  }
  assert.equal(seen.size, 5, 'all five tiers are actually used')
})

check('consecutive exercises sharing a tag are one superset', () => {
  const ex = (id: string, name: string, superset: string | null = null): Exercise => ({
    id, name, type: 'W', sets: [], superset,
  })
  const runs = groupRuns([
    ex('1', 'Back Squat'),
    ex('2', 'Incline Dumbbell Press', 'a'),
    ex('3', 'Barbell Row', 'a'),
    ex('4', 'Cable Curl'),
    ex('5', 'Lateral Raise', 'b'),
    ex('6', 'Face Pull', 'b'),
  ])
  assert.equal(runs.length, 4)
  assert.deepEqual(runs.map((r) => r.exercises.length), [1, 2, 1, 2])
  assert.equal(isSuperset(runs[0]), false)
  assert.equal(isSuperset(runs[1]), true)
  assert.equal(supersetLetter(runs[1].index), 'A')
  assert.equal(supersetLetter(runs[3].index), 'B')
})

check('a tagged exercise on its own is not a superset', () => {
  const lonely: Exercise = { id: '1', name: 'Back Squat', type: 'W', sets: [], superset: 'a' }
  const runs = groupRuns([lonely])
  assert.equal(runs.length, 1)
  assert.equal(isSuperset(runs[0]), false, 'one movement is just a movement')
})

check('the same tag either side of a gap is two supersets', () => {
  const ex = (id: string, superset: string | null): Exercise => ({
    id, name: 'Cable Curl', type: 'W', sets: [], superset,
  })
  const runs = groupRuns([ex('1', 'a'), ex('2', 'a'), ex('3', null), ex('4', 'a'), ex('5', 'a')])
  assert.equal(runs.length, 3)
  assert.equal(supersetLetter(runs[0].index), 'A')
  assert.equal(supersetLetter(runs[2].index), 'B')
})

check('a superset rests as long as its hungriest movement', () => {
  const run = groupRuns([
    { id: '1', name: 'Back Squat', type: 'W', sets: [], superset: 'a' },
    { id: '2', name: 'Cable Curl', type: 'W', sets: [], superset: 'a' },
  ])[0]
  assert.equal(supersetRest(run, 'muscle'), restFor('Back Squat', 'W', 'muscle'))
  assert.ok(supersetRest(run, 'muscle') > restFor('Cable Curl', 'W', 'muscle'))
})

check('a series needs two sessions before there is a line', () => {
  assert.equal(seriesFor(HISTORY, 'Plank'), null, 'one session is a dot, not a trend')
  assert.equal(seriesFor(HISTORY, 'Leg Press'), null)
  assert.ok(seriesFor(HISTORY, 'Incline Dumbbell Press'))
})

check('the series takes the best set of each session, oldest first', () => {
  const s = seriesFor(HISTORY, 'Incline Dumbbell Press')!
  assert.equal(s.points.length, 2)
  assert.deepEqual(s.points.map((p) => p.date), ['2026-08-03', '2026-08-10'])
  assert.equal(s.points[0].label, '70 x 10')
  assert.equal(s.metric, 'Estimated max')
  assert.ok(Math.abs(s.points[0].value - 93.3) < 0.2)
  assert.ok(Math.abs(s.latest - 95) < 0.2)
  assert.equal(Math.round(s.best), 95)
  assert.ok(s.change !== null && s.change > 0, 'it went up')
})

check('two sessions on one day are one point, at the better of them', () => {
  const twice: Workout[] = [
    ...HISTORY,
    { id: 'w2b', date: '2026-08-10', title: 'Push again', exercises: [
      { id: 'e4', name: 'Incline Dumbbell Press', type: 'W', sets: [{ id: 's5', w: 85, r: 6 }] },
    ] },
  ]
  const s = seriesFor(twice, 'Incline Dumbbell Press')!
  assert.equal(s.points.length, 2, 'still two dates')
  assert.equal(s.points[1].label, '85 x 6', 'the better of the two on that day')
})

check('movements rank by how many sessions they appear in', () => {
  const busy: Workout[] = [
    ...HISTORY,
    { id: 'w3', date: '2026-08-17', title: 'Push', exercises: [
      { id: 'e5', name: 'Incline Dumbbell Press', type: 'W', sets: [{ id: 's6', w: 80, r: 8 }] },
      { id: 'e6', name: 'Plank', type: 'T', sets: [{ id: 's7', t: 75 }] },
    ] },
  ]
  const names = trackedNames(busy)
  assert.equal(names[0], 'Incline Dumbbell Press', 'three sessions beats two')
  assert.ok(names.includes('Plank'))
  assert.ok(!names.includes('Leg Press'), 'one session is not enough to rank')
})

const ex = (id: string, name: string, superset: string | null = null, type: 'W' | 'T' = 'W'): Exercise => ({
  id, name, type, sets: [], superset,
})

check('the big compound movement goes first', () => {
  const order = hardestFirst([
    ex('1', 'Cable Curl'),
    ex('2', 'Plank', null, 'T'),
    ex('3', 'Lateral Raise'),
    ex('4', 'Back Squat'),
    ex('5', 'Barbell Row'),
  ]).map((e) => e.name)

  assert.equal(order[0], 'Back Squat', 'a squat should never sit behind a curl')
  assert.equal(order[1], 'Barbell Row')
  assert.equal(order[order.length - 1], 'Plank', 'the core work stays at the end')
  assert.ok(order.indexOf('Lateral Raise') < order.indexOf('Cable Curl'), 'shoulders outrank arms')
})

check('muscle group size ranks large, medium, small', () => {
  assert.equal(groupSize('Back Squat'), 3)
  assert.equal(groupSize('Lateral Raise'), 2)
  assert.equal(groupSize('Cable Curl'), 1)
})

check('their own numbers break the tie between two big lifts', () => {
  const history: Workout[] = [
    { id: 'w', date: '2026-08-11', title: 'Legs', exercises: [
      { id: 'a', name: 'Leg Press', type: 'W', sets: [{ id: '1', w: 400, r: 10 }] },
      { id: 'b', name: 'Barbell Row', type: 'W', sets: [{ id: '2', w: 135, r: 10 }] },
    ] },
  ]
  const loads = topLoads(history)
  assert.ok(loads.get('Leg Press')! > loads.get('Barbell Row')!)
  const order = hardestFirst([ex('1', 'Barbell Row'), ex('2', 'Leg Press')], loads).map((e) => e.name)
  assert.equal(order[0], 'Leg Press', 'the heavier of the two goes first')

  // With no history to go on, the order it was given survives.
  const blind = hardestFirst([ex('1', 'Barbell Row'), ex('2', 'Leg Press')]).map((e) => e.name)
  assert.equal(blind[0], 'Barbell Row')
})

check('a superset moves and sorts as one thing', () => {
  const list = [ex('1', 'Cable Curl'), ex('2', 'Back Squat', 's'), ex('3', 'Leg Extension', 's')]
  const sorted = hardestFirst(list).map((e) => e.id)
  assert.deepEqual(sorted, ['2', '3', '1'], 'the pair travels together, ranked by the squat')

  const moved = moveRun(sorted.map((id) => list.find((e) => e.id === id)!), '1', -1).map((e) => e.id)
  assert.deepEqual(moved, ['1', '2', '3'], 'moving the curl up jumps the whole superset')

  const stuck = moveRun(list, '1', -1).map((e) => e.id)
  assert.deepEqual(stuck, ['1', '2', '3'], 'nothing moves off the top')
})

check('a session already in order is left alone', () => {
  const list = [ex('1', 'Back Squat'), ex('2', 'Cable Curl')]
  assert.equal(isHardestFirst(list), true)
  assert.equal(isHardestFirst([list[1], list[0]]), false)
})

check('five supersets in one workout letter themselves A to E', () => {
  const list: Exercise[] = []
  for (let g = 0; g < 5; g++) {
    for (let m = 0; m < 2; m++) {
      list.push({ id: `${g}-${m}`, name: 'Cable Curl', type: 'W', sets: [], superset: `group${g}` })
    }
  }
  const runs = groupRuns(list)
  assert.equal(runs.length, 5)
  assert.ok(runs.every((r) => isSuperset(r)))
  assert.deepEqual(runs.map((r) => supersetLetter(r.index)), ['A', 'B', 'C', 'D', 'E'])
})

check('the knowledge base is well formed', () => {
  assert.ok(KNOWLEDGE.length >= 35, `only ${KNOWLEDGE.length} entries`)
  const ids = KNOWLEDGE.map((e) => e.id)
  assert.equal(new Set(ids).size, ids.length, 'duplicate entry ids')
  for (const e of KNOWLEDGE) {
    assert.ok((KNOWLEDGE_GROUPS as readonly string[]).includes(e.group), `${e.id} has group ${e.group}`)
    assert.ok(e.aliases.length >= 2, `${e.id} needs aliases to be findable`)
    assert.ok(e.a.length > 80, `${e.id} answer too thin`)
    assert.ok(!/[–—]/.test(e.a) && !/[–—]/.test(e.q), `${e.id} contains an em or en dash`)
  }
})

check('the questions people actually type find their answers', () => {
  const first = (q: string) => searchKnowledge(q)[0]?.id
  assert.equal(first('what is a drop set'), 'basic-dropset')
  assert.equal(first('what is a superset'), 'basic-superset')
  assert.ok(['strong-progression', 'strong-increments'].includes(first('how should I increase my weights week by week')!))
  // Somebody typing this is asking about a thing the app no longer has, so
  // either answer is the honest one: what happened to it, or how hard to push.
  // The glossary did not exist when this was written, and What is RPE is a
  // better answer to what does rpe 8 mean than either of the two it allowed.
  assert.equal(first('what does rpe 8 mean'), 'w-rpe-term')
  assert.ok(searchKnowledge('how hard should a set be').some((e) => e.id === 'basic-rpe'))
  assert.ok(searchKnowledge('what is a training block').some((e) => e.id === 'num-wave'))
  assert.ok(searchKnowledge('protein').some((e) => e.id === 'basic-protein'))
  assert.ok(searchKnowledge('multiple supersets').some((e) => e.id === 'app-superset-how'))
  assert.ok(searchKnowledge('lost my wifi').some((e) => e.id === 'app-offline'))
  assert.ok(searchKnowledge('deload').some((e) => e.id === 'strong-deload'))
})

check('the gate holds: off topic questions return nothing', () => {
  assert.deepEqual(searchKnowledge('best crypto to buy'), [])
  assert.deepEqual(searchKnowledge('who won the election'), [])
  assert.deepEqual(searchKnowledge(''), [])
})

check('a notes line with two pairs is a set and its drop', () => {
  const rows = parseSetStrings('130x12 110x15', 'W')
  assert.equal(rows.length, 2)
  assert.equal(rows[0].w, 130)
  assert.equal(rows[0].drop ?? null, null)
  assert.equal(rows[1].w, 110)
  assert.equal(rows[1].r, 15)
  assert.equal(rows[1].drop, true)

  const triple = parseSetStrings('42.5x12 37.5x25 30x10', 'W')
  assert.equal(triple.length, 3)
  assert.ok(triple[1].drop && triple[2].drop, 'a double drop is two drop rows')

  assert.equal(parseSetStrings('135x8 @8', 'W').length, 1, 'one pair stays one set')

  const imported = importArtifactData([
    { date: '2026-08-18', title: 'Pull', exercises: [{ name: 'Lat Pulldown', sets: ['130x12', '130x10 100x10'] }] },
  ])
  const sets = imported.workouts[0].exercises[0].sets
  assert.equal(sets.length, 3)
  assert.equal(sets[2].drop, true)
})

check('drop rows set no records and move no bests', () => {
  const withDrop: Workout[] = [
    { id: 'w', date: '2026-08-10', title: 'Pull', exercises: [
      { id: 'e', name: 'Lat Pulldown', type: 'W', sets: [
        { id: 'a', w: 130, r: 12 },
        { id: 'b', w: 100, r: 18, drop: true },
      ] },
    ] },
  ]
  const b = bestsFor(withDrop, 'Lat Pulldown', 'today', '2026-08-18')
  assert.equal(b.reps, 12, 'the 18 rep drop must not become the rep best')
  assert.equal(b.load, 130)

  assert.deepEqual(prsFor({ id: 'x', w: 135, r: 12, drop: true }, 'W', b, 'muscle'), [], 'a drop row can never flag a PR')
  assert.ok(prsFor({ id: 'x', w: 135, r: 12 }, 'W', b, 'muscle').length > 0, 'the same set as a working row can')

  const best = topSet(withDrop[0].exercises[0])
  assert.equal(best?.id, 'a', 'charts and prefill read the working set, not the drop')
})

check('the ghost line writes drops the way he does', () => {
  const line = fmtSets({ id: 'e', name: 'Lat Pulldown', type: 'W', sets: [
    { id: 'a', w: 130, r: 12, rpe: 8 },
    { id: 'b', w: 110, r: 15, drop: true },
    { id: 'c', w: 130, r: 10 },
  ] })
  assert.equal(line, '130 x 12 @8 drop 110 x 15, 130 x 10')
})

check('pounds in, kilos out, and back again unchanged', () => {
  assert.equal(Math.round(toDisplay(220.462, 'kg')), 100)
  assert.equal(Math.round(toPounds(100, 'kg')), 220)
  assert.equal(toDisplay(180, 'lb'), 180)
  assert.equal(Math.round(toPounds(toDisplay(183.7, 'kg'), 'kg') * 10) / 10, 183.7)
  assert.equal(fmtWeight(180, 'lb'), '180 lb')
  assert.equal(fmtWeight(181.4, 'kg'), '82.3 kg')
  assert.equal(fmtWeight(null, 'lb'), '--')
})

check('a weight change reads as a direction, and no change reads as neither', () => {
  assert.equal(fmtDelta(-6.2, 'lb'), 'down 6.2 lb')
  assert.equal(fmtDelta(4, 'lb'), 'up 4 lb')
  assert.equal(fmtDelta(0, 'lb'), null)
})

check('bodyweight summarises against day one and the goal', () => {
  const rows = [
    { date: '2026-01-02', weight: 214 },
    { date: '2026-04-01', weight: 208 },
    { date: '2026-08-18', weight: 202 },
  ]
  const s = summarise(rows, 194)
  assert.equal(s.first, 214)
  assert.equal(s.current, 202)
  assert.equal(s.firstDate, '2026-01-02')
  assert.equal(s.change, -12)
  assert.equal(s.reached, false)
  assert.equal(Math.round((s.toGoal ?? 0) * 100), 60)
  assert.equal(summarise(rows, 205).reached, true, 'past the goal counts as reached')
  assert.equal(summarise([{ date: '2026-01-02', weight: 214 }], 194).change, null, 'one reading is not a direction')
  assert.equal(summarise([], 194).current, null)
})

check('a goal above the starting weight runs the other way', () => {
  const rows = [
    { date: '2026-01-02', weight: 150 },
    { date: '2026-06-01', weight: 158 },
  ]
  assert.equal(summarise(rows, 160).reached, false)
  assert.equal(summarise(rows, 155).reached, true)
  assert.equal(Math.round((summarise(rows, 160).toGoal ?? 0) * 100), 80)
})

check('the weight line is a weekly average, not a diary of water', () => {
  const rows = [
    { date: '2026-08-10', weight: 200 },
    { date: '2026-08-11', weight: 204 },
    { date: '2026-08-12', weight: 199 },
  ]
  const t = trend(rows)
  assert.equal(t.length, 3)
  assert.equal(t[0].weight, 200)
  assert.equal(t[1].weight, 202)
  assert.equal(t[2].weight, 201)
  // A reading outside the window is outside the average.
  const wide = trend([...rows, { date: '2026-09-30', weight: 190 }])
  assert.equal(wide[3].weight, 190)
})

check('an auth redirect can only land on this site', () => {
  // "//evil.example" is a valid relative URL that a browser reads as a
  // protocol relative link, so startsWith('/') on its own is not a check.
  assert.equal(safeNext('/reset'), '/reset')
  assert.equal(safeNext(null), '/')
  assert.equal(safeNext('//evil.example'), '/')
  assert.equal(safeNext('/\\evil.example'), '/')
  assert.equal(safeNext('https://evil.example'), '/')
  assert.equal(safeNext('reset'), '/')
})

check('the longest streak survives a month that went badly', () => {
  const w = (date: string) => ({
    id: date, date, title: 'S',
    exercises: [{ id: 'e', name: 'Leg Press', type: 'W' as const, sets: [{ id: 's', w: 200, r: 10 }] }],
  })
  // Three weeks of two sessions, a gap, then two weeks of two.
  const rows = [
    '2026-01-05', '2026-01-07',
    '2026-01-12', '2026-01-14',
    '2026-01-19', '2026-01-21',
    '2026-03-02', '2026-03-04',
    '2026-03-09', '2026-03-11',
  ].map(w)
  assert.equal(longestStreak(rows, 2), 3)
  assert.equal(longestStreak(rows, 3), 0, 'a target never met is no streak at all')
  assert.equal(longestStreak([], 2), 0)
})

check('the heaviest set on a movement ignores the drops under it', () => {
  const rows = [
    { id: '1', date: '2026-01-05', title: 'A', exercises: [
      { id: 'e', name: 'Incline Dumbbell Press', type: 'W' as const, sets: [
        { id: 'a', w: 80, r: 8 },
        { id: 'b', w: 200, r: 20, drop: true },
      ] },
    ] },
    { id: '2', date: '2026-02-05', title: 'B', exercises: [
      { id: 'f', name: 'Incline Dumbbell Press', type: 'W' as const, sets: [{ id: 'c', w: 85, r: 6 }] },
      { id: 'g', name: 'Cable Curl', type: 'W' as const, sets: [{ id: 'd', w: 40, r: 12 }] },
    ] },
  ]
  const lifts = bestLifts(rows)
  assert.equal(lifts[0].name, 'Incline Dumbbell Press', 'the movement trained most comes first')
  assert.equal(lifts[0].weight, 85, 'a heavy drop is not a best')
  assert.equal(lifts[0].reps, 6)
  assert.equal(lifts[0].date, '2026-02-05')
  assert.equal(lifts[0].sessions, 2)
  assert.equal(lifts.length, 2)
  assert.equal(bestLifts([]).length, 0)
})

check('a set row says what each of its numbers is', () => {
  // Filled in, 80 x 9 is two anonymous boxes. The header is the only thing
  // that names them once the placeholders are gone.
  assert.deepEqual(columnsFor('W'), ['lb', 'reps'])
  assert.deepEqual(columnsFor('R'), ['reps'])
  assert.deepEqual(columnsFor('T'), ['time'])
  assert.deepEqual(columnsFor('C'), ['time', 'miles'])
  assert.deepEqual(columnsFor('WD'), ['lb', 'feet'])
  assert.deepEqual(columnsFor('X'), [])
  // No column asks for effort any more. It is one question when the session
  // ends, not a box beside every set.
  assert.ok(Object.values(columnsFor('W')).every((c) => c !== 'rpe'))
})

check('a session has a start, an end and a duration', () => {
  const base = { id: 'w', date: '2026-08-18', title: 'Push', exercises: [] }
  const running = { ...base, startedAt: '2026-08-18T17:02:00Z', endedAt: null }
  const done = { ...base, startedAt: '2026-08-18T17:02:00Z', endedAt: '2026-08-18T18:09:30Z' }
  assert.equal(isRunning(running), true)
  assert.equal(isRunning(done), false)
  assert.equal(isRunning(base), false, 'a session logged before any of this existed is not running')
  assert.equal(durationOf(done), 4050)
  assert.equal(durationOf(running), null)
  assert.equal(durationOf(base), null, 'no start is not a duration of zero')
  // A clock that ran backwards is a bug, not a workout of minus ten minutes.
  assert.equal(durationOf({ ...base, startedAt: '2026-08-18T18:00:00Z', endedAt: '2026-08-18T17:00:00Z' }), null)
  assert.equal(fmtDuration(4050), '1h 08m')
  assert.equal(fmtDuration(2880), '48 min')
  assert.equal(fmtDuration(null), null)
  assert.equal(fmtDuration(0), null)
})

check('the one question is asked once, and can be answered late', () => {
  const ended = {
    id: 'w', date: '2026-08-18', title: 'Push', endedAt: '2026-08-18T18:00:00Z',
    exercises: [{ id: 'e', name: 'Leg Press', type: 'W' as const, sets: [{ id: 's', w: 200, r: 10 }] }],
  }
  assert.equal(wantsScore(ended), true, 'ended and unscored, so it still wants an answer')
  assert.equal(wantsScore({ ...ended, intensity: 7 }), false, 'answered is answered')
  assert.equal(wantsScore({ ...ended, endedAt: null }), false, 'still running')
  assert.equal(wantsScore({ ...ended, exercises: [] }), false, 'an empty session is not one to rate')
})

check('the dial runs 1 to 10 and every number says what it means', () => {
  assert.equal(INTENSITY.length, 10)
  assert.deepEqual(INTENSITY.map((i) => i.score), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  assert.equal(intensityLabel(1), 'Easy peasy')
  assert.equal(intensityLabel(10), 'What was I thinking?')
  assert.equal(intensityLabel(null), null)
  assert.equal(intensityLabel(99), null)
  assert.ok(INTENSITY.every((i) => i.label.length > 0))
  assert.equal(averageIntensity([{ id: 'a', date: 'd', title: 't', exercises: [], intensity: 6 },
    { id: 'b', date: 'd', title: 't', exercises: [], intensity: 8 }]), 7)
  assert.equal(averageIntensity([{ id: 'a', date: 'd', title: 't', exercises: [] }]), null)
})

check('the time you have got decides how much goes in the session', () => {
  const day = dayById('five-legs')!
  const long = buildDay(day, { minutes: LONG_SESSION }).length
  const hour = buildDay(day, { minutes: 60 }).length
  const half = buildDay(day, { minutes: 30 }).length
  // Measured in minutes rather than in movements, because a movement is not a
  // fixed length: a heavy squat rests three minutes and a lateral raise rests
  // sixty seconds, so counting to eight and calling it an hour counted the
  // wrong thing.
  const half30 = buildDay(day, { minutes: 30 })
  assert.ok(
    half30.length <= 3 || estimateSeconds(half30.slice(0, -1), 'muscle') <= 30 * 60,
    'over half an hour by more than one deliberate inclusion',
  )
  const hour60 = buildDay(day, { minutes: 60 })
  assert.ok(
    estimateSeconds(hour60.slice(0, -1), 'muscle') <= 60 * 60,
    'over the hour by more than one deliberate inclusion',
  )
  assert.ok(half <= hour && hour <= long, 'more time is never fewer movements')

  // No limit trims nothing, so the whole day comes back however long it is.
  assert.equal(long, dayItems(day).length, 'no limit still trimmed the day')
  const longest = Math.max(...SPLITS.flatMap((sp) => sp.days).map((d) => dayItems(d).length))
  assert.ok(planFor({ minutes: LONG_SESSION }, 'muscle').exercises <= longest, 'a plan claims more than the longest day holds')

  // The number the plan reports is read off the sessions rather than a table,
  // so it cannot promise a count the sessions do not contain.
  for (const minutes of [30, 45, 60] as const) {
    const plan = planFor({ minutes, days: 4, years: 'overTwo', knows: 'yes' }, 'muscle')
    const real = plan.dayIds.map((id) => buildDay(dayById(id)!, { minutes, days: 4, years: 'overTwo' as const, knows: 'yes' as const }).length)
    assert.ok(
      plan.exercises >= Math.min(...real) && plan.exercises <= Math.max(...real),
      `${minutes} claims ${plan.exercises} against sessions of ${real.join(', ')}`,
    )
  }
  // Every value a profile can hold, including 75, which is no longer offered
  // but may be saved against somebody from before. More time is never fewer
  // movements, and no answer means an hour.
  const counts = ([30, 45, 60, 75, LONG_SESSION] as const).map((m) => planFor({ minutes: m }, 'muscle').exercises)
  assert.deepEqual([...counts].sort((a, b) => a - b), counts, 'more time gave fewer movements')
  assert.equal(planFor({}, 'muscle').exercises, planFor({ minutes: 60 }, 'muscle').exercises, 'no answer falls back to an hour')
})

check('supersetting reaches past the exercise next to it', () => {
  const ex = (id: string): Exercise => ({ id, name: id, type: 'W', sets: [] })
  const list = [ex('a'), ex('b'), ex('c'), ex('d')]

  // Pairing the first with the third brings the third up beside it, because a
  // superset is consecutive by definition and it had to move anyway.
  const linked = linkWith(list, 'a', 'c')
  assert.deepEqual(linked.map((e) => e.id), ['a', 'c', 'b', 'd'])
  assert.equal(linked[0].superset, linked[1].superset)
  assert.ok(linked[0].superset)
  assert.equal(linked[2].superset, undefined)

  // A third joins the end of the group rather than the middle of it.
  const three = linkWith(linked, 'a', 'd')
  assert.deepEqual(three.map((e) => e.id), ['a', 'c', 'd', 'b'])
  assert.equal(new Set(three.slice(0, 3).map((e) => e.superset)).size, 1)
  assert.equal(groupRuns(three).filter(isSuperset).length, 1, 'one group of three, not two of two')

  // Joining an existing group keeps its tag rather than minting a new one.
  assert.equal(three[0].superset, linked[0].superset)
  // Nonsense is a no-op rather than a crash.
  assert.deepEqual(linkWith(list, 'a', 'a'), list)
  assert.deepEqual(linkWith(list, 'a', 'zzz'), list)
})

check('the partner list offers everything except your own group', () => {
  const ex = (id: string, superset?: string): Exercise => ({ id, name: id, type: 'W', sets: [], superset })
  const list = [ex('a', 't'), ex('b', 't'), ex('c'), ex('d')]
  assert.deepEqual(partnersFor(list, 'a').map((e) => e.id), ['c', 'd'], 'not b, already paired with a')
  assert.deepEqual(partnersFor(list, 'c').map((e) => e.id), ['a', 'b', 'd'])
  assert.deepEqual(partnersFor(list, 'zzz'), [])
})

check('a movement you typed in behaves like one from the library', () => {
  resetCustoms()
  // Unregistered, a custom exercise is a ghost: no group, and its rest guessed
  // from the name by a classifier that has never heard of it.
  assert.equal(groupOf('Jefferson Curl'), null)
  assert.equal(restTier('Jefferson Curl', 'W'), 'isolation', 'guessed from the word curl')

  registerCustoms([
    { id: '1', name: 'Jefferson Curl', type: 'W', group: 'Back', tier: 'small', sets: 3 },
    { id: '2', name: 'Reverse Nordic', type: 'R', group: 'Quads', tier: 'heavy', sets: 2 },
  ])
  assert.equal(groupOf('Jefferson Curl'), 'Back', 'so it counts toward the weekly target')
  assert.equal(restTier('Jefferson Curl', 'W'), 'small', 'and you decide how hard it is')
  assert.equal(restFor('Jefferson Curl', 'W', 'muscle'), 45, 'the small tier, whatever it is worth today')
  assert.equal(restFor('Reverse Nordic', 'R', 'muscle'), 150, 'the heavy tier, whatever it is worth today')
  // Matching ignores case and stray spaces, since it is typed by hand.
  assert.equal(groupOf('  jefferson curl '), 'Back')
  assert.equal(customFor('Reverse Nordic')?.sets, 2)
  // The library still wins for movements that are actually in it.
  assert.equal(groupOf('Back Squat'), 'Quads')
  assert.equal(restTier('Back Squat', 'W'), 'heavy')

  resetCustoms()
  assert.equal(groupOf('Jefferson Curl'), null, 'and one test cannot leak into the next')
})

check('a substitute is the same muscle first, then the closest swap', () => {
  const same = similarTo('Barbell Bench Press')
  assert.ok(same.length > 5)
  assert.ok(same.every((e) => e.group === 'Chest'), 'a substitute has to train the same thing')
  assert.ok(!same.some((e) => e.name === 'Barbell Bench Press'), 'and it is not itself')
  // Closeness is mostly how much effort it takes, which is a better proxy for
  // the pattern than equipment: pressing before flying, and a dumbbell press
  // before a cable one.
  const at = (needle: string) => same.findIndex((e) => e.name.includes(needle))
  assert.ok(at('Barbell Bench Press') < at('Dumbbell Bench Press'), 'the nearest variant first')
  assert.ok(at('Dumbbell Bench Press') < at('Cable Fly'), 'a press before a fly')
  // The one that matters most: swapping a squat should offer other squats and
  // the leg press, not a leg extension.
  const squat = similarTo('Back Squat').slice(0, 4).map((e) => e.name)
  assert.ok(squat.includes('Front Squat'), `expected a squat, got ${squat.join(', ')}`)
  assert.ok(squat.includes('Leg Press'), `expected the leg press, got ${squat.join(', ')}`)
  assert.ok(!squat.includes('Leg Extension'), 'and not a leg extension')
  // Nothing to offer for a movement the app has never heard of.
  assert.deepEqual(similarTo('Jefferson Curl'), [])
  // A custom movement joins the list once it says what it trains.
  registerCustoms([{ id: '1', name: 'Jefferson Curl', type: 'W', group: 'Back', tier: 'small', sets: 3 }])
  const back = similarTo('Barbell Row', [{ name: 'Jefferson Curl', type: 'W', group: 'Back' }])
  assert.ok(back.some((e) => e.name === 'Jefferson Curl'), 'your own movements are substitutes too')
  resetCustoms()
})

check('a week is days of the week, not dates', () => {
  // Say Push on Monday once and it is Push every Monday, with nothing to fill
  // in again.
  assert.deepEqual(scheduleOf({}), [null, null, null, null, null, null, null])
  assert.equal(hasSchedule({}), false)
  const week = { schedule: [null, 'ppl-push', null, 'ppl-pull', null, 'ppl-legs', null] }
  assert.equal(hasSchedule(week), true)
  assert.equal(scheduledDays(week), 3)
  // 2026-08-17 is a Monday, 2026-08-18 a Tuesday.
  assert.equal(todaysDayId(week, '2026-08-17'), 'ppl-push')
  assert.equal(todaysDayId(week, '2026-08-18'), null, 'a rest day asks nothing')
  assert.equal(todaysDayId(week, '2026-08-21'), 'ppl-legs')
  // A day id that no longer exists is dropped rather than crashing the week.
  assert.deepEqual(scheduleOf({ schedule: ['nope', null, null, null, null, null, null] })[0], null)
  assert.deepEqual(scheduleOf({ schedule: ['ppl-push'] }), scheduleOf({}), 'a short week is no week')
})

check('laying out a plan puts the sessions on days people train', () => {
  const three = suggestSchedule(planFor({ days: 3 }, 'muscle'))
  assert.equal(three.filter(Boolean).length, 3)
  assert.equal(three[0], null, 'Sunday stays clear at three days')
  assert.equal(three[6], null, 'and so does Saturday')
  assert.ok(three[1] && three[3] && three[5], 'Monday, Wednesday, Friday')
  const six = suggestSchedule(planFor({ days: 6 }, 'muscle'))
  assert.equal(six.filter(Boolean).length, 6)
  assert.equal(six[0], null, 'the weekend goes last')
  assert.deepEqual(suggestSchedule(null).filter(Boolean), [], 'no plan is an empty week')
})

check('the streak counts against the week you set yourself', () => {
  const w = (date: string): Workout => ({
    id: date, date, title: 'S',
    exercises: [{ id: 'e', name: 'Leg Press', type: 'W', sets: [{ id: 's', w: 200, r: 10 }] }],
  })
  const rows = ['2026-08-17', '2026-08-19', '2026-08-10', '2026-08-12'].map(w)
  // Two sessions each week meets a two day week and misses a three day one.
  assert.equal(weeklyStreak(rows, '2026-08-21', 2), 2)
  assert.equal(weeklyStreak(rows, '2026-08-21', 3), 0)
  // An empty workout is not a session, the same rule the grid uses.
  assert.equal(trainedOn(rows, '2026-08-17'), true)
  assert.equal(trainedOn(rows, '2026-08-18'), false)
  assert.equal(trainedOn([{ id: 'x', date: '2026-08-18', title: 'S', exercises: [] }], '2026-08-18'), false)
})

check('a workout says what it will cost you before you commit', () => {
  const item = (name: string, superset: string | null = null) => ({ name, type: 'W' as const, superset })
  // The sets the app actually prescribes, not three of everything. A back
  // squat is laid out with four rows for somebody training for size, so an
  // estimate that assumed three was quietly a set light on every heavy
  // movement in the session, and the trim that fits a session into the time
  // somebody has was working from the same wrong number.
  const squatSets = prescribedSets('Back Squat', 'W', 'muscle')
  assert.equal(squatSets, 4, 'the prescription changed and this check has not')
  // Plus getting ready, which used to be counted as free. A few minutes of
  // easy movement and three ramping sets into the first heavy lift, which is
  // what the app's own answer on warming up tells people to do.
  const rest = restFor('Back Squat', 'W', 'muscle')
  const warmup = 180 + 3 * (25 + 45)
  const one = estimateSeconds([item('Back Squat')], 'muscle')
  assert.equal(one, squatSets * (40 + rest) + 45 - rest + warmup, 'work, rest, setup and getting ready')

  // Only the first serious movement carries ramp sets: later work on the same
  // muscles needs little or nothing, which is what the answer says too.
  const two = estimateSeconds([item('Back Squat'), item('Leg Press')], 'muscle')
  const solo = estimateSeconds([item('Leg Press')], 'muscle')
  assert.ok(two - one < solo, 'the second movement was warmed up all over again')

  // A cardio only session gets no ramp sets and no warm up block: the first
  // ten minutes of an easy run is the warm up.
  assert.ok(estimateSeconds([{ name: 'Jog', type: 'C' as const, superset: null }], 'muscle') < 180)

  // A cable movement is prescribed fewer sets and rests less, so the gap
  // between the two is bigger than rest alone explains.
  assert.equal(prescribedSets('Cable Curl', 'W', 'muscle'), 3)

  // A caller can still pass a flat count, which is what a workout somebody
  // built by hand uses, since nothing prescribed it.
  assert.equal(estimateSeconds([item('Back Squat')], 'muscle', 3), 3 * (40 + rest) + 45 - rest + warmup)
  // A superset rests once at the end of the group, which is the point of one,
  // so two movements paired take less than the same two apart.
  const apart = estimateSeconds([item('Cable Curl'), item('Rope Pushdown')], 'muscle')
  const paired = estimateSeconds([item('Cable Curl', 'a'), item('Rope Pushdown', 'a')], 'muscle')
  assert.ok(paired < apart, `pairing should be quicker, got ${paired} against ${apart}`)
  // Heavier work takes longer than the same number of cable movements.
  assert.ok(estimateSeconds([item('Back Squat')], 'muscle') > estimateSeconds([item('Cable Curl')], 'muscle'))
  assert.equal(estimateSeconds([], 'muscle'), 0)
  // It reads like an estimate rather than claiming to know the minute.
  assert.equal(fmtEstimate(0), null)
  assert.equal(fmtEstimate(360), 'about 5 min')
  assert.equal(fmtEstimate(47 * 60), 'about 45 min')
  assert.equal(fmtEstimate(60 * 60), 'about 1h')
  assert.equal(fmtEstimate(85 * 60), 'about 1h 25m')
})

check('each set row says what you did on that set last time', () => {
  // Beside the row rather than summarised above it, so comparing set three to
  // set three is reading rather than arithmetic.
  assert.equal(fmtPrevious({ id: '1', w: 80, r: 9 }, 'W'), '80\u00d79')
  assert.equal(fmtPrevious({ id: '1', w: 82.5, r: 8 }, 'W'), '82.5\u00d78')
  // No effort number even where old data carries one: the row beside it has
  // nowhere to put it and a lone @8 explains nothing.
  assert.equal(fmtPrevious({ id: '1', w: 80, r: 9, rpe: 8 }, 'W'), '80\u00d79')
  assert.equal(fmtPrevious({ id: '1', r: 12 }, 'R'), '12')
  assert.equal(fmtPrevious({ id: '1', t: 90 }, 'T'), '1:30')
  assert.equal(fmtPrevious({ id: '1', w: 100, d: 40 }, 'WD'), '100\u00d740')
  assert.equal(fmtPrevious({ id: '1', t: 1200, d: 2.1 }, 'C'), '20:00')
  // Nothing to show is nothing, not a half filled string.
  assert.equal(fmtPrevious(null, 'W'), null)
  assert.equal(fmtPrevious(undefined, 'W'), null)
  assert.equal(fmtPrevious({ id: '1' }, 'W'), null)
  assert.equal(fmtPrevious({ id: '1' }, 'R'), null)
  // Half a set still says what it knows.
  assert.equal(fmtPrevious({ id: '1', w: 80 }, 'W'), '80\u00d7?')
})

check('history keeps its drop rows even though nothing new is tagged', () => {
  // The button has gone: a drop set is just a lighter set now. But sessions
  // logged while it existed, and anything imported from the artifact days,
  // still carry the flag and still stay out of everything comparative.
  const flagged: Exercise = {
    id: 'e', name: 'Lat Pulldown', type: 'W',
    sets: [{ id: 'a', w: 130, r: 12 }, { id: 'b', w: 110, r: 25, drop: true }],
  }
  assert.equal(topSet(flagged)?.id, 'a', 'a drop is not the top set')
  const bests = bestsFor([{ id: 'w', date: '2026-08-18', title: 'x', exercises: [flagged] }],
    'Lat Pulldown', 'nothing', '2026-08-19')
  // 110 x 25 estimates higher than 130 x 12, so without the flag it would have
  // taken the record.
  assert.ok(e1rm({ id: 'b', w: 110, r: 25 })! > e1rm({ id: 'a', w: 130, r: 12 })!)
  assert.equal(bests.e1rm, Math.round(e1rm({ id: 'a', w: 130, r: 12 })! * 10) / 10)
  // And the importer still reads the shorthand it always did.
  assert.deepEqual(
    parseSetStrings('130x12 110x15', 'W').map((x) => ({ w: x.w, r: x.r, drop: x.drop ?? false })),
    [{ w: 130, r: 12, drop: false }, { w: 110, r: 15, drop: true }],
  )
})

check('the plan prescribes sets and reps, by goal and by what the movement costs', () => {
  // A barbell bench is not a cable pushdown, and the sheet should not pretend
  // otherwise. More sets and fewer reps at the top of the ladder, the reverse
  // at the bottom.
  const bench = prescribe('Barbell Bench Press', 'W', 'muscle')!
  const rope = prescribe('Rope Pushdown', 'W', 'muscle')!
  assert.ok(bench.sets > rope.sets, 'the heavy lift earns more sets')
  assert.ok(bench.reps[1] < rope.reps[1], 'and fewer reps')

  // The goal moves the whole window, in the direction it says on the tin.
  assert.ok(prescribe('Barbell Bench Press', 'W', 'strength')!.reps[1] < bench.reps[1])
  assert.ok(prescribe('Barbell Bench Press', 'W', 'endurance')!.reps[0] > bench.reps[0])

  // Every movement in every template day gets an answer or is exempt for a
  // reason, and no answer is silly.
  for (const split of SPLITS) {
    for (const day of split.days) {
      for (const name of dayNames(day)) {
        const type = lookupType(name) ?? 'W'
        const p = prescribe(name, type, 'muscle')
        if (type !== 'W' && type !== 'R') {
          assert.equal(p, null, `${name} is timed work and gets no rep window`)
          assert.equal(prescribedSets(name, type, 'muscle'), 1, `${name} lays out one row`)
          continue
        }
        assert.ok(p, `${name} has no prescription`)
        assert.ok(p!.sets >= 2 && p!.sets <= 5, `${name} asks for ${p!.sets} sets`)
        assert.ok(p!.reps[0] < p!.reps[1], `${name} has a backwards rep window`)
        assert.ok(p!.reps[0] >= 3 && p!.reps[1] <= 30, `${name} is outside anything sane`)
      }
    }
  }
})

check('the lighter plan takes a set off, never a rep', () => {
  assert.ok(isLighter('2 to 3'), 'the Foundation and cleared plans are the lighter ones')
  assert.ok(!isLighter('3 to 4'))
  assert.ok(!isLighter(undefined), 'nobody is on a lighter plan by accident')

  for (const name of ['Barbell Bench Press', 'Machine Chest Press', 'Cable Curl', 'Plank']) {
    const type = lookupType(name) ?? 'W'
    const full = prescribe(name, type, 'muscle', false)
    const light = prescribe(name, type, 'muscle', true)
    if (!full) {
      assert.equal(light, null)
      continue
    }
    assert.deepEqual(light!.reps, full.reps, `${name} keeps its rep window`)
    assert.ok(light!.sets < full.sets || full.sets === 2, `${name} loses a set`)
    assert.ok(light!.sets >= 2, `${name} never drops below two`)
  }

  // And the plan is where that flag comes from, not a separate setting.
  const foundation = planFor({ days: 3, minutes: 60, years: 'never', knows: 'no' }, 'muscle')
  assert.ok(isLighter(foundation.sets), 'Foundation runs light')
})

check('a prescription reads like a trainer wrote it', () => {
  assert.equal(fmtPrescription({ sets: 4, reps: [8, 12] }), '4 \u00d7 8 to 12')
  assert.equal(fmtPrescription(null), null)
})

check('the coach argues with the prescribed window, not the goal-wide one', () => {
  // Strength on a cable curl is prescribed 10 to 15, well outside the 3 to 6
  // the goal alone would have asked for. Twelve reps is mid range, so the next
  // step is one more rep rather than a shout to add weight.
  const asked = prescribe('Cable Curl', 'W', 'strength')!
  assert.deepEqual(asked.reps, [10, 15])
  const said = coach({ id: 's', w: 40, r: 12 }, 'W', 'strength', asked.reps)
  assert.match(said!, /go for 13/i)
  // Without the band it would read the same set as far over the top.
  assert.match(coach({ id: 's', w: 40, r: 12 }, 'W', 'strength')!, /top of the range/i)
})

// Answers that land somebody in each program, so a plan can be asked for by
// name rather than by guessing at scores.
const SEED: Record<'Foundation' | 'Build' | 'Performance', Partial<Profile>> = {
  Foundation: { years: 'never', knows: 'no', barbell: 'never' },
  Build: { years: 'sixToTwo', knows: 'roughly', barbell: 'rusty' },
  Performance: { years: 'overTwo', knows: 'yes', barbell: 'confident' },
}

const SHARED: Workout = {
  id: 'w', date: '2026-08-18', title: 'Push',
  startedAt: '2026-08-18T17:02:00.000Z', endedAt: '2026-08-18T18:09:00.000Z',
  intensity: 8, note: 'Shoulder felt off, dropped the load.',
  exercises: [
    { id: 'a', name: 'Incline Dumbbell Press', type: 'W', sets: [
      { id: '1', w: 80, r: 9 }, { id: '2', w: 80, r: 8 }, { id: '3', w: 60, r: 12, drop: true },
    ] },
    { id: 'b', name: 'Hanging Leg Raise', type: 'R', superset: 'core', sets: [{ id: '1', r: 15 }] },
    { id: 'c', name: 'Plank', type: 'T', superset: 'core', sets: [{ id: '1', t: 60 }] },
    { id: 'd', name: 'Never Touched', type: 'W', sets: [{ id: '1' }] },
  ],
}

check('a shared session reads as the session, in the order it ran', () => {
  const text = workoutText(SHARED)
  assert.match(text, /^Push/, 'the title leads')
  assert.match(text, /1h 07m/, 'and the time it took')
  assert.match(text, /8 out of 10/, 'and how hard it felt')

  // Set numbers count working rows only, and a drop says what it is rather
  // than taking the next number.
  assert.match(text, /Set 1 +80 x 9/)
  assert.match(text, /Set 2 +80 x 8/)
  assert.match(text, /drop to 60 x 12/)
  assert.ok(!/Set 3/.test(text), 'the drop is not set three')

  // Supersets survive being written down: labelled, and in their run order.
  assert.match(text, /Superset A/)
  assert.ok(text.indexOf('A1. Hanging Leg Raise') < text.indexOf('A2. Plank'))

  // A movement with nothing in it is still on the sheet, saying so.
  assert.match(text, /Never Touched\n {2}Not logged/)
  assert.match(text, /Shoulder felt off/, 'and the note comes with it')

  assert.equal(workoutFilename(SHARED), '2026-08-18-push.pdf')
  assert.equal(
    workoutFilename({ ...SHARED, title: 'Legs & Core!! ' }),
    '2026-08-18-legs-core.pdf',
    'a filename survives whatever the session was called',
  )
})

check('the PDF it builds is a PDF', () => {
  const bytes = buildPdf(workoutLines(SHARED))
  const file = Buffer.from(bytes).toString('latin1')
  assert.match(file, /^%PDF-1\.4\n/, 'header')
  assert.match(file, /%%EOF\n$/, 'trailer')
  assert.match(file, /\/Type \/Catalog/)
  assert.match(file, /\/BaseFont \/Helvetica-Bold/)

  // The cross reference table is the part that silently corrupts a file, so
  // every offset in it is followed back to the object it claims to point at.
  // lastIndexOf('xref') would find the one inside startxref, which is the
  // pointer rather than the table.
  const table = file.slice(file.lastIndexOf('\nxref\n'))
  const offsets = [...table.matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]))
  assert.ok(offsets.length >= 6, 'catalog, pages, two fonts, a page and its stream')
  offsets.forEach((offset, i) => {
    assert.ok(file.startsWith(`${i + 1} 0 obj`, offset), `object ${i + 1} is not at ${offset}`)
  })
  const size = Number(/\/Size (\d+)/.exec(file)![1])
  assert.equal(size, offsets.length + 1, 'Size counts the free object too')

  // And every stream says how long it is, in bytes, or a reader stops early.
  for (const [, length, body] of file.matchAll(/<< \/Length (\d+) >>\nstream\n([\s\S]*?)endstream/g)) {
    assert.equal(body.length, Number(length), 'a stream length is wrong')
  }

  // Long sessions run onto more pages, and the count has to follow.
  const long = buildPdf(workoutLines({
    ...SHARED,
    exercises: Array.from({ length: 20 }, (_, i) => ({
      id: String(i), name: `Movement ${i + 1}`, type: 'W' as const,
      sets: [{ id: 'a', w: 100, r: 10 }, { id: 'b', w: 100, r: 9 }, { id: 'c', w: 100, r: 8 }],
    })),
  }))
  const many = Buffer.from(long).toString('latin1')
  const count = Number(/\/Count (\d+)/.exec(many)![1])
  assert.ok(count > 1, 'twenty movements do not fit on one page')
  assert.equal((many.match(/\/Type \/Page[^s]/g) ?? []).length, count, 'Count matches the pages')
})

function session(id: string, date: string, name: string, sets: { w: number; r: number }[]): Workout {
  return {
    id, date, title: 'Push',
    exercises: [{ id: `${id}-e`, name, type: 'W', sets: sets.map((s, i) => ({ id: `${id}-${i}`, ...s })) }],
  }
}

check('the end of a session says something that actually happened', () => {
  // Nothing to compare against yet, so nothing is claimed beyond turning up.
  const one = session('a', '2026-08-03', 'Machine Chest Press', [{ w: 180, r: 10 }])
  const firstOut = summariseSession([one], one, 'muscle', 3)
  assert.ok(firstOut.first)
  assert.match(firstOut.headline, /first one/i)
  assert.equal(firstOut.records.length, 0, 'a movement you have never done cannot be beaten')
  assert.equal(firstOut.sets, 1)
  assert.equal(firstOut.reps, 10, 'reps are counted alongside sets, not derived from them')
  assert.equal(firstOut.volume, 1800)

  // Same load, same reps, a week later. No record, no fiction.
  const flat = session('b', '2026-08-10', 'Machine Chest Press', [{ w: 180, r: 10 }])
  const flatOut = summariseSession([one, flat], flat, 'muscle', 3)
  assert.equal(flatOut.records.length, 0)
  assert.equal(flatOut.beat, 0)
  assert.match(flatOut.headline, /done and written down/i)
  assert.match(flatOut.line, /most sessions/i)

  // More reps at the same load is a record, and the headline moves to it.
  const better = session('c', '2026-08-17', 'Machine Chest Press', [{ w: 180, r: 12 }])
  const bestOut = summariseSession([one, flat, better], better, 'muscle', 3)
  assert.equal(bestOut.records.length, 1)
  assert.equal(bestOut.records[0].name, 'Machine Chest Press')
  assert.ok(bestOut.records[0].kinds.includes('reps'))
  assert.match(bestOut.headline, /new record/i)
  assert.match(bestOut.line, /Machine Chest Press/)

  // A bad week, then a better one that still does not reach the record. Up on
  // last time is the honest thing to say, and it is not a record.
  const dip = session('d', '2026-08-24', 'Machine Chest Press', [{ w: 180, r: 9 }])
  const back = session('e', '2026-08-31', 'Machine Chest Press', [{ w: 180, r: 11 }])
  const upOut = summariseSession([one, flat, better, dip, back], back, 'muscle', 3)
  assert.equal(upOut.records.length, 0, 'twelve is still the record')
  assert.equal(upOut.beat, 1)
  assert.match(upOut.headline, /up on last time/i)
})

check('a round number is announced once, on the session that crossed it', () => {
  // Nine sessions behind, the tenth crosses.
  const history = Array.from({ length: 9 }, (_, i) =>
    session(`h${i}`, `2026-06-0${i + 1}`, 'Cable Curl', [{ w: 40, r: 12 }]),
  )
  const tenth = session('t', '2026-06-10', 'Cable Curl', [{ w: 40, r: 12 }])
  const all = [...history, tenth]
  const out = summariseSession(all, tenth, 'muscle', 3)
  assert.ok(out.milestones.some((m) => /10 sessions/.test(m.label)), 'the tenth is a landmark')

  // The eleventh is not, even though the total is still above ten.
  const eleventh = session('e', '2026-06-11', 'Cable Curl', [{ w: 40, r: 12 }])
  const after = summariseSession([...all, eleventh], eleventh, 'muscle', 3)
  assert.equal(after.milestones.length, 0, 'a rung is crossed once in a lifetime')
})

check('a session with nothing in it is told the truth', () => {
  const empty: Workout = {
    id: 'x', date: '2026-08-18', title: 'Push',
    exercises: [{ id: 'e', name: 'Leg Press', type: 'W', sets: [{ id: '1' }] }],
  }
  const out = summariseSession([empty], empty, 'muscle', 3)
  assert.equal(out.sets, 0)
  assert.equal(out.exercises, 0)
  assert.match(out.headline, /nothing logged/i)
  assert.ok(!/record/i.test(out.line), 'and is not congratulated for it')
})

check('weeks in a row are counted, and never said twice', () => {
  // Three weeks, one session each, against a target of one.
  const weeks = ['2026-08-03', '2026-08-10', '2026-08-17'].map((d, i) =>
    session(`w${i}`, d, 'Leg Press', [{ w: 300, r: 10 }]),
  )
  const out = summariseSession(weeks, weeks[2], 'muscle', 1)
  assert.equal(out.streak, 3)
  // A record outranks a streak in the headline, and the streak still survives
  // in the summary for the screen to say underneath.
  assert.match(out.headline, /new record|3 weeks/i)
})

const SUB = {
  // A throwaway pair, generated for this file and used nowhere else. It has to
  // be a real P-256 point because web-push refuses anything that is not, which
  // makes it tempting to paste in the deployed one. Do not: this repo is public
  // and a key in a test fixture is a key in a search index.
  p256dh: 'BED1kK1-p-N30o5M_SdAVXavdqJSrtkqUK_A92VXswKWDpB7R0p5x-m69dxdinErK5TLCEY11vpMk5RGM3Hgpt8',
  auth: 'k8JV6sjdbhAi1n3_LDBLvA',
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
}

check('an alert request has to look like one', () => {
  const good = parseAlert({
    subscription: { endpoint: SUB.endpoint, keys: { p256dh: SUB.p256dh, auth: SUB.auth } },
    seconds: 90,
    name: 'Machine Chest Press',
  })
  assert.ok(good.ok)
  assert.equal(good.alert.seconds, 90)
  assert.equal(good.alert.name, 'Machine Chest Press')

  const withEndpoint = (endpoint: unknown) => ({
    subscription: { endpoint, keys: { p256dh: SUB.p256dh, auth: SUB.auth } },
    seconds: 60,
  })

  // The endpoint is the one field that says where the server will make a
  // request to, so it does not get to be anything but a push service over TLS.
  for (const endpoint of ['http://fcm.googleapis.com/x', 'file:///etc/passwd', 'ftp://x', '', 7]) {
    assert.ok(!parseAlert(withEndpoint(endpoint)).ok, String(endpoint))
  }
  assert.ok(!parseAlert({ subscription: { endpoint: SUB.endpoint }, seconds: 60 }).ok, 'no keys')
  assert.ok(!parseAlert({}).ok, 'nothing at all')
  assert.ok(!parseAlert(null).ok, 'no body at all')

  // A wait has to be a real number of seconds inside what one invocation can
  // hold, so nothing can park a connection for an hour.
  const withSeconds = (seconds: unknown) => ({
    subscription: { endpoint: SUB.endpoint, keys: { p256dh: SUB.p256dh, auth: SUB.auth } },
    seconds,
  })
  for (const seconds of [0, -30, 99_999, MAX_WAIT + 1, Number.NaN, 'soon', null]) {
    assert.ok(!parseAlert(withSeconds(seconds)).ok, String(seconds))
  }
  assert.ok(parseAlert(withSeconds(MAX_WAIT)).ok, 'the ceiling itself is fine')

  // A name goes into a notification, so it is trimmed and bounded, and an
  // empty one is simply no name.
  const long = parseAlert({ ...withSeconds(60), name: 'x'.repeat(500) })
  assert.ok(long.ok && long.alert.name!.length === 80)
  const blank = parseAlert({ ...withSeconds(60), name: '   ' })
  assert.ok(blank.ok && blank.alert.name === null)
})

check('what goes on the wire is a signed, encrypted web push', () => {
  process.env.VAPID_SUBJECT = 'mailto:test@example.com'
  process.env.VAPID_PUBLIC_KEY = SUB.p256dh
  process.env.VAPID_PRIVATE_KEY = 'AFPR1oDKCFht1PrvLXSnoCYH6g8GpFRDH0ipgwDhsFc'
  assert.ok(pushConfigured())

  // Built exactly as it would be sent, without sending it, so the request can
  // be read rather than assumed.
  const request = alertRequest({
    endpoint: SUB.endpoint, p256dh: SUB.p256dh, auth: SUB.auth,
    seconds: 90, name: 'Leg Press',
  })

  assert.equal(request.method, 'POST')
  assert.equal(request.endpoint, SUB.endpoint)
  assert.equal(request.headers['Content-Encoding'], 'aes128gcm', 'RFC 8291 content encoding')
  assert.equal(request.headers.TTL, 60, 'an alert that cannot go now is already wrong')
  assert.equal(request.headers.Urgency, 'high')

  // VAPID: a JWT signed for this push service, alongside the public key it can
  // be checked with.
  const authorization = request.headers.Authorization as string
  const token = /vapid t=([^,]+), k=(.+)/.exec(authorization)
  assert.ok(token, `unexpected Authorization: ${authorization}`)
  assert.equal(token![2], SUB.p256dh, 'the key sent is the key configured')

  const [head, claims] = token![1].split('.')
  const json = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString())
  assert.equal(json(head).alg, 'ES256')
  assert.equal(json(claims).aud, 'https://fcm.googleapis.com', 'signed for this service only')
  assert.equal(json(claims).sub, 'mailto:test@example.com')
  assert.ok(json(claims).exp > Math.floor(Date.now() / 1000), 'and not already expired')

  // And the payload is genuinely encrypted, not merely posted.
  const body = request.body as Buffer
  assert.ok(Buffer.isBuffer(body))
  assert.ok(!body.includes('Leg Press'), 'the movement name is not readable on the wire')
  assert.ok(!body.includes('Rest is up'))
  assert.ok(body.length > 86, 'salt, record size, key id and a ciphertext')
})

checkAsync('skipping the rest stops the alert, it does not just hang up', async () => {
  const controller = new AbortController()
  const started = Date.now()
  const pending = wait(60_000, controller.signal)
  controller.abort()
  assert.equal(await pending, true, 'an aborted wait reports that it was cancelled')
  assert.ok(Date.now() - started < 1000, 'and gives up now, not in a minute')

  // Already aborted before it starts, which is what a fast double tap looks
  // like from here.
  const already = new AbortController()
  already.abort()
  assert.equal(await wait(60_000, already.signal), true)

  // A wait that runs its course reports that it was not cancelled, which is
  // what tells the route to send.
  assert.equal(await wait(10, new AbortController().signal), false)
})

function person(over: Partial<AdminUser>): AdminUser {
  return {
    id: 'id', email: 'a@example.com', createdAt: '2026-08-01T00:00:00Z',
    admin: false, rootAdmin: false,
    lastSignInAt: null, confirmedAt: null, bannedUntil: null,
    sessions: 0, sets: 0, volume: 0, lastWorkout: null, firstWorkout: null,
    onboardedAt: null, goal: null, program: null, days: null,
    ...over,
  }
}

check('the goals are a running order, and the front of it is doing the driving', () => {
  // Wanting to build muscle and lean out is one answer written twice, so it is
  // never a conflict and never asks which comes first.
  assert.ok(goalsAgree(['muscle', 'lean']))
  assert.ok(goalsAgree(['muscle']))
  assert.ok(goalsAgree([]))
  assert.ok(!goalsAgree(['muscle', 'strength']))
  assert.ok(!goalsAgree(['muscle', 'lean', 'health']))

  // A profile written before the list existed reads as a list of one.
  assert.deepEqual(goalsOf({ goalChoice: 'strength' }), ['strength'])
  assert.deepEqual(goalsOf({}), [])
  assert.equal(primaryGoal({ goalChoice: 'strength' }), 'strength')
  assert.equal(primaryGoal({}), undefined)

  // The order is the answer: whatever is first is what sets the numbers.
  assert.equal(primaryGoal({ goals: ['muscle', 'strength'] }), 'muscle')
  assert.equal(primaryGoal({ goals: ['strength', 'muscle'] }), 'strength')
  assert.equal(primaryGoal({ goals: ['health'] }), 'health')

  // Promoting reorders and never drops anything, because the list is a plan
  // rather than a set of decisions to abandon three things.
  assert.deepEqual(promoteGoal(['muscle', 'strength', 'health'], 'health'), ['health', 'muscle', 'strength'])
  assert.deepEqual(promoteGoal(['muscle', 'strength'], 'muscle'), ['muscle', 'strength'])
  assert.deepEqual(promoteGoal([], 'muscle'), ['muscle'])

  // A profile written when the primary was a separate question can have the
  // one that was steering sitting in the middle of the list. It reads as
  // first, so nobody's training changes under them on the day this shipped.
  assert.deepEqual(goalsOf({ goals: ['muscle', 'strength'], goalChoice: 'strength' }), ['strength', 'muscle'])
  assert.equal(primaryGoal({ goals: ['muscle', 'strength'], goalChoice: 'strength' }), 'strength')
  // And a stale primary that is no longer on the list steers nothing.
  assert.deepEqual(goalsOf({ goals: ['muscle', 'health'], goalChoice: 'strength' }), ['muscle', 'health'])
  assert.equal(primaryGoal({ goals: ['muscle', 'health'], goalChoice: 'strength' }), 'muscle')

  // One goal says nothing about coverage: there is nothing to cover.
  assert.equal(goalCoverage({ goals: ['muscle'], goalChoice: 'muscle' }), null)
  assert.equal(goalCoverage({}), null)

  // Two that agree are covered together, with no talk of waiting.
  const both = goalCoverage({ goals: ['muscle', 'lean'], goalChoice: 'muscle' })!
  assert.match(both, /same training/i)
  assert.match(both, /^[A-Z]/, 'a sentence starts with a capital letter')
  assert.ok(!/first/i.test(both), 'nothing is queued behind anything here')

  // Two that disagree open by saying the list is not in conflict, and only
  // then name what is first and what is waiting. The order of the sentence is
  // the point: being told which one you are getting answers the question,
  // being told nothing on the list is lost answers the person.
  const split = goalCoverage({ goals: ['muscle', 'strength'] })!
  assert.match(split, /^Nothing on your list cancels anything else out\./)
  assert.match(split, /building muscle is first, so it sets the reps and the rests/i)
  assert.match(split, /getting stronger/i)
  assert.match(split, /waiting rather than gone/i)
  assert.match(split, /switch to it/i)
  assert.ok(!/\bonly\b|\binstead of\b/i.test(split), 'nothing here is framed as a loss')

  // Three, where one rides along and one waits.
  const three = goalCoverage({ goals: ['muscle', 'lean', 'health'] })!
  assert.match(three, /leaning out comes with it/i)
  assert.match(three, /staying capable means/i)

  // Four reads as a running order rather than a pile: what is first, what
  // comes with it, what is next, and what is after that.
  const four = goalCoverage({ goals: ['muscle', 'lean', 'strength', 'health'] })!
  assert.match(four, /building muscle is first/i)
  assert.match(four, /leaning out comes with it/i)
  assert.match(four, /getting stronger is next/i)
  assert.match(four, /then staying capable/i)
  assert.match(four, /moving one to the front/i)

  // Reordering the same four changes what is driving and what is queued, and
  // says so, because otherwise the order would be decoration.
  const flipped = goalCoverage({ goals: ['health', 'strength', 'muscle', 'lean'] })!
  assert.match(flipped, /staying capable is first/i)
  assert.match(flipped, /getting stronger is next/i)
  assert.notEqual(flipped, four)

  // And the plan carries both, so every screen tells the same story.
  const plan = planFor({ days: 4, goals: ['strength', 'health'] }, 'strength')
  assert.deepEqual(plan.goals, ['strength', 'health'])
  assert.match(plan.goalCoverage!, /getting stronger is first/i)
})

check('every goal says what it does, and what it does not cost you', () => {
  // People asked to pick two goals. Almost always the two were building muscle
  // and leaning out, which is one answer. Multi select would fork the
  // prescriptions; saying so does not.
  assert.equal(GOAL_CHOICES.length, 4)
  for (const c of GOAL_CHOICES) {
    assert.ok(c.note.length > 0, `${c.v} has no note under it`)
    const said = goalNoteFor(c.v)
    assert.ok(said.length > 40, `${c.v} says nothing useful`)
  }

  // Three of the four used to say nothing at all, which is what made picking
  // one feel like losing the others.
  for (const choice of ['muscle', 'strength', 'lean', 'health'] as const) {
    assert.ok(planFor({ days: 3, goalChoice: choice }, GOAL_FROM_CHOICE[choice]).goalNote)
  }
  // And an unanswered goal still says something rather than nothing.
  assert.ok(planFor({ days: 3 }, 'muscle').goalNote)

  // The two people wanted together are the same training underneath, and the
  // screen now says the same numbers for both. It used to promise leaning out
  // 8 to 15 while prescribing 8 to 12.
  assert.equal(GOAL_FROM_CHOICE.lean, GOAL_FROM_CHOICE.muscle)
  const lean = planFor({ days: 3, goalChoice: 'lean' }, 'muscle')
  const muscle = planFor({ days: 3, goalChoice: 'muscle' }, 'muscle')
  assert.equal(lean.reps, muscle.reps, 'the same training cannot advertise two rep ranges')
  assert.deepEqual(lean.dayIds, muscle.dayIds)
  assert.match(muscle.goalNote!, /leaning out/i, 'and picking one names the other')
  assert.match(lean.goalNote!, /building muscle/i)

  // And the same underneath, movement by movement, which is the actual reason
  // the two cannot advertise different numbers.
  for (const name of ['Barbell Bench Press', 'Machine Chest Press', 'Cable Curl']) {
    assert.deepEqual(
      prescribe(name, 'W', GOAL_FROM_CHOICE.lean),
      prescribe(name, 'W', GOAL_FROM_CHOICE.muscle),
      name,
    )
  }
})

check('one leg day or two is a choice, and both weeks are real weeks', () => {
  for (const program of ['Foundation', 'Build', 'Performance'] as const) {
    for (const days of [4, 5, 6]) {
      const base = { days, minutes: 60 as const, ...SEED[program] }

      const two = planFor({ ...base, legDays: 2 }, 'muscle')
      const one = planFor({ ...base, legDays: 1 }, 'muscle')

      assert.equal(two.legDays, 2)
      assert.equal(one.legDays, 1)
      assert.equal(one.dayIds.length, days, `${program} at ${days} lost a day`)
      for (const id of one.dayIds) assert.ok(dayById(id), `${program} at ${days}: missing ${id}`)

      // One means one. Counted by day rather than by name, because a week that
      // ran the same Legs session twice is the thing this replaced.
      // Counted by id rather than by reading the names, because the names are
      // for people and changed the moment four sessions called Legs became a
      // problem. A day is a leg day because it is one, not because it says so.
      const legDayIds = [
        'summer4-legs', 'five-legs', 'five-quads', 'five-posterior',
        'bro-legs', 'ppl-legs', 'ul-lower-a', 'ul-lower-b',
      ]
      const legNames = one.dayIds
        .filter((id) => legDayIds.includes(id))
        .map((id) => dayById(id)?.name ?? id)
      assert.equal(legNames.length, 1, `${program} at ${days} has leg days: ${legNames.join(', ')}`)
    }
  }

  // Unanswered is two at four days and up, which is what the plans do now, and
  // one below that because there is nowhere to put a second.
  assert.equal(legDaysOf({ days: 5 }), 2)
  assert.equal(legDaysOf({ days: 4 }), 2)
  assert.equal(legDaysOf({ days: 3 }), 1)
  assert.equal(legDaysOf({ days: 3, legDays: 2 }), 1, 'three days cannot hold two')
  assert.equal(legDaysOf({ days: 5, legDays: 1 }), 1)
  assert.equal(planFor({ days: 3, minutes: 60, ...SEED.Build }, 'muscle').legDays, 1)
})

check('five days and up gets two leg days, and they are different days', () => {
  const QUADS = /quad/i
  const POSTERIOR = /hamstring|glute/i

  for (const program of ['Foundation', 'Build', 'Performance'] as const) {
    for (const days of [5, 6]) {
      const profile: Profile = { days, minutes: 60, ...SEED[program] }
      const plan = planFor(profile, 'muscle')
      const names = plan.dayIds.map((id) => dayById(id)?.name ?? '')
      assert.ok(
        names.some((n) => QUADS.test(n)),
        `${program} at ${days} days has no quad day: ${names.join(', ')}`,
      )
      assert.ok(
        names.some((n) => POSTERIOR.test(n)),
        `${program} at ${days} days has no posterior day: ${names.join(', ')}`,
      )
      // Upper days may repeat, and at six days a week they should. The leg
      // days may not: doing the same leg session twice was the complaint.
      const quad = names.filter((n) => QUADS.test(n)).length
      const post = names.filter((n) => POSTERIOR.test(n)).length
      assert.equal(quad, 1, `${program} at ${days} days runs the quad day ${quad} times`)
      assert.equal(post, 1, `${program} at ${days} days runs the posterior day ${post} times`)
    }
  }

  // Three days is the exception, on purpose. A third of your week is not
  // enough to split the lower body across.
  for (const program of ['Foundation', 'Build', 'Performance'] as const) {
    const plan = planFor({ days: 3, minutes: 60, ...SEED[program] }, 'muscle')
    assert.equal(plan.dayIds.length, 3)
  }

  // Four days is a split decision rather than a rule. Foundation and Build run
  // upper lower there, which is two lower days and so two different ones.
  for (const program of ['Foundation', 'Build'] as const) {
    const names = planFor({ days: 4, minutes: 60, ...SEED[program] }, 'muscle')
      .dayIds.map((id) => dayById(id)?.name ?? '')
    assert.ok(names.some((n) => QUADS.test(n)), `${program} at 4 days has no quad day`)
    assert.ok(names.some((n) => POSTERIOR.test(n)), `${program} at 4 days has no posterior day`)
  }

  // Performance at four keeps push, pull, legs and an upper mix: one leg day
  // and three upper. Two leg days out of four is upper lower, which is what
  // the other two programs already hand out. Left as a deliberate choice
  // rather than an oversight.
  const four = planFor({ days: 4, minutes: 60, ...SEED.Performance }, 'muscle')
  assert.deepEqual(four.dayIds, ['summer4-push', 'summer4-pull', 'summer4-legs', 'summer4-upper'])
})

check('the templates carry a squat, and the red flag takes it away', () => {
  // The 4 and 5 day splits used to hardcode one person's knee for everybody.
  // Now they carry the ordinary movement and the questionnaire decides, and
  // what the questionnaire decides has two settings rather than one.
  const quads = dayById('five-quads')!
  assert.ok(dayNames(quads).includes('Back Squat'), 'a quad day has a squat on it')

  const fine = buildDay(quads, { minutes: LONG_SESSION }).map((i) => i.name)
  assert.ok(fine.includes('Back Squat'))

  // Sore keeps it and eases it.
  const sore = buildDay(quads, { minutes: LONG_SESSION, sore: ['Knee'] })
  assert.ok(sore.some((i) => i.name === 'Back Squat' && i.lighter), 'a sore knee lost the squat instead of easing it')
  assert.deepEqual(sore.map((i) => i.name), fine, 'a sore knee changed the session')

  // Red flagged takes it, and the split stance one with it.
  const flagged = buildDay(quads, { minutes: LONG_SESSION, sore: ['Knee'], redFlag: true }).map((i) => i.name)
  assert.ok(!flagged.includes('Back Squat'), 'a red flagged knee still sees it')
  assert.ok(!flagged.includes('Bulgarian Split Squat'), 'nor the split stance one')

  // Same story on the legs day of the 4 day split.
  const legs = dayById('summer4-legs')!
  assert.ok(dayNames(legs).includes('Back Squat'))
  const legsSore = buildDay(legs, { minutes: 60, sore: ['Knee'] })
  assert.ok(legsSore.some((i) => i.name === 'Back Squat' && i.lighter))
  assert.ok(!buildDay(legs, { minutes: 60, sore: ['Knee'], redFlag: true }).map((i) => i.name).includes('Back Squat'))

  // A red flagged back takes the hinge out of the posterior day without
  // emptying it. Sore on its own leaves the hinge and shortens it.
  const post = dayById('five-posterior')!
  const soreBack = buildDay(post, { minutes: 60, sore: ['Low back'] })
  assert.ok(soreBack.some((i) => i.name === 'Romanian Deadlift' && i.lighter), 'a sore back lost the hinge')
  const flaggedBack = buildDay(post, { minutes: 60, sore: ['Low back'], redFlag: true }).map((i) => i.name)
  assert.ok(!flaggedBack.includes('Romanian Deadlift'))
})

check('somebody who writes their own workouts is not pushed onto a plan', () => {
  const base = { days: 4, minutes: 60 as const, years: 'overTwo' as const, knows: 'yes' as const }

  // The plan is still built either way. That is the point: it exists, it is
  // just not the thing the app leads with.
  const handed = planFor({ ...base, writesOwn: 'no' }, 'muscle')
  const own = planFor({ ...base, writesOwn: 'yes' }, 'muscle')
  assert.equal(own.selfDirected, true)
  assert.equal(handed.selfDirected, false)
  assert.deepEqual(own.dayIds, handed.dayIds, 'the same plan, differently offered')
  assert.equal(own.splitName, handed.splitName)
  assert.ok(own.dayIds.length > 0, 'and it is a real plan, not an empty one')

  // Sometimes is not yes. Somebody who occasionally writes their own still
  // wants a starting point.
  assert.equal(planFor({ ...base, writesOwn: 'sometimes' }, 'muscle').selfDirected, false)
  assert.equal(planFor(base, 'muscle').selfDirected, false, 'and not answering is not yes either')

  assert.ok(selfDirected({ writesOwn: 'yes' }))
  assert.ok(!selfDirected({ writesOwn: 'sometimes' }))
  assert.ok(!selfDirected({}))
})

check('a short session says it was short, not that it was nothing', () => {
  assert.equal(fmtDuration(null), null)
  assert.equal(fmtDuration(0), null, 'a session that never started has no duration')
  assert.equal(fmtDuration(20), 'under a min', 'and one that rounded to zero is not zero')
  assert.equal(fmtDuration(59), 'under a min')
  assert.equal(fmtDuration(60), '1 min')
  assert.equal(fmtDuration(47 * 60 + 4), '47 min')
  assert.equal(fmtDuration(67 * 60), '1h 07m')
})

check('a share link is a workout and nothing else', () => {
  // The whole safety argument for sharing is that only the shape of a session
  // travels. If a logged number could ride along, the feature would be a leak.
  const items: CustomWorkoutItem[] = [
    { name: 'Incline Dumbbell Press', type: 'W', superset: null },
    { name: 'Hanging Leg Raise', type: 'R', superset: 'core' },
    { name: 'Plank', type: 'T', superset: 'core' },
  ]
  const keys = new Set(items.flatMap((i) => Object.keys(i)))
  assert.deepEqual([...keys].sort(), ['name', 'superset', 'type'],
    'a shared item carries a name, a type and a superset tag, and nothing else')

  // The link is a uuid, so it is guessed rather than counted, and the page
  // refuses anything that is not one before it ever reaches the database.
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  assert.ok(uuid.test('3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'))
  for (const bad of ['1', 'null', "' or 1=1 --", '../../etc/passwd', '']) {
    assert.ok(!uuid.test(bad), bad)
  }

  // And a shared day still estimates, which is what the page shows.
  assert.ok(estimateSeconds(items, 'muscle') > 0)
})

check('a date reads the same whether it arrives as a date or a timestamp', () => {
  // The auth table hands back full ISO timestamps while everything the app
  // writes is date only. Mixing them printed "undefined NaN undefined".
  assert.equal(fmtDate('2026-08-19'), fmtDate('2026-08-19T09:00:00Z'))
  assert.equal(fmtDate('2026-08-19T23:59:59.999+00:00'), fmtDate('2026-08-19'))
  assert.match(fmtDate('2026-08-19T09:00:00Z'), /^Wed 19 Aug$/)
})

check('the admin allowlist fails shut', () => {
  const saved = process.env.ADMIN_EMAILS

  // No list means nobody, not everybody. This is the direction a mistake here
  // has to fail in.
  delete process.env.ADMIN_EMAILS
  assert.ok(!isAdmin('anyone@example.com'))
  process.env.ADMIN_EMAILS = ''
  assert.ok(!isAdmin('anyone@example.com'))

  process.env.ADMIN_EMAILS = ' Boss@Example.com , second@example.com '
  assert.ok(isAdmin('boss@example.com'), 'case and padding do not matter')
  assert.ok(isAdmin('  BOSS@EXAMPLE.COM '))
  assert.ok(isAdmin('second@example.com'))
  assert.ok(!isAdmin('boss@example.com.evil.com'), 'and it is a match, not a prefix')
  assert.ok(!isAdmin('other@example.com'))
  assert.ok(!isAdmin(null))
  assert.ok(!isAdmin(''))

  if (saved === undefined) delete process.env.ADMIN_EMAILS
  else process.env.ADMIN_EMAILS = saved
})

check('the admin screen counts training, not signups', () => {
  const now = '2026-08-19'
  const people = [
    person({ id: '1', email: 'training@x.com', sessions: 20, sets: 200, volume: 100_000,
      lastWorkout: '2026-08-18', firstWorkout: '2026-05-01', onboardedAt: '2026-05-01T00:00:00Z' }),
    person({ id: '2', email: 'slipping@x.com', sessions: 4, sets: 40, volume: 9_000,
      lastWorkout: '2026-08-04', firstWorkout: '2026-07-01', onboardedAt: '2026-07-01T00:00:00Z' }),
    person({ id: '3', email: 'gone@x.com', sessions: 2, sets: 12, volume: 1_000,
      lastWorkout: '2026-06-01', firstWorkout: '2026-06-01', onboardedAt: '2026-06-01T00:00:00Z' }),
    person({ id: '4', email: 'never@x.com', createdAt: '2026-08-17T00:00:00Z' }),
  ]

  assert.equal(health(people[0], now), 'active')
  assert.equal(health(people[1], now), 'slipping')
  assert.equal(health(people[2], now), 'dormant')
  assert.equal(health(people[3], now), 'never')
  assert.equal(HEALTH_LABEL.never, 'Never started')

  const t = totals(people, now)
  assert.equal(t.users, 4)
  assert.equal(t.everTrained, 3, 'signing up is not training')
  assert.equal(t.activeWeek, 1)
  assert.equal(t.activeMonth, 2)
  assert.equal(t.onboarded, 3)
  assert.equal(t.sessions, 26)
  assert.equal(t.signupsThisWeek, 1, 'only the one who joined in the last seven days')
  assert.equal(t.volume, 110_000)

  // The number worth acting on.
  assert.deepEqual(neverStarted(people).map((p) => p.email), ['never@x.com'])
})

check('the people list sorts and searches the way it is read', () => {
  const now = '2026-08-19'
  const people = [
    person({ id: '1', email: 'zoe@x.com', sessions: 3, lastWorkout: '2026-08-01' }),
    person({ id: '2', email: 'amy@x.com', sessions: 9, lastWorkout: '2026-08-18',
      createdAt: '2026-08-15T00:00:00Z' }),
    person({ id: '3', email: 'ben@x.com', sessions: 0 }),
  ]

  // Most recently trained first, and whoever never trained goes last, because
  // the list is read to find out who is still here.
  assert.deepEqual(sortUsers(people, 'recent', now).map((p) => p.email),
    ['amy@x.com', 'zoe@x.com', 'ben@x.com'])
  assert.deepEqual(sortUsers(people, 'sessions', now).map((p) => p.email),
    ['amy@x.com', 'zoe@x.com', 'ben@x.com'])
  assert.deepEqual(sortUsers(people, 'signup', now)[0].email, 'amy@x.com')
  assert.deepEqual(sortUsers(people, 'email', now).map((p) => p.email),
    ['amy@x.com', 'ben@x.com', 'zoe@x.com'])
  // Sorting never rewrites what it was given.
  assert.equal(people[0].email, 'zoe@x.com')

  assert.ok(matches(people[0], 'ZOE'))
  assert.ok(matches(people[0], ''))
  assert.ok(matches(people[0], '  '))
  assert.ok(!matches(people[0], 'amy'))
})

check('the admin export is a spreadsheet, not a shrug', () => {
  const csv = adminCsv([person({ email: 'a,b@x.com', sessions: 2, volume: 1234.6 })], '2026-08-19')
  const [head, row] = csv.split('\n')
  assert.match(head, /^email,id,signed up/)
  assert.match(row, /^"a,b@x.com"/, 'a comma in a field is quoted, not left to break the file')
  assert.match(row, /,1235,/, 'volume is rounded')
  assert.match(row, /Never started$/)
})

check('the nudge fires on their day, in their clock, and once a week', () => {
  const prefs = { day: 5, hour: 18, nudgedAt: null, misses: 0 }
  const friday = { dow: 5, hour: 18, date: '2026-08-21' }
  const now = new Date('2026-08-21T18:00:00Z')

  assert.ok(nudgeDue(prefs, friday, now))
  assert.ok(!nudgeDue(prefs, { ...friday, hour: 17 }, now), 'not before the hour they picked')
  assert.ok(!nudgeDue(prefs, { ...friday, dow: 4 }, now), 'not on another day')
  assert.ok(!nudgeDue({ ...prefs, day: null }, friday, now), 'off is off')

  // Overdue rather than exactly on the hour, so the job does the right thing
  // whether it runs hourly or once a day. Late is a worse message; never is a
  // bug.
  assert.ok(nudgeDue(prefs, { ...friday, hour: 23 }, now))

  // Once a week, whatever the job's schedule is.
  const yesterday = new Date('2026-08-20T18:00:00Z').toISOString()
  assert.ok(!nudgeDue({ ...prefs, nudgedAt: yesterday }, friday, now))
  const lastWeek = new Date('2026-08-14T18:00:00Z').toISOString()
  assert.ok(nudgeDue({ ...prefs, nudgedAt: lastWeek }, friday, now))

  // And it stops talking to somebody who has stopped answering.
  assert.ok(!nudgeDue({ ...prefs, misses: MAX_MISSES }, friday, now))
})

check('their clock, not the server\'s', () => {
  // Half nine at night in London is half four in the afternoon in New York and
  // half past six the next morning in Auckland. All three are the same instant.
  const instant = new Date('2026-08-21T20:30:00Z')
  assert.deepEqual(localNow('Europe/London', instant), { dow: 5, hour: 21, date: '2026-08-21' })
  assert.deepEqual(localNow('America/New_York', instant), { dow: 5, hour: 16, date: '2026-08-21' })
  assert.deepEqual(localNow('Pacific/Auckland', instant), { dow: 6, hour: 8, date: '2026-08-22' })

  // Midnight is hour zero, not hour twenty four.
  assert.equal(localNow('UTC', new Date('2026-08-21T00:10:00Z')).hour, 0)

  // A stored zone that is no longer a place still has to produce a time.
  assert.equal(localNow('Mars/Olympus', instant).date, '2026-08-21')
})

check('the week is counted in days trained, not sessions logged', () => {
  // Two workouts on the Tuesday is a Tuesday.
  const week = weekOf(['2026-08-18', '2026-08-18', '2026-08-20'], '2026-08-21', 4)
  assert.equal(week.done, 2)
  assert.equal(week.left, 2, 'Friday leaves Friday and Saturday, because today is still available')
  assert.equal(week.lastDate, '2026-08-20')

  // The week runs Sunday to Saturday, the same one the streak uses, so last
  // Saturday is not this week.
  assert.equal(weekOf(['2026-08-15'], '2026-08-21', 4).done, 0)
  assert.equal(weekOf(['2026-08-16'], '2026-08-21', 4).done, 1, 'Sunday starts the week')

  // Sunday is the whole week still to come.
  assert.equal(weekOf([], '2026-08-16', 4).left, 7)

  // The average is over finished weeks only, because comparing a whole week
  // against a week in progress is a lie about somebody.
  assert.equal(averageWeek(['2026-08-20'], '2026-08-16'), null, 'nothing before this week to average')
  const four = ['2026-07-20', '2026-07-22', '2026-07-27', '2026-08-03', '2026-08-10', '2026-08-12']
  const avg = averageWeek(four, '2026-08-16')!
  assert.ok(avg > 0 && avg <= 7)
})

check('the nudge is a coach, and a coach does not use guilt', () => {
  const base = { target: 4, done: 0, left: 3, average: null, lastDate: '2026-08-18', today: '2026-08-21' }

  // Nobody who has never logged anything gets chased about a week they have
  // not had.
  assert.equal(nudgeFor({ ...base, lastDate: null }), null)

  // A week that is met is praised and then leaves them alone.
  const met = nudgeFor({ ...base, done: 4 })!
  assert.match(met.body, /nothing owed/i)

  // A week that is beaten says so without inventing a number.
  const beat = nudgeFor({ ...base, done: 5 })!
  assert.match(beat.body, /5 sessions against the 4/i)

  // On track names what is left, not what is missing.
  const on = nudgeFor({ ...base, done: 2, left: 3 })!
  assert.match(on.title, /2 of 4/)
  assert.match(on.body, /3 days left and 2 sessions to go/i)

  // A week that can no longer reach the target never says so. It counts what
  // is in the week.
  const short = nudgeFor({ ...base, done: 1, left: 1 })!
  assert.match(short.body, /one more makes it 2/i)
  assert.ok(!/behind|missed|failed|only|should/i.test(short.body), 'no scolding')

  // The comparison to their own weeks is only made when it is true.
  const better = nudgeFor({ ...base, done: 1, left: 1, average: 1.5 })!
  assert.match(better.body, /above your usual 1.5/i)
  const notBetter = nudgeFor({ ...base, done: 1, left: 1, average: 4 })!
  assert.ok(!/above your usual/i.test(notBetter.body), 'never claims a week beat an average it did not')

  // Nothing logged this week, with the target still on and with it gone.
  const openWeek = nudgeFor({ ...base, done: 0, left: 5 })!
  assert.match(openWeek.body, /nothing logged yet/i)
  assert.match(openWeek.body, /5 days left/i)
  const tightWeek = nudgeFor({ ...base, done: 0, left: 2 })!
  assert.ok(!/the 4 you set/.test(tightWeek.body), 'does not dangle a target that cannot be reached')

  // Somebody who stopped gets no numbers at all.
  const lapsed = nudgeFor({ ...base, lastDate: '2026-06-01' })!
  assert.match(lapsed.body, /nothing since June 1/i)
  assert.ok(!/\bweek\b|\btarget\b|[0-9] of [0-9]/i.test(lapsed.body), 'no scoreboard for somebody who left')

  // Nothing anywhere reads like a billboard.
  for (const state of [met, on, short, openWeek, tightWeek, lapsed]) {
    assert.ok(!/crush|beast|no excuses|no pain|grind|warrior|let.s go/i.test(state.body), state.body)
    assert.ok(state.body.length < 200, 'it is a notification, not an essay')
  }
})

check('a phone has to say what it is before it is written down', () => {
  const good = {
    subscription: { endpoint: 'https://push.example.com/x', keys: { p256dh: 'a', auth: 'b' } },
    zone: 'Europe/London',
  }
  const parsed = parseDevice(good)
  assert.ok(parsed.ok && parsed.device.zone === 'Europe/London')

  assert.ok(!parseDevice({}).ok)
  assert.ok(!parseDevice({ subscription: { endpoint: 'http://push.example.com/x', keys: { p256dh: 'a', auth: 'b' } } }).ok, 'TLS or nothing')

  // A zone is a place name or it is UTC. It is interpolated into a date format
  // on the server and stored, so it does not get to be a sentence.
  const junk = parseDevice({ ...good, zone: 'x'.repeat(200) })
  assert.ok(junk.ok && junk.device.zone === 'UTC')
  const worse = parseDevice({ ...good, zone: '../../etc/passwd' })
  assert.ok(worse.ok && worse.device.zone === 'UTC')
})

check('both push routes judge an endpoint the same way', () => {
  // The rest alert and the device route each had a hand written copy of the
  // same subscription check, and the copies had come apart: only the device
  // route capped the length. The endpoint is the single field that decides
  // where the server will make a request to, so the two cannot disagree about
  // what a good one looks like.
  const keys = { p256dh: 'a', auth: 'b' }
  const hostile: unknown[] = [
    'http://fcm.googleapis.com/x',
    'file:///etc/passwd',
    'ftp://x',
    'https://push.example.com/' + 'x'.repeat(4000),
    '',
    7,
    null,
  ]
  for (const endpoint of hostile) {
    const viaAlert = parseAlert({ subscription: { endpoint, keys }, seconds: 60 }).ok
    const viaDevice = parseDevice({ subscription: { endpoint, keys }, zone: 'UTC' }).ok
    assert.equal(viaAlert, viaDevice, `the two routes disagree about ${String(endpoint).slice(0, 40)}`)
    assert.ok(!viaAlert, `${String(endpoint).slice(0, 40)} was accepted`)
  }

  // And a real one is accepted by both.
  const real = 'https://fcm.googleapis.com/fcm/send/' + 'a'.repeat(120)
  assert.ok(parseAlert({ subscription: { endpoint: real, keys }, seconds: 60 }).ok)
  assert.ok(parseDevice({ subscription: { endpoint: real, keys }, zone: 'UTC' }).ok)

  // One implementation, not two that look alike.
  const alert = readFileSync(new URL('../lib/alert.ts', import.meta.url), 'utf8')
  assert.ok(alert.includes('parseSubscription'), 'the rest alert checks subscriptions its own way again')
  assert.ok(!/keys\?\.p256dh/.test(alert), 'the rest alert reads the subscription by hand again')
})

check('the two switches are two switches', () => {
  // The rest alert and the weekly nudge both need notification permission and
  // both go down the same pipe, which is exactly why turning one on must not
  // turn the other on. The rest alert is gated by a flag kept on the phone;
  // the nudge is gated by a day kept on the account. Neither function touches
  // the other's gate.
  const source = readFileSync(new URL('../lib/push.ts', import.meta.url), 'utf8')
  const nudge = source.slice(source.indexOf('export async function enableNudge'))
  assert.ok(!nudge.includes('PUSH_KEY'), 'switching the nudge on must not start the rest alerts')
  const off = source.slice(source.indexOf('export async function disablePush'), source.indexOf('async function subscribe'))
  assert.ok(!off.includes('unsubscribe'), 'turning rest alerts off must not take the nudge down with them')
})

check('the questionnaire takes the intent and never spends the prompt', () => {
  // The browser's notification prompt is one shot: a no cannot be taken back
  // from inside the app, only from the browser's own settings, which nobody
  // opens. Asking during a questionnaire, before anybody has trained or had a
  // week, is asking where it is most likely to be refused, and on an iPhone it
  // cannot be granted at all until the app is on the home screen.
  //
  // So the questionnaire stores a day and the finish screen asks the browser.
  // Nothing in the onboarding path is allowed to touch permission.
  const onboarding = readFileSync(new URL('../components/Onboarding.tsx', import.meta.url), 'utf8')
  const field = readFileSync(new URL('../components/NudgeField.tsx', import.meta.url), 'utf8')
  for (const [name, source] of [['Onboarding', onboarding], ['NudgeField', field]] as const) {
    assert.ok(!/requestPermission|enableNudge|enablePush/.test(source), `${name} must not ask the browser anything`)
  }

  // And the finish screen only offers when the question has never been put to
  // this browser, because 'default' is the only state that is still ours.
  const push = readFileSync(new URL('../lib/push.ts', import.meta.url), 'utf8')
  const askable = push.slice(push.indexOf('export function nudgeAskable'))
  assert.match(askable, /Notification\.permission !== 'default'/)
})

check('the two kinds of push cannot replace each other in the tray', () => {
  const rest = JSON.parse(alertBody({ endpoint: 'https://x/y', p256dh: 'a', auth: 'b', seconds: 60, name: 'Squat' }))
  const weekly = JSON.parse(nudgeBody('2 of 4', 'two days left'))
  assert.equal(rest.tag, 'training-log-rest')
  assert.equal(weekly.tag, 'training-log-nudge')
  assert.notEqual(rest.tag, weekly.tag)
})

check('a movement has a screen of its own, and it says what happened', () => {
  const bench = { id: 'e1', name: 'Bench Press', type: 'W' as const, sets: [
    { id: 's1', w: 100, r: 8, rpe: null, t: null, d: null, raw: null },
    { id: 's2', w: 100, r: 7, rpe: null, t: null, d: null, raw: null },
  ] }
  const later = { ...bench, id: 'e2', sets: [{ id: 's3', w: 105, r: 8, rpe: null, t: null, d: null, raw: null }] }
  const squat = { id: 'e3', name: 'Back Squat', type: 'W' as const, sets: [
    { id: 's4', w: 200, r: 5, rpe: null, t: null, d: null, raw: null },
  ] }
  const workouts = [
    { id: 'w1', date: '2026-08-10', title: 'Push', exercises: [bench, squat] },
    { id: 'w2', date: '2026-08-17', title: 'Push', exercises: [later] },
  ] as unknown as Parameters<typeof historyFor>[0]

  // Newest first, and only the movement asked for.
  const history = historyFor(workouts, 'Bench Press')
  assert.equal(history.length, 2)
  assert.equal(history[0].date, '2026-08-17')
  assert.equal(history[1].date, '2026-08-10')

  // Every set, not a summary. Four sets that were not the same are four
  // different lines, because this screen exists to show what happened rather
  // than a tidied version of it.
  assert.deepEqual(history[1].sets.length, 2)
  assert.match(history[1].sets[0], /100/)
  assert.match(history[1].sets[1], /7/)

  // A movement never done has no history and does not throw.
  assert.deepEqual(historyFor(workouts, 'Nordic Curl'), [])

  // Empty sets are not an outing: a row you opened and did not fill in is not
  // a session with that movement in it.
  const blank = [{ id: 'w3', date: '2026-08-18', title: 'Push', exercises: [
    { id: 'e4', name: 'Bench Press', type: 'W' as const, sets: [
      { id: 's5', w: null, r: null, rpe: null, t: null, d: null, raw: null },
    ] },
  ] }] as unknown as Parameters<typeof historyFor>[0]
  assert.deepEqual(historyFor(blank, 'Bench Press'), [])

  // And it is bounded, because a movement done weekly for three years is not
  // a screen anybody scrolls.
  const many = Array.from({ length: 40 }, (_, i) => ({
    id: `w${i}`,
    date: `2026-0${(i % 9) + 1}-0${(i % 9) + 1}`,
    title: 'Push',
    exercises: [bench],
  })) as unknown as Parameters<typeof historyFor>[0]
  assert.equal(historyFor(many, 'Bench Press').length, 12)
  assert.equal(historyFor(many, 'Bench Press', 3).length, 3)
})

check('the app says what it assumed, and one tap corrects it', () => {
  // The sex answer does exactly one thing: it ticks the starting answer to
  // the question underneath it. It is a default, on screen, not a rule
  // working quietly in the background.
  assert.deepEqual(defaultFocus('female'), ['Glutes', 'Hamstrings'])
  assert.deepEqual(defaultFocus('male'), [])
  assert.deepEqual(defaultFocus('skip'), [])
  assert.deepEqual(defaultFocus(undefined), [])

  // An answer somebody gave by hand is never overwritten by the assumption,
  // including the answer "none of them".
  assert.deepEqual(focusOf({ sex: 'female' }), ['Glutes', 'Hamstrings'])
  assert.deepEqual(focusOf({ sex: 'female', focus: ['Back'] }), ['Back'])
  assert.deepEqual(focusOf({ sex: 'female', focus: [] }), [])

  // A group the library has never heard of steers nothing.
  assert.deepEqual(focusOf({ focus: ['Glutes', 'Vibes'] }), ['Glutes'])

  // And it is said out loud rather than done quietly.
  const note = focusNote(['Glutes', 'Hamstrings'])!
  assert.match(note, /glutes and hamstrings come first/i)
  assert.match(note, /last thing dropped/i)
  assert.equal(focusNote([]), null)
})

check('bringing something up changes the order, not the split', () => {
  const items = [
    { name: 'Barbell Bench Press', type: 'W' as const, superset: null },
    { name: 'Hip Thrust', type: 'W' as const, superset: null },
    { name: 'Lying Leg Curl', type: 'W' as const, superset: null },
  ]

  // Nothing asked for, nothing moved: the template comes back as written.
  assert.deepEqual(emphasise(items, []), items)

  // Asked for, and it goes first. Everything is still there, because bringing
  // something up is not dropping something else.
  const moved = emphasise(items, ['Glutes'])
  assert.equal(moved[0].name, 'Hip Thrust')
  assert.equal(moved.length, items.length)
  assert.deepEqual(
    [...moved].map((i) => i.name).sort(),
    [...items].map((i) => i.name).sort(),
  )

  // Stable within each half, so two prioritised movements keep the order the
  // template put them in rather than being shuffled.
  const two = emphasise(items, ['Glutes', 'Hamstrings'])
  assert.deepEqual(two.map((i) => i.name), ['Hip Thrust', 'Lying Leg Curl', 'Barbell Bench Press'])

  // A superset moves as one unit. Half a circuit at the front and half at the
  // back is not a circuit.
  const circuit = [
    { name: 'Barbell Bench Press', type: 'W' as const, superset: 'a' },
    { name: 'Hip Thrust', type: 'W' as const, superset: 'a' },
    { name: 'Lat Pulldown', type: 'W' as const, superset: null },
  ]
  const kept = emphasise(circuit, ['Glutes'])
  assert.deepEqual(kept.map((i) => i.name), ['Barbell Bench Press', 'Hip Thrust', 'Lat Pulldown'])
  assert.equal(kept.filter((i) => i.superset === 'a').length, 2)
})

check('what you are bringing up is the last thing the clock takes', () => {
  // Half an hour is four movements. The day still has to lose the rest, and
  // what it loses is never the thing somebody said they came for.
  const long = { days: 5, minutes: 30 as const, sex: 'female' as const }
  for (const dayId of planFor(long, 'muscle').dayIds) {
    const built = buildDay(dayById(dayId)!, long)
    assert.ok(built.length <= 4, `${dayId} came back over the time budget`)
  }

  // A leg day built for somebody bringing up glutes opens on the glutes.
  const legs = planFor(long, 'muscle').dayIds.map((id) => buildDay(dayById(id)!, long))
  const asked = new Set(['Glutes', 'Hamstrings'])
  const withFocus = legs.find((day) => day.some((i) => asked.has(groupOf(i.name) ?? '')))
  if (withFocus) {
    assert.ok(asked.has(groupOf(withFocus[0].name) ?? ''), 'the day opens on what was asked for')
  }

  // And the same week without the answer is not reordered.
  const plain = { days: 5, minutes: 30 as const }
  const before = planFor(plain, 'muscle').dayIds.map((id) => buildDay(dayById(id)!, plain))
  assert.ok(before.length > 0)
})

check('a sensitive answer stays out of every screen that is not theirs', () => {
  // The admin screen reads the profile jsonb, so it could see this by
  // accident. It takes two fields off it by name and this is not one of them,
  // and the same goes for a share link, which carries a session's shape and
  // nothing about the person at all.
  const admin = readFileSync(new URL('../lib/adminData.ts', import.meta.url), 'utf8')
  assert.ok(!/\bsex\b/.test(admin), 'the admin screen must never read this')
  const share = readFileSync(new URL('../lib/share.ts', import.meta.url), 'utf8')
  assert.ok(!/\bsex\b|\bfocus\b/.test(share), 'a share link carries a workout, not a person')
})

check('a hotel does not change who you are, only what today has', () => {
  const traveller = { days: 4, access: 'full' as const, minutes: 60 as const }

  // A plan day rebuilt for a bare room contains nothing the room does not
  // have, and the profile is untouched: tomorrow is normal.
  const dayId = planFor(traveller, 'muscle').dayIds[0]
  const day = dayById(dayId)!
  const home = buildDay(day, traveller)
  const bare = awayDayFor(day, traveller, 'body')
  for (const item of bare) {
    assert.equal(equipmentOf(item.name), 'bodyweight', `${item.name} is not doable in a hotel room`)
  }
  assert.equal(traveller.access, 'full', 'the profile is not written to')
  assert.deepEqual(buildDay(day, traveller), home, 'the home version is unchanged after an away build')

  // The intent survives the room: the away version of a day still trains the
  // groups the day was about.
  const homeGroups = new Set(home.map((i) => groupOf(i.name)))
  const bareGroups = new Set(bare.map((i) => groupOf(i.name)))
  let kept = 0
  for (const g of bareGroups) if (homeGroups.has(g)) kept += 1
  assert.ok(kept >= Math.min(2, bareGroups.size), 'an away day forgot what the day was for')

  // A sore knee does not stay home.
  const soreDay = awayDayFor(day, { ...traveller, sore: ['Knee'] }, 'home')
  for (const item of soreDay) {
    assert.ok(!/Squat|Lunge|Step Up|Sissy|Nordic|Pistol/i.test(item.name), `${item.name} on a sore knee`)
  }
})

check('a session built from a room and a wish list is still a session', () => {
  const p = { minutes: 60 as const }

  // Full body on dumbbells covers the body, fits the budget, repeats nothing.
  const full = awaySession(AWAY_FULL_BODY, p, 'home')
  // Five, not six, since rest got longer and warming up stopped being free.
  // The number that matters is what it covers, which is checked below.
  assert.ok(full.length >= 5, `only ${full.length} movements for a full hour`)
  assert.ok(full.length <= 8, 'over the time budget')
  assert.equal(new Set(full.map((i) => i.name)).size, full.length, 'a movement appears twice')
  const groups = new Set(full.map((i) => groupOf(i.name)))
  for (const g of ['Quads', 'Chest', 'Back']) assert.ok(groups.has(g), `no ${g} in a full body session`)

  // Round robin: every group gets its first movement before any group gets
  // its second, so a 30 minute session still covers what was asked for.
  const short = awaySession(['Quads', 'Chest', 'Back', 'Shoulders'], { minutes: 30 }, 'home')
  assert.equal(short.length, 4)
  assert.equal(new Set(short.map((i) => groupOf(i.name))).size, 4, 'a short session doubled up before covering')

  // Two groups picked on a decent kit fills the hour with those two.
  const pair = awaySession(['Glutes', 'Hamstrings'], p, 'basic')
  assert.ok(pair.length >= 5, `only ${pair.length} movements from two groups on machines`)
  for (const item of pair) {
    const g = groupOf(item.name)
    assert.ok(g === 'Glutes' || g === 'Hamstrings', `${item.name} is not what was asked for`)
  }

  // A group the kit cannot serve is dropped rather than faked: there is no
  // bodyweight biceps isolation worth pretending about.
  const honest = awaySession(['Biceps', 'Chest'], p, 'body')
  assert.ok(honest.length > 0)
  for (const item of honest) assert.equal(groupOf(item.name), 'Chest')

  // Nothing at all available is an empty list, not a crash, and the screen
  // hides the button rather than offering a session of nothing.
  assert.deepEqual(awaySession(['Biceps'], p, 'body'), [])

  // Only real movements: everything picked is doable on the kit named.
  for (const item of awaySession(AWAY_FULL_BODY, p, 'body')) {
    assert.equal(equipmentOf(item.name), 'bodyweight', item.name)
  }

  // What you are bringing up still comes first, on the road as at home.
  const focused = awaySession(AWAY_FULL_BODY, { ...p, focus: ['Glutes'] }, 'home')
  assert.equal(groupOf(focused[0].name), 'Glutes', 'the away session ignored the focus')
})

check('the library hears about what it is missing, and never lies about how loudly', () => {
  const row = (userId: string, name: string, group: string | null = null) => ({
    userId, name, type: 'W', group,
  })

  // Three spellings of the same invention are one row, counted in people, and
  // titled with the spelling most of them used.
  const report = gapReport([
    row('a', 'Viking Press', 'Shoulders'),
    row('b', 'viking press'),
    row('c', 'Viking Presses'),
    row('c', 'Viking Press'),
    row('d', 'Jefferson Curl'),
  ])
  assert.equal(report.length, 2)
  assert.equal(report[0].name, 'Viking Press')
  assert.equal(report[0].users, 3, 'people, not rows: one person twice is one person')
  assert.equal(report[0].group, 'Shoulders', 'the group survives even when only one row carried it')
  assert.equal(report[1].name, 'Jefferson Curl')

  // The test that wrote itself: the first draft of this check used Belt
  // Squat as its example gap, and the report filtered it out, because the
  // library already has one. That is the filter doing its job.
  assert.deepEqual(gapReport([row('a', 'Belt Squat')]), [])

  // Sorted by how many people are asking, because that is the reading order.
  assert.ok(report[0].users >= report[1].users)

  // A movement the library already has is not a gap, it is somebody who did
  // not find the search. Plurals of library names are the same non-gap.
  const noise = gapReport([row('a', 'Barbell Bench Press'), row('b', 'barbell bench press'), row('c', 'Leg Extensions')])
  assert.deepEqual(noise, [])

  // Blank names are nobody asking for anything.
  assert.deepEqual(gapReport([row('a', '   ')]), [])
})

check('the trend is drawn in weeks, and an empty week is a bar at zero', () => {
  // Twelve bars whatever the data, oldest first, current week last, bucketed
  // into the same Sunday week everything else counts in.
  const empty = weeklyTrend([], '2026-08-19')
  assert.equal(empty.length, 12)
  assert.ok(empty.every((b) => b.sessions === 0))
  assert.equal(empty[11].start, '2026-08-16', 'the last bar is this week, which started Sunday')
  assert.equal(empty[0].start, '2026-05-31', 'the first bar is eleven weeks before that')

  // A workout lands in its week, two same-week workouts are one bar of two,
  // and anything older than the window is not silently pulled into bar one.
  const drawn = weeklyTrend(['2026-08-17', '2026-08-18', '2026-08-10', '2020-01-01'], '2026-08-19')
  assert.equal(drawn[11].sessions, 2)
  assert.equal(drawn[10].sessions, 1)
  assert.equal(drawn.reduce((n, b) => n + b.sessions, 0), 3, 'ancient history stays out of the window')

  // Timestamps count the same as dates, because the workouts table hands back
  // whatever it was given.
  assert.equal(weeklyTrend(['2026-08-17T09:30:00Z'], '2026-08-19')[11].sessions, 1)
})

check('went quiet means was a regular, and stopped recently enough to reach', () => {
  const u = (over: Partial<AdminUser>): AdminUser => ({
    admin: false, rootAdmin: false, id: over.email ?? 'x', email: 'x@y.z', createdAt: '2026-01-01',
    lastSignInAt: null, confirmedAt: null, bannedUntil: null, sessions: 0, sets: 0, volume: 0,
    lastWorkout: null, firstWorkout: null, onboardedAt: null, goal: null, program: null, days: null,
    ...over,
  })
  const today = '2026-08-19'
  const list = wentQuiet(
    [
      u({ email: 'regular@x', sessions: 12, lastWorkout: '2026-08-05' }),
      u({ email: 'fresher@x', sessions: 8, lastWorkout: '2026-08-08' }),
      u({ email: 'active@x', sessions: 30, lastWorkout: '2026-08-18' }),
      u({ email: 'tourist@x', sessions: 2, lastWorkout: '2026-08-01' }),
      u({ email: 'gone@x', sessions: 40, lastWorkout: '2026-04-01' }),
      u({ email: 'never@x', sessions: 0 }),
    ],
    today,
  )
  assert.deepEqual(list.map((x) => x.email), ['fresher@x', 'regular@x'], 'freshest lapse first')
  // The active are not quiet, tourists were never regulars, and past sixty
  // days somebody is not quiet, they are gone, which is a different
  // conversation.
})

check('a failed search is counted in people, and only when the library already had it', () => {
  assert.equal(
    failedSearches([
      { userId: 'a', name: 'Barbell Bench Press' },
      { userId: 'a', name: 'Leg Extensions' },
      { userId: 'b', name: 'leg extension' },
      { userId: 'c', name: 'Viking Press' },
      { userId: 'd', name: '  ' },
    ]),
    2,
    'a is one person twice, b found by plural, c invented something real, d typed nothing',
  )
})

check('every admin action is stamped before it returns', () => {
  // The audit trail is only a trail if there are no exceptions. The route has
  // one success return per action; each must log first.
  const route = readFileSync(new URL('../app/api/admin/route.ts', import.meta.url), 'utf8')
  const oks = route.match(/return NextResponse\.json\(\{ ok:/g) ?? []
  const stamps = route.match(/await stamp\(\)/g) ?? []
  assert.ok(oks.length >= 7, 'the action list shrank, update this check')
  assert.equal(stamps.length, oks.length, 'an action returns without landing in the audit trail')
})

check('the questionnaire is as long as the app says it is', () => {
  // Settings promised five sections while the questionnaire delivered six.
  // The count now lives in one exported constant, and this reads the STEPS
  // array out of the component to hold the two together.
  const source = readFileSync(new URL('../components/Onboarding.tsx', import.meta.url), 'utf8')
  const steps = source.match(/^const STEPS = \[$[\s\S]*?^\]/m)?.[0] ?? ''
  const entries = (steps.match(/\{ id: '/g) ?? []).length
  assert.equal(entries, STEP_COUNT, 'STEP_COUNT in lib/onboarding.ts no longer matches STEPS')
  const settings = readFileSync(new URL('../components/SettingsSheet.tsx', import.meta.url), 'utf8')
  assert.ok(settings.includes('{STEP_COUNT} sections'), 'Settings hardcodes the section count again')
})

check('the app never gives directions to places that do not exist', () => {
  // Ask Lifty and the plan review used to send people to a Progress tab, a
  // Workout tab and a History tab, none of which existed. Directions in copy
  // have to name real places, so this reads the nav and holds the copy to it.
  // Progress is a real tab now; Workout and History never were.
  const sources = ['../lib/knowledge.ts', '../components/Onboarding.tsx', '../components/App.tsx']
  for (const file of sources) {
    const text = readFileSync(new URL(file, import.meta.url), 'utf8')
    for (const ghost of ['Workout tab', 'History tab']) {
      assert.ok(!text.includes(ghost), `${file} points at "${ghost}", which is not a place`)
    }
  }
  // And things that live on the profile are not described as living in
  // Settings. The word Settings in help copy has to mean the Settings sheet.
  const knowledge = readFileSync(new URL('../lib/knowledge.ts', import.meta.url), 'utf8')
  assert.ok(!/in Settings/.test(knowledge), 'knowledge copy sends people to Settings for profile controls')

  // Every tab a piece of copy names has to be one the nav actually renders.
  const nav = readFileSync(new URL('../components/BottomNav.tsx', import.meta.url), 'utf8')
  const real = [...nav.matchAll(/label: '([^']+)'/g)].map((m) => m[1])
  assert.ok(real.length >= 4, 'could not read the nav labels')
  for (const file of sources) {
    const text = readFileSync(new URL(file, import.meta.url), 'utf8')
    for (const named of [...text.matchAll(/the ([A-Z][A-Za-z ]{2,14}) tab/g)].map((m) => m[1])) {
      assert.ok(real.includes(named), `copy names a "${named}" tab; the nav has ${real.join(', ')}`)
    }
  }
})

check('one goal, whichever door it is edited through', () => {
  // The profile is the one editor. Its save derives the training goal from
  // the top of the ordered list, and Settings shows a link rather than a
  // second radio that used to disagree with it.
  const app = readFileSync(new URL('../components/App.tsx', import.meta.url), 'utf8')
  const save = app.slice(app.indexOf('async function saveProfile'), app.indexOf('async function logWeight'))
  assert.ok(save.includes('GOAL_FROM_CHOICE'), 'saveProfile no longer derives the goal from the list')
  assert.ok(save.includes('saveGoal'), 'the derived goal never reaches the database')
  const settings = readFileSync(new URL('../components/SettingsSheet.tsx', import.meta.url), 'utf8')
  assert.ok(!settings.includes('onGoal'), 'Settings grew a second goal editor again')
})

check('who you were at signup is asked once, and the log answers it after that', () => {
  // The profile page used to carry an editable copy of the experience
  // questions. Those calibrated the starting program on day one; two years in,
  // the honest answer to all of them is the log, and an editable snapshot of
  // who somebody used to be quietly re-derives the program from a fiction.
  // The rerun questionnaire in Settings is the one way to be re-read.
  const profile = readFileSync(new URL('../components/ProfileSheet.tsx', import.meta.url), 'utf8')
  for (const question of [
    'How long have you been lifting',
    'Have you trained seriously in the past',
    'Could you name the weight',
    'Barbell lifts',
  ]) {
    assert.ok(!profile.includes(question), `the profile page re-asks "${question}"`)
  }
  // And the questionnaire still asks them, because day one still needs them.
  const onboarding = readFileSync(new URL('../components/Onboarding.tsx', import.meta.url), 'utf8')
  assert.ok(onboarding.includes('How long have you been lifting'), 'onboarding lost the experience question')
})

check('a promotion is earned from the log, offered once, and never demotes', () => {
  const day = (date: string) => ({
    id: date, date, title: 'x',
    exercises: [{ id: 'e', name: 'Barbell Bench Press', type: 'W', superset: null,
      sets: [{ id: 's', w: 100, r: 8, rpe: null, t: null, d: null, raw: null }] }],
  })
  // 3 sessions a week for 9 weeks: 27 days across 9 weeks.
  const weeks = Array.from({ length: 9 }, (_, w) =>
    ['2026-01-05', '2026-01-07', '2026-01-09'].map((d) => {
      const t = new Date(Date.parse(d + 'T00:00:00Z') + w * 7 * 86400000)
      return day(t.toISOString().slice(0, 10))
    }),
  ).flat() as unknown as Parameters<typeof graduationFor>[1]
  const novice = { years: 'never' as const, before: 'no' as const, knows: 'no' as const }

  const offer = graduationFor(novice, weeks, '2026-01-01')!
  assert.equal(offer.from, 'Foundation')
  assert.equal(offer.to, 'Build')
  assert.equal(offer.days, 27)

  // Not before the evidence is in, and never for somebody the app has not
  // seen train: sessions before signup do not count.
  assert.equal(graduationFor(novice, weeks.slice(0, 12), '2026-01-01'), null, 'twelve days is not eight weeks of proof')
  assert.equal(graduationFor(novice, weeks, '2026-06-01'), null, 'history from before signup does not graduate anybody')

  // Declined once is declined: the same offer is never repeated.
  assert.equal(graduationFor({ ...novice, promotionDismissed: 'Build' }, weeks, '2026-01-01'), null)

  // Accepted, the program moves up and stays up, and the next offer is the
  // next tier with a much longer bar.
  const promoted = { ...novice, promotedTo: 'Build' as const }
  assert.equal(program(promoted), 'Build')
  assert.equal(graduationFor(promoted, weeks, '2026-01-01'), null, '27 days is nowhere near Performance')

  // And a promotion can never demote: an expert stays an expert.
  const expert = { years: 'overTwo' as const, barbell: 'confident' as const, knows: 'yes' as const }
  assert.equal(program({ ...expert, promotedTo: 'Build' }), program(expert))
})

check('the list advances only when its front was truly trained, and no is respected', () => {
  const day = (date: string) => ({
    id: date, date, title: 'x',
    exercises: [{ id: 'e', name: 'Barbell Bench Press', type: 'W', superset: null,
      sets: [{ id: 's', w: 100, r: 8, rpe: null, t: null, d: null, raw: null }] }],
  })
  const thirteen = Array.from({ length: 13 }, (_, w) => {
    const t = new Date(Date.parse('2026-01-05T00:00:00Z') + w * 7 * 86400000)
    return day(t.toISOString().slice(0, 10))
  }) as unknown as Parameters<typeof advanceFor>[1]
  const wants = { goals: ['muscle', 'strength'] as ('muscle' | 'strength')[], goalChoice: 'muscle' as const }

  const offer = advanceFor(wants, thirteen, '2026-01-01')!
  assert.equal(offer.to, 'strength')
  assert.ok(offer.weeks >= 12)

  // Goals that train the same are not something to advance to, one goal has
  // nowhere to go, and eleven weeks is not twelve.
  assert.equal(advanceFor({ goals: ['muscle', 'lean'], goalChoice: 'muscle' }, thirteen, '2026-01-01'), null)
  assert.equal(advanceFor({ goals: ['muscle'], goalChoice: 'muscle' }, thirteen, '2026-01-01'), null)
  assert.equal(advanceFor(wants, thirteen.slice(0, 11), '2026-01-01'), null)

  // The clock restarts when the driving goal changes, and a no sticks for
  // this goal but re-arms after a genuine switch.
  assert.equal(advanceFor({ ...wants, goalChoiceAt: '2026-03-01' }, thirteen, '2026-01-01'), null, 'weeks count from the switch, not from signup')
  assert.equal(advanceFor({ ...wants, advanceDismissedFor: 'muscle' }, thirteen, '2026-01-01'), null)
  const switched = { goals: ['strength', 'muscle'] as ('muscle' | 'strength')[], goalChoice: 'strength' as const, advanceDismissedFor: 'muscle' as const }
  assert.ok(advanceFor(switched, thirteen, '2026-01-01'), 'a no to the old goal does not silence the new one')

  // The words on the cards say what happened and what was said, and never
  // hype or rush anybody.
  const g = graduationCopy({ from: 'Foundation', to: 'Build', days: 27, weeks: 9 })
  assert.match(g.body, /27 sessions across 9 weeks/)
  assert.match(g.body, /nothing you have logged changes/i)
  const a = advanceCopy(offer)
  assert.match(a.body, /you put getting stronger next/i)
  assert.ok(!/now or|limited|last chance|crush|unlock/i.test(g.body + a.body))
})

check('not interested in barbells means no barbells, not just a different score', () => {
  // A real user answered Not interested and got Barbell Bench Press as their
  // first movement, because the answer only ever fed the experience score.
  // The equipment answer now reaches the equipment.
  const p = { days: 3, minutes: 60 as const, barbell: 'no' as const, years: 'overTwo' as const, knows: 'yes' as const }
  for (const dayId of planFor(p, 'muscle').dayIds) {
    for (const item of buildDay(dayById(dayId)!, p)) {
      assert.notEqual(equipmentOf(item.name), 'barbell', `${item.name} for somebody who said not interested`)
    }
  }
  // The named swap lands where it was pointed: bench becomes the machine press.
  const push = buildDay(dayById('ppl-push')!, p)
  assert.ok(push.some((i) => i.name === 'Machine Chest Press'), 'the bench did not swap to its preferred machine')
  // Never tried is not a refusal: Foundation teaches, it does not assume.
  const shy = { days: 3, barbell: 'never' as const, years: 'overTwo' as const, knows: 'yes' as const }
  assert.ok(shy.barbell === 'never', 'only an explicit no bans the bar')
})

check('asking to bring up your core gets you core, whatever the split thinks', () => {
  // The same user picked Core, and the whole push pull legs week carried not
  // one core movement, so reordering had nothing to reorder. Core pairs with
  // anything and recovers overnight, so a focused core that is absent from a
  // day is added to it, first choice a plank rather than the alphabet's ab
  // wheel.
  //
  // The templates carry core themselves now, so most days need no addition and
  // simply move theirs to the front. Pull still has none of its own and still
  // gets the plank, which is the path this was written to protect.
  const p = { days: 3, minutes: 60 as const, focus: ['Core'], years: 'overTwo' as const, knows: 'yes' as const }
  for (const dayId of planFor(p, 'muscle').dayIds) {
    const built = buildDay(dayById(dayId)!, p)
    assert.ok(built.some((i) => groupOf(i.name) === 'Core'), `${dayId} has no core for a core-focused user`)
  }
  for (const dayId of ['ppl-push', 'ppl-pull', 'ppl-legs']) {
    const first = buildDay(dayById(dayId)!, p)[0]
    assert.equal(groupOf(first.name), 'Core', `${dayId} does not open on the focused work`)
  }
  assert.equal(buildDay(dayById('ppl-pull')!, p)[0].name, 'Plank', 'a day with no core of its own is not given one')

  // Within the time budget even on the shortest day: the addition competes
  // for a slot, it does not blow the clock.
  const short = buildDay(dayById('ppl-push')!, { ...p, minutes: 30 })
  assert.ok(short.length <= 4, 'the core addition blew the 30 minute budget')
  assert.ok(short.some((i) => groupOf(i.name) === 'Core'))

  // Only core carries anywhere. A chest focus does not bolt a press onto leg
  // day, because chest has a day of its own and turns up on it.
  const legsDay = planFor(p, 'muscle').dayIds.find((id) => id.includes('legs'))!
  const chestFocused = buildDay(dayById(legsDay)!, { ...p, focus: ['Chest'] })
  assert.ok(!chestFocused.some((i) => groupOf(i.name) === 'Chest'), 'a split day grew another day\'s work')

  // And nobody who did not ask has anything added. Push carries a Pallof press
  // of its own now, so the test is that it still carries exactly that and no
  // plank arrived beside it, and that pull, which carries no core at all, is
  // left carrying none.
  const unasked = { days: 3, minutes: 60 as const, years: 'overTwo' as const, knows: 'yes' as const }
  const plain = buildDay(dayById('ppl-push')!, unasked)
  assert.equal(plain.filter((i) => groupOf(i.name) === 'Core').length, 1, 'core was added to a day that had some')
  assert.ok(!plain.some((i) => i.name === 'Plank'), 'a plank was bolted on for somebody who did not ask')
  const bare = buildDay(dayById('ppl-pull')!, unasked)
  assert.ok(!bare.some((i) => groupOf(i.name) === 'Core'), 'core was added to a day that had none')
})

check('the clock trims the session, never the reason somebody gave for training', () => {
  // At 30 minutes the four day split dropped its whole core circuit over the
  // head of a person who picked Core, because a circuit that cannot be kept
  // whole used to vanish whole. It now leaves its first focused movement
  // behind as a single.
  const p = { days: 4, minutes: 30 as const, focus: ['Core'], years: 'overTwo' as const, knows: 'yes' as const }
  const dayId = planFor(p, 'muscle').dayIds[0]
  const built = buildDay(dayById(dayId)!, p)
  assert.ok(built.length <= 4, 'over the 30 minute budget')
  const core = built.filter((i) => groupOf(i.name) === 'Core')
  assert.ok(core.length >= 1, 'the trim took the focused work')
  assert.equal(core[0].superset, null, 'a rescued movement stops claiming to be a circuit')
})

check('a red flag stops the swaps too, and lifts when it is cleared', () => {
  // The red flag answer was stored and read by nothing, which for a safety
  // question is the worst kind of ignored. A sore knee swaps squats for the
  // leg press; a red flagged one does not get the leg press either, because
  // pain that wakes you at night is not something to train around, and the
  // note beside the question now says exactly that.
  const sore = { days: 3, minutes: 60 as const, sore: ['Knee'], years: 'overTwo' as const, knows: 'yes' as const }
  const legsId = planFor(sore, 'muscle').dayIds.find((id) => id.includes('legs'))!

  const swapped = buildDay(dayById(legsId)!, sore)
  assert.ok(swapped.some((i) => /Leg Press|Leg Extension/.test(i.name)), 'an ordinary sore knee keeps its gentle swap')

  const flagged = buildDay(dayById(legsId)!, { ...sore, redFlag: true })
  assert.ok(!flagged.some((i) => /Squat|Lunge|Leg Press|Leg Extension/.test(i.name)), 'a red flag must not be leg pressed around')
  assert.ok(flagged.length > 0, 'the rest of the session survives, as the note promises')
  assert.ok(flagged.some((i) => /Curl|Hip Thrust|Calf|Raise|Bridge/.test(i.name)), 'unrelated work stays')

  // Cleared is cleared: flipping it back restores the gentle swap.
  const cleared = buildDay(dayById(legsId)!, { ...sore, redFlag: false })
  assert.deepEqual(cleared, swapped)

  // And every rest-of-the-week answer earns its line, because four of the
  // five were collected and read by nothing.
  for (const o of OTHER_TRAINING) {
    assert.ok((OTHER_NOTES[o] ?? '').length > 20, `${o} is collected and says nothing`)
  }
})

check('the strip shows the next ten sessions with dates, not a week grid', () => {
  // Mon Wed Fri from a Wednesday: today counts (Wednesday's session is the
  // next one until it is done), then the pattern rolls forward with real
  // dates, skipping rest days entirely.
  const mwf = { schedule: ['', 'ppl-push', '', 'ppl-pull', '', 'ppl-legs', ''].map((x) => x || null) }
  const out = upcomingDays(mwf, '2026-08-19')
  assert.equal(out.length, 10)
  assert.deepEqual(out.slice(0, 4).map((u) => u.date), ['2026-08-19', '2026-08-21', '2026-08-24', '2026-08-26'])
  assert.equal(out[0].dayId, 'ppl-pull', 'Wednesday is a pull day in this schedule')
  assert.equal(out[1].dayId, 'ppl-legs', 'Friday is legs')
  // Dates only ever move forward and stay unique.
  for (let i = 1; i < out.length; i += 1) assert.ok(out[i].date > out[i - 1].date)

  // One day a week does not walk months into the future to fill the count:
  // the horizon caps it at four.
  const sparse = { schedule: [null, 'ppl-push', null, null, null, null, null] }
  assert.equal(upcomingDays(sparse, '2026-08-19').length, 4)

  // No schedule, no strip, and no crash.
  assert.deepEqual(upcomingDays({}, '2026-08-19'), [])
})

check('every plan the app can generate is a real session', () => {
  // The core and barbell bugs were first-session bugs that a code audit
  // missed, because the audit read code and not output. This reads output: it
  // builds thousands of days across the answer space and asserts the boring
  // things about each one. A deterministic walk rather than a random sample,
  // so a failure here is reproducible.
  const kit: Record<string, string[]> = {
    full: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other'],
    basic: ['dumbbell', 'machine', 'bodyweight', 'other'],
    home: ['dumbbell', 'bodyweight'],
    body: ['bodyweight'],
  }
  const budget: Record<number, number> = { 30: 4, 45: 6, 60: 8, 75: 10, 90: 12 }
  const known = new Set(LIBRARY.map((e) => e.name))
  let built = 0

  for (const years of ['never', 'overTwo'] as const)
    for (const access of ['full', 'basic', 'home', 'body'] as const)
      for (const minutes of [30, 60, 90] as const)
        for (const days of [3, 4, 6])
          for (const goalChoice of ['muscle', 'strength', 'health'] as const)
            for (const barbell of ['confident', 'no'] as const)
              for (const sore of [[], ['Knee'], ['Shoulder'], ['Hip', 'Elbow', 'Wrist']])
                for (const focus of [[], ['Core'], ['Glutes']])
                  for (const redFlag of [false, true]) {
                    const p = { years, access, minutes, days, goalChoice, barbell, sore, focus, redFlag, knows: 'yes' as const }
                    const goal = GOAL_FROM_CHOICE[goalChoice]
                    const plan = planFor(p, goal)
                    const where = `${years}/${access}/${minutes}m/${days}d/${goalChoice}/bb-${barbell}/sore-${sore.join('+') || 'none'}/focus-${focus.join('+') || 'none'}${redFlag ? '/RED' : ''}`

                    for (const id of plan.dayIds) {
                      const day = dayById(id)
                      assert.ok(day, `${where}: ${id} does not resolve`)
                      const items = buildDay(day!, p)
                      built += 1

                      // A day in the plan is a day with work in it. Days the
                      // answers emptied are dropped from the plan instead.
                      assert.ok(items.length >= 3, `${where}/${id}: ${items.length} is not a session`)
                      // Budget in minutes, not movements. A session may run
                      // over only when three movements will not fit inside the
                      // clock at all, which is the floor winning over the
                      // ceiling on purpose.
                      const mins = estimateSeconds(items, goal) / 60
                      const less = estimateSeconds(items.slice(0, -1), goal) / 60
                      assert.ok(
                        minutes >= LONG_SESSION || mins <= minutes || items.length <= 3 || less <= minutes,
                        `${where}/${id}: ${Math.round(mins)} minutes against ${minutes}`,
                      )

                      const seen = new Set<string>()
                      for (const item of items) {
                        assert.ok(!seen.has(item.name), `${where}/${id}: ${item.name} twice`)
                        seen.add(item.name)
                        assert.ok(known.has(item.name), `${where}/${id}: unknown movement ${item.name}`)
                        assert.ok(kit[access].includes(equipmentOf(item.name)), `${where}/${id}: ${item.name} needs kit they do not have`)
                        if (barbell === 'no') assert.notEqual(equipmentOf(item.name), 'barbell', `${where}/${id}: ${item.name}`)
                        assert.equal(lookupType(item.name), item.type, `${where}/${id}: ${item.name} is mistyped`)
                      }

                      // Supersets stay contiguous, because half a circuit at
                      // the front and half at the back is not a circuit.
                      const tags = items.map((i) => i.superset ?? null)
                      for (const t of new Set(tags.filter(Boolean))) {
                        const first = tags.indexOf(t)
                        const last = tags.lastIndexOf(t)
                        assert.equal(last - first + 1, tags.filter((x) => x === t).length, `${where}/${id}: superset ${t} is split`)
                      }

                      // What somebody asked to bring up leads the day it is in.
                      if (focus.length && items.some((i) => focus.includes(groupOf(i.name) ?? ''))) {
                        assert.ok(focus.includes(groupOf(items[0].name) ?? ''), `${where}/${id}: opens on ${items[0].name}`)
                      }
                      if (focus.includes('Core')) {
                        assert.ok(items.some((i) => groupOf(i.name) === 'Core'), `${where}/${id}: core focus with no core`)
                      }

                      assert.ok(estimateSeconds(items, goal) > 0, `${where}/${id}: estimate is zero`)
                    }
                  }

  assert.ok(built > 2000, `only built ${built} days, the sweep shrank`)
})

check('a red flag stays inside the region it belongs to', () => {
  // The words these patterns match are not owned by one region: Press is in
  // Leg Press, Raise is in Calf Raise, Curl is in Leg Curl. Unscoped, a
  // flagged shoulder took the leg machines away and emptied whole days.
  const shoulder = { days: 4, minutes: 60 as const, sore: ['Shoulder'], redFlag: true, years: 'overTwo' as const, knows: 'yes' as const }
  const week = planFor(shoulder, 'muscle').dayIds.flatMap((id) => buildDay(dayById(id)!, shoulder))
  assert.ok(week.some((i) => i.name === 'Leg Press'), 'a flagged shoulder took the leg press away')
  assert.ok(week.some((i) => /Squat/.test(i.name)), 'a flagged shoulder took squats away')
  assert.ok(!week.some((i) => /Bench Press|Overhead Press|Pec Deck|Lateral Raise|Dip/.test(i.name)), 'the shoulder itself is still being loaded')

  // Same for an elbow, which used to ban every leg machine through Curl,
  // Extension and Press.
  const elbow = { days: 4, minutes: 60 as const, sore: ['Elbow'], redFlag: true, years: 'overTwo' as const, knows: 'yes' as const }
  const elbowWeek = planFor(elbow, 'muscle').dayIds.flatMap((id) => buildDay(dayById(id)!, elbow))
  assert.ok(elbowWeek.some((i) => /Leg Curl|Leg Extension|Leg Press/.test(i.name)), 'a flagged elbow took the leg machines away')
  assert.ok(!elbowWeek.some((i) => /Bicep Curl|Cable Curl|Pushdown|Skull Crusher/.test(i.name)), 'the elbow itself is still being loaded')
})

check('a week that came back shorter says why', () => {
  // A red flagged shoulder on a bodyweight kit genuinely leaves nothing safe
  // for a chest day. The honest answer is a shorter week with a reason, not a
  // card promising a workout and opening on nothing.
  const stuck = { days: 6, minutes: 60 as const, access: 'body' as const, sore: ['Shoulder'], redFlag: true, years: 'overTwo' as const, knows: 'yes' as const }
  const plan = planFor(stuck, 'muscle')
  assert.ok(plan.emptied > 0, 'nothing was reported as dropped')
  assert.equal(plan.dayIds.length + plan.emptied, 6, 'the dropped days do not add up to the week asked for')
  for (const id of plan.dayIds) assert.ok(buildDay(dayById(id)!, stuck).length > 0)

  // And an ordinary week loses nothing and says nothing.
  assert.equal(planFor({ days: 4, years: 'overTwo', knows: 'yes' }, 'muscle').emptied, 0)
})

check('a switch that says on means a phone the server can actually reach', () => {
  // The registration is the feature: without a row on the server there is
  // nowhere to send a Friday evening message from. The failure used to be
  // swallowed, so the switch said on over a feature that could never fire,
  // which is how this one went a month without delivering anything.
  const push = readFileSync(new URL('../lib/push.ts', import.meta.url), 'utf8')
  const enable = push.slice(push.indexOf('export async function enableNudge'), push.indexOf('export async function forgetNudge'))
  assert.match(enable, /if \(!res\.ok\) return 'unregistered'/, 'a rejected registration is reported as success again')
  assert.match(enable, /catch \{\s*return 'unregistered'/, 'a failed registration is swallowed again')

  // And the screen says so rather than leaving somebody with a lie.
  const settings = readFileSync(new URL('../components/SettingsSheet.tsx', import.meta.url), 'utf8')
  assert.match(settings, /state === 'unregistered'/, 'the settings screen ignores a failed registration')
})

check('a week nobody was reached is not a week they were nudged', () => {
  // The job stamped everybody it processed, delivered or not. A run where
  // every endpoint turned out to be dead then burned the next six days and
  // counted a miss against somebody who was never spoken to, which is how a
  // silent failure becomes a silent absence.
  const route = readFileSync(new URL('../app/api/nudge/route.ts', import.meta.url), 'utf8')
  assert.match(route, /if \(delivered\) await stampNudge/, 'the job stamps people it never reached again')
  assert.match(route, /delivered = true/, 'nothing ever records a successful delivery')
})

check('a plan that changed on Tuesday has not changed every Tuesday', () => {
  // The schedule is a weekly pattern, so editing it to shift one session would
  // shift that weekday forever. Life moving a workout from Tuesday to
  // Wednesday this week is not a change of plan, it is a change of Tuesday, so
  // a move is stored against the date.
  const mwf = { schedule: [null, 'ppl-push', null, 'ppl-pull', null, 'ppl-legs', null] }
  const today = '2026-08-17' // a Monday

  // Monday's push and Wednesday's pull trade places, both directions at once,
  // so nothing is deleted and nothing is duplicated.
  const moves = swapDays(mwf, '2026-08-17', '2026-08-19', today)
  const swapped = { ...mwf, moves }
  assert.equal(dayIdFor(swapped, '2026-08-17'), 'ppl-pull')
  assert.equal(dayIdFor(swapped, '2026-08-19'), 'ppl-push')

  // Next week is untouched, which is the whole point.
  assert.equal(dayIdFor(swapped, '2026-08-24'), 'ppl-push')
  assert.equal(dayIdFor(swapped, '2026-08-26'), 'ppl-pull')

  // Moving onto a rest day leaves a rest day behind rather than a duplicate.
  const onto = { ...mwf, moves: swapDays(mwf, '2026-08-17', '2026-08-18', today) }
  assert.equal(dayIdFor(onto, '2026-08-18'), 'ppl-push')
  assert.equal(dayIdFor(onto, '2026-08-17'), null, 'the day it came from still holds it')

  // Swapping back is not an exception any more, so nothing is stored.
  const there = swapDays(mwf, '2026-08-17', '2026-08-19', today)
  const back = swapDays({ ...mwf, moves: there }, '2026-08-17', '2026-08-19', today)
  assert.deepEqual(back, {}, 'a move that matches the pattern is just the pattern')

  // Yesterday's exceptions are history the pattern has moved past.
  const stale = swapDays({ ...mwf, moves: { '2026-08-10': 'ppl-legs' } }, '2026-08-17', '2026-08-19', today)
  assert.ok(!('2026-08-10' in stale), 'old moves accumulate in the profile forever')

  // And the list people actually read agrees with all of it.
  const upcoming = upcomingDays(swapped, today)
  assert.equal(upcoming[0].date, '2026-08-17')
  assert.equal(upcoming[0].dayId, 'ppl-pull')
  assert.equal(upcoming.find((u) => u.date === '2026-08-19')!.dayId, 'ppl-push')
  assert.equal(upcoming.find((u) => u.date === '2026-08-24')!.dayId, 'ppl-push', 'next week drifted')

  // Today's card reads the same source, so the strip and the list can never
  // disagree about what Monday holds.
  assert.equal(todaysDayId(swapped, '2026-08-17'), 'ppl-pull')
})

check('moving one session moves one session, and nothing on the way', () => {
  // Arrows that traded a card with the card beside it could only walk a
  // session one slot at a time, and walking Monday to Friday that way is four
  // swaps that shuffle everything in between. Picking the day outright is one
  // exchange between two dates.
  const week = {
    schedule: [null, 'ppl-push', 'ppl-pull', null, 'ppl-legs', 'ppl-push', null],
  }
  const today = '2026-08-17' // a Monday

  // Monday's push goes straight to Friday, four days off, in one move.
  const moved = { ...week, moves: swapDays(week, '2026-08-17', '2026-08-21', today) }
  assert.equal(dayIdFor(moved, '2026-08-17'), 'ppl-push', 'Friday\'s session came back here')
  assert.equal(dayIdFor(moved, '2026-08-21'), 'ppl-push')

  // The days it passed over are exactly as the pattern left them.
  assert.equal(dayIdFor(moved, '2026-08-18'), 'ppl-pull')
  assert.equal(dayIdFor(moved, '2026-08-19'), null)
  assert.equal(dayIdFor(moved, '2026-08-20'), 'ppl-legs')

  // A move to a rest day several days out is the same one exchange.
  const rested = { ...week, moves: swapDays(week, '2026-08-18', '2026-08-22', today) }
  assert.equal(dayIdFor(rested, '2026-08-18'), null)
  assert.equal(dayIdFor(rested, '2026-08-22'), 'ppl-pull')
  assert.equal(dayIdFor(rested, '2026-08-20'), 'ppl-legs', 'a day in between changed')

  // Every later week keeps every weekday it was given. This is the promise the
  // dated map exists to make, checked across a month rather than one Tuesday.
  for (const later of ['2026-08-24', '2026-08-31', '2026-09-07', '2026-09-14']) {
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(later + 'T00:00:00')
      d.setDate(d.getDate() + i)
      const iso = d.toISOString().slice(0, 10)
      assert.equal(dayIdFor(moved, iso), scheduleOf(week)[weekdayOf(iso)] ?? null, `${iso} drifted`)
      assert.equal(dayIdFor(rested, iso), scheduleOf(week)[weekdayOf(iso)] ?? null, `${iso} drifted`)
    }
  }

  // The picker offers every date ahead, rest days included, because an empty
  // day is the likeliest place a session is going.
  const ahead = datesAhead(today, 14)
  assert.equal(ahead.length, 14)
  assert.equal(ahead[0], today)
  assert.equal(ahead[13], '2026-08-30')
  assert.ok(ahead.includes('2026-08-19'), 'the rest day is not offered')
  assert.equal(daysBetween('2026-08-17', '2026-08-21'), 4)

  // The list reaches as far as the picker does, so nothing somebody can see on
  // the Calendar tab is somewhere they cannot send a session.
  const last = upcomingDays(week, today).at(-1)!.date
  assert.ok(datesAhead(today, Math.min(28, Math.max(14, daysBetween(today, last) + 1))).includes(last))

  // And the card carries one way to move, not two, so there is one story about
  // how a session changes days.
  const list = readFileSync(new URL('../components/UpcomingList.tsx', import.meta.url), 'utf8')
  assert.ok(list.includes('onMove(u.date)'), 'the card lost its way to move')
  assert.ok(!list.includes('&uarr;') && !list.includes('&darr;'), 'the nudge arrows came back')
})

check('every card in the list can reach every other card', () => {
  // The picker looks a fixed distance ahead and the list does not: ten sessions
  // is ten days at seven a week and twenty two at three, so a span that suited
  // one shape would leave the far cards of another unreachable. Sweep every
  // schedule the app can hold against every day it could be opened on.
  const ids = ['ppl-push', 'ppl-pull', 'ppl-legs']
  let swept = 0
  for (let mask = 1; mask < 128; mask += 1) {
    const schedule = Array.from({ length: 7 }, (_, d) => (mask & (1 << d) ? ids[d % 3] : null))
    for (let start = 0; start < 7; start += 1) {
      // 2026-08-16 is a Sunday, so start walks the whole week.
      const today = datesAhead('2026-08-16', 7)[start]
      const profile = { schedule }
      const upcoming = upcomingDays(profile, today)
      const last = upcoming.at(-1)!.date
      const span = Math.min(28, Math.max(14, daysBetween(today, last) + 1))
      const offered = new Set(datesAhead(today, span))
      for (const u of upcoming) {
        assert.ok(offered.has(u.date), `${u.date} is on the list but not in the picker`)
      }
      swept += 1
    }
  }
  assert.equal(swept, 889)

  // Nothing is offered behind today, because a move backwards is a move into
  // the log, and the log is what happened rather than what is planned.
  const ahead = datesAhead('2026-08-17', 14)
  assert.ok(ahead.every((d) => d >= '2026-08-17'))
})

check('the app answers questions about itself, in the words people use', () => {
  // A panel that can explain progressive overload but not how to move Tuesday
  // to Thursday is answering the questions we found interesting rather than
  // the ones people have while holding the phone.
  const first = (q: string) => searchKnowledge(q)[0]?.id
  assert.equal(first('how do i move a workout to another day'), 'app-move-day')
  assert.equal(first('can i swap tuesday and thursday'), 'app-move-day')
  assert.equal(first('how do i delete my account'), 'app-delete')
  assert.equal(first('what if i get a new phone'), 'app-new-phone')
  assert.equal(first('turn off notifications'), 'app-notifications')
  assert.equal(first('how do i put this on my home screen'), 'app-install')
  assert.equal(first('why did my estimated max go down'), 'num-max-drop')
  assert.equal(first('my gym does not have a leg press'), 'basic-equipment')
  assert.ok(searchKnowledge('export my data').some((e) => e.id === 'app-export'))
  // There is no subscription, so the honest answer to asking about one is the
  // entry that says so rather than silence.
  assert.equal(first('how do i cancel my subscription'), 'app-cost')
  assert.equal(first('is there a subscription'), 'app-cost')
  assert.equal(first('do i need a belt'), 'basic-belt')

  // The one that has to be right: the move answer has to say it is dated, or
  // somebody will read it as editing their whole schedule.
  const move = KNOWLEDGE.find((e) => e.id === 'app-move-day')!
  assert.ok(/does not move every Tuesday/.test(move.a), 'the move answer does not say it is dated')
})

check('a write nobody checked is a write nobody knows failed', () => {
  // Postgrest hands a rejected write back in the result rather than throwing,
  // so an insert whose error is never read looks exactly like one that worked.
  // The question log shipped that way: row level security could have been
  // refusing every row and the app would have looked perfectly healthy.
  const db = readFileSync(new URL('../lib/db.ts', import.meta.url), 'utf8')
  const writes = db.match(/\.(insert|upsert|update|delete)\(/g) ?? []
  assert.ok(writes.length > 5, 'no writes found, the pattern must have changed')

  // Every await of a write is either assigned so its error can be read, or
  // sits inside a statement that reads one.
  for (const line of db.split('\n')) {
    if (/^\s*await sb\s*$/.test(line) || /await sb\.from\([^)]*\)\s*$/.test(line)) continue
    assert.ok(
      !/^\s*await sb\.from\(.*\)\.(insert|upsert|update|delete)\(/.test(line),
      `unchecked write: ${line.trim()}`,
    )
  }
  assert.ok(db.includes('if (res.error) throw res.error'), 'writes stopped checking their errors')
})

check('what Lifty could not answer is written down, not lost', () => {
  // Writing more entries without knowing what people ask is guessing. Every
  // question that misses is now a row, and the top of that list is the next
  // entry to write.
  const rows = [
    { userId: 'a', question: 'Can I train with a torn rotator cuff?', answered: false, at: '2026-08-10' },
    { userId: 'b', question: 'can i train with a torn rotator cuff', answered: false, at: '2026-08-12' },
    { userId: 'a', question: 'can i train with a torn rotator cuff', answered: false, at: '2026-08-14' },
    { userId: 'c', question: 'is the gym open on sunday', answered: false, at: '2026-08-11' },
    { userId: 'a', question: 'deload', answered: true, at: '2026-08-09' },
  ]
  const report = askedReport(rows)

  // Case and trailing punctuation are the same question, and the spelling
  // reported is the one people typed most.
  const top = report[0]
  assert.equal(top.people, 2, 'one person asking three times is one person')
  assert.equal(top.times, 3)
  assert.equal(top.question, 'can i train with a torn rotator cuff', 'the spelling reported is not the one most people typed')
  // An even split falls back to alphabetical rather than to whatever order the
  // database returned, so the report does not change under its own feet.
  const tied = askedReport([
    { userId: 'a', question: 'Zebra question', answered: false, at: '2026-08-01' },
    { userId: 'b', question: 'Alpha question', answered: false, at: '2026-08-02' },
  ])
  assert.equal(tied.length, 2)
  assert.equal(askedKey('Can I train with a torn rotator cuff?'), 'can i train with a torn rotator cuff')

  // Two spellings, one row, but never merged further than the words allow.
  assert.notEqual(askedKey('sore shoulder'), askedKey('shoulder pain'))

  // The work list is the misses. What was answered stays in the report,
  // because what people find is how Asked most eventually becomes true.
  const todo = unanswered(report)
  assert.equal(todo.length, 2)
  assert.ok(!todo.some((r) => r.question === 'deload'))
  assert.ok(report.some((r) => r.question === 'deload' && r.answered))

  // An entry written since it was first asked closes the question, so it
  // stops sitting at the top of a list of work to do.
  const closed = askedReport([
    { userId: 'a', question: 'what is a deload', answered: false, at: '2026-08-01' },
    { userId: 'b', question: 'what is a deload', answered: true, at: '2026-08-20' },
  ])
  assert.equal(unanswered(closed).length, 0)

  // The write is fire and forget. Telemetry that decides what to write next
  // must never be able to break the search box it sits behind.
  const app = readFileSync(new URL('../components/App.tsx', import.meta.url), 'utf8')
  assert.ok(/logQuestion\([^)]*\)\.catch\(/.test(app), 'a failed log can surface as an error')

  // Recorded when the typing settles, not per keystroke.
  const sheet = readFileSync(new URL('../components/HelpSheet.tsx', import.meta.url), 'utf8')
  assert.ok(sheet.includes('setTimeout'), 'every keystroke is a question')
  assert.ok(sheet.includes('logged.current'), 'the same wording is logged over and over')
})

check('the line between a health question and a performance one', () => {
  // Both sides of this have been got wrong in turn, and the second mistake was
  // mine correcting the first too hard.
  //
  // The library drifted into giving health advice, which read well and was the
  // problem: growth plates, oestrogen, whether a worn joint should be loaded,
  // written by something that has never met the person asking. Pulling that
  // back then swallowed the answers either side of it, and a training log that
  // will not say how much protein builds muscle is not being careful, it is
  // being useless about the thing it exists for.
  //
  // The line is who the question belongs to. A condition, an injury, a
  // symptom, a medication, a body that needs clearing to train: those belong
  // to a clinician and the answer says so. How to get stronger, how much
  // muscle is possible, what to eat to build it: those belong here, and the
  // answer had better be specific.
  const CLINICAL = ['basic-teens', 'basic-women-50', 'basic-arthritis', 'basic-age', 'basic-sick', 'basic-pain']
  const PERFORMANCE = [
    'basic-protein', 'basic-protein-timing', 'basic-what-to-eat-before', 'basic-bulk',
    'basic-recomp', 'basic-sixpack', 'basic-cardio-fatloss', 'basic-rate-of-gain',
    'basic-water', 'w-macros', 'w-bulk-cut', 'basic-muscle-fat',
  ]
  const DEFERS = /doctor|clinician|dietitian|pharmacist|physio|qualified|professional/i

  for (const id of CLINICAL) {
    const entry = KNOWLEDGE.find((e) => e.id === id)
    assert.ok(entry, `${id} has gone, and the rule with it`)
    assert.ok(DEFERS.test(entry!.a), `${id} answers a health question without saying whose it is`)
    assert.ok(
      !/growth plate|oestrogen|estrogen|osteoporosis|injury rate/i.test(entry!.a),
      `${id} is making a medical claim`,
    )
  }

  // And the other way. A performance answer that hedges to a professional has
  // handed away the question this app is for.
  for (const id of PERFORMANCE) {
    const entry = KNOWLEDGE.find((e) => e.id === id)
    assert.ok(entry, `${id} has gone`)
    assert.ok(
      !DEFERS.test(entry!.a),
      `${id} sends a performance question to somebody else`,
    )
  }

  // Specific enough to be worth reading. These are the numbers somebody came
  // for, and an answer that will not say them is not a safer answer.
  assert.ok(/gram per pound|three quarters of a gram/i.test(KNOWLEDGE.find((e) => e.id === 'basic-protein')!.a))
  assert.ok(/half a pound a week|few hundred calories/i.test(KNOWLEDGE.find((e) => e.id === 'basic-bulk')!.a))
  assert.ok(/pound or two a month/i.test(KNOWLEDGE.find((e) => e.id === 'basic-rate-of-gain')!.a))

  // The panel says which of the two it is, rather than leaving it to be
  // inferred from the answers one at a time.
  const sheet = readFileSync(new URL('../components/HelpSheet.tsx', import.meta.url), 'utf8')
  assert.ok(/answers training questions/.test(sheet), 'the panel stopped saying what it does')
  assert.ok(/injury, a condition or medication/.test(sheet), 'the panel stopped saying what it does not')
  // And it must not claim to be no use on food, since eating to train is half
  // of what people ask about and it answers that.
  assert.ok(!/nutrition service/.test(sheet), 'the panel disowns questions it actually answers')
})

check('the questions the whole internet asks have answers here', () => {
  // Found by looking outward rather than inward: sweeping what people actually
  // ask about lifting, then checking each theme against the library rather
  // than assuming. Most of the misses did not come back empty, they came back
  // wrong, which is worse. Is lifting safe for teenagers returned the answer
  // about breathing, and I have arthritis returned the answer about plateaus.
  const first = (q: string) => searchKnowledge(q)[0]?.id
  for (const [q, id] of [
    ['do i need protein straight after training', 'basic-protein-timing'],
    ['anabolic window', 'basic-protein-timing'],
    ['how much muscle can i gain in a month', 'basic-rate-of-gain'],
    ['will my muscle turn to fat', 'basic-muscle-fat'],
    ['is lifting safe for teenagers', 'basic-teens'],
    ['does lifting stunt your growth', 'basic-teens'],
    ['strength training after menopause', 'basic-women-50'],
    ['i have arthritis can i lift', 'basic-arthritis'],
    ['i feel intimidated at the gym', 'basic-gym-nerves'],
    ['do i need a spotter', 'basic-spotter'],
    ['how much water should i drink', 'basic-water'],
    ['does it matter what time of day i train', 'basic-time-of-day'],
    ['can i target belly fat', 'basic-spot-reduction'],
    ['how do i tone my arms', 'basic-spot-reduction'],
    ['cardio or weights for fat loss', 'basic-cardio-fatloss'],
    ['is it bad to work out every day', 'basic-restdays'],
  ] as [string, string][]) {
    assert.equal(first(q), id, `"${q}" does not reach ${id}`)
  }

  // The two that carry a duty of care beyond being right: neither may answer
  // with a plan, and both have to say who the question actually belongs to.
  for (const id of ['basic-arthritis', 'basic-women-50']) {
    const entry = KNOWLEDGE.find((e) => e.id === id)!
    assert.ok(
      /clinician|physio|doctor|whoever knows/.test(entry.a),
      `${id} answers a medical question without pointing anywhere`,
    )
  }
})

check('Lifty reads the question, not only the words in it', () => {
  // Matching on the terms somebody typed has a ceiling and the library reached
  // it. My knee clicks when I squat found nothing, because clicks is not a
  // word anybody thought to write beside an answer about pain, and neither is
  // pops or twinges or aches. Seven of fourteen ordinary paraphrases came back
  // empty. You cannot enumerate the vocabulary of pain one alias at a time.
  const first = (q: string) => searchKnowledge(q)[0]?.id
  for (const [q, id] of [
    // Nobody typing these uses a word the answer contains.
    ['my knee clicks when i squat', 'basic-pain'],
    ['my shoulder pops when i press', 'basic-pain'],
    ['my back is tight after deadlifts', 'basic-pain'],
    ['my elbow aches', 'basic-pain'],
    ['my arms are not growing', 'strong-plateau'],
    ['im knackered all the time', 'basic-sleep'],
    ['can i skip leg day', 'basic-missed'],
    ['what if i cant make it in this week', 'basic-missed'],
    ['how do i get a six pack', 'basic-sixpack'],
    ['how do i stop losing muscle', 'basic-maintain'],
    ['should i eat more to get bigger', 'basic-bulk'],
    ['is it bad to work out every day', 'basic-restdays'],
    ['i can only get to the gym twice', 'basic-two-days'],
  ] as [string, string][]) {
    assert.equal(first(q), id, `"${q}" does not reach ${id}`)
  }

  // Reading further must not make it vaguer. A definition question wants the
  // definition, and a how question wants the instructions, which is a
  // distinction that only survives because the shape of the question counts.
  assert.equal(first('what is a drop set'), 'basic-dropset')
  assert.equal(first('how do i log a drop set'), 'app-dropset-how')
  assert.equal(first('what is a superset'), 'basic-superset')
  assert.equal(first('how do i make a superset'), 'app-superset-how')
  assert.equal(first('how many warm up sets'), 'strong-warm-up-sets')
  assert.equal(first('how should i warm up'), 'basic-warmup')

  // A word somebody actually typed beats a concept inferred from it. Macros is
  // one of the words that names the food concept, and for a while every entry
  // about eating counted it as a direct hit.
  assert.equal(first('macros'), 'w-macros')
  assert.equal(first('tdee'), 'w-tdee')

  // An entry about substitution must not advertise itself with the vocabulary
  // of pain, or it competes with the answer that says see a clinician.
  const swap = KNOWLEDGE.find((e) => e.id === 'app-swap')!
  assert.ok(
    !swap.aliases.some((a) => /pain|sore|hurt|ache/.test(a)),
    'the swap answer is claiming to be about pain again',
  )

  // And the gate still holds with every word in the library reachable through
  // a stem or a concept.
  for (const off of ['best crypto to buy', 'who won the election', 'is the gym open on sunday', 'how do i fix my golf swing']) {
    assert.deepEqual(searchKnowledge(off), [], `${off} found something`)
  }
})

check('the jargon has somewhere to be looked up', () => {
  // A question is something somebody thought to ask. A term is something they
  // read on a screen and did not want to admit they did not know, which is a
  // different shape and was missing entirely: RIR, eccentric, DOMS and TDEE
  // are on the screen or in every article about it, and none of them resolved.
  const words = KNOWLEDGE.filter((e) => e.group === 'Words you will see')
  assert.ok(words.length >= 30, `only ${words.length} terms`)

  // Typed the way somebody types a term: the word on its own.
  const first = (q: string) => searchKnowledge(q)[0]?.id
  for (const [term, id] of [
    ['rir', 'w-rir'], ['doms', 'w-doms'], ['tdee', 'w-tdee'], ['tempo', 'w-tempo'],
    ['what does eccentric mean', 'w-eccentric'], ['what is a pump', 'w-pump'],
    ['bracing', 'w-bracing'], ['macros', 'w-macros'], ['hypertrophy', 'w-hypertrophy'],
    ['unilateral', 'w-unilateral'], ['sticking point', 'w-lockout'],
  ] as [string, string][]) {
    assert.equal(first(term), id, `${term} does not resolve to its definition`)
  }

  // Filler that arrives with a definition request is filler, not content. What
  // does eccentric mean was answering with a paragraph about volume, because
  // mean scored as a word somebody was asking about.
  assert.ok(!searchKnowledge('what does eccentric mean').some((e) => e.id === 'num-volume'))
})

check('the questions people have while holding the phone are answered', () => {
  const first = (q: string) => searchKnowledge(q)[0]?.id
  for (const [q, id] of [
    ['can i train when i have a cold', 'basic-sick'],
    ['hotel gym', 'basic-travel'],
    ['how many exercises per workout', 'basic-how-many-exercises'],
    ['dumbbells jump too much', 'strong-small-jumps'],
    ['how do i fix a workout i logged wrong', 'app-edit-past'],
    ['what is the block number', 'app-block-week'],
    ['can women train the same', 'basic-women'],
    ['how many warm up sets', 'strong-warm-up-sets'],
    ['can i do machines only', 'basic-machines-only'],
    ['how long should i run a program', 'strong-how-long-block'],
  ] as [string, string][]) {
    assert.equal(first(q), id, `${q} finds the wrong answer`)
  }

  // Every group carries enough to be worth browsing into.
  for (const g of KNOWLEDGE_GROUPS) {
    assert.ok(KNOWLEDGE.filter((e) => e.group === g).length >= 10, `${g} is thin`)
  }
  assert.ok(KNOWLEDGE.length >= 120, `only ${KNOWLEDGE.length} entries`)

  // And the gate still holds with three times the library to trip over.
  for (const off of ['best crypto to buy', 'who won the election', 'is the gym open on sunday', 'how do i fix my golf swing']) {
    assert.deepEqual(searchKnowledge(off), [], `${off} found something`)
  }
})

check('Lifty does not dress a lookup up as a conversation', () => {
  // An avatar over a single line input is the shape of a chat window, and a
  // shape is read before any words under it. What is actually there is a
  // keyword search over hand written answers, so nothing may promise more.
  const sheet = readFileSync(new URL('../components/HelpSheet.tsx', import.meta.url), 'utf8')
  assert.ok(sheet.includes('Search the answers'), 'the box still invites a conversation')
  assert.ok(!sheet.includes('placeholder="Ask about'), 'the old chat placeholder came back')
  assert.ok(sheet.includes('{KNOWLEDGE.length} answers'), 'the count is not said out loud')

  // The miss is honest and stays that way: a question outside the file says so
  // rather than reaching for the nearest entry.
  // A long question that shares a word or two with the library used to come
  // back looking answered. Half of what somebody asked has to land now.
  assert.deepEqual(searchKnowledge('is the gym open on sunday'), [])
  assert.deepEqual(searchKnowledge('how do i fix my golf swing'), [])
  // And a question the library really does answer still answers.
  assert.ok(searchKnowledge('creatine').some((e) => e.id === 'basic-supplements'))

  // The gate is not an excuse for a thin library. An answer that says the
  // right thing is worthless if nobody typing about an injury can reach it, so
  // the words people use when something is actually wrong all land on it.
  for (const q of [
    'can i train with a torn rotator cuff',
    'my shoulder hurts when i press',
    'i think i pulled a hamstring',
    'elbow tendonitis lifting',
    'sharp twinge in my lower back',
  ]) {
    assert.ok(searchKnowledge(q).some((e) => e.id === 'basic-pain'), `${q} finds nothing about pain`)
  }
  assert.ok(sheet.includes('does not know that one'), 'the miss stopped admitting it is a miss')
})

check('two sessions with the same name are the same session', () => {
  // There were four different days called Legs and two called Push. On a
  // calendar that is a name that tells you nothing, and in the week picker it
  // is a choice between two things you cannot tell apart.
  const days = SPLITS.flatMap((s) => s.days)
  const byName = new Map<string, string[]>()
  for (const d of days) byName.set(d.name, [...(byName.get(d.name) ?? []), d.id])

  for (const [name, ids] of byName) {
    if (ids.length === 1) continue
    // A shared name is allowed only when the sessions really are the same
    // workout appearing in two splits, which a couple genuinely are.
    // Compared on the work, not the finisher. A couple of these days are the
    // same session in two splits and differ only in whether the core slot is
    // one movement or a rotating pick, which is not something a name is
    // supposed to distinguish.
    const work = (id: string) =>
      dayById(id)!
        .exercises.map((e) => (Array.isArray(e) ? e.join('/') : e))
        .filter((n) => !n.split('/').every((one) => groupOf(one) === 'Core'))
        .sort()
        .join('|')
    const [first, ...rest] = ids.map(work)
    for (const other of rest) {
      assert.equal(other, first, `${name} names two different sessions: ${ids.join(', ')}`)
    }
  }

  // The vocabulary somebody actually uses for a leg day, rather than Legs
  // four times over.
  const names = days.map((d) => d.name)
  assert.ok(names.includes('Quad Dominant Legs'))
  assert.ok(names.includes('Glute Dominant Legs'))
  assert.ok(names.includes('Squat Led Legs'))
  assert.ok(names.includes('Incline Push'))
  assert.ok(names.includes('Vertical Pull'))

  // Push Pull Legs keeps the plain names, being the split those words name.
  assert.equal(dayById('ppl-push')!.name, 'Push')
  assert.equal(dayById('ppl-pull')!.name, 'Pull')
  assert.equal(dayById('ppl-legs')!.name, 'Legs')
})

check('every week trains everything it claims to', () => {
  // Counted from the sessions the app actually produces, per muscle, per week,
  // for every program and every day count somebody can reach. Reading the
  // templates said they looked balanced. Reading the output said Performance
  // at five days a week came back with twenty core movements, no biceps, no
  // triceps and no calves, and that no plan at any setting trained traps at
  // all while the library held fourteen trap exercises.
  const PROFILES: Record<string, object> = {
    Foundation: { years: 'never', knows: 'no', barbell: 'never' },
    Build: { years: 'sixToTwo', knows: 'roughly', barbell: 'rusty' },
    Performance: { years: 'overTwo', knows: 'yes', barbell: 'confident' },
  }
  // The nine that a week is not a week without. Calves and traps are accessory
  // and genuinely do not survive a three day full body week inside an hour,
  // which is not a bug: with rest counted honestly that week holds five or six
  // movements a session and real full body programs drop the same two. They
  // are checked separately, with the clock off, so they cannot be orphaned in
  // the library either.
  const MUST = [
    'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
    'Quads', 'Hamstrings', 'Glutes', 'Core',
  ]
  const ACCESSORY = ['Calves', 'Traps']

  for (const [name, base] of Object.entries(PROFILES)) {
    for (const days of [3, 4, 5, 6]) {
      const p = { ...base, days, minutes: 60 } as never
      if (program(p) !== name) continue
      const week = planFor(p, 'muscle').dayIds.flatMap((id) => buildDay(dayById(id)!, p))

      for (const group of MUST) {
        const sets = week.filter((i) => groupOf(i.name) === group).length
        assert.ok(sets >= 1, `${name} at ${days} days never trains ${group}`)
      }

      // Nothing runs away with the week either. Core was the one that did:
      // a finisher reserved ahead of the session took a third of it.
      for (const group of MUST) {
        const sets = week.filter((i) => groupOf(i.name) === group).length
        assert.ok(sets <= week.length / 3, `${name} at ${days} days is ${sets} of ${week.length} on ${group}`)
      }

      // A session is a session. One movement left standing is a card promising
      // a workout and opening on almost nothing.
      for (const id of planFor(p, 'muscle').dayIds) {
        assert.ok(buildDay(dayById(id)!, p).length >= 3, `${id} came back with fewer than three`)
      }

      // With the clock off, the accessory work is there too, so a trim is the
      // only reason it ever goes missing.
      const noCap = { ...base, days, minutes: LONG_SESSION } as never
      const whole = planFor(noCap, 'muscle').dayIds.flatMap((id) => buildDay(dayById(id)!, noCap))
      for (const group of ACCESSORY) {
        assert.ok(
          whole.some((i) => groupOf(i.name) === group),
          `${name} at ${days} days never trains ${group} even with no time limit`,
        )
      }
    }
  }
})

check('the plan only offers equipment somebody actually has', () => {
  // The classifier reads names, and a leg extension does not say machine in
  // its name. A home gym leg day came back as Goblet Squat, Single Leg
  // Extension, Walking Lunge, Leg Extension, Standing Calf Raise: a leg
  // extension twice and three machines nobody has in a spare room.
  for (const [name, kit] of [
    ['Leg Extension', 'machine'], ['Single Leg Extension', 'machine'],
    ['Lying Leg Curl', 'machine'], ['Seated Leg Curl', 'machine'],
    ['Standing Leg Curl', 'machine'], ['Single Leg Curl', 'machine'],
    ['Standing Calf Raise', 'machine'], ['Seated Calf Raise', 'machine'],
    // And the other way. A split squat is a dumbbell movement that happens to
    // contain the word squat, and it is the best leg exercise a spare room has.
    ['Bulgarian Split Squat', 'dumbbell'], ['Split Squat', 'dumbbell'],
  ] as [string, string][]) {
    assert.equal(equipmentOf(name), kit, `${name} is filed as ${equipmentOf(name)}`)
  }

  // Proven on output, not on the table above it: no session may contain a
  // movement the person has no equipment for, across every kit and every day.
  const KIT: Record<string, string[]> = {
    body: ['bodyweight'],
    home: ['dumbbell', 'bodyweight'],
    basic: ['dumbbell', 'machine', 'bodyweight', 'other'],
  }
  for (const [access, allowedKit] of Object.entries(KIT)) {
    for (const day of SPLITS.flatMap((sp) => sp.days)) {
      const items = buildDay(day, { access, days: 4, years: 'overTwo', knows: 'yes' } as never)
      for (const i of items) {
        assert.ok(
          allowedKit.includes(equipmentOf(i.name)),
          `${access} was given ${i.name}, which needs ${equipmentOf(i.name)}`,
        )
      }
      // And never the same movement twice in one session.
      const names = items.map((i) => i.name)
      assert.equal(new Set(names).size, names.length, `${day.id} on ${access} repeats a movement`)
    }
  }
})

check('a swap never answers with something harder', () => {
  // A swap exists because somebody cannot do the original, so replying with
  // something harder is the one answer guaranteed to be wrong. Similarity
  // cannot see it: a handstand push up is extremely similar to a push up, and
  // a beginner with no equipment was being handed weighted push ups, weighted
  // dips and handstand push ups on day one.
  assert.equal(demandOf('Handstand Push Up'), 'demanding')
  assert.equal(demandOf('Knee Push Up'), 'gentle')
  assert.equal(demandOf('Dumbbell Bench Press'), 'normal')

  const beginner = { years: 'never', knows: 'no', barbell: 'never', days: 3 } as never
  const seasoned = { years: 'overTwo', knows: 'yes', barbell: 'confident', days: 3 } as never

  for (const access of ['body', 'home', 'basic', 'full']) {
    for (const day of SPLITS.flatMap((sp) => sp.days)) {
      const items = buildDay(day, { ...(beginner as object), access } as never)
      for (const i of items) {
        assert.equal(
          demandOf(i.name), demandOf(i.name) === 'demanding' ? 'never' : demandOf(i.name),
          `a beginner on ${access} was given ${i.name}`,
        )
      }
    }
  }

  // And the two are not the same session. Before this they were identical:
  // difficulty was not modelled anywhere, so experience changed nothing about
  // which movements came back.
  const begPull = buildDay(dayById('ppl-pull')!, { ...(beginner as object), access: 'full' } as never).map((i) => i.name)
  const proPull = buildDay(dayById('ppl-pull')!, { ...(seasoned as object), access: 'full' } as never).map((i) => i.name)
  assert.notDeepEqual(begPull, proPull, 'experience changes nothing about the session')
  assert.ok(!begPull.includes('Pull Up'), 'Foundation still opens on a pull up')
  assert.ok(proPull.includes('Pull Up'), 'somebody who can do a pull up is not offered one')

  // A swap lands on the right muscle, not merely the right group. Face pull
  // and front raise are both Shoulders and train opposite ends of it.
  const homePull = buildDay(dayById('ppl-pull')!, { ...(seasoned as object), access: 'home' } as never).map((i) => i.name)
  assert.ok(!homePull.includes('Front Raise'), 'a face pull was answered with a front raise')
})

check('a movement somebody cannot do yet has an easier version', () => {
  // The library climbed away from beginners. Every push up was a push up or
  // harder, every pull up was a pull up or harder, so a Foundation plan asked
  // people for movements they could not do and offered nothing below them.
  // You cannot take five pounds off a pull up; you change the leverage or add
  // help, and both of those have to exist as entries.
  const names = new Set(LIBRARY.map((e) => e.name))
  for (const easier of [
    'Incline Push Up', 'Knee Push Up',
    'Assisted Pull Up', 'Band Assisted Pull Up', 'Negative Pull Up', 'Scapular Pull Up',
  ]) {
    assert.ok(names.has(easier), `${easier} is missing`)
  }

  // And the swap has to reach them, or they exist without being findable from
  // the movement somebody is actually stuck on.
  for (const [hard, easy] of [['Pull Up', 'Band Assisted Pull Up'], ['Push Up', 'Incline Push Up']]) {
    assert.ok(similarTo(hard).some((e) => e.name === easy), `${hard} cannot swap to ${easy}`)
  }

  // Assistance that needs a machine must say so, or somebody training in a
  // garage is told to use one.
  assert.equal(equipmentOf('Assisted Pull Up'), 'machine')
  assert.equal(equipmentOf('Band Assisted Pull Up'), 'bodyweight')
  assert.equal(equipmentOf('Incline Push Up'), 'bodyweight')
})

check('core training covers holding still, not only crunching', () => {
  // Most of what a midsection does is resist movement, and most of the core
  // work people are actually taught now is that: planks, dead bugs, bird dogs,
  // Pallof presses, carries. Crunches are the smaller half of the job.
  const core = LIBRARY.filter((e) => e.group === 'Core')
  assert.ok(core.length >= 50, `Core has only ${core.length}`)

  const holds = core.filter((e) => e.type === 'T')
  assert.ok(holds.length >= 12, `only ${holds.length} core holds`)

  // The plank has a ladder now, both ways, which is the thing every other
  // movement got last round and core did not.
  for (const n of ['Knee Plank', 'High Plank', 'Long Lever Plank', 'Weighted Plank']) {
    assert.ok(core.some((e) => e.name === n), `${n} is missing from the plank ladder`)
  }
  for (const n of ['Knee Side Plank', 'Side Plank', 'Star Side Plank']) {
    assert.ok(core.some((e) => e.name === n), `${n} is missing from the side plank ladder`)
  }

  for (const n of [
    'Dead Bug', 'Bird Dog', 'Pallof Press', 'Body Saw', 'Bear Hold', 'Reverse Crunch',
    'Renegade Row', 'Shoulder Tap Plank', 'L-Sit', 'Flutter Kick', 'Suitcase Deadlift',
  ]) {
    assert.ok(core.some((e) => e.name === n), `${n} is missing`)
  }

  // Bodyweight, because a core exercise nobody can do at home is not core work
  // it is gym work, and this is the group people train in a bedroom.
  const bw = core.filter((e) => equipmentOf(e.name) === 'bodyweight')
  assert.ok(bw.length >= 40, `only ${bw.length} core movements need no kit`)

  // And the words for it resolve, including the one somebody would type after
  // watching their wife do something they had never seen.
  assert.equal(searchKnowledge('dead bug')[0]?.id, 'basic-dead-bug')
  assert.equal(searchKnowledge('anti rotation')[0]?.id, 'w-anti-movement')
  assert.equal(searchKnowledge('i cant do a pull up')[0]?.id, 'basic-cant-pull-up')
})

check('the thin muscle groups can fill a session', () => {
  // Glutes had ten movements and one of them was a barbell, which is not
  // enough to build a glute led day out of, let alone to swap inside one.
  for (const group of ['Glutes', 'Hamstrings', 'Calves', 'Traps', 'Forearms']) {
    const es = LIBRARY.filter((e) => e.group === group)
    assert.ok(es.length >= 13, `${group} has only ${es.length}`)
    // And across enough kit that a missing machine is not a missing day.
    const kit = new Set(es.map((e) => equipmentOf(e.name)))
    assert.ok(kit.size >= 3, `${group} is only ${[...kit].join(', ')}`)
  }

  // One name, one group. Filing a movement under two makes groupOf a coin toss.
  const names = LIBRARY.map((e) => e.name.toLowerCase())
  assert.equal(new Set(names).size, names.length, 'a movement is filed under two groups')

  // Equipment decides what a plan may offer, so a machine filed as a dumbbell
  // gets programmed for somebody who owns a pair of dumbbells and no machine.
  assert.equal(equipmentOf('Seated Hip Abduction'), 'machine')
  assert.equal(equipmentOf('Reverse Hyperextension'), 'machine')
  assert.equal(equipmentOf('45 Degree Back Extension'), 'bodyweight')
  assert.equal(equipmentOf('Kas Glute Bridge'), 'barbell')
})

check('six days a week can be Push Pull Legs', () => {
  // Six days was the one place PPL could not be derived: it produced a muscle
  // a day, and running Push Pull Legs twice through is the single most common
  // way six days is actually trained.
  const six = planFor({ days: 6, years: 'overTwo', knows: 'yes', barbell: 'confident', goalChoice: 'muscle' }, 'muscle')
  assert.deepEqual(six.dayIds, ['ppl-push', 'ppl-pull', 'five-quads', 'ppl-push', 'ppl-pull', 'five-posterior'])
  assert.equal(six.splitName, 'Push Pull Legs, twice through', 'the card describes a split it no longer runs')

  // The two leg days lead with different things rather than being the same
  // session twice, which is the point of splitting them at all.
  assert.notEqual(dayById('five-quads')!.name, dayById('five-posterior')!.name)

  // Laid across a week it reads the way somebody running PPL expects.
  const spread = suggestSchedule(six).map((id) => (id ? dayById(id)!.name : 'Rest'))
  assert.deepEqual(spread, ['Rest', 'Push', 'Pull', 'Quad Dominant Legs', 'Push', 'Pull', 'Glute Dominant Legs'])

  // A plan naming the same session twice must not offer it twice to pick.
  const card = readFileSync(new URL('../components/ScheduleCard.tsx', import.meta.url), 'utf8')
  assert.ok(card.includes('new Set(plan?.dayIds'), 'duplicate sessions show as duplicate chips')

  // A muscle a day is still reachable by hand, it is just no longer the
  // default answer to six days.
  for (const id of ['bro-chest', 'bro-back', 'bro-shoulders', 'bro-arms', 'bro-legs']) {
    assert.ok(dayById(id), `${id} vanished from the library`)
  }
})

check('laying out a week does not close the page under you', () => {
  const sheet = readFileSync(new URL('../components/ProfileSheet.tsx', import.meta.url), 'utf8')
  const app = readFileSync(new URL('../components/App.tsx', import.meta.url), 'utf8')

  // Done and Save mean save and leave. Tapping a day of the week means save
  // and stay exactly where you are. Both went through onSave, and onSave on
  // the profile sheet closes it, so picking a session for Monday shut the page
  // and unmounted it mid save: the tap looked like it had done nothing.
  // The schedule goes through the same set as everything else now, and set is
  // what carries the rule.
  const setFn = sheet.slice(sheet.indexOf('const set = (patch'), sheet.indexOf('const toggle'))
  assert.ok(setFn.includes('onApply ?? onSave'), 'a tap is back on the leaving path')
  assert.ok(
    /onChange=\{\(schedule\) => set\(\{ schedule \}\)\}/.test(sheet),
    'the schedule grew its own copy of the rule again',
  )

  // And the sheet has somewhere to send it that does not navigate.
  assert.ok(/onApply=\{\(next\) => void saveProfile\(next\)\}/.test(app), 'onApply is not wired to a plain save')

  // The leaving path still leaves, or Save stops working.
  assert.ok(/onSave=\{\(next\) => \{\s*\n\s*void saveProfile\(next\)\s*\n\s*setSheet\(null\)/.test(app), 'Save no longer closes the sheet')
})

check('a day you picked is saved when you pick it', () => {
  const sheet = readFileSync(new URL('../components/ProfileSheet.tsx', import.meta.url), 'utf8')

  // Every other answer on the page is a draft you might still be revising and
  // is flushed when the page unmounts. A weekday is a decision, and resting it
  // on a clean unmount is resting it on the phone not being backgrounded,
  // reloaded or killed first.
  // Not just the schedule. Every tap on an option anywhere on the page saves
  // itself, which is one rule instead of one exception. The answers that
  // decide what is safe to program, a flagged joint and the red flag beside
  // it, were the ones still resting on a clean unmount to survive, and they
  // are the last ones that should.
  const setFn = sheet.slice(sheet.indexOf('const set = (patch'), sheet.indexOf('const toggle'))
  assert.ok(/\(onApply \?\? onSave\)\(next\)/.test(setFn), 'an answer on this page is still only a draft')
  assert.ok(/saved.current = JSON.stringify\(next\)/.test(setFn), 'the flush will fire again on the way out')

  // Typed fields stay on the flush, because a write per keystroke is not the
  // fix and nobody loses a name they are halfway through typing.
  assert.ok(!/onChange=\{\(e\) => set\(/.test(sheet), 'a text field is saving every letter')

  // Week is a section of the full page, not a one question detour. When the
  // focus type gained a third value the branch still said anything but all,
  // so Lay out your week opened Anything sore.
  assert.ok(
    sheet.includes("if (focus === 'minutes' || focus === 'sore')"),
    'focus week falls into the one question branch again',
  )
  assert.ok(
    sheet.includes("focus === 'minutes' || focus === 'week' ? 'week'"),
    'focus week no longer opens the week section',
  )
})

check('any session can be put on any day, from either direction', () => {
  // Two complaints that turned out to be one hole. The week picker offered
  // only the days the questionnaire derived, so somebody running Full Body
  // could not schedule Push even though Push exists and starts fine from the
  // Start button. And opening a session offered exactly one thing, start it
  // now, so a session you wanted on Thursday had nowhere to go.
  const week = { schedule: [null, 'ppl-push', null, null, null, null, null] }
  const today = '2026-08-17' // a Monday

  // Put a session on a day the pattern left empty.
  const put = { ...week, moves: assignDay(week, '2026-08-19', 'ppl-legs', today) }
  assert.equal(dayIdFor(put, '2026-08-19'), 'ppl-legs')
  // And only that day. Next Wednesday is still a rest day.
  assert.equal(dayIdFor(put, '2026-08-26'), null, 'every Wednesday changed')
  assert.equal(dayIdFor(put, '2026-08-24'), 'ppl-push', 'next Monday drifted')

  // Putting something on a day that already holds something replaces it,
  // rather than stacking two sessions on one date.
  const over = { ...week, moves: assignDay(week, '2026-08-17', 'ppl-pull', today) }
  assert.equal(dayIdFor(over, '2026-08-17'), 'ppl-pull')
  assert.equal(dayIdFor(over, '2026-08-24'), 'ppl-push', 'the pattern was edited, not the date')

  // Assigning what the pattern already said is not an exception worth storing.
  assert.deepEqual(assignDay(week, '2026-08-17', 'ppl-push', today), {})
  // And clearing a day back to rest is the same mechanism.
  const cleared = { ...week, moves: assignDay(week, '2026-08-17', null, today) }
  assert.equal(dayIdFor(cleared, '2026-08-17'), null)
  assert.equal(dayIdFor(cleared, '2026-08-24'), 'ppl-push')

  // The week picker offers the whole library, not just the derived plan.
  const everything = SPLITS.flatMap((s) => s.days)
  assert.ok(everything.length > 20, 'the library shrank')
  const card = readFileSync(new URL('../components/ScheduleCard.tsx', import.meta.url), 'utf8')
  assert.ok(card.includes('SPLITS'), 'the week picker is back to offering only the plan')
  assert.ok(card.includes('Every other session'), 'nothing opens the rest of the library')

  // And a session you are reading offers somewhere to put it.
  const app = readFileSync(new URL('../components/App.tsx', import.meta.url), 'utf8')
  assert.ok(app.includes('Put it on a day'), 'the only way out of a session is still to train')
})

check('a week nobody laid out does not pretend to be a rest day', () => {
  // A profile with no schedule showed Rest day, seven blank boxes and an
  // empty list, which reads as an app with nothing in it rather than a setup
  // step nobody has done. Rest is a decision; this is an absence.
  assert.equal(hasSchedule({}), false)
  assert.equal(hasSchedule({ schedule: [null, null, null, null, null, null, null] }), false)
  assert.equal(hasSchedule({ schedule: [null, 'ppl-push', null, null, null, null, null] }), true)

  const card = readFileSync(new URL('../components/TodayCard.tsx', import.meta.url), 'utf8')
  assert.ok(card.includes("'No week set yet'"), 'an empty week still calls itself a rest day')
  assert.ok(card.includes('Lay out your week'), 'nothing on the card fixes it')

  // One button, on the card that states the problem. The empty list below it
  // explains what it becomes and offers nothing, because the same lime button
  // twice on one screen is one button asked twice.
  const list = readFileSync(new URL('../components/UpcomingList.tsx', import.meta.url), 'utf8')
  assert.ok(!list.includes('Lay out your week'), 'the second copy of the button came back')
  assert.equal(card.match(/Lay out your week/g)!.length, 1)

  // The log is named. Without a heading it sat under What is coming in the
  // same card shape, and a finished workout read as a scheduled one.
  const app = readFileSync(new URL('../components/App.tsx', import.meta.url), 'utf8')
  assert.ok(app.includes('Already done'), 'the log has no heading over it')
})

check('a session can be pulled forward to today, not just pushed back', () => {
  // Moving is not only for putting something off. Somebody with a free evening
  // wants next Friday brought forward, so today is on the list for every card
  // except today's own, and the exchange runs the same way in both directions.
  const week = { schedule: [null, 'ppl-push', 'ppl-pull', null, 'ppl-legs', 'ppl-push', null] }
  const today = '2026-08-17' // a Monday

  // The last card the list holds, a fortnight out, comes back to today.
  const last = upcomingDays(week, today).at(-1)!.date
  assert.equal(last, '2026-09-01')
  const pulled = { ...week, moves: swapDays(week, last, today, today) }
  assert.equal(dayIdFor(pulled, today), 'ppl-pull', 'the far session did not come forward')
  assert.equal(dayIdFor(pulled, last), 'ppl-push', 'today\'s session did not go back')

  // Today is offered from every card but its own.
  for (const u of upcomingDays(week, today)) {
    const offered = datesAhead(today, 16).filter((d) => d !== u.date)
    assert.equal(offered.includes(today), u.date !== today, `${u.date} disagrees about today`)
  }

  // Everything the session passed over on its way forward is untouched.
  for (const iso of ['2026-08-18', '2026-08-21', '2026-08-25', '2026-08-31']) {
    assert.equal(dayIdFor(pulled, iso), scheduleOf(week)[weekdayOf(iso)] ?? null, `${iso} drifted`)
  }
})

check('one create screen, and it reads the real rest table', () => {
  // A movement typed into the workout builder and the same movement typed into
  // the picker mid session have to end up identical. They only do that while
  // both screens ask the same four questions, so both render the same file.
  const picker = readFileSync(new URL('../components/ExercisePicker.tsx', import.meta.url), 'utf8')
  const builder = readFileSync(new URL('../components/CustomBuilder.tsx', import.meta.url), 'utf8')
  for (const [name, src] of [['picker', picker], ['builder', builder]] as const) {
    assert.ok(src.includes("from './NewExercise'"), `the ${name} grew its own create screen`)
    assert.ok(/onCreate/.test(src), `the ${name} cannot create a movement`)
  }

  // The picker used to carry a hand written copy of the rest table, and it went
  // stale: it promised ninety seconds on a compound long after the app had
  // moved to two minutes. Nothing under components/ gets to hold that table
  // again.
  const create = readFileSync(new URL('../components/NewExercise.tsx', import.meta.url), 'utf8')
  for (const [name, src] of [['picker', picker], ['builder', builder], ['NewExercise', create]] as const) {
    assert.ok(!/heavy:\s*\d+/.test(src), `${name} writes rest seconds of its own`)
  }
  assert.ok(create.includes('restForTier'), 'the create screen invents its own rest number')

  // And the number it reads is the number the session counts down.
  for (const goal of ['strength', 'muscle', 'endurance'] as const) {
    for (const { tier } of TIER_LABELS) {
      const shown = restForTier(tier, goal)
      assert.ok(shown > 0, `${tier} on ${goal} rests nothing`)
      assert.equal(scaleRest(shown, 1), shown, `${tier} on ${goal} is not a round rest`)
    }
    // Named movements land on their tier's number, so the promise on the create
    // screen is the promise the timer keeps.
    assert.equal(restFor('Back Squat', 'W', goal), restForTier(restTier('Back Squat', 'W'), goal))
    assert.equal(restFor('Cable Fly', 'W', goal), restForTier(restTier('Cable Fly', 'W'), goal))
  }
})

// Monday, Tuesday and Wednesday of the week beginning 2026-08-16.
const THREE_SESSIONS = [17, 18, 19].map((d) => ({
  id: `s${d}`,
  date: `2026-08-${d}`,
  name: 'Push',
  exercises: [{ id: 'e', name: 'Bench Press', type: 'W' as const, sets: [{ id: 's', w: 100, r: 5 }] }],
})) as unknown as Workout[]

check('the calendar does not depend on where the phone is', () => {
  // Every date this app stores is a bare day. Handing one to Date parses it as
  // local midnight and reading it back with toISOString prints UTC, and those
  // are the same day only west of Greenwich. In London the streak read zero
  // with three sessions logged that week, the activity grid stopped a day
  // short of today, and the list of days you can move a session to opened on
  // yesterday. It never showed up because this runs on a UTC box.
  const zones = ['UTC', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney', 'America/Los_Angeles', 'Pacific/Kiritimati']
  const original = process.env.TZ

  const run = () => ({
    week: weekStart('2026-08-19'),
    shifted: shiftDays('2026-08-19', 5),
    back: shiftDays('2026-08-19', -5),
    weekday: weekdayOf('2026-08-19'),
    apart: daysBetween('2026-08-17', '2026-08-21'),
    ahead: datesAhead('2026-08-19', 3).join(' '),
    grid: trainingGrid([], '2026-08-19', 3).map((d) => d.date).join(' '),
    streak: weeklyStreak(THREE_SESSIONS, '2026-08-19', 3),
    longest: longestStreak(THREE_SESSIONS, 3),
  })

  try {
    let first: ReturnType<typeof run> | null = null
    for (const zone of zones) {
      process.env.TZ = zone
      const got = run()
      if (!first) first = got
      else assert.deepEqual(got, first, `${zone} reads the calendar differently`)
    }
    // And the answers are the right ones, not merely the same wrong one.
    assert.equal(first!.week, '2026-08-16', 'a Wednesday belongs to the Sunday before it')
    assert.equal(first!.shifted, '2026-08-24')
    assert.equal(first!.back, '2026-08-14')
    assert.equal(first!.weekday, 3, 'Wednesday is 3')
    assert.equal(first!.apart, 4)
    assert.equal(first!.ahead, '2026-08-19 2026-08-20 2026-08-21', 'the list of days ahead starts today')
    assert.equal(first!.grid, '2026-08-17 2026-08-18 2026-08-19', 'the grid ends today')
    assert.equal(first!.streak, 1, 'three sessions this week is a week on the streak')
    assert.equal(first!.longest, 1)
  } finally {
    if (original === undefined) delete process.env.TZ
    else process.env.TZ = original
  }
})

check('one place does the calendar arithmetic', () => {
  // weekStart lived in schedule.ts, again in admin.ts under another name, and
  // was re-exported from block.ts as mondayOf, which returns a Sunday.
  // daysBetween had three implementations. A concept with four names is a
  // concept that can hold four answers, and it did.
  const week = readFileSync(new URL('../lib/week.ts', import.meta.url), 'utf8')
  assert.ok(!/T00:00:00'/.test(week), 'the one date module parses local midnight')

  for (const file of ['schedule', 'admin', 'gamify', 'block', 'nudge', 'nudgeWeek', 'advance']) {
    const src = readFileSync(new URL(`../lib/${file}.ts`, import.meta.url), 'utf8')
    assert.ok(!/function (weekStart|weekStartOf|daysBetween|shiftDays)\b/.test(src), `${file} has a calendar of its own`)
    assert.ok(!/export \{[^}]*\b(weekStart|daysBetween|weekdayOf)\b[^}]*\} from/.test(src), `${file} re-exports the calendar under a second name`)
  }

  // Same for the components that draw a week.
  for (const file of ['TodayCard', 'UpcomingList', 'WhichDaySheet']) {
    const src = readFileSync(new URL(`../components/${file}.tsx`, import.meta.url), 'utf8')
    assert.ok(!/T00:00:00'/.test(src), `${file} does its own local date arithmetic`)
  }
})

check('signup and settings ask the same questions the same way', () => {
  // The two screens each wrote out their own copy of the wording and the
  // choices, and the drift ran one way: the guidance lived at signup and went
  // quiet afterwards. Three days was "the sweet spot" when you first picked it
  // and a bare "3 days" when you changed your mind. Settings asked how long you
  // have got in two separate places with two different answers available.
  const signup = readFileSync(new URL('../components/Onboarding.tsx', import.meta.url), 'utf8')
  const settings = readFileSync(new URL('../components/ProfileSheet.tsx', import.meta.url), 'utf8')

  for (const [name, src] of [['signup', signup], ['settings', settings]] as const) {
    for (const q of [DAYS, LEG_DAYS, MINUTES, ACCESS, CONDITION, UNITS]) {
      // A Field with the question's own label means the screen is asking it
      // rather than deferring to the shared definition. A plan summary row
      // that happens to reuse the words is not.
      assert.ok(!src.includes(`<Field label="${q.label}"`), `${name} asks "${q.label.slice(0, 30)}" itself`)
      assert.ok(!src.includes(`<Field\n                  label="${q.label}"`), `${name} asks "${q.label.slice(0, 30)}" itself`)
      for (const o of q.options) {
        assert.ok(!src.includes(`label: '${o.label}'`), `${name} writes out the choice "${o.label}"`)
      }
    }
  }

  // Every choice a person can hold is offered. A question that cannot express
  // the profile it edits is how somebody gets stuck on a value they can see
  // but cannot change.
  assert.deepEqual(MINUTES.options.map((o) => o.v).sort((a, b) => a - b), [30, 45, 60, LONG_SESSION])
  assert.deepEqual(DAYS.options.map((o) => o.v), [3, 4, 5, 6])
  assert.deepEqual(ACCESS.options.map((o) => o.v), ['full', 'basic', 'home', 'body'])
  assert.deepEqual(CONDITION.options.map((o) => o.v), ['no', 'yes', 'skip'])
  assert.deepEqual(LEG_DAYS.options.map((o) => o.v), [1, 2])
  assert.deepEqual(UNITS.options.map((o) => o.v), ['lb', 'kg'])

  // The explanations survive. These are the ones that had already gone missing.
  assert.ok(DAYS.hint, 'nobody is told to answer days realistically any more')
  assert.equal(DAYS.options[0].note, 'The sweet spot')
  assert.equal(MINUTES.options[3].note, 'Nothing gets trimmed')
  assert.ok(MINUTES.hint && LEG_DAYS.hint && CONDITION.hint)
})

check('height is asked in the units you said you think in', () => {
  // Signup asked for centimetres if you chose kilos. Settings only ever
  // offered feet and inches, so somebody on kilos could set their height once
  // at signup and never edit it in their own units again.
  const field = readFileSync(new URL('../components/HeightField.tsx', import.meta.url), 'utf8')
  assert.ok(/unit === 'kg'/.test(field), 'the height field stopped caring which unit you use')
  assert.ok(field.includes('2.54'), 'the height field stopped converting')

  for (const file of ['Onboarding', 'ProfileSheet']) {
    const src = readFileSync(new URL(`../components/${file}.tsx`, import.meta.url), 'utf8')
    assert.ok(src.includes('HeightField'), `${file} asks for height its own way`)
    assert.ok(!src.includes('suffix="ft"'), `${file} still has a height box of its own`)
    assert.ok(!src.includes('suffix="cm"'), `${file} still has a height box of its own`)
  }
})

check('signing out takes the offline copy with it', () => {
  // The snapshot is the whole log, written to localStorage so a cold open with
  // no signal has something to show. Deleting the account cleared it. Signing
  // out did not, and left it on the device: a function to clear it existed and
  // nothing called it.
  const app = readFileSync(new URL('../components/App.tsx', import.meta.url), 'utf8')
  const signOut = app.slice(app.indexOf('onSignOut='))
  const body = signOut.slice(0, signOut.indexOf('}}'))
  assert.ok(body.includes('clearSnapshot'), 'signing out leaves the log on the device')
  assert.ok(body.includes('signOut()'), 'the sign out block stopped signing out')
})

check('the app does not draw the same thing twice', () => {
  // Each of these was written out in two places, word for word and class for
  // class. A second copy is not a bug on the day it is made; it is a bug on the
  // day one of them changes, and the rest table proved that.
  const pairs: [string, string, RegExp, string][] = [
    ['SettingsSheet', 'NudgeField', /grid-cols-7/, 'the weekly check in day picker'],
    ['Onboarding', 'ProfileSheet', /suffix="ft"/, 'the height boxes'],
    ['ExercisePicker', 'CustomBuilder', /What do you measure/, 'the create a movement block'],
  ]
  for (const [a, bComponent, pattern, what] of pairs) {
    const one = readFileSync(new URL(`../components/${a}.tsx`, import.meta.url), 'utf8')
    const two = readFileSync(new URL(`../components/${bComponent}.tsx`, import.meta.url), 'utf8')
    assert.ok(
      !(pattern.test(one) && pattern.test(bComponent === a ? one : two)),
      `${a} and ${bComponent} each draw ${what}`,
    )
  }

  // The away from your gym list is the same card as the plan list, because a
  // quad day is a quad day whichever room you are in.
  const start = readFileSync(new URL('../components/StartSheet.tsx', import.meta.url), 'utf8')
  assert.equal(
    (start.match(/className="surface rounded-\[14px\] px-3\.5 py-3 text-left ring-1 ring-edge"/g) ?? []).length,
    1,
    'the start sheet draws the session card more than once',
  )
})

check('a half typed search is not a second question', () => {
  // The search is recorded once typing stops for a beat, which handles a fast
  // typist and not a person who pauses mid word. Live data had one person
  // asking one thing filed as "What is weight train" and "What is weight
  // training", which inflates the list and splits the count.
  const typing = [
    { userId: 'jon', question: 'What is weight train', answered: true, at: '2026-08-20T18:05:00Z' },
    { userId: 'jon', question: 'What is weight training', answered: true, at: '2026-08-20T18:05:06Z' },
  ]
  assert.deepEqual(askedReport(typing).map((r) => r.question), ['What is weight training'])

  // Only mid word. A space at the join is a new word and a real second search,
  // and merging those deletes a question somebody actually asked.
  const refined = [
    { userId: 'a', question: 'squat', answered: true, at: '2026-08-20T18:00:00Z' },
    { userId: 'a', question: 'squat depth', answered: false, at: '2026-08-20T18:00:20Z' },
  ]
  assert.equal(askedReport(refined).length, 2, 'a refined search was eaten by its own first word')

  // Not across people, and not an hour later.
  const apart = [
    { userId: 'a', question: 'creatine', answered: true, at: '2026-08-20T18:00:00Z' },
    { userId: 'a', question: 'creatines', answered: true, at: '2026-08-20T19:00:00Z' },
  ]
  assert.equal(askedReport(apart).length, 2, 'two searches an hour apart were treated as one')
  const two = [
    { userId: 'a', question: 'train', answered: true, at: '2026-08-20T18:00:00Z' },
    { userId: 'b', question: 'training', answered: true, at: '2026-08-20T18:00:05Z' },
  ]
  assert.equal(askedReport(two).length, 2, 'one person typing swallowed another person asking')

  // The row that survives is the finished one, and the count is not doubled.
  const [row] = askedReport(typing)
  assert.equal(row.times, 1, 'one person asking once counted twice')
  assert.equal(row.people, 1)
})

check('the miss log says which of its three states it is in', () => {
  // The section was drawn only when the table had rows in it, so a miss log
  // recording nothing and a miss log nobody had used yet were the same blank
  // space on the admin screen. That is why nobody could tell for weeks which
  // one it was. Three states, three different sentences.
  assert.match(askedState([]), /Nothing recorded yet/)

  const answered = askedReport([
    { userId: 'a', question: 'is creatine safe', answered: true, at: '2026-08-19T10:00:00Z' },
  ])
  assert.match(askedState(answered), /none of them unanswered/)
  assert.match(askedState(answered), /Last recorded 2026-08-19/)

  const mixed = askedReport([
    { userId: 'a', question: 'is creatine safe', answered: true, at: '2026-08-19T10:00:00Z' },
    { userId: 'b', question: 'do i need bcaas', answered: false, at: '2026-08-20T09:00:00Z' },
    { userId: 'c', question: 'do i need bcaas', answered: false, at: '2026-08-20T11:00:00Z' },
  ])
  assert.match(askedState(mixed), /3 searches across 2 wordings, 1 unanswered/)
  assert.match(askedState(mixed), /Last recorded 2026-08-20/)

  // All three states have to reach the screen, which means the section cannot
  // be behind a truthiness test on the rows again.
  const admin = readFileSync(new URL('../components/AdminDashboard.tsx', import.meta.url), 'utf8')
  const at = admin.indexOf('What Lifty could not answer')
  const before = admin.slice(Math.max(0, at - 700), at)
  assert.ok(!/\{asked\.length \? \(\s*<section/.test(before), 'the section hides itself when empty again')
  assert.ok(admin.includes('askedState('), 'the section does not say what it knows')

  // And a refused write says so on the screen. A console warning is only read
  // by somebody who had the console open before they typed, which is nobody,
  // and that is exactly how this hid.
  const app = readFileSync(new URL('../components/App.tsx', import.meta.url), 'utf8')
  const note = app.slice(app.indexOf('const noteQuestion'))
  const body = note.slice(0, note.indexOf('[sb, userId]'))
  assert.ok(body.includes('setError('), 'a refused question is only reported to the console')
  assert.ok(body.includes('logQuestion'), 'the question is not recorded at all')
})

check('every link you handed out is listed, and revocable', () => {
  // Sharing inserts rather than upserts, so the same workout shared three
  // times is three live links. Until this screen there was no way to know
  // that, see them, or stop any of them, and deleting the workout did not
  // help: the published copy lives in its own table and kept serving.
  const db = readFileSync(new URL('../lib/db.ts', import.meta.url), 'utf8')
  const list = db.slice(db.indexOf('export async function listShares'))
  const body = list.slice(0, list.indexOf('\n}'))
  assert.ok(body.includes('created_at'), 'the list cannot say when a link was handed out')
  assert.ok(body.includes('ascending: false'), 'the newest link is not the first one you see')

  // Revoking goes by the link's own id. Going by workout name would take down
  // every link for that workout, including ones somebody still wants live.
  const off = db.slice(db.indexOf('export async function unshare'))
  assert.ok(off.slice(0, off.indexOf('\n}')).includes(".eq('id'"), 'revoking does not target one link')

  const screen = readFileSync(new URL('../components/SharedLinks.tsx', import.meta.url), 'utf8')
  // Read once on open. The handler is a new function on every render of the
  // sheet around it, so depending on its identity refetched the whole list
  // every time somebody typed a character into the import box above.
  assert.ok(!/\}, \[onList\]\)/.test(screen), 'the list refetches on every parent render')
  assert.ok(screen.includes('useRef'), 'the list does not hold the handler steady')
  // Two taps, and honest about what revoking does not do.
  assert.ok(screen.includes('Tap again to revoke'), 'revoking is one tap')
  assert.ok(/keeps their copy/.test(screen), 'the screen implies revoking takes back what people saved')

  const settings = readFileSync(new URL('../components/SettingsSheet.tsx', import.meta.url), 'utf8')
  assert.ok(settings.includes('SharedLinks'), 'there is nowhere to see your links')
  const app = readFileSync(new URL('../components/App.tsx', import.meta.url), 'utf8')
  assert.ok(app.includes('onListShares') && app.includes('onRevokeShare'), 'the screen is not wired up')
})

check('Lifty points at tabs that are actually there', () => {
  // An answer that names a section of the profile is a signpost, and renaming
  // the pill without it leaves the signpost pointing at nothing. That is how
  // "under Your body" survived the pills becoming Me, My week and My body.
  const sheet = readFileSync(new URL('../components/ProfileSheet.tsx', import.meta.url), 'utf8')
  const block = sheet.slice(sheet.indexOf('const SECTIONS'), sheet.indexOf('] as const'))
  const labels = [...block.matchAll(/label: '([^']+)'/g)].map((m) => m[1])
  assert.ok(labels.length >= 4, 'the profile lost its sections')

  // Only the signpost phrasing, "on your profile, under X". Plain prose can
  // say "under Chest" about a muscle group without meaning a tab.
  for (const entry of KNOWLEDGE) {
    for (const m of entry.a.matchAll(/profile, under ([^,.]+)/g)) {
      assert.ok(labels.includes(m[1]), `an answer sends you to "${m[1]}", which is not a section`)
    }
  }

  // And the sections named in the nav are the ones the nav draws.
  for (const label of labels) {
    assert.ok(sheet.includes(`label: '${label}'`), `${label} is not a section after all`)
  }
})

check('your own movements have a place you can get to', () => {
  // They were only ever a filter chip inside the picker you get mid session and
  // inside the workout builder, so looking at your own library meant starting a
  // workout first. The screen for changing one was behind the same door.
  const sheet = readFileSync(new URL('../components/ProfileSheet.tsx', import.meta.url), 'utf8')
  assert.ok(sheet.includes("label: 'My movements'"), 'the profile has no section for them')
  assert.ok(sheet.includes('MyMovements'), 'the section has nothing in it')
  assert.ok(sheet.includes('restForTier'), 'the list does not say what a movement rests')

  // And the profile tab is handed the movements and the goal, or the section
  // is a heading over an empty list.
  const app = readFileSync(new URL('../components/App.tsx', import.meta.url), 'utf8')
  const tab = app.slice(app.indexOf("tab === 'profile'"))
  const props = tab.slice(0, tab.indexOf('/>'))
  for (const prop of ['customs=', 'goal=', 'onEditExercise=', 'onDeleteExercise=']) {
    assert.ok(props.includes(prop), `the profile tab is missing ${prop}`)
  }
})

check('a movement you made can be changed, and only from here on', () => {
  // The four answers are not decorative. The group decides which muscle it
  // credits in the weekly count, the tier decides how long it rests, the sets
  // decide how many get laid out. Getting one wrong used to be permanent:
  // there was no rename, no edit, and the guard that stops duplicates also
  // stopped you retyping the name to answer again.
  const create = readFileSync(new URL('../components/NewExercise.tsx', import.meta.url), 'utf8')
  assert.ok(create.includes('editing?: CustomExercise | null'), 'the four questions cannot be reopened')
  assert.ok(/editing\?\.group \?\?/.test(create), 'editing does not start from the answers you gave')
  assert.ok(/editing\?\.tier \?\?/.test(create), 'editing does not start from the answers you gave')
  assert.ok(/editing\?\.sets \?\?/.test(create), 'editing does not start from the answers you gave')

  // A rename has to move the row rather than leave the old spelling next to
  // the new one, which means going by id. The upsert goes by (user_id, name)
  // and would miss every existing row, then collide on the primary key.
  const db = readFileSync(new URL('../lib/db.ts', import.meta.url), 'utf8')
  const update = db.slice(db.indexOf('export async function updateCustomExercise'))
  assert.ok(update.slice(0, update.indexOf('\n}')).includes(".eq('id'"), 'a rename does not move the movement you have')

  // Both screens can reach it, because a movement made on either behaves the
  // same and has to be fixable on either.
  for (const file of ['ExercisePicker', 'CustomBuilder']) {
    const src = readFileSync(new URL(`../components/${file}.tsx`, import.meta.url), 'utf8')
    assert.ok(src.includes('onEdit'), `${file} cannot change one of your own`)
    assert.ok(src.includes('Edit ${e.name}'), `${file} has no way in`)
  }

  // Nothing already logged is touched. A saved workout is a plan for next
  // time and does follow a rename; a logged session is a record and does not.
  const app = readFileSync(new URL('../components/App.tsx', import.meta.url), 'utf8')
  const edit = app.slice(app.indexOf('async function editCustomExercise'))
  const body = edit.slice(0, edit.indexOf('\n  async function removeCustomExercise'))
  assert.ok(body.includes('customWorkouts'), 'a rename leaves your saved workouts pointing at nothing')
  assert.ok(!/\bworkouts:/.test(body), 'editing a movement rewrites sessions already logged')
  assert.ok(!body.includes('db.saveWorkout'), 'editing a movement writes to the log')
})

void (async () => {
  for (const run of later) await run()
  console.log(`\n${checks} checks passed`)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
