import { useCallback, useState } from 'react'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import LiveChart from '../../components/LiveChart.jsx'
import { useSimulation, useSampled } from '../../lib/useSimulation.js'
import { rcModel, DEFAULTS, tau, derived } from './model.js'
import CircuitScene from '../../components/three/Circuit.jsx'

const TOP = [{ type: 'R', label: 'R' }]
const RIGHT = { type: 'C', label: 'C' }
const METER = { label: 'uC', value: (s) => s.uC.toFixed(2) + ' V' }

export const meta = {
  id: 'rc',
  title: 'Charge et décharge d’un condensateur (dipôle RC)',
  level: '4e année (Bac)',
  sections: 'Maths · Sc. Exp. · Sc. Tech.',
  chapter: 'Évolution de systèmes électriques, ch. 1',
}

const fmtTau = (t) => (t < 1 ? (t * 1000).toFixed(t < 0.1 ? 1 : 0) + ' ms' : t.toFixed(2) + ' s')

export default function RCExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(rcModel, params)
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const T = tau(params)

  const toggle = useCallback(() => {
    const s = sim.stateRef.current
    sim.stateRef.current = { ...s, k: s.k === 1 ? 2 : 1, tSwitch: s.t, uSwitch: s.uC }
  }, [sim.stateRef])

  const read = useSampled(sim, (s) => ({ ...derived(s, sim.paramsRef.current), uC: s.uC, k: s.k, dt: s.t - s.tSwitch }))
  const win = Math.max(6 * T, 0.5)

  const guidesU = (p, s) => {
    const T = tau(p)
    const g = [{ axis: 'y', value: p.E, label: 'E = ' + p.E + ' V', color: '#8a8f98' }]
    const t1 = s.tSwitch + T
    if (s.k === 1) {
      const u = p.E + (s.uSwitch - p.E) * Math.exp(-1)
      g.push({ axis: 'y', value: u, label: '0,63 E', color: '#e0a000' })
    } else {
      g.push({ axis: 'y', value: s.uSwitch * Math.exp(-1), label: '0,37 U₀', color: '#e0a000' })
    }
    g.push({ axis: 'x', value: t1, label: 'τ', color: '#e0a000' })
    g.push({ axis: 'x', value: s.tSwitch + 5 * T, label: '5τ', color: '#8a8f98' })
    return g
  }

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      camera={{ position: [0.6, 5.2, 5.6], target: [0.4, 0, 0] }}
      scene={
        <CircuitScene
          sim={sim}
          onToggle={toggle}
          top={TOP}
          right={RIGHT}
          meter={METER}
          current={(s, p) => derived(s, p).i / (p.E / (p.R * 1e3))}
          charge={(s, p) => s.uC / p.E}
        />
      }
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        <>
          <div className={'state ' + (read.k === 1 ? 'charge' : 'decharge')}>
            {read.k === 1 ? 'K en 1 : CHARGE' : 'K en 2 : DÉCHARGE'}
          </div>
          <div>τ = RC = <b>{fmtTau(T)}</b></div>
          <div>u<sub>C</sub> = <b>{read.uC.toFixed(2)} V</b></div>
          <div>i = <b>{(read.i * 1000).toFixed(3)} mA</b></div>
          <div>E<sub>C</sub> = ½Cu<sub>C</sub>² = <b>{(read.energy * 1000).toFixed(2)} mJ</b></div>
        </>
      }
      controls={
        <>
          <button className="switch-btn" onClick={toggle}>
            Basculer K ({read.k === 1 ? 'vers 2 : décharger' : 'vers 1 : charger'})
          </button>
          <p className="small muted">Astuce : tu peux aussi cliquer sur le levier de K dans la scène.</p>
          <Slider label="Tension du générateur E" value={params.E} min={1} max={12} step={0.5} unit="V" onChange={set('E')} />
          <Slider label="Résistance R" value={params.R} min={1} max={50} step={1} unit="kΩ" onChange={set('R')} />
          <Slider label="Capacité C" value={params.C} min={10} max={470} step={10} unit="µF" onChange={set('C')} />
          <p className="formula">τ = R·C = {params.R} kΩ × {params.C} µF = <b>{fmtTau(T)}</b></p>
        </>
      }
      charts={
        <>
          <LiveChart
            sim={sim}
            title="Tensions"
            window={win}
            yUnit="u (V)"
            series={[
              { label: 'uC(t)', color: '#e5484d', get: (s) => s.uC },
              { label: 'uR(t)', color: '#3e9bff', get: (s) => derived(s, sim.paramsRef.current).uR },
            ]}
            guides={guidesU}
          />
          <LiveChart
            sim={sim}
            title="Intensité du courant"
            window={win}
            yUnit="i (mA)"
            series={[{ label: 'i(t)', color: '#30a46c', get: (s) => derived(s, sim.paramsRef.current).i * 1000 }]}
            guides={(p, s) => [{ axis: 'x', value: s.tSwitch + tau(p), label: 'τ', color: '#e0a000' }]}
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
          <h3>Charge (K en position 1)</h3>
          <p>La loi des mailles donne u<sub>R</sub> + u<sub>C</sub> = E, avec u<sub>R</sub> = R·i et i = dq/dt = C·du<sub>C</sub>/dt :</p>
          <p className="eq">RC · du<sub>C</sub>/dt + u<sub>C</sub> = E</p>
          <p>La solution, avec u<sub>C</sub>(0) = 0 :</p>
          <p className="eq">u<sub>C</sub>(t) = E (1 − e<sup>−t/τ</sup>)    i(t) = (E/R) e<sup>−t/τ</sup></p>
        </section>
        <section>
          <h3>Décharge (K en position 2)</h3>
          <p>Le générateur est retiré du circuit : RC · du<sub>C</sub>/dt + u<sub>C</sub> = 0.</p>
          <p className="eq">u<sub>C</sub>(t) = U<sub>0</sub> e<sup>−t/τ</sup>    i(t) = −(U<sub>0</sub>/R) e<sup>−t/τ</sup></p>
          <p>Le courant change de sens : i &lt; 0 avec l’orientation choisie.</p>
        </section>
        <section>
          <h3>Constante de temps τ = RC</h3>
          <ul>
            <li>À t = τ : u<sub>C</sub> = 0,63 E (charge) ou 0,37 U<sub>0</sub> (décharge).</li>
            <li>La tangente à l’origine coupe l’asymptote à t = τ.</li>
            <li>À t ≈ 5τ, le régime permanent est atteint (à 99 %).</li>
            <li>Énergie stockée : E<sub>C</sub> = ½ C u<sub>C</sub>².</li>
          </ul>
        </section>
        <section>
          <h3>À toi de tester</h3>
          <ul>
            <li>Double R : comment varie τ ? Vérifie sur la courbe.</li>
            <li>Bascule K en plein milieu de la charge : que vaut U<sub>0</sub> ?</li>
            <li>Pourquoi le résistor chauffe-t-il surtout au début (effet Joule) ?</li>
            <li>Quand C est chargé, l’intensité i est nulle. Pourquoi ?</li>
          </ul>
        </section>
      </div>
    </>
  )
}
