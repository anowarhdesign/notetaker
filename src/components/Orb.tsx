import { useEffect, useRef } from 'react'
import { level } from '../lib/recorder'

/**
 * The signature element: a soft, living blob. Idle it breathes; while
 * listening it is pushed outward by the live frequency spectrum.
 */
export function Orb({ size = 44, active = false, paused = false }: { size?: number; active?: boolean; paused?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = size * dpr
    cv.height = size * dpr
    const ctx = cv.getContext('2d')!
    ctx.scale(dpr, dpr)
    const css = getComputedStyle(cv)
    const ember = css.getPropertyValue('--ember').trim() || '#ef5b2b'
    const ember2 = css.getPropertyValue('--ember-2').trim() || '#ffb38a'
    let raf = 0
    let smooth = 0
    const N = 48
    const draw = (time: number) => {
      const t = time / 1000
      const target = active && !paused ? level.value : 0
      smooth += (target - smooth) * 0.15
      ctx.clearRect(0, 0, size, size)
      const cx = size / 2
      const cy = size / 2
      const R = size * 0.3

      // halo
      const halo = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, size / 2)
      halo.addColorStop(0, ember + (active ? '55' : '22'))
      halo.addColorStop(1, ember + '00')
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2)
      ctx.fill()

      // blob
      ctx.beginPath()
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2
        const bin = level.bins[Math.floor((Math.abs(Math.sin(a * 1.5)) * level.bins.length) / 2)] ?? 0
        const breathe = Math.sin(t * 1.6 + a * 3) * 0.04 + Math.sin(t * 0.9 - a * 2) * 0.03
        const push = active && !paused ? (bin / 255) * 0.32 * (0.4 + smooth) : 0
        const r = R * (1 + breathe + push + smooth * 0.12)
        const x = cx + Math.cos(a) * r
        const y = cy + Math.sin(a) * r
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R * 1.3)
      g.addColorStop(0, ember2)
      g.addColorStop(0.55, ember)
      g.addColorStop(1, ember)
      ctx.fillStyle = paused ? css.getPropertyValue('--ink-3').trim() || '#8a857c' : g
      ctx.fill()

      // glint
      ctx.beginPath()
      ctx.ellipse(cx - R * 0.32, cy - R * 0.38, R * 0.22, R * 0.12, -0.6, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.fill()

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [size, active, paused])

  return <canvas ref={ref} className="orb" style={{ width: size, height: size }} aria-hidden />
}
