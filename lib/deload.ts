// When a lighter week is worth suggesting, and it is a suggestion rather than
// a plan.
//
// This replaced a six week block. That was a card sitting on the calendar
// every day of the year telling you which of six weeks you were in and how
// hard to push, and its only enforced effect was moving the rest clock by up
// to forty five seconds. Everything else on it was advice nothing checked,
// and it spent four of its six weeks telling people to stop two or three reps
// short of what they were actually doing every session.
//
// The deload was the one idea in it worth keeping. A deload is not something
// you need told about weekly, though. It is worth saying once, after a long
// enough run of hard weeks, in plain words rather than as a week number.
export const DELOAD_AFTER = 6

// Shown when the run of weeks hitting your target crosses another six, and not
// again until it crosses the next one. Dismissing at six holds it until twelve.
//
// Taking the advice is not required and not checked. A light week where you
// still train your usual days keeps the streak, which is why this counts in
// sixes rather than waiting for a break: somebody who deloads properly should
// not be nagged for it, and somebody who never does should be asked again.
export function deloadDue(streak: number, dismissedAt = 0): boolean {
  if (streak < DELOAD_AFTER) return false
  return Math.floor(streak / DELOAD_AFTER) > Math.floor(dismissedAt / DELOAD_AFTER)
}
