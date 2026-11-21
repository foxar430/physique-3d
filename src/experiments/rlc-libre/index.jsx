import { useCallback, useState } from 'react'
import ExperimentLayout, { FAST_SPEEDS } from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import LiveChart from '../../components/LiveChart.jsx'
import CircuitScene from '../../components/three/Circuit.jsx'
import { useSimulation, useSampled } from '../../lib/useSimulation.js'
import { rlcModel, DEFAULTS, T0, Rc, derived, Imax } from './model.js'

export const meta = {
  id: 'rlc-libre',
  title: 'Oscillations électriques libres (circuit RLC)',
  level: '4e année (Bac)',
  sections: 'Maths · Sc. Exp. · Sc. Tech.',
  chapter: 'Évolution de systèmes électriques, ch. 3',
}

const TOP = [
  { type: 'R', label: 'R', name: <>u<sub>R</sub></>, u: (s, p) => p.R * s.i, ohms: (p) => p.R },
  // uL = L·di/dt, déduite de la loi des mailles
  { type: 'L', label: 'L', name: <>u<sub>L</sub></>, u: (s, p) => (s.k === 1 ? p.E : 0) - p.R * s.i - derived(s, p).uC },
]
const RIGHT = { type: 'C', label: 'C', name: <>u<sub>C</sub></>, u: (s, p) => derived(s, p).uC }
const SOURCE = { kind: 'battery', name: 'E', u: (s, p) => p.E, display: (s, p) => p.E.toFixed(1) + ' V' }
const METER = { label: 'uC', value: (s, p) => derived(s, p).uC.toFixed(2) + ' V' }

export default function RLCFreeExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(rlcModel, params, { speed: 0.01 })
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const period = T0(params)
  const rc = Rc(params)

  const toggle = useCallback(() => {
    const s = sim.stateRef.current
    sim.stateRef.current = { ...s, k: s.k === 1 ? 2 : 1 }
  }, [sim.stateRef])

  const read = useSampled(sim, (s) => ({ ...derived(s, sim.paramsRef.current), i: s.i, k: s.k }))
  const win = Math.max(5 * period, 0.002)

  const regime =
    params.R === 0
      ? 'Non amorti : sinusoïdal'
      : params.R < rc
        ? 'Pseudo-périodique'
        : 'Apériodique'

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={FAST_SPEEDS}
      speedNote="Une oscillation dure quelques millisecondes : la simulation est ralentie."
      camera={{ position: [0.5, 4.3, 4.7], target: [0.5, 0.15, -0.15] }}
      viewToggles
      scene={(view) => (
        <CircuitScene
          sim={sim}
          params={params}
          view={view}
          source={SOURCE}
          amps={(s) => s.i}
          onToggle={toggle}
          top={TOP}
          right={RIGHT}
          meter={METER}
          current={(s, p) => s.i / Imax(p)}
          charge={(s, p) => derived(s, p).uC / p.E}
        />
      )}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        <>
          <div className={'state ' + (read.k === 2 ? 'charge' : 'decharge')}>
            {read.k === 2 ? 'K en 2 : ' + regime.toUpperCase() : 'K en 1 : RECHARGE DE C'}
          </div>
          <div>T₀ = 2π√(LC) = <b>{(period * 1000).toFixed(2)} ms</b></div>
          <div>u<sub>C</sub> = <b>{read.uC.toFixed(2)} V</b> · i = <b>{(read.i * 1000).toFixed(1)} mA</b></div>
          <div>E = E<sub>e</sub> + E<sub>m</sub> = <b>{(read.E * 1000).toFixed(3)} mJ</b></div>
        </>
      }
      controls={
        <>
          <button className="switch-btn" onClick={toggle}>
            {read.k === 2 ? 'K vers 1 : recharger C' : 'K vers 2 : libérer les oscillations'}
          </button>
          <p className="small muted">Au départ, C est déjà chargé sous E et K est en position 2.</p>
          <Slider label="Tension de charge E" value={params.E} min={1} max={12} step={0.5} unit="V" onChange={set('E')} />
          <Slider label="Résistance totale R" value={params.R} min={0} max={500} step={5} unit="Ω" onChange={set('R')} />
          <Slider label="Inductance L" value={params.L} min={10} max={1000} step={10} unit="mH" onChange={set('L')} />
          <Slider label="Capacité C" value={params.C} min={1} max={100} step={1} unit="µF" onChange={set('C')} />
          <p className="formula">
            T₀ = 2π√(LC) = {(period * 1000).toFixed(2)} ms · N₀ = {(1 / period).toFixed(1)} Hz
            <br />
            Résistance critique : R<sub>c</sub> = 2√(L/C) ≈ {rc.toFixed(0)} Ω
          </p>
          <button className="link" onClick={sim.reset}>Recharger C et relancer</button>
        </>
      }
      charts={
        <>
          <LiveChart
            sim={sim}
            title="Tension aux bornes du condensateur"
            window={win}
            timeScale={1000}
            timeLabel="t (ms)"
            yUnit="u (V)"
            series={[
              { label: 'uC(t)', color: '#e5484d', get: (s) => derived(s, sim.paramsRef.current).uC },
              { label: 'uR(t) = R·i', color: '#3e9bff', get: (s) => derived(s, sim.paramsRef.current).uR },
            ]}
            guides={(p) => [
              { axis: 'y', value: p.E, label: 'E', color: '#8a8f98' },
              { axis: 'y', value: -p.E, label: '−E', color: '#8a8f98' },
              { axis: 'x', value: T0(p), label: 'T₀', color: '#e0a000' },
            ]}
          />
          <LiveChart
            sim={sim}
            title="Énergies"
            window={win}
            timeScale={1000}
            timeLabel="t (ms)"
            yUnit="E (mJ)"
            series={[
              { label: 'Ee (condensateur)', color: '#e5484d', get: (s) => derived(s, sim.paramsRef.current).Ee * 1000 },
              { label: 'Em (bobine)', color: '#3e9bff', get: (s) => derived(s, sim.paramsRef.current).Em * 1000 },
              { label: 'E totale', color: '#e0a000', get: (s) => derived(s, sim.paramsRef.current).E * 1000 },
            ]}
          />
        </>
      }
      course={<Course />}
    />
  )
}

function Course() {
  return (
    <>
      <h2>Le cours en bref</h2>
      <div className="course-grid">
        <section>
          <h3>Équation différentielle</h3>
          <p>Après la charge, on bascule K : le condensateur se décharge dans la bobine. La loi des mailles donne :</p>
          <p className="eq">L · d²q/dt² + R · dq/dt + q/C = 0</p>
          <p>R est la résistance totale du circuit (résistor + résistance interne r de la bobine).</p>
        </section>
        <section>
          <h3>Circuit LC idéal (R = 0)</h3>
          <p className="eq">u<sub>C</sub>(t) = E cos(ω<sub>0</sub>t)    ω<sub>0</sub> = 1/√(LC)</p>
          <p>Période propre : <b>T<sub>0</sub> = 2π√(LC)</b>.</p>
          <p>L’énergie passe du condensateur (½q²/C) à la bobine (½Li²) et inversement. Le total reste constant.</p>
        </section>
        <section>
          <h3>Avec résistance (R &gt; 0)</h3>
          <ul>
            <li>R faible : régime <b>pseudo-périodique</b>, de pseudo-période T ≈ T<sub>0</sub>.</li>
            <li>R grand : régime <b>apériodique</b>, sans oscillation.</li>
            <li>dE/dt = −R·i² : l’énergie est dissipée par effet Joule.</li>
          </ul>
        </section>
        <section>
          <h3>À toi de tester</h3>
          <ul>
            <li>Mets R = 0 : l’énergie totale est-elle conservée ?</li>
            <li>Multiplie C par 4 : comment varie T<sub>0</sub> ?</li>
            <li>Cherche la valeur de R où les oscillations disparaissent. Compare avec 2√(L/C).</li>
            <li>Observe les couleurs des armatures : la polarité du condensateur s’inverse à chaque demi-période.</li>
          </ul>
        </section>
      </div>
    </>
  )
}
