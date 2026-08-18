import { ImageResponse } from 'next/og'

// The app icon, drawn rather than committed, so there are no binary assets in
// the repo and every size is generated from one definition. A barbell in the
// accent on the app's own dark ground: it has to read at 48px on a home screen.
const SIZES = ['180', '192', '512'] as const

export const dynamic = 'force-static'

export function generateStaticParams() {
  return SIZES.map((size) => ({ size }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params
  const n = Number(size)
  if (!Number.isFinite(n) || n <= 0 || n > 1024) return new Response('bad size', { status: 400 })

  // Laid out at 512 and scaled, so the proportions hold at every size.
  const k = n / 512
  const px = (v: number) => Math.round(v * k)
  const bar = { w: 320, h: 22, x: 96 }
  const inner = { w: 46, h: 168, l: 150, r: 316 }
  const outer = { w: 30, h: 110, l: 104, r: 378 }
  const mid = (h: number) => (n - px(h)) / 2
  const plate = (x: number, w: number, h: number, radius: number) => ({
    position: 'absolute' as const,
    left: px(x),
    top: mid(h),
    width: px(w),
    height: px(h),
    background: '#e8613c',
    borderRadius: px(radius),
  })

  return new ImageResponse(
    (
      <div
        style={{
          position: 'relative',
          display: 'flex',
          width: n,
          height: n,
          background: '#0c0e12',
        }}
      >
        <div style={plate(bar.x, bar.w, bar.h, 11)} />
        <div style={plate(outer.l, outer.w, outer.h, 12)} />
        <div style={plate(inner.l, inner.w, inner.h, 16)} />
        <div style={plate(inner.r, inner.w, inner.h, 16)} />
        <div style={plate(outer.r, outer.w, outer.h, 12)} />
      </div>
    ),
    { width: n, height: n },
  )
}
