import { useEffect, useState } from 'react'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import LiveChart from '../../components/LiveChart.jsx'
import Plot from '../../components/Plot.jsx'
import { useSimulation, useSampled } from '../../lib/useSimulation.js'
import { decayModel, DEFAULTS, NUCLIDES, ABSORBERS, N0, theory } from './model.js'
import DecayScene from './Scene.jsx'

export const meta = {
  id: 'radioactivite',
  title: 'Radioactivité : décroissance d’un échantillon',
  level: '4e année (Bac)',
  sections: 'Maths · Sc. Exp.',
  chapter: 'Physique nucléaire : noyau et réactions nucléaires',
}

const SPEEDS = [0.1, 0.25, 0.5, 1]

export default function DecayExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(decayModel, params, { speed: 0.25 })
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const nuc = NUCLIDES[params.nuc]
  const lam = Math.LN2 / nuc.T
  const read = useSampled(sim, (s) => ({ t: s.t, N: s.N }))
  const tReal = read.t * nuc.T

  useEffect(() => {
    sim.reset()
  }, [params.nuc]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={SPEEDS}
      speedNote="×1 = une demi-vie par seconde. « Recommencer » prépare un nouvel échantillon de 512 noyaux."
      camera={{ position: [0.6, 2.2, 4.2], target: [0, 0.9, 0] }}
      scene={<DecayScene sim={sim} />}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        <>
          <div className="state charge">
            {nuc.eq[0]} → {nuc.eq[1]} + {nuc.eq[2]} (radioactivité {nuc.type})
          </div>
          <div>T = <b>{nuc.T} {nuc.unit}</b> · λ = ln2/T = <b>{lam.toPrecision(3)} {nuc.unit}⁻¹</b></div>
          <div>t = <b>{tReal.toPrecision(3)} {nuc.unit}</b> ({read.t.toFixed(2)} T)</div>
          <div>N = <b>{read.N}</b> noyaux · théorie N₀e<sup>−λt</sup> = <b>{theory(read.t).toFixed(0)}</b></div>
          <div className="legend-row">
            <span style={{ color: '#ff8a3d' }}>● noyau père</span> <span style={{ color: '#8a93a0' }}>● noyau fils</span>
          </div>
        </>
      }
      controls={
        <>
          <h2>Nucléide</h2>
          <div className="speed" role="group" aria-label="Nucléide">
            {Object.entries(NUCLIDES).map(([k, n]) => (
              <button key={k} className={params.nuc === k ? 'on' : ''} onClick={() => set('nuc')(k)}>
                {n.name} ({n.type})
              </button>
            ))}
          </div>
          <h2>Écran entre la source et le compteur</h2>
          <div className="speed" role="group" aria-label="Écran">
            {Object.entries(ABSORBERS).map(([k, v]) => (
              <button key={k} className={params.absorber === k ? 'on' : ''} onClick={() => set('absorber')(k)}>{v}</button>
            ))}
          </div>
          <p className="formula">
            α (noyau d’hélium) : arrêté par une feuille de papier.
            <br />β (électron ou positon) : arrêté par quelques mm d’aluminium.
            <br />γ (photon très énergétique) : atténué par plusieurs cm de plomb.
          </p>
        </>
      }
      charts={
        <>
          <LiveChart
            sim={sim}
            title="Nombre de noyaux restants N(t)"
            window={6}
            yMin={0}
            yMax={N0 * 1.05}
            yUnit="N"
            timeScale={nuc.T}
            timeLabel={'t (' + nuc.unit + ')'}
            series={[
              { label: 'N mesuré', color: '#ff8a3d', get: (s) => s.N },
              { label: 'N₀·e^(−λt)', color: '#8a8f98', get: (s) => theory(s.t) },
            ]}
            guides={() => [
              { axis: 'y', value: N0 / 2, label: 'N₀/2', color: '#e0a000' },
              { axis: 'y', value: N0 / 4, label: 'N₀/4', color: '#e0a000' },
              { axis: 'x', value: 1, label: 'T', color: '#e0a000' },
              { axis: 'x', value: 2, label: '2T', color: '#e0a000' },
            ]}
          />
          <LiveChart
            sim={sim}
            title="ln N en fonction de t : droite de pente −λ"
            window={6}
            yMin={0}
            yMax={Math.log(N0) + 0.3}
            yUnit="ln N"
            timeScale={nuc.T}
            timeLabel={'t (' + nuc.unit + ')'}
            series={[
              { label: 'ln N', color: '#3e9bff', get: (s) => (s.N > 0 ? Math.log(s.N) : 0) },
              { label: 'ln N₀ − λt', color: '#8a8f98', get: (s) => Math.log(N0) - Math.LN2 * s.t },
            ]}
          />
        </>
      }
      course={<Course />}
    />
  )
}

/* énergie de liaison par nucléon (MeV), valeurs usuelles */
const ASTON = [
  [2, 1.11], [3, 2.83], [4, 7.07], [6, 5.33], [7, 5.61], [9, 6.46], [12, 7.68], [14, 7.48], [16, 7.98], [20, 8.03], [24, 8.26], [28, 8.45],
  [32, 8.49], [40, 8.55], [56, 8.79], [62, 8.79], [80, 8.71], [90, 8.71], [100, 8.64], [120, 8.51], [140, 8.38], [160, 8.25], [180, 8.10],
  [200, 7.92], [208, 7.87], [220, 7.71], [235, 7.59], [238, 7.57],
]

function Course() {
  return (
    <>
      <h2>Le cours en bref</h2>
      <div className="course-grid">
        <section>
          <h3>Le noyau et sa stabilité</h3>
          <p>Noyau <b>ᴬ<sub>Z</sub>X</b> : Z protons, N = A − Z neutrons. La masse d’un noyau est inférieure à la somme des masses de ses nucléons : c’est le <b>défaut de masse</b> Δm.</p>
          <p className="eq">E<sub>l</sub> = Δm·c²</p>
          <p>Plus E<sub>l</sub>/A est grande, plus le noyau est stable. Les noyaux les plus stables sont autour de A ≈ 60 (fer, nickel).</p>
        </section>
        <section>
          <h3>Désintégrations</h3>
          <ul>
            <li>α : ᴬ<sub>Z</sub>X → ᴬ⁻⁴<sub>Z−2</sub>Y + ⁴<sub>2</sub>He</li>
            <li>β⁻ : ᴬ<sub>Z</sub>X → ᴬ<sub>Z+1</sub>Y + ⁰<sub>−1</sub>e</li>
            <li>β⁺ : ᴬ<sub>Z</sub>X → ᴬ<sub>Z−1</sub>Y + ⁰<sub>1</sub>e</li>
            <li>γ : désexcitation du noyau fils (Y* → Y + γ)</li>
          </ul>
          <p>Lois de Soddy : conservation du nombre de charge Z et du nombre de masse A.</p>
        </section>
        <section>
          <h3>Loi de décroissance</h3>
          <p className="eq">N(t) = N<sub>0</sub>·e<sup>−λt</sup>    T = ln2 / λ</p>
          <p>La désintégration d’un noyau est <b>aléatoire</b> : on ne peut pas prévoir quand un noyau donné se désintègre, mais pour un grand nombre de noyaux la décroissance suit cette loi.</p>
          <p className="eq">Activité A = −dN/dt = λN (en becquerels, Bq)</p>
          <p>Datation au carbone 14 : t = (1/λ)·ln(A<sub>0</sub>/A).</p>
        </section>
        <section>
          <h3>Fission et fusion</h3>
          <p><b>Fission</b> : un noyau lourd (²³⁵U) frappé par un neutron se brise en deux noyaux plus légers. <b>Fusion</b> : deux noyaux légers (²H, ³H) s’unissent. Dans les deux cas, les produits sont plus stables : de l’énergie est libérée, E = |Δm|·c².</p>
          <Plot
            title="Courbe d’Aston : −E_l/A en fonction de A"
            xLabel="A"
            yLabel="−El/A (MeV)"
            xMin={0}
            xMax={240}
            yMin={-9}
            yMax={0}
            curves={[{ pts: ASTON.map(([a, e]) => [a, -e]), color: '#3e9bff' }]}
            points={[
              { x: 4, y: -7.07, color: '#e0a000', r: 4, label: '⁴He' },
              { x: 56, y: -8.79, color: '#e0a000', r: 4, label: '⁵⁶Fe' },
              { x: 235, y: -7.59, color: '#e0a000', r: 4, label: '²³⁵U' },
            ]}
          />
        </section>
        <section>
          <h3>À toi de tester</h3>
          <ul>
            <li>Lis T sur la courbe N(t) : à quelle date N = N₀/2 ? N₀/4 ?</li>
            <li>Recommence plusieurs fois : la courbe est-elle exactement la même ?</li>
            <li>Mesure la pente de ln N = f(t) et compare-la à λ.</li>
            <li>Avec une source α, place une feuille de papier : que compte le Geiger ?</li>
          </ul>
        </section>
      </div>
    </>
  )
}
