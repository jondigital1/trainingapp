'use client'

import { useEffect, useState } from 'react'
import { STEP_COUNT, goalsOf, planFor, unitOf, GOAL_FROM_CHOICE, type Profile } from '@/lib/onboarding'
import { UNITS } from '@/lib/questions'
import { Ask, Field, Note, Options } from './Form'
import { GoalPicker } from './GoalPicker'
import { BringUpField, SexField } from './FocusField'
import { toCsv } from '@/lib/csv'
import { today } from '@/lib/format'
import { weekStart } from '@/lib/week'
import { importArtifactData } from '@/lib/importer'
import { disablePush, enableNudge, enablePush, pushState, type PushState } from '@/lib/push'
import { NudgeWhen } from './NudgeField'
import PasswordChange from './PasswordChange'
import SharedLinks from './SharedLinks'
import Sheet from './Sheet'
import type { Goal, Share, TrainingData } from '@/lib/types'

// The radio the goal rows use, since a picked goal is a choice and not an
// action. The switch is the one control in the app that is genuinely binary.
function Radio({ on }: { on: boolean }) {
  return (
    <span
      className={`grid h-[18px] w-[18px] flex-none place-items-center rounded-full ring-[1.5px] ${
        on ? 'ring-accent-ink' : 'ring-edge'
      }`}
    >
      {on ? <span className="h-2.5 w-2.5 rounded-full bg-accent-ink" /> : null}
    </span>
  )
}

function Switch({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-[26px] w-[44px] flex-none items-center rounded-full p-0.5 transition-colors ${
        on ? 'bg-accent-ink' : 'bg-track ring-1 ring-edge'
      }`}
    >
      <span
        className={`h-[22px] w-[22px] rounded-full bg-card shadow-sm transition-transform ${
          on ? 'translate-x-[18px]' : ''
        }`}
      />
    </span>
  )
}

export default function SettingsSheet({
  data,
  email,
  onNudge,
  onImport,
  onEditProfile,
  onRerunQuestionnaire,
  onHelp,
  onSignOut,
  onDeleteAccount,
  onProfileChange,
  onListShares,
  onRevokeShare,
  onClose,
}: {
  data: TrainingData
  email: string
  onNudge: (nudge: { day: number | null; hour: number }) => void
  onEditProfile: () => void
  onRerunQuestionnaire: () => void
  onHelp: () => void
  onImport: (data: TrainingData) => Promise<void>
  onSignOut: () => void
  onDeleteAccount: () => void
  // The questionnaire answers this screen owns. Every one is a tap on an
  // option, so each saves on the tap: there is no draft here to lose and no
  // Done to forget.
  onProfileChange: (patch: Partial<Profile>) => void
  // Links you have handed out. Read when the section is opened rather than at
  // startup, since this is a screen people visit rarely.
  onListShares?: () => Promise<Share[]>
  onRevokeShare?: (id: string) => Promise<void>
  onClose: () => void
}) {
  const [paste, setPaste] = useState('')
  const [killing, setKilling] = useState(false)
  const [typed, setTyped] = useState('')
  const [status, setStatus] = useState('')
  // Light is the default, so no stored choice means light rather than
  // whatever the phone is set to. Following the device is something you opt
  // into now.
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('light')
  // Read after mount: permission and localStorage do not exist on the server,
  // and guessing either produces a toggle that flips under you on hydration.
  const [alerts, setAlerts] = useState<PushState>('unsupported')
  const [busy, setBusy] = useState(false)
  // Said out loud when the phone agreed but the server did not hear about it.
  const [failed, setFailed] = useState('')
  const profile = data.settings.profile
  const plan = planFor(profile, GOAL_FROM_CHOICE[profile.goalChoice ?? 'muscle'] ?? 'muscle')
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])

  useEffect(() => setAlerts(pushState()), [])

  async function toggleAlerts() {
    setBusy(true)
    setAlerts(alerts === 'on' ? await disablePush() : await enablePush())
    setBusy(false)
  }

  const nudge = data.settings.nudge
  // Sunday, because it is the start of the week the whole app counts in, and
  // the evening, because that is when somebody can still do something about
  // what it says.
  async function toggleNudge() {
    setBusy(true)
    if (nudge.day === null) {
      // The permission prompt happens here rather than on the save, so a
      // refusal leaves the switch off instead of leaving a day set against an
      // account that can never be sent anything.
      const state = await enableNudge()
      if (state === 'denied' || state === 'unsupported') setAlerts(state)
      if (state === 'unregistered') setFailed('This phone allowed it, but saving it here did not work. Try again in a moment.')
      if (state === 'on') {
        setFailed('')
        onNudge({ day: 0, hour: nudge.hour })
      }
    } else {
      onNudge({ day: null, hour: nudge.hour })
    }
    setBusy(false)
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem('training-log-theme')
      if (saved === 'dark' || saved === 'system') setTheme(saved)
    } catch {
      // no storage, the choice just does not persist
    }
  }, [])

  function pickTheme(next: 'system' | 'light' | 'dark') {
    setTheme(next)
    try {
      if (next === 'light') {
        localStorage.removeItem('training-log-theme')
        delete document.documentElement.dataset.theme
      } else {
        localStorage.setItem('training-log-theme', next)
        document.documentElement.dataset.theme = next
      }
    } catch {
      if (next === 'light') delete document.documentElement.dataset.theme
      else document.documentElement.dataset.theme = next
    }
  }

  function exportCsv() {
    const blob = new Blob([toCsv(data.workouts)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `training-log-${today()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function runImport() {
    setStatus('Reading')
    try {
      const parsed = importArtifactData(paste)
      if (!parsed.workouts.length && !parsed.custom.length && !parsed.customWorkouts.length) {
        setStatus('Nothing found in that paste')
        return
      }
      setStatus(`Writing ${parsed.workouts.length} workouts`)
      await onImport(parsed)
      setPaste('')
      setStatus('Imported')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not read that')
    }
  }

  return (
    <Sheet title="Settings" onClose={onClose}>
      {/* The goal used to be read here and edited on the profile, because it
          had once been two editors that disagreed. It is one editor now, and
          this is where it lives: what you want out of it is something you set,
          not a fact about you, and the questionnaire files it that way too. */}
      <h3 className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">Goal</h3>
      <div className="mt-2">
        <GoalPicker
          goals={goalsOf(profile)}
          onChange={(goals) => onProfileChange({ goals, goalChoice: goals[0] })}
        />
        <BringUpField profile={profile} onChange={onProfileChange} />
        {plan.goalCoverage ? <Note>{plan.goalCoverage}</Note> : plan.goalNote ? <Note>{plan.goalNote}</Note> : null}
      </div>

      <h3 className="mt-6 text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">Appearance</h3>
      {/* A track with one segment lifted out of it, rather than three buttons
          one of which happens to be green. */}
      <div className="mt-2 flex gap-1 rounded-[13px] bg-track p-1">
        {(['light', 'dark', 'system'] as const).map((t) => (
          <button
            key={t}
            onClick={() => pickTheme(t)}
            aria-pressed={theme === t}
            className={`flex-1 rounded-[9px] py-2 text-sm font-bold capitalize ${
              theme === t ? 'bg-card text-bright ring-[1.5px] ring-accent-ink' : 'text-muted'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Filed here rather than with the facts about you, because by its own
          description it changes nothing but what you are shown, which is the
          same job the switcher above it does. */}
      <div className="mt-2">
        <Ask
          q={UNITS}
          value={unitOf(profile)}
          onPick={(v) => onProfileChange({ units: v })}
          hint="A display choice. Nothing you have already logged changes."
        />
      </div>

      {/* One heading, two switches. They are two decisions on purpose, because
          they are two different promises: a tool that fires while you train,
          and a message that arrives when you are not here. But they are the
          same subject, and two headings for two switches read like sprawl.

          The browser's own state is said once, at the top, because it applies
          to both of them and there is one permission for the whole site. */}
      <h3 className="mt-6 text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">
        Notifications
      </h3>
      {alerts === 'unsupported' ? (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          This browser cannot receive notifications. On an iPhone they work once the app is added
          to the home screen and opened from there.
        </p>
      ) : alerts === 'denied' ? (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Notifications are blocked for this site. Turn them back on in the browser settings and
          these become available again.
        </p>
      ) : (
        <>
          <button
            onClick={() => void toggleAlerts()}
            disabled={busy}
            aria-pressed={alerts === 'on'}
            className="surface mt-2 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm ring-1 ring-edge"
          >
            <span className="font-bold">Alert me when rest is up</span>
            <Switch on={alerts === 'on'} />
          </button>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            The buzz and the beep need the app awake. This one is sent from outside the phone, so it
            reaches you with the screen locked and the phone in your pocket. On for this phone only.
          </p>

          <button
            onClick={() => void toggleNudge()}
            disabled={busy}
            aria-pressed={nudge.day !== null}
            className="surface mt-4 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm ring-1 ring-edge"
          >
            <span className="font-bold">Check in on my week</span>
            <Switch on={nudge.day !== null} />
          </button>
          {nudge.day !== null ? (
            <div className="mt-2">
              <NudgeWhen value={nudge} onChange={onNudge} />
            </div>
          ) : null}
          {failed ? <p className="mt-2 text-xs font-bold leading-relaxed text-alert">{failed}</p> : null}
          <p className="mt-2 text-xs leading-relaxed text-muted">
            One message a week, comparing the days you said you train against the days you have.
            It is not a streak: nothing here counts a rest day against you, and it never arrives
            twice.
          </p>
        </>
      )}

      <h3 className="mt-6 text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">You</h3>
      <div className="mt-2">
        <SexField profile={profile} onChange={onProfileChange} />
      </div>
      <button
        onClick={onEditProfile}
        className="mt-4 w-full rounded-xl bg-ink px-3 py-3 text-left text-sm ring-1 ring-edge"
      >
        Your profile
        <span className="mt-0.5 block text-xs text-muted">
          Name, age, your week, bodyweight, your movements and your record
        </span>
      </button>
      <button
        onClick={onRerunQuestionnaire}
        className="mt-2 w-full rounded-xl bg-ink px-3 py-3 text-left text-sm ring-1 ring-edge"
      >
        Run the questionnaire again
        <span className="mt-0.5 block text-xs text-muted">
          Walks the {STEP_COUNT} sections with your answers already in them, and picks a plan at the
          end. Leaving early keeps everything as it is.
          Nothing you have logged is touched.
        </span>
      </button>

      <h3 className="mt-6 text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">Data</h3>
      <button onClick={exportCsv} className="mt-2 w-full rounded-xl bg-ink py-3 text-sm ring-1 ring-edge">
        Export CSV, one row per set
      </button>

      <p className="mt-4 text-xs text-muted">
        Bringing history over from the artifact build, paste the training-data-v2 blob here.
      </p>
      <textarea
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
        placeholder='{"workouts":[ ... ]}'
        rows={4}
        className="mt-2 w-full rounded-xl bg-ink px-3 py-2 text-xs outline-none ring-1 ring-edge focus:ring-accent-ink"
      />
      <button
        disabled={!paste.trim()}
        onClick={() => void runImport()}
        className="mt-2 w-full rounded-xl bg-ink py-3 text-sm ring-1 ring-edge disabled:opacity-40"
      >
        Import
      </button>
      {status ? <p className="mt-2 text-xs text-accent-ink">{status}</p> : null}

      <h3 className="mt-6 text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">
        Shared links
      </h3>
      {onListShares && onRevokeShare ? (
        <SharedLinks
          origin={origin}
          onList={onListShares}
          onRevoke={onRevokeShare}
        />
      ) : null}

      <h3 className="mt-6 text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">Help</h3>
      <button
        onClick={onHelp}
        className="mt-2 w-full rounded-xl bg-ink px-3 py-3 text-left text-sm ring-1 ring-edge"
      >
        What things mean
        <span className="mt-0.5 block text-xs text-muted">
          Supersets, drop sets, RPE, adding weight, and everything the app shows
        </span>
      </button>

      <h3 className="mt-6 text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">Account</h3>
      <p className="mt-2 text-sm text-muted">{email}</p>
      <PasswordChange />
      <button onClick={onSignOut} className="mt-2 w-full rounded-xl bg-ink py-3 text-sm ring-1 ring-edge">
        Sign out
      </button>

      {/* Two taps and a typed word, because this one does not come back. */}
      <h3 className="mt-8 text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint">Delete your account</h3>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        Every session, every set, your bodyweight and your profile, gone for good. Export a CSV
        first if you want to keep any of it.
      </p>
      {killing ? (
        <div className="mt-2">
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type DELETE to confirm"
            aria-label="Type DELETE to confirm"
            className="w-full rounded-xl bg-ink px-4 py-3 text-base outline-none ring-1 ring-edge focus:ring-accent-ink"
          />
          <div className="mt-2 flex gap-2">
            <button
              disabled={typed.trim().toUpperCase() !== 'DELETE'}
              onClick={onDeleteAccount}
              className="flex-1 rounded-xl bg-alert py-3 font-display text-sm font-bold text-white disabled:opacity-45"
            >
              Delete everything
            </button>
            <button
              onClick={() => {
                setKilling(false)
                setTyped('')
              }}
              className="px-4 py-3 text-sm font-extrabold text-muted"
            >
              Keep it
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setKilling(true)}
          className="surface mt-2 w-full rounded-xl py-3 text-sm font-bold text-alert ring-1 ring-edge"
        >
          Delete my account
        </button>
      )}
    </Sheet>
  )
}
