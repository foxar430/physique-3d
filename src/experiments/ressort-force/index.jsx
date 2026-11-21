import { useState } from 'react'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import LiveChart from '../../components/LiveChart.jsx'
import ResonanceCurve from '../../components/ResonanceCurve.jsx'
import { useSimulation, useSampled } from '../../lib/useSimulation.js'
import { forcedSpring, DEFAULTS, N0, Nr, steady, force } from './model.js'
import ForcedSpringScene from './Scene.jsx'

export const meta = {
  id: 'ressort-force',
  title: 'Oscillations forcées d’un pendule élastique : résonance',
  level: '4e année (Bac)',
  sections: 'Maths · Sc. Exp. · Sc. Tech.',
  chapter: 'Évolution d’un système mécanique, ch. 2',
}

const SPEEDS = [0.1, 0.25, 0.5, 1, 2]

export default function ForcedSpringExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const [curve, setCurve] = useState('x')
  const sim = useSimulation(forcedSpring, params, { speed: 0.5 })
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const n0 = N0(params)
  const nr = Nr(params)
  const st = steady(params)
  const read = useSampled(sim, (s) => ({ x: s.x, v: s.v }))
  const phiDeg = (st.phi * 180) / Math.PI
  const T = 1 / params.N
  const nMax = Math.max(3, Math.ceil(n0 * 2.2))
  const ticks = []
  for (let v = 0; v <= nMax; v += nMax > 4 ? 1 : 0.5) ticks.push(v)

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={SPEEDS}
      camera={{ position: [0.4, 2.5, 3.9], target: [0.1, 0.35, -0.1] }}
      scene={<ForcedSpringScene sim={sim} />}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        <>
          <div className="state charge">
            {Math.abs(params.N - n0) / n0 < 0.03 ? 'Résonance de vitesse (N = N₀)' : nr && Math.abs(params.N - nr) / nr < 0.03 ? 'Résonance d’élongation (N = Nr)' : 'Régime forcé : le mobile oscille à la fréquence N de l’excitateur'}
          </div>
          <div>N₀ = (1/2π)√(k/m) = <b>{n0.toFixed(2)} Hz</b></div>
          <div>X<sub>m</sub> = <b>{(st.Xm * 100).toFixed(2)} cm</b> · V<sub>m</sub> = <b>{(st.Vm * 100).toFixed(1)} cm/s</b></div>
          <div>Déphasage φ<sub>F</sub> − φ<sub>x</sub> = <b>{phiDeg.toFixed(0)}°</b></div>
          <div>x = <b>{(read.x * 100).toFixed(2)} cm</b></div>
        </>
      }
      controls={
        <>
          <Slider label="Fréquence de l’excitateur N" value={params.N} min={0.2} max={nMax} step={0.02} unit="Hz" onChange={set('N')} format={(v) => v.toFixed(2)} />
          <button className="switch-btn" onClick={() => setParams((p) => ({ ...p, N: +(nr ?? N0(p)).toFixed(2) }))}>
            Se placer à la résonance d’élongation
          </button>
          <Slider label="Amplitude de l’excitateur Xe" value={params.Xe} min={0.5} max={3} step={0.1} unit="cm" onChange={set('Xe')} format={(v) => v.toFixed(1)} />
          <Slider label="Frottement h" value={params.h} min={0.2} max={3} step={0.05} unit="kg/s" onChange={set('h')} format={(v) => v.toFixed(2)} />
          <Slider label="Raideur k" value={params.k} min={5} max={60} step={1} unit="N/m" onChange={set('k')} />
          <Slider label="Masse m" value={params.m} min={50} max={800} step={10} unit="g" onChange={set('m')} />
          <p className="formula">
            F<sub>m</sub> = k·X<sub>e</sub> = {(params.k * params.Xe / 100).toFixed(2)} N
            <br />
            {nr ? <>Résonance d’élongation : N<sub>r</sub> = {nr.toFixed(2)} Hz &lt; N₀</> : <>Frottement trop fort (h ≥ √(2km)) : pas de résonance d’élongation</>}
          </p>
          <div className="speed" role="group" aria-label="Courbe de résonance">
            <span>Courbe</span>
            <button className={curve === 'x' ? 'on' : ''} onClick={() => setCurve('x')}>Élongation Xm(N)</button>
            <button className={curve === 'v' ? 'on' : ''} onClick={() => setCurve('v')}>Vitesse Vm(N)</button>
          </div>
        </>
      }
      charts={
        <>
          <LiveChart
            sim={sim}
            title="Élongation x(t) et force excitatrice F(t)"
            window={Math.max(4 * T, 3)}
            yUnit=""
            series={[
              { label: 'x(t) (cm)', color: '#e5484d', get: (s) => s.x * 100 },
              { label: 'F(t) (×10 N)', color: '#e0a000', get: (s) => force(s.t, sim.paramsRef.current) * 10 },
            ]}
          />
          {curve === 'x' ? (
            <ResonanceCurve
              params={params}
              nMin={0}
              nMax={nMax}
              xTicks={ticks}
              value={(p, N) => steady(p, N).Xm * 100}
              peak={nr}
              peakLabel="Nr"
              title={<>Résonance d’élongation X<sub>m</sub>(N)</>}
              yLabel="Xm (cm)"
              bandLabel="Xm(Nr)/√2"
            />
          ) : (
            <ResonanceCurve
              params={params}
              nMin={0}
              nMax={nMax}
              xTicks={ticks}
              value={(p, N) => steady(p, N).Vm * 100}
              peak={n0}
              title={<>Résonance de vitesse V<sub>m</sub>(N)</>}
              yLabel="Vm (cm/s)"
              bandLabel="Vm0/√2"
            />
          )}
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
          <h3>Le dispositif</h3>
          <p>Un moteur fait tourner un disque. La bielle déplace l’extrémité du ressort : x<sub>e</sub>(t) = X<sub>e</sub> sin(2πNt). Le solide (l’<b>oscillateur</b>) subit alors une force excitatrice F = F<sub>m</sub> sin(2πNt).</p>
          <p className="eq">m·d²x/dt² + h·dx/dt + k·x = F<sub>m</sub> sin(2πNt)</p>
          <p>Après le régime transitoire, x(t) = X<sub>m</sub> sin(2πNt + φ<sub>x</sub>) : le solide oscille à la fréquence <b>N de l’excitateur</b>.</p>
        </section>
        <section>
          <h3>Amplitude et résonance</h3>
          <p className="eq">X<sub>m</sub> = F<sub>m</sub> / √((k − mω²)² + (hω)²)</p>
          <ul>
            <li><b>Résonance d’élongation</b> pour N<sub>r</sub> &lt; N<sub>0</sub>. Elle n’existe que si l’amortissement est faible ; plus h est petit, plus elle est aiguë et N<sub>r</sub> proche de N<sub>0</sub>.</li>
            <li><b>Résonance de vitesse</b> toujours pour N = N<sub>0</sub> : alors V<sub>m</sub> = F<sub>m</sub>/h et la vitesse est en phase avec F.</li>
          </ul>
        </section>
        <section>
          <h3>Analogie électrique-mécanique</h3>
          <table className="analogy">
            <tbody>
              <tr><td>x</td><td>q</td></tr>
              <tr><td>v = dx/dt</td><td>i = dq/dt</td></tr>
              <tr><td>m</td><td>L</td></tr>
              <tr><td>h</td><td>R</td></tr>
              <tr><td>k</td><td>1/C</td></tr>
              <tr><td>F(t)</td><td>u(t)</td></tr>
            </tbody>
          </table>
          <p>La résonance de vitesse correspond à la résonance d’intensité du circuit RLC.</p>
        </section>
        <section>
          <h3>À toi de tester</h3>
          <ul>
            <li>Balaye N de 0,2 Hz jusqu’au double de N₀ et note l’amplitude.</li>
            <li>Augmente h : que deviennent X<sub>m</sub>(N<sub>r</sub>) et N<sub>r</sub> ?</li>
            <li>À basse fréquence, x et F sont-ils en phase ? Et à haute fréquence ?</li>
            <li>Observe le régime transitoire après un changement de N.</li>
          </ul>
        </section>
      </div>
    </>
  )
}
