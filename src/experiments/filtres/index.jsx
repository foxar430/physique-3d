import { useState } from 'react'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import LiveChart from '../../components/LiveChart.jsx'
import Plot from '../../components/Plot.jsx'
import CircuitScene from '../../components/three/Circuit.jsx'
import { useSimulation } from '../../lib/useSimulation.js'
import { filterModel, DEFAULTS, Nc, transfer, ue, us } from './model.js'

export const meta = {
  id: 'filtres',
  title: 'Filtres électriques : passe-bas et passe-haut',
  level: '4e année (Bac)',
  sections: 'Sc. Tech.',
  chapter: 'Les filtres électriques',
}

const SPEEDS = [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05]
const nearestSpeed = (N) => SPEEDS.reduce((a, b) => (Math.abs(Math.log(b * N)) < Math.abs(Math.log(a * N)) ? b : a))

const uC = (s, p) => s.q / (p.C * 1e-6)
const R_EL = { type: 'R', label: 'R', name: <>u<sub>R</sub></>, u: (s, p) => p.R * s.i, ohms: (p) => p.R }
const C_EL = { type: 'C', label: 'C', name: <>u<sub>C</sub></>, u: uC }
const SOURCE = { kind: 'gbf', name: <>u<sub>E</sub></>, u: (s, p) => ue(s.t, p), display: (s, p) => (p.N >= 1000 ? (p.N / 1000).toFixed(2) + ' kHz' : p.N.toFixed(0) + ' Hz') }
const METER = { label: 'u_S', value: (s, p) => us(s, p).toFixed(2) + ' V' }

export default function FilterExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(filterModel, params, { speed: nearestSpeed(DEFAULTS.N) })
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const nc = Nc(params)
  const tr = transfer(params)
  const bas = params.type === 'bas'
  const setN = (N) => {
    setParams((p) => ({ ...p, N }))
    sim.setSpeed(nearestSpeed(N))
  }
  const logN = Math.log10(params.N)

  const pts = []
  for (let k = 0; k <= 200; k++) {
    const N = Math.pow(10, 1 + (4 * k) / 200)
    pts.push([N, transfer(params, N).G])
  }

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={SPEEDS}
      speedNote="La vitesse s’ajuste à la fréquence du GBF pour voir environ une oscillation par seconde."
      camera={{ position: [0.5, 4.3, 4.7], target: [0.5, 0.15, -0.15] }}
      viewToggles
      scene={(view) => (
        <CircuitScene
          sim={sim}
          params={params}
          view={view}
          source={SOURCE}
          amps={(s) => s.i}
          hasSwitch={false}
          top={[bas ? R_EL : C_EL]}
          right={bas ? C_EL : R_EL}
          meter={METER}
          current={(s, p) => s.i / (p.Ue / p.R)}
          charge={(s, p) => uC(s, p) / p.Ue}
        />
      )}
      onParamsReset={() => {
        setParams(DEFAULTS)
        sim.setSpeed(nearestSpeed(DEFAULTS.N))
      }}
      readouts={
        <>
          <div className="state charge">
            Filtre passe-{params.type} · {tr.G > -3 ? 'bande passante (G ≥ G₀ − 3 dB)' : 'signal atténué'}
          </div>
          <div>N<sub>c</sub> = 1/(2πRC) = <b>{nc.toFixed(0)} Hz</b></div>
          <div>T = U<sub>S</sub>/U<sub>E</sub> = <b>{tr.T.toFixed(3)}</b> · G = 20 log T = <b>{tr.G.toFixed(1)} dB</b></div>
          <div>Déphasage φ<sub>S</sub> − φ<sub>E</sub> = <b>{((tr.phi * 180) / Math.PI).toFixed(0)}°</b></div>
        </>
      }
      controls={
        <>
          <div className="speed" role="group" aria-label="Type de filtre">
            <span>Filtre</span>
            <button className={bas ? 'on' : ''} onClick={() => set('type')('bas')}>Passe-bas (sortie sur C)</button>
            <button className={!bas ? 'on' : ''} onClick={() => set('type')('haut')}>Passe-haut (sortie sur R)</button>
          </div>
          <Slider
            label="Fréquence du GBF N"
            value={logN}
            min={1}
            max={4.7}
            step={0.01}
            unit="Hz"
            onChange={(v) => setN(+Math.pow(10, v).toPrecision(3))}
            format={() => (params.N >= 1000 ? (params.N / 1000).toFixed(2) + ' k' : params.N.toFixed(0))}
          />
          <button className="switch-btn" onClick={() => setN(+nc.toPrecision(3))}>Se placer à la fréquence de coupure</button>
          <Slider label="Amplitude Ue" value={params.Ue} min={1} max={8} step={0.5} unit="V" onChange={set('Ue')} />
          <Slider label="Résistance R" value={params.R} min={100} max={10000} step={100} unit="Ω" onChange={set('R')} />
          <Slider label="Capacité C" value={params.C} min={0.1} max={5} step={0.01} unit="µF" onChange={set('C')} format={(v) => v.toFixed(2)} />
          <p className="formula">
            Bande passante : {bas ? <>0 ≤ N ≤ N<sub>c</sub></> : <>N ≥ N<sub>c</sub></>} = {nc.toFixed(0)} Hz
            <br />U<sub>S</sub> = T·U<sub>E</sub> = {(tr.T * params.Ue).toFixed(2)} V
          </p>
        </>
      }
      charts={
        <>
          <LiveChart
            sim={sim}
            title="Oscillogrammes : entrée uE(t) et sortie uS(t)"
            window={Math.max(2.5 / params.N, 2e-4)}
            yMin={-params.Ue * 1.15}
            yMax={params.Ue * 1.15}
            timeScale={1000}
            timeLabel="t (ms)"
            yUnit="u (V)"
            series={[
              { label: 'uE (GBF)', color: '#e0a000', get: (s) => ue(s.t, sim.paramsRef.current) },
              { label: 'uS (sortie)', color: '#3e9bff', get: (s) => us(s, sim.paramsRef.current) },
            ]}
          />
          <Plot
            title="Courbe de gain G(N) (diagramme de Bode)"
            xLabel="N (Hz, échelle log)"
            yLabel="G (dB)"
            xLog
            xMin={10}
            xMax={100000}
            yMin={-40}
            yMax={3}
            curves={[{ pts, color: '#30a46c' }]}
            hlines={[{ v: -3, label: 'G₀ − 3 dB', color: '#e0a000' }]}
            vlines={[{ v: nc, label: 'Nc', color: '#e0a000' }]}
            points={[{ x: params.N, y: Math.max(tr.G, -40) }]}
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
          <h3>Qu’est-ce qu’un filtre ?</h3>
          <p>Un quadripôle qui transmet certaines fréquences et en atténue d’autres. On caractérise le filtre par sa <b>transmittance</b> T = U<sub>Sm</sub>/U<sub>Em</sub> et son <b>gain</b> :</p>
          <p className="eq">G = 20·log T (dB)</p>
          <p>La bande passante à −3 dB est l’ensemble des fréquences pour lesquelles G ≥ G<sub>0</sub> − 3 dB, soit T ≥ T<sub>0</sub>/√2.</p>
        </section>
        <section>
          <h3>Filtre RC passe-bas</h3>
          <p className="eq">T = 1 / √(1 + (2πNRC)²)</p>
          <p>Il laisse passer les basses fréquences. Fréquence de coupure : <b>N<sub>c</sub> = 1/(2πRC)</b>. La sortie est en retard sur l’entrée (φ entre 0 et −90°).</p>
        </section>
        <section>
          <h3>Filtre RC passe-haut</h3>
          <p className="eq">T = 2πNRC / √(1 + (2πNRC)²)</p>
          <p>Il laisse passer les hautes fréquences, à partir de N<sub>c</sub> = 1/(2πRC). La sortie est en avance sur l’entrée (φ entre +90° et 0).</p>
        </section>
        <section>
          <h3>Filtres actifs</h3>
          <p>Avec un amplificateur opérationnel, le filtre peut amplifier : pour le passe-bas actif inverseur, T<sub>0</sub> = R<sub>2</sub>/R<sub>1</sub> et N<sub>c</sub> = 1/(2πR<sub>2</sub>C). Le gain G<sub>0</sub> peut alors être positif.</p>
        </section>
        <section>
          <h3>À toi de tester</h3>
          <ul>
            <li>Mesure U<sub>S</sub> pour plusieurs fréquences et trace G(N).</li>
            <li>Vérifie qu’à N = N<sub>c</sub>, U<sub>S</sub> = U<sub>E</sub>/√2 (G = −3 dB).</li>
            <li>Double C : que devient N<sub>c</sub> ?</li>
            <li>Compare le déphasage du passe-bas et du passe-haut.</li>
          </ul>
        </section>
      </div>
    </>
  )
}
