import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Table, steel } from '../../components/three/Lab.jsx'
import { R_DRUM, H } from './model.js'

const K = 2 // unités par mètre
const AY = 2.6 // hauteur de la tige tournante
const DY = 2.2 // hauteur du tambour
const PX = 1.9 // poulie
const PR = 0.12

export default function RotationScene({ sim }) {
  const p = sim.paramsRef.current
  const rotor = useRef()
  const mass = useRef()
  const vert = useRef()
  const pulley = useRef()
  const d = (p.d / 100) * K
  const rD = R_DRUM * K * 2.5 // tambour dessiné un peu plus gros
  const massSize = 0.08 + 0.12 * Math.cbrt(p.m / 200)
  const yTop = DY - PR - 0.05

  useFrame(() => {
    const s = sim.stateRef.current
    rotor.current.rotation.y = -s.th
    pulley.current.rotation.z = -(s.fall * K) / PR
    const y = yTop - 0.25 - s.fall * K
    mass.current.position.y = y
    vert.current.scale.y = Math.max(yTop - y, 0.01)
    vert.current.position.y = (yTop + y) / 2
  })

  return (
    <group>
      <Table size={[7, 0.16, 3.4]} position={[0.6, -0.08, 0]} />
      {/* socle + axe vertical */}
      <RoundedBox args={[0.9, 0.12, 0.9]} radius={0.04} position={[0, 0.06, 0]} castShadow>
        <meshStandardMaterial color="#2a2d33" roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, AY / 2, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, AY, 16]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <group ref={rotor}>
        {/* tambour */}
        <mesh position={[0, DY, 0]} castShadow>
          <cylinderGeometry args={[rD, rD, 0.12, 32]} />
          <meshStandardMaterial color="#b8372f" roughness={0.45} metalness={0.2} />
        </mesh>
        <mesh position={[0, DY, 0]}>
          <torusGeometry args={[rD + 0.005, 0.008, 6, 40]} />
          <meshStandardMaterial color="#f5efe0" />
        </mesh>
        {/* tige + masselottes */}
        <mesh position={[0, AY, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 1.3, 16]} />
          <meshStandardMaterial {...steel} />
        </mesh>
        <mesh position={[0, AY, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.1, 24]} />
          <meshStandardMaterial color="#3a3f47" metalness={0.6} roughness={0.35} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * d, AY, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.09, 0.09, 0.12, 28]} />
            <meshStandardMaterial color="#d4a54a" metalness={0.85} roughness={0.3} />
          </mesh>
        ))}
        {/* repère pour voir la rotation */}
        <mesh position={[0.65, AY, 0]}>
          <sphereGeometry args={[0.03, 12, 8]} />
          <meshBasicMaterial color="#e5484d" />
        </mesh>
      </group>
      {/* fil horizontal tambour → poulie */}
      <mesh position={[PX / 2, DY, rD]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.006, 0.006, PX, 6]} />
        <meshStandardMaterial color="#f5efe0" />
      </mesh>
      {/* poulie sur potence */}
      <mesh position={[PX + 0.25, DY / 2, rD]}>
        <boxGeometry args={[0.08, DY, 0.08]} />
        <meshStandardMaterial color="#2a2d33" />
      </mesh>
      <group position={[PX, DY - PR, rD]}>
        <mesh ref={pulley}>
          <cylinderGeometry args={[PR, PR, 0.05, 32]} />
          <meshStandardMaterial color="#cfd3d8" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
      <mesh position={[PX + 0.125, DY - PR, rD]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.25, 8]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      {/* fil vertical + masse */}
      <mesh ref={vert} position={[PX + PR, yTop, rD]}>
        <cylinderGeometry args={[0.006, 0.006, 1, 6]} />
        <meshStandardMaterial color="#f5efe0" />
      </mesh>
      <group ref={mass} position={[PX + PR, yTop - 0.25, rD]}>
        <mesh position={[0, -massSize / 2, 0]} castShadow>
          <cylinderGeometry args={[massSize * 0.7, massSize * 0.7, massSize, 24]} />
          <meshStandardMaterial color="#5b6470" metalness={0.7} roughness={0.35} />
        </mesh>
        <Html position={[0.35, -massSize / 2, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">m = {p.m} g</span></Html>
      </group>
      <Html position={[0, AY + 0.35, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">masselottes à d = {p.d} cm</span></Html>
      <Html position={[PX + 0.6, yTop - 0.25 - H * K, rD]} center zIndexRange={[10, 0]}><span className="lbl tiny">sol (h = {H} m)</span></Html>
      <mesh position={[PX + PR, yTop - 0.25 - H * K - massSize - 0.01, rD]}>
        <boxGeometry args={[0.6, 0.02, 0.6]} />
        <meshStandardMaterial color="#3a2c20" />
      </mesh>
    </group>
  )
}
