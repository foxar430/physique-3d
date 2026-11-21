import { useEffect, useState } from 'react'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import LiveChart from '../../components/LiveChart.jsx'
import { useSimulation, useSampled } from '../../lib/useSimulation.js'
import { springModel, DEFAULTS, T0, energies } from './model.js'
import SpringScene from './Scene.jsx'

export const meta = {
  id: 'ressort',
  title: 'Oscillations libres d’un pendule élastique',
  level: '4e année (Bac)',
  sections: 'Maths · Sc. Exp. · Sc. Tech.',
  chapter: 'Évolution d’un système mécanique, ch. 1',
}

export default function SpringExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(springModel, params)
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const period = T0(params)
  const m = params.m / 1000
  const h0 = 2 * Math.sqrt(params.k * m) // amortissement critique

  // changer les conditions initiales relance l'expérience
  useEffect(() => {
    sim.reset()
  }, [params.x0, params.v0]) // eslint-disable-line react-hooks/exhaustive-deps

  const read = useSampled(sim, (s) => ({ x: s.x, v: s.v, ...energies(s, sim.paramsRef.current) }))

  const regime =
    params.h === 0 ? 'Non amorti : oscillations sinusoïdales' : params.h < h0 ? 'Pseudo-périodique (amorti)' : params.h === h0 ? 'Critique' : 'Apériodique'

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      camera={{ position: [0.2, 3.2, 5.8], target: [0, 0.4, 0] }}
      scene={<SpringScene sim={sim} />}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        <>
          <div className="state charge">{regime}</div>
          <div>T₀ = 2π√(m/k) = <b>{period.toFixed(3)} s</b></div>
          <div>x = <b>{(read.x * 100).toFixed(2)} cm</b></div>
          <div>v = <b>{(read.v * 100).toFixed(1)} cm/s</b></div>
          <div>E = E<sub>c</sub> + E<sub>p</sub> = <b>{(read.E * 1000).toFixed(2)} mJ</b></div>
          <div className="legend-row">
            <span style={{ color: '#ff6b6b' }}>➜ T = −k·x</span> <span style={{ color: '#4cd17a' }}>➜ vitesse v</span>
          </div>
        </>
      }
      controls={
        <>
          <Slider label="Raideur du ressort k" value={params.k} min={5} max={100} step={1} unit="N/m" onChange={set('k')} />
          <Slider label="Masse du solide m" value={params.m} min={50} max={1000} step={10} unit="g" onChange={set('m')} />
          <Slider
            label="Frottement h (f = −h·v)"
            value={params.h}
            min={0}
            max={3}
            step={0.05}
            unit="kg/s"
            onChange={set('h')}
            format={(v) => v.toFixed(2)}
          />
          <Slider label="Écart initial x₀" value={params.x0} min={-10} max={10} step={0.5} unit="cm" onChange={set('x0')} />
          <Slider label="Vitesse initiale v₀" value={params.v0} min={-100} max={100} step={5} unit="cm/s" onChange={set('v0')} />
          <p className="formula">
            T₀ = {period.toFixed(3)} s · N₀ = {(1 / period).toFixed(2)} Hz
            <br />
            Amortissement critique : h ≈ {h0.toFixed(2)} kg/s
          </p>
        </>
      }
      charts={
        <>
          <LiveChart
            sim={sim}
            title="Élongation"
            window={Math.max(4 * period, 2)}
            yUnit="x (cm)"
            series={[{ label: 'x(t)', color: '#e5484d', get: (s) => s.x * 100 }]}
            guides={(p) => {
              const X = Math.hypot(p.x0, (p.v0 / 100) * Math.sqrt(p.m / 1000 / p.k) * 100)
              return [
                { axis: 'y', value: X, label: '+Xm', color: '#8a8f98' },
                { axis: 'y', value: -X, label: '−Xm', color: '#8a8f98' },
                { axis: 'x', value: T0(p), label: 'T₀', color: '#e0a000' },
              ]
            }}
          />
          <LiveChart
            sim={sim}
            title="Énergies"
            window={Math.max(4 * period, 2)}
            yUnit="E (mJ)"
            series={[
              { label: 'Ec', color: '#30a46c', get: (s) => energies(s, sim.paramsRef.current).Ec * 1000 },
              { label: 'Ep', color: '#3e9bff', get: (s) => energies(s, sim.paramsRef.current).Ep * 1000 },
              { label: 'E', color: '#e0a000', get: (s) => energies(s, sim.paramsRef.current).E * 1000 },
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
          <p>Système : le solide. Forces : poids, réaction du rail, tension du ressort T = −k·x, frottement f = −h·v.</p>
          <p>La relation fondamentale de la dynamique (2e loi de Newton) projetée sur l’axe x donne :</p>
          <p className="eq">m·d²x/dt² + h·dx/dt + k·x = 0</p>
        </section>
        <section>
          <h3>Sans frottement (h = 0)</h3>
          <p className="eq">x(t) = X<sub>m</sub> sin(ω<sub>0</sub>t + φ)    ω<sub>0</sub> = √(k/m)</p>
          <p>Période propre : <b>T<sub>0</sub> = 2π√(m/k)</b>. Elle ne dépend pas de l’amplitude.</p>
          <p>L’énergie mécanique E = ½mv² + ½kx² = ½kX<sub>m</sub>² est conservée.</p>
        </section>
        <section>
          <h3>Avec frottement (h &gt; 0)</h3>
          <ul>
            <li>Frottement faible : régime <b>pseudo-périodique</b>, l’amplitude décroît et la pseudo-période T ≈ T<sub>0</sub>.</li>
            <li>Frottement important : régime <b>apériodique</b>, sans oscillation.</li>
            <li>dE/dt = −h·v² &lt; 0 : l’énergie mécanique diminue, dissipée en chaleur.</li>
          </ul>
        </section>
        <section>
          <h3>À toi de tester</h3>
          <ul>
            <li>Multiplie m par 4 : comment varie T<sub>0</sub> ?</li>
            <li>Change x<sub>0</sub> : la période change-t-elle ?</li>
            <li>Observe Ec et Ep : quand sont-elles maximales ?</li>
            <li>Cherche la valeur de h où les oscillations disparaissent.</li>
          </ul>
        </section>
      </div>
    </>
  )
}
