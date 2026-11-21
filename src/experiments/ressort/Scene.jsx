import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

const WALL_X = -2.4
const EQ_X = 0.6 // position d'équilibre (centre du solide)
const SCALE = 10 // 1 m réel = 10 unités → 10 cm = 1 unité
const Y = 0.35

/** Hélice de longueur 1 selon x, étirée ensuite par scale.x. */
function useHelix(turns = 14, radius = 0.17, wire = 0.025) {
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

function Arrow({ color, aref }) {
  // flèche unitaire selon +x ; échelle et sens réglés dans useFrame
  return (
    <group ref={aref}>
      <mesh position={[0.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 1, 10]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[1, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.09, 0.22, 14]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export default function SpringScene({ sim }) {
  const helix = useHelix()
  const spring = useRef()
  const body = useRef()
  const fArrow = useRef()
  const vArrow = useRef()

  useFrame(() => {
    const s = sim.stateRef.current
    const p = sim.paramsRef.current
    const side = 0.25 + 0.35 * Math.cbrt(p.m / 1000) // taille du solide selon m
    const cx = EQ_X + s.x * SCALE
    body.current.position.x = cx
    body.current.scale.setScalar(side)
    const left = cx - side / 2
    spring.current.scale.x = Math.max(left - WALL_X, 0.05)

    // force de rappel T = −k·x (rouge), vitesse v (verte)
    const F = -p.k * s.x
    const fl = Math.min(Math.abs(F) * 0.6, 2.2)
    fArrow.current.visible = fl > 0.03
    fArrow.current.position.set(cx, Y + side / 2 + 0.25, 0)
    fArrow.current.scale.set(Math.sign(F) * fl || 1, 1, 1)
    const vl = Math.min(Math.abs(s.v) * 2.2, 1.6)
    vArrow.current.visible = vl > 0.03
    vArrow.current.position.set(cx, Y + side / 2 + 0.55, 0)
    vArrow.current.scale.set(Math.sign(s.v) * vl || 1, 1, 1)
  })

  const ticks = []
  for (let c = -12; c <= 12; c++) ticks.push(c)

  return (
    <group>
      {/* banc + rail */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[6.6, 0.1, 2.2]} />
        <meshStandardMaterial color="#3a3f47" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <boxGeometry args={[6, 0.06, 0.7]} />
        <meshStandardMaterial color="#8d96a0" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* mur / support fixe */}
      <mesh position={[WALL_X - 0.1, 0.6, 0]} castShadow>
        <boxGeometry args={[0.2, 1.3, 1.2]} />
        <meshStandardMaterial color="#5b6470" />
      </mesh>

      {/* ressort */}
      <mesh ref={spring} geometry={helix} position={[WALL_X, Y, 0]} castShadow>
        <meshStandardMaterial color="#cfd6de" metalness={0.9} roughness={0.25} />
      </mesh>

      {/* solide */}
      <mesh ref={body} position={[EQ_X, Y, 0]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#e5484d" roughness={0.45} metalness={0.1} />
      </mesh>

      {/* règle graduée en cm */}
      <group position={[0, 0.07, 0.75]}>
        <mesh position={[EQ_X, 0, 0]}>
          <boxGeometry args={[2.6, 0.02, 0.28]} />
          <meshStandardMaterial color="#f2efe6" />
        </mesh>
        {ticks.map((c) => (
          <mesh key={c} position={[EQ_X + c * 0.1, 0.015, -0.08 + (c % 5 === 0 ? 0.02 : 0)]}>
            <boxGeometry args={[0.008, 0.01, c % 5 === 0 ? 0.12 : 0.07]} />
            <meshBasicMaterial color="#222" />
          </mesh>
        ))}
        {[-10, -5, 0, 5, 10].map((c) => (
          <Html key={c} position={[EQ_X + c * 0.1, 0.02, 0.1]} center className="lbl tiny" zIndexRange={[10, 0]}>
            {c === 0 ? 'O' : c}
          </Html>
        ))}
      </group>
      <Html position={[EQ_X + 1.55, 0.1, 0.95]} center className="lbl tiny" zIndexRange={[10, 0]}>
        x (cm)
      </Html>

      {/* repère d'équilibre */}
      <mesh position={[EQ_X, 0.9, -0.62]}>
        <boxGeometry args={[0.015, 1.7, 0.015]} />
        <meshBasicMaterial color="#e0a000" />
      </mesh>

      <Arrow color="#ff6b6b" aref={fArrow} />
      <Arrow color="#4cd17a" aref={vArrow} />
    </group>
  )
}
