import { useState } from 'react'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import Plot from '../../components/Plot.jsx'
import { useSimulation } from '../../lib/useSimulation.js'
import { clockModel } from '../../lib/color.js'
import { DEFAULTS, image, fp, vergence } from './model.js'
import LensScene from './Scene.jsx'

export const meta = {
  id: 'lentilles',
  title: 'Lentilles minces : banc d’optique et loupe',
  level: '3e année',
  sections: 'Maths · Sc. Exp. · Sc. Tech.',
  chapter: 'Optique : lentilles minces, instruments',
}

export default function LensExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(clockModel, params)
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const im = image(params)
  const f = fp(params)
  const loupe = params.mode === 'loupe'
  const sharp = im.real && Math.abs(params.E - im.OAp) < 0.6

  const setMode = (mode) =>
    setParams((p) => (mode === 'loupe' ? { ...p, mode, conv: true, f: 10, OA: -6 } : { ...p, mode, OA: -30, E: 15 }))

  const conj = []
  for (let x = -0.2; x <= 0; x += 0.002) conj.push([x, x + 1 / f])
  const pts = []
  if (!im.infinite) pts.push({ x: 1 / params.OA, y: 1 / im.OAp })

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={[1]}
      camera={{ position: [0.5, 1.6, 4.4], target: [0.4, 1.0, 0] }}
      scene={<LensScene sim={sim} />}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        <>
          <div className="state charge">
            {im.infinite ? 'Objet au foyer objet : image à l’infini' : im.real ? `Image réelle, ${im.g < 0 ? 'renversée' : 'droite'}${!loupe ? (sharp ? ' · nette sur l’écran' : ' · déplace l’écran pour la voir nette') : ''}` : 'Image virtuelle, droite : on la voit à travers la lentille'}
          </div>
          <div>OA = <b>{params.OA} cm</b> · f′ = <b>{f} cm</b> · C = <b>{vergence(params).toFixed(1)} δ</b></div>
          {!im.infinite && <div>OA′ = <b>{im.OAp.toFixed(1)} cm</b> · γ = OA′/OA = <b>{im.g.toFixed(2)}</b></div>}
          {!im.infinite && <div>A′B′ = γ·AB = <b>{(im.g * 2).toFixed(2)} cm</b></div>}
        </>
      }
      controls={
        <>
          <div className="speed" role="group" aria-label="Expérience">
            <span>Expérience</span>
            <button className={!loupe ? 'on' : ''} onClick={() => setMode('banc')}>Banc d’optique</button>
            <button className={loupe ? 'on' : ''} onClick={() => setMode('loupe')}>La loupe</button>
          </div>
          {!loupe && (
            <div className="speed" role="group" aria-label="Lentille">
              <span>Lentille</span>
              <button className={params.conv ? 'on' : ''} onClick={() => set('conv')(true)}>Convergente</button>
              <button className={!params.conv ? 'on' : ''} onClick={() => set('conv')(false)}>Divergente</button>
            </div>
          )}
          <Slider label="Distance focale |f′|" value={params.f} min={5} max={25} step={1} unit="cm" onChange={set('f')} />
          <Slider label="Position de l’objet OA" value={params.OA} min={-70} max={-2} step={1} unit="cm" onChange={set('OA')} />
          {!loupe && (
            <>
              <Slider label="Position de l’écran OE" value={params.E} min={2} max={75} step={0.5} unit="cm" onChange={set('E')} format={(v) => v.toFixed(1)} />
              {im.real && <button className="switch-btn" onClick={() => set('E')(+im.OAp.toFixed(1))}>Placer l’écran sur l’image</button>}
            </>
          )}
          <p className="formula">1/OA′ − 1/OA = 1/f′ · γ = OA′/OA</p>
        </>
      }
      charts={
        <>
          <Plot
            title="Vérification de la relation de conjugaison : 1/OA′ = 1/OA + 1/f′"
            xLabel="1/OA (cm⁻¹)"
            yLabel="1/OA′ (cm⁻¹)"
            xMin={-0.2}
            xMax={0}
            yMin={-0.25}
            yMax={0.25}
            curves={[{ pts: conj, color: '#30a46c' }]}
            points={pts}
            hlines={[{ v: 0, color: '#8a8f98' }]}
          />
          <Plot
            title="Grandissement γ en fonction de OA"
            xLabel="OA (cm)"
            yLabel="γ"
            xMin={-70}
            xMax={-2}
            yMin={-5}
            yMax={5}
            curves={[{ pts: Array.from({ length: 137 }, (_, k) => { const OA = -70 + k * 0.5; const r = image({ ...params, OA }); return [OA, Math.max(-6, Math.min(6, r.g))] }), color: '#3e9bff' }]}
            points={im.infinite ? [] : [{ x: params.OA, y: Math.max(-5, Math.min(5, im.g)) }]}
            vlines={[{ v: -Math.abs(f), label: 'F', color: '#e5484d' }]}
          />
        </>
      }
      course={
        <>
          <h2>Le cours en bref</h2>
          <div className="course-grid">
            <section>
              <h3>Lentilles minces</h3>
              <p>Lentille convergente : bords minces, f′ &gt; 0. Divergente : bords épais, f′ &lt; 0. Vergence C = 1/f′ (en dioptries, f′ en mètres).</p>
              <p>Rayons particuliers : un rayon passant par O n’est pas dévié ; un rayon parallèle à l’axe ressort en passant par F′ ; un rayon passant par F ressort parallèle à l’axe.</p>
            </section>
            <section>
              <h3>Relations de conjugaison</h3>
              <p className="eq">1/OA′ − 1/OA = 1/f′    γ = OA′/OA</p>
              <p>γ &lt; 0 : image renversée. |γ| &gt; 1 : image agrandie. OA′ &gt; 0 : image réelle (on peut la recueillir sur un écran).</p>
            </section>
            <section>
              <h3>Instruments d’optique</h3>
              <p><b>Loupe</b> : lentille convergente, objet placé entre F et O ; l’image est virtuelle, droite et agrandie.</p>
              <p><b>Œil</b> : le cristallin est une lentille convergente de vergence variable (accommodation), la rétine joue le rôle de l’écran.</p>
              <p><b>Microscope</b> : un objectif donne une image réelle agrandie, observée à travers l’oculaire utilisé comme loupe.</p>
            </section>
            <section>
              <h3>À toi de tester</h3>
              <ul>
                <li>Place l’objet à 2f : où se forme l’image ? Quelle est sa taille ?</li>
                <li>Rapproche l’objet du foyer F : que devient l’image ?</li>
                <li>Avec une lentille divergente, peut-on obtenir une image sur l’écran ?</li>
                <li>Loupe : quelle position de l’objet donne la plus grande image ?</li>
              </ul>
            </section>
          </div>
        </>
      }
    />
  )
}
