import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { steady, xe } from './model.js'

const SCALE = 10 // 1 unité = 10 cm
const ANCHOR_X = -2.3 // extrémité du ressort (au repos de l'excitateur)
const EQ_X = 0.9 // position d'équilibre du centre du mobile
const Y = 0.62 // hauteur de l'axe du ressort
const GL = 0.7 // longueur du mobile

function useHelix(turns = 16, radius = 0.13, wire = 0.02) {
  return useMemo(() => {
    class Helix extends THREE.Curve {
      getPoint(u, out = new THREE.Vector3()) {
        const a = u * turns * Math.PI * 2
        return out.set(u, radius * Math.cos(a), radius * Math.sin(a))
      }
    }
    return new THREE.TubeGeometry(new Helix(), turns * 24, wire, 8, false)
  }, [turns, radius, wire])
}

/** Rail du banc à coussin d'air (profil en toit) avec ses trous. */
function AirTrack() {
  const holes = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 1024
    c.height = 64
    const g = c.getContext('2d')
    g.fillStyle = '#b9c0c8'
    g.fillRect(0, 0, 1024, 64)
    g.fillStyle = '#4a5058'
    for (let x = 8; x < 1024; x += 16) for (const y of [18, 46]) {
      g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill()
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [])
  return (
    <group>
      {/* paillasse */}
      <mesh position={[0, -0.08, 0.2]} receiveShadow>
        <boxGeometry args={[9, 0.16, 4]} />
        <meshStandardMaterial color="#6f5238" roughness={0.75} />
      </mesh>
      {/* pieds */}
      {[-2.9, 2.9].map((x) => (
        <mesh key={x} position={[x, 0.13, 0]} castShadow>
          <boxGeometry args={[0.3, 0.26, 0.7]} />
          <meshStandardMaterial color="#2a2d33" roughness={0.6} />
        </mesh>
      ))}
      {/* rail */}
      <mesh position={[0, 0.34, 0]} castShadow receiveShadow>
        <boxGeometry args={[6.4, 0.16, 0.34]} />
        <meshStandardMaterial color="#9aa2ab" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.425, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6.4, 0.3]} />
        <meshStandardMaterial map={holes} metalness={0.6} roughness={0.35} />
      </mesh>
      {/* soufflerie */}
      <RoundedBox args={[0.7, 0.45, 0.6]} radius={0.06} position={[3.7, 0.23, -0.9]} castShadow>
        <meshStandardMaterial color="#2f6db3" roughness={0.5} />
      </RoundedBox>
      <mesh position={[3.25, 0.34, -0.5]} rotation={[0, 0.6, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 0.8, 12]} />
        <meshStandardMaterial color="#222" roughness={0.8} />
      </mesh>
    </group>
  )
}

/** Règle graduée (cm) le long du rail, centrée sur la position d'équilibre. */
function Ruler() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 1600
    c.height = 80
    const g = c.getContext('2d')
    g.fillStyle = '#f3eee0'
    g.fillRect(0, 0, 1600, 80)
    g.fillStyle = '#222'
    g.strokeStyle = '#222'
    g.font = 'bold 22px system-ui, sans-serif'
    g.textAlign = 'center'
    for (let mm = -200; mm <= 200; mm += 5) {
      const x = 800 + mm * 3.95
      const big = mm % 50 === 0
      g.lineWidth = big ? 3 : mm % 10 === 0 ? 2 : 1
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, big ? 34 : mm % 10 === 0 ? 22 : 12); g.stroke()
      if (big) g.fillText(mm === 0 ? 'O' : mm / 10, x, 62)
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [])
  return (
    <mesh position={[EQ_X, 0.43, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[4.05, 0.2]} />
      <meshStandardMaterial map={tex} roughness={0.6} />
    </mesh>
  )
}

export default function ForcedSpringScene({ sim }) {
  const helix = useHelix()
  const spring = useRef()
  const glider = useRef()
  const disc = useRef()
  const rod = useRef()
  const anchor = useRef()
  const ghostA = useRef()
  const ghostB = useRef()
  const oil = useRef()
  const fin = useRef()
  const pinM = useRef()
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) }), [])

  const DISC = [ANCHOR_X - 1.05, Y, 0]

  useFrame(() => {
    const s = sim.stateRef.current
    const p = sim.paramsRef.current
    const w = 2 * Math.PI * p.N
    const th = w * s.t
    const e = xe(s.t, p) * SCALE
    const R = (p.Xe / 100) * SCALE

    // disque de l'excitateur et maneton
    disc.current.rotation.z = -th
    const pin = tmp.a.set(DISC[0] + R * Math.sin(th), DISC[1] + R * Math.cos(th), 0.12)
    pinM.current.position.copy(pin)
    const ax = ANCHOR_X + e
    anchor.current.position.x = ax
    // bielle : du maneton au coulisseau
    const end = tmp.b.set(ax - 0.12, Y, 0.12)
    const dir = end.clone().sub(pin)
    rod.current.position.copy(pin).addScaledVector(dir, 0.5)
    rod.current.scale.y = dir.length()
    rod.current.quaternion.setFromUnitVectors(tmp.up, dir.normalize())

    // mobile + ressort
    const cx = EQ_X + s.x * SCALE
    glider.current.position.x = cx
    spring.current.position.x = ax + 0.08
    spring.current.scale.x = Math.max(cx - GL / 2 - ax - 0.08, 0.05)

    // amplitude du régime permanent (repères fantômes)
    const Xm = steady(p).Xm * SCALE
    ghostA.current.position.x = EQ_X + Xm
    ghostB.current.position.x = EQ_X - Xm

    // amortisseur : palette dans l'huile, d'autant plus visqueuse que h est grand
    fin.current.position.x = cx
    oil.current.opacity = 0.25 + 0.5 * Math.min(1, p.h / 2)
  })

  return (
    <group>
      <AirTrack />
      <Ruler />

      {/* excitateur : moteur, disque et maneton, bielle, coulisseau */}
      <RoundedBox args={[0.7, 0.9, 0.55]} radius={0.06} position={[DISC[0], 0.45, -0.32]} castShadow>
        <meshStandardMaterial color="#3b4a63" roughness={0.5} metalness={0.15} />
      </RoundedBox>
      <group position={[DISC[0], DISC[1], 0.02]}>
        <group ref={disc}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.36, 0.36, 0.06, 40]} />
            <meshStandardMaterial color="#cfd3d8" metalness={0.85} roughness={0.25} />
          </mesh>
          {[0, 1, 2, 3].map((k) => (
            <mesh key={k} position={[0.24 * Math.cos((k * Math.PI) / 2), 0.24 * Math.sin((k * Math.PI) / 2), 0.035]}>
              <circleGeometry args={[0.05, 20]} />
              <meshStandardMaterial color="#3a3f47" />
            </mesh>
          ))}
        </group>
      </group>
      <mesh ref={pinM} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.14, 16]} />
        <meshStandardMaterial color="#e5484d" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh ref={rod} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 1, 10]} />
        <meshStandardMaterial color="#d9b54a" metalness={0.9} roughness={0.25} />
      </mesh>
      <group ref={anchor} position={[ANCHOR_X, 0, 0]}>
        <RoundedBox args={[0.24, 0.32, 0.5]} radius={0.03} position={[0, 0.58, 0]} castShadow>
          <meshStandardMaterial color="#5b6470" metalness={0.5} roughness={0.4} />
        </RoundedBox>
      </group>
      <Html position={[DISC[0], 1.25, 0]} center zIndexRange={[10, 0]}>
        <span className="lbl">Excitateur</span>
      </Html>

      {/* ressort */}
      <mesh ref={spring} geometry={helix} position={[ANCHOR_X, Y, 0]} castShadow>
        <meshStandardMaterial color="#cfd6de" metalness={0.9} roughness={0.25} />
      </mesh>

      {/* mobile autoporteur */}
      <group ref={glider} position={[EQ_X, 0, 0]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[GL, 0.08, 0.44]} />
          <meshStandardMaterial color="#e5484d" roughness={0.4} metalness={0.2} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0, 0.4, s * 0.21]} rotation={[s * 0.5, 0, 0]} castShadow>
            <boxGeometry args={[GL, 0.16, 0.03]} />
            <meshStandardMaterial color="#c43a3f" roughness={0.4} metalness={0.2} />
          </mesh>
        ))}
        <mesh position={[0, 0.6, 0]} castShadow>
          <boxGeometry args={[0.28, 0.14, 0.28]} />
          <meshStandardMaterial color="#5b6470" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[-GL / 2, Y, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.06, 16]} />
          <meshStandardMaterial color="#cfd3d8" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* index */}
        <mesh position={[0, 0.46, 0.3]}>
          <coneGeometry args={[0.04, 0.1, 3]} />
          <meshBasicMaterial color="#ffd23f" />
        </mesh>
      </group>

      {/* amortisseur visqueux : palette plongée dans une cuve d'huile */}
      <mesh position={[EQ_X, 0.18, -0.62]}>
        <boxGeometry args={[3.6, 0.36, 0.3]} />
        <meshPhysicalMaterial color="#d9eef6" transparent opacity={0.25} roughness={0.05} />
      </mesh>
      <mesh position={[EQ_X, 0.15, -0.62]}>
        <boxGeometry args={[3.56, 0.28, 0.26]} />
        <meshStandardMaterial ref={oil} color="#c88a1a" transparent opacity={0.4} roughness={0.2} depthWrite={false} />
      </mesh>
      <group ref={fin} position={[EQ_X, 0, 0]}>
        <mesh position={[0, 0.5, -0.4]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.42, 8]} />
          <meshStandardMaterial color="#cfd3d8" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.33, -0.62]}>
          <boxGeometry args={[0.02, 0.36, 0.02]} />
          <meshStandardMaterial color="#cfd3d8" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.16, -0.62]}>
          <boxGeometry args={[0.3, 0.18, 0.015]} />
          <meshStandardMaterial color="#9aa2ab" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
      <Html position={[EQ_X + 1.2, 0.55, -0.95]} center zIndexRange={[10, 0]}>
        <span className="lbl">Amortisseur (h)</span>
      </Html>

      {/* repères ±Xm du régime permanent */}
      {[ghostA, ghostB].map((r, i) => (
        <mesh key={i} ref={r} position={[EQ_X, 0.47, 0.3]}>
          <boxGeometry args={[0.02, 0.06, 0.26]} />
          <meshBasicMaterial color="#30a46c" />
        </mesh>
      ))}
    </group>
  )
}
