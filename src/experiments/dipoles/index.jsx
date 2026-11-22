import { useEffect, useState } from 'react'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import Plot from '../../components/Plot.jsx'
import { useSimulation } from '../../lib/useSimulation.js'
import { clockModel } from '../../lib/color.js'
import { DEFAULTS, DIPOLES, U, operating, pouillet } from './model.js'
import DipoleScene from './Scene.jsx'

export const meta = {
  id: 'dipoles',
  title: 'Dipôles électriques : caractéristiques, loi de Pouillet, puissance',
  level: '2e année',
  sections: 'Sciences',
  chapter: 'Électricité : dipôles passifs et actifs, générateur',
}

export default function DipoleExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const [points, setPoints] = useState([])
  const sim = useSimulation(clockModel, params)
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const pou = params.mode === 'pouillet'
  const op = pou ? pouillet(params) : operating(params)
  const isPile = params.dip === 'pile'

  useEffect(() => setPoints([]), [params.dip, params.mode, params.R, params.E, params.r, params.Ep, params.rp])

  // caractéristique théorique
  let curve = []
  let iMax = 0.12
  let uMax = 12
  if (!pou) {
    if (isPile) {
      iMax = params.E / params.r
      for (let k = 0; k <= 50; k++) { const I = (iMax * k) / 50; curve.push([I * 1000, params.E - params.r * I]) }
      uMax = params.E * 1.1
    } else {
      iMax = params.dip === 'lampe' ? 0.35 : params.dip === 'resistor' ? Math.min(0.2, 12 / params.R) : 0.2
      for (let k = 0; k <= 120; k++) { const I = (iMax * k) / 120; curve.push([I * 1000, U(I, params)]) }
      uMax = Math.max(1, Math.min(14, Math.max(...curve.map((c) => c[1])) * 1.1))
    }
  }
  const gen = []
  const rec = []
  if (pou) {
    iMax = params.E / params.r
    for (let k = 0; k <= 40; k++) {
      const I = (iMax * k) / 40
      gen.push([I * 1000, params.E - params.r * I])
      rec.push([I * 1000, params.Ep + (params.rp + params.Rpou) * I])
    }
    uMax = Math.max(params.E, params.Ep) * 1.2
  }
  const P = op.U * op.I

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={[1]}
      camera={{ position: [0.3, 3.4, 4.4], target: [0.2, 0.2, -0.1] }}
      scene={<DipoleScene sim={sim} />}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        <>
          <div className="state charge">{pou ? 'Loi de Pouillet : I = (E − E′) / (r + r′ + R)' : `Caractéristique U = f(I) : ${DIPOLES[params.dip].name.toLowerCase()}`}</div>
          <div>I = <b>{(op.I * 1000).toFixed(1)} mA</b> · U = <b>{op.U.toFixed(2)} V</b></div>
          <div>Puissance P = U·I = <b>{(P * 1000).toFixed(0)} mW</b></div>
          {pou && <div>Effet Joule dans le circuit : (r + r′ + R)·I² = <b>{((params.r + params.rp + params.Rpou) * op.I * op.I * 1000).toFixed(0)} mW</b></div>}
          {isPile && !pou && <div>Puissance perdue par effet Joule dans la pile : r·I² = <b>{(params.r * op.I * op.I * 1000).toFixed(0)} mW</b></div>}
        </>
      }
      controls={
        <>
          <div className="speed" role="group" aria-label="Expérience">
            <span>Expérience</span>
            <button className={!pou ? 'on' : ''} onClick={() => set('mode')('carac')}>Caractéristique d’un dipôle</button>
            <button className={pou ? 'on' : ''} onClick={() => set('mode')('pouillet')}>Loi de Pouillet</button>
          </div>
          {!pou ? (
            <>
              <div className="speed" role="group" aria-label="Dipôle">
                {Object.entries(DIPOLES).map(([k, d]) => (
                  <button key={k} className={params.dip === k ? 'on' : ''} onClick={() => set('dip')(k)}>{d.name}</button>
                ))}
              </div>
              {isPile ? (
                <>
                  <Slider label="Résistance du rhéostat (charge)" value={params.Rload} min={0} max={100} step={1} unit="Ω" onChange={set('Rload')} />
                  <Slider label="f.é.m. E" value={params.E} min={1.5} max={9} step={0.5} unit="V" onChange={set('E')} format={(v) => v.toFixed(1)} />
                  <Slider label="Résistance interne r" value={params.r} min={0.5} max={5} step={0.1} unit="Ω" onChange={set('r')} format={(v) => v.toFixed(1)} />
                </>
              ) : (
                <>
                  <Slider label="Tension du générateur réglable" value={params.Eg} min={0} max={params.dip === 'lampe' ? 24 : 12} step={0.1} unit="V" onChange={set('Eg')} format={(v) => v.toFixed(1)} />
                  {params.dip === 'resistor' && <Slider label="Résistance R" value={params.R} min={20} max={470} step={10} unit="Ω" onChange={set('R')} />}
                  {params.dip === 'moteur' && (
                    <>
                      <Slider label="f.c.é.m. E′" value={params.Ep} min={0.5} max={6} step={0.1} unit="V" onChange={set('Ep')} format={(v) => v.toFixed(1)} />
                      <Slider label="Résistance interne r′" value={params.rp} min={1} max={20} step={0.5} unit="Ω" onChange={set('rp')} format={(v) => v.toFixed(1)} />
                    </>
                  )}
                </>
              )}
              <button className="switch-btn" onClick={() => setPoints((pts) => [...pts, [op.I * 1000, op.U]])}>Relever le point (I, U)</button>
              {points.length > 0 && <button className="link" onClick={() => setPoints([])}>Effacer les points ({points.length})</button>}
            </>
          ) : (
            <>
              <Slider label="Générateur : E" value={params.E} min={1.5} max={12} step={0.5} unit="V" onChange={set('E')} format={(v) => v.toFixed(1)} />
              <Slider label="Générateur : r" value={params.r} min={0.5} max={5} step={0.1} unit="Ω" onChange={set('r')} format={(v) => v.toFixed(1)} />
              <Slider label="Moteur : E′" value={params.Ep} min={0} max={6} step={0.1} unit="V" onChange={set('Ep')} format={(v) => v.toFixed(1)} />
              <Slider label="Moteur : r′" value={params.rp} min={1} max={20} step={0.5} unit="Ω" onChange={set('rp')} format={(v) => v.toFixed(1)} />
              <Slider label="Résistor R en série" value={params.Rpou} min={0} max={50} step={1} unit="Ω" onChange={set('Rpou')} />
            </>
          )}
        </>
      }
      charts={
        pou ? (
          <>
            <Plot
              title="Point de fonctionnement : intersection des caractéristiques"
              xLabel="I (mA)"
              yLabel="U (V)"
              xMin={0}
              xMax={iMax * 1000}
              yMin={0}
              yMax={uMax}
              curves={[{ pts: gen, color: '#e0a000' }, { pts: rec, color: '#3e9bff' }]}
              points={[{ x: op.I * 1000, y: op.U, label: 'P' }]}
            />
            <Plot
              title="Puissance reçue par le moteur en fonction de R"
              xLabel="R (Ω)"
              yLabel="P (mW)"
              xMin={0}
              xMax={50}
              yMin={0}
              yMax={Math.max(...Array.from({ length: 51 }, (_, R) => { const q = pouillet({ ...params, Rpou: R }); return (params.Ep + params.rp * q.I) * q.I * 1000 }), 1) * 1.1}
              curves={[{ pts: Array.from({ length: 51 }, (_, R) => { const q = pouillet({ ...params, Rpou: R }); return [R, (params.Ep + params.rp * q.I) * q.I * 1000] }), color: '#30a46c' }]}
              points={[{ x: params.Rpou, y: (params.Ep + params.rp * op.I) * op.I * 1000 }]}
            />
          </>
        ) : (
          <>
            <Plot
              title={isPile ? 'Caractéristique du générateur U = E − r·I' : 'Caractéristique U = f(I)'}
              xLabel="I (mA)"
              yLabel="U (V)"
              xMin={0}
              xMax={iMax * 1000}
              yMin={0}
              yMax={uMax}
              curves={[{ pts: curve, color: '#8a8f98', dash: '5 4', width: 1.5 }]}
              points={[...points.map(([x, y]) => ({ x, y, color: '#e0a000', r: 4 })), { x: op.I * 1000, y: op.U }]}
            />
            <Plot
              title="Puissance P = U·I"
              xLabel="I (mA)"
              yLabel="P (mW)"
              xMin={0}
              xMax={iMax * 1000}
              yMin={0}
              yMax={Math.max(...curve.map(([i, u]) => i * u), 1) * 1.1}
              curves={[{ pts: curve.map(([i, u]) => [i, i * u]), color: '#e5484d' }]}
              points={[{ x: op.I * 1000, y: op.I * 1000 * op.U }]}
            />
          </>
        )
      }
      course={
        <>
          <h2>Le cours en bref</h2>
          <div className="course-grid">
            <section>
              <h3>Dipôles passifs</h3>
              <p>Résistor (conducteur ohmique) : <b>U = R·I</b>, caractéristique droite passant par l’origine. Une lampe a une caractéristique courbée (sa résistance augmente quand le filament chauffe). Une diode ne conduit que dans un sens, au-delà d’une tension seuil (≈ 0,6 V).</p>
            </section>
            <section>
              <h3>Récepteur actif, générateur</h3>
              <p className="eq">Moteur : U = E′ + r′·I    Pile : U = E − r·I</p>
              <p>E′ : force contre-électromotrice, E : force électromotrice, r et r′ : résistances internes.</p>
            </section>
            <section>
              <h3>Loi de Pouillet, énergie</h3>
              <p className="eq">I = (E − E′) / (r + r′ + R)</p>
              <p className="eq">P = U·I    W = P·t    Effet Joule : P<sub>J</sub> = R·I²</p>
              <p>Le point de fonctionnement est l’intersection des caractéristiques du générateur et du récepteur.</p>
            </section>
            <section>
              <h3>À toi de tester</h3>
              <ul>
                <li>Relève 6 points pour le résistor : la caractéristique est-elle une droite ?</li>
                <li>Diode : à partir de quelle tension le courant apparaît-il ?</li>
                <li>Pile : que vaut U quand I = 0 ? Mesure la pente.</li>
                <li>Pouillet : que se passe-t-il si E′ &gt; E ?</li>
              </ul>
            </section>
          </div>
        </>
      }
    />
  )
}
