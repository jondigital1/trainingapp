import { KNOWLEDGE } from './knowledge'
import type { Profile } from './onboarding'
import type { Workout } from './types'

// What Lifty is told before it is asked anything.
//
// Measured before this existed: 68 questions a lifter would actually type, run
// through the keyword search that used to answer them. It returned something
// for 87 percent of them, but only 63 percent of those were the right answer.
// A fifth came back confidently wrong, matching "workout" to "workout" and
// "down" to "down": is soreness a sign of a good workout was answered with
// what happens if I lose signal mid workout. Several of the misses had a
// correct entry sitting in the library that scoring never picked.
//
// So the library is not searched any more. All of it goes in the prompt, every
// time, and the model reads the question against the whole thing. That fixes
// picking the wrong entry and answering when nothing fits, in one move, and it
// is why growing the library was the wrong thing to do first: more entries is
// more chances for the wrong one to win on word overlap.

// The 145 answers, as written. Not summarised: they are the best copy in the
// app and the model is here to pick the right one, not to rewrite it.
function library(): string {
  return KNOWLEDGE.map((e) => `### ${e.q}\n${e.a}`).join('\n\n')
}

// Everything above the question, and everything that does not change between
// questions, so it caches. Nothing per-user goes in here: a name or a session
// in this string would break the prefix for everybody and the cache with it.
export function systemPrompt(): string {
  return `You are Lifty, the coach inside LiftyBot, a workout logging app. Somebody has typed a question into Ask Lifty.

# How to answer

Answer in plain English, the way a good coach talks to somebody standing in a gym. Short. Usually two or three sentences, four at the outside. No headings, no bullet lists, no bold. One idea, said once.

Never use em dashes or en dashes. Write ranges as "8 to 12", never "8-12".

No hype, no encouragement they have not earned, no exclamation marks. Do not praise somebody for asking. Do not close with a question or an offer of further help.

# The library comes first

Below is every answer written by hand for this app. If one of them answers the question, give that answer, in its own words, essentially as written. Do not paraphrase it into something worse. You may trim it to the part that was asked about.

If the library nearly answers it, lead with the library's answer and add the missing piece.

If the library does not cover it, answer from what you know about training, in the same voice.

If you do not know, say so plainly in one sentence. Do not guess and do not pad. "I do not have a good answer for that" is a real answer and it is better than a confident wrong one.

# Never do this

Never diagnose anything. Not a tear, not tendonitis, not impingement, not a strain. If somebody describes pain, an injury, a noise in a joint, numbness, or anything that sounds medical, say plainly that this is worth a physio or a doctor looking at, say what they can safely do in the meantime if there is something, and stop. Do not speculate about what it might be, and do not reassure them that it is probably nothing.

Never give medical, dietary, or supplement advice to somebody who has told you they are pregnant, unwell, or on medication. Point them at their doctor.

Never invent a feature. If they ask how to do something in the app and the library does not describe it, say you are not sure that is in the app rather than describing a button that does not exist.

Never claim to know something about their training that is not in the context below.

# Their training

The context below is real, read out of their log a moment ago. Use it when it makes the answer better and specific. If they ask why their bench has stalled and the log shows it, say what the log shows. If the context is empty or does not bear on the question, ignore it completely rather than reaching for it.

# The library

${library()}`
}

// Their side of it. Small on purpose: enough to make an answer specific,
// nothing that turns a coaching question into a data dump.
export interface AskContext {
  profile?: Profile | null
  goal?: string | null
  workouts?: Workout[]
  // Sore joints, and whether they were red flagged. Passed separately from the
  // profile so the caller decides: this is the most sensitive thing the
  // profile holds and the most useful thing to know when the question is about
  // pain. It never leaves the server, never reaches a share link, and never
  // reaches the admin screen, all of which a check already enforces.
  sore?: string[]
  redFlag?: boolean
}

const RECENT = 12

// One line per session, newest first, with the top sets only. A whole log is
// both too many tokens and worse to read than a summary of it.
export function trainingContext(ctx: AskContext): string {
  const lines: string[] = []

  if (ctx.goal) lines.push(`Training goal: ${ctx.goal}.`)
  const p = ctx.profile
  if (p) {
    const bits: string[] = []
    if (p.days) bits.push(`${p.days} days a week`)
    if (p.minutes) bits.push(`about ${p.minutes} minutes a session`)
    if (p.access) bits.push(`trains at: ${p.access}`)
    if (bits.length) lines.push(bits.join(', ') + '.')
  }
  // The whole point of showing this is that an answer about pressing overhead
  // should know about the shoulder. A red flag is the escalation: they said
  // the pain wakes them at night or a limb goes numb, which is not something
  // to train around, so anything touching that joint goes to a professional.
  if (ctx.sore?.length) {
    lines.push(
      ctx.redFlag
        ? `Sore and RED FLAGGED: ${ctx.sore.join(', ')}. They reported pain that wakes them at night or a limb going numb. Any question touching these joints goes to a doctor or physio, not to a workaround.`
        : `Sore joints they are working around: ${ctx.sore.join(', ')}.`,
    )
  }

  const workouts = [...(ctx.workouts ?? [])]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, RECENT)

  if (!workouts.length) {
    lines.push('They have not logged a session yet.')
    return lines.join('\n')
  }

  lines.push('', `Their last ${workouts.length} sessions, newest first:`)
  for (const w of workouts) {
    const moves = w.exercises
      .map((e) => {
        const best = e.sets
          .filter((s) => !s.drop && typeof s.w === 'number' && typeof s.r === 'number')
          .sort((a, b) => (b.w ?? 0) - (a.w ?? 0))[0]
        return best ? `${e.name} ${best.w}x${best.r}` : e.name
      })
      .join(', ')
    const felt = w.intensity ? `, felt ${w.intensity}/10` : ''
    lines.push(`${w.date} ${w.title}${felt}: ${moves}`)
  }
  return lines.join('\n')
}

// A question long enough to be a question and short enough not to be an essay
// pasted in to burn tokens.
export const MAX_QUESTION = 400

export function readQuestion(body: unknown): { ok: true; question: string } | { ok: false; error: string } {
  const asked = (body as { question?: unknown })?.question
  if (typeof asked !== 'string') return { ok: false, error: 'no question' }
  const trimmed = asked.trim()
  if (trimmed.length < 2) return { ok: false, error: 'no question' }
  if (trimmed.length > MAX_QUESTION) return { ok: false, error: 'question too long' }
  return { ok: true, question: trimmed }
}

// How many a person may ask in a day. Not a business rule, a fuse: without one
// a single account can spend the key, and there is no version of this app in
// which somebody needs to ask two hundred questions before midnight.
export const DAILY_CAP = 60
