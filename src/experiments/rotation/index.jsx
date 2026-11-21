import { useEffect, useState } from 'react'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import LiveChart from '../../components/LiveChart.jsx'
import Plot from '../../components/Plot.jsx'
import { useSimulation, useSampled } from '../../lib/useSimulation.js'
import { rotationModel, DEFAULTS, J, J0, alphaDrive, R_DRUM } from './model.js'
import RotationScene from './Scene.jsx'

export const meta = {
  id: 'rotation',
  title: 'Solide en rotation autour d’un axe fixe : moment d’inertie',
  level: '3e année',
  sections: 'Maths · Sc. Tech.',
  chapter: 'Solide en mouvement de rotation',
}

export default function RotationExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(rotationModel, params, { speed: 1 })
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const j = J(params)
  const a = alphaDrive(params)
  const read = useSampled(sim, (s) => ({ t: s.t, w: s.w, th: s.th, landed: s.landed }))

  useEffect(() => {
    sim.reset()
  }, [params.M, params.d, params.m, params.Cf]) // eslint-disable-line react-hooks/exhaustive-deps

  const jLine = []
  for (let d2 = 0; d2 <= 0.07; d2 += 0.0025) jLine.push([d2 * 1e4, (J0 + 2 * (params.M / 1000) * d2) * 1000])

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={[0.25, 0.5, 1, 2]}
      camera={{ position: [0.9, 1.9, 4.4], target: [0.9, 1.5, 0] }}
      scene={<RotationScene sim={sim} />}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        <>
          <div className="state charge">{a <= 0 ? 'Le couple moteur ne vainc pas les frottements' : read.landed ? 'La masse est au sol : rotation freinée par les frottements' : 'Rotation uniformément accélérée'}</div>
          <div>J = J₀ + 2·M·d² = <b>{(j * 1000).toFixed(2)}·10⁻³ kg·m²</b></div>
          <div>θ″ = <b>{Math.max(a, 0).toFixed(3)} rad/s²</b></div>
          <div>ω = <b>{read.w.toFixed(2)} rad/s</b> ({((read.w * 60) / (2 * Math.PI)).toFixed(0)} tr/min) · tours : <b>{(read.th / (2 * Math.PI)).toFixed(1)}</b></div>
        </>
      }
      controls={
        <>
          <Slider label="Distance des masselottes d" value={params.d} min={3} max={28} step={1} unit="cm" onChange={set('d')} />
          <Slider label="Masse de chaque masselotte M" value={params.M} min={0} max={200} step={10} unit="g" onChange={set('M')} />
          <Slider label="Masse suspendue m" value={params.m} min={10} max={200} step={5} unit="g" onChange={set('m')} />
          <Slider label="Couple de frottement" value={params.Cf} min={0} max={10} step={0.5} unit="mN·m" onChange={set('Cf')} format={(v) => v.toFixed(1)} />
          <p className="formula">
            Couple moteur du fil ≈ m·g·r = {((params.m / 1000) * 9.8 * R_DRUM * 1000).toFixed(1)} mN·m (r = 2 cm)
          </p>
        </>
      }
      charts={
        <>
          <LiveChart sim={sim} title="Vitesse angulaire ω(t)" window={8} yUnit="ω (rad/s)" series={[{ label: 'ω(t)', color: '#d4a54a', get: (s) => s.w }]} />
          <Plot
            title="Moment d’inertie J en fonction de d² (droite)"
            xLabel="d² (cm²)"
            yLabel="J (10⁻³ kg·m²)"
            xMin={0}
            xMax={700}
            yMin={0}
            yMax={(J0 + 2 * 0.2 * 0.07) * 1000}
            curves={[{ pts: jLine, color: '#d4a54a' }]}
            points={[{ x: params.d * params.d, y: j * 1000 }]}
          />
        </>
      }
      course={
        <>
          <h2>Le cours en bref</h2>
          <div className="course-grid">
            <section>
              <h3>Grandeurs de rotation</h3>
              <p>Abscisse angulaire θ (rad), vitesse angulaire ω = dθ/dt (rad/s), accélération angulaire θ″ = dω/dt. Un point à la distance r de l’axe a la vitesse v = r·ω.</p>
            </section>
            <section>
              <h3>Relation fondamentale</h3>
              <p className="eq">Σ M<sub>Δ</sub>(F) = J<sub>Δ</sub>·θ″</p>
              <p>J<sub>Δ</sub> = Σ m<sub>i</sub>·r<sub>i</sub>² : moment d’inertie (kg·m²). Plus la masse est loin de l’axe, plus le solide est difficile à mettre en rotation.</p>
            </section>
            <section>
              <h3>Énergie cinétique de rotation</h3>
              <p className="eq">E<sub>c</sub> = ½·J<sub>Δ</sub>·ω²</p>
              <p>Théorème de Huygens : J = J<sub>G</sub> + m·d² ; ici J = J₀ + 2·M·d².</p>
            </section>
            <section>
              <h3>À toi de tester</h3>
              <ul>
                <li>Éloigne les masselottes : la rotation démarre-t-elle plus vite ou plus lentement ?</li>
                <li>Vérifie que ω(t) est une droite pendant la chute.</li>
                <li>Mesure θ″ pour plusieurs d et trace J = f(d²).</li>
              </ul>
            </section>
          </div>
        </>
      }
    />
  )
}
