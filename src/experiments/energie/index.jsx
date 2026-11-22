import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import LiveChart from '../../components/LiveChart.jsx'
import { useSimulation, useSampled } from '../../lib/useSimulation.js'
import { rk4Step } from '../../lib/rk4.js'
import { Table, steel } from '../../components/three/Lab.jsx'

export const meta = {
  id: 'energie',
  title: 'Énergie mécanique : cinétique, potentielle, thermique',
  level: '2e année',
  sections: 'Sciences',
  chapter: 'Énergie : énergie cinétique, potentielle de pesanteur, mécanique',
}

const G = 9.8
const DEFAULTS = { mode: 'pendule', m: 200, L: 1, th0: 40, k: 0, h: 1.5, e: 0.8 }

/**
 * Pendule simple : θ'' = −(g/L)·sinθ − k·θ'.  Ep = m·g·L(1 − cosθ), Ec = ½m(Lθ')².
 * Chute avec rebonds : coefficient de restitution e (vitesse après choc = e × vitesse avant).
 * L'énergie perdue est transformée en énergie thermique Q.
 */
const model = {
  maxDt: 1 / 1000,
  init: (p) => (p.mode === 'pendule' ? { t: 0, th: (p.th0 * Math.PI) / 180, w: 0, Q: 0 } : { t: 0, z: p.h, v: 0, Q: 0 }),
  step(s, dt, p) {
    const m = p.m / 1000
    if (p.mode === 'pendule') {
      const f = (_t, [th, w]) => [w, -(G / p.L) * Math.sin(th) - p.k * w]
      const [th, w] = rk4Step(f, s.t, [s.th, s.w], dt)
      const E0 = m * G * p.L * (1 - Math.cos((p.th0 * Math.PI) / 180))
      const E = m * G * p.L * (1 - Math.cos(th)) + 0.5 * m * (p.L * w) ** 2
      return { t: s.t + dt, th, w, Q: E0 - E }
    }
    let v = s.v - G * dt
    let z = s.z + v * dt
    let Q = s.Q
    if (z <= 0) {
      z = 0
      const before = 0.5 * m * v * v
      v = -v * p.e
      Q += before - 0.5 * m * v * v
      if (Math.abs(v) < 0.05) v = 0
    }
    return { t: s.t + dt, z, v, Q }
  },
}

function energies(s, p) {
  const m = p.m / 1000
  if (p.mode === 'pendule') {
    const Ep = m * G * p.L * (1 - Math.cos(s.th))
    const Ec = 0.5 * m * (p.L * s.w) ** 2
    return { Ec, Ep, Em: Ec + Ep, Q: Math.max(0, s.Q) }
  }
  const Ep = m * G * s.z
  const Ec = 0.5 * m * s.v * s.v
  return { Ec, Ep, Em: Ec + Ep, Q: s.Q }
}

const K = 1.2 // unités par mètre

function Bars({ sim, E0 }) {
  const refs = [useRef(), useRef(), useRef(), useRef()]
  const cols = ['#4cd17a', '#3e9bff', '#e0a000', '#e5484d']
  const labels = ['Ec', 'Ep', 'Em', 'Q']
  useFrame(() => {
    const e = energies(sim.stateRef.current, sim.paramsRef.current)
    ;[e.Ec, e.Ep, e.Em, e.Q].forEach((v, i) => {
      const h = Math.max(0.001, (v / (E0 || 1)) * 1.6)
      refs[i].current.scale.y = h
      refs[i].current.position.y = h / 2 + 0.02
    })
  })
  return (
    <group position={[1.9, 0, 0]}>
      {labels.map((l, i) => (
        <group key={l} position={[i * 0.32, 0, 0]}>
          <mesh ref={refs[i]}>
            <boxGeometry args={[0.22, 1, 0.22]} />
            <meshStandardMaterial color={cols[i]} emissive={cols[i]} emissiveIntensity={0.3} />
          </mesh>
          <Html position={[0, -0.12, 0.15]} center zIndexRange={[10, 0]}><span className="lbl tiny">{l}</span></Html>
        </group>
      ))}
      <mesh position={[0.48, 1.62, -0.12]}>
        <boxGeometry args={[1.3, 0.008, 0.008]} />
        <meshBasicMaterial color="#8a8f98" />
      </mesh>
      <Html position={[0.48, 1.8, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">énergie initiale</span></Html>
    </group>
  )
}

function Pendulum({ sim }) {
  const p = sim.paramsRef.current
  const arm = useRef()
  const PY = 2.2
  useFrame(() => {
    arm.current.rotation.z = sim.stateRef.current.th
  })
  return (
    <group>
      <RoundedBox args={[0.8, 0.08, 0.6]} radius={0.03} position={[-0.9, 0.04, 0]}>
        <meshStandardMaterial color="#2a2d33" />
      </RoundedBox>
      <mesh position={[-0.9, PY / 2, 0]}>
        <cylinderGeometry args={[0.035, 0.035, PY, 12]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <mesh position={[-0.45, PY, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.9, 12]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <group ref={arm} position={[0, PY, 0]}>
        <mesh position={[0, (-p.L * K) / 2, 0]}>
          <cylinderGeometry args={[0.005, 0.005, p.L * K, 6]} />
          <meshStandardMaterial color="#e9e4d8" />
        </mesh>
        <mesh position={[0, -p.L * K, 0]} castShadow>
          <sphereGeometry args={[0.06 + 0.06 * Math.cbrt(p.m / 500), 24, 16]} />
          <meshStandardMaterial color="#d4a54a" metalness={0.85} roughness={0.25} />
        </mesh>
      </group>
      {/* niveau de référence Ep = 0 */}
      <mesh position={[0, PY - p.L * K - 0.1, -0.2]}>
        <boxGeometry args={[1.6, 0.006, 0.006]} />
        <meshBasicMaterial color="#8a8f98" />
      </mesh>
      <Html position={[-0.75, PY - p.L * K - 0.1, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">Ep = 0</span></Html>
    </group>
  )
}

function Drop({ sim }) {
  const p = sim.paramsRef.current
  const ball = useRef()
  useFrame(() => {
    ball.current.position.y = sim.stateRef.current.z * K + 0.1
  })
  return (
    <group>
      <mesh position={[-0.5, (p.h * K) / 2 + 0.05, -0.25]}>
        <boxGeometry args={[0.08, p.h * K + 0.1, 0.02]} />
        <meshStandardMaterial color="#f3eee0" />
      </mesh>
      {Array.from({ length: Math.floor(p.h * 10) + 1 }, (_, k) => (
        <mesh key={k} position={[-0.47, 0.1 + k * 0.1 * K, -0.23]}>
          <boxGeometry args={[k % 5 === 0 ? 0.08 : 0.04, 0.006, 0.004]} />
          <meshBasicMaterial color="#222" />
        </mesh>
      ))}
      <mesh ref={ball} position={[0, p.h * K + 0.1, 0]} castShadow>
        <sphereGeometry args={[0.1, 32, 24]} />
        <meshStandardMaterial color="#e5484d" roughness={0.35} />
      </mesh>
    </group>
  )
}

export default function EnergyExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(model, params, { speed: 0.5 })
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const pend = params.mode === 'pendule'
  const m = params.m / 1000
  const E0 = pend ? m * G * params.L * (1 - Math.cos((params.th0 * Math.PI) / 180)) : m * G * params.h
  const read = useSampled(sim, (s) => energies(s, sim.paramsRef.current))
  useEffect(() => sim.reset(), [params.mode, params.m, params.L, params.th0, params.k, params.h, params.e]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={[0.25, 0.5, 1]}
      camera={{ position: [0.6, 1.6, 4.4], target: [0.6, 1.2, 0] }}
      scene={
        <group>
          <Table size={[6, 0.16, 3]} position={[0.5, -0.08, 0]} />
          {pend ? <Pendulum sim={sim} /> : <Drop sim={sim} />}
          <Bars sim={sim} E0={E0} />
        </group>
      }
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        <>
          <div className="state charge">{(pend ? params.k === 0 : params.e === 1) ? 'Sans frottement : l’énergie mécanique se conserve' : 'Avec frottement : Em diminue, de la chaleur apparaît'}</div>
          <div>E<sub>c</sub> = <b>{(read.Ec * 1000).toFixed(0)} mJ</b> · E<sub>p</sub> = <b>{(read.Ep * 1000).toFixed(0)} mJ</b></div>
          <div>E<sub>m</sub> = E<sub>c</sub> + E<sub>p</sub> = <b>{(read.Em * 1000).toFixed(0)} mJ</b> · Q = <b>{(read.Q * 1000).toFixed(0)} mJ</b></div>
          <div className="small">E<sub>m</sub> + Q = {((read.Em + read.Q) * 1000).toFixed(0)} mJ : l’énergie totale se conserve.</div>
        </>
      }
      controls={
        <>
          <div className="speed" role="group" aria-label="Expérience">
            <span>Expérience</span>
            <button className={pend ? 'on' : ''} onClick={() => set('mode')('pendule')}>Pendule simple</button>
            <button className={!pend ? 'on' : ''} onClick={() => set('mode')('chute')}>Chute et rebonds</button>
          </div>
          <Slider label="Masse m" value={params.m} min={50} max={1000} step={50} unit="g" onChange={set('m')} />
          {pend ? (
            <>
              <Slider label="Longueur du fil L" value={params.L} min={0.3} max={1.5} step={0.05} unit="m" onChange={set('L')} format={(v) => v.toFixed(2)} />
              <Slider label="Angle de lâcher θ₀" value={params.th0} min={5} max={80} step={1} unit="°" onChange={set('th0')} />
              <Slider label="Frottements" value={params.k} min={0} max={1} step={0.05} unit="s⁻¹" onChange={set('k')} format={(v) => v.toFixed(2)} />
            </>
          ) : (
            <>
              <Slider label="Hauteur de lâcher h" value={params.h} min={0.3} max={2} step={0.1} unit="m" onChange={set('h')} format={(v) => v.toFixed(1)} />
              <Slider label="Coefficient de rebond e" value={params.e} min={0} max={1} step={0.05} unit="" onChange={set('e')} format={(v) => v.toFixed(2)} />
            </>
          )}
        </>
      }
      charts={
        <>
          <LiveChart
            sim={sim}
            title="Énergies en fonction du temps"
            window={6}
            yMin={0}
            yMax={E0 * 1000 * 1.1 || 1}
            yUnit="E (mJ)"
            series={[
              { label: 'Ec', color: '#4cd17a', get: (s) => energies(s, sim.paramsRef.current).Ec * 1000 },
              { label: 'Ep', color: '#3e9bff', get: (s) => energies(s, sim.paramsRef.current).Ep * 1000 },
              { label: 'Em', color: '#e0a000', get: (s) => energies(s, sim.paramsRef.current).Em * 1000 },
            ]}
          />
          <LiveChart
            sim={sim}
            title="Énergie transformée en chaleur Q(t)"
            window={6}
            yMin={0}
            yMax={E0 * 1000 * 1.1 || 1}
            yUnit="Q (mJ)"
            series={[{ label: 'Q', color: '#e5484d', get: (s) => energies(s, sim.paramsRef.current).Q * 1000 }]}
          />
        </>
      }
      course={
        <>
          <h2>Le cours en bref</h2>
          <div className="course-grid">
            <section>
              <h3>Les formes d’énergie</h3>
              <p className="eq">E<sub>c</sub> = ½·m·v²    E<sub>p</sub> = m·g·z</p>
              <p>E<sub>p</sub> dépend du niveau de référence choisi (z = 0). L’énergie mécanique est E<sub>m</sub> = E<sub>c</sub> + E<sub>p</sub>.</p>
            </section>
            <section>
              <h3>Conservation</h3>
              <p>Sans frottement, E<sub>m</sub> reste constante : l’énergie passe de la forme potentielle à la forme cinétique et inversement.</p>
              <p>Avec frottement, E<sub>m</sub> diminue ; l’énergie perdue est transférée au milieu extérieur sous forme d’énergie thermique (chaleur).</p>
            </section>
            <section>
              <h3>Travail et puissance</h3>
              <p className="eq">W(P) = m·g·(z<sub>A</sub> − z<sub>B</sub>) = −ΔE<sub>p</sub>    P = W / Δt</p>
            </section>
            <section>
              <h3>À toi de tester</h3>
              <ul>
                <li>Où la vitesse du pendule est-elle maximale ?</li>
                <li>Calcule v au point bas à partir de θ₀ et vérifie.</li>
                <li>Avec e = 0,8, quelle fraction de l’énergie reste après chaque rebond ?</li>
              </ul>
            </section>
          </div>
        </>
      }
    />
  )
}
