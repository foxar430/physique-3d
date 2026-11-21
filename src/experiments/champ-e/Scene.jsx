import { useMemo, useRef, useEffect } from 'react'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Table, steel, Path, Vector } from '../../components/three/Lab.jsx'
import { charges, field, pendulum, LF } from './model.js'

const S = 0.25 // unités par cm
const CY = 1.9 // centre du tableau
const XB = 12
const YB = 8

const toV = (x, y, z = 0.02) => new THREE.Vector3(x * S, CY + y * S, z)

/** tracé des lignes de champ (en cm) */
function traceLines(list) {
  const lines = []
  const pos = list.filter((c) => c.q > 0)
  const seeds = pos.length ? pos : list
  const dir = pos.length ? 1 : -1
  const qmax = Math.max(...list.map((c) => Math.abs(c.q)))
  const many = list.length > 4
  for (const c of seeds) {
    const n = many ? 2 : Math.max(8, Math.round((16 * Math.abs(c.q)) / qmax))
    for (let k = 0; k < n; k++) {
      const a = many ? (k === 0 ? -Math.PI / 2 : Math.PI / 2) * dir : (2 * Math.PI * (k + 0.5)) / n
      if (many && ((c.q > 0 && k === 0) || (c.q < 0 && k === 0)) && false) continue
      let x = c.x + 0.4 * Math.cos(a)
      let y = c.y + 0.4 * Math.sin(a)
      const pts = [toV(x, y)]
      for (let s = 0; s < 900; s++) {
        const [ex, ey] = field(x, y, list)
        const m = Math.hypot(ex, ey)
        if (m === 0) break
        x += (dir * 0.12 * ex) / m
        y += (dir * 0.12 * ey) / m
        if (Math.abs(x) > XB || Math.abs(y) > YB) break
        let end = false
        for (const o of list) if (o !== c && Math.hypot(x - o.x, y - o.y) < 0.35) end = true
        pts.push(toV(x, y))
        if (end) break
      }
      if (pts.length > 2) lines.push({ pts, sign: dir })
    }
  }
  return lines
}

function LineArrows({ lines }) {
  // une petite flèche au milieu de chaque ligne, dans le sens de E
  return lines.map((l, i) => {
    const k = Math.floor(l.pts.length * 0.45)
    if (k < 1 || k + 1 >= l.pts.length) return null
    const a = l.pts[k]
    const b = l.pts[k + 1]
    const d = b.clone().sub(a).multiplyScalar(l.sign).normalize()
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)
    return (
      <mesh key={i} position={a} quaternion={q}>
        <coneGeometry args={[0.04, 0.11, 10]} />
        <meshBasicMaterial color="#ffd23f" toneMapped={false} />
      </mesh>
    )
  })
}

function ChargesBoard({ p }) {
  const list = useMemo(() => charges(p), [p.config, p.q1, p.q2, p.dist]) // eslint-disable-line react-hooks/exhaustive-deps
  const lines = useMemo(() => traceLines(list), [list])
  const probe = useRef()
  const [ex, ey] = field(p.mx, p.my, list)
  const E = Math.hypot(ex, ey)
  useEffect(() => {
    if (!probe.current) return
    const len = E > 0 ? Math.min(1.6, 0.25 + 0.25 * Math.log10(1 + E / 1000)) : 0
    probe.current.set(toV(p.mx, p.my, 0.06), new THREE.Vector3(ex, ey, 0).normalize().multiplyScalar(len))
  })
  const plate = p.config === 'condensateur'
  return (
    <group>
      {/* tableau noir */}
      <RoundedBox args={[XB * 2 * S + 0.3, YB * 2 * S + 0.3, 0.08]} radius={0.04} position={[0, CY, -0.06]}>
        <meshStandardMaterial color="#14181f" roughness={0.9} />
      </RoundedBox>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (XB * S + 0.05), CY / 2 - 0.05, -0.1]}>
          <cylinderGeometry args={[0.04, 0.04, CY - 0.1, 12]} />
          <meshStandardMaterial {...steel} />
        </mesh>
      ))}
      {lines.map((l, i) => <Path key={i} points={l.pts} color="#ffd23f" radius={0.007} opacity={0.85} />)}
      <LineArrows lines={lines} />
      {plate
        ? [1, -1].map((s) => (
            <group key={s}>
              <mesh position={[0, CY + (s * p.dist * S) / 2 + s * 0.03, 0.03]}>
                <boxGeometry args={[20 * S, 0.06, 0.2]} />
                <meshStandardMaterial color={s > 0 ? '#c0504d' : '#4a6fa5'} metalness={0.7} roughness={0.3} />
              </mesh>
              <Html position={[-10.8 * S, CY + (s * p.dist * S) / 2, 0.1]} center zIndexRange={[10, 0]}>
                <span className="lbl">{s > 0 ? '+' : '−'}</span>
              </Html>
            </group>
          ))
        : list.map((c, i) => (
            <group key={i} position={toV(c.x, c.y, 0.04)}>
              <mesh>
                <sphereGeometry args={[0.11 + 0.05 * Math.min(1, Math.abs(c.q) / 40), 24, 16]} />
                <meshStandardMaterial color={c.q > 0 ? '#e5484d' : '#3e7bff'} emissive={c.q > 0 ? '#a01010' : '#1030a0'} emissiveIntensity={1.2} toneMapped={false} />
              </mesh>
              <Html position={[0, 0.3, 0.05]} center zIndexRange={[10, 0]}>
                <span className="lbl tiny">q{list.length > 1 ? i + 1 : ''} = {c.q > 0 ? '+' : ''}{c.q} nC</span>
              </Html>
            </group>
          ))}
      {/* point M et vecteur champ */}
      <mesh position={toV(p.mx, p.my, 0.06)}>
        <sphereGeometry args={[0.05, 14, 10]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <Vector ref={probe} color="#4cd17a" radius={0.02} />
      <Html position={toV(p.mx - 0.6, p.my + 0.6, 0.06)} center zIndexRange={[10, 0]}>
        <span className="lbl tiny">M · E = {E.toExponential(2)} V/m</span>
      </Html>
    </group>
  )
}

/* ---------------- pendule électrostatique ---------------- */
const P = 0.125 // unités par cm
const OY = 3.2 // point d'attache

function Pendulum({ p }) {
  const eq = pendulum(p)
  const ball = new THREE.Vector3(eq.bx * P, OY + eq.by * P, 0)
  const O = new THREE.Vector3(0, OY, 0)
  const sphere = new THREE.Vector3(p.a * P, OY - LF * P, 0)
  const vP = useRef()
  const vF = useRef()
  const vT = useRef()
  useEffect(() => {
    const k = 0.9 / eq.P // échelle : le poids fait 0,9 unité
    vP.current.set(ball, new THREE.Vector3(0, -eq.P * k, 0))
    const d = ball.clone().sub(sphere).normalize()
    vF.current.set(ball, d.multiplyScalar(eq.F * k))
    // tension : équilibre T = −(P + F)
    const Fv = ball.clone().sub(sphere).normalize().multiplyScalar(eq.F)
    const T = new THREE.Vector3(-Fv.x, eq.P - Fv.y, 0)
    vT.current.set(ball, T.multiplyScalar(k))
    vT.current.visible = !eq.touch
  })
  const thread = useMemo(() => {
    const d = ball.clone().sub(O)
    return { pos: O.clone().add(ball).multiplyScalar(0.5), q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), len: d.length() }
  }, [ball.x, ball.y]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group>
      {/* potence */}
      <RoundedBox args={[0.8, 0.08, 0.6]} radius={0.03} position={[-1.4, 0.04, 0]}>
        <meshStandardMaterial color="#2a2d33" />
      </RoundedBox>
      <mesh position={[-1.4, OY / 2 + 0.1, 0]}>
        <cylinderGeometry args={[0.04, 0.04, OY + 0.2, 12]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <mesh position={[-0.7, OY + 0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 1.45, 12]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <mesh position={[0, OY + 0.07, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.16, 8]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      {/* fil de soie */}
      <mesh position={thread.pos} quaternion={thread.q}>
        <cylinderGeometry args={[0.006, 0.006, thread.len, 6]} />
        <meshStandardMaterial color="#f5efe0" />
      </mesh>
      {/* boule de sureau */}
      <mesh position={ball} castShadow>
        <sphereGeometry args={[0.1, 24, 16]} />
        <meshStandardMaterial color="#f3f0e6" roughness={0.8} />
      </mesh>
      <Html position={[ball.x - 0.3, ball.y + 0.15, 0]} center zIndexRange={[10, 0]}>
        <span className="lbl tiny">q = {p.q} nC</span>
      </Html>
      {/* sphère chargée sur pied isolant */}
      <mesh position={sphere} castShadow>
        <sphereGeometry args={[0.2, 32, 24]} />
        <meshStandardMaterial color="#d8dce2" metalness={0.95} roughness={0.15} />
      </mesh>
      <mesh position={[sphere.x, (sphere.y - 0.2) / 2, 0]}>
        <cylinderGeometry args={[0.04, 0.04, sphere.y - 0.2, 12]} />
        <meshPhysicalMaterial color="#cfe8ff" transparent opacity={0.5} roughness={0.05} />
      </mesh>
      <mesh position={[sphere.x, 0.04, 0]}>
        <cylinderGeometry args={[0.25, 0.28, 0.08, 24]} />
        <meshStandardMaterial color="#2a2d33" />
      </mesh>
      <Html position={[sphere.x + 0.45, sphere.y + 0.25, 0]} center zIndexRange={[10, 0]}>
        <span className="lbl tiny">Q = {p.Q} nC</span>
      </Html>
      {/* verticale de référence */}
      <mesh position={[0, OY - (LF * P) / 2, -0.02]}>
        <boxGeometry args={[0.006, LF * P, 0.006]} />
        <meshBasicMaterial color="#8a8f98" />
      </mesh>
      <Vector ref={vP} color="#e0a000" />
      <Vector ref={vF} color="#e5484d" />
      <Vector ref={vT} color="#3e9bff" />
      <Html position={[1.9, OY + 0.2, 0]} center zIndexRange={[10, 0]}>
        <div className="legend-row lbl tiny">
          <span style={{ color: '#e0a000' }}>P</span> · <span style={{ color: '#e5484d' }}>F (Coulomb)</span> · <span style={{ color: '#3e9bff' }}>T (fil)</span>
        </div>
      </Html>
    </group>
  )
}

export default function ElectricScene({ sim }) {
  const p = sim.paramsRef.current
  return (
    <group>
      <Table size={[9, 0.16, 4]} position={[0, -0.08, 0]} />
      {p.mode === 'pendule' ? <Pendulum p={p} /> : <ChargesBoard p={p} />}
    </group>
  )
}
