import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Table, Vector, useCanvasTexture } from '../../components/three/Lab.jsx'
import { LEN, G } from './model.js'

const K = 3 // unités par mètre
const L = LEN * K
const MAXMARKS = 80

export default function InclineScene({ sim, view }) {
  const p = sim.paramsRef.current
  const a = (p.alpha * Math.PI) / 180
  const top = new THREE.Vector3(-L / 2 * Math.cos(a), 0.45 + L * Math.sin(a), 0)
  const dir = new THREE.Vector3(Math.cos(a), -Math.sin(a), 0) // vers le bas du plan
  const nrm = new THREE.Vector3(Math.sin(a), Math.cos(a), 0) // normale au plan
  const glider = useRef()
  const marks = useRef()
  const vP = useRef()
  const vR = useRef()
  const vF = useRef()
  const vV = useRef()
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), v: new THREE.Vector3(), o: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() }), [])
  const ruler = useCanvasTexture(2048, 64, (g, W, H) => {
    g.fillStyle = '#f3eee0'
    g.fillRect(0, 0, W, H)
    g.fillStyle = '#222'
    g.font = 'bold 22px system-ui'
    g.textAlign = 'center'
    for (let cm = 0; cm <= LEN * 100; cm++) {
      const x = 6 + (cm / (LEN * 100)) * (W - 12)
      const big = cm % 10 === 0
      g.fillRect(x - (big ? 1.5 : 0.6), 0, big ? 3 : 1.2, big ? 26 : cm % 5 === 0 ? 16 : 9)
      if (big) g.fillText(cm, x, 52)
    }
  })

  useFrame(() => {
    const s = sim.stateRef.current
    const pp = sim.paramsRef.current
    const pos = tmp.o.copy(top).addScaledVector(dir, s.x * K).addScaledVector(nrm, 0.14)
    glider.current.position.copy(pos)
    // chronophotographie
    for (let i = 0; i < MAXMARKS; i++) {
      const x = s.marks[i]
      if (x === undefined || !view.chrono) tmp.s.setScalar(0)
      else tmp.s.setScalar(1)
      tmp.v.copy(top).addScaledVector(dir, (x ?? 0) * K).addScaledVector(nrm, 0.31)
      tmp.m.compose(tmp.v, tmp.q.identity(), tmp.s)
      marks.current.setMatrixAt(i, tmp.m)
    }
    marks.current.instanceMatrix.needsUpdate = true
    // forces (échelle : le poids fait 0,8 unité)
    const m = pp.m / 1000
    const k = 0.8 / (m * G)
    const c = tmp.v.copy(pos)
    vP.current.set(c, new THREE.Vector3(0, -m * G * k, 0))
    vR.current.set(c, nrm.clone().multiplyScalar(m * G * Math.cos(a) * k))
    const fv = (pp.f / 1000) * k
    const sgn = Math.abs(s.v) > 1e-6 ? Math.sign(s.v) : 1
    vF.current.set(c.clone().addScaledVector(nrm, -0.08), dir.clone().multiplyScalar(-sgn * fv))
    vF.current.visible = view.forces && pp.f > 0
    vP.current.visible = view.forces
    vR.current.visible = view.forces
    vV.current.set(c.clone().addScaledVector(nrm, 0.22), dir.clone().multiplyScalar(s.v * 0.5))
    vV.current.visible = view.speed
  })

  const wedgeH = L * Math.sin(a)
  return (
    <group>
      <Table size={[9, 0.16, 3.4]} position={[0, -0.08, 0]} />
      {/* cale + pied */}
      <mesh position={[top.x + 0.1, (0.45 + wedgeH) / 2 - 0.05, 0]} castShadow>
        <boxGeometry args={[0.35, 0.45 + wedgeH - 0.1, 0.6]} />
        <meshStandardMaterial color="#8d6b4a" roughness={0.8} />
      </mesh>
      <mesh position={[-top.x - 0.1, 0.18, 0]} castShadow>
        <boxGeometry args={[0.3, 0.36, 0.6]} />
        <meshStandardMaterial color="#2a2d33" />
      </mesh>
      {/* plan (rail) */}
      <group position={top.clone().addScaledVector(dir, L / 2)} rotation={[0, 0, -a]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[L + 0.2, 0.14, 0.34]} />
          <meshStandardMaterial color="#9aa2ab" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.071, 0.24]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[L, 0.1]} />
          <meshStandardMaterial map={ruler} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.0, 0.22]}>
          <boxGeometry args={[L, 0.12, 0.1]} />
          <meshStandardMaterial color="#d9d2bd" />
        </mesh>
        {/* butée */}
        <mesh position={[L / 2 + 0.05, 0.14, 0]}>
          <boxGeometry args={[0.06, 0.16, 0.36]} />
          <meshStandardMaterial color="#e0a000" />
        </mesh>
      </group>
      {/* mobile */}
      <group ref={glider} rotation={[0, 0, -a]}>
        <RoundedBox args={[0.42, 0.14, 0.42]} radius={0.03} castShadow>
          <meshStandardMaterial color="#e5484d" roughness={0.4} metalness={0.2} />
        </RoundedBox>
        <mesh position={[0, 0.11, 0]}>
          <boxGeometry args={[0.16, 0.08, 0.16]} />
          <meshStandardMaterial color="#5b6470" metalness={0.6} roughness={0.35} />
        </mesh>
      </group>
      <instancedMesh ref={marks} args={[null, null, MAXMARKS]}>
        <sphereGeometry args={[0.025, 10, 8]} />
        <meshBasicMaterial color="#ffd23f" toneMapped={false} />
      </instancedMesh>
      <Vector ref={vP} color="#e0a000" />
      <Vector ref={vR} color="#3e9bff" />
      <Vector ref={vF} color="#e5484d" />
      <Vector ref={vV} color="#4cd17a" radius={0.018} />
      <Html position={[top.x - 0.4, top.y + 0.2, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">α = {p.alpha}°</span></Html>
    </group>
  )
}
