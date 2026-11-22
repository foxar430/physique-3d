import { useState } from 'react'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import LiveChart from '../../components/LiveChart.jsx'
import ResonanceCurve from '../../components/ResonanceCurve.jsx'
import CircuitScene from '../../components/three/Circuit.jsx'
import { useSimulation, useSampled } from '../../lib/useSimulation.js'
import { forcedModel, DEFAULTS, N0, steady, Q, u, Rtot, baseSlots, slotsOf } from './model.js'
import CircuitBuilder, { sceneSlots } from '../../components/CircuitBuilder.jsx'

export const meta = {
  id: 'rlc-force',
  title: 'Oscillations électriques forcées : résonance d’intensité',
  level: '4e année (Bac)',
  sections: 'Maths · Sc. Exp. · Sc. Tech.',
  chapter: 'Évolution de systèmes électriques, ch. 4',
}

const SPEEDS = [0.001, 0.002, 0.005, 0.01, 0.02]
const NAMES = { R: <>u<sub>R</sub></>, L: <>u<sub>L</sub></>, C: <>u<sub>C</sub></> }
const SOURCE = { kind: 'gbf', name: 'u', u, display: (s, p) => p.N + ' Hz' }
const METER = { label: 'i', value: (s) => (s.i * 1000).toFixed(1) + ' mA' }

export default function RLCForcedExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(forcedModel, params, { speed: 0.005 })
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const n0 = N0(params)
  const st = steady(params)
  const st0 = steady(params, n0)
  const q = Q(params)
  const cv = sceneSlots(slotsOf(params), NAMES)
  const read = useSampled(sim, (s) => ({ i: s.i }), 4)
  const win = Math.max(3 / params.N, 0.005)
  const phiDeg = (st.phi * 180) / Math.PI
  const nature = Math.abs(phiDeg) < 2 ? 'résistif (résonance)' : phiDeg > 0 ? 'inductif' : 'capacitif'

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={SPEEDS}
      speedNote="Le GBF délivre des dizaines d’oscillations par seconde : la simulation est très ralentie."
      camera={{ position: [0.5, 4.3, 4.7], target: [0.5, 0.15, -0.15] }}
      viewToggles
      scene={(view) => (
        <CircuitScene
          sim={sim}
          params={params}
          view={view}
          source={SOURCE}
          amps={(s) => s.i}
          hasSwitch={false}
          top={cv.top}
          right={cv.right}
          meter={METER}
          current={(s, p) => s.i / (p.Um / Math.max(Rtot(p), 1))}
          charge={(s, p) => s.uC / Math.max(steady(p, N0(p)).Im / (2 * Math.PI * N0(p) * p.C * 1e-6), p.Um)}
        />
      )}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        <>
          <div className="state charge">Circuit {nature}</div>
          <div>N₀ = 1/(2π√(LC)) = <b>{n0.toFixed(1)} Hz</b></div>
          <div>I<sub>m</sub> = U<sub>m</sub>/Z = <b>{(st.Im * 1000).toFixed(1)} mA</b> (Z = {st.Z.toFixed(0)} Ω)</div>
          <div>φ = φ<sub>u</sub> − φ<sub>i</sub> = <b>{phiDeg.toFixed(0)}°</b></div>
          <div>i = <b>{(read.i * 1000).toFixed(1)} mA</b></div>
        </>
      }
      controls={
        <>
          <Slider label="Fréquence du GBF N" value={params.N} min={10} max={400} step={1} unit="Hz" onChange={set('N')} />
          <button className="switch-btn" onClick={() => setParams((p) => ({ ...p, N: Math.round(N0(p)) }))}>
            Se placer à la résonance (N = N₀)
          </button>
          <Slider label="Amplitude Um" value={params.Um} min={1} max={10} step={0.5} unit="V" onChange={set('Um')} />
          <Slider label="Résistance totale R" value={params.R} min={10} max={300} step={5} unit="Ω" onChange={set('R')} />
          <Slider label="Inductance L" value={params.L} min={50} max={1000} step={10} unit="mH" onChange={set('L')} />
          <Slider label="Capacité C" value={params.C} min={1} max={50} step={1} unit="µF" onChange={set('C')} />
          <CircuitBuilder params={params} setParams={setParams} base={baseSlots} types={['C', 'R', 'L']} ranges={{ C: { min: 1, max: 50, step: 1, def: 10, unit: 'µF', fmt: (v) => v }, R: { min: 10, max: 300, step: 5, def: 40, unit: 'Ω', fmt: (v) => v } }} />
          <p className="formula">
            À la résonance : I<sub>m0</sub> = U<sub>m</sub>/R = {(st0.Im * 1000).toFixed(1)} mA
            <br />
            Facteur de qualité Q = Lω₀/R = {q.toFixed(2)}
            {q > 1 && <> · surtension aux bornes de C</>}
          </p>
        </>
      }
      charts={
        <>
          <LiveChart
            sim={sim}
            title="Oscillogrammes : u(t) et uR(t)"
            window={win}
            timeScale={1000}
            timeLabel="t (ms)"
            yUnit="u (V)"
            series={[
              { label: 'u(t) GBF', color: '#e0a000', get: (s) => u(s, sim.paramsRef.current) },
              { label: 'uR(t) = R·i', color: '#3e9bff', get: (s) => s.slotU.R },
            ]}
          />
          <ResonanceCurve params={params} steady={steady} N0={N0} />
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
          <h3>Régime forcé</h3>
          <p>Le GBF impose u(t) = U<sub>m</sub> sin(2πNt). Après un court régime transitoire, i(t) oscille à la fréquence <b>N du GBF</b>, et non à N<sub>0</sub>.</p>
          <p className="eq">L · di/dt + R i + q/C = u(t)</p>
          <p className="eq">i(t) = I<sub>m</sub> sin(2πNt − φ)</p>
        </section>
        <section>
          <h3>Impédance et déphasage</h3>
          <p className="eq">Z = √(R² + (Lω − 1/(Cω))²)    I<sub>m</sub> = U<sub>m</sub>/Z</p>
          <p className="eq">tan φ = (Lω − 1/(Cω)) / R</p>
          <p>φ &gt; 0 : circuit inductif. φ &lt; 0 : circuit capacitif.</p>
        </section>
        <section>
          <h3>Résonance d’intensité</h3>
          <ul>
            <li>Elle a lieu pour N = N<sub>0</sub> = 1/(2π√(LC)) : alors Z = R, I<sub>m</sub> est maximale et φ = 0 (u et i en phase).</li>
            <li>Bande passante à −3 dB : I<sub>m</sub> ≥ I<sub>m0</sub>/√2. Facteur de qualité Q = N<sub>0</sub>/(N<sub>2</sub> − N<sub>1</sub>) = Lω<sub>0</sub>/R.</li>
            <li>Si Q &gt; 1, il y a surtension aux bornes de C : U<sub>Cm</sub> = Q·U<sub>m</sub>.</li>
          </ul>
        </section>
        <section>
          <h3>À toi de tester</h3>
          <ul>
            <li>Fais varier N et observe le décalage entre u(t) et uR(t). Quand sont-ils en phase ?</li>
            <li>Augmente R : la résonance devient-elle plus aiguë ou plus floue ?</li>
            <li>La fréquence de résonance dépend-elle de R ?</li>
            <li>Après un changement de N, observe le court régime transitoire.</li>
          </ul>
        </section>
      </div>
    </>
  )
}
