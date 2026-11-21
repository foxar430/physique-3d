/**
 * Petit traceur SVG statique (courbes calculées, points de mesure, repères).
 *  curves : [{ pts: [[x, y], …], color, width, dash }]
 *  points : [{ x, y, color, r, label }]
 *  vlines / hlines : [{ v, label, color }]
 *  xLog : axe x logarithmique (décades)
 */
export default function Plot({
  title, xLabel, yLabel, xMin, xMax, yMin, yMax, curves = [], points = [], vlines = [], hlines = [], xLog = false, xTicks, yTicks, children,
}) {
  const W = 420
  const H = 220
  const L = 46, R = 12, T = 22, B = 28
  const fx = xLog ? Math.log10 : (v) => v
  const x = (v) => L + ((fx(v) - fx(xMin)) / (fx(xMax) - fx(xMin))) * (W - L - R)
  const y = (v) => T + (1 - (v - yMin) / (yMax - yMin)) * (H - T - B)
  const xt = xTicks ?? (xLog ? decades(xMin, xMax) : ticks(xMin, xMax, 6))
  const yt = yTicks ?? ticks(yMin, yMax, 5)
  const clampY = (v) => Math.max(yMin - (yMax - yMin) * 0.05, Math.min(yMax + (yMax - yMin) * 0.05, v))
  return (
    <figure className="chart">
      {title && <figcaption>{title}</figcaption>}
      <svg viewBox={`0 0 ${W} ${H}`} className="reso" role="img">
        <defs>
          <clipPath id={'clip-' + W + H}>
            <rect x={L} y={T - 2} width={W - L - R} height={H - T - B + 4} />
          </clipPath>
        </defs>
        {yt.map((v) => (
          <g key={'y' + v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="grid" />
            <text x={L - 6} y={y(v)} className="tick" textAnchor="end" dominantBaseline="middle">{fmt(v)}</text>
          </g>
        ))}
        {xt.map((v) => (
          <g key={'x' + v}>
            <line x1={x(v)} x2={x(v)} y1={T} y2={H - B} className="grid" />
            <text x={x(v)} y={H - B + 14} className="tick" textAnchor="middle">{fmt(v)}</text>
          </g>
        ))}
        <text x={4} y={12} className="tick">{yLabel}</text>
        <text x={W - R} y={H - 4} className="tick" textAnchor="end">{xLabel}</text>
        <g clipPath={`url(#clip-${W}${H})`}>
          {hlines.map((h, i) => (
            <g key={'h' + i}>
              <line x1={L} x2={W - R} y1={y(h.v)} y2={y(h.v)} className="guide" style={h.color ? { stroke: h.color } : undefined} />
              {h.label && <text x={W - R - 2} y={y(h.v) - 4} className="tick guide-t" textAnchor="end" style={h.color ? { fill: h.color } : undefined}>{h.label}</text>}
            </g>
          ))}
          {vlines.map((h, i) => (
            <g key={'v' + i}>
              <line x1={x(h.v)} x2={x(h.v)} y1={T} y2={H - B} className="guide" style={h.color ? { stroke: h.color } : undefined} />
              {h.label && <text x={x(h.v) + 4} y={T + 10} className="tick guide-t" style={h.color ? { fill: h.color } : undefined}>{h.label}</text>}
            </g>
          ))}
          {curves.map((c, i) => (
            <path
              key={'c' + i}
              d={c.pts.map(([a, b], k) => (k ? 'L' : 'M') + x(a).toFixed(1) + ',' + y(clampY(b)).toFixed(1)).join(' ')}
              fill="none"
              stroke={c.color}
              strokeWidth={c.width ?? 2.2}
              strokeDasharray={c.dash}
            />
          ))}
          {points.map((p, i) => (
            <g key={'p' + i}>
              <circle cx={x(p.x)} cy={y(p.y)} r={p.r ?? 5} fill={p.color ?? '#e5484d'} stroke="#fff" strokeWidth="1.5" />
              {p.label && <text x={x(p.x) + 7} y={y(p.y) - 7} className="tick">{p.label}</text>}
            </g>
          ))}
          {children?.({ x, y })}
        </g>
      </svg>
    </figure>
  )
}

function ticks(a, b, n) {
  const step0 = (b - a) / n
  const mag = Math.pow(10, Math.floor(Math.log10(step0)))
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= step0)
  const out = []
  if (!(step > 0) || !isFinite(step)) return out
  for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + 1e-9 && out.length < 50; v += step) out.push(+v.toPrecision(10))
  return out
}
function decades(a, b) {
  const out = []
  for (let e = Math.ceil(Math.log10(a)); e <= Math.floor(Math.log10(b)); e++) out.push(Math.pow(10, e))
  return out
}
function fmt(v) {
  const a = Math.abs(v)
  if (a < 1e-9) return '0'
  if (a >= 10000) return v.toExponential(0)
  if (a < 0.01) return v.toExponential(1)
  return String(+v.toPrecision(3))
}
