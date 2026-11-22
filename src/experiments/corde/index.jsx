import { useEffect, useMemo, useState } from 'react'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import { useSimulation, useSampled } from '../../lib/useSimulation.js'
import { wave, apparent } from '../ondes/model.js'
import WaveChart from '../ondes/WaveChart.jsx'
import StringScene, { LEN } from './Scene.jsx'

export const meta = {
  id: 'corde',
  title: 'Onde progressive le long d’une corde',
  level: '4e année (Bac)',
  sections: 'Maths · Sc. Exp. · Sc. Tech.',
  chapter: 'Ondes mécaniques progressives',
}

const G = 9.8
/**
 * Corde tendue par une masse m (tension F = m·g), de masse linéique µ.
 * Célérité v = √(F/µ). Le point S (lame du vibreur) a l'élongation y_S(t) = a·sin(2πNt) ;
 * un point M à la distance x de S reproduit ce mouvement avec le retard θ = x/v.
 * Le coton au bout absorbe l'onde : pas de réflexion.
 */
const DEFAULTS = { pulse: false, N: 20, a: 8, d: 30, m: 200, mu: 20, strobe: false, Ne: 20 }
const SPEEDS = [0.01, 0.02, 0.05, 0.1, 0.25, 1]

export default function StringExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const F = (params.m / 1000) * G
  const v = Math.sqrt(F / (params.mu / 1000))
  // paramètres transmis au modèle commun des ondes (onde « rectiligne » le long de x)
  const simParams = useMemo(() => ({ ...params, mode: 'rect', atten: false, v }), [params, v])
  const sim = useSimulation(wave, simParams, { speed: 0.05 })
  const lam = (v / params.N) * 100 // cm
  const T = 1 / params.N
  const theta = params.d / 100 / v
  const ratio = params.d / lam
  const frac = ratio - Math.floor(ratio)
  const t = useSampled(sim, (s) => s.t, 4)
  const reached = t >= theta
  const phase =
    Math.min(frac, 1 - frac) < 0.04
      ? { txt: `SM = ${Math.round(ratio)}·λ : M vibre en phase avec S`, cls: 'charge' }
      : Math.abs(frac - 0.5) < 0.04
        ? { txt: `SM = ${(Math.round(ratio * 2) / 2).toFixed(1)}·λ : M vibre en opposition de phase avec S`, cls: 'decharge' }
        : { txt: `SM = ${ratio.toFixed(2)}·λ`, cls: '' }
  const fa = apparent(simParams)

  useEffect(() => {
    sim.reset()
  }, [params.pulse]) // eslint-disable-line react-hooks/exhaustive-deps

  const setStrobe = (on) => {
    setParams((p) => ({ ...p, strobe: on }))
    if (on) sim.setSpeed(1)
  }

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={SPEEDS}
      speedNote="Ralenti conseillé (÷20) ; le stroboscope se règle en temps réel (×1). Déformation de la corde exagérée pour être visible."
      camera={{ position: [0.4, 1.3, 4.8], target: [-0.2, 0.6, 0] }}
      scene={<StringScene sim={sim} />}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        <>
          <div className={'state ' + phase.cls}>{reached ? phase.txt : 'L’onde n’a pas encore atteint M'}</div>
          <div>v = √(F/µ) = <b>{v.toFixed(2)} m/s</b> (F = m·g = {F.toFixed(2)} N)</div>
          <div>λ = v·T = <b>{lam.toFixed(1)} cm</b> · T = <b>{(T * 1000).toFixed(1)} ms</b></div>
          <div>θ = SM/v = <b>{(theta * 1000).toFixed(1)} ms</b> (retard de M)</div>
          {params.strobe && (
            <div>
              Stroboscope : <b>{Math.abs(fa) < 0.01 ? 'immobilité apparente' : `mouvement apparent ${fa > 0 ? 'ralenti' : 'inversé'} (${Math.abs(fa).toFixed(2)} Hz)`}</b>
            </div>
          )}
        </>
      }
      controls={
        <>
          <div className="speed" role="group" aria-label="Excitation">
            <span>Excitation</span>
            <button className={!params.pulse ? 'on' : ''} onClick={() => set('pulse')(false)}>Entretenue</button>
            <button className={params.pulse ? 'on' : ''} onClick={() => set('pulse')(true)}>Ébranlement</button>
          </div>
          <Slider label="Fréquence du vibreur N" value={params.N} min={5} max={60} step={1} unit="Hz" onChange={set('N')} />
          <Slider label="Amplitude a" value={params.a} min={2} max={15} step={1} unit="mm" onChange={set('a')} />
          <Slider label="Masse suspendue m (tension F = m·g)" value={params.m} min={50} max={500} step={10} unit="g" onChange={set('m')} />
          <Slider label="Masse linéique de la corde µ" value={params.mu} min={5} max={100} step={1} unit="g/m" onChange={set('mu')} />
          <Slider label="Position du point M : SM" value={params.d} min={0} max={LEN * 100 - 10} step={1} unit="cm" onChange={set('d')} />
          <p>
            <button className="link" onClick={() => set('d')(Math.min(110, Math.round(lam)))}>SM = λ</button>{' · '}
            <button className="link" onClick={() => set('d')(Math.min(110, Math.round(1.5 * lam)))}>SM = 1,5λ</button>
          </p>
          <h2>Stroboscope</h2>
          <label className="check">
            <input type="checkbox" checked={params.strobe} onChange={(e) => setStrobe(e.target.checked)} /> Éclairer avec le stroboscope
          </label>
          {params.strobe && (
            <>
              <Slider label="Fréquence des éclairs Nₑ" value={params.Ne} min={2} max={120} step={0.1} unit="Hz" onChange={set('Ne')} format={(x) => x.toFixed(1)} />
              <p>
                <button className="link" onClick={() => set('Ne')(params.N)}>Nₑ = N</button>{' · '}
                <button className="link" onClick={() => set('Ne')(+(params.N - 0.5).toFixed(1))}>Nₑ un peu &lt; N</button>{' · '}
                <button className="link" onClick={() => set('Ne')(+(params.N + 0.5).toFixed(1))}>Nₑ un peu &gt; N</button>
              </p>
            </>
          )}
          <p className="formula">v = √(F/µ) = {v.toFixed(2)} m/s · λ = v/N = {lam.toFixed(1)} cm</p>
        </>
      }
      charts={
        <>
          <WaveChart sim={sim} kind="time" />
          <WaveChart sim={sim} rMax={LEN * 100} />
        </>
      }
      course={
        <>
          <h2>Le cours en bref</h2>
          <div className="course-grid">
            <section>
              <h3>Une onde transversale</h3>
              <p>La lame du vibreur impose au point S un mouvement vertical. La perturbation se propage le long de la corde : chaque point reproduit le mouvement de S, avec un retard. La déformation est perpendiculaire à la direction de propagation : l’onde est <b>transversale</b>.</p>
              <p>Le coton au bout de la corde absorbe l’onde : il n’y a pas d’onde réfléchie.</p>
            </section>
            <section>
              <h3>Célérité</h3>
              <p className="eq">v = √(F / µ)</p>
              <p>F : tension de la corde (N), µ : masse linéique (kg/m). La célérité dépend du milieu (corde, tension), pas de la fréquence de la source.</p>
            </section>
            <section>
              <h3>Double périodicité</h3>
              <p className="eq">λ = v·T = v / N    y<sub>M</sub>(t) = y<sub>S</sub>(t − x/v)</p>
              <p>Période temporelle T (même mouvement à t et t + T), période spatiale λ (même état en x et x + λ). Points distants de kλ : en phase ; de (2k+1)λ/2 : en opposition de phase.</p>
            </section>
            <section>
              <h3>À toi de tester</h3>
              <ul>
                <li>Quadruple la masse m : comment varie v ? et λ ?</li>
                <li>Change N : la célérité change-t-elle ?</li>
                <li>Envoie un ébranlement et mesure sa vitesse avec la règle.</li>
                <li>Immobilise la corde au stroboscope et mesure λ.</li>
              </ul>
            </section>
          </div>
        </>
      }
    />
  )
}
