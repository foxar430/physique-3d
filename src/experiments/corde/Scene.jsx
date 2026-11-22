import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Table, steel, useCanvasTexture } from '../../components/three/Lab.jsx'
import { Bench } from '../../components/three/parts.jsx'
import { Lead } from '../../components/three/Wire.jsx'
import { y as yAt, yS, shownTime } from '../ondes/model.js'

export const LEN = 1.2 // longueur utile de la corde (m)
const K = 4 // unités par mètre
const X0 = -2.6 // point S (lame du vibreur)
const Y = 1.05 // hauteur de la corde au repos
const NSEG = 240
const AMP = 0.03 // unités de scène par mm d'amplitude (déformation exagérée ×7,5)

/** Corde : segments instanciés, recalculés à chaque image. */
function Rope({ sim }) {
  const ref = useRef()
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), a: new THREE.Vector3(), b: new THREE.Vector3(), d: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) }), [])
  useFrame(() => {
    const p = sim.paramsRef.current
    const t = shownTime(sim.stateRef.current.t, p)
    const pt = (k, out) => {
      const x = (LEN * k) / NSEG
      return out.set(X0 + x * K, Y + yAt(x, t, p) * AMP, 0)
    }
    for (let k = 0; k < NSEG; k++) {
      pt(k, tmp.a)
      pt(k + 1, tmp.b)
      tmp.d.copy(tmp.b).sub(tmp.a)
      const len = tmp.d.length()
      tmp.q.setFromUnitVectors(tmp.up, tmp.d.normalize())
      tmp.s.set(1, len, 1)
      tmp.m.compose(tmp.a.add(tmp.b).multiplyScalar(0.5), tmp.q, tmp.s)
      ref.current.setMatrixAt(k, tmp.m)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[null, null, NSEG]} castShadow>
      <cylinderGeometry args={[0.018, 0.018, 1, 8]} />
      <meshStandardMaterial color="#f2e6c8" roughness={0.7} />
    </instancedMesh>
  )
}

function Ruler() {
  const tex = useCanvasTexture(2048, 64, (g, W) => {
    g.fillStyle = '#f3eee0'
    g.fillRect(0, 0, W, 64)
    g.fillStyle = '#222'
    g.font = 'bold 22px system-ui'
    g.textAlign = 'center'
    for (let cm = 0; cm <= LEN * 100; cm++) {
      const x = 8 + (cm / (LEN * 100)) * (W - 16)
      const big = cm % 10 === 0
      g.fillRect(x - (big ? 1.5 : 0.6), 0, big ? 3 : 1.2, big ? 26 : cm % 5 === 0 ? 16 : 9)
      if (big) g.fillText(cm, x, 54)
    }
  })
  return (
    <mesh position={[X0 + (LEN * K) / 2, 0.012, 0.45]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[LEN * K + 0.08, 0.16]} />
      <meshStandardMaterial map={tex} roughness={0.6} />
    </mesh>
  )
}

export default function StringScene({ sim }) {
  const p = sim.paramsRef.current
  const blade = useRef()
  const ribbon = useRef()
  const lamp = useRef()
  const gbf = useRef()
  const xEnd = X0 + LEN * K
  const massH = 0.1 + 0.25 * Math.cbrt(p.m / 500)

  useFrame(() => {
    const pp = sim.paramsRef.current
    const t = shownTime(sim.stateRef.current.t, pp)
    blade.current.position.y = Y + yS(t, pp) * AMP
    const xM = pp.d / 100
    ribbon.current.position.set(X0 + xM * K, Y + yAt(xM, t, pp) * AMP, 0)
    if (lamp.current) lamp.current.emissiveIntensity = pp.strobe ? 3 : 0.2
    if (gbf.current) gbf.current.textContent = pp.N + ' Hz'
  })

  return (
    <group>
      {/* la paillasse s'arrête à la poulie : la masse pend dans le vide */}
      <Table size={[xEnd + 0.2 + 4.8, 0.16, 3.2]} position={[(xEnd + 0.2 - 4.8) / 2, -0.08, 0]} />
      <Ruler />
      {/* vibreur : boîtier + lame */}
      <RoundedBox args={[0.55, 0.7, 0.55]} radius={0.06} position={[X0 - 0.35, 0.35, 0]} castShadow>
        <meshStandardMaterial color="#b8372f" roughness={0.45} metalness={0.2} />
      </RoundedBox>
      <mesh position={[X0 - 0.35, 0.72, 0]}>
        <boxGeometry args={[0.08, 0.06, 0.08]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <group ref={blade} position={[X0, Y, 0]}>
        <mesh position={[-0.17, 0, 0]}>
          <boxGeometry args={[0.36, 0.02, 0.14]} />
          <meshStandardMaterial color="#d8dce2" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
      <mesh position={[X0 - 0.35, (Y + 0.72) / 2, 0]}>
        <boxGeometry args={[0.03, Y - 0.72, 0.03]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <Html position={[X0 - 0.35, 0.95 + 0.5, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">Vibreur (S)</span></Html>
      {/* GBF qui alimente le vibreur */}
      <group position={[X0 - 1.3, 0, 0.6]} rotation={[0, 0.5, 0]}>
        <Bench kind="gbf" textRef={gbf} />
      </group>
      <Lead smooth metal={false} color="#22252a" radius={0.02} points={[[X0 - 0.83, 0.22, 0.4], [X0 - 0.6, 0.1, 0.3], [X0 - 0.35, 0.2, 0.28]]} />
      {/* corde */}
      <Rope sim={sim} />
      {/* ruban au point M */}
      <group ref={ribbon}>
        <mesh position={[0, 0.07, 0]}>
          <boxGeometry args={[0.03, 0.14, 0.05]} />
          <meshStandardMaterial color="#e5484d" />
        </mesh>
        <Html position={[0, 0.32, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">M</span></Html>
      </group>
      {/* coton anti-réflexion */}
      <mesh position={[xEnd - 0.25, Y, 0]}>
        <sphereGeometry args={[0.1, 16, 12]} />
        <meshStandardMaterial color="#f8f8f8" roughness={1} />
      </mesh>
      <Html position={[xEnd - 0.25, Y + 0.3, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">coton (pas de réflexion)</span></Html>
      {/* poulie au bord de la table + masse suspendue */}
      <mesh position={[xEnd + 0.1, Y / 2, -0.15]}>
        <boxGeometry args={[0.08, Y, 0.08]} />
        <meshStandardMaterial color="#2a2d33" />
      </mesh>
      <mesh position={[xEnd + 0.1, Y - 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.05, 32]} />
        <meshStandardMaterial color="#cfd3d8" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[xEnd + 0.2, Y - 0.1 - 0.25, 0]}>
        <cylinderGeometry args={[0.009, 0.009, 0.5, 6]} />
        <meshStandardMaterial color="#f2e6c8" />
      </mesh>
      <mesh position={[xEnd + 0.2, Y - 0.6 - massH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.11, massH, 24]} />
        <meshStandardMaterial color="#5b6470" metalness={0.75} roughness={0.3} />
      </mesh>
      <Html position={[xEnd + 0.65, Y - 0.6 - massH / 2, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">m = {p.m} g</span></Html>
      {/* lampe stroboscopique */}
      <group position={[0, 2.3, -0.9]}>
        <mesh position={[0, -1.15, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 2.3, 12]} />
          <meshStandardMaterial {...steel} />
        </mesh>
        <mesh rotation={[0.6, 0, 0]}>
          <cylinderGeometry args={[0.16, 0.22, 0.25, 24, 1, true]} />
          <meshStandardMaterial color="#2a2d33" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.08, 0.07]} rotation={[0.6 - Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.2, 24]} />
          <meshStandardMaterial ref={lamp} color="#ffffff" emissive="#cfe6ff" emissiveIntensity={0.2} toneMapped={false} />
        </mesh>
        <Html position={[0.5, 0.2, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">Stroboscope</span></Html>
      </group>
    </group>
  )
}
