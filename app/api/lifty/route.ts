import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import * as db from '@/lib/db'
import { DAILY_CAP, readQuestion, systemPrompt, trainingContext } from '@/lib/lifty'

// Where Ask Lifty gets its answer.
//
// The key lives here and nowhere else. It is read from the environment on the
// server, it is never prefixed NEXT_PUBLIC, and the `server-only` import above
// makes the build fail rather than the key ship if this file is ever pulled
// into a client component.
//
// Absent key is not an error, it is off. The sheet falls back to the keyword
// search it used before, so this ships inert and nothing changes until a key
// exists.

export const runtime = 'nodejs'
// The answer streams, so this must not be cached or collapsed.
export const dynamic = 'force-dynamic'

const MODEL = 'claude-opus-5'

export async function POST(request: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return NextResponse.json({ error: 'not configured' }, { status: 503 })

  const sb = await supabaseServer()
  const { data: auth, error: authError } = await sb.auth.getUser()
  if (authError || !auth.user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  const userId = auth.user.id

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'unreadable body' }, { status: 400 })
  }
  const asked = readQuestion(body)
  if (!asked.ok) return NextResponse.json({ error: asked.error }, { status: 400 })

  // The fuse. Counted off the table the sheet already writes every question to,
  // so it costs one query and no new storage. Nobody needs sixty answers in a
  // day, and without this one account can spend the key.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await sb
    .from('asked_questions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('at', since)
  if ((count ?? 0) > DAILY_CAP) {
    return NextResponse.json({ error: 'asked enough for today' }, { status: 429 })
  }

  // Read under their own session rather than the service role, so row level
  // security is what guarantees this is their log and nobody else's.
  let context = ''
  try {
    const data = await db.loadAll(sb, userId)
    context = trainingContext({
      profile: data.settings.profile,
      goal: data.settings.goal,
      workouts: data.workouts,
      sore: data.settings.profile?.sore,
      redFlag: data.settings.profile?.redFlag,
    })
  } catch {
    // An answer without their log is worse than one with it and much better
    // than an error. The prompt already says to ignore empty context.
    context = ''
  }

  const client = new Anthropic({ apiKey: key })

  try {
    // Cached on the system prompt, which is the whole library and never varies.
    // About 14,400 tokens: full price once, then roughly a tenth of that on
    // every question after it. Everything that changes about a request is
    // below the breakpoint, in the message.
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      system: [{ type: 'text', text: systemPrompt(), cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: context
            ? `<their_training>\n${context}\n</their_training>\n\n${asked.question}`
            : asked.question,
        },
      ],
    })

    const encoder = new TextEncoder()
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta' &&
              event.delta.text
            ) {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
          const final = await stream.finalMessage()
          // A safety decline is not a failure to report as one: it means the
          // question was something this should not answer, and the sheet says
          // so rather than showing an empty box.
          if (final.stop_reason === 'refusal') {
            controller.enqueue(
              encoder.encode('That is not something I can help with. Worth asking a doctor or a coach.'),
            )
          }
        } catch {
          controller.enqueue(encoder.encode('\n\nSomething went wrong reaching Lifty. Try again in a minute.'))
        } finally {
          controller.close()
        }
      },
      cancel() {
        stream.abort()
      },
    })

    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        // Nothing between here and the phone may sit on the bytes: a streamed
        // answer that arrives all at once is a slow answer.
        'X-Accel-Buffering': 'no',
      },
    })
  } catch {
    return NextResponse.json({ error: 'could not reach Lifty' }, { status: 502 })
  }
}
