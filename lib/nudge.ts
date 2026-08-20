// One message a week about the week you said you wanted.
//
// The brief this was written to: a coach, not a slot machine. Every good thing
// the app already says is tied to something that happened, which is why it
// lands, and a streak counter is the opposite of that. A streak punishes a
// rest day, and this is a lifting app where the rest day is part of the
// program. So nothing here counts consecutive anything. It compares the number
// of days somebody said they train against the number they have trained this
// week, and says what is still available.
//
// Three rules, and every line below obeys them:
//
//   Never say they failed. A week that cannot reach the target is a week with
//   sessions in it, and the sentence names those rather than the shortfall.
//   Never invent a comparison. Anything it claims about their other weeks is
//   computed from their own logged sessions or it is not said.
//   Never guilt anybody into the gym. If a sentence would work as well on a
//   billboard, it is the wrong sentence.

import { WEEKDAYS, WEEKDAY_NAMES } from './schedule'
import { daysBetween } from './week'

export interface NudgePrefs {
  day: number | null
  hour: number
  nudgedAt: string | null
  misses: number
}

// After this many nudges in a row that were followed by no training at all,
// the app stops. Somebody who has not trained in two months is not being
// helped by a fourth reminder that they have not trained in two months.
export const MAX_MISSES = 3

// Local wall clock in somebody's own timezone. The nudge is an evening
// message and an offset is wrong twice a year, so the zone travels as an IANA
// name and the conversion happens here.
export interface Local {
  dow: number
  hour: number
  date: string
}

export function localNow(zone: string, now: Date): Local {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      weekday: 'short',
      hour: '2-digit',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now)
  } catch {
    // An unknown zone is a stored string that is no longer a place. UTC is
    // wrong by a few hours, which is a better failure than never sending.
    return localNow('UTC', now)
  }
  const at = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  // Hour 24 is midnight in some locales.
  const hour = Number(at('hour')) % 24
  return {
    dow: Math.max(0, days.indexOf(at('weekday'))),
    hour,
    date: `${at('year')}-${at('month')}-${at('day')}`,
  }
}

// Due once their day and hour have arrived, and not again for six days.
//
// It asks whether the hour has passed rather than whether it is exactly this
// hour, so the job can run every hour or once a day and nobody silently never
// hears from it. Late is a worse message than on time; never is a bug.
export function nudgeDue(prefs: NudgePrefs, local: Local, now: Date): boolean {
  if (prefs.day === null) return false
  if (prefs.misses >= MAX_MISSES) return false
  if (local.dow !== prefs.day) return false
  if (local.hour < prefs.hour) return false
  if (!prefs.nudgedAt) return true
  const since = now.getTime() - new Date(prefs.nudgedAt).getTime()
  return since >= 6 * 86400000
}

export interface WeekState {
  // What they said they train, from the schedule if there is one.
  target: number
  // Distinct days trained since this week started.
  done: number
  // Days left in the week counting today.
  left: number
  // Their own average over the last four full weeks, or null before there is
  // enough logged to average.
  average: number | null
  // The last day anything was logged, ever.
  lastDate: string | null
  today: string
}

export interface Nudge {
  title: string
  body: string
}

// Nothing at all for this long and the message changes: no numbers, no week,
// nothing that reads as a scoreboard.
const LAPSED_DAYS = 21

export function nudgeFor(state: WeekState): Nudge | null {
  const { target, done, left, lastDate, today } = state
  // Somebody who has never logged anything has no week to be told about, and
  // being chased by an app you have not used yet is how an app gets deleted.
  if (!lastDate) return null
  if (target < 1) return null

  const gap = daysBetween(lastDate, today)

  if (gap >= LAPSED_DAYS) {
    return {
      title: 'Still here',
      body: `Nothing since ${niceDate(lastDate)}. Your plan and everything you have logged are exactly where you left them, for whenever you want them.`,
    }
  }

  if (done >= target) {
    return {
      title: 'That is the week',
      body:
        done > target
          ? `${done} sessions against the ${target} you set. Nothing owed for the rest of the week.`
          : `${done} of ${target}, done. Nothing owed for the rest of the week.`,
    }
  }

  const short = target - done
  const reachable = short <= left

  if (done === 0) {
    // The hardest one to get right. No scolding, and no dangling a target that
    // the week can no longer reach.
    if (left === 1) {
      return {
        title: 'The week is still open',
        body: 'Nothing logged yet, and 1 day left. One session still makes this a week you trained.',
      }
    }
    return {
      title: 'The week is still open',
      body: reachable
        ? `Nothing logged yet, and ${days(left)} left to do the ${target} you set.`
        : `Nothing logged yet. ${cap(days(left))} left, so ${sessions(left)} is what this week is, and that is worth having.`,
    }
  }

  if (reachable) {
    return {
      title: `${done} of ${target}`,
      // Room to spare and no room to spare are different weeks, and calling the
      // second one comfortable is the app not paying attention.
      body: `${cap(days(left))} left and ${sessions(short)} to go. ${short < left ? 'That is comfortable.' : 'Right on the line.'}`,
    }
  }

  // Cannot reach the target. Name what is in the week, never what is missing
  // from it, and only compare to their own weeks when the comparison is true.
  const one = done + 1
  const beatsAverage = state.average !== null && one >= state.average && done < state.average
  return {
    title: `${done} in this week`,
    body: beatsAverage
      ? `${cap(days(left))} left. One more puts this week at ${one}, which is above your usual ${round(state.average!)}.`
      : `${cap(days(left))} left. One more makes it ${one}, and ${one} is a week that counts.`,
  }
}

// Digits throughout. This is read on a lock screen in a second and a half, and
// a sentence that says three days and 2 sessions in the same breath reads like
// two people wrote it.
function days(n: number): string {
  return n === 1 ? '1 day' : `${n} days`
}

function sessions(n: number): string {
  return n === 1 ? '1 session' : `${n} sessions`
}

function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function round(n: number): string {
  return (Math.round(n * 10) / 10).toString()
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function niceDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${MONTHS[m - 1]} ${d}`
}

// Day names for the picker, from the same arrays the schedule uses so the two
// screens can never disagree about which number is Tuesday, and so the strip
// is abbreviated the same way in both places.
export const NUDGE_DAYS = WEEKDAY_NAMES.map((name, i) => ({ v: i, label: name, short: WEEKDAYS[i] }))
