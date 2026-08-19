// The robot head with a kettlebell handle and a visible brain: strength plus
// smarts. Drawn once into the document as a hidden sprite and referenced by
// every place that shows it, which is what the design does and what keeps the
// gradient ids unique no matter how many marks are on a page.
//
// The dark outline is part of the drawing. Per the brand guide it is never
// removed, never recoloured, never rotated, and never used below 32px.

export const MARK_ID = 'lb-mark'

export function LiftySprite() {
  return (
    <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <defs>
        <linearGradient id="lbHead" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EEF2F7" />
          <stop offset="0.55" stopColor="#CFD8E2" />
          <stop offset="1" stopColor="#AEB9C7" />
        </linearGradient>
        <linearGradient id="lbScreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1B2839" />
          <stop offset="1" stopColor="#0D1522" />
        </linearGradient>
        <linearGradient id="lbHandle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D9EF74" />
          <stop offset="1" stopColor="#B3D343" />
        </linearGradient>
        <linearGradient id="lbEar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D8F2F7" />
          <stop offset="1" stopColor="#9AC4D0" />
        </linearGradient>
        <radialGradient id="lbEye" cx="0.38" cy="0.32" r="0.85">
          <stop offset="0" stopColor="#F2FEFF" />
          <stop offset="0.45" stopColor="#A9F2FF" />
          <stop offset="1" stopColor="#3EC8E6" />
        </radialGradient>
        <filter id="lbSoft" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <clipPath id="lbClip">
          <rect x="76" y="186" width="168" height="74" rx="26" />
        </clipPath>
        <g id={MARK_ID}>
          <path
            d="M 126 130 L 126 102 Q 126 54 160 54 Q 194 54 194 102 L 194 130"
            fill="none" stroke="#0F1826" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round"
          />
          <path
            d="M 126 130 L 126 102 Q 126 54 160 54 Q 194 54 194 102 L 194 130"
            fill="none" stroke="url(#lbHandle)" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round"
          />
          <path d="M 138 67 Q 148 57 160 56" fill="none" stroke="#E7F7A3" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
          <rect x="32" y="192" width="34" height="52" rx="14" fill="url(#lbEar)" stroke="#0F1826" strokeWidth="8" />
          <rect x="254" y="192" width="34" height="52" rx="14" fill="url(#lbEar)" stroke="#0F1826" strokeWidth="8" />
          <rect x="58" y="116" width="204" height="156" rx="52" fill="url(#lbHead)" stroke="#0F1826" strokeWidth="9" />
          <rect x="66" y="124" width="188" height="140" rx="44" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.25" />
          <rect x="102" y="108" width="116" height="78" rx="22" fill="#0F1826" />
          <rect x="107" y="113" width="106" height="68" rx="17" fill="#131D2B" stroke="#C7E45A" strokeWidth="5" />
          <path
            d="M 160 121 A 11 11 0 0 1 181 124 A 11 11 0 0 1 196 134 A 10 10 0 0 1 201 148 A 10 10 0 0 1 193 159 A 10 10 0 0 1 178 165 A 11 11 0 0 1 160 164 A 11 11 0 0 1 142 165 A 10 10 0 0 1 127 159 A 10 10 0 0 1 119 148 A 10 10 0 0 1 124 134 A 11 11 0 0 1 139 124 A 11 11 0 0 1 160 121 Z"
            fill="#C7E45A" stroke="#0F1826" strokeWidth="6" strokeLinejoin="round"
          />
          <path d="M 160 125 C 156 138 164 150 160 163" fill="none" stroke="#0F1826" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M 137 133 Q 147 138 143 147" fill="none" stroke="#0F1826" strokeWidth="4.5" strokeLinecap="round" opacity="0.9" />
          <path d="M 129 151 Q 139 149 138 158" fill="none" stroke="#0F1826" strokeWidth="4.5" strokeLinecap="round" opacity="0.9" />
          <path d="M 183 133 Q 173 138 177 147" fill="none" stroke="#0F1826" strokeWidth="4.5" strokeLinecap="round" opacity="0.9" />
          <path d="M 191 151 Q 181 149 182 158" fill="none" stroke="#0F1826" strokeWidth="4.5" strokeLinecap="round" opacity="0.9" />
          <rect x="76" y="186" width="168" height="74" rx="26" fill="url(#lbScreen)" stroke="#0F1826" strokeWidth="8" />
          <g clipPath="url(#lbClip)">
            <path d="M 150 186 L 226 186 L 176 260 L 128 260 Z" fill="#FFFFFF" opacity="0.06" />
            <path d="M 236 186 L 252 186 L 204 260 L 188 260 Z" fill="#FFFFFF" opacity="0.05" />
            <ellipse cx="160" cy="264" rx="78" ry="20" fill="#1E93B8" opacity="0.3" filter="url(#lbSoft)" />
          </g>
          <ellipse cx="122" cy="222" rx="20" ry="15.5" fill="#35CDEB" opacity="0.75" filter="url(#lbSoft)" />
          <ellipse cx="198" cy="222" rx="20" ry="15.5" fill="#35CDEB" opacity="0.75" filter="url(#lbSoft)" />
          <ellipse cx="122" cy="222" rx="20" ry="15.5" fill="url(#lbEye)" />
          <ellipse cx="198" cy="222" rx="20" ry="15.5" fill="url(#lbEye)" />
          <circle cx="114.5" cy="215" r="5" fill="#FFFFFF" />
          <circle cx="129" cy="230" r="2.4" fill="#FFFFFF" opacity="0.8" />
          <circle cx="190.5" cy="215" r="5" fill="#FFFFFF" />
          <circle cx="205" cy="230" r="2.4" fill="#FFFFFF" opacity="0.8" />
          <path d="M 146 243 Q 160 253 174 243" fill="none" stroke="#35CDEB" strokeWidth="9" strokeLinecap="round" opacity="0.6" filter="url(#lbSoft)" />
          <path d="M 146 243 Q 160 253 174 243" fill="none" stroke="#A5F0FA" strokeWidth="6" strokeLinecap="round" />
        </g>
      </defs>
    </svg>
  )
}

// The mark keeps its 320 by 300 proportions at every size, so one number is
// enough to place it.
export default function LiftyMark({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 320 300"
      width={size}
      height={Math.round((size * 300) / 320)}
      aria-hidden="true"
      className={className}
      style={{ display: 'block' }}
    >
      <use href={`#${MARK_ID}`} />
    </svg>
  )
}
