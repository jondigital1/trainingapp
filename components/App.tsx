'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as db from '@/lib/db'
import { fmtDate, fmtSets, today, uid, workoutVolume } from '@/lib/format'
import { supabaseBrowser } from '@/lib/supabase/client'
import { forgetNudge } from '@/lib/push'
import CustomBuilder from './CustomBuilder'
import Onboarding from './Onboarding'
import BottomNav, { type Tab } from './BottomNav'
import LiftyMark from './LiftyMark'
import HelpSheet from './HelpSheet'
import HelloSheet from './HelloSheet'
import ProfileSheet from './ProfileSheet'
import RecordsTab from './RecordsTab'
import BlockCard from './BlockCard'
import TodayCard from './TodayCard'
import UpcomingList from './UpcomingList'
import WhichDaySheet from './WhichDaySheet'
import IntensitySheet from './IntensitySheet'
import DoneSheet from './DoneSheet'
import Sheet from './Sheet'
import { estimateSeconds, fmtEstimate } from '@/lib/estimate'
import ExerciseSheet from './ExerciseSheet'
import RestBar, { useRest } from './RestTimer'
import ExercisePicker from './ExercisePicker'
import SettingsSheet from './SettingsSheet'
import StartSheet from './StartSheet'
import WorkoutEditor from './WorkoutEditor'
import type { LastSession } from './ExerciseBlock'
import { buildDay, dayById, GOAL_FROM_CHOICE, goalLabel, goalsOf, MIN_DAYS, needsCheckin, planFor, primaryGoal, promoteGoal, unitOf, type Profile } from '@/lib/onboarding'
import type { OnboardingResult } from './Onboarding'
import { isEmptySet } from '@/lib/format'
import { bestsFor as computeBests, trainingGrid } from '@/lib/gamify'
import { blockNumber, blockWeek, effortFactor } from '@/lib/block'
import { customFor, registerCustoms } from '@/lib/custom'
import { isLighter, prescribedSets } from '@/lib/prescribe'
import { looksOffline, readSnapshot, saveSnapshot } from '@/lib/offline'
import { sharePlainLink } from '@/lib/share'
import { durationOf, wantsScore } from '@/lib/session'
import { summarise } from '@/lib/summary'
import { forToday, greetedOn, recordHello } from '@/lib/hello'
import { assignDay, dayIdFor, hasSchedule, scheduledDays, suggestSchedule, swapDays, todaysDayId } from '@/lib/schedule'
import { advanceCopy, advanceFor, graduationCopy, graduationFor } from '@/lib/advance'
import { hardestFirst, topLoads } from '@/lib/order'
import {
  EMPTY_DATA,
  type CustomExercise,
  type CustomWorkout,
  type CustomWorkoutItem,
  type Goal,
  type SetType,
  type TrainingData,
  type Workout,
} from '@/lib/types'

type SheetName = 'start' | 'picker' | 'builder' | 'settings' | 'profile' | 'help' | 'score' | 'done' | null

// Supabase throws plain objects as often as Error instances, and an unreadable
// failure would misclassify a dead connection as a real rejection.
function errText(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return String(e)
}

// Unsaved work mirrored to this device, replayed on the next open. Keyed per
// user and per tab, so two open tabs cannot clobber each other's queue and one
// account's unsaved work never touches another's.
const MIRROR_PREFIX = 'training-log-unsaved-v1:'

interface MirrorShape {
  workouts?: Workout[]
  deletes?: string[]
}

function tabId(): string {
  try {
    let id = sessionStorage.getItem('training-log-tab')
    if (!id) {
      id = Math.random().toString(36).slice(2)
      sessionStorage.setItem('training-log-tab', id)
    }
    return id
  } catch {
    return 'tab'
  }
}

// A mirror entry that does not look like a workout is dropped rather than
// replayed: a malformed entry merged into state would crash every load after.
function validWorkout(w: unknown): w is Workout {
  const x = w as Workout
  return (
    !!x &&
    typeof x.id === 'string' &&
    typeof x.date === 'string' &&
    typeof x.title === 'string' &&
    Array.isArray(x.exercises) &&
    x.exercises.every((e) => e && typeof e.name === 'string' && Array.isArray(e.sets))
  )
}

export default function App({
  userId,
  email,
  admin,
}: {
  userId: string
  email: string
  // Worked out on the server, because whether somebody is an admin is not a
  // thing the browser gets to have an opinion about.
  admin?: boolean
}) {
  const sb = useMemo(() => supabaseBrowser(), [])
  const [data, setData] = useState<TrainingData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // A load that failed outright, as opposed to an error during a save. The
  // render below refuses to guess between new account and broken fetch.
  const [loadFailed, setLoadFailed] = useState(false)
  const [tab, setTab] = useState<Tab>('calendar')
  const [sheet, setSheet] = useState<SheetName>(null)
  // Open while the greeting is being answered, holding the session it stopped.
  const [greeting, setGreeting] = useState(false)
  // The session being put on a day, by template day id.
  const [assigning, setAssigning] = useState<string | null>(null)
  // The date whose session is being moved, while the day picker is open.
  const [moving, setMoving] = useState<string | null>(null)

  // What somebody asked Lifty. Fire and forget, in that a failure here must
  // never reach the person searching: telemetry deciding what to write next
  // has no business breaking the search box it sits behind.
  //
  // Quiet to the user is not the same as quiet to us, though, and the first
  // version swallowed the error whole. That made a feature whose only failure
  // mode is a row that never arrives completely undiagnosable, which is the
  // same trap the notification switch was in a fortnight ago. It says what
  // went wrong in the console now, where somebody looking for it can find it.
  const noteQuestion = useCallback(
    (question: string, answered: boolean) => {
      // Silently doing nothing is how the swallowed error hid, and a bare
      // early return is the same thing wearing a different hat.
      if (!userId) {
        console.warn('Could not record the question: signed out')
        return
      }
      void db.logQuestion(sb, userId, question, answered).catch((e: unknown) => {
        console.warn('Could not record the question:', e)
      })
    },
    [sb, userId],
  )
  const [pickerTarget, setPickerTarget] = useState<string | null>(null)
  // The exercise being swapped out, when the picker was opened to substitute
  // rather than to add.
  const [swapping, setSwapping] = useState<{ id: string; name: string } | null>(null)
  // The movement whose own screen is open, by name.
  const [openExercise, setOpenExercise] = useState<string | null>(null)
  // A day opened from the week strip for reading, by template day id.
  const [peekDay, setPeekDay] = useState<string | null>(null)
  // When the last load failed and this is the copy from the device, the time
  // that copy was taken. Null when the data is live.
  const [offline, setOffline] = useState<string | null>(null)
  const [openHistory, setOpenHistory] = useState<string | null>(null)
  const [profileFocus, setProfileFocus] = useState<'minutes' | 'sore' | 'week' | 'all'>('all')
  const [rerun, setRerun] = useState(false)
  const [scoring, setScoring] = useState<string | null>(null)
  const [editingWorkout, setEditingWorkout] = useState<string | null>(null)
  const [seedWorkout, setSeedWorkout] = useState<{ name: string; items: CustomWorkoutItem[] } | null>(null)
  const [pendingStart, setPendingStart] = useState<{
    title: string
    items: CustomWorkoutItem[]
    sort: boolean
    dayId?: string
  } | null>(null)
  const rest = useRest()

  const pending = useRef(new Map<string, Workout>())
  const deletes = useRef(new Set<string>())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryDelay = useRef(0)
  const flushing = useRef(false)
  // Sessions this visit generated from the plan. Only those get order advice:
  // a day the user wrote or picked deliberately is their business.
  const generated = useRef(new Set<string>())
  const latest = useRef<TrainingData>(data)
  latest.current = data
  const mirrorKey = useRef(`${MIRROR_PREFIX}${userId}:${tabId()}`)
  // True only if onboarding was already done when the app opened, so the tier 2
  // prompts wait for a later visit rather than stacking on the first one.
  const returning = useRef(false)

  // Everything not yet in Postgres is mirrored to this device, so a tab that
  // dies offline replays its unsaved work on the next open.
  const syncMirror = useCallback(() => {
    try {
      if (pending.current.size === 0 && deletes.current.size === 0) {
        localStorage.removeItem(mirrorKey.current)
      } else {
        localStorage.setItem(
          mirrorKey.current,
          JSON.stringify({
            workouts: [...pending.current.values()],
            deletes: [...deletes.current],
          }),
        )
      }
    } catch {
      // no localStorage means no mirror, the queue and retries still run
    }
  }, [])

  // A failed save stays in the queue and retries with backoff. Nothing typed is
  // ever dropped: it either reaches Postgres or waits, mirrored, until it can.
  const flush = useCallback(async () => {
    if (flushing.current) return
    flushing.current = true
    let failed = false
    let failMsg = ''

    for (const [id, workout] of [...pending.current.entries()]) {
      try {
        await db.saveWorkout(sb, userId, workout)
        // Only clear the slot if nothing newer arrived while this was in flight.
        if (pending.current.get(id) === workout) pending.current.delete(id)
      } catch (e) {
        failed = true
        failMsg = errText(e)
        break
      }
    }

    if (!failed) {
      for (const id of [...deletes.current]) {
        try {
          await db.deleteWorkout(sb, id)
          deletes.current.delete(id)
        } catch (e) {
          failed = true
          failMsg = errText(e)
          break
        }
      }
    }

    syncMirror()
    flushing.current = false

    if (failed) {
      retryDelay.current = Math.min(Math.max(retryDelay.current * 2, 2000), 30000)
      // A dead connection gets reassurance; a real rejection gets its message.
      // Either way the queue holds the work and keeps retrying.
      const offline =
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        /fetch|network|connection|load failed/i.test(failMsg)
      setError(
        offline
          ? 'Offline. Your sets are safe on this phone and will save when the connection returns.'
          : `Save failed: ${failMsg}. Your sets are held on this phone and retried.`,
      )
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), retryDelay.current)
    } else {
      retryDelay.current = 0
      setError('')
      // Edits made while this flush was in flight are still queued: the guard
      // turned their flush call away, so give them their own pass now.
      if (pending.current.size || deletes.current.size) {
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => void flush(), 100)
      }
    }
  }, [sb, userId, syncMirror])

  // Every edit lands in state immediately and hits Postgres a beat later, so
  // typing a set never waits on the network.
  const queueSave = useCallback(
    (workout: Workout) => {
      pending.current.set(workout.id, workout)
      syncMirror()
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), 400)
    },
    [flush, syncMirror],
  )

  useEffect(() => {
    let alive = true
    db.loadAll(sb, userId)
      .then((loaded) => {
        if (!alive) return
        returning.current = loaded.settings.onboardedAt !== null

        // A previous visit may have died with unsaved work. Every mirror this
        // user left on this device, from any tab, is replayed: the mirror is
        // by definition newer than the server for those workouts. Invalid
        // entries are dropped rather than replayed, and consumed keys removed
        // so a bad one cannot crash every load after.
        try {
          const prefix = `${MIRROR_PREFIX}${userId}:`
          const keys: string[] = []
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith(prefix)) keys.push(key)
          }
          for (const key of keys) {
            try {
              const saved = JSON.parse(localStorage.getItem(key) ?? 'null') as MirrorShape | null
              for (const w of saved?.workouts ?? []) {
                if (validWorkout(w)) pending.current.set(w.id, w)
              }
              for (const id of saved?.deletes ?? []) {
                if (typeof id === 'string') deletes.current.add(id)
              }
            } catch {
              // an unreadable mirror is treated as absent
            }
            if (key !== mirrorKey.current) localStorage.removeItem(key)
          }
          if (pending.current.size || deletes.current.size) {
            const replaced = loaded.workouts
              .filter((w) => !deletes.current.has(w.id))
              .map((w) => pending.current.get(w.id) ?? w)
            const known = new Set(replaced.map((w) => w.id))
            const extra = [...pending.current.values()].filter((w) => !known.has(w.id))
            loaded = { ...loaded, workouts: [...extra, ...replaced] }
            syncMirror()
            setTimeout(() => void flush(), 100)
          }
        } catch {
          // no localStorage, no replay, the app still loads
        }

        setData(loaded)
        // Keep a copy so the next cold open with no signal has something to
        // show. Written after the replay, so it includes unsaved work.
        saveSnapshot(userId, loaded)
      })
      .catch((e) => {
        // A dead connection falls back to the last copy on this device rather
        // than to an empty screen. A real rejection is shown as itself.
        const snapshot = looksOffline(e) ? readSnapshot(userId) : null
        if (snapshot) {
          setData(snapshot.data)
          setOffline(snapshot.at)
          return
        }
        setError(e instanceof Error ? e.message : 'Could not load')
        setLoadFailed(true)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [sb, userId])

  // A set typed and not yet written is the one thing this app cannot lose, so
  // anything that looks like leaving flushes the queue: the field losing focus,
  // the tab going to the background, the page going away.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void flush()
    }
    const onLeave = () => void flush()
    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('focusout', onLeave)
    window.addEventListener('pagehide', onLeave)
    window.addEventListener('online', onLeave)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('focusout', onLeave)
      window.removeEventListener('pagehide', onLeave)
      window.removeEventListener('online', onLeave)
      void flush()
    }
  }, [flush])

  const updateWorkout = useCallback(
    (next: Workout) => {
      setData((prev) => ({ ...prev, workouts: prev.workouts.map((w) => (w.id === next.id ? next : w)) }))
      queueSave(next)
    },
    [queueSave],
  )

  function removeWorkout(id: string) {
    pending.current.delete(id)
    deletes.current.add(id)
    syncMirror()
    setData((prev) => ({ ...prev, workouts: prev.workouts.filter((w) => w.id !== id) }))
    void flush()
  }

  function startWorkout(title: string, items: CustomWorkoutItem[], sort = false, dayId?: string) {
    // Once a day, on the way into the first session, because how a knee feels
    // this morning is worth asking then and is noise at any other moment.
    if (!greetedOn(data.settings.profile, now) && items.length > 0) {
      setPendingStart({ title, items, sort, dayId })
      setGreeting(true)
      return
    }
    // Nothing else stands in the way. How long somebody has got used to be
    // asked here, on the grounds that it is a better question about today than
    // at signup, and that was true and still the wrong place for it: two
    // questions between a person and the session they opened the app to do is
    // one too many, and the one that can wait is the one about the clock. It
    // lives on the profile, it defaults to an hour, and nobody is stopped on
    // the way in to answer it.
    reallyStart(title, items, sort)
  }

  // A session held while something was asked is rebuilt against the profile
  // that came back, rather than started from the items it was holding, so the
  // answer shapes the session it interrupted.
  function resumePendingStart(next: Profile) {
    if (!pendingStart) return
    const { title, items, sort, dayId } = pendingStart
    setPendingStart(null)
    const day = dayId ? dayById(dayId) : null
    // Built from today's profile, so a joint named in the greeting still eases
    // the session even when the minutes question interrupted it on the way.
    const who = forToday(next, now)
    reallyStart(title, day ? buildDay(day, who) : items, sort, who)
  }

  function reallyStart(title: string, items: CustomWorkoutItem[], sort = false, who?: Profile) {
    // A day the bans and the equipment emptied is a message, not a session. A
    // running clock over zero exercises with no explanation reads as a crash.
    if (items.length === 0) {
      setSheet(null)
      setError('The plan could not fill this day: between flagged joints and the equipment on your profile, nothing qualified. Loosen one of those on your profile, or build the session by hand.')
      return
    }
    // The plan decides how many rows a movement gets, so a templated session
    // opens already saying what it wants: four rows on the press, three on the
    // pushdowns. Read off the profile that is current at this moment, because
    // the minutes question can have rewritten it between tapping Start and
    // getting here.
    const settings = latest.current.settings
    const light = isLighter(planFor(who ?? settings.profile, settings.goal).sets)

    // Superset tags flow straight through from templates and saved workouts.
    let exercises: Workout['exercises'] = items.map((item) => ({
      id: uid(),
      name: item.name,
      type: item.type,
      superset: item.superset ?? null,
      // Lighter for the whole plan, or lighter because this one movement
      // crosses a joint they said was sore. Either is a set fewer, and a sore
      // knee should not make the bench press shorter.
      sets: seedSets(item.name, item.type, settings.goal, light || ('lighter' in item && item.lighter === true)),
    }))

    // Hardest first applies only to sessions the app generated from the plan.
    // A day the user wrote, or picked by name, keeps the order it was written
    // in: ordering with intent is not a mistake to correct.
    if (sort) exercises = hardestFirst(exercises, topLoads(latest.current.workouts))

    // The session starts now. That timestamp is what gives it a duration and
    // what the End button closes.
    const workout: Workout = {
      id: uid(),
      date: today(),
      title,
      exercises,
      startedAt: new Date().toISOString(),
      endedAt: null,
      intensity: null,
    }
    if (sort) generated.current.add(workout.id)
    setData((prev) => ({ ...prev, workouts: [workout, ...prev.workouts] }))
    queueSave(workout)
    setSheet(null)
    setTab('calendar')
  }

  function addExercise(workoutId: string, name: string, type: SetType, superset: string | null) {
    const workout = latest.current.workouts.find((w) => w.id === workoutId)
    if (!workout) return
    updateWorkout({
      ...workout,
      exercises: [
        ...workout.exercises,
        { id: uid(), name, type, superset, sets: seedSets(name, type, data.settings.goal, lighter) },
      ],
    })
  }

  // A custom exercise can say how many sets it wants laid out, and somebody who
  // wrote the movement down themselves outranks anything derived. Otherwise the
  // plan's prescription decides, and Add set covers the rest.
  function seedSets(name: string, type: SetType, goal: Goal, light: boolean) {
    const own = customFor(name)?.sets
    const count = own && own > 0 ? own : prescribedSets(name, type, goal, light)
    return Array.from({ length: Math.min(Math.max(count, 1), 10) }, () => ({ id: uid() }))
  }

  // A substitute takes the place of the one it replaces: same position, same
  // superset, same number of sets laid out. The numbers do not carry over,
  // because they were for a different movement.
  function swapExercise(workoutId: string, exerciseId: string, name: string, type: SetType) {
    const workout = latest.current.workouts.find((w) => w.id === workoutId)
    if (!workout) return
    updateWorkout({
      ...workout,
      exercises: workout.exercises.map((e) =>
        e.id === exerciseId
          ? {
              ...e,
              name,
              type,
              sets: e.sets.filter((set) => !set.drop).map(() => ({ id: uid() })),
            }
          : e,
      ),
    })
  }

  async function createCustomExercise(exercise: CustomExercise) {
    setData((prev) => ({ ...prev, custom: [...prev.custom, exercise] }))
    try {
      await db.saveCustomExercise(sb, userId, exercise)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save exercise')
    }
  }

  // Building saves and starts, since you built it to do it. Editing saves and
  // stops there, because changing next Tuesday's plan is not the same as
  // deciding to train right now.
  // Publishing a workout and handing over the link. A copy, not a pointer, so
  // editing yours afterwards does not rewrite what somebody else was given.
  async function shareWorkoutLink(workout: CustomWorkout) {
    try {
      const share = await db.shareCustomWorkout(sb, userId, workout)
      const url = `${window.location.origin}/w/${share}`
      const shared = await sharePlainLink(workout.name, url)
      // The message renders on the page, so the sheet has to get out of its
      // way or sharing looks like it did nothing. And copied is only said
      // when the copy happened; a clipboard that refused gets the raw link,
      // which is uglier and true.
      if (shared !== 'shared') {
        setSheet(null)
        setError(shared === 'copied' ? `Link copied: ${url}` : `Your link: ${url}`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not share that one')
    }
  }

  async function saveCustomWorkout(name: string, items: CustomWorkoutItem[], id?: string) {
    const editing = !!id
    const workout = { id: id ?? uid(), name, items }
    setData((prev) => ({
      ...prev,
      customWorkouts: editing
        ? prev.customWorkouts.map((w) => (w.id === workout.id ? workout : w))
        : [...prev.customWorkouts, workout],
    }))
    setEditingWorkout(null)
    setSeedWorkout(null)
    setSheet(null)
    try {
      await db.saveCustomWorkout(sb, userId, workout)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save workout')
    }
    if (!editing) startWorkout(name, items, false)
  }

  async function removeCustomWorkout(id: string) {
    setData((prev) => ({ ...prev, customWorkouts: prev.customWorkouts.filter((w) => w.id !== id) }))
    try {
      await db.deleteCustomWorkout(sb, id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete workout')
    }
  }

  // The profile is the one place the goal is edited, so saving it is what
  // moves the training goal. The list's top pick drives, exactly as the hint
  // under the picker promises; before this, that hint was a lie and only a
  // separate radio in Settings actually changed anything.
  async function saveProfile(next: Profile, onboardedAt?: string) {
    const stamp = onboardedAt ?? data.settings.onboardedAt
    const choice = primaryGoal(next)
    // A change of driving goal is dated, so the offer to advance to the next
    // one counts weeks of this goal rather than weeks of membership.
    const profile =
      choice !== primaryGoal(data.settings.profile)
        ? { ...next, goalChoiceAt: new Date().toISOString() }
        : next
    const goal = choice ? GOAL_FROM_CHOICE[choice] : data.settings.goal
    setData((prev) => ({ ...prev, settings: { ...prev.settings, profile, goal, onboardedAt: stamp } }))
    try {
      await db.saveProfile(sb, userId, profile, stamp)
      if (goal !== data.settings.goal) await db.saveGoal(sb, userId, goal)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your answers')
    }
  }

  // Day one bodyweight is a real reading on a real date, not a profile field,
  // so it goes in beside every reading that follows it.
  async function logWeight(pounds: number, date = today()) {
    const entry = { date, weight: pounds }
    setData((prev) => ({
      ...prev,
      bodyWeights: [...prev.bodyWeights.filter((w) => w.date !== date), entry].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    }))
    try {
      await db.saveBodyWeight(sb, userId, entry)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your weight')
    }
  }

  async function finishOnboarding({ profile: answered, goal, startDayId, build, weight, nudge }: OnboardingResult) {
    const stamp = new Date().toISOString()
    // The plan lands on the week before anybody sees the home screen. Without
    // this, every fresh account's Today card said Rest day forever, including
    // right above the day one session they had just started, because nothing
    // ever wrote a schedule until they found the profile page.
    const profile: Profile = hasSchedule(answered)
      ? answered
      : { ...answered, schedule: suggestSchedule(planFor(answered, goal)) }
    setData((prev) => ({ ...prev, settings: { ...prev.settings, goal, profile, onboardedAt: stamp, nudge } }))
    try {
      await db.saveProfile(sb, userId, profile, stamp)
      await db.saveGoal(sb, userId, goal)
      // The day is saved, the browser is not asked. Spending the permission
      // prompt here, before anybody has trained, is spending it where it is
      // most likely to be refused, and a refusal cannot be taken back. The
      // finish screen asks, once there is something to be checked in on.
      if (nudge.day !== null) await db.saveNudge(sb, userId, nudge)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your answers')
    }
    if (weight != null) await logWeight(weight)
    // Somebody who said they write their own lands in the builder, not in a
    // session the app picked for them.
    if (build) {
      setSeedWorkout(null)
      setEditingWorkout(null)
      setSheet('builder')
      return
    }
    const day = startDayId ? dayById(startDayId) : null
    if (day) reallyStart(day.name, buildDay(day, profile), true)
  }

  // Ending a session stamps it and asks the one question worth asking. Both
  // are separate writes so a skipped score still leaves a finished workout.
  function endWorkout(id: string) {
    const workout = data.workouts.find((w) => w.id === id)
    if (!workout) return
    // Already ended and unscored means they skipped the question and came
    // back to it. Do not move the end time in that case.
    if (!workout.endedAt) {
      const ended = { ...workout, endedAt: new Date().toISOString() }
      setData((prev) => ({ ...prev, workouts: prev.workouts.map((w) => (w.id === id ? ended : w)) }))
      queueSave(ended)
    }
    setScoring(id)
    setSheet('score')
  }

  function scoreWorkout(id: string, intensity: number) {
    const workout = data.workouts.find((w) => w.id === id)
    if (!workout) return
    const scored = { ...workout, intensity }
    setData((prev) => ({ ...prev, workouts: prev.workouts.map((w) => (w.id === id ? scored : w)) }))
    queueSave(scored)
  }

  // Everything, gone. The rows go first and the account last, inside one
  // function that reads the user id from the session, so it can only ever
  // delete the person asking.
  async function deleteAccount() {
    try {
      await db.deleteAccount(sb)
      try {
        localStorage.clear()
      } catch {
        // nothing stored, nothing to clear
      }
      await sb.auth.signOut()
      window.location.href = '/login'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete your account')
    }
  }

  // The movement whose own screen is open, by name.
  async function saveExerciseNote(name: string, note: string) {
    const key = name.toLowerCase()
    setData((prev) => {
      const next = { ...prev.exerciseNotes }
      if (note.trim()) next[key] = note.trim()
      else delete next[key]
      return { ...prev, exerciseNotes: next }
    })
    try {
      await db.saveExerciseNote(sb, userId, name, note)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your note')
    }
  }

  // Turning the nudge on or off, and moving the day or the hour. The device
  // registration is the part that has to happen first: a day saved against an
  // account with no endpoint on file is a message with nowhere to go.
  async function setNudge(nudge: { day: number | null; hour: number }) {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, nudge } }))
    try {
      // Turning it on already registered this phone, in the sheet, where the
      // permission prompt happened. Only turning it off has work to do here.
      if (nudge.day === null) await forgetNudge()
      await db.saveNudge(sb, userId, nudge)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save when to nudge you')
    }
  }

  async function importAll(incoming: TrainingData) {
    for (const exercise of incoming.custom) await db.saveCustomExercise(sb, userId, exercise)
    for (const workout of incoming.customWorkouts) await db.saveCustomWorkout(sb, userId, workout)
    for (const workout of incoming.workouts) await db.saveWorkout(sb, userId, workout)
    await db.saveGoal(sb, userId, incoming.settings.goal)
    setData(await db.loadAll(sb, userId))
  }

  // The ghost line: the most recent other session that used this movement.
  const lastFor = useCallback(
    (name: string, workout: Workout): LastSession | null => {
      let best: LastSession | null = null
      for (const candidate of data.workouts) {
        if (candidate.id === workout.id) continue
        if (candidate.date > workout.date) continue
        // A session with nothing written in it is not a last session. Without
        // this the ghost line reads "? x ?" off an untouched set row.
        const exercise = candidate.exercises.find(
          (e) => e.name === name && e.sets.some((s) => !isEmptySet(s, e.type)),
        )
        if (!exercise) continue
        if (!best || candidate.date > best.date) best = { date: candidate.date, exercise }
      }
      return best
    },
    [data.workouts],
  )

  // The records a set has to beat, gathered from every earlier session of the
  // same movement. Sits alongside the ghost line rather than replacing it.
  const loads = useMemo(() => topLoads(data.workouts), [data.workouts])

  const bestsFor = useCallback(
    (name: string, workout: Workout) => computeBests(data.workouts, name, workout.id, workout.date),
    [data.workouts],
  )

  const now = today()
  const profile = data.settings.profile
  const plan = data.settings.onboardedAt ? planFor(profile, data.settings.goal) : null
  const lighter = isLighter(plan?.sets)
  // The library lookups for muscle group and rest tier consult this, so it has
  // to be current before anything reads them this render.
  registerCustoms(data.custom)

  const week = blockWeek(profile, now)
  const blockNo = blockNumber(profile, now)
  const effort = effortFactor(week)

  // Only ask about sore joints once a session is behind them, on a later visit.
  // Asking the moment onboarding hands over the first session is two sheets back
  // to back, which is the interrogation this whole flow exists to avoid.
  const hasTrained = data.workouts.some(
    (w) => w.date < now && w.exercises.some((e) => e.sets.some((s) => !isEmptySet(s, e.type))),
  )
  const wantsSore = hasTrained && returning.current && profile.sore === undefined

  const trainedLast28 = trainingGrid(data.workouts, now).filter((d) => d.trained).length
  const behind =
    plan !== null && needsCheckin(profile, data.settings.onboardedAt, trainedLast28, now)

  // The offers the log has earned. At most one card speaks at a time, and the
  // four week check-in outranks both: a week that is not happening is a bigger
  // fact than a promotion.
  const graduation = plan !== null && !behind ? graduationFor(profile, data.workouts, data.settings.onboardedAt) : null
  const advance =
    plan !== null && !behind && !graduation ? advanceFor(profile, data.workouts, data.settings.onboardedAt) : null

  const ordered = data.workouts.slice().sort((a, b) => b.date.localeCompare(a.date))
  const todays = ordered.filter((w) => w.date === now)
  const past = ordered.filter((w) => w.date !== now)
  const targetWorkout = data.workouts.find((w) => w.id === pickerTarget) ?? null
  const scoringWorkout = data.workouts.find((w) => w.id === scoring) ?? null
  // Counting this session, which is why it is computed from the live data
  // rather than from the copy the score was written into.
  const weeklyTarget = scheduledDays(profile) || profile.days || 3

  // First sign in lands straight in the questionnaire. Nothing to tap through
  // first: the account is new, there is no history to look at, and the plan is
  // A failed load is a failed load, never a fresh account. Before this guard,
  // any server hiccup left onboardedAt null and dropped a person with months
  // of history into "Tell us about yourself", which reads as their data being
  // gone.
  if (loadFailed) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center gap-4 px-6">
        <LiftyMark className="h-10 w-10" />
        <p className="text-center text-sm leading-relaxed text-muted">
          Could not load your training. Nothing is lost, it just did not come down this time.
          {error ? ` (${error})` : ''}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-2xl bg-accent px-6 py-3 font-display text-sm font-bold text-on-accent"
        >
          Try again
        </button>
      </main>
    )
  }

  // the reason they are here.
  if (!loading && (!data.settings.onboardedAt || rerun)) {
    return (
      <Onboarding
        again={rerun}
        initial={rerun ? profile : undefined}
        onCancel={() => setRerun(false)}
        onFinish={(result) => {
          setRerun(false)
          void finishOnboarding(result)
        }}
      />
    )
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-safe pb-nav">
      <header className="flex items-center justify-between pb-4 pt-5">
        {/* The mark and the wordmark, together, which is the lockup. On the
            other tabs the heading is what you are looking at instead. */}
        {tab === 'calendar' ? (
          <div className="flex items-center gap-2">
            <LiftyMark size={30} />
            <span className="font-display text-xl font-bold tracking-tight">LiftyBot</span>
          </div>
        ) : (
          <h1 className="font-display text-xl font-bold tracking-tight">
            {tab === 'progress' ? 'Progress' : ''}
          </h1>
        )}
        {tab === 'calendar' ? (
          <button
            onClick={() => setSheet('settings')}
            className="rounded-full bg-tint-cool px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[1.2px] text-accent-ink"
          >
            {goalLabel(profile, data.settings.goal)}
          </button>
        ) : null}
      </header>

      {offline ? (
        <p className="mb-3 rounded-xl bg-card p-3 text-xs leading-relaxed text-muted ring-1 ring-edge">
          No connection. This is your copy from {fmtDate(offline.slice(0, 10))}, and anything you log
          now is saved on this device and sent when you are back.
        </p>
      ) : null}

      {error ? <p className="mb-3 rounded-xl bg-card p-3 text-xs text-accent-ink ring-1 ring-edge">{error}</p> : null}
      {loading ? <p className="text-sm text-muted">Loading</p> : null}

      {!loading && tab === 'calendar' ? (
        <TodayCard
          profile={profile}
          workouts={data.workouts}
          today={now}
          onStart={(dayId) => {
            const day = dayById(dayId)
            if (day) reallyStart(day.name, buildDay(day, profile), true)
          }}
          onPeek={setPeekDay}
          onPlanWeek={() => {
            setProfileFocus('week')
            setSheet('profile')
          }}
        />
      ) : null}

      {!loading && tab === 'calendar' && week ? (
        <BlockCard week={week} number={blockNo ?? 1} workouts={data.workouts} today={now} />
      ) : null}

      {!loading && tab === 'calendar' && behind ? (
        <div className="mb-4 rounded-2xl bg-card p-4 ring-1 ring-edge">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">
            The last four weeks
          </p>
          <p className="num mt-1 font-display text-2xl font-bold">{trainedLast28} / 28 days</p>
          <p className="mt-1 text-sm text-muted">
            You planned {profile.days ?? plan?.days} a week. Three days done properly beats{' '}
            {profile.days ?? plan?.days} missed. Want the shorter plan? Either answer sticks, and
            days a week can always change on your profile.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() =>
                void saveProfile({
                  ...profile,
                  days: MIN_DAYS,
                  checkinDismissedAt: new Date().toISOString(),
                })
              }
              className="flex-1 rounded-xl bg-accent py-2 text-sm font-medium text-on-accent"
            >
              Move to {MIN_DAYS} days
            </button>
            <button
              onClick={() =>
                void saveProfile({ ...profile, checkinDismissedAt: new Date().toISOString() })
              }
              className="rounded-xl px-4 py-2 text-sm text-muted"
            >
              Keep my plan
            </button>
          </div>
        </div>
      ) : null}

      {!loading && tab === 'calendar' && graduation ? (
        <div className="mb-4 rounded-2xl bg-card p-4 ring-1 ring-edge">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">
            {graduationCopy(graduation).title}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{graduationCopy(graduation).body}</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => void saveProfile({ ...profile, promotedTo: graduation.to })}
              className="flex-1 rounded-xl bg-accent py-2 text-sm font-medium text-on-accent"
            >
              {graduationCopy(graduation).yes}
            </button>
            <button
              onClick={() => void saveProfile({ ...profile, promotionDismissed: graduation.to })}
              className="rounded-xl px-4 py-2 text-sm text-muted"
            >
              {graduationCopy(graduation).no}
            </button>
          </div>
        </div>
      ) : null}

      {!loading && tab === 'calendar' && advance ? (
        <div className="mb-4 rounded-2xl bg-card p-4 ring-1 ring-edge">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">
            {advanceCopy(advance).title}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{advanceCopy(advance).body}</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() =>
                void saveProfile({
                  ...profile,
                  goals: promoteGoal(goalsOf(profile), advance.to),
                  goalChoice: advance.to,
                })
              }
              className="flex-1 rounded-xl bg-accent py-2 text-sm font-medium text-on-accent"
            >
              {advanceCopy(advance).yes}
            </button>
            <button
              onClick={() => void saveProfile({ ...profile, advanceDismissedFor: advance.from })}
              className="rounded-xl px-4 py-2 text-sm text-muted"
            >
              {advanceCopy(advance).no}
            </button>
          </div>
        </div>
      ) : null}

      {!loading && tab === 'calendar' && wantsSore && !behind && !graduation && !advance ? (
        <div className="mb-4 rounded-2xl bg-card p-4 ring-1 ring-edge">
          <p className="text-sm">
            Anything giving you trouble? Flag a joint and sessions swap around it.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                setProfileFocus('sore')
                setSheet('profile')
              }}
              className="rounded-xl bg-ink px-4 py-2 text-sm ring-1 ring-edge"
            >
              Flag something
            </button>
            <button
              onClick={() => void saveProfile({ ...profile, sore: [] })}
              className="rounded-xl px-4 py-2 text-sm text-muted"
            >
              All good
            </button>
          </div>
        </div>
      ) : null}

      {!loading && tab === 'calendar' ? (
        <div className="flex flex-col gap-6">
          {todays.length === 0 ? (
            // On a scheduled rest day this card must not argue with the Today
            // card above it: telling somebody to train on the day the plan
            // told them to rest is the app contradicting its own training.
            <p className="rounded-2xl bg-card p-4 text-sm text-muted ring-1 ring-edge">
              {hasSchedule(profile) && !todaysDayId(profile, today())
                ? 'Rest day. Nothing to log unless you feel like logging something anyway.'
                : 'Nothing logged today. Tap Start below.'}
            </p>
          ) : null}
          {todays.map((workout) => (
            <WorkoutEditor
              key={workout.id}
              workout={workout}
              goal={data.settings.goal}
              effort={effort}
              lighter={lighter}
              lastFor={lastFor}
              bestsFor={bestsFor}
              live
              onEnd={() => endWorkout(workout.id)}
              onRest={rest.start}
              loads={loads}
              offerSort={generated.current.has(workout.id)}
              onChange={updateWorkout}
              onDelete={() => void removeWorkout(workout.id)}
              onAddExercise={() => {
                setSwapping(null)
                setPickerTarget(workout.id)
                setSheet('picker')
              }}
              onSwapExercise={(exerciseId, name) => {
                setSwapping({ id: exerciseId, name })
                setPickerTarget(workout.id)
                setSheet('picker')
              }}
              onOpenExercise={setOpenExercise}
            />
          ))}

          {/* What is coming, under the week that says where you are in the
              one you are in. Names only: ten sessions with six movements each
              is sixty lines nobody reads, and what is in a day is one tap
              away on the day. */}
          <UpcomingList
            profile={profile}
            workouts={data.workouts}
            today={now}
            onPeek={setPeekDay}
            onMove={setMoving}
          />

          {/* Everything behind you. This was its own tab until the calendar
              made that tab redundant as a navigator. Hidden while a session is
              live, because a workout in progress should not be followed down
              the page by every workout that came before it. */}
          {todays.length === 0 ? (
        <div className="flex flex-col gap-3">
          {/* Named, because without a heading these sat straight under the
              list of what is coming and in the same shape, and a finished
              workout read as a scheduled one. */}
          {past.length ? (
            <h3 className="mt-2 text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">
              Already done
            </h3>
          ) : null}
          {past.length === 0 ? <p className="text-sm text-muted">Nothing behind you yet.</p> : null}
          {past.map((workout) =>
            openHistory === workout.id ? (
              <div key={workout.id} className="rounded-2xl bg-card p-3 ring-1 ring-accent-ink">
                <WorkoutEditor
                  workout={workout}
                  goal={data.settings.goal}
                  lighter={lighter}
                  lastFor={lastFor}
                  bestsFor={bestsFor}
                  live={workout.date === now}
                  onRest={rest.start}
                  loads={loads}
                  onChange={updateWorkout}
                  onDelete={() => {
                    setOpenHistory(null)
                    void removeWorkout(workout.id)
                  }}
                  onAddExercise={() => {
                    setSwapping(null)
                    setPickerTarget(workout.id)
                    setSheet('picker')
                  }}
                  onSwapExercise={(exerciseId, name) => {
                    setSwapping({ id: exerciseId, name })
                    setPickerTarget(workout.id)
                    setSheet('picker')
                  }}
                  onOpenExercise={setOpenExercise}
                  showDate
                />
                <button
                  onClick={() => setOpenHistory(null)}
                  className="surface mt-3 w-full rounded-xl py-2.5 text-sm font-extrabold text-muted ring-1 ring-edge"
                >
                  Close
                </button>
              </div>
            ) : (
              <button
                key={workout.id}
                onClick={() => setOpenHistory(workout.id)}
                className="rounded-[18px] bg-card p-3.5 text-left ring-1 ring-edge"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-display text-base font-semibold">{workout.title}</span>
                  <span className="num shrink-0 text-xs font-bold text-faint">
                    {fmtDate(workout.date)}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-col gap-0.5">
                  {workout.exercises.slice(0, 3).map((exercise) => (
                    <p key={exercise.id} className="num truncate text-xs text-muted">
                      {exercise.name} {fmtSets(exercise)}
                    </p>
                  ))}
                  {workout.exercises.length > 3 ? (
                    <p className="num text-xs text-faint">and {workout.exercises.length - 3} more</p>
                  ) : null}
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-2 border-t border-edge pt-2">
                  <span className="num text-xs font-bold text-muted">
                    {workoutVolume(workout) > 0
                      ? `${Math.round(workoutVolume(workout)).toLocaleString()} lb`
                      : ''}
                    {workout.intensity != null ? ` · felt like ${workout.intensity} of 10` : ''}
                  </span>
                  <span className="text-[12.5px] font-extrabold text-accent-ink">Open</span>
                </div>
              </button>
            ),
          )}
        </div>
          ) : null}
        </div>
      ) : null}



      {!loading && tab === 'lifty' ? <HelpSheet inline onAsk={noteQuestion} onClose={() => setTab('calendar')} /> : null}

      {!loading && tab === 'profile' ? (
        <ProfileSheet
          inline
          admin={admin}
          email={email}
          profile={profile}
          focus="all"
          weights={data.bodyWeights}
          workouts={data.workouts}
          onOpenSettings={() => setSheet('settings')}
          onLogWeight={(lb) => void logWeight(lb)}
          onSave={(next) => void saveProfile(next)}
          onClose={() => setTab('calendar')}
        />
      ) : null}

      {!loading && tab === 'progress' ? (
        <RecordsTab workouts={data.workouts} today={now} target={weeklyTarget} />
      ) : null}

      <BottomNav tab={tab} onPick={setTab} onStart={() => setSheet('start')} />

      {rest.rest ? (
        <RestBar
          rest={rest.rest}
          remaining={rest.remaining}
          onExtend={rest.extend}
          onStop={rest.stop}
        />
      ) : null}

      {sheet === 'start' ? (
        <StartSheet
          plan={plan}
          profile={profile}
          goal={data.settings.goal}
          customWorkouts={data.customWorkouts}
          onStart={startWorkout}
          onBuild={() => {
            setEditingWorkout(null)
            setSeedWorkout(null)
            setSheet('builder')
          }}
          onShare={(workout) => void shareWorkoutLink(workout)}
          onEdit={(id) => {
            setSeedWorkout(null)
            setEditingWorkout(id)
            setSheet('builder')
          }}
          onCopy={(name, items) => {
            setEditingWorkout(null)
            setSeedWorkout({ name, items })
            setSheet('builder')
          }}
          onDelete={(id) => void removeCustomWorkout(id)}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet === 'builder' ? (
        <CustomBuilder
          customs={data.custom}
          editing={data.customWorkouts.find((w) => w.id === editingWorkout) ?? null}
          seed={seedWorkout}
          onSave={(name, items, id) => void saveCustomWorkout(name, items, id)}
          onClose={() => {
            setEditingWorkout(null)
            setSeedWorkout(null)
            setSheet(null)
          }}
        />
      ) : null}

      {sheet === 'picker' && targetWorkout ? (
        <ExercisePicker
          customs={data.custom}
          replacing={swapping?.name ?? null}
          onPick={(name, type, superset) => {
            if (swapping) {
              swapExercise(targetWorkout.id, swapping.id, name, type)
              setSwapping(null)
              setPickerTarget(null)
              setSheet(null)
              return
            }
            addExercise(targetWorkout.id, name, type, superset)
          }}
          onOpen={setOpenExercise}
          onUnpick={(name) => {
            // Only ever takes back what the picker just put in: the last copy
            // of that movement with nothing logged in it.
            const w = latest.current.workouts.find((x) => x.id === targetWorkout.id) ?? targetWorkout
            const doomed = [...w.exercises].reverse().find(
              (e) => e.name === name && e.sets.every((st) => isEmptySet(st, e.type)),
            )
            if (doomed) updateWorkout({ ...w, exercises: w.exercises.filter((e) => e.id !== doomed.id) })
          }}
          onCreate={(exercise) => void createCustomExercise(exercise)}
          onClose={() => {
            setSheet(null)
            setPickerTarget(null)
            setSwapping(null)
          }}
        />
      ) : null}

      {sheet === 'profile' ? (
        <ProfileSheet
          profile={profile}
          focus={profileFocus}
          weights={data.bodyWeights}
          workouts={data.workouts}
          onLogWeight={(lb) => void logWeight(lb)}
          onApply={(next) => void saveProfile(next)}
          onSave={(next) => {
            void saveProfile(next)
            setSheet(null)
            resumePendingStart(next)
          }}
          onClose={() => {
            setSheet(null)
            resumePendingStart(profile)
          }}
        />
      ) : null}

      {sheet === 'score' && scoringWorkout ? (
        <IntensitySheet
          title={scoringWorkout.title}
          seconds={durationOf(scoringWorkout)}
          initial={scoringWorkout.intensity}
          onSave={(score) => {
            scoreWorkout(scoringWorkout.id, score)
            setSheet('done')
          }}
          onSkip={() => setSheet('done')}
        />
      ) : null}

      {/* A day off the week strip, opened for reading. What is in it after
          the profile's swaps, what it costs, and a Start that is its own tap:
          the strip stays safe to browse and one tap short of training. */}
      {peekDay && dayById(peekDay) ? (
        (() => {
          const day = dayById(peekDay)!
          const items = buildDay(day, profile)
          const est = fmtEstimate(estimateSeconds(items, data.settings.goal))
          return (
            <Sheet title={day.name} onClose={() => setPeekDay(null)}>
              <p className="num text-xs font-bold text-accent-ink">
                {items.length} exercises{est ? ` \u00b7 ${est}` : ''}
              </p>
              <ul className="mt-3 flex flex-col gap-1.5 pb-2">
                {items.map((item, i) => (
                  <li key={`${item.name}-${i}`} className="surface rounded-xl px-3.5 py-2.5 ring-1 ring-edge">
                    <span className="text-sm">{item.name}</span>
                    {item.swappedFrom ? (
                      <span className="ml-2 text-xs text-muted">for {item.swappedFrom}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
              {items.length ? (
                <>
                  <button
                    onClick={() => {
                      setPeekDay(null)
                      reallyStart(day.name, items, true)
                    }}
                    className="mt-3 w-full rounded-2xl bg-accent py-3.5 font-display text-[15px] font-bold text-on-accent"
                  >
                    Start this today
                  </button>
                  {/* Looking at a session and wanting it on Thursday is at
                      least as common as wanting it right now, and until this
                      existed the only way out of here was to train. */}
                  <button
                    onClick={() => setAssigning(day.id)}
                    className="mb-2 mt-2 w-full rounded-2xl py-3.5 font-display text-[15px] font-bold text-accent-ink ring-[1.5px] ring-accent-ink"
                  >
                    Put it on a day
                  </button>
                </>
              ) : null}
            </Sheet>
          )
        })()
      ) : null}

      {/* The word before the first session of the day. What it collects is
          about today: the profile records the date and the joints, and the
          session is built from a profile with those folded in, so tomorrow is
          not shaped by how a knee felt on a Tuesday. */}
      {greeting ? (
        <HelloSheet
          name={profile.name}
          onStart={(eased) => {
            const next = recordHello(profile, now, eased)
            void saveProfile(next)
            setGreeting(false)
            // Minutes may still be unanswered, so the start goes back through
            // the front door rather than around it.
            const held = pendingStart
            setPendingStart(null)
            if (held) {
              const who = forToday(next, now)
              const day = held.dayId ? dayById(held.dayId) : null
              reallyStart(held.title, day ? buildDay(day, who) : held.items, held.sort, who)
            }
          }}
          onClose={() => {
            setGreeting(false)
            setPendingStart(null)
          }}
        />
      ) : null}

      {/* Where a session is going. Dated, so moving this Tuesday leaves every
          other Tuesday alone, and a straight pick rather than a nudge, so the
          days in between are not shuffled on the way. */}
      {moving ? (
        <WhichDaySheet
          title={`Move ${dayById(dayIdFor(profile, moving) ?? '')?.name ?? 'this session'}`}
          note={`From ${fmtDate(moving)}. Whatever the day you pick already holds comes back here, and only these two dates change. The weeks after this one keep the schedule you set.`}
          profile={profile}
          workouts={data.workouts}
          today={now}
          exclude={moving}
          onPick={(target) => {
            void saveProfile({ ...profile, moves: swapDays(profile, moving, target, now) })
            setMoving(null)
          }}
          onClose={() => setMoving(null)}
        />
      ) : null}

      {/* The other direction: a session you are looking at, put on a day.
          Same storage as a move, because choosing to do Push this Thursday is
          a decision about Thursday, not a change to every Thursday after it. */}
      {assigning ? (
        <WhichDaySheet
          title={`Put ${dayById(assigning)?.name ?? 'this'} on a day`}
          note="It lands on the day you pick and nothing else changes. Whatever was there is replaced for that date only, and the weeks after this one keep the schedule you set."
          profile={profile}
          workouts={data.workouts}
          today={now}
          onPick={(target) => {
            void saveProfile({ ...profile, moves: assignDay(profile, target, assigning, now) })
            setAssigning(null)
            setPeekDay(null)
          }}
          onClose={() => setAssigning(null)}
        />
      ) : null}

      {/* One movement, everything known about it. Opened from its name inside a
          session, and layered over whatever was there, because looking up how
          the seat was set is not leaving the session. */}
      {openExercise ? (
        <ExerciseSheet
          name={openExercise}
          workouts={data.workouts}
          goal={data.settings.goal}
          note={data.exerciseNotes[openExercise.toLowerCase()] ?? ''}
          onNote={(note) => void saveExerciseNote(openExercise, note)}
          onClose={() => setOpenExercise(null)}
        />
      ) : null}

      {/* What the session came to. Shown whether or not the dial was answered,
          because finishing is the thing being acknowledged, not answering a
          question about it. */}
      {sheet === 'done' && scoringWorkout ? (
        <DoneSheet
          workout={scoringWorkout}
          summary={summarise(data.workouts, scoringWorkout, data.settings.goal, weeklyTarget)}
          nudge={data.settings.nudge}
          onClose={() => {
            setScoring(null)
            setSheet(null)
          }}
        />
      ) : null}

      {sheet === 'help' ? <HelpSheet onAsk={noteQuestion} onClose={() => setSheet(null)} /> : null}

      {sheet === 'settings' ? (
        <SettingsSheet
          data={data}
          email={email}
          onNudge={(nudge) => void setNudge(nudge)}
          onImport={importAll}
          onRerunQuestionnaire={() => {
            setSheet(null)
            setRerun(true)
          }}
          onEditProfile={() => {
            setProfileFocus('all')
            setSheet('profile')
          }}
          onHelp={() => setSheet('help')}
          onDeleteAccount={() => void deleteAccount()}
          onSignOut={async () => {
            await flush()
            await sb.auth.signOut()
            window.location.href = '/login'
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </main>
  )
}
