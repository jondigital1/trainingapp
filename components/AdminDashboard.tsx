'use client'

import { useMemo, useState } from 'react'
import { fmtDate } from '@/lib/format'
import {
  HEALTH_LABEL,
  daysBetween,
  health,
  matches,
  neverStarted,
  sortUsers,
  toCsv,
  totals,
  type AdminUser,
  type Sort,
} from '@/lib/admin'
import CoachChip from './CoachChip'
import LiftyMark from './LiftyMark'

const LABEL = 'text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint'
const QUIET = 'px-2 py-1.5 text-[12.5px] font-extrabold text-muted'

const SORTS: { id: Sort; label: string }[] = [
  { id: 'recent', label: 'Last trained' },
  { id: 'signup', label: 'Newest' },
  { id: 'sessions', label: 'Most sessions' },
  { id: 'email', label: 'A to Z' },
]

export default function AdminDashboard({
  users,
  today,
  me,
}: {
  users: AdminUser[]
  today: string
  me: string
}) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('recent')
  const [open, setOpen] = useState<string | null>(null)
  const [note, setNote] = useState<{ id: string; text: string; bad?: boolean } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [gone, setGone] = useState<string[]>([])

  const live = useMemo(() => users.filter((u) => !gone.includes(u.id)), [users, gone])
  const sums = useMemo(() => totals(live, today), [live, today])
  const cold = useMemo(() => neverStarted(live), [live])
  const shown = useMemo(
    () => sortUsers(live.filter((u) => matches(u, query)), sort, today),
    [live, query, sort, today],
  )

  async function act(user: AdminUser, action: string, label: string) {
    setBusy(`${user.id}:${action}`)
    setNote(null)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, id: user.id, email: user.email }),
      })
      const body = (await res.json().catch(() => ({}))) as { ok?: string; error?: string }
      if (!res.ok) throw new Error(body.error ?? 'that did not work')
      if (action === 'delete') setGone((g) => [...g, user.id])
      setNote({ id: user.id, text: body.ok ?? label })
    } catch (e) {
      setNote({ id: user.id, text: e instanceof Error ? e.message : 'that did not work', bad: true })
    } finally {
      setBusy(null)
    }
  }

  function exportCsv() {
    const blob = new Blob([toCsv(shown, today)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `liftybot-users-${today}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col px-4 pb-16 pt-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <LiftyMark size={30} />
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight">Admin</h1>
            <p className="text-xs font-bold text-faint">{me}</p>
          </div>
        </div>
        <button onClick={exportCsv} className={QUIET}>
          Export CSV
        </button>
      </header>

      {/* The numbers that answer "is this working", not the ones that are easy
          to count. Signups matter less than whether anybody trained. */}
      <section className="mt-5">
        <h2 className={LABEL}>The whole app</h2>
        <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="People" value={sums.users} note={`${sums.signupsThisWeek} this week`} />
          <Stat label="Trained in 7 days" value={sums.activeWeek} note={`${sums.activeMonth} in 28`} />
          <Stat label="Sessions" value={sums.sessions} note={`${sums.sets.toLocaleString()} sets`} />
          <Stat
            label="Lifted"
            value={Math.round(sums.volume).toLocaleString()}
            note="pounds, all time"
          />
        </dl>
      </section>

      {cold.length ? (
        <CoachChip bubble className="mt-4">
          <strong>{cold.length}</strong> {cold.length === 1 ? 'person has' : 'people have'} signed up
          and never logged a set{sums.onboarded < sums.users
            ? `, and ${sums.users - sums.onboarded} never finished the questionnaire`
            : ''}
          . That is the leak worth fixing before anything else.
        </CoachChip>
      ) : null}

      <section className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className={LABEL}>People</h2>
          <span className="num text-xs font-bold text-faint">{shown.length} shown</span>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email"
          aria-label="Search people"
          className="mt-2 w-full rounded-xl bg-card px-4 py-3 text-base outline-none ring-1 ring-edge focus:ring-[1.5px] focus:ring-accent-ink"
        />

        <div className="mt-2 flex flex-wrap gap-1.5">
          {SORTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSort(s.id)}
              aria-pressed={sort === s.id}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                sort === s.id ? 'bg-midnight text-frost' : 'bg-card text-muted ring-1 ring-edge'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {shown.length === 0 ? (
            <p className="text-sm text-muted">Nobody matches that.</p>
          ) : null}
          {shown.map((user) => (
            <Row
              key={user.id}
              user={user}
              today={today}
              open={open === user.id}
              busy={busy}
              note={note?.id === user.id ? note : null}
              isMe={user.email.toLowerCase() === me.toLowerCase()}
              onToggle={() => setOpen(open === user.id ? null : user.id)}
              onAct={act}
            />
          ))}
        </div>
      </section>
    </main>
  )
}

function Stat({ label, value, note }: { label: string; value: number | string; note?: string }) {
  return (
    <div className="rounded-2xl bg-card px-3.5 py-3 ring-1 ring-edge">
      <dt className={LABEL}>{label}</dt>
      <dd className="num mt-1 font-display text-xl font-bold">{value}</dd>
      {note ? <p className="num mt-0.5 text-[11px] font-bold text-faint">{note}</p> : null}
    </div>
  )
}

const TONE: Record<string, string> = {
  active: 'bg-accent text-on-accent',
  slipping: 'bg-tint-cool text-accent-ink',
  dormant: 'bg-track text-muted',
  never: 'bg-track text-muted',
}

function Row({
  user,
  today,
  open,
  busy,
  note,
  isMe,
  onToggle,
  onAct,
}: {
  user: AdminUser
  today: string
  open: boolean
  busy: string | null
  note: { text: string; bad?: boolean } | null
  isMe: boolean
  onToggle: () => void
  onAct: (user: AdminUser, action: string, label: string) => void
}) {
  const [confirm, setConfirm] = useState('')
  const state = health(user, today)
  const banned = !!user.bannedUntil && new Date(user.bannedUntil) > new Date()
  const working = (action: string) => busy === `${user.id}:${action}`

  return (
    <div className={`rounded-[18px] bg-card ring-1 ${open ? 'ring-accent-ink' : 'ring-edge'}`}>
      <button onClick={onToggle} className="w-full px-3.5 py-3 text-left">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-bold">{user.email}</span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[1px] ${TONE[state]}`}
          >
            {HEALTH_LABEL[state]}
          </span>
        </div>
        <p className="num mt-1 text-xs font-bold text-faint">
          {user.sessions} session{user.sessions === 1 ? '' : 's'}
          {user.lastWorkout ? ` · last ${fmtDate(user.lastWorkout)}` : ''}
          {` · joined ${fmtDate(user.createdAt)}`}
          {banned ? ' · blocked' : ''}
          {!user.confirmedAt ? ' · unconfirmed' : ''}
        </p>
      </button>

      {open ? (
        <div className="border-t border-edge px-3.5 py-3">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:grid-cols-3">
            <Detail label="Signed up" value={fmtDate(user.createdAt)} />
            <Detail
              label="Last sign in"
              value={user.lastSignInAt ? fmtDate(user.lastSignInAt) : 'never'}
            />
            <Detail label="Confirmed" value={user.confirmedAt ? fmtDate(user.confirmedAt) : 'no'} />
            <Detail label="Onboarded" value={user.onboardedAt ? fmtDate(user.onboardedAt) : 'no'} />
            <Detail label="Program" value={user.program ?? '–'} />
            <Detail label="Days a week" value={user.days != null ? String(user.days) : '–'} />
            <Detail label="Goal" value={user.goal ?? '–'} />
            <Detail label="Sets" value={user.sets.toLocaleString()} />
            <Detail label="Lifted" value={`${Math.round(user.volume).toLocaleString()} lb`} />
            <Detail
              label="First workout"
              value={user.firstWorkout ? fmtDate(user.firstWorkout) : '–'}
            />
            <Detail
              label="Training for"
              value={
                user.firstWorkout ? `${daysBetween(user.firstWorkout, today)} days` : '–'
              }
            />
            <Detail label="User id" value={user.id.slice(0, 8)} />
          </dl>

          <div className="mt-3 flex flex-wrap items-center gap-1">
            <button
              onClick={() => onAct(user, 'reset', 'Reset link sent')}
              disabled={!!busy}
              className={QUIET}
            >
              {working('reset') ? 'Sending' : 'Send password reset'}
            </button>
            {!user.confirmedAt ? (
              <button
                onClick={() => onAct(user, 'confirm', 'Email confirmed')}
                disabled={!!busy}
                className={QUIET}
              >
                {working('confirm') ? 'Confirming' : 'Confirm email'}
              </button>
            ) : null}
            {!isMe ? (
              banned ? (
                <button
                  onClick={() => onAct(user, 'unban', 'Allowed back in')}
                  disabled={!!busy}
                  className={QUIET}
                >
                  {working('unban') ? 'Working' : 'Allow back in'}
                </button>
              ) : (
                <button
                  onClick={() => onAct(user, 'ban', 'Blocked')}
                  disabled={!!busy}
                  className={QUIET}
                >
                  {working('ban') ? 'Working' : 'Block sign in'}
                </button>
              )
            ) : null}
          </div>

          {note ? (
            <p className={`mt-2 text-xs font-bold ${note.bad ? 'text-alert' : 'text-accent-ink'}`}>
              {note.text}
            </p>
          ) : null}

          {/* Typed, not tapped. Everything this person ever logged goes with it,
              and there is no undo anywhere behind this button. */}
          {!isMe ? (
            <div className="mt-3 border-t border-edge pt-3">
              <p className="text-xs leading-relaxed text-muted">
                Deleting removes the account and every session, set, bodyweight and setting behind
                it. There is no undo.
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Type DELETE"
                  aria-label={`Type DELETE to remove ${user.email}`}
                  className="flex-1 rounded-xl bg-ink px-3 py-2.5 text-sm outline-none ring-1 ring-edge focus:ring-[1.5px] focus:ring-alert"
                />
                <button
                  disabled={confirm.trim().toUpperCase() !== 'DELETE' || !!busy}
                  onClick={() => onAct(user, 'delete', 'Account deleted')}
                  className="rounded-xl bg-alert px-4 py-2.5 font-display text-sm font-bold text-white disabled:opacity-45"
                >
                  {working('delete') ? 'Deleting' : 'Delete'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-extrabold uppercase tracking-[1px] text-faint">{label}</dt>
      <dd className="num truncate font-bold">{value}</dd>
    </div>
  )
}
