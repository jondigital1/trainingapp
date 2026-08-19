import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'

// The app icon: the LiftyBot mark on Midnight, at the sizes iOS and Android
// ask for. Rasterised from the one vector rather than committed as binaries,
// so there is a single definition of the logo in this repo and the PNGs cannot
// drift away from the SVG.
//
// The brand guide asks for the mark alone on the Midnight field with room
// around it, which is the 12 percent padding below.
const SIZES = ['180', '192', '512'] as const

export const dynamic = 'force-static'

export function generateStaticParams() {
  return SIZES.map((size) => ({ size }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params
  const n = Number(size)
  if (!Number.isFinite(n) || n <= 0 || n > 1024) return new Response('bad size', { status: 400 })

  const svg = await readFile(join(process.cwd(), 'public', 'favicon.svg'), 'utf8')
  const mark = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  const inner = Math.round(n * 0.76)

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: n,
          height: n,
          background: '#0b121d',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mark} width={inner} height={inner} alt="" />
      </div>
    ),
    { width: n, height: n },
  )
}
