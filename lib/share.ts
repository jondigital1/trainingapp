import { fmtDate, fmtSet, isEmptySet, workoutVolume } from './format'
import { buildPdf, type Line } from './pdf'
import { durationOf, fmtDuration, intensityLabel } from './session'
import { groupRuns, supersetLetter } from './superset'
import type { Workout } from './types'

// A session, written out for somebody who was not there.
//
// The screen is built for one hand in a gym: abbreviations, colour, rows you
// tap. None of that survives being sent to a training partner or a coach, so
// the sheet is written again from scratch, in full words, in the order the
// session actually ran.

function subtitle(workout: Workout): string {
  const bits = [fmtDate(workout.date)]
  const duration = fmtDuration(durationOf(workout))
  if (duration) bits.push(duration)
  const volume = workoutVolume(workout)
  if (volume > 0) bits.push(`${Math.round(volume).toLocaleString('en-US')} lb moved`)
  return bits.join('  ·  ')
}

export function workoutLines(workout: Workout): Line[] {
  const lines: Line[] = [
    { text: workout.title || 'Workout', style: 'title' },
    { text: subtitle(workout), style: 'muted' },
  ]

  const score = intensityLabel(workout.intensity)
  if (score) {
    lines.push({ text: `Felt like ${workout.intensity} out of 10, ${score.toLowerCase()}`, style: 'muted' })
  }
  lines.push({ style: 'rule' })

  for (const run of groupRuns(workout.exercises)) {
    const superset = run.superset && run.exercises.length > 1
    if (superset) {
      lines.push({
        text: `Superset ${supersetLetter(run.index)}  ·  straight through, rest after the last`,
        style: 'muted',
      })
    }
    run.exercises.forEach((exercise, i) => {
      const label = superset ? `${supersetLetter(run.index)}${i + 1}. ${exercise.name}` : exercise.name
      lines.push({ text: label, style: 'heading', indent: superset ? 14 : 0 })

      const done = exercise.sets.filter((s) => !isEmptySet(s, exercise.type))
      if (!done.length) {
        lines.push({ text: 'Not logged', style: 'muted', indent: superset ? 28 : 14 })
        return
      }
      // Set numbers count working rows only, so a drop between two and three
      // does not renumber everything after it. A drop is written as what it is,
      // a lighter continuation of the set above.
      let n = 0
      for (const set of done) {
        if (set.drop) {
          lines.push({
            text: `      drop to ${fmtSet(set, exercise.type)}`,
            style: 'body',
            indent: superset ? 28 : 14,
          })
          continue
        }
        n += 1
        lines.push({
          text: `Set ${n}   ${fmtSet(set, exercise.type)}`,
          style: 'body',
          indent: superset ? 28 : 14,
        })
      }
    })
    lines.push({ style: 'gap' })
  }

  if (workout.note) {
    lines.push({ style: 'rule' })
    lines.push({ text: 'Note', style: 'heading' })
    lines.push({ text: workout.note, style: 'body' })
  }

  lines.push({ style: 'gap' })
  lines.push({ text: 'Logged in LiftyBot', style: 'muted' })
  return lines
}

// A plain text version, for the share sheets that take text but refuse files.
export function workoutText(workout: Workout): string {
  return workoutLines(workout)
    .filter((l) => l.text)
    .map((l) => (l.indent ? `  ${l.text!.trim()}` : l.text!))
    .join('\n')
}

export function workoutPdf(workout: Workout): Uint8Array {
  return buildPdf(workoutLines(workout))
}

// Safe on every filesystem and readable in a mail attachment list.
export function workoutFilename(workout: Workout): string {
  const name = (workout.title || 'workout').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${workout.date}-${name || 'workout'}.pdf`
}

export type ShareResult = 'shared' | 'saved' | 'cancelled'

// The share sheet is the phone's, not the app's: whatever the person has, from
// Messages to Mail to AirDrop to a note taking app, shows up because the file
// is handed to the operating system rather than to one integration.
//
// Two fallbacks, in order. A browser that shares but refuses files gets the
// text, which is the same session in the same order and can be pasted anywhere.
// A browser with no share sheet at all saves the PDF, which the person can then
// attach themselves.
export async function shareWorkout(workout: Workout): Promise<ShareResult> {
  const bytes = workoutPdf(workout)
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })
  const filename = workoutFilename(workout)
  const title = `${workout.title || 'Workout'}, ${fmtDate(workout.date)}`

  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }
  if (typeof nav.share === 'function') {
    const file = new File([blob], filename, { type: 'application/pdf' })
    const withFile: ShareData = { title, files: [file] }
    if (nav.canShare?.(withFile)) {
      try {
        await nav.share(withFile)
        return 'shared'
      } catch (e) {
        if (aborted(e)) return 'cancelled'
      }
    }
    try {
      await nav.share({ title, text: workoutText(workout) })
      return 'shared'
    } catch (e) {
      if (aborted(e)) return 'cancelled'
    }
  }

  save(blob, filename)
  return 'saved'
}

// Cancelling a share sheet is not a failure and must not surface as one.
function aborted(e: unknown): boolean {
  return !!e && typeof e === 'object' && (e as { name?: string }).name === 'AbortError'
}

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// A link, through whatever the phone offers, falling back to the clipboard.
// Three honest outcomes, because the old boolean could not tell a successful
// copy from a clipboard that refused, and the caller was saying copied either
// way.
export async function sharePlainLink(title: string, url: string): Promise<'shared' | 'copied' | 'failed'> {
  const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> }
  if (typeof nav.share === 'function') {
    try {
      await nav.share({ title, text: `${title} on LiftyBot`, url })
      return 'shared'
    } catch (e) {
      if (aborted(e)) return 'shared'
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
