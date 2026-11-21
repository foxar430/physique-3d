import { useEffect, useRef } from 'react'
import { y, yS, lambda, shownTime } from './model.js'

/**
 * « Aspect de la surface » : coupe y(r) le long de la direction de propagation, à l'instant affiché.
 * Repères : position de M, longueur d'onde λ, front d'onde.
 */
export default function WaveChart({ sim, rMax = 20, kind = 'space' }) {
  const ref = useRef(null)
  useEffect(() => {
    const cv = ref.current
    const ctx = cv.getContext('2d')
    let raf
    const draw = () => {
      const p = sim.paramsRef.current
      const t = shownTime(sim.stateRef.current.t, p)
      const dpr = window.devicePixelRatio || 1
      const Wd = cv.clientWidth
      const Hd = cv.clientHeight
      if (cv.width !== Math.round(Wd * dpr) || cv.height !== Math.round(Hd * dpr)) {
        cv.width = Math.round(Wd * dpr)
        cv.height = Math.round(Hd * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const css = getComputedStyle(cv)
      const fg = css.getPropertyValue('--text-2').trim() || '#666'
      const grid = css.getPropertyValue('--grid').trim() || '#ddd'
      ctx.clearRect(0, 0, Wd, Hd)
      const L = 52, R = 12, T = 22, B = 26
      const lim = p.a * 1.25
      const X = (r) => L + (r / rMax) * (Wd - L - R)
      const Y = (v) => T + (1 - (v + lim) / (2 * lim)) * (Hd - T - B)

      if (kind === 'time') {
        drawTime(ctx, sim.stateRef.current.t, p, Wd, Hd, fg, grid)
        raf = requestAnimationFrame(draw)
        return
      }
      ctx.font = '11px system-ui, sans-serif'
      ctx.strokeStyle = grid
      ctx.fillStyle = fg
      ctx.lineWidth = 1
      for (let c = 0; c <= rMax; c += 2) {
        ctx.beginPath(); ctx.moveTo(X(c), T); ctx.lineTo(X(c), Hd - B); ctx.stroke()
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'
        ctx.fillText(c, X(c), Hd - B + 6)
      }
      for (const v of [-p.a, 0, p.a]) {
        ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(Wd - R, Y(v)); ctx.stroke()
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
        ctx.fillText(+v.toFixed(1), L - 6, Y(v))
      }
      ctx.textAlign = 'left'; ctx.textBaseline = 'top'
      ctx.fillText('y (mm)', 4, 4)
      ctx.textAlign = 'right'
      ctx.fillText(p.mode === 'rect' ? 'x (cm)' : 'r = SM (cm)', Wd - R, Hd - 12)

      // front d'onde
      const front = p.v * t * 100
      if (front < rMax) {
        ctx.setLineDash([3, 4]); ctx.strokeStyle = '#8a8f98'
        ctx.beginPath(); ctx.moveTo(X(front), T); ctx.lineTo(X(front), Hd - B); ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = '#8a8f98'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'
        ctx.fillText('front', X(front) + 3, T + 2)
      }

      // courbe
      ctx.strokeStyle = '#3e9bff'
      ctx.lineWidth = 2
      ctx.beginPath()
      const n = 600
      for (let k = 0; k <= n; k++) {
        const r = (k / n) * rMax
        const v = y(r / 100, t, p)
        k ? ctx.lineTo(X(r), Y(v)) : ctx.moveTo(X(r), Y(v))
      }
      ctx.stroke()

      // point M
      const yM = y(p.d / 100, t, p)
      ctx.fillStyle = '#e5484d'
      ctx.beginPath(); ctx.arc(X(p.d), Y(yM), 5, 0, 2 * Math.PI); ctx.fill()
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
      ctx.fillText('M', X(p.d), Y(yM) - 7)

      // λ : double flèche entre deux crêtes déjà atteintes
      const lam = lambda(p) * 100
      if (!p.pulse && front > lam * 1.6) {
        // crête : phase t − r/v = T/4 + kT  →  r = v(t − T/4 − kT)
        const T0 = 1 / p.N
        let r1 = (((p.v * (t - T0 / 4) * 100) % lam) + lam) % lam
        if (r1 < lam * 0.25) r1 += lam // première crête au-delà de λ/4
        const r2 = r1 + lam
        if (r2 < Math.min(front, rMax)) {
          const yy = Y(p.a) - 8
          ctx.strokeStyle = '#e0a000'; ctx.fillStyle = '#e0a000'; ctx.lineWidth = 1.5
          ctx.beginPath(); ctx.moveTo(X(r1), yy); ctx.lineTo(X(r2), yy); ctx.stroke()
          for (const [xa, s] of [[X(r1), 1], [X(r2), -1]]) {
            ctx.beginPath(); ctx.moveTo(xa, yy); ctx.lineTo(xa + 6 * s, yy - 4); ctx.lineTo(xa + 6 * s, yy + 4); ctx.fill()
          }
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
          ctx.fillText('λ', (X(r1) + X(r2)) / 2, yy - 2)
        }
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [sim, rMax, kind])

  return (
    <figure className="chart">
      <figcaption>{kind === 'time' ? 'Élongations de la source S et du point M' : 'Aspect de la surface à l’instant t (coupe)'}</figcaption>
      <canvas ref={ref} />
    </figure>
  )
}

/** y_S(t) et y_M(t) calculés point par point (pas d'échantillonnage : juste même en temps réel). */
function drawTime(ctx, t, p, Wd, Hd, fg, grid) {
  const T = 1 / p.N
  const theta = p.d / 100 / p.v
  const win = Math.max(5 * T, 1.3 * theta + 3 * T)
  const t0 = Math.max(0, t - win)
  const t1 = t0 + win
  const L = 52, R = 12, Tp = 22, B = 26
  const lim = p.a * 1.3
  const X = (tt) => L + ((tt - t0) / win) * (Wd - L - R)
  const Y = (v) => Tp + (1 - (v + lim) / (2 * lim)) * (Hd - Tp - B)
  ctx.font = '11px system-ui, sans-serif'
  ctx.strokeStyle = grid
  ctx.fillStyle = fg
  ctx.lineWidth = 1
  const step0 = (win * 1000) / 6
  const mag = Math.pow(10, Math.floor(Math.log10(step0)))
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= step0) / 1000
  for (let tt = Math.ceil(t0 / step) * step; tt <= t1 + 1e-9; tt += step) {
    ctx.beginPath(); ctx.moveTo(X(tt), Tp); ctx.lineTo(X(tt), Hd - B); ctx.stroke()
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    ctx.fillText(+(tt * 1000).toPrecision(6), X(tt), Hd - B + 6)
  }
  for (const v of [-p.a, 0, p.a]) {
    ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(Wd - R, Y(v)); ctx.stroke()
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
    ctx.fillText(+v.toFixed(1), L - 6, Y(v))
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillText('y (mm)', 4, 4)
  ctx.textAlign = 'right'
  ctx.fillText('t (ms)', Wd - R, Hd - 12)
  if (theta >= t0 && theta <= t1) {
    ctx.setLineDash([5, 4]); ctx.strokeStyle = '#8a8f98'; ctx.fillStyle = '#8a8f98'
    ctx.beginPath(); ctx.moveTo(X(theta), Tp); ctx.lineTo(X(theta), Hd - B); ctx.stroke()
    ctx.setLineDash([])
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'
    ctx.fillText('θ', X(theta) + 4, Tp + 2)
  }
  const curves = [
    ['y_S(t)', '#e0a000', (tt) => yS(tt, p)],
    ['y_M(t)', '#e5484d', (tt) => y(p.d / 100, tt, p)],
  ]
  const tEnd = Math.min(t, t1)
  const n = 900
  for (const [, c, f] of curves) {
    ctx.strokeStyle = c; ctx.lineWidth = 2
    ctx.beginPath()
    for (let k = 0; k <= n; k++) {
      const tt = t0 + (k / n) * (tEnd - t0)
      k ? ctx.lineTo(X(tt), Y(f(tt))) : ctx.moveTo(X(tt), Y(f(tt)))
    }
    ctx.stroke()
  }
  let lx = L + 6
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
  for (const [lab, c] of curves) {
    ctx.fillStyle = c; ctx.fillRect(lx, 8, 14, 3)
    ctx.fillStyle = fg; ctx.fillText(lab, lx + 18, 10)
    lx += ctx.measureText(lab).width + 34
  }
}
