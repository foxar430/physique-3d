import { useState } from 'react'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import Plot from '../../components/Plot.jsx'
import { useSimulation } from '../../lib/useSimulation.js'
import { clockModel, wavelengthCSS } from '../../lib/color.js'
import { DEFAULTS, theta, spotWidth, intensity, prism, nGlass, APEX } from './model.js'
import DiffractionScene from './Scene.jsx'

export const meta = {
  id: 'diffraction',
  title: 'Nature ondulatoire de la lumière : diffraction et dispersion',
  level: '4e année (Bac)',
  sections: 'Maths · Sc. Exp.',
  chapter: 'Ondes, ch. 2',
}

const LASERS = [
  { nm: 633, name: 'He-Ne rouge' },
  { nm: 532, name: 'vert' },
  { nm: 405, name: 'violet' },
]

export default function DiffractionExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const [measures, setMeasures] = useState([])
  const sim = useSimulation(clockModel, params)
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const th = theta(params)
  const L = spotWidth(params) * 100
  const fente = params.mode === 'fente'
  const pr = prism(params.lambda, params.i)
  const prV = prism(400, params.i)
  const prR = prism(700, params.i)

  const addMeasure = () =>
    setMeasures((m) => [...m.filter((x) => !(x.a === params.a && x.lambda === params.lambda)), { a: params.a, lambda: params.lambda, L, D: params.D }])

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={[1]}
      camera={fente ? { position: [-0.9, 2.7, 5.2], target: [0.3, 0.8, -0.2] } : { position: [0.6, 4.6, 5.2], target: [0.6, 0.6, -0.6] }}
      scene={<DiffractionScene sim={sim} />}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        fente ? (
          <>
            <div className="state charge">Diffraction par une fente</div>
            <div>θ = λ/a = <b>{(th * 1000).toFixed(2)} mrad</b> ({((th * 180) / Math.PI).toFixed(3)}°)</div>
            <div>L = 2λD/a = <b>{L.toFixed(2)} cm</b></div>
            <div className="small">Tache centrale 2× plus large que les autres taches</div>
          </>
        ) : (
          <>
            <div className="state charge">{params.source === 'laser' ? 'Lumière monochromatique : pas de décomposition' : 'Décomposition de la lumière blanche'}</div>
            {params.source === 'laser' ? (
              <div>n({params.lambda} nm) = <b>{pr.n.toFixed(4)}</b> · D = <b>{pr.D?.toFixed(2) ?? '—'}°</b></div>
            ) : (
              <>
                <div>n(violet 400 nm) = <b>{nGlass(400).toFixed(3)}</b> · D = <b>{prV.D?.toFixed(1) ?? 'réflexion totale'}°</b></div>
                <div>n(rouge 700 nm) = <b>{nGlass(700).toFixed(3)}</b> · D = <b>{prR.D?.toFixed(1) ?? '—'}°</b></div>
                <div className="small">Le violet est plus dévié que le rouge</div>
              </>
            )}
          </>
        )
      }
      controls={
        <>
          <div className="speed" role="group" aria-label="Expérience">
            <span>Expérience</span>
            <button className={fente ? 'on' : ''} onClick={() => set('mode')('fente')}>Fente (diffraction)</button>
            <button className={!fente ? 'on' : ''} onClick={() => set('mode')('prisme')}>Prisme (dispersion)</button>
          </div>
          {!fente && (
            <div className="speed" role="group" aria-label="Source">
              <span>Source</span>
              <button className={params.source === 'blanche' ? 'on' : ''} onClick={() => set('source')('blanche')}>Lumière blanche</button>
              <button className={params.source === 'laser' ? 'on' : ''} onClick={() => set('source')('laser')}>Laser</button>
            </div>
          )}
          {(fente || params.source === 'laser') && (
            <>
              <Slider label="Longueur d’onde λ" value={params.lambda} min={400} max={700} step={1} unit="nm" onChange={set('lambda')} />
              <p>
                {LASERS.map((l, k) => (
                  <span key={l.nm}>
                    {k > 0 && ' · '}
                    <button className="link" style={{ color: wavelengthCSS(l.nm) }} onClick={() => set('lambda')(l.nm)}>{l.name} ({l.nm} nm)</button>
                  </span>
                ))}
              </p>
            </>
          )}
          {fente ? (
            <>
              <Slider label="Largeur de la fente a" value={params.a} min={20} max={200} step={5} unit="µm" onChange={set('a')} />
              <Slider label="Distance fente-écran D" value={params.D} min={1} max={2.8} step={0.05} unit="m" onChange={set('D')} format={(v) => v.toFixed(2)} />
              <button className="switch-btn" onClick={addMeasure}>Relever la mesure (a, L)</button>
              {measures.length > 0 && (
                <table className="analogy">
                  <tbody>
                    <tr><td>a (µm)</td><td>λ (nm)</td><td>L (cm)</td><td>θ = L/2D (mrad)</td></tr>
                    {measures.map((m) => (
                      <tr key={m.a + '-' + m.lambda}>
                        <td>{m.a}</td><td>{m.lambda}</td><td>{m.L.toFixed(2)}</td><td>{((m.L / 100 / (2 * m.D)) * 1000).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {measures.length > 0 && <button className="link" onClick={() => setMeasures([])}>Effacer les mesures</button>}
            </>
          ) : (
            <Slider label="Angle d’incidence i" value={params.i} min={55} max={85} step={1} unit="°" onChange={set('i')} />
          )}
        </>
      }
      charts={fente ? <FenteCharts params={params} measures={measures} /> : <PrismCharts params={params} />}
      course={<Course />}
    />
  )
}

function FenteCharts({ params, measures }) {
  const L = spotWidth(params) * 100
  const xmax = 6
  const pts = []
  for (let k = 0; k <= 600; k++) {
    const x = -xmax + (2 * xmax * k) / 600
    pts.push([x, intensity(x / 100, params)])
  }
  const color = wavelengthCSS(params.lambda)
  // θ = f(1/a) : droite de pente λ
  const invMax = 1 / 20e-6 / 1000 // mm⁻¹
  const line = [[0, 0], [invMax, (params.lambda * 1e-9 * invMax * 1000) * 1000]]
  const lambdas = [...new Set(measures.map((m) => m.lambda))]
  return (
    <>
      <Plot
        title="Intensité lumineuse sur l’écran I(x)"
        xLabel="x (cm)"
        yLabel="I / I₀"
        xMin={-xmax}
        xMax={xmax}
        yMin={0}
        yMax={1.05}
        curves={[{ pts, color }]}
        vlines={[{ v: -L / 2, label: '' , color: '#e0a000' }, { v: L / 2, label: 'L/2', color: '#e0a000' }]}
      />
      <Plot
        title="θ en fonction de 1/a (θ = λ/a : droite de pente λ)"
        xLabel="1/a (mm⁻¹)"
        yLabel="θ (mrad)"
        xMin={0}
        xMax={invMax}
        yMin={0}
        yMax={36}
        curves={[
          { pts: line, color, width: 1.6, dash: '5 4' },
          ...lambdas.filter((l) => l !== params.lambda).map((l) => ({ pts: [[0, 0], [invMax, l * 1e-9 * invMax * 1e6]], color: wavelengthCSS(l, 0.6), width: 1.2, dash: '5 4' })),
        ]}
        points={[
          ...measures.map((m) => ({ x: 1 / (m.a * 1e-3), y: (m.L / 100 / (2 * m.D)) * 1000, color: wavelengthCSS(m.lambda), r: 4 })),
          { x: 1 / (params.a * 1e-3), y: theta(params) * 1000, color: '#fff', r: 3 },
        ]}
      />
    </>
  )
}

function PrismCharts({ params }) {
  const nPts = []
  const dPts = []
  for (let nm = 400; nm <= 700; nm += 5) {
    nPts.push([nm, nGlass(nm)])
    const d = prism(nm, params.i).D
    if (d != null) dPts.push([nm, d])
  }
  const ds = dPts.map((p) => p[1])
  const lo = Math.floor(Math.min(...ds, 60) - 1)
  const hi = Math.ceil(Math.max(...ds, 60) + 1)
  return (
    <>
      <Plot
        title="Indice du verre n(λ) : loi de Cauchy n = A + B/λ²"
        xLabel="λ (nm)"
        yLabel="n"
        xMin={400}
        xMax={700}
        yMin={1.76}
        yMax={1.83}
        curves={[{ pts: nPts, color: '#3e9bff' }]}
        points={params.source === 'laser' ? [{ x: params.lambda, y: nGlass(params.lambda), color: wavelengthCSS(params.lambda) }] : [400, 470, 530, 580, 650, 700].map((nm) => ({ x: nm, y: nGlass(nm), color: wavelengthCSS(nm), r: 4 }))}
      />
      <Plot
        title={`Déviation D(λ) pour i = ${params.i}° (A = ${APEX}°)`}
        xLabel="λ (nm)"
        yLabel="D (°)"
        xMin={400}
        xMax={700}
        yMin={lo}
        yMax={hi}
        curves={[{ pts: dPts, color: '#e0a000' }]}
      />
    </>
  )
}

function Course() {
  return (
    <>
      <h2>Le cours en bref</h2>
      <div className="course-grid">
        <section>
          <h3>La diffraction</h3>
          <p>Une onde qui traverse une ouverture de taille comparable à sa longueur d’onde ne se propage plus en ligne droite : elle s’étale. La lumière se diffracte comme les ondes à la surface de l’eau : <b>la lumière est une onde</b>.</p>
          <p>Avec une fente verticale, la figure est <b>horizontale</b> (perpendiculaire à la fente) : une tache centrale très lumineuse, deux fois plus large que les taches latérales.</p>
        </section>
        <section>
          <h3>Écart angulaire</h3>
          <p className="eq">θ = λ / a</p>
          <p>Pour un petit angle, tan θ ≈ θ = (L/2)/D, donc :</p>
          <p className="eq">L = 2λD / a</p>
          <p>θ est d’autant plus grand que la fente est fine et que λ est grande. La courbe θ = f(1/a) est une droite de pente λ.</p>
        </section>
        <section>
          <h3>Lumière et milieu</h3>
          <p>Dans le vide, toutes les radiations ont la célérité c = 3·10⁸ m/s. Dans un milieu transparent, v = c/n et la fréquence ν ne change pas : λ = λ₀/n.</p>
          <p>L’indice n dépend de la radiation : le milieu est <b>dispersif</b>. Le prisme dévie davantage le violet que le rouge et décompose la lumière blanche. Une lumière monochromatique (laser) n’est pas décomposée.</p>
        </section>
        <section>
          <h3>À toi de tester</h3>
          <ul>
            <li>Relève L pour 5 valeurs de a et vérifie que θ = f(1/a) est une droite. Déduis-en λ.</li>
            <li>Garde a fixe et change de laser : quelle couleur diffracte le plus ?</li>
            <li>Double D : que devient L ? et θ ?</li>
            <li>Prisme : envoie un laser, puis de la lumière blanche. Que vois-tu sur l’écran ?</li>
          </ul>
        </section>
      </div>
    </>
  )
}
