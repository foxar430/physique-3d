import { useState } from 'react'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import Plot from '../../components/Plot.jsx'
import { useSimulation } from '../../lib/useSimulation.js'
import { clockModel } from '../../lib/color.js'
import { DEFAULTS, electron, spectro, cyclotron, me, e, vFromU, radius, ISOTOPES, u } from './model.js'
import MagneticScene from './Scene.jsx'

export const meta = {
  id: 'particule-b',
  title: 'Particule chargée dans un champ magnétique uniforme',
  level: '3e année',
  sections: 'Maths · Sc. Exp. · Sc. Tech.',
  chapter: 'Mouvement dans un champ magnétique uniforme',
}

const CAMERAS = {
  cercle: { position: [0.2, 2.2, 5.4], target: [0, 1.6, 0] },
  spectro: { position: [0.4, 4.6, 4.6], target: [0.4, 0.6, -0.4] },
  cyclo: { position: [0.2, 3.8, 3.6], target: [0, 0.6, 0] },
}

export default function MagneticExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(clockModel, params)
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const mode = params.mode
  const el = electron(params)
  const ions = spectro(params)
  const cy = cyclotron(params)

  let readouts, controls, charts
  if (mode === 'cercle') {
    const pts = []
    for (let B = 0.4; B <= 3; B += 0.05) pts.push([B, radius(me, e, el.v, B / 1000) * 100])
    const ptsU = []
    for (let U = 100; U <= 400; U += 5) ptsU.push([U, radius(me, e, vFromU(me, e, U), params.B / 1000) * 100])
    readouts = (
      <>
        <div className="state charge">Électrons : mouvement circulaire uniforme</div>
        <div>v = √(2eU/m) = <b>{(el.v / 1e6).toFixed(2)}·10⁶ m/s</b></div>
        <div>R = m·v / (e·B) = <b>{(el.R * 100).toFixed(2)} cm</b></div>
        <div>T = 2πm / (e·B) = <b>{(el.T * 1e9).toFixed(1)} ns</b></div>
      </>
    )
    controls = (
      <>
        <Slider label="Tension accélératrice U" value={params.U} min={100} max={400} step={5} unit="V" onChange={set('U')} />
        <Slider label="Champ magnétique B (bobines)" value={params.B} min={0.4} max={3} step={0.05} unit="mT" onChange={set('B')} format={(v) => v.toFixed(2)} />
        <p className="formula">Si le cercle est trop grand, le faisceau touche la paroi de l’ampoule.</p>
      </>
    )
    charts = (
      <>
        <Plot title="Rayon R en fonction de B (U fixé)" xLabel="B (mT)" yLabel="R (cm)" xMin={0.4} xMax={3} yMin={0} yMax={Math.max(...pts.map((q) => q[1])) * 1.05} curves={[{ pts, color: '#5aa8ff' }]} points={[{ x: params.B, y: el.R * 100 }]} />
        <Plot title="Rayon R en fonction de U (B fixé)" xLabel="U (V)" yLabel="R (cm)" xMin={100} xMax={400} yMin={0} yMax={Math.max(...ptsU.map((q) => q[1])) * 1.05} curves={[{ pts: ptsU, color: '#30a46c' }]} points={[{ x: params.U, y: el.R * 100 }]} />
      </>
    )
  } else if (mode === 'spectro') {
    const curves = ISOTOPES.map((iso) => {
      const pts = []
      for (let B = 0.1; B <= 0.6; B += 0.01) pts.push([B, 2 * radius(iso.A * u, e, vFromU(iso.A * u, e, params.Us), B) * 100])
      return { pts, color: iso.color }
    })
    readouts = (
      <>
        <div className="state charge">Spectrographe de masse : séparation des isotopes du néon</div>
        {ions.map((io) => (
          <div key={io.name} style={{ color: io.color }}>
            {io.name} : R = <b>{(io.R * 100).toFixed(2)} cm</b> · impact à 2R = <b>{(2 * io.R * 100).toFixed(2)} cm</b>
          </div>
        ))}
        <div>Écart des impacts : <b>{((ions[1].R - ions[0].R) * 200).toFixed(2)} cm</b></div>
      </>
    )
    controls = (
      <>
        <Slider label="Tension accélératrice U" value={params.Us} min={500} max={5000} step={100} unit="V" onChange={set('Us')} />
        <Slider label="Champ magnétique B" value={params.Bs} min={0.1} max={0.6} step={0.01} unit="T" onChange={set('Bs')} format={(v) => v.toFixed(2)} />
        <p className="formula">R = (1/B)·√(2mU/q) : le rayon augmente avec la masse. Les ions lourds vont plus loin sur la plaque.</p>
      </>
    )
    charts = (
      <>
        <Plot title="Position de l’impact 2R en fonction de B" xLabel="B (T)" yLabel="2R (cm)" xMin={0.1} xMax={0.6} yMin={0} yMax={Math.max(...curves[1].pts.map((q) => q[1])) * 1.05} curves={curves} points={ions.map((io) => ({ x: params.Bs, y: 2 * io.R * 100, color: io.color }))} />
        <Plot
          title="2R en fonction de √m (U et B fixés) : droite"
          xLabel="√A"
          yLabel="2R (cm)"
          xMin={4}
          xMax={5}
          yMin={0}
          yMax={Math.max(2 * ions[1].R * 100 * 1.2, 1)}
          curves={[{ pts: [[4, (2 * ions[0].R * 100 * 4) / Math.sqrt(20)], [5, (2 * ions[0].R * 100 * 5) / Math.sqrt(20)]], color: '#8a8f98', dash: '5 4' }]}
          points={ions.map((io) => ({ x: Math.sqrt(io.A), y: 2 * io.R * 100, color: io.color, label: io.name }))}
        />
      </>
    )
  } else {
    const pts = []
    for (let B = 0.5; B <= 2; B += 0.05) pts.push([B, cyclotron({ ...params, Bc: B }).f / 1e6])
    readouts = (
      <>
        <div className="state charge">Cyclotron à protons (rayon des dees 50 cm)</div>
        <div>Fréquence de la tension : f = eB / (2πm) = <b>{(cy.f / 1e6).toFixed(2)} MHz</b></div>
        <div>Nombre de tours : <b>{Math.floor(cy.turns)}</b></div>
        <div>Énergie de sortie : E<sub>c</sub> = e²B²R²/(2m) = <b>{cy.EcMeV.toFixed(1)} MeV</b></div>
      </>
    )
    controls = (
      <>
        <Slider label="Champ magnétique B" value={params.Bc} min={0.5} max={2} step={0.05} unit="T" onChange={set('Bc')} format={(v) => v.toFixed(2)} />
        <Slider label="Tension entre les dees U" value={params.Uc} min={50} max={300} step={10} unit="kV" onChange={set('Uc')} />
        <p className="formula">La durée d’un demi-tour ne dépend pas de la vitesse : la tension alternative reste synchronisée. L’énergie finale ne dépend pas de U.</p>
      </>
    )
    charts = (
      <>
        <Plot title="Fréquence du cyclotron f(B)" xLabel="B (T)" yLabel="f (MHz)" xMin={0.5} xMax={2} yMin={0} yMax={32} curves={[{ pts, color: '#ff6b6b' }]} points={[{ x: params.Bc, y: cy.f / 1e6 }]} />
        <Plot
          title="Rayon de chaque demi-tour (il croît comme √n)"
          xLabel="n (passage)"
          yLabel="R (cm)"
          xMin={0}
          xMax={Math.max(cy.radii.length, 2)}
          yMin={0}
          yMax={55}
          curves={[{ pts: cy.radii.map((R, n) => [n + 1, R * 100]), color: '#ffd23f' }]}
        />
      </>
    )
  }

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={[1]}
      camera={CAMERAS[mode]}
      scene={<MagneticScene sim={sim} />}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={readouts}
      controls={
        <>
          <div className="speed" role="group" aria-label="Expérience">
            <span>Expérience</span>
            <button className={mode === 'cercle' ? 'on' : ''} onClick={() => set('mode')('cercle')}>Faisceau d’électrons</button>
            <button className={mode === 'spectro' ? 'on' : ''} onClick={() => set('mode')('spectro')}>Spectrographe</button>
            <button className={mode === 'cyclo' ? 'on' : ''} onClick={() => set('mode')('cyclo')}>Cyclotron</button>
          </div>
          {controls}
        </>
      }
      charts={charts}
      course={
        <>
          <h2>Le cours en bref</h2>
          <div className="course-grid">
            <section>
              <h3>Force de Lorentz</h3>
              <p className="eq">F = q·v ∧ B    F = |q|·v·B·sin(v, B)</p>
              <p>F est perpendiculaire à v : elle ne travaille pas, la vitesse garde la même valeur. Le sens se trouve avec la règle des trois doigts de la main droite (en tenant compte du signe de q).</p>
            </section>
            <section>
              <h3>Mouvement circulaire uniforme</h3>
              <p>Si v ⟂ B, la trajectoire est un cercle dans le plan perpendiculaire à B :</p>
              <p className="eq">R = m·v / (|q|·B)    T = 2πm / (|q|·B)</p>
              <p>La période ne dépend pas de la vitesse.</p>
            </section>
            <section>
              <h3>Applications</h3>
              <ul>
                <li><b>Spectrographe de masse</b> : des ions de même charge accélérés sous U arrivent à 2R = (2/B)√(2mU/q). On sépare les isotopes.</li>
                <li><b>Cyclotron</b> : les particules sont accélérées à chaque passage entre les dees, par une tension de fréquence f = |q|B/(2πm).</li>
              </ul>
            </section>
            <section>
              <h3>À toi de tester</h3>
              <ul>
                <li>Double B : que devient R ? Et si tu multiplies U par 4 ?</li>
                <li>Quel isotope du néon arrive le plus loin ? Pourquoi ?</li>
                <li>Cyclotron : l’énergie de sortie dépend-elle de U ?</li>
              </ul>
            </section>
          </div>
        </>
      }
    />
  )
}
