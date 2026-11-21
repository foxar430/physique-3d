import { useEffect, useState } from 'react'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import Plot from '../../components/Plot.jsx'
import LiveChart from '../../components/LiveChart.jsx'
import { useSimulation, useSampled } from '../../lib/useSimulation.js'
import { laplaceModel, DEFAULTS, force, torque } from './model.js'
import LaplaceScene from './Scene.jsx'

export const meta = {
  id: 'laplace',
  title: 'Force de Laplace : rails et roue de Barlow',
  level: '3e année',
  sections: 'Maths · Sc. Tech.',
  chapter: 'Interactions : force de Laplace',
}

export default function LaplaceExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(laplaceModel, params, { speed: 0.5 })
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const rails = params.mode === 'rails'
  const F = force(params)
  const read = useSampled(sim, (s) => ({ x: s.x, v: s.v, w: s.w }))

  useEffect(() => {
    sim.reset()
  }, [params.mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const fLine = []
  for (let I = -6; I <= 6; I += 0.5) fLine.push([I, -force({ ...params, I }) * 1000])

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={[0.25, 0.5, 1]}
      camera={rails ? { position: [0.6, 2.6, 3.8], target: [0, 0.5, 0] } : { position: [0.6, 1.8, 3.6], target: [0.4, 1.0, 0] }}
      scene={<LaplaceScene sim={sim} />}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        rails ? (
          <>
            <div className="state charge">La tige est mise en mouvement par la force de Laplace</div>
            <div>F = I·ℓ·B = <b>{(Math.abs(F) * 1000).toFixed(1)} mN</b> (dans l’entrefer)</div>
            <div>x = <b>{(read.x * 100).toFixed(1)} cm</b> · v = <b>{(read.v * 100).toFixed(1)} cm/s</b></div>
          </>
        ) : (
          <>
            <div className="state charge">Roue de Barlow : un petit moteur électrique</div>
            <div>Moment Γ = I·B·R²/2 = <b>{(Math.abs(torque(params)) * 1e6).toFixed(0)} µN·m</b></div>
            <div>Vitesse de rotation : <b>{((read.w / (2 * Math.PI)) * 60).toFixed(0)} tr/min</b></div>
          </>
        )
      }
      controls={
        <>
          <div className="speed" role="group" aria-label="Expérience">
            <span>Expérience</span>
            <button className={rails ? 'on' : ''} onClick={() => set('mode')('rails')}>Rails de Laplace</button>
            <button className={!rails ? 'on' : ''} onClick={() => set('mode')('barlow')}>Roue de Barlow</button>
          </div>
          <Slider label="Intensité I" value={params.I} min={-6} max={6} step={0.5} unit="A" onChange={set('I')} format={(v) => v.toFixed(1)} />
          <Slider label="Champ B de l’aimant" value={params.B} min={10} max={150} step={5} unit="mT" onChange={set('B')} />
          {rails && (
            <>
              <Slider label="Écartement des rails ℓ" value={params.l} min={5} max={15} step={0.5} unit="cm" onChange={set('l')} format={(v) => v.toFixed(1)} />
              <Slider label="Masse de la tige m" value={params.m} min={5} max={60} step={1} unit="g" onChange={set('m')} />
            </>
          )}
          <label className="check">
            <input type="checkbox" checked={params.flip} onChange={(e) => set('flip')(e.target.checked)} /> Retourner l’aimant (inverser B)
          </label>
          <button className="switch-btn" onClick={sim.reset}>Replacer la tige / arrêter la roue</button>
        </>
      }
      charts={
        <>
          <Plot title="Intensité de la force F en fonction de I (pente ℓ·B)" xLabel="I (A)" yLabel="F (mN)" xMin={-6} xMax={6} yMin={-140} yMax={140} curves={[{ pts: fLine, color: '#e5484d' }]} points={[{ x: params.I, y: -F * 1000 }]} />
          {rails ? (
            <LiveChart sim={sim} title="Vitesse de la tige v(t)" window={3} yUnit="v (cm/s)" series={[{ label: 'v(t)', color: '#3e9bff', get: (s) => s.v * 100 }]} />
          ) : (
            <LiveChart sim={sim} title="Vitesse de rotation de la roue" window={6} yUnit="n (tr/min)" series={[{ label: 'n(t)', color: '#c8733a', get: (s) => (s.w / (2 * Math.PI)) * 60 }]} />
          )}
        </>
      }
      course={
        <>
          <h2>Le cours en bref</h2>
          <div className="course-grid">
            <section>
              <h3>La force de Laplace</h3>
              <p>Un conducteur de longueur ℓ, parcouru par un courant I et placé dans un champ magnétique B, subit :</p>
              <p className="eq">F = I·ℓ ∧ B    F = I·ℓ·B·sin(ℓ, B)</p>
              <p>Point d’application : milieu de la partie du conducteur dans le champ. Sens : règle des trois doigts de la main droite.</p>
            </section>
            <section>
              <h3>Rails de Laplace</h3>
              <p>La tige ferme le circuit. Dans l’entrefer de l’aimant, elle subit F = I·ℓ·B, parallèle aux rails : elle roule. Inverser I ou B inverse le sens de F.</p>
            </section>
            <section>
              <h3>Roue de Barlow et moteur</h3>
              <p>Le courant passe de l’axe à la pointe plongée dans le mercure. La force de Laplace sur ce rayon fait tourner la roue : c’est le principe du moteur électrique, qui transforme l’énergie électrique en énergie mécanique.</p>
            </section>
            <section>
              <h3>À toi de tester</h3>
              <ul>
                <li>Inverse le courant : que fait la tige ?</li>
                <li>Retourne l’aimant ET inverse I : le sens de F change-t-il ?</li>
                <li>Double I : que devient F ? Vérifie sur la courbe.</li>
              </ul>
            </section>
          </div>
        </>
      }
    />
  )
}
