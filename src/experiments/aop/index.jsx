import { useState } from 'react'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import Plot from '../../components/Plot.jsx'
import LiveChart from '../../components/LiveChart.jsx'
import { useSimulation, useSampled } from '../../lib/useSimulation.js'
import { aopModel, DEFAULTS, MONTAGES, transfer, gain, ue, VSAT } from './model.js'
import AopScene from './Scene.jsx'

export const meta = {
  id: 'aop',
  title: 'Amplificateur opérationnel : montages de base',
  level: '3e année',
  sections: 'Sc. Tech.',
  chapter: 'Électronique : l’amplificateur opérationnel',
}

const FORMULAS = {
  inverseur: 'us = −(R2/R1)·ue',
  noninv: 'us = (1 + R2/R1)·ue',
  suiveur: 'us = ue',
  sommateur: 'us = −(R2/R1)·(ue + u2)',
  comparateur: 'us = +Vsat si ue > Uref, −Vsat sinon',
}

export default function AopExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(aopModel, params, { speed: 0.01 })
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const G = gain(params)
  const peak = transfer(params.Ue, params)
  const sat = G != null && Math.abs(G * (params.Ue + (params.montage === 'sommateur' ? Math.abs(params.u2) : 0))) > VSAT
  const read = useSampled(sim, (s) => ({ ue: ue(s.t, sim.paramsRef.current) }))

  const tr = []
  for (let x = -8; x <= 8; x += 0.02) tr.push([x, transfer(x, params)])

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={[0.002, 0.005, 0.01, 0.02, 0.05]}
      camera={{ position: [0.2, 3.4, 4.2], target: [0.1, 0.3, 0] }}
      scene={<AopScene sim={sim} />}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        <>
          <div className="state charge">Montage {MONTAGES[params.montage].toLowerCase()} · {FORMULAS[params.montage]}</div>
          {G != null && <div>Amplification A = <b>{G.toFixed(2)}</b></div>}
          <div>ue = <b>{read.ue.toFixed(2)} V</b> → us = <b>{transfer(read.ue, params).toFixed(2)} V</b></div>
          {sat && <div className="small" style={{ color: '#ff6b6b' }}>Saturation : |us| ne peut pas dépasser Vsat = {VSAT} V (signal écrêté).</div>}
          {params.montage === 'comparateur' && <div className="small">us bascule quand ue franchit Uref = {params.Uref} V.</div>}
        </>
      }
      controls={
        <>
          <div className="speed" role="group" aria-label="Montage">
            {Object.entries(MONTAGES).map(([k, v]) => (
              <button key={k} className={params.montage === k ? 'on' : ''} onClick={() => set('montage')(k)}>{v}</button>
            ))}
          </div>
          <Slider label="Amplitude de ue" value={params.Ue} min={0.2} max={8} step={0.1} unit="V" onChange={set('Ue')} format={(v) => v.toFixed(1)} />
          <Slider label="Fréquence N" value={params.N} min={10} max={500} step={10} unit="Hz" onChange={set('N')} />
          {params.montage !== 'suiveur' && params.montage !== 'comparateur' && (
            <>
              <Slider label="R1" value={params.R1} min={1} max={47} step={1} unit="kΩ" onChange={set('R1')} />
              <Slider label="R2" value={params.R2} min={1} max={100} step={1} unit="kΩ" onChange={set('R2')} />
            </>
          )}
          {params.montage === 'sommateur' && <Slider label="Tension continue u2" value={params.u2} min={-5} max={5} step={0.1} unit="V" onChange={set('u2')} format={(v) => v.toFixed(1)} />}
          {params.montage === 'comparateur' && <Slider label="Tension de référence Uref" value={params.Uref} min={-5} max={5} step={0.1} unit="V" onChange={set('Uref')} format={(v) => v.toFixed(1)} />}
          <p className="formula">Valeur crête de us : {peak.toFixed(2)} V</p>
        </>
      }
      charts={
        <>
          <LiveChart
            sim={sim}
            title="Oscillogrammes ue(t) et us(t)"
            window={2.5 / params.N}
            yMin={-16}
            yMax={16}
            timeScale={1000}
            timeLabel="t (ms)"
            yUnit="u (V)"
            series={[
              { label: 'ue', color: '#ffd23f', get: (s) => ue(s.t, sim.paramsRef.current) },
              { label: 'us', color: '#4cc3ff', get: (s) => transfer(ue(s.t, sim.paramsRef.current), sim.paramsRef.current) },
            ]}
            guides={() => [{ axis: 'y', value: VSAT, label: '+Vsat', color: '#8a8f98' }, { axis: 'y', value: -VSAT, label: '−Vsat', color: '#8a8f98' }]}
          />
          <Plot
            title="Caractéristique de transfert us = f(ue)"
            xLabel="ue (V)"
            yLabel="us (V)"
            xMin={-8}
            xMax={8}
            yMin={-16}
            yMax={16}
            curves={[{ pts: tr, color: '#4cc3ff' }]}
            hlines={[{ v: VSAT, label: '+Vsat', color: '#8a8f98' }, { v: -VSAT, label: '−Vsat', color: '#8a8f98' }]}
            points={[{ x: read.ue, y: transfer(read.ue, params) }]}
          />
        </>
      }
      course={
        <>
          <h2>Le cours en bref</h2>
          <div className="course-grid">
            <section>
              <h3>L’AOP idéal</h3>
              <p>Deux entrées (E+ et E−), une sortie S, alimenté en ±15 V. Les courants d’entrée sont nuls : i+ = i− = 0.</p>
              <ul>
                <li><b>Régime linéaire</b> (contre-réaction sur E−) : ε = V+ − V− = 0.</li>
                <li><b>Régime saturé</b> : us = ±Vsat selon le signe de ε.</li>
              </ul>
            </section>
            <section>
              <h3>Montages amplificateurs</h3>
              <p className="eq">Inverseur : us = −(R2/R1)·ue</p>
              <p className="eq">Non inverseur : us = (1 + R2/R1)·ue</p>
              <p className="eq">Suiveur : us = ue (adaptation d’impédance)</p>
              <p className="eq">Sommateur : us = −R2·(u1/R1 + u2/R1′)</p>
            </section>
            <section>
              <h3>Comparateur</h3>
              <p>Sans contre-réaction, l’AOP fonctionne en régime saturé : la sortie vaut +Vsat ou −Vsat selon que ue est supérieure ou inférieure à la tension de référence. Un signal sinusoïdal devient un signal rectangulaire.</p>
            </section>
            <section>
              <h3>À toi de tester</h3>
              <ul>
                <li>Inverseur avec R2 = R1 : que vaut us ?</li>
                <li>Augmente ue jusqu’à la saturation : que devient la forme de us ?</li>
                <li>Comparateur : déplace Uref et observe le rapport cyclique.</li>
              </ul>
            </section>
          </div>
        </>
      }
    />
  )
}
