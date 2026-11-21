import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Table, steel, Path } from '../../components/three/Lab.jsx'
import { PARTICLES, yAt, hitsPlate, hitX, screenY } from './model.js'

const K = 0.2 // unités de scène par cm
const XP = -2 // entrée des plaques
const Y0 = 1.3 // axe du tube
const N = 46

export default function DeflectionScene({ sim }) {
  const p = sim.paramsRef.current
  const color = PARTICLES[p.particle].color
  const xScreen = XP + (p.L / 2 + p.D) * K
  const hit = hitsPlate(p)
  const xEnd = hit ? hitX(p) : p.L / 2 + p.D
  const Rs = 1.5 // rayon de l'écran (unités) = 7,5 cm
  const Ys = screenY(p)
  const onScreen = !hit && Math.abs(Ys * K) < Rs * 0.95

  const pts = useMemo(() => {
    const out = []
    for (let k = 0; k <= 160; k++) {
      const x = (xEnd * k) / 160
      out.push(new THREE.Vector3(XP + x * K, Y0 + yAt(x, p) * K, 0))
    }
    // canon → plaques (droit)
    return [new THREE.Vector3(XP - 1.4, Y0, 0), ...out]
  }, [p.particle, p.U0, p.U, p.d, p.L, p.D, xEnd]) // eslint-disable-line react-hooks/exhaustive-deps
  const cum = useMemo(() => {
    const c = [0]
    for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + pts[i].distanceTo(pts[i - 1]))
    return c
  }, [pts])

  const glass = useMemo(() => {
    const prof = [
      new THREE.Vector2(0.001, -4.6), new THREE.Vector2(0.42, -4.55), new THREE.Vector2(0.45, -4.4),
      new THREE.Vector2(0.45, XP + p.L * K + 0.2), new THREE.Vector2(Rs + 0.05, xScreen - 0.15), new THREE.Vector2(Rs + 0.05, xScreen),
    ]
    const g = new THREE.LatheGeometry(prof, 64)
    g.rotateZ(-Math.PI / 2)
    g.translate(0, Y0, 0)
    return g
  }, [p.L, xScreen])

  const dots = useRef()
  const spot = useRef()
  const phase = useRef(0)
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), v: new THREE.Vector3() }), [])
  useFrame((_, delta) => {
    if (sim.running) phase.current = (phase.current + delta * 0.35) % 1
    const total = cum[cum.length - 1]
    for (let i = 0; i < N; i++) {
      const s = ((i / N + phase.current) % 1) * total
      let k = 1
      while (k < cum.length - 1 && cum[k] < s) k++
      const f = (s - cum[k - 1]) / (cum[k] - cum[k - 1] || 1)
      tmp.v.copy(pts[k - 1]).lerp(pts[k], f)
      tmp.m.makeTranslation(tmp.v.x, tmp.v.y, tmp.v.z)
      dots.current.setMatrixAt(i, tmp.m)
    }
    dots.current.instanceMatrix.needsUpdate = true
    if (spot.current) spot.current.material.opacity = 0.75 + 0.25 * Math.sin(performance.now() / 90)
  })

  const plateW = p.L * K
  const gap = (p.d * K) / 2
  const top = p.U >= 0 ? '+' : '−'
  const bot = p.U >= 0 ? '−' : '+'
  const arrows = [0.15, 0.35, 0.55, 0.75, 0.9].map((f) => XP + f * plateW)
  return (
    <group>
      <Table size={[12, 0.16, 4]} position={[0.5, -0.08, 0]} />
      {/* supports */}
      {[-3.6, xScreen - 0.3].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, (Y0 - 0.45) / 2, 0]}>
            <cylinderGeometry args={[0.05, 0.05, Y0 - 0.45, 12]} />
            <meshStandardMaterial {...steel} />
          </mesh>
          <RoundedBox args={[0.5, 0.06, 0.5]} radius={0.02} position={[0, 0.03, 0]}>
            <meshStandardMaterial color="#2a2d33" />
          </RoundedBox>
        </group>
      ))}
      {/* ampoule en verre */}
      <mesh geometry={glass}>
        <meshPhysicalMaterial color="#e8f4ff" transparent opacity={0.16} roughness={0.02} clearcoat={1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* canon à électrons : filament, cathode, anode */}
      <mesh position={[-4.25, Y0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.12, 0.2, 24]} />
        <meshStandardMaterial color="#ff8c42" emissive="#ff5a1f" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      {[-3.9, -3.55].map((x) => (
        <mesh key={x} position={[x, Y0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 0.22, 28, 1, true]} />
          <meshStandardMaterial {...steel} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <Html position={[-3.9, Y0 + 0.6, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">Canon (U₀ = {p.U0} V)</span></Html>
      {/* plaques de déviation */}
      {[[gap, top], [-gap, bot]].map(([y, sgn]) => (
        <group key={y}>
          <mesh position={[XP + plateW / 2, Y0 + y + Math.sign(y) * 0.012, 0]}>
            <boxGeometry args={[plateW, 0.024, 0.6]} />
            <meshStandardMaterial color={sgn === '+' ? '#c0504d' : '#4a6fa5'} metalness={0.7} roughness={0.3} />
          </mesh>
          <Html position={[XP - 0.15, Y0 + y, 0.3]} center zIndexRange={[10, 0]}><span className="lbl">{sgn}</span></Html>
        </group>
      ))}
      {p.U !== 0 &&
        arrows.map((x) => (
          <group key={x} position={[x, Y0, -0.2]} rotation={[0, 0, p.U > 0 ? Math.PI : 0]}>
            <mesh>
              <cylinderGeometry args={[0.008, 0.008, gap * 1.4, 6]} />
              <meshBasicMaterial color="#ffd23f" />
            </mesh>
            <mesh position={[0, gap * 0.75, 0]}>
              <coneGeometry args={[0.03, 0.08, 8]} />
              <meshBasicMaterial color="#ffd23f" />
            </mesh>
          </group>
        ))}
      <Html position={[XP + plateW / 2, Y0 + gap + 0.35, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">E = U/d</span></Html>
      {/* écran fluorescent */}
      <mesh position={[xScreen, Y0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <circleGeometry args={[Rs, 64]} />
        <meshStandardMaterial color="#1c2a22" emissive="#0b2a16" emissiveIntensity={0.6} side={THREE.DoubleSide} />
      </mesh>
      {[-1, -0.5, 0, 0.5, 1].map((c) => (
        <mesh key={c} position={[xScreen - 0.01, Y0 + c * Rs * 0.9, 0]}>
          <boxGeometry args={[0.005, 0.006, 0.4]} />
          <meshBasicMaterial color="#3e6b4c" />
        </mesh>
      ))}
      {onScreen && (
        <mesh ref={spot} position={[xScreen - 0.02, Y0 + Ys * K, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <circleGeometry args={[0.07, 24]} />
          <meshBasicMaterial color="#7dff9a" transparent toneMapped={false} />
        </mesh>
      )}
      <Html position={[xScreen, Y0 + Rs + 0.3, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">Écran fluorescent</span></Html>
      {/* faisceau */}
      <Path points={pts} color={color} radius={0.006} opacity={0.45} />
      <instancedMesh ref={dots} args={[null, null, N]}>
        <sphereGeometry args={[0.028, 10, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
