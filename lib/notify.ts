// Telling you rest is up when you are not looking at the screen.
//
// What works and what does not, plainly. Switching to another app leaves this
// page alive in the background for a while, and a notification posted from
// there reaches you. A phone locked in your pocket suspends the page entirely,
// and nothing running in it can fire; getting through to a locked phone needs
// a push server sending the message from outside the device, which this app
// does not have. So this covers checking a message between sets, and not
// putting the phone away for two minutes.
//
// Permission is asked for on the first rest timer rather than at startup,
// because a prompt before you have seen the timer is a prompt about nothing.

export type NotifyState = 'unsupported' | 'default' | 'granted' | 'denied'

export function notifyState(): NotifyState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission as NotifyState
}

export async function askToNotify(): Promise<NotifyState> {
  if (notifyState() === 'unsupported') return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission as NotifyState
  try {
    return (await Notification.requestPermission()) as NotifyState
  } catch {
    return 'denied'
  }
}

// Posted through the service worker where there is one, since a notification
// from a registration outlives the page that asked for it. Falls back to a
// page notification, which is enough while the tab is alive.
export async function restDone(name: string | null): Promise<boolean> {
  if (notifyState() !== 'granted') return false
  // Nothing to say if you are looking at the screen. The beep already fired.
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') return false
  try {
    const registration = await navigator.serviceWorker?.getRegistration()
    if (registration?.active) {
      registration.active.postMessage({ type: 'rest-done', name })
      return true
    }
    new Notification('Rest is up', { body: name ? `Next set of ${name}` : 'Next set' })
    return true
  } catch {
    return false
  }
}
