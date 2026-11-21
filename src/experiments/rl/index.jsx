import { useCallback, useState } from 'react'
import ExperimentLayout, { FAST_SPEEDS } from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import LiveChart from '../../components/LiveChart.jsx'
import CircuitScene from '../../components/three/Circuit.jsx'
import { useSimulation, useSampled } from '../../lib/useSimulation.js'
import { rlModel, DEFAULTS, tau, I0, derived } from './model.js'

export const meta = {
  id: 'rl',
  title: 'Établissement et rupture du courant (dipôle RL)',
  level: '4e année (Bac)',
  sections: 'Maths · Sc. Exp. · Sc. Tech.',
  chapter: 'Évolution de systèmes électriques, ch. 2',
}

const SPEED_NOTE = 'Le phénomène dure quelques millisecondes : la simulation est ralentie.'

const TOP = [{ type: 'R', label: 'R', name: <>u<sub>R</sub></>, u: (s, p) => derived(s, p).uR, ohms: (p) => p.R }]
const RIGHT = { type: 'L', label: '(L, r)', name: <>u<sub>B</sub></>, u: (s, p) => derived(s, p).uB }
const SOURCE = { kind: 'battery', name: 'E', u: (s, p) => p.E, display: (s, p) => p.E.toFixed(1) + ' V' }
const METER = { label: 'i', value: (s) => (s.i * 1000).toFixed(1) + ' mA' }

export default function RLExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(rlModel, params, { speed: 0.01 })
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const T = tau(params)

  const toggle = useCallback(() => {
    const s = sim.stateRef.current
    sim.stateRef.current = { ...s, k: s.k === 1 ? 2 : 1, tSwitch: s.t, iSwitch: s.i }
  }, [sim.stateRef])

  const read = useSampled(sim, (s) => ({ ...derived(s, sim.paramsRef.current), i: s.i, k: s.k }))
  const win = Math.max(6 * T, 0.002)

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={FAST_SPEEDS}
      speedNote={SPEED_NOTE}
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
          current={(s, p) => s.i / I0(p)}
        />
      )}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        <>
          <div className={'state ' + (read.k === 1 ? 'charge' : 'decharge')}>
            {read.k === 1 ? 'K en 1 : ÉTABLISSEMENT' : 'K en 2 : RUPTURE'}
          </div>
          <div>τ = L/(R+r) = <b>{(T * 1000).toFixed(2)} ms</b></div>
          <div>i = <b>{(read.i * 1000).toFixed(1)} mA</b></div>
          <div>u<sub>B</sub> = <b>{read.uB.toFixed(2)} V</b></div>
          <div>E<sub>L</sub> = ½Li² = <b>{(read.energy * 1000).toFixed(2)} mJ</b></div>
        </>
      }
      controls={
        <>
          <button className="switch-btn" onClick={toggle}>
            Basculer K ({read.k === 1 ? 'vers 2 : rupture' : 'vers 1 : établissement'})
          </button>
          <p className="small muted">Astuce : tu peux aussi cliquer sur le levier de K dans la scène.</p>
          <Slider label="Tension du générateur E" value={params.E} min={1} max={12} step={0.5} unit="V" onChange={set('E')} />
          <Slider label="Résistance R" value={params.R} min={10} max={200} step={5} unit="Ω" onChange={set('R')} />
          <Slider label="Inductance L" value={params.L} min={50} max={1000} step={10} unit="mH" onChange={set('L')} />
          <Slider label="Résistance interne de la bobine r" value={params.r} min={0} max={30} step={1} unit="Ω" onChange={set('r')} />
          <p className="formula">
            τ = L/(R+r) = {(T * 1000).toFixed(2)} ms
            <br />
            I<sub>0</sub> = E/(R+r) = {(I0(params) * 1000).toFixed(1)} mA
          </p>
        </>
      }
      charts={
        <>
          <LiveChart
            sim={sim}
            title="Tensions"
            window={win}
            timeScale={1000}
            timeLabel="t (ms)"
            yUnit="u (V)"
            series={[
              { label: 'uR(t)', color: '#3e9bff', get: (s) => derived(s, sim.paramsRef.current).uR },
              { label: 'uB(t)', color: '#e5484d', get: (s) => derived(s, sim.paramsRef.current).uB },
            ]}
            guides={(p, s) => [
              { axis: 'y', value: p.E, label: 'E', color: '#8a8f98' },
              { axis: 'x', value: s.tSwitch + tau(p), label: 'τ', color: '#e0a000' },
            ]}
          />
          <LiveChart
            sim={sim}
            title="Intensité du courant"
            window={win}
            timeScale={1000}
            timeLabel="t (ms)"
            yUnit="i (mA)"
            series={[{ label: 'i(t)', color: '#30a46c', get: (s) => s.i * 1000 }]}
            guides={(p, s) => [
              { axis: 'y', value: I0(p) * 1000, label: 'I₀', color: '#8a8f98' },
              {
                axis: 'y',
                value: (s.k === 1 ? I0(p) + (s.iSwitch - I0(p)) * Math.exp(-1) : s.iSwitch * Math.exp(-1)) * 1000,
                label: s.k === 1 ? '0,63 I₀' : '0,37 i₀',
                color: '#e0a000',
              },
              { axis: 'x', value: s.tSwitch + tau(p), label: 'τ', color: '#e0a000' },
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
          <h3>La bobine</h3>
          <p>Tension aux bornes d’une bobine (L, r), en convention récepteur :</p>
          <p className="eq">u<sub>B</sub> = L · di/dt + r · i</p>
          <p>La bobine s’oppose aux variations du courant (auto-induction) : i(t) est toujours une fonction continue du temps.</p>
        </section>
        <section>
          <h3>Établissement (K en 1)</h3>
          <p className="eq">L · di/dt + (R + r) i = E</p>
          <p className="eq">i(t) = I<sub>0</sub> (1 − e<sup>−t/τ</sup>)    I<sub>0</sub> = E/(R + r)</p>
        </section>
        <section>
          <h3>Rupture (K en 2)</h3>
          <p className="eq">i(t) = i<sub>0</sub> e<sup>−t/τ</sup>    τ = L/(R + r)</p>
          <p>À t = τ : i = 0,63 I<sub>0</sub> (établissement) ou 0,37 i<sub>0</sub> (rupture). Énergie emmagasinée : E<sub>L</sub> = ½ L i².</p>
        </section>
        <section>
          <h3>À toi de tester</h3>
          <ul>
            <li>Double L : que devient τ ? Et si tu doubles R ?</li>
            <li>Au moment où tu bascules K, regarde u<sub>B</sub> : pourquoi change-t-elle brusquement alors que i est continue ?</li>
            <li>Mets r = 0 : que vaut u<sub>B</sub> en régime permanent ?</li>
            <li>Compare avec le dipôle RC : quelle grandeur est continue dans chaque cas ?</li>
          </ul>
        </section>
      </div>
    </>
  )
}
