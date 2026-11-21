import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { Vector, useCanvasTexture } from '../../components/three/Lab.jsx'
import { R, r, T } from './model.js'

const DAY = 86164 // jour sidéral (s)

/** bruit de valeur simple pour dessiner des continents */
function noise2(seed) {
  const rnd = (x, y) => {
    const s = Math.sin(x * 127.1 + y * 311.7 + seed) * 43758.5453
    return s - Math.floor(s)
  }
  const smooth = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y)
    const xf = x - xi, yf = y - yi
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
    const a = rnd(xi, yi), b = rnd(xi + 1, yi), c = rnd(xi, yi + 1), d = rnd(xi + 1, yi + 1)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
  }
  return (x, y) => {
    let f = 0, amp = 0.5, fr = 1
    for (let o = 0; o < 5; o++) { f += amp * smooth(x * fr, y * fr); amp *= 0.5; fr *= 2 }
    return f
  }
}

function Earth({ earthRef, size }) {
  const tex = useCanvasTexture(1024, 512, (g, W, H) => {
    const n = noise2(3.1)
    const img = g.createImageData(W, H)
    for (let y = 0; y < H; y++) {
      const lat = Math.abs(y / H - 0.5) * 2
      for (let x = 0; x < W; x++) {
        // bruit périodique en longitude
        const a = (x / W) * Math.PI * 2
        const v = n(Math.cos(a) * 2.2 + 10, Math.sin(a) * 2.2 + y / 90)
        const i = (y * W + x) * 4
        let c
        if (lat > 0.86) c = [235, 240, 245]
        else if (v > 0.53) c = v > 0.62 ? [120, 105, 70] : [62, 120, 55]
        else c = v > 0.49 ? [40, 110, 160] : [18, 60, 120]
        img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255
      }
    }
    g.putImageData(img, 0, 0)
  })
  return (
    <group>
      <mesh ref={earthRef} scale={size}>
        <sphereGeometry args={[1, 96, 64]} />
        <meshStandardMaterial map={tex} roughness={0.75} metalness={0} />
      </mesh>
      <mesh scale={size * 1.035}>
        <sphereGeometry args={[1, 64, 48]} />
        <meshBasicMaterial color="#5fa8ff" transparent opacity={0.12} blending={THREE.AdditiveBlending} side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </group>
  )
}

function Stars() {
  const geo = useMemo(() => {
    const pts = []
    for (let i = 0; i < 1500; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(40 + Math.random() * 20)
      pts.push(v.x, v.y, v.z)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])
  return (
    <points geometry={geo}>
      <pointsMaterial color="#ffffff" size={0.12} sizeAttenuation />
    </points>
  )
}

function Satellite({ satRef }) {
  return (
    <group ref={satRef}>
      <mesh>
        <boxGeometry args={[0.12, 0.12, 0.18]} />
        <meshStandardMaterial color="#d4a54a" metalness={0.9} roughness={0.3} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.24, 0, 0]}>
          <boxGeometry args={[0.32, 0.01, 0.14]} />
          <meshStandardMaterial color="#1f3b73" metalness={0.5} roughness={0.25} emissive="#0a1a3a" />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.05, 0.06, 16, 1, true]} />
        <meshStandardMaterial color="#e1e4e8" metalness={0.8} roughness={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export default function OrbitScene({ sim }) {
  const p = sim.paramsRef.current
  const ratio = r(p) / R
  const size = Math.min(1.6, 5 / ratio) // rayon de la Terre dessinée
  const orbitR = size * ratio
  const earth = useRef()
  const sat = useRef()
  const vV = useRef()
  const vF = useRef()
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), d: new THREE.Vector3() }), [])
  const ring = useMemo(() => {
    const pts = []
    for (let k = 0; k <= 256; k++) {
      const a = (2 * Math.PI * k) / 256
      pts.push(orbitR * Math.cos(a), 0, -orbitR * Math.sin(a))
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [orbitR])

  useFrame(() => {
    const t = sim.stateRef.current.t
    const per = T(sim.paramsRef.current)
    const a = (2 * Math.PI * t) / per
    earth.current.rotation.y = (2 * Math.PI * t) / DAY
    const pos = tmp.v.set(orbitR * Math.cos(a), 0, -orbitR * Math.sin(a))
    sat.current.position.copy(pos)
    sat.current.rotation.y = a
    // vecteurs : vitesse (tangente) et force (vers le centre)
    vV.current.set(pos, tmp.d.set(-Math.sin(a), 0, -Math.cos(a)).multiplyScalar(0.8))
    vF.current.set(pos, tmp.d.copy(pos).normalize().multiplyScalar(-0.7))
  })

  return (
    <group>
      <Stars />
      <directionalLight position={[10, 3, 6]} intensity={2.2} />
      <Earth earthRef={earth} size={size} />
      <line geometry={ring}>
        <lineBasicMaterial color="#9fb3c8" transparent opacity={0.5} />
      </line>
      <Satellite satRef={sat} />
      <Vector ref={vV} color="#4cd17a" radius={0.02} />
      <Vector ref={vF} color="#e5484d" radius={0.02} />
      <Html position={[0, size + 0.35, 0]} center zIndexRange={[10, 0]}>
        <span className="lbl tiny">Terre (R = 6 370 km)</span>
      </Html>
    </group>
  )
}
