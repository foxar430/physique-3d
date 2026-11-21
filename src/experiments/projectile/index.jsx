import { useEffect, useState } from 'react'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import LiveChart from '../../components/LiveChart.jsx'
import Plot from '../../components/Plot.jsx'
import { useSimulation, useSampled } from '../../lib/useSimulation.js'
import { projectileModel, DEFAULTS, PLANETS, flight, at, g } from './model.js'
import ProjectileScene from './Scene.jsx'

export const meta = {
  id: 'projectile',
  title: 'Chute libre et mouvement d’un projectile',
  level: '3e année',
  sections: 'Maths · Sc. Exp. · Sc. Tech.',
  chapter: 'Mouvement dans un champ gravitationnel uniforme',
}

const TOGGLES = [
  { key: 'vectors', label: 'Vecteurs vitesse v, vx, vy' },
  { key: 'trajectory', label: 'Trajectoire (parabole)' },
  { key: 'chrono', label: 'Chronophotographie', on: false },
]

export default function ProjectileExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(projectileModel, params, { speed: 0.5 })
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const f = flight(params)
  const G = g(params)
  const read = useSampled(sim, (s) => ({ t: s.t, x: s.x, y: s.y, vx: s.vx, vy: s.vy }))
  const a = (params.alpha * Math.PI) / 180

  useEffect(() => {
    sim.reset()
  }, [params.v0, params.alpha, params.h0, params.planet]) // eslint-disable-line react-hooks/exhaustive-deps

  const traj = []
  for (let k = 0; k <= 100; k++) {
    const q = at((f.tf * k) / 100, params)
    traj.push([q.x, q.y])
  }
  const coef = params.alpha < 90 ? G / (2 * params.v0 ** 2 * Math.cos(a) ** 2) : null

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={[0.1, 0.25, 0.5, 1]}
      camera={{ position: [0.2, 1.9, 5.4], target: [0.3, 0.9, 0] }}
      viewToggles={TOGGLES}
      scene={(view) => <ProjectileScene sim={sim} view={view} />}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        <>
          <div className="state charge">{params.alpha === 90 ? 'Lancer vertical' : params.v0 === 0 ? 'Chute libre' : 'Mouvement parabolique'} · g = {G} m/s² ({PLANETS[params.planet].name})</div>
          <div>t = <b>{read.t.toFixed(2)} s</b> · x = <b>{read.x.toFixed(2)} m</b> · y = <b>{read.y.toFixed(2)} m</b></div>
          <div>v<sub>x</sub> = <b>{read.vx.toFixed(2)}</b> m/s (constante) · v<sub>y</sub> = <b>{read.vy.toFixed(2)}</b> m/s</div>
          <div>Portée <b>{f.range.toFixed(2)} m</b> · flèche <b>{f.top.toFixed(2)} m</b> · durée <b>{f.tf.toFixed(2)} s</b></div>
        </>
      }
      controls={
        <>
          <Slider label="Vitesse initiale v₀" value={params.v0} min={0} max={20} step={0.5} unit="m/s" onChange={set('v0')} format={(v) => v.toFixed(1)} />
          <Slider label="Angle de tir α" value={params.alpha} min={0} max={90} step={1} unit="°" onChange={set('alpha')} />
          <Slider label="Hauteur de lancement h₀" value={params.h0} min={0} max={5} step={0.1} unit="m" onChange={set('h0')} format={(v) => v.toFixed(1)} />
          <div className="speed" role="group" aria-label="Planète">
            <span>Champ g</span>
            {Object.entries(PLANETS).map(([k, pl]) => (
              <button key={k} className={params.planet === k ? 'on' : ''} onClick={() => set('planet')(k)}>{pl.name}</button>
            ))}
          </div>
          <p>
            <button className="link" onClick={() => set('alpha')(45)}>α = 45° (portée maximale si h₀ = 0)</button>
            {' · '}
            <button className="link" onClick={() => setParams((p) => ({ ...p, v0: 0, h0: 4 }))}>chute libre</button>
          </p>
          <p className="formula">
            Équation de la trajectoire :
            <br />
            {coef != null ? <>y = −{coef.toPrecision(3)}·x² + {Math.tan(a).toFixed(3)}·x + {params.h0.toFixed(1)}</> : <>x = 0 (mouvement vertical)</>}
          </p>
        </>
      }
      charts={
        <>
          <Plot
            title="Trajectoire y = f(x)"
            xLabel="x (m)"
            yLabel="y (m)"
            xMin={0}
            xMax={Math.max(f.range * 1.05, 1)}
            yMin={0}
            yMax={Math.max(f.top * 1.15, 0.5)}
            curves={[{ pts: traj, color: '#ffd23f' }]}
            points={[{ x: read.x, y: Math.max(read.y, 0), color: '#e5484d' }]}
          />
          <LiveChart
            sim={sim}
            title="Composantes de la vitesse"
            window={Math.max(f.tf * 1.1, 0.5)}
            yUnit="v (m/s)"
            series={[
              { label: 'vx(t)', color: '#3e9bff', get: (s) => s.vx },
              { label: 'vy(t)', color: '#e5484d', get: (s) => s.vy },
            ]}
            guides={() => [{ axis: 'x', value: f.tS, label: 'sommet', color: '#8a8f98' }]}
          />
        </>
      }
      course={
        <>
          <h2>Le cours en bref</h2>
          <div className="course-grid">
            <section>
              <h3>Le système et la loi</h3>
              <p>Système : le projectile, soumis à son seul poids P = m·g (frottements négligés). La 2e loi de Newton donne :</p>
              <p className="eq">a = g    (vecteur constant, vertical, vers le bas)</p>
              <p>Le mouvement ne dépend pas de la masse.</p>
            </section>
            <section>
              <h3>Équations horaires</h3>
              <p className="eq">a<sub>x</sub> = 0 → v<sub>x</sub> = v<sub>0</sub>cosα → x = v<sub>0</sub>cosα·t</p>
              <p className="eq">a<sub>y</sub> = −g → v<sub>y</sub> = −gt + v<sub>0</sub>sinα → y = −½gt² + v<sub>0</sub>sinα·t + h<sub>0</sub></p>
              <p>Selon x : mouvement uniforme. Selon y : mouvement uniformément varié.</p>
            </section>
            <section>
              <h3>Trajectoire, flèche, portée</h3>
              <p className="eq">y = −g·x² / (2v<sub>0</sub>²cos²α) + x·tanα + h<sub>0</sub></p>
              <p>Au sommet v<sub>y</sub> = 0 : flèche H = v<sub>0</sub>²sin²α / (2g). Pour h<sub>0</sub> = 0, la portée vaut v<sub>0</sub>²sin(2α)/g : elle est maximale pour α = 45°.</p>
            </section>
            <section>
              <h3>À toi de tester</h3>
              <ul>
                <li>Compare les portées pour α = 30° et α = 60°.</li>
                <li>Active la chronophotographie : les écarts horizontaux sont-ils égaux ?</li>
                <li>Refais le même tir sur la Lune.</li>
                <li>Chute libre : combien de temps pour tomber de 4 m ?</li>
              </ul>
            </section>
          </div>
        </>
      }
    />
  )
}
