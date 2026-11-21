import { useState } from 'react'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import Plot from '../../components/Plot.jsx'
import { useSimulation } from '../../lib/useSimulation.js'
import { clockModel } from '../../lib/color.js'
import { DEFAULTS, PARTICLES, v0, yAt, exitY, hitsPlate, hitX, screenY, E } from './model.js'
import DeflectionScene from './Scene.jsx'

export const meta = {
  id: 'particule-e',
  title: 'Particule chargée dans un champ électrique uniforme',
  level: '3e année',
  sections: 'Maths · Sc. Exp. · Sc. Tech.',
  chapter: 'Mouvement dans un champ électrique uniforme',
}

export default function DeflectionExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(clockModel, params)
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const pa = PARTICLES[params.particle]
  const hit = hitsPlate(params)
  const Ys = screenY(params)
  const xEnd = hit ? hitX(params) : params.L / 2 + params.D

  const traj = []
  for (let k = 0; k <= 120; k++) {
    const x = (xEnd * k) / 120
    traj.push([x, yAt(x, params)])
  }
  const lim = Math.max(8, Math.abs(Ys) * 1.1)
  const uLine = []
  for (let U = -300; U <= 300; U += 10) uLine.push([U, screenY({ ...params, U })])

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={[1]}
      camera={{ position: [0.2, 2.6, 6.4], target: [0.3, 1.2, 0] }}
      scene={<DeflectionScene sim={sim} />}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        <>
          <div className="state charge">{hit ? 'La particule heurte une plaque !' : `Déviée vers la plaque ${pa.q * params.U < 0 ? '+' : '−'}`}</div>
          <div>v₀ = √(2|q|U₀/m) = <b>{(v0(params) / 1000).toExponential(2)} km/s</b></div>
          <div>E = U/d = <b>{E(params).toExponential(2)} V/m</b></div>
          <div>Sortie des plaques : y<sub>s</sub> = <b>{exitY(params).toFixed(2)} cm</b></div>
          {!hit && <div>Déflexion sur l’écran Y = <b>{Ys.toFixed(2)} cm</b></div>}
        </>
      }
      controls={
        <>
          <div className="speed" role="group" aria-label="Particule">
            <span>Particule</span>
            {Object.entries(PARTICLES).map(([k, v]) => (
              <button key={k} className={params.particle === k ? 'on' : ''} onClick={() => set('particle')(k)}>{v.name}</button>
            ))}
          </div>
          <Slider label="Tension accélératrice U₀" value={params.U0} min={200} max={3000} step={50} unit="V" onChange={set('U0')} />
          <Slider label="Tension entre les plaques U" value={params.U} min={-300} max={300} step={5} unit="V" onChange={set('U')} />
          <Slider label="Distance entre les plaques d" value={params.d} min={1} max={4} step={0.1} unit="cm" onChange={set('d')} format={(v) => v.toFixed(1)} />
          <Slider label="Longueur des plaques L" value={params.L} min={4} max={10} step={0.5} unit="cm" onChange={set('L')} format={(v) => v.toFixed(1)} />
          <Slider label="Distance plaques-écran D" value={params.D} min={10} max={30} step={1} unit="cm" onChange={set('D')} />
          <p className="formula">
            Y = L·D·U / (2·d·U₀) : la déflexion est proportionnelle à U.
            <br />
            Elle ne dépend ni de la masse ni de la valeur de la charge.
          </p>
        </>
      }
      charts={
        <>
          <Plot
            title="Trajectoire y(x) (x depuis l’entrée des plaques)"
            xLabel="x (cm)"
            yLabel="y (cm)"
            xMin={0}
            xMax={params.L / 2 + params.D}
            yMin={-lim}
            yMax={lim}
            curves={[{ pts: traj, color: pa.color }]}
            hlines={[{ v: params.d / 2, label: 'plaque', color: '#8a8f98' }, { v: -params.d / 2, color: '#8a8f98' }]}
            vlines={[{ v: params.L, label: 'sortie', color: '#8a8f98' }]}
          />
          <Plot
            title="Déflexion Y sur l’écran en fonction de U"
            xLabel="U (V)"
            yLabel="Y (cm)"
            xMin={-300}
            xMax={300}
            yMin={-8}
            yMax={8}
            curves={[{ pts: uLine, color: '#30a46c' }]}
            points={hit ? [] : [{ x: params.U, y: Ys }]}
            hlines={[{ v: 7.5, label: 'bord de l’écran', color: '#8a8f98' }, { v: -7.5, color: '#8a8f98' }]}
          />
        </>
      }
      course={
        <>
          <h2>Le cours en bref</h2>
          <div className="course-grid">
            <section>
              <h3>Accélération par U₀</h3>
              <p>Entre la cathode et l’anode, le théorème de l’énergie cinétique donne :</p>
              <p className="eq">½·m·v₀² = |q|·U₀</p>
            </section>
            <section>
              <h3>Entre les plaques</h3>
              <p>Champ uniforme E = U/d, dirigé de la plaque + vers la plaque −. Force F = q·E (le poids est négligeable).</p>
              <p className="eq">a = q·E / m (constante, perpendiculaire aux plaques)</p>
              <p className="eq">y = q·U·x² / (2·m·d·v₀²) : parabole</p>
              <p>Un électron est dévié vers la plaque +, un proton vers la plaque −.</p>
            </section>
            <section>
              <h3>Après les plaques</h3>
              <p>Plus de force : mouvement rectiligne uniforme. La droite de sortie passe par le milieu des plaques, d’où :</p>
              <p className="eq">Y = L·D·U / (2·d·U₀)</p>
              <p>C’est le principe de l’oscilloscope : le spot dévie proportionnellement à la tension mesurée.</p>
            </section>
            <section>
              <h3>À toi de tester</h3>
              <ul>
                <li>Inverse U : que fait le spot ?</li>
                <li>Remplace l’électron par un proton puis une particule α (même U₀) : la trajectoire change-t-elle ?</li>
                <li>Cherche la tension U qui fait heurter une plaque.</li>
                <li>Double U₀ : que devient Y ?</li>
              </ul>
            </section>
          </div>
        </>
      }
    />
  )
}
