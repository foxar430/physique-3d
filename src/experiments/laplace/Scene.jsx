import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Table, steel, Vector } from '../../components/three/Lab.jsx'
import { Lead } from '../../components/three/Wire.jsx'
import { Bench } from '../../components/three/parts.jsx'
import { GAP, XMIN, XMAX, WHEEL_R, Bsigned } from './model.js'

const K = 20 // unités par mètre (1 unité = 5 cm)
const RY = 0.55 // hauteur des rails

/** Aimant en U : branches horizontales au-dessus et au-dessous de la zone utile. */
function UMagnet({ x0 = 0, width, depth, yMid, gap = 0.5, flip, back = -1 }) {
  const top = flip ? '#3f6fb8' : '#d23b3b'
  const bot = flip ? '#d23b3b' : '#3f6fb8'
  const t = 0.18
  return (
    <group position={[x0, 0, 0]}>
      <RoundedBox args={[width, t, depth]} radius={0.03} position={[0, yMid + gap / 2 + t / 2, 0]} castShadow>
        <meshStandardMaterial color={top} roughness={0.35} metalness={0.3} transparent opacity={0.35} depthWrite={false} />
      </RoundedBox>
      <RoundedBox args={[width, t, depth]} radius={0.03} position={[0, yMid - gap / 2 - t / 2, 0]} castShadow>
        <meshStandardMaterial color={bot} roughness={0.35} metalness={0.3} />
      </RoundedBox>
      <RoundedBox args={[width, gap + 2 * t, t]} radius={0.03} position={[0, yMid, back * (depth / 2 + t / 2)]} castShadow>
        <meshStandardMaterial color="#5b6470" roughness={0.4} metalness={0.5} />
      </RoundedBox>
      <Html position={[width / 2 + 0.15, yMid + gap / 2 + t / 2, 0]} center zIndexRange={[10, 0]}><span className="lbl">{flip ? 'S' : 'N'}</span></Html>
      <Html position={[width / 2 + 0.15, yMid - gap / 2 - t / 2, 0]} center zIndexRange={[10, 0]}><span className="lbl">{flip ? 'N' : 'S'}</span></Html>
    </group>
  )
}

function BArrows({ x0, z0, yMid, gap, up, nx = 3, nz = 3, dx = 0.5, dz = 0.5 }) {
  const out = []
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) out.push([x0 + (i - (nx - 1) / 2) * dx, z0 + (j - (nz - 1) / 2) * dz])
  return out.map(([x, z], k) => (
    <group key={k} position={[x, yMid, z]} rotation={[up ? 0 : Math.PI, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[0.008, 0.008, gap * 0.7, 6]} />
        <meshBasicMaterial color="#b07cff" transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, gap * 0.38, 0]}>
        <coneGeometry args={[0.03, 0.08, 8]} />
        <meshBasicMaterial color="#b07cff" transparent opacity={0.7} />
      </mesh>
    </group>
  ))
}

function Rails({ sim }) {
  const p = sim.paramsRef.current
  const hl = (p.l / 100) * K / 2 // demi-écartement
  const rod = useRef()
  const fV = useRef()
  const iV = useRef()
  const tmp = useMemo(() => ({ o: new THREE.Vector3(), v: new THREE.Vector3() }), [])
  const up = Bsigned(p) > 0
  useFrame(() => {
    const s = sim.stateRef.current
    const x = s.x * K
    rod.current.position.x = x
    rod.current.rotation.y = 0
    rod.current.children[0].rotation.y = -s.x / 0.006 // roulement
    const inside = s.x > GAP[0] && s.x < GAP[1]
    const F = s.F ?? 0
    fV.current.set(tmp.o.set(x, RY + 0.1, 0), tmp.v.set(Math.sign(F) * Math.min(1.2, 0.25 + Math.abs(F) * 25), 0, 0))
    fV.current.visible = inside && Math.abs(F) > 1e-6
    // sens du courant dans la tige
    iV.current.set(tmp.o.set(x + 0.18, RY + 0.08, -Math.sign(p.I) * hl * 0.6), tmp.v.set(0, 0, Math.sign(p.I) * hl * 1.2))
    iV.current.visible = p.I !== 0
  })
  return (
    <group>
      {/* socle isolant */}
      <RoundedBox args={[(XMAX - XMIN) * K + 1.2, 0.12, 2 * hl + 1]} radius={0.04} position={[0, RY - 0.2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#6b4f35" roughness={0.7} />
      </RoundedBox>
      {[0.5, -0.5].map((s) => (
        <mesh key={s} position={[s * ((XMAX - XMIN) * K + 0.6), (RY - 0.26) / 2, 0]}>
          <boxGeometry args={[0.2, RY - 0.26, 2 * hl + 0.6]} />
          <meshStandardMaterial color="#3a2c20" />
        </mesh>
      ))}
      {/* rails en cuivre */}
      {[-hl, hl].map((z) => (
        <mesh key={z} position={[0, RY - 0.08, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, (XMAX - XMIN) * K + 1, 16]} />
          <meshStandardMaterial color="#c8733a" metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
      {/* tige mobile */}
      <group ref={rod} position={[0, RY, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 2 * hl + 0.3, 20]} />
          <meshStandardMaterial color="#d8dce2" metalness={0.95} roughness={0.15} />
        </mesh>
      </group>
      <UMagnet width={(GAP[1] - GAP[0]) * K} depth={2 * hl + 0.9} yMid={RY} gap={0.55} flip={p.flip} />
      <BArrows x0={0} z0={0} yMid={RY} gap={0.55} up={up} nx={2} nz={3} dx={0.8} dz={hl * 0.7} />
      {/* générateur relié aux rails */}
      <group position={[-3.8, 0, 0]} rotation={[0, 0, 0]}>
        <Bench kind="battery" />
      </group>
      <Lead smooth metal={false} color="#c0392b" radius={0.025} points={[[-3.28, 0.22, -0.6], [-3.0, 0.3, -0.8], [-2.95, RY - 0.08, -hl], [(XMIN * K) - 0.4, RY - 0.08, -hl]]} />
      <Lead smooth metal={false} color="#22252a" radius={0.025} points={[[-3.28, 0.22, 0.6], [-3.0, 0.3, 0.8], [-2.95, RY - 0.08, hl], [(XMIN * K) - 0.4, RY - 0.08, hl]]} />
      <Vector ref={fV} color="#e5484d" radius={0.03} />
      <Vector ref={iV} color="#ffd23f" radius={0.015} />
      <Html position={[0, RY + 0.85, 0]} center zIndexRange={[10, 0]}>
        <div className="legend-row lbl tiny">
          <span style={{ color: '#e5484d' }}>F (Laplace)</span> · <span style={{ color: '#ffd23f' }}>I</span> · <span style={{ color: '#b07cff' }}>B</span>
        </div>
      </Html>
    </group>
  )
}

function Barlow({ sim }) {
  const p = sim.paramsRef.current
  const wheel = useRef()
  const fV = useRef()
  const R = WHEEL_R * K * 3 // roue dessinée plus grande
  const C = new THREE.Vector3(0, 1.5, 0)
  const tmp = useMemo(() => ({ o: new THREE.Vector3(), v: new THREE.Vector3() }), [])
  const spokes = 12
  useFrame(() => {
    const s = sim.stateRef.current
    wheel.current.rotation.z = -s.th
    const F = Math.sign(p.I * Bsigned(p))
    fV.current.set(tmp.o.set(C.x, C.y - R * 0.65, 0.12), tmp.v.set(-F * 0.6, 0, 0))
    fV.current.visible = p.I !== 0
  })
  return (
    <group>
      <RoundedBox args={[2.4, 0.12, 1.4]} radius={0.04} position={[0, 0.06, 0]}>
        <meshStandardMaterial color="#6b4f35" roughness={0.7} />
      </RoundedBox>
      {/* potence */}
      <mesh position={[-0.9, 1.05, -0.35]}>
        <boxGeometry args={[0.12, 1.9, 0.12]} />
        <meshStandardMaterial color="#2a2d33" />
      </mesh>
      <mesh position={[-0.45, 1.5, -0.35]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.9, 12]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <mesh position={[0, 1.5, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.4, 12]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      {/* roue étoilée */}
      <group ref={wheel} position={C}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[R * 0.45, R * 0.45, 0.03, 40]} />
          <meshStandardMaterial color="#c8733a" metalness={0.9} roughness={0.25} />
        </mesh>
        {Array.from({ length: spokes }, (_, k) => (
          <group key={k} rotation={[0, 0, (2 * Math.PI * k) / spokes]}>
            <mesh position={[0, R * 0.7, 0]}>
              <boxGeometry args={[0.06, R * 0.6, 0.025]} />
              <meshStandardMaterial color="#c8733a" metalness={0.9} roughness={0.25} />
            </mesh>
            <mesh position={[0, R, 0]}>
              <coneGeometry args={[0.04, 0.1, 4]} />
              <meshStandardMaterial color="#c8733a" metalness={0.9} roughness={0.25} />
            </mesh>
          </group>
        ))}
      </group>
      {/* cuve de mercure */}
      <mesh position={[0, C.y - R - 0.02, 0]}>
        <boxGeometry args={[0.5, 0.14, 0.3]} />
        <meshStandardMaterial color="#d6dbe2" metalness={1} roughness={0.08} />
      </mesh>
      <mesh position={[0, (C.y - R - 0.1) / 2 + 0.06, 0]}>
        <boxGeometry args={[0.6, C.y - R - 0.2, 0.36]} />
        <meshPhysicalMaterial color="#e8f4ff" transparent opacity={0.25} depthWrite={false} />
      </mesh>
      <Html position={[0.55, C.y - R - 0.1, 0.25]} center zIndexRange={[10, 0]}><span className="lbl tiny">mercure</span></Html>
      {/* aimant en U de part et d'autre de la partie basse de la roue */}
      <group rotation={[Math.PI / 2, 0, 0]} position={[0, C.y - R * 0.65, 0]}>
        <UMagnet width={0.6} depth={0.5} yMid={0} gap={0.3} flip={p.flip} back={1} />
      </group>
      <group position={[2.4, 0, 0.8]} rotation={[0, -Math.PI / 2, 0]}>
        <Bench kind="battery" />
      </group>
      <Lead smooth metal={false} color="#c0392b" radius={0.02} points={[[2.4, 0.22, 0.28], [1.6, 0.5, 0], [0.4, 1.4, -0.3], [0, 1.5, -0.33]]} />
      <Lead smooth metal={false} color="#22252a" radius={0.02} points={[[2.95, 0.22, 0.28], [1.4, 0.2, 0.3], [0.3, C.y - R - 0.02, 0.1]]} />
      <Vector ref={fV} color="#e5484d" radius={0.03} />
    </group>
  )
}

export default function LaplaceScene({ sim }) {
  const p = sim.paramsRef.current
  return (
    <group>
      <Table size={[10, 0.16, 4.4]} position={[0, -0.08, 0]} />
      {p.mode === 'barlow' ? <Barlow sim={sim} /> : <Rails sim={sim} />}
    </group>
  )
}
