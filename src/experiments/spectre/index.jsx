import { useState } from 'react'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import { useSimulation } from '../../lib/useSimulation.js'
import { clockModel, wavelengthCSS } from '../../lib/color.js'
import { DEFAULTS, En, dE, lambdaNm, freq, SERIES, domain, absorb, NMAX, E0 } from './model.js'
import SpectrumScene from './Scene.jsx'

export const meta = {
  id: 'spectre',
  title: 'Spectre atomique de l’hydrogène et niveaux d’énergie',
  level: '4e année (Bac)',
  sections: 'Maths · Sc. Exp.',
  chapter: 'Physique atomique et nucléaire, ch. 1',
}

const lineColor = (nm) => (nm >= 380 && nm <= 780 ? wavelengthCSS(nm) : nm < 380 ? '#b07cff' : '#c0504d')

export default function SpectrumExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(clockModel, params)
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const nm = lambdaNm(params.up, params.low)
  const e = dE(params.up, params.low)
  const abs = absorb(params.W)
  const em = params.mode === 'emission'
  const pick = (up, low) => setParams((p) => ({ ...p, up, low }))

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={[0.5, 1]}
      camera={{ position: [0.7, 2.9, 6.6], target: [0.7, 1.9, -0.4] }}
      scene={<SpectrumScene sim={sim} />}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        <>
          <div className="state charge">
            {em ? 'Émission' : 'Absorption'} : n = {em ? params.up : params.low} → n = {em ? params.low : params.up} · série de {SERIES[params.low] ?? `n = ${params.low}`}
          </div>
          <div>ΔE = E<sub>{params.up}</sub> − E<sub>{params.low}</sub> = <b>{e.toFixed(2)} eV</b></div>
          <div>λ = hc/ΔE = <b style={{ color: lineColor(nm) }}>{nm.toFixed(1)} nm</b> ({domain(nm)})</div>
          <div>ν = ΔE/h = <b>{(freq(params.up, params.low) / 1e14).toFixed(2)}·10¹⁴ Hz</b></div>
        </>
      }
      controls={
        <>
          <div className="speed" role="group" aria-label="Spectre">
            <span>Spectre</span>
            <button className={em ? 'on' : ''} onClick={() => set('mode')('emission')}>Émission</button>
            <button className={!em ? 'on' : ''} onClick={() => set('mode')('absorption')}>Absorption</button>
          </div>
          <div className="speed" role="group" aria-label="Niveau haut">
            <span>Niveau haut p</span>
            {[2, 3, 4, 5, 6].map((n) => (
              <button key={n} className={params.up === n ? 'on' : ''} disabled={n <= params.low} onClick={() => set('up')(n)}>{n}</button>
            ))}
          </div>
          <div className="speed" role="group" aria-label="Niveau bas">
            <span>Niveau bas n</span>
            {[1, 2, 3].map((n) => (
              <button key={n} className={params.low === n ? 'on' : ''} onClick={() => setParams((p) => ({ ...p, low: n, up: Math.max(p.up, n + 1) }))}>{n}</button>
            ))}
          </div>
          <p className="small muted">Tu peux aussi cliquer une flèche dans le diagramme d’énergie.</p>
          <h2>Un photon arrive sur l’atome (n = 1)</h2>
          <Slider label="Énergie du photon W" value={params.W} min={5} max={16} step={0.01} unit="eV" onChange={set('W')} format={(v) => v.toFixed(2)} />
          <p>
            {[10.2, 11, 12.09, 12.75, 14].map((w, k) => (
              <span key={w}>
                {k > 0 && ' · '}
                <button className="link" onClick={() => set('W')(w)}>{w} eV</button>
              </span>
            ))}
          </p>
          <p className="formula">
            {abs.kind === 'ion' && <>W ≥ 13,6 eV : l’atome est <b>ionisé</b>. L’électron part avec E<sub>c</sub> = W − 13,6 = {abs.Ec.toFixed(2)} eV.</>}
            {abs.kind === 'abs' && <>W = E<sub>{abs.p}</sub> − E<sub>1</sub> : le photon est <b>absorbé</b>, l’atome passe au niveau n = {abs.p}.</>}
            {abs.kind === 'none' && <>W ne correspond à aucune différence E<sub>p</sub> − E<sub>1</sub> : le photon n’est <b>pas absorbé</b>.</>}
          </p>
        </>
      }
      charts={
        <>
          <EnergyDiagram up={params.up} low={params.low} onPick={pick} em={em} />
          <SpectrumChart up={params.up} low={params.low} />
        </>
      }
      course={<Course />}
    />
  )
}

/** Diagramme d'énergie cliquable (échelle linéaire). */
function EnergyDiagram({ up, low, onPick, em }) {
  const W = 420, H = 220, L = 56, R = 10, T = 16, B = 12
  const y = (E) => T + (1 - (E + E0) / E0) * (H - T - B)
  const arrows = []
  for (const n of [1, 2, 3]) for (let p = n + 1; p <= NMAX; p++) arrows.push([p, n])
  const colX = { 1: L + 30, 2: L + 150, 3: L + 270 }
  return (
    <figure className="chart">
      <figcaption>Diagramme des niveaux d’énergie (clique une transition)</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="reso">
        {Array.from({ length: NMAX }, (_, k) => k + 1).map((n) => (
          <g key={n}>
            <line x1={L} x2={W - R} y1={y(En(n))} y2={y(En(n))} stroke={n === up || n === low ? '#ffd23f' : 'var(--text-2)'} strokeWidth={n === up || n === low ? 2 : 1} />
            {n <= 4 && <text x={L - 4} y={y(En(n))} className="tick" textAnchor="end" dominantBaseline="middle">{En(n).toFixed(2)}</text>}
          </g>
        ))}
        <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} className="guide" />
        <text x={L - 4} y={y(0) + 4} className="tick" textAnchor="end">0</text>
        <text x={4} y={T + 8} className="tick">E (eV)</text>
        {[1, 2, 3].map((n) => (
          <text key={n} x={colX[n] + 40} y={y(En(1)) - 8} className="tick" textAnchor="middle">{SERIES[n]}</text>
        ))}
        {arrows.map(([p, n]) => {
          const x = colX[n] + (p - n - 1) * 17
          const sel = p === up && n === low
          const nm = lambdaNm(p, n)
          const c = lineColor(nm)
          const y1 = em ? y(En(p)) : y(En(n))
          const y2 = em ? y(En(n)) : y(En(p))
          const dir = y2 > y1 ? 1 : -1
          return (
            <g key={p + '-' + n} onClick={() => onPick(p, n)} style={{ cursor: 'pointer' }}>
              <line x1={x} x2={x} y1={y1} y2={y2} stroke="transparent" strokeWidth="12" />
              <line x1={x} x2={x} y1={y1} y2={y2 - dir * 5} stroke={c} strokeWidth={sel ? 3.5 : 1.8} opacity={sel ? 1 : 0.65} />
              <path d={`M${x - 4},${y2 - dir * 7} L${x + 4},${y2 - dir * 7} L${x},${y2} Z`} fill={c} opacity={sel ? 1 : 0.65} />
            </g>
          )
        })}
      </svg>
    </figure>
  )
}

/** Toutes les raies (séries de Lyman, Balmer, Paschen) sur une échelle logarithmique en λ. */
function SpectrumChart({ up, low }) {
  const W = 420, H = 220, L = 16, R = 16, T = 30, B = 34
  const lmin = 80, lmax = 2000
  const x = (nm) => L + ((Math.log10(nm) - Math.log10(lmin)) / (Math.log10(lmax) - Math.log10(lmin))) * (W - L - R)
  const lines = []
  for (const n of [1, 2, 3]) for (let p = n + 1; p <= NMAX; p++) lines.push([p, n, lambdaNm(p, n)])
  const stops = []
  for (let nm = 380; nm <= 780; nm += 20) stops.push(nm)
  return (
    <figure className="chart">
      <figcaption>Raies de l’hydrogène : UV, visible, IR (échelle logarithmique)</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="reso">
        <defs>
          <linearGradient id="vis" x1="0" x2="1">
            {stops.map((nm) => <stop key={nm} offset={(x(nm) - x(380)) / (x(780) - x(380))} stopColor={wavelengthCSS(nm)} />)}
          </linearGradient>
        </defs>
        <rect x={L} y={T} width={W - L - R} height={H - T - B} fill="#06070a" rx="4" />
        <rect x={x(380)} y={H - B + 4} width={x(780) - x(380)} height={6} fill="url(#vis)" />
        <text x={(x(80) + x(380)) / 2} y={T - 10} className="tick" textAnchor="middle">Lyman · UV</text>
        <text x={(x(380) + x(780)) / 2} y={T - 10} className="tick" textAnchor="middle">Balmer · visible</text>
        <text x={(x(820) + x(2000)) / 2} y={T - 10} className="tick" textAnchor="middle">Paschen · IR</text>
        {lines.map(([p, n, nm]) => {
          const sel = p === up && n === low
          return (
            <g key={p + '-' + n}>
              <line x1={x(nm)} x2={x(nm)} y1={T + 4} y2={H - B - 4} stroke={lineColor(nm)} strokeWidth={sel ? 3.5 : 2} opacity={sel ? 1 : 0.85} />
              {sel && <text x={x(nm)} y={H - B - 10} className="tick" textAnchor="middle" fill="#fff" style={{ fill: '#fff' }}>{nm.toFixed(0)} nm</text>}
            </g>
          )
        })}
        {[100, 200, 500, 1000, 2000].map((v) => (
          <text key={v} x={x(v)} y={H - 6} className="tick" textAnchor="middle">{v}</text>
        ))}
        <text x={W - R} y={H - 18} className="tick" textAnchor="end">λ (nm)</text>
      </svg>
    </figure>
  )
}

function Course() {
  return (
    <>
      <h2>Le cours en bref</h2>
      <div className="course-grid">
        <section>
          <h3>Spectres de raies</h3>
          <p>Un gaz excité (décharge électrique) émet une lumière dont le spectre est formé de <b>raies</b> : c’est un spectre d’émission. Éclairé en lumière blanche, le même gaz froid absorbe exactement les mêmes radiations : on voit des raies noires sur un fond coloré.</p>
          <p>Chaque élément chimique a son propre spectre, comme une empreinte digitale.</p>
        </section>
        <section>
          <h3>Quantification de l’énergie</h3>
          <p>L’énergie de l’atome ne peut prendre que certaines valeurs : elle est <b>quantifiée</b>. Pour l’hydrogène :</p>
          <p className="eq">E<sub>n</sub> = −13,6 / n² (eV)</p>
          <p>n = 1 : état fondamental. n &gt; 1 : états excités. E = 0 : atome ionisé.</p>
        </section>
        <section>
          <h3>Le photon</h3>
          <p>En passant du niveau p au niveau n &lt; p, l’atome émet un photon :</p>
          <p className="eq">E<sub>p</sub> − E<sub>n</sub> = h·ν = h·c / λ</p>
          <p>Un photon n’est absorbé que si son énergie est exactement égale à une différence E<sub>p</sub> − E<sub>n</sub>, sauf s’il ionise l’atome (W ≥ 13,6 eV depuis n = 1).</p>
          <p>h = 6,62·10⁻³⁴ J·s · 1 eV = 1,6·10⁻¹⁹ J</p>
        </section>
        <section>
          <h3>À toi de tester</h3>
          <ul>
            <li>Calcule λ pour la transition 3 → 2 et vérifie dans l’affichage (raie rouge Hα).</li>
            <li>Pourquoi les raies de la série de Lyman sont-elles invisibles ?</li>
            <li>Un photon de 11 eV est-il absorbé par l’atome dans l’état fondamental ? Et 12,75 eV ?</li>
            <li>Compare les spectres d’émission et d’absorption.</li>
          </ul>
        </section>
      </div>
    </>
  )
}
