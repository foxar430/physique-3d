import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import Plot from '../../components/Plot.jsx'
import { useSimulation } from '../../lib/useSimulation.js'
import { Bench, Multimeter } from '../../components/three/parts.jsx'
import { Lead } from '../../components/three/Wire.jsx'
import { Table } from '../../components/three/Lab.jsx'

export const meta = {
  id: 'alternatif',
  title: 'Courant alternatif : l’oscilloscope',
  level: '2e année',
  sections: 'Sciences',
  chapter: 'Électricité : le courant alternatif',
}

/**
 * Tension périodique délivrée par un GBF et observée à l'oscilloscope.
 * sinus : u = Um·sin(2πNt)   triangle, carré : même période T = 1/N.
 * Valeur efficace : sinus Um/√2, triangle Um/√3, carré Um.
 */
const SHAPES = { sinus: 'Sinusoïdale', triangle: 'Triangulaire', carre: 'Carrée', continu: 'Continue' }
const SENS = [0.5, 1, 2, 5] // V/div
const SWEEP = [0.5, 1, 2, 5, 10] // ms/div
const DEFAULTS = { shape: 'sinus', Um: 6, N: 100, sens: 2, sweep: 2, offset: 0 }

export function u(t, p) {
  const ph = (t * p.N) % 1
  switch (p.shape) {
    case 'sinus': return p.Um * Math.sin(2 * Math.PI * ph)
    case 'triangle': return p.Um * (ph < 0.25 ? 4 * ph : ph < 0.75 ? 2 - 4 * ph : 4 * ph - 4)
    case 'carre': return ph < 0.5 ? p.Um : -p.Um
    default: return p.Um
  }
}
const ueff = (p) => (p.shape === 'sinus' ? p.Um / Math.SQRT2 : p.shape === 'triangle' ? p.Um / Math.sqrt(3) : p.Um)

const clock = { static: true, maxDt: 1 / 240, init: () => ({ t: 0 }), step: (s, dt) => ({ t: s.t + dt }) }

function Scope({ sim }) {
  const { canvas, tex } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 500
    canvas.height = 400
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return { canvas, tex }
  }, [])
  useFrame(() => {
    const p = sim.paramsRef.current
    const g = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    g.fillStyle = '#061209'
    g.fillRect(0, 0, W, H)
    g.strokeStyle = 'rgba(80,170,110,0.35)'
    g.lineWidth = 1
    for (let i = 1; i < 10; i++) { g.beginPath(); g.moveTo((W * i) / 10, 0); g.lineTo((W * i) / 10, H); g.stroke() }
    for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(0, (H * i) / 8); g.lineTo(W, (H * i) / 8); g.stroke() }
    g.strokeStyle = 'rgba(120,220,150,0.6)'
    g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke()
    for (let i = 0; i <= 50; i++) { g.beginPath(); g.moveTo((W * i) / 50, H / 2 - 4); g.lineTo((W * i) / 50, H / 2 + 4); g.stroke() }
    // déclenchement : la trace démarre toujours au même point (image stable)
    const span = (10 * p.sweep) / 1000
    const y = (v) => H / 2 - ((v + p.offset * p.sens) / p.sens) * (H / 8)
    g.strokeStyle = '#9dffb0'
    g.shadowColor = '#5dff8a'
    g.shadowBlur = 8
    g.lineWidth = 2.5
    g.beginPath()
    for (let k = 0; k <= 500; k++) {
      const t = (span * k) / 500
      const Y = y(u(t, p))
      k ? g.lineTo((W * k) / 500, Y) : g.moveTo(0, Y)
    }
    g.stroke()
    g.shadowBlur = 0
    g.fillStyle = '#9dffb0'
    g.font = '16px system-ui'
    g.fillText(`CH1 ${p.sens} V/div   ${p.sweep} ms/div`, 10, 22)
    tex.needsUpdate = true
  })
  return (
    <group position={[0.6, 0, -0.2]}>
      <RoundedBox args={[2.2, 1.5, 1.4]} radius={0.08} position={[0, 0.75, 0]} castShadow>
        <meshStandardMaterial color="#c9ccd1" roughness={0.5} />
      </RoundedBox>
      <mesh position={[-0.35, 0.82, 0.701]}>
        <planeGeometry args={[1.25, 1.0]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {[[0.65, 1.2], [0.65, 0.85], [0.9, 1.2], [0.9, 0.85], [0.78, 0.45]].map(([x, yy], i) => (
        <mesh key={i} position={[x, yy, 0.71]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.05, 24]} />
          <meshStandardMaterial color="#2a2d33" />
        </mesh>
      ))}
      <Html position={[0, 1.75, 0]} center zIndexRange={[10, 0]}><span className="lbl">Oscilloscope</span></Html>
    </group>
  )
}

function ACScene({ sim }) {
  const gbf = useRef()
  const vm = useRef()
  useFrame(() => {
    const p = sim.paramsRef.current
    if (gbf.current) gbf.current.textContent = p.shape === 'continu' ? 'DC' : p.N + ' Hz'
    if (vm.current) vm.current.textContent = (p.shape === 'continu' ? p.Um : ueff(p)).toFixed(2) + ' V'
  })
  return (
    <group>
      <Table size={[8, 0.16, 4]} position={[0, -0.08, 0]} />
      <group position={[-2.6, 0, 0]}>
        <Bench kind="gbf" textRef={gbf} />
      </group>
      <Scope sim={sim} />
      <group position={[-0.9, 0, 1.2]} rotation={[0, 0.3, 0]}>
        <Multimeter textRef={vm} label="V~" />
      </group>
      <Html position={[-0.9, 0.85, 1.2]} center zIndexRange={[10, 0]}><span className="lbl tiny">Voltmètre (mode alternatif) : valeur efficace</span></Html>
      <Lead smooth metal={false} color="#c0392b" radius={0.022} points={[[-2.08, 0.22, -0.6], [-1.4, 0.3, -0.9], [-0.6, 0.6, -0.3], [-0.5, 0.5, 0.5]]} />
      <Lead smooth metal={false} color="#22252a" radius={0.022} points={[[-2.08, 0.22, 0.6], [-1.5, 0.15, 0.9], [-1.0, 0.2, 1.05]]} />
      <Lead smooth metal={false} color="#c0392b" radius={0.018} points={[[-2.08, 0.22, -0.6], [-1.8, 0.4, 0.4], [-1.0, 0.25, 1.3]]} />
    </group>
  )
}

export default function ACExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(clock, params)
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const T = 1000 / params.N // ms
  const divT = T / params.sweep
  const divU = params.Um / params.sens
  const pts = []
  for (let k = 0; k <= 400; k++) {
    const t = ((2 * T) * k) / 400 / 1000
    pts.push([t * 1000, u(t, params)])
  }
  const dc = params.shape === 'continu'

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={[1]}
      camera={{ position: [0, 2.0, 4.6], target: [0, 0.8, 0] }}
      scene={<ACScene sim={sim} />}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        <>
          <div className="state charge">{dc ? 'Tension continue : un trait horizontal' : `Tension ${SHAPES[params.shape].toLowerCase()} alternative`}</div>
          {!dc && <div>Période : <b>{divT.toFixed(1)} div</b> × {params.sweep} ms/div = <b>{T.toFixed(2)} ms</b> → N = 1/T = <b>{params.N} Hz</b></div>}
          <div>Valeur maximale : <b>{divU.toFixed(1)} div</b> × {params.sens} V/div = <b>{params.Um} V</b></div>
          {!dc && <div>Valeur efficace U = <b>{ueff(params).toFixed(2)} V</b>{params.shape === 'sinus' && ' (= Um/√2)'}</div>}
        </>
      }
      controls={
        <>
          <div className="speed" role="group" aria-label="Forme">
            <span>Signal</span>
            {Object.entries(SHAPES).map(([k, v]) => (
              <button key={k} className={params.shape === k ? 'on' : ''} onClick={() => set('shape')(k)}>{v}</button>
            ))}
          </div>
          <Slider label="Tension maximale Um" value={params.Um} min={0.5} max={10} step={0.5} unit="V" onChange={set('Um')} format={(v) => v.toFixed(1)} />
          {!dc && <Slider label="Fréquence N" value={params.N} min={10} max={1000} step={10} unit="Hz" onChange={set('N')} />}
          <h2>Réglages de l’oscilloscope</h2>
          <div className="speed" role="group" aria-label="Sensibilité verticale">
            <span>Sensibilité</span>
            {SENS.map((v) => <button key={v} className={params.sens === v ? 'on' : ''} onClick={() => set('sens')(v)}>{v} V/div</button>)}
          </div>
          <div className="speed" role="group" aria-label="Balayage">
            <span>Balayage</span>
            {SWEEP.map((v) => <button key={v} className={params.sweep === v ? 'on' : ''} onClick={() => set('sweep')(v)}>{v} ms/div</button>)}
          </div>
          <Slider label="Décalage vertical (position)" value={params.offset} min={-3} max={3} step={0.5} unit="div" onChange={set('offset')} format={(v) => v.toFixed(1)} />
          {divU > 4 && <p className="small" style={{ color: '#ff6b6b' }}>La courbe sort de l’écran : augmente la sensibilité (plus de V/div).</p>}
        </>
      }
      charts={
        <>
          <Plot title="u(t) sur deux périodes" xLabel="t (ms)" yLabel="u (V)" xMin={0} xMax={2 * T} yMin={-11} yMax={11} curves={[{ pts, color: '#30a46c' }]} hlines={dc ? [] : [{ v: params.Um, label: 'Um', color: '#e0a000' }, { v: ueff(params), label: 'U eff', color: '#3e9bff' }]} vlines={dc ? [] : [{ v: T, label: 'T', color: '#8a8f98' }]} />
          <Plot
            title="Valeur efficace en fonction de Um (droite)"
            xLabel="Um (V)"
            yLabel="U (V)"
            xMin={0}
            xMax={10}
            yMin={0}
            yMax={10}
            curves={[
              { pts: [[0, 0], [10, 10 / Math.SQRT2]], color: '#30a46c' },
              { pts: [[0, 0], [10, 10 / Math.sqrt(3)]], color: '#e0a000', dash: '5 4' },
              { pts: [[0, 0], [10, 10]], color: '#3e9bff', dash: '2 4' },
            ]}
            points={dc ? [] : [{ x: params.Um, y: ueff(params) }]}
          />
        </>
      }
      course={
        <>
          <h2>Le cours en bref</h2>
          <div className="course-grid">
            <section>
              <h3>Tension variable et périodique</h3>
              <p>Une tension alternative change de signe ; elle est périodique si elle se reproduit identique à elle-même toutes les T secondes.</p>
              <p className="eq">N = 1 / T    (Hz)</p>
              <p>Le secteur en Tunisie : U = 220 V, N = 50 Hz.</p>
            </section>
            <section>
              <h3>Mesures à l’oscilloscope</h3>
              <p className="eq">T = (nombre de divisions) × balayage</p>
              <p className="eq">Um = (nombre de divisions) × sensibilité</p>
              <p>Choisis la sensibilité pour que la courbe occupe tout l’écran sans en sortir.</p>
            </section>
            <section>
              <h3>Valeur efficace</h3>
              <p>Un voltmètre (ou ampèremètre) en mode alternatif mesure la valeur efficace. Pour une tension sinusoïdale :</p>
              <p className="eq">U = Um / √2    I = Im / √2</p>
            </section>
            <section>
              <h3>À toi de tester</h3>
              <ul>
                <li>Mesure T en comptant les divisions et compare à 1/N.</li>
                <li>Quel balayage permet de voir exactement 2 périodes à 100 Hz ?</li>
                <li>Compare la valeur efficace d’une tension carrée et d’une sinusoïdale de même Um.</li>
              </ul>
            </section>
          </div>
        </>
      }
    />
  )
}
