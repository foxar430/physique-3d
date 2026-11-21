import { useEffect, useRef } from 'react'

/**
 * Courbe en temps réel dessinée sur un canvas (sans bibliothèque).
 *
 * props :
 *  sim        objet retourné par useSimulation
 *  series     [{ label, color, get: (state) => number }]
 *  window     largeur de la fenêtre de temps (s)
 *  yMin,yMax  bornes fixes (sinon auto)
 *  yUnit      unité affichée sur l'axe y
 *  guides     (params) => [{ axis:'x'|'y', value, label }]  repères (E, τ, T0…)
 */
export default function LiveChart({ sim, series, window: win = 10, yMin, yMax, yUnit = '', guides, title }) {
  const canvasRef = useRef(null)
  const data = useRef([]) // [{t, v:[...]}]
  const propsRef = useRef({})
  propsRef.current = { series, win, yMin, yMax, yUnit, guides }

  // collecte des points
  useEffect(() => {
    const push = (s, reset) => {
      if (reset) data.current = []
      const arr = data.current
      const last = arr[arr.length - 1]
      if (last && s.t < last.t) data.current = []
      if (!last || s.t - last.t >= propsRef.current.win / 800 || reset) {
        data.current.push({ t: s.t, v: propsRef.current.series.map((se) => se.get(s)) })
      }
      // on garde ~3 fenêtres d'historique
      const tMin = s.t - 3 * propsRef.current.win
      while (data.current.length && data.current[0].t < tMin) data.current.shift()
    }
    push(sim.stateRef.current, true)
    return sim.subscribe(push)
  }, [sim.subscribe, sim.stateRef])

  // dessin
  useEffect(() => {
    const cv = canvasRef.current
    const ctx = cv.getContext('2d')
    let raf
    const draw = () => {
      const { series, win, yMin, yMax, yUnit, guides } = propsRef.current
      const dpr = window.devicePixelRatio || 1
      const W = cv.clientWidth
      const H = cv.clientHeight
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
        cv.width = Math.round(W * dpr)
        cv.height = Math.round(H * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const css = getComputedStyle(cv)
      const fg = css.getPropertyValue('--text-2').trim() || '#666'
      const grid = css.getPropertyValue('--grid').trim() || '#ddd'
      ctx.clearRect(0, 0, W, H)

      const pts = data.current
      const tNow = pts.length ? pts[pts.length - 1].t : 0
      const t0 = Math.max(0, tNow - win)
      const t1 = t0 + win
      const visible = pts.filter((p) => p.t >= t0)
      const gl = guides ? guides(sim.paramsRef.current, sim.stateRef.current) : []

      let lo = yMin, hi = yMax
      if (lo === undefined || hi === undefined) {
        let a = Infinity, b = -Infinity
        for (const p of visible) for (const v of p.v) { if (v < a) a = v; if (v > b) b = v }
        for (const g of gl) if (g.axis === 'y') { a = Math.min(a, g.value); b = Math.max(b, g.value) }
        if (!isFinite(a)) { a = -1; b = 1 }
        if (a === b) { a -= 1; b += 1 }
        const pad = (b - a) * 0.08
        lo = lo ?? a - pad
        hi = hi ?? b + pad
      }

      const L = 52, R = 12, T = 22, B = 26
      const x = (t) => L + ((t - t0) / (t1 - t0)) * (W - L - R)
      const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B)

      // grille + graduations
      ctx.font = '11px system-ui, sans-serif'
      ctx.fillStyle = fg
      ctx.strokeStyle = grid
      ctx.lineWidth = 1
      const ticks = (a, b, n) => {
        const step0 = (b - a) / n
        const mag = Math.pow(10, Math.floor(Math.log10(step0)))
        const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= step0)
        const out = []
        for (let v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(+v.toPrecision(10))
        return out
      }
      for (const v of ticks(lo, hi, 5)) {
        ctx.beginPath(); ctx.moveTo(L, y(v)); ctx.lineTo(W - R, y(v)); ctx.stroke()
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
        ctx.fillText(fmt(v), L - 6, y(v))
      }
      for (const t of ticks(t0, t1, 6)) {
        ctx.beginPath(); ctx.moveTo(x(t), T); ctx.lineTo(x(t), H - B); ctx.stroke()
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'
        ctx.fillText(fmt(t), x(t), H - B + 6)
      }
      ctx.textAlign = 'left'; ctx.textBaseline = 'top'
      ctx.fillText(yUnit, 4, 4)
      ctx.textAlign = 'right'
      ctx.fillText('t (s)', W - R, H - 12)

      // repères
      ctx.setLineDash([5, 4])
      for (const g of gl) {
        ctx.strokeStyle = g.color || fg
        ctx.fillStyle = g.color || fg
        ctx.beginPath()
        if (g.axis === 'y') {
          if (g.value < lo || g.value > hi) continue
          ctx.moveTo(L, y(g.value)); ctx.lineTo(W - R, y(g.value)); ctx.stroke()
          ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'
          ctx.fillText(g.label, W - R - 4, y(g.value) - 2)
        } else {
          if (g.value < t0 || g.value > t1) continue
          ctx.moveTo(x(g.value), T); ctx.lineTo(x(g.value), H - B); ctx.stroke()
          ctx.textAlign = 'left'; ctx.textBaseline = 'top'
          ctx.fillText(g.label, x(g.value) + 4, T + 2)
        }
      }
      ctx.setLineDash([])

      // courbes
      ctx.save()
      ctx.beginPath(); ctx.rect(L, T - 2, W - L - R, H - T - B + 4); ctx.clip()
      series.forEach((s, i) => {
        ctx.strokeStyle = s.color
        ctx.lineWidth = 2
        ctx.beginPath()
        visible.forEach((p, k) => (k ? ctx.lineTo(x(p.t), y(p.v[i])) : ctx.moveTo(x(p.t), y(p.v[i]))))
        ctx.stroke()
      })
      ctx.restore()

      // légende
      let lx = L + 6
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
      series.forEach((s) => {
        ctx.fillStyle = s.color
        ctx.fillRect(lx, 8, 14, 3)
        ctx.fillStyle = fg
        ctx.fillText(s.label, lx + 18, 10)
        lx += ctx.measureText(s.label).width + 34
      })
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [sim.paramsRef, sim.stateRef])

  return (
    <figure className="chart">
      {title && <figcaption>{title}</figcaption>}
      <canvas ref={canvasRef} />
    </figure>
  )
}

function fmt(v) {
  const a = Math.abs(v)
  if (a === 0) return '0'
  if (a >= 1000 || a < 0.01) return v.toExponential(1)
  return String(+v.toPrecision(3))
}
