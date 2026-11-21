import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Vector, Path, useCanvasTexture } from '../../components/three/Lab.jsx'
import { flight, at } from './model.js'

const X0 = -4 // point de lancement (unités de scène)

/** échelle : la trajectoire entière tient dans ~8 unités */
export const scaleFor = (p) => {
  const f = flight(p)
  return Math.min(0.45, 8 / Math.max(f.range, 1.6 * f.top, 4))
}

function Ground({ S }) {
  const tex = useCanvasTexture(
    1024,
    256,
    (g, W, H) => {
      const grad = g.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, '#3f6b35')
      grad.addColorStop(1, '#2f5528')
      g.fillStyle = grad
      g.fillRect(0, 0, W, H)
      for (let i = 0; i < 4000; i++) {
        g.fillStyle = `rgba(${40 + Math.random() * 40},${90 + Math.random() * 60},${30 + Math.random() * 30},0.5)`
        g.fillRect(Math.random() * W, Math.random() * H, 2, 2)
      }
    },
    [],
  )
  // marques de distance tous les « pas » mètres
  const span = 9 / S
  const step = span > 60 ? 20 : span > 25 ? 5 : span > 10 ? 2 : 1
  const marks = []
  for (let m = 0; m * S <= 9.5; m += step) marks.push(m)
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.6, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 5]} />
        <meshStandardMaterial map={tex} roughness={0.95} />
      </mesh>
      {marks.map((m) => (
        <group key={m} position={[X0 + m * S, 0.005, 0.9]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.03, 0.5]} />
            <meshBasicMaterial color="#f2f2f2" />
          </mesh>
          <Html position={[0, 0.02, 0.45]} center zIndexRange={[10, 0]}>
            <span className="lbl tiny">{m} m</span>
          </Html>
        </group>
      ))}
    </group>
  )
}

function Launcher({ p, S }) {
  const h = p.h0 * S
  return (
    <group position={[X0, 0, 0]}>
      {h > 0.01 && (
        <RoundedBox args={[0.7, h, 0.8]} radius={0.03} position={[-0.15, h / 2, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#8d6b4a" roughness={0.8} />
        </RoundedBox>
      )}
      <group position={[0, h, 0]}>
        <mesh position={[-0.12, 0.06, 0]} castShadow>
          <boxGeometry args={[0.45, 0.12, 0.4]} />
          <meshStandardMaterial color="#2a2d33" roughness={0.5} />
        </mesh>
        <group rotation={[0, 0, (p.alpha * Math.PI) / 180]}>
          <mesh position={[-0.12, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.07, 0.08, 0.5, 24]} />
            <meshStandardMaterial color="#b8372f" metalness={0.3} roughness={0.4} />
          </mesh>
        </group>
        <mesh position={[-0.12, 0.12, 0.13]}>
          <torusGeometry args={[0.12, 0.012, 8, 32, (p.alpha * Math.PI) / 180]} />
          <meshBasicMaterial color="#e0a000" />
        </mesh>
        <Html position={[0.2, 0.25, 0.25]} center zIndexRange={[10, 0]}>
          <span className="lbl tiny">α = {p.alpha}°</span>
        </Html>
      </group>
    </group>
  )
}

export default function ProjectileScene({ sim, view }) {
  const p = sim.paramsRef.current
  const S = scaleFor(p)
  const ball = useRef()
  const vV = useRef()
  const vX = useRef()
  const vY = useRef()
  const tmp = useMemo(() => ({ o: new THREE.Vector3(), v: new THREE.Vector3() }), [])
  const f = flight(p)
  const toScene = (x, y) => new THREE.Vector3(X0 + x * S, y * S + 0.06, 0)
  const curve = useMemo(() => {
    const pts = []
    for (let k = 0; k <= 120; k++) {
      const q = at((f.tf * k) / 120, p)
      pts.push(toScene(q.x, q.y))
    }
    return pts
  }, [p.v0, p.alpha, p.h0, p.planet]) // eslint-disable-line react-hooks/exhaustive-deps
  const ghosts = useMemo(() => {
    const n = 12
    return Array.from({ length: n + 1 }, (_, k) => {
      const q = at((f.tf * k) / n, p)
      return toScene(q.x, q.y)
    })
  }, [p.v0, p.alpha, p.h0, p.planet]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    const s = sim.stateRef.current
    const pos = toScene(s.x, s.y)
    ball.current.position.copy(pos)
    const k = 0.07
    tmp.v.set(s.vx * k, s.vy * k, 0)
    vV.current.set(pos, tmp.v)
    vX.current.set(pos, tmp.v.set(s.vx * k, 0, 0))
    vY.current.set(pos, tmp.v.set(0, s.vy * k, 0))
    vV.current.visible = view.vectors
    vX.current.visible = view.vectors
    vY.current.visible = view.vectors
  })

  const top = at(f.tS, p)
  return (
    <group>
      <Ground S={S} />
      <Launcher p={p} S={S} />
      {view.trajectory && <Path points={curve} color="#ffd23f" radius={0.012} opacity={0.75} />}
      {view.chrono &&
        ghosts.map((v, i) => (
          <mesh key={i} position={v}>
            <sphereGeometry args={[0.05, 14, 10]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.35} />
          </mesh>
        ))}
      {view.trajectory && p.alpha > 0 && (
        <>
          <mesh position={[X0 + top.x * S, (top.y * S) / 2 + 0.03, 0]}>
            <boxGeometry args={[0.01, top.y * S, 0.01]} />
            <meshBasicMaterial color="#8a8f98" />
          </mesh>
          <Html position={[X0 + top.x * S, top.y * S + 0.35, 0]} center zIndexRange={[10, 0]}>
            <span className="lbl tiny">sommet S · {f.top.toFixed(2)} m</span>
          </Html>
        </>
      )}
      <Html position={[X0 + f.range * S, 0.25, 0.3]} center zIndexRange={[10, 0]}>
        <span className="lbl tiny">portée {f.range.toFixed(2)} m</span>
      </Html>
      <mesh ref={ball} castShadow>
        <sphereGeometry args={[0.07, 24, 18]} />
        <meshStandardMaterial color="#f2f2f2" roughness={0.35} />
      </mesh>
      <Vector ref={vV} color="#4cd17a" />
      <Vector ref={vX} color="#3e9bff" radius={0.016} />
      <Vector ref={vY} color="#e5484d" radius={0.016} />
    </group>
  )
}
