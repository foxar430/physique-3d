import { useState } from 'react'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import Plot from '../../components/Plot.jsx'
import { useSimulation, useSampled } from '../../lib/useSimulation.js'
import { orbitModel, DEFAULTS, PRESETS, gAt, v, T, r, force, GM, R } from './model.js'
import OrbitScene from './Scene.jsx'

export const meta = {
  id: 'gravitation',
  title: 'Interaction gravitationnelle : satellites de la Terre',
  level: '3e année',
  sections: 'Maths · Sc. Exp.',
  chapter: 'Interactions : interaction gravitationnelle',
}

const SPEEDS = [60, 300, 1200, 6000, 30000, 200000]
const fit = (per) => SPEEDS.reduce((a, b) => (Math.abs(Math.log(b / (per / 10))) < Math.abs(Math.log(a / (per / 10))) ? b : a))
const fmtT = (s) => (s < 3600 * 2 ? (s / 60).toFixed(1) + ' min' : s < 86400 * 2 ? (s / 3600).toFixed(2) + ' h' : (s / 86400).toFixed(2) + ' jours')

export default function OrbitExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(orbitModel, params, { speed: fit(T(DEFAULTS)) })
  const setH = (h) => {
    setParams((p) => ({ ...p, h }))
    sim.setSpeed(fit(T({ ...params, h })))
  }
  const per = T(params)
  const t = useSampled(sim, (s) => s.t)

  const gPts = []
  for (let h = 0; h <= 40000; h += 250) gPts.push([h, gAt(h)])
  const kep = []
  for (let x = 0; x <= 80; x += 2) kep.push([x, (4 * Math.PI * Math.PI * x * 1e21) / GM / 1e10])
  const r3 = Math.pow(r(params), 3) / 1e21
  const presetsPts = PRESETS.filter((q) => q.h < 40000).map((q) => {
    const rr = R + q.h * 1000
    return { x: Math.pow(rr, 3) / 1e21, y: Math.pow(2 * Math.PI * Math.sqrt(Math.pow(rr, 3) / GM), 2) / 1e10, color: '#8a8f98', r: 4 }
  })

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={SPEEDS}
      speedNote="Vitesse = secondes simulées par seconde. Elle s’ajuste à la période de l’orbite."
      camera={{ position: [0, 4.2, 9], target: [0, 0, 0] }}
      scene={<OrbitScene sim={sim} />}
      onParamsReset={() => setH(DEFAULTS.h)}
      readouts={
        <>
          <div className="state charge">Orbite circulaire à h = {params.h.toLocaleString('fr-FR')} km</div>
          <div>g(h) = GM/(R+h)² = <b>{gAt(params.h).toFixed(3)} N/kg</b></div>
          <div>v = √(GM/r) = <b>{(v(params) / 1000).toFixed(2)} km/s</b></div>
          <div>T = 2π√(r³/GM) = <b>{fmtT(per)}</b> · tours effectués : <b>{(t / per).toFixed(2)}</b></div>
          <div className="legend-row"><span style={{ color: '#4cd17a' }}>➜ vitesse</span> <span style={{ color: '#e5484d' }}>➜ force F (vers le centre)</span></div>
        </>
      }
      controls={
        <>
          <Slider label="Altitude h" value={params.h} min={200} max={40000} step={50} unit="km" onChange={setH} format={(x) => x.toLocaleString('fr-FR')} />
          <div className="speed" role="group" aria-label="Exemples">
            {PRESETS.map((q) => (
              <button key={q.name} className={params.h === q.h ? 'on' : ''} onClick={() => setH(q.h)}>{q.name}</button>
            ))}
          </div>
          <p className="formula">
            Force exercée par la Terre sur un satellite de {params.m} t : F = {(force(params) / 1000).toFixed(0)} kN
            <br />
            {Math.abs(per - 86164) < 600 && <b>Période = 1 jour sidéral : le satellite reste au-dessus du même point de l’équateur.</b>}
          </p>
        </>
      }
      charts={
        <>
          <Plot title="Champ de gravitation g en fonction de l’altitude" xLabel="h (km)" yLabel="g (N/kg)" xMin={0} xMax={40000} yMin={0} yMax={10} curves={[{ pts: gPts, color: '#3e9bff' }]} points={params.h <= 40000 ? [{ x: params.h, y: gAt(params.h) }] : []} />
          <Plot
            title="3e loi de Kepler : T² en fonction de r³ (droite)"
            xLabel="r³ (10²¹ m³)"
            yLabel="T² (10¹⁰ s²)"
            xMin={0}
            xMax={80}
            yMin={0}
            yMax={(4 * Math.PI * Math.PI * 80e21) / GM / 1e10}
            curves={[{ pts: kep, color: '#30a46c' }]}
            points={[...presetsPts, ...(r3 <= 80 ? [{ x: r3, y: (per * per) / 1e10 }] : [])]}
          />
        </>
      }
      course={
        <>
          <h2>Le cours en bref</h2>
          <div className="course-grid">
            <section>
              <h3>Loi de la gravitation universelle</h3>
              <p className="eq">F = G·m₁·m₂ / d²    G = 6,67·10⁻¹¹ SI</p>
              <p>Deux corps s’attirent toujours. À la surface de la Terre, F = m·g₀ avec g₀ = GM/R² ≈ 9,8 N/kg. Le champ diminue avec l’altitude : g(h) = g₀·R²/(R+h)².</p>
            </section>
            <section>
              <h3>Satellite en orbite circulaire</h3>
              <p>Seule force : l’attraction de la Terre, dirigée vers son centre. Le mouvement est circulaire uniforme :</p>
              <p className="eq">v = √(GM/r)    T = 2π·√(r³/GM)</p>
              <p>Plus le satellite est haut, plus il est lent. T²/r³ = 4π²/(GM) ne dépend pas du satellite.</p>
            </section>
            <section>
              <h3>Interaction forte</h3>
              <p>Dans le noyau, les protons se repoussent (interaction électrique) mais le noyau reste soudé : l’interaction forte attire tous les nucléons entre eux. Elle est très intense mais n’agit qu’à très courte distance (≈ 10⁻¹⁵ m).</p>
            </section>
            <section>
              <h3>À toi de tester</h3>
              <ul>
                <li>Quelle altitude donne une période de 24 h ?</li>
                <li>Compare la vitesse de l’ISS et celle d’un satellite GPS.</li>
                <li>Vérifie que les points des satellites sont alignés sur T² = f(r³).</li>
                <li>Que vaut g à l’altitude de l’ISS ? Pourquoi les astronautes flottent-ils quand même ?</li>
              </ul>
            </section>
          </div>
        </>
      }
    />
  )
}
