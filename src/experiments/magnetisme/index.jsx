import { useState } from 'react'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import Plot from '../../components/Plot.jsx'
import { useSimulation } from '../../lib/useSimulation.js'
import { clockModel } from '../../lib/color.js'
import { DEFAULTS, Bsol, alpha, BH, MU0 } from './model.js'
import MagnetScene from './Scene.jsx'

export const meta = {
  id: 'magnetisme',
  title: 'Interaction magnétique : aimant, solénoïde, boussole',
  level: '3e année',
  sections: 'Maths · Sc. Exp. · Sc. Tech.',
  chapter: 'Interactions : interaction magnétique',
}

export default function MagnetExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(clockModel, params)
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const sol = params.mode === 'solenoide'
  const B = Bsol(params)
  const a = (alpha(params) * 180) / Math.PI

  const bLine = []
  const tanLine = []
  for (let I = 0; I <= 0.1; I += 0.002) {
    const b = Bsol({ ...params, I })
    bLine.push([I * 1000, b * 1000])
    tanLine.push([I * 1000, b / BH])
  }

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={[1]}
      camera={{ position: [0.2, 4.2, 3.4], target: [0, 0, 0.1] }}
      scene={<MagnetScene sim={sim} />}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        sol ? (
          <>
            <div className="state charge">Spectre magnétique d’un solénoïde parcouru par un courant</div>
            <div>B = µ₀·N·I / L = <b>{(B * 1000).toFixed(3)} mT</b></div>
            <div>Boussole au centre : tan α = B / B<sub>H</sub> → α = <b>{a.toFixed(1)}°</b></div>
            <div className="small">B<sub>H</sub> (champ terrestre) = 2·10⁻⁵ T</div>
          </>
        ) : (
          <>
            <div className="state charge">Spectre magnétique d’un aimant droit</div>
            <div>Les lignes de champ sortent du pôle Nord et entrent par le pôle Sud.</div>
            <div className="small">Chaque aiguille aimantée s’oriente selon le champ B : son pôle Nord (rouge) indique le sens de B.</div>
          </>
        )
      }
      controls={
        <>
          <div className="speed" role="group" aria-label="Source du champ">
            <span>Source</span>
            <button className={!sol ? 'on' : ''} onClick={() => set('mode')('aimant')}>Aimant droit</button>
            <button className={sol ? 'on' : ''} onClick={() => set('mode')('solenoide')}>Solénoïde</button>
          </div>
          <label className="check">
            <input type="checkbox" checked={params.needles} onChange={(e) => set('needles')(e.target.checked)} /> Afficher les aiguilles aimantées
          </label>
          {sol && (
            <>
              <Slider label="Intensité du courant I" value={params.I * 1000} min={0} max={100} step={1} unit="mA" onChange={(v) => set('I')(v / 1000)} />
              <Slider label="Nombre de spires N" value={params.N} min={50} max={500} step={10} unit="" onChange={set('N')} />
              <Slider label="Longueur L" value={params.L} min={8} max={20} step={1} unit="cm" onChange={set('L')} />
              <p className="formula">n = N/L = {(params.N / (params.L / 100)).toFixed(0)} spires/m · µ₀ = 4π·10⁻⁷ SI</p>
            </>
          )}
        </>
      }
      charts={
        <>
          <Plot title="B au centre du solénoïde en fonction de I" xLabel="I (mA)" yLabel="B (mT)" xMin={0} xMax={100} yMin={0} yMax={Math.max(...bLine.map((q) => q[1])) * 1.05 || 1} curves={[{ pts: bLine, color: '#3e6fb8' }]} points={sol ? [{ x: params.I * 1000, y: B * 1000 }] : []} />
          <Plot title="tan α en fonction de I : droite (mesure de B_H)" xLabel="I (mA)" yLabel="tan α" xMin={0} xMax={100} yMin={0} yMax={Math.max(...tanLine.map((q) => q[1])) * 1.05 || 1} curves={[{ pts: tanLine, color: '#e5484d' }]} points={sol ? [{ x: params.I * 1000, y: B / BH }] : []} />
        </>
      }
      course={
        <>
          <h2>Le cours en bref</h2>
          <div className="course-grid">
            <section>
              <h3>Champ magnétique</h3>
              <p>Un aimant ou un courant crée un champ magnétique B (en tesla, T). Une petite aiguille aimantée s’oriente selon B, de son pôle Sud vers son pôle Nord.</p>
              <p>Les lignes de champ (visibles avec de la limaille de fer) sortent du pôle Nord et rentrent par le pôle Sud.</p>
            </section>
            <section>
              <h3>Solénoïde</h3>
              <p>À l’intérieur d’un solénoïde long, le champ est <b>uniforme</b>, parallèle à l’axe :</p>
              <p className="eq">B = µ₀·N·I / L = µ₀·n·I</p>
              <p>Le sens de B se trouve avec la règle de la main droite (ou du bonhomme d’Ampère). À l’extérieur, le solénoïde se comporte comme un aimant droit.</p>
            </section>
            <section>
              <h3>Mesure avec une boussole</h3>
              <p>Axe du solénoïde perpendiculaire au méridien magnétique : l’aiguille s’oriente selon B + B<sub>H</sub>.</p>
              <p className="eq">tan α = B / B<sub>H</sub></p>
              <p>La droite tan α = f(I) permet de mesurer B<sub>H</sub> ou de vérifier la valeur de µ₀.</p>
            </section>
            <section>
              <h3>À toi de tester</h3>
              <ul>
                <li>Où les lignes de champ de l’aimant sont-elles les plus serrées ?</li>
                <li>Double I : que devient B ? et α ?</li>
                <li>À I fixé, double N : que se passe-t-il ?</li>
              </ul>
            </section>
          </div>
        </>
      }
    />
  )
}
