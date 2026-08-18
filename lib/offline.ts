import type { TrainingData } from './types'

// The service worker gets the app onto the screen with no network. This gets
// the training on it: the last successful load, kept on the device, so a cold
// open in a basement gym shows your history instead of an error.
//
// It is a cache rather than a source of truth. Anything logged offline still
// goes through the save queue and the mirror, which is what actually protects
// unsaved work; this only decides what you see while the network is away.
const KEY = 'training-log-snapshot'

function keyFor(userId: string): string {
  return `${KEY}:${userId}`
}

export function saveSnapshot(userId: string, data: TrainingData): void {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify({ at: new Date().toISOString(), data }))
  } catch {
    // Storage full or unavailable. The app works, it just cannot boot offline.
  }
}

export interface Snapshot {
  at: string
  data: TrainingData
}

export function readSnapshot(userId: string): Snapshot | null {
  try {
    const raw = localStorage.getItem(keyFor(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Snapshot
    // A snapshot that is not shaped like one is worse than none at all.
    if (!parsed?.data || !Array.isArray(parsed.data.workouts)) return null
    return parsed
  } catch {
    return null
  }
}

export function clearSnapshot(userId: string): void {
  try {
    localStorage.removeItem(keyFor(userId))
  } catch {
    // nothing to do
  }
}

// Whether a failed load looks like a dead connection rather than a rejection.
// Offline is worth falling back for; a real error should be shown.
export function looksOffline(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /fetch|network|load failed|connection/i.test(message)
}
