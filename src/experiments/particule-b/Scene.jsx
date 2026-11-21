import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Table, steel, Path, useCanvasTexture } from '../../components/three/Lab.jsx'
import { electron, spectro, cyclotron, DEE_R } from './model.js'

/** fait défiler des points lumineux le long d'une polyligne */
function Runners({ pts, color, n = 30, speed = 0.25, size = 0.03, sim }) {
  const ref = useRef()
  const phase = useRef(0)
  const cum = useMemo(() => {
    const c = [0]
    for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + pts[i].distanceTo(pts[i - 1]))
    return c
  }, [pts])
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), v: new THREE.Vector3() }), [])
  useFrame((_, delta) => {
    if (pts.length < 2) return
    if (sim.running) phase.current = (phase.current + delta * speed) % 1
    const total = cum[cum.length - 1]
    let k = 1
    for (let i = 0; i < n; i++) {
      const s = ((i / n + phase.current) % 1) * total
      k = 1
      let lo = 1, hi = cum.length - 1
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (cum[mid] < s) lo = mid + 1
        else hi = mid
      }
      k = lo
      const f = (s - cum[k - 1]) / (cum[k] - cum[k - 1] || 1)
      tmp.v.copy(pts[k - 1]).lerp(pts[k], f)
      tmp.m.makeTranslation(tmp.v.x, tmp.v.y, tmp.v.z)
      ref.current.setMatrixAt(i, tmp.m)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[null, null, n]}>
      <sphereGeometry args={[size, 10, 8]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </instancedMesh>
  )
}

/* ---------------- tube à faisceau filiforme dans les bobines de Helmholtz ---------------- */
const BC = new THREE.Vector3(0, 1.7, 0) // centre de l'ampoule
const BR = 1.1 // rayon de l'ampoule (unités) ; 1 unité = 5 cm
const K1 = 20 // unités par mètre

function Helmholtz({ sim }) {
  const p = sim.paramsRef.current
  const { R } = electron(p)
  const Rs = R * K1
  const gun = new THREE.Vector3(BC.x - 0.1, BC.y - 0.8, 0)
  const pts = useMemo(() => {
    const out = [new THREE.Vector3(gun.x - 0.05, gun.y, 0)]
    const c = new THREE.Vector3(gun.x, gun.y + Rs, 0)
    for (let k = 0; k <= 200; k++) {
      const a = -Math.PI / 2 + (2 * Math.PI * k) / 200
      const v = new THREE.Vector3(c.x + Rs * Math.cos(a), c.y + Rs * Math.sin(a), 0)
      if (v.distanceTo(BC) > BR - 0.03) {
        out.push(v)
        break
      }
      out.push(v)
    }
    return out
  }, [Rs]) // eslint-disable-line react-hooks/exhaustive-deps
  const coilTex = useCanvasTexture(64, 512, (g, W, H) => {
    g.fillStyle = '#b5651d'
    g.fillRect(0, 0, W, H)
    g.strokeStyle = 'rgba(80,30,0,0.6)'
    for (let y = 0; y < H; y += 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke() }
  })
  coilTex.wrapS = coilTex.wrapT = THREE.RepeatWrapping
  coilTex.repeat.set(1, 8)
  const arrows = []
  for (const x of [-0.6, 0, 0.6]) for (const y of [-0.6, 0, 0.6]) arrows.push([BC.x + x, BC.y + y])
  return (
    <group>
      {[-0.75, 0.75].map((z) => (
        <group key={z}>
          <mesh position={[BC.x, BC.y, z]}>
            <torusGeometry args={[1.5, 0.11, 20, 80]} />
            <meshStandardMaterial map={coilTex} metalness={0.6} roughness={0.35} color="#d08040" />
          </mesh>
          <mesh position={[BC.x, BC.y - 1.05, z]}>
            <boxGeometry args={[0.12, 0.5, 0.12]} />
            <meshStandardMaterial color="#2a2d33" />
          </mesh>
        </group>
      ))}
      <RoundedBox args={[3.6, 0.12, 2.2]} radius={0.04} position={[BC.x, 0.06, 0]}>
        <meshStandardMaterial color="#2a2d33" roughness={0.5} />
      </RoundedBox>
      {/* ampoule */}
      <mesh position={BC}>
        <sphereGeometry args={[BR, 48, 32]} />
        <meshPhysicalMaterial color="#e8f4ff" transparent opacity={0.13} roughness={0.02} clearcoat={1} depthWrite={false} />
      </mesh>
      <mesh position={[BC.x, BC.y - BR - 0.25, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 0.5, 20]} />
        <meshStandardMaterial color="#3a3f47" />
      </mesh>
      {/* canon */}
      <mesh position={[gun.x - 0.18, gun.y, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.3, 16]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      {/* champ B (vers l'observateur, selon +z) */}
      {arrows.map(([x, y], i) => (
        <group key={i} position={[x, y, 0.95]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.25, 6]} />
            <meshBasicMaterial color="#b07cff" transparent opacity={0.7} />
          </mesh>
          <mesh position={[0, 0, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.03, 0.08, 8]} />
            <meshBasicMaterial color="#b07cff" transparent opacity={0.7} />
          </mesh>
        </group>
      ))}
      <Html position={[BC.x + 1.4, BC.y + 1.3, 0.9]} center zIndexRange={[10, 0]}><span className="lbl tiny">B (vers toi)</span></Html>
      {/* faisceau lumineux bleu (gaz excité) */}
      <Path points={pts} color="#5aa8ff" radius={0.02} opacity={0.75} />
      <Path points={pts} color="#2d6bff" radius={0.045} opacity={0.18} />
      <Runners pts={pts} color="#d8ecff" n={24} sim={sim} speed={0.3} />
      <Html position={[BC.x, BC.y + BR + 0.25, 0]} center zIndexRange={[10, 0]}><span className="lbl">R = {(R * 100).toFixed(1)} cm</span></Html>
    </group>
  )
}

/* ---------------- spectrographe de masse ---------------- */
const K2 = 10 // unités par mètre (1 unité = 10 cm)
const O = new THREE.Vector3(-2.2, 0.9, 1.4) // entrée dans le champ

function Spectrograph({ sim }) {
  const p = sim.paramsRef.current
  const ions = spectro(p)
  const paths = useMemo(
    () =>
      ions.map((io) => {
        const R = io.R * K2
        const out = [new THREE.Vector3(O.x, O.y, O.z + 1.4), new THREE.Vector3(O.x, O.y, O.z)]
        // demi-cercle de O vers O + 2R·x (la particule entre selon −z)
        for (let k = 1; k <= 120; k++) {
          const a = Math.PI - (Math.PI * k) / 120
          out.push(new THREE.Vector3(O.x + R + R * Math.cos(a), O.y, O.z - R * Math.sin(a)))
        }
        return out
      }),
    [p.Us, p.Bs], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const W = 5.6
  return (
    <group>
      <Table size={[11, 0.16, 6]} position={[0.5, -0.08, -0.6]} />
      {/* chambre à vide */}
      <mesh position={[O.x + W / 2, O.y - 0.2, O.z - 2]}>
        <boxGeometry args={[W + 0.4, 0.08, 4.6]} />
        <meshStandardMaterial color="#3a3f47" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[O.x + W / 2, O.y + 0.1, O.z - 2]}>
        <boxGeometry args={[W + 0.4, 0.55, 4.6]} />
        <meshPhysicalMaterial color="#e8f4ff" transparent opacity={0.08} roughness={0.02} depthWrite={false} />
      </mesh>
      {/* zone de champ B (vertical) */}
      {Array.from({ length: 6 }, (_, i) => Array.from({ length: 4 }, (_, j) => [O.x + 0.5 + i * 0.9, O.z - 0.5 - j * 0.9])).flat().map(([x, z], k) => (
        <mesh key={k} position={[x, O.y - 0.15, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.04, 0.07, 16]} />
          <meshBasicMaterial color="#b07cff" transparent opacity={0.6} />
        </mesh>
      ))}
      <Html position={[O.x + W - 0.3, O.y + 0.6, O.z - 3.8]} center zIndexRange={[10, 0]}><span className="lbl tiny">B ⊙ (vertical, vers le haut)</span></Html>
      {/* source + fentes d'accélération */}
      <RoundedBox args={[0.5, 0.5, 0.5]} radius={0.05} position={[O.x, O.y, O.z + 1.7]}>
        <meshStandardMaterial color="#b8372f" roughness={0.5} />
      </RoundedBox>
      {[0.9, 0.3].map((dz) => (
        <mesh key={dz} position={[O.x, O.y, O.z + dz]}>
          <boxGeometry args={[0.6, 0.4, 0.03]} />
          <meshStandardMaterial color="#9aa2ab" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      <Html position={[O.x - 0.6, O.y + 0.5, O.z + 1.7]} center zIndexRange={[10, 0]}><span className="lbl tiny">Source d’ions · U = {p.Us} V</span></Html>
      {/* plaque photographique */}
      <mesh position={[O.x + W / 2 + 0.1, O.y - 0.1, O.z + 0.02]}>
        <boxGeometry args={[W - 0.6, 0.3, 0.04]} />
        <meshStandardMaterial color="#e8e2d0" roughness={0.8} />
      </mesh>
      {ions.map((io, k) => (
        <group key={io.name}>
          <Path points={paths[k]} color={io.color} radius={0.014} opacity={0.85} />
          <Runners pts={paths[k]} color={io.color} n={10} sim={sim} speed={0.18 * (k ? 0.95 : 1)} size={0.04} />
          <mesh position={[O.x + 2 * io.R * K2, O.y - 0.05, O.z + 0.05]}>
            <boxGeometry args={[0.04, 0.24, 0.01]} />
            <meshBasicMaterial color={io.color} toneMapped={false} />
          </mesh>
          <Html position={[O.x + 2 * io.R * K2, O.y + 0.35 + k * 0.28, O.z + 0.2]} center zIndexRange={[10, 0]}>
            <span className="lbl tiny" style={{ color: io.color }}>{io.name} · 2R = {(2 * io.R * 100).toFixed(1)} cm</span>
          </Html>
        </group>
      ))}
    </group>
  )
}

/* ---------------- cyclotron ---------------- */
const K3 = 3.4 // unités par mètre

function Cyclotron({ sim }) {
  const p = sim.paramsRef.current
  const c = cyclotron(p)
  const Y = 0.8
  const pts = useMemo(() => {
    const out = [new THREE.Vector3(0, Y, 0)]
    let x = 0
    c.radii.forEach((R, n) => {
      const r = R * K3
      const even = n % 2 === 0
      const cx = even ? x + r : x - r
      for (let k = 1; k <= 18; k++) {
        const t = (Math.PI * k) / 18
        // pair : dans le dee 1 (z < 0), vers +x ; impair : dans le dee 2 (z > 0), vers −x
        out.push(even ? new THREE.Vector3(cx - r * Math.cos(t), Y, -r * Math.sin(t)) : new THREE.Vector3(cx + r * Math.cos(t), Y, r * Math.sin(t)))
      }
      x = even ? x + 2 * r : x - 2 * r
    })
    out.push(new THREE.Vector3(out[out.length - 1].x, Y, out[out.length - 1].z + 2))
    return out
  }, [p.Bc, p.Uc]) // eslint-disable-line react-hooks/exhaustive-deps
  const deeR = DEE_R * K3
  const dee = useMemo(() => {
    const sh = new THREE.Shape()
    sh.absarc(0, 0, deeR, 0, Math.PI, false)
    sh.lineTo(deeR, 0)
    const hole = new THREE.Path()
    hole.absarc(0, 0.04, deeR - 0.06, 0.02, Math.PI - 0.02, false)
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.25, bevelEnabled: false })
    g.rotateX(-Math.PI / 2)
    return g
  }, [deeR])
  return (
    <group>
      <Table size={[10, 0.16, 6]} position={[0, -0.08, 0]} />
      {/* électroaimant : pôles au-dessus et au-dessous */}
      {[Y - 0.55, Y + 0.55].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[deeR + 0.2, deeR + 0.2, 0.3, 64]} />
          <meshStandardMaterial color={y > Y ? '#c0504d' : '#4a6fa5'} metalness={0.5} roughness={0.4} transparent opacity={y > Y ? 0.25 : 1} depthWrite={y < Y} />
        </mesh>
      ))}
      {[0, Math.PI].map((r) => (
        <mesh key={r} geometry={dee} position={[0, Y - 0.12, r ? 0.06 : -0.06]} rotation={[0, r, 0]}>
          <meshStandardMaterial color="#d4a54a" metalness={0.85} roughness={0.3} transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      <Html position={[0, Y + 0.95, -deeR * 0.6]} center zIndexRange={[10, 0]}><span className="lbl tiny">Dee 1</span></Html>
      <Html position={[0, Y + 0.95, deeR * 0.6]} center zIndexRange={[10, 0]}><span className="lbl tiny">Dee 2</span></Html>
      <Path points={pts} color="#ff6b6b" radius={0.006} opacity={0.8} />
      <Runners pts={pts} color="#ffd0d0" n={14} sim={sim} speed={0.04} size={0.04} />
      <Html position={[deeR + 0.6, Y + 0.7, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">B vertical · U alternative entre les dees</span></Html>
    </group>
  )
}

export default function MagneticScene({ sim }) {
  const mode = sim.paramsRef.current.mode
  if (mode === 'spectro') return <Spectrograph sim={sim} />
  if (mode === 'cyclo') return <Cyclotron sim={sim} />
  return (
    <group>
      <Table size={[9, 0.16, 5]} position={[0, -0.08, 0]} />
      <Helmholtz sim={sim} />
    </group>
  )
}
