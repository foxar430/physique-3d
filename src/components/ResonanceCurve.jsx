/**
 * Courbe de résonance I(N) (calcul analytique du régime permanent), en SVG.
 * Le point indique la fréquence actuelle du GBF.
 */
export default function ResonanceCurve({ params, steady, N0, nMin = 10, nMax = 400 }) {
  const W = 420
  const H = 220
  const L = 46, R = 12, T = 22, B = 28
  const n = 160
  const pts = []
  let iMax = 0
  for (let k = 0; k <= n; k++) {
    const N = nMin + ((nMax - nMin) * k) / n
    const I = steady(params, N).Im * 1000
    iMax = Math.max(iMax, I)
    pts.push([N, I])
  }
  const yMax = iMax * 1.1 || 1
  const x = (N) => L + ((N - nMin) / (nMax - nMin)) * (W - L - R)
  const y = (I) => T + (1 - I / yMax) * (H - T - B)
  const d = pts.map(([N, I], k) => (k ? 'L' : 'M') + x(N).toFixed(1) + ',' + y(I).toFixed(1)).join(' ')
  const cur = steady(params).Im * 1000
  const n0 = N0(params)
  const iRes = steady(params, n0).Im * 1000
  const band = iRes / Math.SQRT2
  const xTicks = [0, 100, 200, 300, 400].filter((v) => v >= nMin && v <= nMax)
  const yStep = niceStep(yMax / 4)
  const yTicks = []
  for (let v = 0; v <= yMax; v += yStep) yTicks.push(v)

  return (
    <figure className="chart">
      <figcaption>Courbe de résonance I<sub>m</sub>(N)</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="reso" role="img" aria-label="Amplitude de l'intensité en fonction de la fréquence">
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="grid" />
            <text x={L - 6} y={y(v)} className="tick" textAnchor="end" dominantBaseline="middle">
              {+v.toPrecision(3)}
            </text>
          </g>
        ))}
        {xTicks.map((v) => (
          <g key={v}>
            <line x1={x(v)} x2={x(v)} y1={T} y2={H - B} className="grid" />
            <text x={x(v)} y={H - B + 14} className="tick" textAnchor="middle">{v}</text>
          </g>
        ))}
        <text x={4} y={12} className="tick">Im (mA)</text>
        <text x={W - R} y={H - 4} className="tick" textAnchor="end">N (Hz)</text>
        <line x1={L} x2={W - R} y1={y(band)} y2={y(band)} className="guide" />
        <text x={W - R - 2} y={y(band) - 4} className="tick guide-t" textAnchor="end">Im₀/√2</text>
        {n0 <= nMax && (
          <>
            <line x1={x(n0)} x2={x(n0)} y1={T} y2={H - B} className="guide" />
            <text x={x(n0) + 4} y={T + 10} className="tick guide-t">N₀</text>
          </>
        )}
        <path d={d} fill="none" stroke="#30a46c" strokeWidth="2.2" />
        {params.N <= nMax && <circle cx={x(params.N)} cy={y(cur)} r="6" fill="#e5484d" stroke="#fff" strokeWidth="1.5" />}
      </svg>
    </figure>
  )
}

function niceStep(s) {
  const mag = Math.pow(10, Math.floor(Math.log10(s || 1)))
  return [1, 2, 5, 10].map((m) => m * mag).find((v) => v >= s)
}
