import { useState } from 'react'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import Plot from '../../components/Plot.jsx'
import { useSimulation } from '../../lib/useSimulation.js'
import { clockModel } from '../../lib/color.js'
import { DEFAULTS, K, charges, field, coulomb, pendulum } from './model.js'
import ElectricScene from './Scene.jsx'

export const meta = {
  id: 'champ-e',
  title: 'Interaction électrique : loi de Coulomb et champ électrique',
  level: '3e année',
  sections: 'Maths · Sc. Exp. · Sc. Tech.',
  chapter: 'Interactions : interaction électrique',
}

const CONFIGS = { seule: 'Une charge', dipole: 'Deux charges', memes: 'Deux charges de même signe', condensateur: 'Condensateur plan' }

export default function ElectricExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(clockModel, params)
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const pend = params.mode === 'pendule'
  const list = charges(params)
  const [ex, ey] = field(params.mx, params.my, list)
  const eq = pendulum(params)

  // courbes
  const fPts = []
  for (let r = 2; r <= 20; r += 0.25) fPts.push([r, (K * Math.abs(params.q1 * params.q2) * 1e-18) / Math.pow(r / 100, 2) * 1000])
  const axis = []
  for (let x = -12; x <= 12; x += 0.1) {
    const [e1] = field(x, params.config === 'condensateur' ? 0 : 0.0001, list)
    const [, e2] = field(x, 0, list)
    axis.push([x, (params.config === 'condensateur' ? e2 : e1) / 1000])
  }
  const lim = Math.min(Math.max(...axis.map((a) => Math.abs(a[1]))), 400)
  const thPts = []
  for (let Q = 0; Q <= 100; Q += 2) thPts.push([Q, (pendulum({ ...params, Q }).theta * 180) / Math.PI])

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={[1]}
      camera={pend ? { position: [0.3, 2.2, 5.2], target: [0.2, 1.9, 0] } : { position: [0, 1.9, 6.2], target: [0, 1.9, 0] }}
      scene={<ElectricScene sim={sim} />}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        pend ? (
          <>
            <div className="state charge">{eq.touch ? 'Attraction : la boule vient toucher la sphère' : params.q * params.Q > 0 ? 'Répulsion : charges de même signe' : 'Attraction : charges de signes contraires'}</div>
            <div>Déviation du fil θ = <b>{((Math.abs(eq.theta) * 180) / Math.PI).toFixed(1)}°</b></div>
            <div>F = k|q·Q|/r² = <b>{(Math.abs(eq.F) * 1000).toFixed(3)} mN</b> (r = {eq.r.toFixed(1)} cm)</div>
            <div>Poids P = mg = <b>{(eq.P * 1000).toFixed(3)} mN</b></div>
          </>
        ) : (
          <>
            <div className="state charge">{CONFIGS[params.config]}</div>
            {params.config === 'dipole' && <div>F = k|q₁q₂|/d² = <b>{(coulomb(params) * 1000).toFixed(3)} mN</b></div>}
            <div>En M : E = <b>{Math.hypot(ex, ey).toExponential(2)} V/m</b></div>
            <div className="small">Les lignes de champ partent des charges + et arrivent sur les charges −.</div>
          </>
        )
      }
      controls={
        <>
          <div className="speed" role="group" aria-label="Expérience">
            <span>Expérience</span>
            <button className={!pend ? 'on' : ''} onClick={() => set('mode')('charges')}>Champ électrique</button>
            <button className={pend ? 'on' : ''} onClick={() => set('mode')('pendule')}>Pendule électrostatique</button>
          </div>
          {pend ? (
            <>
              <Slider label="Charge de la sphère Q" value={params.Q} min={-100} max={100} step={1} unit="nC" onChange={set('Q')} />
              <Slider label="Charge de la boule q" value={params.q} min={-30} max={30} step={1} unit="nC" onChange={set('q')} />
              <Slider label="Masse de la boule m" value={params.m} min={0.05} max={1} step={0.05} unit="g" onChange={set('m')} format={(v) => v.toFixed(2)} />
              <Slider label="Distance a de la sphère" value={params.a} min={3} max={15} step={0.5} unit="cm" onChange={set('a')} format={(v) => v.toFixed(1)} />
            </>
          ) : (
            <>
              <div className="speed" role="group" aria-label="Configuration">
                {Object.entries(CONFIGS).map(([k, v]) => (
                  <button key={k} className={params.config === k ? 'on' : ''} onClick={() => set('config')(k)}>{v}</button>
                ))}
              </div>
              <Slider label={params.config === 'dipole' ? 'Charge q₁' : 'Charge q'} value={params.q1} min={-50} max={50} step={1} unit="nC" onChange={set('q1')} />
              {params.config === 'dipole' && <Slider label="Charge q₂" value={params.q2} min={-50} max={50} step={1} unit="nC" onChange={set('q2')} />}
              {params.config !== 'seule' && (
                <Slider label={params.config === 'condensateur' ? 'Distance entre les plaques' : 'Distance d entre les charges'} value={params.dist} min={2} max={14} step={0.5} unit="cm" onChange={set('dist')} format={(v) => v.toFixed(1)} />
              )}
              <Slider label="Position de M : x" value={params.mx} min={-11} max={11} step={0.5} unit="cm" onChange={set('mx')} format={(v) => v.toFixed(1)} />
              <Slider label="Position de M : y" value={params.my} min={-7} max={7} step={0.5} unit="cm" onChange={set('my')} format={(v) => v.toFixed(1)} />
            </>
          )}
        </>
      }
      charts={
        pend ? (
          <>
            <Plot title="Déviation θ en fonction de la charge Q de la sphère" xLabel="Q (nC)" yLabel="θ (°)" xMin={0} xMax={100} yMin={-60} yMax={60} curves={[{ pts: thPts, color: '#e5484d' }]} points={params.Q >= 0 ? [{ x: params.Q, y: (eq.theta * 180) / Math.PI }] : []} />
            <Plot
              title="Loi de Coulomb : F en fonction de r (q et Q fixés)"
              xLabel="r (cm)"
              yLabel="F (mN)"
              xMin={2}
              xMax={20}
              yMin={0}
              yMax={(K * Math.abs(params.q * params.Q) * 1e-18) / 0.0004 * 1000 * 1.05 || 1}
              curves={[{ pts: Array.from({ length: 73 }, (_, k) => { const r = 2 + k * 0.25; return [r, (K * Math.abs(params.q * params.Q) * 1e-18) / Math.pow(r / 100, 2) * 1000] }), color: '#3e9bff' }]}
              points={eq.touch ? [] : [{ x: eq.r, y: Math.abs(eq.F) * 1000 }]}
            />
          </>
        ) : (
          <>
            <Plot
              title={params.config === 'condensateur' ? 'Champ E_y le long de l’axe des x (entre les plaques)' : 'Champ E_x le long de l’axe des charges'}
              xLabel="x (cm)"
              yLabel="E (kV/m)"
              xMin={-12}
              xMax={12}
              yMin={-lim * 1.05 || -1}
              yMax={lim * 1.05 || 1}
              curves={[{ pts: axis, color: '#ffd23f' }]}
            />
            <Plot
              title="Loi de Coulomb : F = k|q₁q₂|/r²"
              xLabel="r (cm)"
              yLabel="F (mN)"
              xMin={2}
              xMax={20}
              yMin={0}
              yMax={fPts[0][1] * 1.05 || 1}
              curves={[{ pts: fPts, color: '#3e9bff' }]}
              points={params.config === 'dipole' ? [{ x: params.dist, y: coulomb(params) * 1000 }] : []}
            />
          </>
        )
      }
      course={
        <>
          <h2>Le cours en bref</h2>
          <div className="course-grid">
            <section>
              <h3>Loi de Coulomb</h3>
              <p>Deux charges ponctuelles q₁ et q₂ séparées de r exercent l’une sur l’autre des forces opposées, portées par la droite qui les joint :</p>
              <p className="eq">F = k·|q₁·q₂| / r²    k = 9·10⁹ N·m²·C⁻²</p>
              <p>Même signe : répulsion. Signes contraires : attraction.</p>
            </section>
            <section>
              <h3>Champ électrique</h3>
              <p>Une charge q placée en M subit F = q·E(M). Pour une charge ponctuelle Q :</p>
              <p className="eq">E = k·|Q| / r²   (en V/m)</p>
              <p>E est dirigé vers l’extérieur si Q &gt; 0, vers Q si Q &lt; 0. Les champs de plusieurs charges s’additionnent (vecteurs).</p>
            </section>
            <section>
              <h3>Lignes de champ, champ uniforme</h3>
              <p>Les lignes de champ sont tangentes à E en chaque point, orientées dans le sens de E. Entre les plaques d’un condensateur plan, le champ est <b>uniforme</b> : E = U/d, des plaques + vers −.</p>
            </section>
            <section>
              <h3>À toi de tester</h3>
              <ul>
                <li>Double la distance d : la force est divisée par combien ?</li>
                <li>Où le champ est-il nul entre deux charges de même signe ?</li>
                <li>Pendule : change le signe de q. Que se passe-t-il ?</li>
                <li>Mesure θ et déduis F = P·tanθ (fil quasi vertical à l’équilibre).</li>
              </ul>
            </section>
          </div>
        </>
      }
    />
  )
}
