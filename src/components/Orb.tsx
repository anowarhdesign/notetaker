import { useEffect, useRef } from 'react'
import { level } from '../lib/recorder'

/**
 * The signature element: a little red-pen waveform. Idle it breathes; while
 * listening each bar follows a slice of the live frequency spectrum.
 * (Kept the name `Orb` so call sites stay the same.)
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
    const pen = css.getPropertyValue('--ember').trim() || '#c63b2a'
    const muted = css.getPropertyValue('--ink-3').trim() || '#5b5f6b'
    const bars = size >= 100 ? 9 : size >= 60 ? 7 : 5
    const gap = size / (bars * 2.4)
    const w = Math.max(2, (size * 0.72 - gap * (bars - 1)) / bars)
    const x0 = (size - (w * bars + gap * (bars - 1))) / 2
    const smooth = new Array<number>(bars).fill(0)
    let raf = 0

    const draw = (time: number) => {
      const t = time / 1000
      const live = active && !paused
      ctx.clearRect(0, 0, size, size)
      ctx.fillStyle = paused ? muted : pen
      for (let i = 0; i < bars; i++) {
        const bin = level.bins[Math.floor(((i + 1) / (bars + 1)) * (level.bins.length * 0.6))] ?? 0
        const idle = 0.22 + Math.sin(t * 2.1 + i * 0.9) * 0.08 + Math.sin(t * 1.3 - i * 1.7) * 0.05
        const target = live ? Math.max(idle, Math.min(1, (bin / 255) * 1.2 + level.value * 0.4)) : paused ? 0.18 : idle
        smooth[i] = smooth[i]! + (target - smooth[i]!) * 0.2
        const h = Math.max(w, size * 0.82 * smooth[i]!)
        const x = x0 + i * (w + gap)
        const y = (size - h) / 2
        ctx.beginPath()
        ctx.roundRect(x, y, w, h, w / 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [size, active, paused])

  return <canvas ref={ref} className="orb" style={{ width: size, height: size }} aria-hidden />
}
