'use client'

import { useEffect, useMemo, useState } from 'react'
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
import type { GapRow } from '@/lib/gaps'
import { unanswered, type AskedRow } from '@/lib/asked'
import type { AdminLogRow } from '@/lib/adminData'
import type { WeekBar } from '@/lib/admin'
import LiftyMark from './LiftyMark'

const LABEL = 'text-[10.5px] font-extrabold uppercase tracking-[1.5px] text-faint'
const QUIET = 'px-2 py-1.5 text-[12.5px] font-extrabold text-muted'

const SORTS: { id: Sort; label: string }[] = [
  { id: 'recent', label: 'Last trained' },
  { id: 'signup', label: 'Newest' },
  { id: 'sessions', label: 'Most sessions' },
  { id: 'email', label: 'A to Z' },
]

export default function AdminDashboard({ today, me }: { today: string; me: string }) {
  // Loaded when the toggle flips rather than on every profile visit, because
  // reading the whole auth table is not something a profile page should pay
  // for on the way past.
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [gaps, setGaps] = useState<GapRow[]>([])
  const [asked, setAsked] = useState<AskedRow[]>([])
  const [missed, setMissed] = useState(0)
  const [trend, setTrend] = useState<WeekBar[]>([])
  const [quietIds, setQuietIds] = useState<string[]>([])
  const [adoption, setAdoption] = useState<Record<string, number>>({})
  const [log, setLog] = useState<AdminLogRow[]>([])
  const [failed, setFailed] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('recent')
  const [open, setOpen] = useState<string | null>(null)
  const [note, setNote] = useState<{ id: string; text: string; bad?: boolean } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [gone, setGone] = useState<string[]>([])

  useEffect(() => {
    let alive = true
    fetch('/api/admin')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? 'This account is not an admin any more. Sign out and back in if that is a surprise.'
              : 'Could not load the list. Check that SUPABASE_SERVICE_ROLE_KEY is set.',
          )
        }
        return (await res.json()) as {
          users: AdminUser[]
          gaps?: GapRow[]
          asked?: AskedRow[]
          failedSearches?: number
          trend?: WeekBar[]
          quiet?: string[]
          adoption?: Record<string, number>
          log?: AdminLogRow[]
        }
      })
      .then((body) => {
        if (!alive) return
        setUsers(body.users)
        setGaps(body.gaps ?? [])
        setAsked(body.asked ?? [])
        setMissed(body.failedSearches ?? 0)
        setTrend(body.trend ?? [])
        setQuietIds(body.quiet ?? [])
        setAdoption(body.adoption ?? {})
        setLog(body.log ?? [])
      })
      .catch((e) => alive && setFailed(e instanceof Error ? e.message : 'Could not load the list.'))
    return () => {
      alive = false
    }
  }, [])

  const live = useMemo(() => (users ?? []).filter((u) => !gone.includes(u.id)), [users, gone])
  const sums = useMemo(() => totals(live, today), [live, today])
  const cold = useMemo(() => neverStarted(live), [live])
  const quiet = useMemo(() => live.filter((u) => quietIds.includes(u.id)), [live, quietIds])
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
      if (action === 'grant' || action === 'revoke') {
        setUsers((all) =>
          (all ?? []).map((u) => (u.id === user.id ? { ...u, admin: action === 'grant' } : u)),
        )
      }
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
    <div className="flex w-full flex-col">
      {users === null && !failed ? <p className="text-sm text-muted">Loading everybody.</p> : null}
      {failed ? (
        <p className="rounded-xl bg-card p-3.5 text-sm font-bold leading-relaxed text-alert ring-1 ring-edge">
          {failed}
        </p>
      ) : null}

      {/* The numbers that answer "is this working", not the ones that are easy
          to count. Signups matter less than whether anybody trained. */}
      <section className={users === null ? 'hidden' : ''}>
        <h2 className={LABEL}>The whole app</h2>
        <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="People" value={sums.users} note={`${sums.signupsThisWeek} this week`} />
          <Stat label="Trained in 7 days" value={sums.activeWeek} note={`${sums.activeMonth} in 28`} />
          <Stat label="Sessions" value={sums.sessions} note={`${sums.sets.toLocaleString()} sets`} />
          <Stat
            label="Weight moved"
            value={Math.round(sums.volume).toLocaleString()}
            note="pounds, all time"
          />
        </dl>
      </section>

      {/* The line every snapshot above cannot draw: sessions per week, twelve
          weeks, empty weeks included because a gap is the shape worth seeing. */}
      {trend.some((b) => b.sessions > 0) ? (
        <section className="mt-4">
          <h3 className={LABEL}>Sessions by week</h3>
          <div className="mt-2 flex h-16 items-end gap-1">
            {trend.map((bar) => {
              const max = Math.max(...trend.map((b) => b.sessions), 1)
              return (
                <div key={bar.start} className="flex-1" title={`${fmtDate(bar.start)}: ${bar.sessions}`}>
                  <div
                    className="w-full rounded-t bg-accent-ink"
                    style={{ height: `${Math.max(bar.sessions ? 8 : 2, (bar.sessions / max) * 64)}px` }}
                  />
                </div>
              )
            })}
          </div>
          <div className="mt-1 flex justify-between text-[10px] font-bold text-faint">
            <span>{fmtDate(trend[0].start)}</span>
            <span>this week</span>
          </div>
        </section>
      ) : null}

      {/* The leak out the back. The chip below catches people who never
          started; these are regulars who stopped, and at this scale the fix is
          a personal message, not a system. */}
      {quiet.length ? (
        <section className="mt-4">
          <h3 className={LABEL}>Went quiet</h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {quiet.map((u) => (
              <li
                key={u.id}
                className="flex items-baseline justify-between gap-3 rounded-2xl bg-card px-3.5 py-2.5 ring-1 ring-edge"
              >
                <span className="min-w-0 truncate text-sm font-bold">{u.email}</span>
                <span className="num shrink-0 text-xs font-bold text-muted">
                  {u.sessions} sessions, last {fmtDate(u.lastWorkout!)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {cold.length ? (
        <CoachChip bubble className="mt-4">
          <strong>{cold.length}</strong> {cold.length === 1 ? 'person has' : 'people have'} signed up
          and never logged a set{sums.onboarded < sums.users
            ? `, and ${sums.users - sums.onboarded} never finished the questionnaire`
            : ''}
          . That is the leak worth fixing before anything else.
        </CoachChip>
      ) : null}

      {/* Whether anything shipped lately has been touched by anybody. This is
          what decides what gets built next. */}
      <section className={`mt-6 ${users === null ? 'hidden' : ''}`}>
        <h2 className={LABEL}>Are the features being used</h2>
        <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Stat label="Shared" value={adoption.shares ?? 0} note="workout links" />
          <Stat label="Own workouts" value={adoption.customWorkouts ?? 0} note="built by hand" />
          <Stat label="Notes" value={adoption.notes ?? 0} note="on movements" />
          <Stat label="Nudges on" value={adoption.nudgesOn ?? 0} note="weekly check ins" />
          <Stat label="Phones" value={adoption.devices ?? 0} note="taking push" />
        </dl>
      </section>

      <section className={`mt-6 ${users === null ? 'hidden' : ''}`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className={LABEL}>People</h2>
          <div className="flex items-baseline gap-3">
            <span className="num text-xs font-bold text-faint">{shown.length} shown</span>
            <button onClick={exportCsv} className={QUIET}>
              Export CSV
            </button>
          </div>
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

      {/* What the library is missing, according to the people using it. Every
          row is somebody who searched, found nothing, and typed it in by hand.
          Nothing here promotes itself: the report points, a person adds the
          movement properly, typed and tiered, in lib/exercises.ts. */}
      {gaps.length ? (
        <section className="mt-6">
          <h3 className={LABEL}>What the library is missing</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Custom exercises people made because the picker did not have them. Two users on one row
            is the library being told something.
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {gaps.slice(0, 20).map((gap) => (
              <li
                key={gap.name}
                className="flex items-baseline justify-between gap-3 rounded-2xl bg-card px-3.5 py-2.5 ring-1 ring-edge"
              >
                <span className="min-w-0">
                  <span className="text-sm font-bold">{gap.name}</span>
                  {gap.group ? <span className="ml-2 text-xs text-muted">{gap.group}</span> : null}
                </span>
                <span className="num shrink-0 text-xs font-bold text-accent-ink">
                  {gap.users === 1 ? '1 user' : `${gap.users} users`}
                </span>
              </li>
            ))}
          </ul>
          {gaps.length > 20 ? (
            <p className="mt-1.5 text-xs text-muted">And {gaps.length - 20} more, below two users each.</p>
          ) : null}
        </section>
      ) : null}

      {/* What Lifty was asked and could not answer. The same argument as the
          exercise gaps and the same discipline: the report points, a person
          writes the entry into lib/knowledge.ts. Nothing here is answered
          automatically, because the panel's whole promise is that somebody
          wrote what it says. */}
      {asked.length ? (
        <section className="mt-6">
          <h3 className={LABEL}>What Lifty could not answer</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Questions people typed that the library had nothing for, most asked first. Each one is
            an entry waiting to be written.
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {unanswered(asked).slice(0, 25).map((row) => (
              <li
                key={row.question}
                className="flex items-baseline justify-between gap-3 rounded-2xl bg-card px-3.5 py-2.5 ring-1 ring-edge"
              >
                <span className="min-w-0 text-sm font-bold">{row.question}</span>
                <span className="num shrink-0 text-xs font-bold text-accent-ink">
                  {row.people === 1 ? '1 person' : `${row.people} people`}
                </span>
              </li>
            ))}
          </ul>
          {unanswered(asked).length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Nothing asked has gone unanswered yet.
            </p>
          ) : null}
          {/* What people search and do find, which is the only honest basis
              for the four questions the panel puts up front. Those four are
              hand picked today, chosen before anybody had asked anything. */}
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Most searched overall:{' '}
            {asked.slice(0, 3).map((r) => r.question).join(', ') || 'nothing yet'}.
          </p>
        </section>
      ) : null}

      {/* The gap report's other finding: people who created a movement the
          library already has did not fail to find a gap, they failed to find
          the search. */}
      {missed > 0 ? (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {missed === 1 ? '1 person has' : `${missed} people have`} created movements the library
          already has. That is the picker's search failing, not a gap.
        </p>
      ) : null}

      {/* Who did what, to whom, when. Admin can be granted from this screen,
          and the moment a second admin exists, a ban with no record is a
          hole. */}
      {log.length ? (
        <section className="mt-6">
          <h3 className={LABEL}>Recent admin activity</h3>
          <ul className="mt-2 flex flex-col gap-1">
            {log.map((row, i) => (
              <li key={`${row.at}-${i}`} className="text-xs leading-relaxed text-muted">
                <span className="font-bold text-fg">{row.actorEmail}</span> {row.action}{' '}
                <span className="font-bold text-fg">{row.targetEmail}</span>
                <span className="text-faint"> &middot; {fmtDate(row.at)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
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
  const [asking, setAsking] = useState(false)
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
          {user.admin ? ' · admin' : ''}
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
            <Detail label="Weight moved" value={`${Math.round(user.volume).toLocaleString()} lb`} />
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

          {/* Handing somebody admin is handing them everybody else's training
              and the ability to delete it, so it asks twice. */}
          {!isMe ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-ink px-3 py-2.5 ring-1 ring-edge">
              <span className="flex-1 text-xs font-bold">
                {user.rootAdmin
                  ? 'Admin, set in the environment'
                  : user.admin
                    ? 'Admin'
                    : 'Make an admin'}
                <span className="mt-0.5 block text-[11px] font-normal leading-relaxed text-muted">
                  {user.rootAdmin
                    ? 'Named in ADMIN_EMAILS, so this screen cannot take it away.'
                    : 'Sees every account here, and can delete any of them.'}
                </span>
              </span>
              {!user.rootAdmin ? (
                <button
                  onClick={() =>
                    user.admin
                      ? onAct(user, 'revoke', 'Admin removed')
                      : asking
                        ? onAct(user, 'grant', 'Made an admin')
                        : setAsking(true)
                  }
                  disabled={!!busy}
                  aria-pressed={user.admin}
                  className={`rounded-lg px-3 py-2 text-[12.5px] font-extrabold ${
                    user.admin
                      ? 'text-muted'
                      : asking
                        ? 'bg-accent text-on-accent'
                        : 'text-accent-ink ring-1 ring-edge'
                  }`}
                >
                  {working('grant') || working('revoke')
                    ? 'Working'
                    : user.admin
                      ? 'Remove admin'
                      : asking
                        ? 'Yes, make them admin'
                        : 'Make admin'}
                </button>
              ) : null}
            </div>
          ) : null}

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
