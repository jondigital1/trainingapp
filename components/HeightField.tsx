'use client'

import { useState } from 'react'
import { Field, NumberInput } from './Form'
import type { Unit } from '@/lib/units'

/**
 * How tall you are, asked in the units you already said you think in.
 *
 * This was written out twice, once at signup and once in Settings, and the
 * copies had come apart. Signup asks for centimetres if you chose kilos;
 * Settings only ever offered feet and inches, so somebody on kilos could set
 * their height once and never edit it in their own units again.
 *
 * Stored in inches whichever box it arrived in, because one stored unit is how
 * the two boxes stay one answer.
 */
export default function HeightField({
  inches,
  unit,
  placeholders,
  onChange,
}: {
  inches: number | undefined
  unit: Unit
  // Signup shows an example in the empty box, because a blank form asking for
  // a number is a harder question than it looks. Settings does not, because by
  // then the box has your answer in it.
  placeholders?: boolean
  onChange: (inches: number | undefined) => void
}) {
  // Seeded once. After that the boxes hold what you typed, not a number
  // rounded through inches and handed back while you are still typing it.
  const [ft, setFt] = useState(inches != null ? String(Math.floor(inches / 12)) : '')
  const [inch, setInch] = useState(inches != null ? String(Math.round(inches % 12)) : '')
  const [cm, setCm] = useState(inches != null ? String(Math.round(inches * 2.54)) : '')

  const report = (nextFt: string, nextInch: string, nextCm: string) => {
    if (unit === 'kg') {
      const n = Number(nextCm)
      onChange(Number.isFinite(n) && n > 0 ? n / 2.54 : undefined)
      return
    }
    const f = Number(nextFt)
    const i = Number(nextInch)
    onChange(Number.isFinite(f) && f > 0 ? f * 12 + (Number.isFinite(i) ? i : 0) : undefined)
  }

  return (
    <Field label="Height" optional>
      {unit === 'kg' ? (
        <NumberInput
          value={cm}
          onChange={(v) => {
            setCm(v)
            report(ft, inch, v)
          }}
          suffix="cm"
          placeholder={placeholders ? '178' : undefined}
        />
      ) : (
        <div className="flex gap-2">
          <NumberInput
            value={ft}
            onChange={(v) => {
              setFt(v)
              report(v, inch, cm)
            }}
            suffix="ft"
            placeholder={placeholders ? '5' : undefined}
          />
          <NumberInput
            value={inch}
            onChange={(v) => {
              setInch(v)
              report(ft, v, cm)
            }}
            suffix="in"
            placeholder={placeholders ? '10' : undefined}
          />
        </div>
      )}
    </Field>
  )
}
