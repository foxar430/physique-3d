import { useEffect, useState } from 'react'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import LiveChart from '../../components/LiveChart.jsx'
import Plot from '../../components/Plot.jsx'
import { useSimulation, useSampled } from '../../lib/useSimulation.js'
import { inclineModel, DEFAULTS, accel, Ec, WP, G, LEN, TAU } from './model.js'
import InclineScene from './Scene.jsx'

export const meta = {
  id: 'newton',
  title: 'Plan incliné : cinématique, 2e loi de Newton, énergie cinétique',
  level: '3e année',
  sections: 'Maths · Sc. Exp. · Sc. Tech.',
  chapter: 'Cinématique · Dynamique · Énergie cinétique',
}

const TOGGLES = [
  { key: 'forces', label: 'Forces P, R, f' },
  { key: 'speed', label: 'Vecteur vitesse' },
  { key: 'chrono', label: 'Chronophotographie (τ = 60 ms)' },
]

export default function InclineExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(inclineModel, params, { speed: 0.5 })
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const a = accel(params, params.v0 || 1e-3)
  const read = useSampled(sim, (s) => ({ t: s.t, x: s.x, v: s.v, Ec: Ec(s, sim.paramsRef.current), WP: WP(s, sim.paramsRef.current), Wf: s.Wf, marks: s.marks }), 8)

  useEffect(() => {
    sim.reset()
  }, [params.alpha, params.m, params.f, params.v0]) // eslint-disable-line react-hooks/exhaustive-deps

  // tableau des positions (chronophotographie)
  const marks = read.marks.slice(0, 9)
  const motion = Math.abs(a) < 1e-6 ? 'Mobile immobile (frottement suffisant)' : params.f === 0 && params.alpha === 0 ? 'Mouvement rectiligne uniforme' : 'Mouvement rectiligne uniformément varié'

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={[0.1, 0.25, 0.5, 1]}
      camera={{ position: [0.3, 2.0, 4.6], target: [0, 0.8, 0] }}
      viewToggles={TOGGLES}
      scene={(view) => <InclineScene sim={sim} view={view} />}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        <>
          <div className="state charge">{motion}</div>
          <div>a = g·sinα − f/m = <b>{a.toFixed(3)} m/s²</b></div>
          <div>t = <b>{read.t.toFixed(2)} s</b> · x = <b>{(read.x * 100).toFixed(1)} cm</b> · v = <b>{read.v.toFixed(3)} m/s</b></div>
          <div>E<sub>c</sub> = <b>{(read.Ec * 1000).toFixed(1)} mJ</b> · W(P) + W(f) = <b>{((read.WP + read.Wf) * 1000).toFixed(1)} mJ</b></div>
        </>
      }
      controls={
        <>
          <Slider label="Inclinaison α" value={params.alpha} min={0} max={30} step={0.5} unit="°" onChange={set('alpha')} format={(v) => v.toFixed(1)} />
          <Slider label="Masse du mobile m" value={params.m} min={50} max={500} step={10} unit="g" onChange={set('m')} />
          <Slider label="Frottement f" value={params.f} min={0} max={200} step={5} unit="mN" onChange={set('f')} />
          <Slider label="Vitesse initiale v₀" value={params.v0} min={0} max={1.5} step={0.05} unit="m/s" onChange={set('v0')} format={(v) => v.toFixed(2)} />
          <p className="formula">
            Positions toutes les τ = {TAU * 1000} ms (cm) :
            <br />
            {marks.map((x) => (x * 100).toFixed(1)).join(' · ')}
            <br />
            Écarts successifs : {marks.slice(1).map((x, i) => ((x - marks[i]) * 100).toFixed(2)).join(' · ')}
          </p>
        </>
      }
      charts={
        <>
          <LiveChart
            sim={sim}
            title="Vitesse v(t) : droite de pente a"
            window={Math.max(2, Math.sqrt((2 * LEN) / Math.max(Math.abs(a), 0.05)) * 1.1)}
            yUnit="v (m/s)"
            series={[{ label: 'v(t)', color: '#4cd17a', get: (s) => s.v }]}
          />
          <EnergyPlot params={params} x={read.x} Ecv={read.Ec} />
        </>
      }
      course={
        <>
          <h2>Le cours en bref</h2>
          <div className="course-grid">
            <section>
              <h3>Cinématique</h3>
              <p>Vitesse v = dx/dt, accélération a = dv/dt. Sur la chronophotographie, des écarts égaux traduisent un mouvement uniforme ; des écarts qui augmentent régulièrement (de a·τ² à chaque intervalle), un mouvement uniformément varié.</p>
              <p className="eq">x = ½·a·t² + v₀·t    v = a·t + v₀    v² − v₀² = 2·a·x</p>
            </section>
            <section>
              <h3>2e loi de Newton</h3>
              <p>Dans un repère galiléen : Σ F = m·a. Pour le mobile sur le plan (axe x vers le bas) :</p>
              <p className="eq">m·a = m·g·sinα − f</p>
              <p>La réaction normale R compense la composante m·g·cosα du poids.</p>
            </section>
            <section>
              <h3>Théorème de l’énergie cinétique</h3>
              <p className="eq">ΔE<sub>c</sub> = Σ W(F)</p>
              <p>W(P) = m·g·sinα·x (moteur), W(R) = 0, W(f) = −f·x (résistant). Sans frottement, toute l’énergie potentielle perdue devient cinétique.</p>
            </section>
            <section>
              <h3>À toi de tester</h3>
              <ul>
                <li>Vérifie que les écarts de la chronophotographie augmentent d’une valeur constante.</li>
                <li>Double la masse sans frottement : a change-t-elle ? Et avec frottement ?</li>
                <li>Pour α = 0 et v₀ ≠ 0 : quel mouvement observes-tu ?</li>
                <li>Cherche l’angle à partir duquel le mobile démarre avec f = 100 mN.</li>
              </ul>
            </section>
          </div>
        </>
      }
    />
  )
}

function EnergyPlot({ params, x, Ecv }) {
  const m = params.m / 1000
  const ec0 = 0.5 * m * params.v0 * params.v0
  const wp = []
  const theo = []
  for (let k = 0; k <= 40; k++) {
    const xx = (LEN * k) / 40
    const W = m * G * Math.sin((params.alpha * Math.PI) / 180) * xx
    wp.push([xx * 100, (ec0 + W) * 1000])
    theo.push([xx * 100, Math.max(ec0 + W - (params.f / 1000) * xx, 0) * 1000])
  }
  const yMax = Math.max(...wp.map((q) => q[1]), 1) * 1.1
  return (
    <Plot
      title="Énergie cinétique en fonction de x"
      xLabel="x (cm)"
      yLabel="E (mJ)"
      xMin={0}
      xMax={LEN * 100}
      yMin={0}
      yMax={yMax}
      curves={[
        { pts: wp, color: '#e0a000', dash: '5 4', width: 1.5 },
        { pts: theo, color: '#4cd17a' },
      ]}
      points={[{ x: x * 100, y: Ecv * 1000 }]}
    >
      {() => (
        <text x={60} y={36} className="tick">
          <tspan fill="#e0a000" style={{ fill: '#e0a000' }}>Ec₀ + W(P)</tspan>
          <tspan dx="10" fill="#4cd17a" style={{ fill: '#4cd17a' }}>Ec = Ec₀ + W(P) + W(f)</tspan>
        </text>
      )}
    </Plot>
  )
}
