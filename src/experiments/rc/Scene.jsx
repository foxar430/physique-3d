import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { Wire, Polyline, Node, makePath } from '../../components/three/Wire.jsx'
import { derived } from './model.js'

const Y = 0.05
// nœuds du circuit (vue de dessus : x vers la droite, z vers l'observateur)
const BAT_P = [-2.6, Y, -0.8] // borne + du générateur
const BAT_N = [-2.6, Y, 0.8]
const TL = [-2.6, Y, -1.2]
const BL = [-2.6, Y, 1.2]
const T1 = [-1.5, Y, -1.2] // plot 1 de K
const P = [-0.7, Y, -1.2] // pivot de K
const T2 = [-0.7, Y, -0.4] // plot 2 de K
const RL = [0.0, Y, -1.2]
const RR = [1.2, Y, -1.2]
const TR = [2.6, Y, -1.2]
const CA = [2.6, Y, -0.12] // armature A (reliée à R)
const CB = [2.6, Y, 0.12] // armature B
const BR = [2.6, Y, 1.2]
const J = [-0.7, Y, 1.2]

// trajets des porteurs (sens réel du courant)
const CHARGE_PATH = [BAT_P, TL, T1, P, RL, RR, TR, CA, CB, BR, J, BL, BAT_N, BAT_P]
const DISCHARGE_PATH = [CA, TR, RR, RL, P, T2, J, BR, CB, CA]
const N_DOTS = 46

function Label({ at, children, className = 'lbl' }) {
  return (
    <Html position={at} center className={className} zIndexRange={[10, 0]}>
      {children}
    </Html>
  )
}

export default function RCScene({ sim, onToggle }) {
  const lever = useRef()
  const plateA = useRef()
  const plateB = useRef()
  const field = useRef()
  const resistor = useRef()
  const dots = useRef()
  const vmText = useRef()
  const paths = useMemo(() => ({ 1: makePath(CHARGE_PATH), 2: makePath(DISCHARGE_PATH) }), [])
  const phase = useRef(0)
  const lastT = useRef(0)
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), v: new THREE.Vector3(), s: new THREE.Vector3(), q: new THREE.Quaternion() }), [])

  useFrame((_, delta) => {
    const s = sim.stateRef.current
    const p = sim.paramsRef.current
    const d = derived(s, p)
    const imax = p.E / (p.R * 1e3)
    const ratio = Math.min(Math.abs(d.i) / imax, 1)
    const fill = Math.min(s.uC / Math.max(p.E, 1e-9), 1)

    // levier de K
    const targetAngle = s.k === 1 ? Math.PI : -Math.PI / 2
    lever.current.rotation.y = THREE.MathUtils.damp(lever.current.rotation.y, targetAngle, 12, delta)

    // armatures : +q en rouge, −q en bleu
    plateA.current.emissiveIntensity = 1.6 * fill
    plateB.current.emissiveIntensity = 1.6 * fill
    field.current.opacity = 0.35 * fill
    // effet Joule dans R
    resistor.current.emissiveIntensity = 2.2 * ratio * ratio

    // porteurs de charge
    const dtSim = Math.max(0, s.t - lastT.current)
    lastT.current = s.t
    const tauV = p.R * 1e3 * p.C * 1e-6
    // vitesse visuelle ∝ i, normalisée pour rester lisible quelle que soit τ
    phase.current += ratio * Math.min(dtSim / tauV, 0.2) * 6 + ratio * delta * 0.4
    const path = paths[s.k]
    const visible = ratio > 0.004
    for (let k = 0; k < N_DOTS; k++) {
      path.at((k / N_DOTS) * path.total + phase.current, tmp.v)
      // pas de porteur dans le diélectrique ni dans le générateur
      const hidden =
        !visible ||
        (Math.abs(tmp.v.x - 2.6) < 0.01 && Math.abs(tmp.v.z) < 0.12) ||
        (Math.abs(tmp.v.x + 2.6) < 0.01 && Math.abs(tmp.v.z) < 0.8)
      tmp.s.setScalar(hidden ? 0 : 1)
      tmp.v.y = Y + 0.02
      tmp.m.compose(tmp.v, tmp.q, tmp.s)
      dots.current.setMatrixAt(k, tmp.m)
    }
    dots.current.instanceMatrix.needsUpdate = true

    if (vmText.current) vmText.current.textContent = s.uC.toFixed(2) + ' V'
  })

  return (
    <group>
      {/* plaque d'essai */}
      <mesh position={[0.5, -0.06, 0]} receiveShadow>
        <boxGeometry args={[8.2, 0.12, 3.8]} />
        <meshStandardMaterial color="#2a3b33" roughness={0.9} />
      </mesh>

      {/* générateur de tension continue */}
      <group position={[-2.6, 0.3, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 1.5, 32]} />
          <meshStandardMaterial color="#2b2f36" metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.55]}>
          <cylinderGeometry args={[0.305, 0.305, 0.4, 32]} />
          <meshStandardMaterial color="#c98a2e" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.8]}>
          <cylinderGeometry args={[0.1, 0.1, 0.12, 16]} />
          <meshStandardMaterial color="#d0d4da" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
      <Label at={[-3.3, 0.35, -0.6]}>+</Label>
      <Label at={[-3.3, 0.35, 0.6]}>−</Label>
      <Label at={[-3.2, 0.9, 0]} className="lbl big">E</Label>

      {/* fils */}
      <Polyline points={[BAT_P, TL, T1]} />
      <Polyline points={[P, RL]} />
      <Polyline points={[RR, TR, CA]} />
      <Polyline points={[CB, BR, J, BL, BAT_N]} />
      <Polyline points={[T2, J]} />

      {/* interrupteur K */}
      <Node at={T1} />
      <Node at={T2} />
      <Node at={P} />
      <group ref={lever} position={[P[0], Y + 0.08, P[2]]} rotation={[0, Math.PI, 0]}>
        <mesh
          position={[0.4, 0, 0]}
          castShadow
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          onPointerOver={() => (document.body.style.cursor = 'pointer')}
          onPointerOut={() => (document.body.style.cursor = '')}
        >
          <boxGeometry args={[0.85, 0.07, 0.12]} />
          <meshStandardMaterial color="#e8e2d0" metalness={0.4} roughness={0.3} />
        </mesh>
        <mesh position={[0.4, 0.12, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.2, 12]} />
          <meshStandardMaterial color="#b3261e" />
        </mesh>
      </group>
      <Label at={[-1.15, 0.6, -1.65]} className="lbl big">K</Label>
      <Label at={[-1.55, 0.35, -0.9]}>1</Label>
      <Label at={[-0.35, 0.35, -0.4]}>2</Label>

      {/* résistor */}
      <group position={[(RL[0] + RR[0]) / 2, Y + 0.12, RL[2]]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.8, 24]} />
          <meshStandardMaterial ref={resistor} color="#d8c7a0" emissive="#ff5a1f" emissiveIntensity={0} roughness={0.6} />
        </mesh>
        {[-0.25, -0.12, 0.01, 0.25].map((x, i) => (
          <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.155, 0.155, 0.05, 24]} />
            <meshStandardMaterial color={['#8b4513', '#111', '#e0a000', '#c9a227'][i]} />
          </mesh>
        ))}
      </group>
      <Wire a={RL} b={[RL[0] + 0.2, Y + 0.12, RL[2]]} />
      <Wire a={RR} b={[RR[0] - 0.2, Y + 0.12, RR[2]]} />
      <Label at={[0.6, 0.7, -1.2]} className="lbl big">R</Label>

      {/* condensateur : deux armatures face à face */}
      <group position={[2.6, 0, 0]}>
        <mesh position={[0, 0.4, -0.12]} castShadow>
          <boxGeometry args={[0.9, 0.7, 0.05]} />
          <meshStandardMaterial ref={plateA} color="#9aa3ad" metalness={0.8} roughness={0.25} emissive="#ff3b30" emissiveIntensity={0} />
        </mesh>
        <mesh position={[0, 0.4, 0.12]} castShadow>
          <boxGeometry args={[0.9, 0.7, 0.05]} />
          <meshStandardMaterial ref={plateB} color="#9aa3ad" metalness={0.8} roughness={0.25} emissive="#2f7bff" emissiveIntensity={0} />
        </mesh>
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[0.86, 0.66, 0.19]} />
          <meshBasicMaterial ref={field} color="#ffd54a" transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      <Wire a={CA} b={[2.6, Y + 0.05, -0.12]} />
      <Label at={[3.25, 0.95, 0]} className="lbl big">C</Label>
      <Label at={[2.6, 0.95, -0.45]}>A</Label>
      <Label at={[2.6, 0.95, 0.45]}>B</Label>

      {/* voltmètre aux bornes de C */}
      <group position={[3.85, 0.25, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.7, 0.5, 0.9]} />
          <meshStandardMaterial color="#e6b400" roughness={0.6} />
        </mesh>
        <Html position={[0, 0.45, 0]} center className="vm" zIndexRange={[10, 0]}>
          <div className="vm-screen">
            <small>u<sub>C</sub></small>
            <b ref={vmText}>0.00 V</b>
          </div>
        </Html>
      </group>
      <Wire a={[3.5, Y, -0.25]} b={[2.6, Y, -0.7]} color="#d33" radius={0.018} />
      <Wire a={[3.5, Y, 0.25]} b={[2.6, Y, 0.7]} color="#222" radius={0.018} />

      {/* porteurs de charge animés */}
      <instancedMesh ref={dots} args={[null, null, N_DOTS]}>
        <sphereGeometry args={[0.055, 10, 8]} />
        <meshBasicMaterial color="#ffe066" />
      </instancedMesh>
    </group>
  )
}
