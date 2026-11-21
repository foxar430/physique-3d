import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Table, Path, steel, useCanvasTexture } from '../../components/three/Lab.jsx'
import { Lead } from '../../components/three/Wire.jsx'
import { geom, makeField, alpha } from './model.js'

const S = 0.11 // unités par cm
const TY = 0.02 // plan de la table
const XB = 28
const WB = 19
const toV = (x, w, y = TY + 0.01) => new THREE.Vector3(x * S, y, w * S)

function trace(field, g) {
  const lines = []
  const seeds = []
  seeds.push([g.half + 0.15, 0])
  const r0 = g.rad * 1.25
  for (const deg of [8, 18, 30, 44, 60, 80, 105, 135]) {
    const a = (deg * Math.PI) / 180
    seeds.push([g.half + r0 * Math.cos(a), r0 * Math.sin(a)])
  }
  const run = (x0, w0, dir) => {
    let x = x0
    let w = w0
    const pts = [toV(x, w)]
    for (let st = 0; st < 2400; st++) {
      const [bx, bw] = field(x, w)
      const m = Math.hypot(bx, bw)
      if (!m) break
      x += (dir * 0.1 * bx) / m
      w += (dir * 0.1 * bw) / m
      if (Math.abs(x) > XB || Math.abs(w) > WB) break
      pts.push(toV(x, w))
      if (Math.abs(x) < g.half && Math.abs(w) < g.rad) return { pts, closed: true }
    }
    return { pts, closed: false }
  }
  for (const [x0, w0] of seeds) {
    const out = run(x0, w0, 1)
    const add = (pts) => {
      if (pts.length < 3) return
      lines.push(pts)
      lines.push(pts.map((v) => new THREE.Vector3(v.x, v.y, -v.z)))
    }
    add(out.pts)
    // ligne sortie du cadre : on trace aussi sa partie qui revient au pôle Sud
    if (!out.closed) add(run(-x0, w0, -1).pts)
  }
  // lignes intérieures (du Sud vers le Nord)
  for (const w of [-0.6, 0, 0.6]) lines.push([toV(-g.half, w * g.rad, TY + 0.012), toV(g.half, w * g.rad, TY + 0.012)])
  return lines
}

function Needles({ field, g, show }) {
  const ref = useRef()
  const list = useMemo(() => {
    const out = []
    for (let x = -24; x <= 24; x += 3.5) for (let w = -15; w <= 15; w += 3.5) {
      if (Math.abs(x) < g.half + 1.2 && Math.abs(w) < g.rad + 1.2) continue
      out.push([x, w])
    }
    return out
  }, [g.half, g.rad])
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(1, 1, 1), e: new THREE.Euler() }), [])
  useFrame(() => {
    if (!ref.current) return
    list.forEach(([x, w], i) => {
      const [bx, bw] = field(x, w)
      const ang = Math.atan2(-bw, bx) // rotation autour de y
      tmp.e.set(0, ang, 0)
      tmp.q.setFromEuler(tmp.e)
      tmp.m.compose(toV(x, w, TY + 0.05), tmp.q, tmp.s)
      ref.current.setMatrixAt(i, tmp.m)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  const geo = useMemo(() => {
    // aiguille losange : moitié rouge (nord) vers +x
    const sh = new THREE.Shape()
    sh.moveTo(0.16, 0); sh.lineTo(0, 0.03); sh.lineTo(-0.16, 0); sh.lineTo(0, -0.03); sh.closePath()
    const gg = new THREE.ShapeGeometry(sh)
    gg.rotateX(-Math.PI / 2)
    const col = []
    const pos = gg.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const c = pos.getX(i) > 0.001 ? [0.9, 0.2, 0.2] : pos.getX(i) < -0.001 ? [0.85, 0.87, 0.9] : [0.5, 0.5, 0.5]
      col.push(...c)
    }
    gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    return gg
  }, [])
  if (!show) return null
  return (
    <group>
      <instancedMesh ref={ref} args={[geo, null, list.length]}>
        <meshBasicMaterial vertexColors side={THREE.DoubleSide} />
      </instancedMesh>
      {list.map(([x, w], i) => (
        <mesh key={i} position={toV(x, w, TY + 0.03)} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.17, 0.19, 24]} />
          <meshBasicMaterial color="#5b6470" />
        </mesh>
      ))}
    </group>
  )
}

function BarMagnet({ g }) {
  return (
    <group>
      <RoundedBox args={[g.half * S, 2 * g.rad * S, 2 * g.rad * S]} radius={0.02} position={[(g.half * S) / 2, TY + g.rad * S, 0]} castShadow>
        <meshStandardMaterial color="#d23b3b" roughness={0.35} metalness={0.3} />
      </RoundedBox>
      <RoundedBox args={[g.half * S, 2 * g.rad * S, 2 * g.rad * S]} radius={0.02} position={[(-g.half * S) / 2, TY + g.rad * S, 0]} castShadow>
        <meshStandardMaterial color="#3f6fb8" roughness={0.35} metalness={0.3} />
      </RoundedBox>
      <Html position={[g.half * S * 0.6, TY + 2 * g.rad * S + 0.12, 0]} center zIndexRange={[10, 0]}><span className="lbl">N</span></Html>
      <Html position={[-g.half * S * 0.6, TY + 2 * g.rad * S + 0.12, 0]} center zIndexRange={[10, 0]}><span className="lbl">S</span></Html>
    </group>
  )
}

function Solenoid({ g, p, compassRef }) {
  const turns = 26
  const helix = useMemo(() => {
    const L = 2 * g.half * S
    const R = g.rad * S
    class H extends THREE.Curve {
      getPoint(u, out = new THREE.Vector3()) {
        const a = u * turns * Math.PI * 2
        return out.set(-L / 2 + u * L, R * Math.cos(a), R * Math.sin(a))
      }
    }
    return new THREE.TubeGeometry(new H(), turns * 32, 0.018, 8, false)
  }, [g.half, g.rad])
  const R = g.rad * S
  const cy = TY + R + 0.06
  const cardTex = useCanvasTexture(256, 256, (c, W) => {
    c.fillStyle = '#f3eee0'
    c.beginPath(); c.arc(W / 2, W / 2, W / 2 - 4, 0, Math.PI * 2); c.fill()
    c.strokeStyle = '#333'
    for (let d = 0; d < 360; d += 10) {
      const a = (d * Math.PI) / 180
      const r1 = W / 2 - 6
      const r2 = r1 - (d % 30 === 0 ? 18 : 9)
      c.beginPath(); c.moveTo(W / 2 + r1 * Math.cos(a), W / 2 + r1 * Math.sin(a)); c.lineTo(W / 2 + r2 * Math.cos(a), W / 2 + r2 * Math.sin(a)); c.stroke()
    }
    c.fillStyle = '#c0392b'
    c.font = 'bold 30px system-ui'
    c.textAlign = 'center'
    c.fillText('N', W / 2, 44)
  })
  return (
    <group>
      <group position={[0, cy, 0]}>
        <mesh geometry={helix} castShadow>
          <meshStandardMaterial color="#c8733a" metalness={0.85} roughness={0.3} />
        </mesh>
        {/* gaine transparente */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[R - 0.02, R - 0.02, 2 * g.half * S, 32, 1, true]} />
          <meshPhysicalMaterial color="#e8f4ff" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * g.half * S, (cy - R) / 2 + 0.02, 0]}>
          <boxGeometry args={[0.06, cy - R, 0.4]} />
          <meshStandardMaterial color="#2a2d33" />
        </mesh>
      ))}
      {/* boussole au centre : mesure de B par tan α = B / B_H */}
      <group position={[0, TY + 0.06, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.26, 48]} />
          <meshStandardMaterial map={cardTex} />
        </mesh>
        <group ref={compassRef}>
          <mesh position={[0, 0.02, -0.11]} rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.035, 0.22, 4]} />
            <meshBasicMaterial color="#e5484d" />
          </mesh>
          <mesh position={[0, 0.02, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.035, 0.22, 4]} />
            <meshBasicMaterial color="#d8dce2" />
          </mesh>
        </group>
      </group>
      {/* générateur + ampèremètre */}
      <group position={[-2.9, 0, 1.3]} rotation={[0, 0.6, 0]}>
        <RoundedBox args={[0.8, 0.5, 0.6]} radius={0.05} position={[0, 0.25, 0]} castShadow>
          <meshStandardMaterial color="#d6dade" roughness={0.55} />
        </RoundedBox>
        <Html position={[0, 0.65, 0]} center zIndexRange={[10, 0]}>
          <div className="vm-screen"><small>I</small><b>{(p.I * 1000).toFixed(0)} mA</b></div>
        </Html>
      </group>
      <Lead smooth metal={false} color="#c0392b" radius={0.02} points={[[-2.6, 0.3, 1.0], [-2.3, 0.1, 0.6], [-g.half * S - 0.1, 0.1, 0.3], [-g.half * S, cy - R * 0.5, 0.05]]} />
      <Lead smooth metal={false} color="#22252a" radius={0.02} points={[[-2.5, 0.3, 1.2], [-1, 0.05, 1.3], [g.half * S + 0.2, 0.05, 0.6], [g.half * S, cy - R * 0.5, 0.05]]} />
      <Html position={[0, cy + R + 0.25, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">Solénoïde · N = {p.N} spires · L = {p.L} cm</span></Html>
      <Html position={[0.5, TY + 0.1, -0.5]} center zIndexRange={[10, 0]}><span className="lbl tiny">↑ Nord magnétique (B_H)</span></Html>
    </group>
  )
}

export default function MagnetScene({ sim }) {
  const p = sim.paramsRef.current
  const g = geom(p)
  const field = useMemo(() => makeField(p), [p.mode, p.L]) // eslint-disable-line react-hooks/exhaustive-deps
  const lines = useMemo(() => trace(field, g), [field]) // eslint-disable-line react-hooks/exhaustive-deps
  const compass = useRef()
  const sol = p.mode === 'solenoide'
  useFrame((_, delta) => {
    if (!compass.current) return
    // aiguille au repos vers le nord (−z) ; le champ du solénoïde la fait tourner vers +x (vers le pôle Sud... de l'aiguille : elle s'aligne sur B)
    const target = -alpha(sim.paramsRef.current)
    compass.current.rotation.y = THREE.MathUtils.damp(compass.current.rotation.y, target, 4, delta)
  })
  const show = !sol || p.I > 0
  return (
    <group>
      <Table size={[7, 0.16, 4.6]} position={[0, -0.08, 0]} color="#e9e4d8" />
      {/* feuille blanche + limaille (lignes de champ) */}
      {show && lines.map((l, i) => <Path key={i} points={l} color={sol ? '#2f5fa8' : '#30343a'} radius={0.011} opacity={0.9} />)}
      <Needles field={field} g={g} show={p.needles && show} />
      {sol ? <Solenoid g={g} p={p} compassRef={compass} /> : <BarMagnet g={g} />}
    </group>
  )
}
