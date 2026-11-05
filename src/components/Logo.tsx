/**
 * The Murmur mark: the letter m drawn as a sound wave that rises, with the red
 * recording light as its full stop. The light pulses while Murmur is listening.
 */
export function LogoMark({ size = 28, live = false }: { size?: number; live?: boolean }) {
  return (
    <svg className={`logo-mark ${live ? 'live' : ''}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M10 52 V36 Q10 24 20 24 Q30 24 30 36 V52 M30 36 Q30 12 42 12 Q54 12 54 36 V52"
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle className="logo-light" cx="54" cy="58" r="4" />
    </svg>
  )
}

export function Logo({ size = 28, live = false }: { size?: number; live?: boolean }) {
  return (
    <span className="logo">
      <LogoMark size={size} live={live} />
      <span className="logo-word">murmur</span>
    </span>
  )
}
