// A very small PDF writer.
//
// Sharing a session had to produce a real file, not a screenshot and not a
// link, because the person on the other end is a training partner or a coach
// who wants to read it and keep it. A PDF is the one format every phone, every
// mail client and every messaging app will open without asking questions.
//
// It is written by hand rather than pulled in, for two reasons. Every PDF
// library worth using is larger than this entire app, and it would have to be
// downloaded before a share could happen, which breaks the one case that
// matters most: standing in a gym on a bad connection having just finished.
// Text in one of the fourteen fonts every reader has built in needs no font
// embedding, no compression and no image support, so what is left is a few
// hundred lines of object plumbing.
//
// Nothing here is general purpose. It lays out left aligned lines of text in
// four styles, wraps them, breaks pages, and stops.

export type Style = 'title' | 'heading' | 'body' | 'muted' | 'gap' | 'rule'

export interface Line {
  text?: string
  style?: Style
  indent?: number
}

interface StyleSpec {
  size: number
  bold: boolean
  grey: number
  lead: number
}

const STYLES: Record<Exclude<Style, 'gap' | 'rule'>, StyleSpec> = {
  title: { size: 19, bold: true, grey: 0.1, lead: 26 },
  heading: { size: 11.5, bold: true, grey: 0.15, lead: 17 },
  body: { size: 10, bold: false, grey: 0.2, lead: 14.5 },
  muted: { size: 9, bold: false, grey: 0.45, lead: 13 },
}

const PAGE_W = 595
const PAGE_H = 842
const MARGIN = 54
const TOP = PAGE_H - 62
const BOTTOM = 58

// Helvetica advance widths, in thousandths of the font size, for the printable
// WinAnsi range this app can produce. Real metrics rather than a guess, because
// wrapping against a guess puts the break in the wrong place on long movement
// names.
const WIDTHS_UPPER = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
]
const BOLD_UPPER = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
]

function charWidth(code: number, bold: boolean): number {
  const table = bold ? BOLD_UPPER : WIDTHS_UPPER
  if (code >= 32 && code <= 126) return table[code - 32]
  // The handful above 127 this app actually emits: the multiplication sign and
  // the middle dot. Anything else has already been folded down to ASCII.
  if (code === 0xd7) return 584
  if (code === 0xb7) return bold ? 333 : 278
  return table[0]
}

function widthOf(text: string, size: number, bold: boolean): number {
  let total = 0
  for (let i = 0; i < text.length; i += 1) total += charWidth(text.charCodeAt(i), bold)
  return (total * size) / 1000
}

// Everything outside WinAnsi is folded to something a reader has. Curly quotes
// come out of names people type, and an unmapped byte is a corrupt file rather
// than a missing glyph, so this is not cosmetic.
const FOLD: Record<string, string> = {
  '‘': "'", '’': "'", '“': '"', '”': '"',
  '–': '-', '—': '-', '…': '...', ' ': ' ',
}

function clean(text: string): string {
  let out = ''
  for (const ch of text) {
    const folded = FOLD[ch] ?? ch
    for (const c of folded) out += c.charCodeAt(0) <= 0xff ? c : '?'
  }
  return out
}

function escape(text: string): string {
  return text.replace(/([\\()])/g, '\\$1')
}

function wrap(text: string, size: number, bold: boolean, width: number): string[] {
  const words = text.split(' ')
  const out: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (current && widthOf(next, size, bold) > width) {
      out.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) out.push(current)
  return out.length ? out : ['']
}

export function buildPdf(lines: Line[]): Uint8Array {
  const pages: string[] = []
  let body = ''
  let y = TOP

  const newPage = () => {
    pages.push(body)
    body = ''
    y = TOP
  }

  for (const line of lines) {
    if (line.style === 'gap') {
      y -= 8
      continue
    }
    if (line.style === 'rule') {
      if (y - 10 < BOTTOM) newPage()
      y -= 6
      body += `q 0.85 G 0.6 w ${MARGIN} ${round(y)} m ${PAGE_W - MARGIN} ${round(y)} l S Q\n`
      y -= 10
      continue
    }
    const spec = STYLES[(line.style ?? 'body') as Exclude<Style, 'gap' | 'rule'>]
    const indent = line.indent ?? 0
    const x = MARGIN + indent
    const width = PAGE_W - MARGIN - x
    // A heading alone at the foot of a page is a movement whose sets are on
    // the next one. Needing room for the heading and two rows under it keeps
    // them together.
    const need = spec.lead + (line.style === 'heading' ? STYLES.body.lead * 2 : 0)
    if (y - need < BOTTOM) newPage()

    for (const piece of wrap(clean(line.text ?? ''), spec.size, spec.bold, width)) {
      if (y - spec.lead < BOTTOM) newPage()
      y -= spec.lead
      body +=
        `BT /${spec.bold ? 'F2' : 'F1'} ${spec.size} Tf ${spec.grey} g ` +
        `1 0 0 1 ${round(x)} ${round(y)} Tm (${escape(piece)}) Tj ET\n`
    }
  }
  pages.push(body)

  return assemble(pages)
}

function round(n: number): string {
  return String(Math.round(n * 100) / 100)
}

// Objects are numbered 1 catalog, 2 pages, 3 and 4 the two fonts, then a page
// and a content stream for each page. The cross reference table needs the byte
// offset of every one of them, so the file is built as a list of chunks and
// measured as it goes.
function assemble(pages: string[]): Uint8Array {
  const count = pages.length
  const pageIds = pages.map((_, i) => 5 + i * 2)
  const objects: string[] = []

  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  objects.push(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${count} >>`,
  )
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')

  pages.forEach((content, i) => {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageIds[i] + 1} 0 R >>`,
    )
    objects.push(`<< /Length ${byteLength(content)} >>\nstream\n${content}endstream`)
  })

  let file = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((obj, i) => {
    offsets.push(byteLength(file))
    file += `${i + 1} 0 obj\n${obj}\nendobj\n`
  })

  const xref = byteLength(file)
  file += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) file += `${String(offset).padStart(10, '0')} 00000 n \n`
  file += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`

  return latin1(file)
}

// Every byte in the file is one character, because the content is WinAnsi and
// the structure is ASCII. That is what makes measuring offsets by string length
// safe here, and it is why clean() runs on every line before it gets in.
function byteLength(text: string): number {
  return text.length
}

function latin1(text: string): Uint8Array {
  const out = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i += 1) out[i] = text.charCodeAt(i) & 0xff
  return out
}
