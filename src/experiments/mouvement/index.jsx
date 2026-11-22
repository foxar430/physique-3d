import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import LiveChart from '../../components/LiveChart.jsx'
import { useSimulation, useSampled } from '../../lib/useSimulation.js'
import { Table, Vector, useCanvasTexture } from '../../components/three/Lab.jsx'

export const meta = {
  id: 'mouvement',
  title: 'Mouvement d’un point matériel : table à coussin d’air',
  level: '2e année',
  sections: 'Sciences',
  chapter: 'Mécanique : mouvements rectilignes et circulaire uniforme',
}

const TAU = 0.04 // s
const W = 0.8 // demi-largeur utile de la table (m)
const DEFAULTS = { mode: 'mru', v0: 0.4, a: 0.3, R: 0.35, v: 0.6 }
const MODES = { mru: 'Rectiligne uniforme', mruv: 'Rectiligne uniformément varié', circ: 'Circulaire uniforme' }

/** position (m) et vitesse du mobile à l'instant t */
function kin(t, p) {
  if (p.mode === 'circ') {
    const w = p.v / p.R
    const th = w * t
    return { x: p.R * Math.cos(th), y: p.R * Math.sin(th), vx: -p.v * Math.sin(th), vy: p.v * Math.cos(th), s: p.v * t }
  }
  const a = p.mode === 'mruv' ? p.a : 0
  const x0 = -W + 0.05
  const x = x0 + p.v0 * t + 0.5 * a * t * t
  return { x, y: 0, vx: p.v0 + a * t, vy: 0, s: x - x0 }
}
const tEnd = (p) => {
  if (p.mode === 'circ') return Infinity
  const a = p.mode === 'mruv' ? p.a : 0
  const L = 2 * W - 0.1
  return a > 0 ? (-p.v0 + Math.sqrt(p.v0 * p.v0 + 2 * a * L)) / a : L / Math.max(p.v0, 1e-3)
}

const model = {
  maxDt: 1 / 500,
  init: (p) => ({ t: 0, marks: [], count: 0, ...kin(0, p) }),
  step(s, dt, p) {
    const t = Math.min(s.t + dt, tEnd(p))
    let { marks, count } = s
    const n = Math.floor(t / TAU + 1e-9)
    if (n >= count) {
      marks = marks.slice()
      while (count <= n) marks.push(kin(count++ * TAU, p))
      const keep = p.mode === 'circ' ? Math.ceil((2 * Math.PI * p.R) / p.v / TAU) : 400
      if (marks.length > keep) marks = marks.slice(-keep)
    }
    return { t, marks, count, ...kin(t, p) }
  },
}

const K = 2.6 // unités par mètre

function AirTable({ sim }) {
  const p = sim.paramsRef.current
  const puck = useRef()
  const dots = useRef()
  const vV = useRef()
  const aV = useRef()
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), o: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() }), [])
  const paper = useCanvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#f4f1e8'
    g.fillRect(0, 0, w, h)
    g.strokeStyle = 'rgba(0,0,0,0.08)'
    for (let i = 0; i <= 32; i++) { g.beginPath(); g.moveTo((w * i) / 32, 0); g.lineTo((w * i) / 32, h); g.stroke(); g.beginPath(); g.moveTo(0, (h * i) / 32); g.lineTo(w, (h * i) / 32); g.stroke() }
  })
  const Y = 0.62
  useFrame(() => {
    const s = sim.stateRef.current
    const pos = tmp.o.set(s.x * K, Y + 0.05, -s.y * K)
    puck.current.position.copy(pos)
    for (let i = 0; i < 400; i++) {
      const mk = s.marks[i]
      tmp.s.setScalar(mk ? 1 : 0)
      tmp.m.compose(mk ? new THREE.Vector3(mk.x * K, Y + 0.004, -mk.y * K) : pos, tmp.q.identity(), tmp.s)
      dots.current.setMatrixAt(i, tmp.m)
    }
    dots.current.instanceMatrix.needsUpdate = true
    vV.current.set(pos.clone().setY(Y + 0.2), new THREE.Vector3(s.vx, 0, -s.vy).multiplyScalar(1.2))
    const pp = sim.paramsRef.current
    if (pp.mode === 'circ') {
      const ac = (pp.v * pp.v) / pp.R
      aV.current.set(pos.clone().setY(Y + 0.2), new THREE.Vector3(-s.x, 0, s.y).normalize().multiplyScalar(Math.min(1.2, ac * 0.6)))
      aV.current.visible = true
    } else if (pp.mode === 'mruv') {
      aV.current.set(pos.clone().setY(Y + 0.25), new THREE.Vector3(pp.a * 1.2, 0, 0))
      aV.current.visible = true
    } else aV.current.visible = false
  })
  const circ = p.mode === 'circ'
  return (
    <group>
      <Table size={[7, 0.16, 5]} position={[0, -0.08, 0]} />
      {/* table à coussin d'air (inclinée si MRUV : on ne montre que la cale) */}
      <RoundedBox args={[2 * W * K + 0.3, 0.12, 2 * W * K * 0.75 + 0.3]} radius={0.04} position={[0, Y - 0.07, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#2a2d33" roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2 * W * K, 2 * W * K * 0.75]} />
        <meshStandardMaterial map={paper} roughness={0.8} />
      </mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * W * K, (Y - 0.13) / 2, sz * W * K * 0.7]}>
          <cylinderGeometry args={[0.05, 0.05, Y - 0.13, 12]} />
          <meshStandardMaterial color="#9aa2ab" metalness={0.8} />
        </mesh>
      ))}
      {p.mode === 'mruv' && (
        <Html position={[-W * K - 0.3, Y + 0.3, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">table légèrement inclinée →</span></Html>
      )}
      {circ && (
        <>
          <mesh position={[0, Y + 0.06, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.12, 16]} />
            <meshStandardMaterial color="#e0a000" metalness={0.6} />
          </mesh>
          <FixedString sim={sim} Y={Y} />
        </>
      )}
      {/* mobile autoporteur */}
      <group ref={puck}>
        <mesh castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.08, 40]} />
          <meshStandardMaterial color="#e5484d" roughness={0.35} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.05, 0.06, 0.1, 20]} />
          <meshStandardMaterial color="#c9ced6" metalness={0.8} />
        </mesh>
      </group>
      <instancedMesh ref={dots} args={[null, null, 400]}>
        <cylinderGeometry args={[0.018, 0.018, 0.004, 10]} />
        <meshBasicMaterial color="#111" />
      </instancedMesh>
      <Vector ref={vV} color="#4cd17a" />
      <Vector ref={aV} color="#e5484d" />
    </group>
  )
}

function FixedString({ sim, Y }) {
  const ref = useRef()
  useFrame(() => {
    const s = sim.stateRef.current
    const end = new THREE.Vector3(s.x * K, Y + 0.06, -s.y * K)
    const len = end.length()
    ref.current.position.copy(end.clone().multiplyScalar(0.5)).setY(Y + 0.06)
    ref.current.scale.set(len, 1, 1)
    ref.current.rotation.y = Math.atan2(s.y, s.x)
  })
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1, 0.008, 0.008]} />
      <meshBasicMaterial color="#e9e4d8" />
    </mesh>
  )
}

export default function MotionExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(model, params, { speed: 0.5 })
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const read = useSampled(sim, (s) => ({ t: s.t, s: s.s, vx: s.vx, vy: s.vy, marks: s.marks }), 8)
  useEffect(() => sim.reset(), [params.mode, params.v0, params.a, params.R, params.v]) // eslint-disable-line react-hooks/exhaustive-deps
  const circ = params.mode === 'circ'
  const vNow = Math.hypot(read.vx, read.vy)
  const m = read.marks.slice(0, 8)
  const gaps = m.slice(1).map((q, i) => Math.hypot(q.x - m[i].x, q.y - m[i].y) * 100)

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={[0.1, 0.25, 0.5, 1]}
      camera={{ position: [0, 4.2, 3.0], target: [0, 0.6, 0] }}
      scene={<AirTable sim={sim} />}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        <>
          <div className="state charge">Mouvement {MODES[params.mode].toLowerCase()}</div>
          <div>t = <b>{read.t.toFixed(2)} s</b> · v = <b>{vNow.toFixed(3)} m/s</b></div>
          {circ ? (
            <>
              <div>Vitesse angulaire ω = v/R = <b>{(params.v / params.R).toFixed(2)} rad/s</b> · T = <b>{((2 * Math.PI * params.R) / params.v).toFixed(2)} s</b></div>
              <div>Accélération normale a = v²/R = <b>{((params.v * params.v) / params.R).toFixed(2)} m/s²</b> (vers le centre)</div>
            </>
          ) : (
            <div>Accélération a = <b>{params.mode === 'mruv' ? params.a : 0} m/s²</b></div>
          )}
          <div className="legend-row"><span style={{ color: '#4cd17a' }}>➜ vitesse</span> <span style={{ color: '#e5484d' }}>➜ accélération</span></div>
        </>
      }
      controls={
        <>
          <div className="speed" role="group" aria-label="Mouvement">
            {Object.entries(MODES).map(([k, v]) => (
              <button key={k} className={params.mode === k ? 'on' : ''} onClick={() => set('mode')(k)}>{v}</button>
            ))}
          </div>
          {circ ? (
            <>
              <Slider label="Rayon R (longueur du fil)" value={params.R} min={0.15} max={0.5} step={0.01} unit="m" onChange={set('R')} format={(v) => v.toFixed(2)} />
              <Slider label="Vitesse v" value={params.v} min={0.2} max={1.2} step={0.05} unit="m/s" onChange={set('v')} format={(v) => v.toFixed(2)} />
            </>
          ) : (
            <>
              <Slider label="Vitesse initiale v₀" value={params.v0} min={params.mode === 'mru' ? 0.1 : 0} max={1} step={0.05} unit="m/s" onChange={set('v0')} format={(v) => v.toFixed(2)} />
              {params.mode === 'mruv' && <Slider label="Accélération a (inclinaison)" value={params.a} min={0.1} max={1.5} step={0.05} unit="m/s²" onChange={set('a')} format={(v) => v.toFixed(2)} />}
            </>
          )}
          <p className="formula">
            Enregistrement toutes les τ = 40 ms. Distances entre points successifs (cm) :
            <br />
            {gaps.map((g) => g.toFixed(2)).join(' · ') || '—'}
          </p>
        </>
      }
      charts={
        <>
          <LiveChart sim={sim} title={circ ? 'Abscisse curviligne s(t) : droite' : 'Position x(t)'} window={4} yUnit={circ ? 's (m)' : 'x (m)'} series={[{ label: circ ? 's(t)' : 'x(t)', color: '#3e9bff', get: (s) => s.s }]} />
          <LiveChart sim={sim} title="Vitesse v(t)" window={4} yUnit="v (m/s)" yMin={0} series={[{ label: 'v(t)', color: '#4cd17a', get: (s) => Math.hypot(s.vx, s.vy) }]} />
        </>
      }
      course={
        <>
          <h2>Le cours en bref</h2>
          <div className="course-grid">
            <section>
              <h3>Mouvement rectiligne uniforme</h3>
              <p>Trajectoire droite et vecteur vitesse constant : les points de l’enregistrement sont équidistants.</p>
              <p className="eq">x = v·t + x₀    a = 0</p>
            </section>
            <section>
              <h3>Rectiligne uniformément varié</h3>
              <p>L’accélération est constante. Les écarts entre points successifs augmentent de a·τ² à chaque intervalle.</p>
              <p className="eq">x = ½·a·t² + v₀·t + x₀    v = a·t + v₀    v² − v₀² = 2a(x − x₀)</p>
            </section>
            <section>
              <h3>Circulaire uniforme</h3>
              <p>La valeur de la vitesse est constante mais sa direction change : il y a une accélération, dirigée vers le centre.</p>
              <p className="eq">v = R·ω    a = v²/R = R·ω²    T = 2π/ω</p>
            </section>
            <section>
              <h3>À toi de tester</h3>
              <ul>
                <li>MRU : vérifie que les distances sont toutes égales.</li>
                <li>MRUV : calcule les différences entre écarts successifs.</li>
                <li>Circulaire : double v. Que devient l’accélération ?</li>
              </ul>
            </section>
          </div>
        </>
      }
    />
  )
}
