import { useEffect, useState } from 'react'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import { useSimulation, useSampled } from '../../lib/useSimulation.js'
import { wave, DEFAULTS, lambda, apparent } from './model.js'
import WaveScene from './Scene.jsx'
import WaveChart from './WaveChart.jsx'

export const meta = {
  id: 'ondes',
  title: 'Ondes progressives : la cuve à ondes',
  level: '4e année (Bac)',
  sections: 'Maths · Sc. Exp.',
  chapter: 'Ondes mécaniques progressives',
}

const SPEEDS = [0.01, 0.02, 0.05, 0.1, 0.25, 1]

export default function WaveExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(wave, params, { speed: 0.05 })
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const lam = lambda(params) * 100 // cm
  const T = 1 / params.N
  const theta = params.d / 100 / params.v
  const ratio = params.d / lam
  const frac = ratio - Math.floor(ratio)
  const phase =
    Math.min(frac, 1 - frac) < 0.04
      ? { txt: `SM = ${Math.round(ratio)}·λ : M vibre en phase avec S`, cls: 'charge' }
      : Math.abs(frac - 0.5) < 0.04
        ? { txt: `SM = ${(Math.round(ratio * 2) / 2).toFixed(1)}·λ : M vibre en opposition de phase avec S`, cls: 'decharge' }
        : { txt: `SM = ${ratio.toFixed(2)}·λ`, cls: '' }

  // nouveau type de source : la cuve se calme et l'onde repart de S
  useEffect(() => {
    sim.reset()
  }, [params.mode, params.pulse]) // eslint-disable-line react-hooks/exhaustive-deps

  const t = useSampled(sim, (s) => s.t)
  const reached = t >= theta

  const setStrobe = (on) => {
    setParams((p) => ({ ...p, strobe: on }))
    if (on) sim.setSpeed(1) // le stroboscope s'observe en temps réel
  }
  const fa = apparent(params)

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={SPEEDS}
      speedNote="Ralenti conseillé (÷20) ; le stroboscope se règle en temps réel (×1)."
      camera={{ position: [0.4, 5.2, 4.9], target: [0, 0.75, 0.25] }}
      scene={<WaveScene sim={sim} />}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        <>
          <div className={'state ' + phase.cls}>{reached ? phase.txt : 'L’onde n’a pas encore atteint M'}</div>
          <div>T = 1/N = <b>{(T * 1000).toFixed(1)} ms</b></div>
          <div>λ = v·T = <b>{lam.toFixed(2)} cm</b></div>
          <div>θ = SM/v = <b>{(theta * 1000).toFixed(0)} ms</b> (retard de M)</div>
          {params.strobe && (
            <div>
              Stroboscope :{' '}
              <b>{Math.abs(fa) < 0.01 ? 'immobilité apparente' : `mouvement apparent ${fa > 0 ? 'ralenti' : 'inversé'} (${Math.abs(fa).toFixed(2)} Hz)`}</b>
            </div>
          )}
        </>
      }
      controls={
        <>
          <div className="speed" role="group" aria-label="Source">
            <span>Source</span>
            <button className={params.mode === 'circ' ? 'on' : ''} onClick={() => set('mode')('circ')}>Pointe (circulaire)</button>
            <button className={params.mode === 'rect' ? 'on' : ''} onClick={() => set('mode')('rect')}>Réglette (rectiligne)</button>
          </div>
          <div className="speed" role="group" aria-label="Excitation">
            <span>Excitation</span>
            <button className={!params.pulse ? 'on' : ''} onClick={() => set('pulse')(false)}>Entretenue</button>
            <button className={params.pulse ? 'on' : ''} onClick={() => set('pulse')(true)}>Ébranlement</button>
            {params.pulse && <button onClick={sim.reset}>↯ Envoyer</button>}
          </div>
          <Slider label="Fréquence du vibreur N" value={params.N} min={5} max={25} step={0.5} unit="Hz" onChange={set('N')} />
          <Slider
            label="Célérité v (selon la profondeur d’eau)"
            value={params.v}
            min={0.2}
            max={0.4}
            step={0.01}
            unit="m/s"
            onChange={set('v')}
            format={(v) => v.toFixed(2)}
          />
          <Slider label="Amplitude a" value={params.a} min={0.5} max={3} step={0.5} unit="mm" onChange={set('a')} format={(v) => v.toFixed(1)} />
          <Slider label="Distance SM = d" value={params.d} min={0} max={15} step={0.25} unit="cm" onChange={set('d')} format={(v) => v.toFixed(2)} />
          <p>
            <button className="link" onClick={() => set('d')(+(2 * lam).toFixed(2))}>d = 2λ</button>{' · '}
            <button className="link" onClick={() => set('d')(+(2.5 * lam).toFixed(2))}>d = 2,5λ</button>
          </p>
          {params.mode === 'circ' && (
            <label className="check">
              <input type="checkbox" checked={params.atten} onChange={(e) => set('atten')(e.target.checked)} /> Affaiblissement de l’amplitude avec la distance
            </label>
          )}
          <h2>Stroboscope</h2>
          <label className="check">
            <input type="checkbox" checked={params.strobe} onChange={(e) => setStrobe(e.target.checked)} /> Éclairer avec le stroboscope
          </label>
          {params.strobe && (
            <>
              <Slider label="Fréquence des éclairs Nₑ" value={params.Ne} min={2} max={50} step={0.1} unit="Hz" onChange={set('Ne')} format={(v) => v.toFixed(1)} />
              <p>
                <button className="link" onClick={() => set('Ne')(params.N)}>Nₑ = N</button>{' · '}
                <button className="link" onClick={() => set('Ne')(params.N / 2)}>Nₑ = N/2</button>{' · '}
                <button className="link" onClick={() => set('Ne')(+(params.N - 0.5).toFixed(1))}>Nₑ un peu &lt; N</button>{' · '}
                <button className="link" onClick={() => set('Ne')(+(params.N + 0.5).toFixed(1))}>Nₑ un peu &gt; N</button>
              </p>
            </>
          )}
          <p className="formula">
            λ = v / N = {lam.toFixed(2)} cm · SM / λ = {ratio.toFixed(2)}
          </p>
        </>
      }
      charts={
        <>
          <WaveChart sim={sim} kind="time" />
          <WaveChart sim={sim} />
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
          <h3>Qu’est-ce qu’une onde progressive ?</h3>
          <p>C’est la propagation d’une déformation (un <b>ébranlement</b>) dans un milieu élastique. Il y a transport d’<b>énergie</b>, sans transport de matière : le bouchon M monte et descend sur place.</p>
          <p>À la surface de l’eau ou le long d’une corde, l’onde est <b>transversale</b> (déformation ⟂ propagation). Dans un ressort ou pour le son, elle est <b>longitudinale</b>.</p>
        </section>
        <section>
          <h3>Célérité et longueur d’onde</h3>
          <p>La célérité v dépend du milieu (ici, de la profondeur de l’eau), pas de la source.</p>
          <p className="eq">λ = v·T = v / N</p>
          <p>λ est la <b>période spatiale</b> : la distance parcourue par l’onde pendant une période T, ou encore la distance entre deux crêtes successives.</p>
        </section>
        <section>
          <h3>Équation d’un point M</h3>
          <p>M reproduit le mouvement de S avec un retard θ = SM / v :</p>
          <p className="eq">y<sub>M</sub>(t) = y<sub>S</sub>(t − θ)</p>
          <p className="eq">y<sub>M</sub>(t) = a·sin(2πNt − 2π·SM/λ)  pour t ≥ θ</p>
          <ul>
            <li>SM = kλ : M vibre <b>en phase</b> avec S.</li>
            <li>SM = (2k+1)·λ/2 : M vibre <b>en opposition de phase</b>.</li>
          </ul>
        </section>
        <section>
          <h3>Le stroboscope</h3>
          <ul>
            <li>Nₑ = N (ou N/k) : la surface paraît <b>immobile</b>. On peut mesurer λ sur l’écran.</li>
            <li>Nₑ un peu inférieure à N : mouvement apparent <b>ralenti</b>, dans le sens réel.</li>
            <li>Nₑ un peu supérieure à N : mouvement apparent ralenti <b>en sens inverse</b>.</li>
          </ul>
          <p>Sur l’écran, chaque crête agit comme une lentille convergente : elle donne une frange claire.</p>
        </section>
        <section>
          <h3>À toi de tester</h3>
          <ul>
            <li>Double N : que devient λ ? et v ?</li>
            <li>Place M à d = 2λ puis à d = 2,5λ et compare y<sub>S</sub> et y<sub>M</sub>.</li>
            <li>Envoie un ébranlement et mesure sa célérité avec la règle.</li>
            <li>Règle le stroboscope pour immobiliser la cuve, puis mesure 5λ sur la règle.</li>
          </ul>
        </section>
      </div>
    </>
  )
}
