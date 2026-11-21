import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Breadboard, Bench, Resistor } from '../../components/three/parts.jsx'
import { Lead } from '../../components/three/Wire.jsx'
import { transfer, ue, VSAT } from './model.js'

const Y = 0.05

/** circuit intégré DIP-8 (type 741) */
function Chip() {
  const legs = []
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) legs.push([-0.3 + i * 0.2, s])
  return (
    <group position={[0, Y, 0]}>
      <RoundedBox args={[0.82, 0.14, 0.42]} radius={0.02} position={[0, 0.12, 0]} castShadow>
        <meshStandardMaterial color="#1b1d21" roughness={0.6} />
      </RoundedBox>
      <mesh position={[-0.36, 0.195, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.035, 16]} />
        <meshStandardMaterial color="#3a3d42" />
      </mesh>
      {legs.map(([x, s], i) => (
        <mesh key={i} position={[x, 0.06, s * 0.24]}>
          <boxGeometry args={[0.05, 0.12, 0.03]} />
          <meshStandardMaterial color="#c9ced6" metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
      <Html position={[0.05, 0.3, 0]} center zIndexRange={[10, 0]}>
        <span className="lbl tiny">AOP 741</span>
      </Html>
    </group>
  )
}

/** oscilloscope : écran dessiné en temps réel (voie 1 = ue, voie 2 = us) */
function Oscilloscope({ sim }) {
  const { canvas, tex } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 220
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return { canvas, tex }
  }, [])
  useFrame(() => {
    const g = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    const p = sim.paramsRef.current
    const t1 = sim.stateRef.current.t
    g.fillStyle = '#061209'
    g.fillRect(0, 0, W, H)
    g.strokeStyle = 'rgba(80,160,100,0.35)'
    g.lineWidth = 1
    for (let i = 1; i < 10; i++) { g.beginPath(); g.moveTo((W * i) / 10, 0); g.lineTo((W * i) / 10, H); g.stroke() }
    for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(0, (H * i) / 8); g.lineTo(W, (H * i) / 8); g.stroke() }
    const span = 2 / p.N
    const y = (v) => H / 2 - (v / 16) * (H / 2) // 2 V/div sur 8 divisions → ±16 V
    for (const [col, f] of [['#ffd23f', (t) => ue(t, p)], ['#4cc3ff', (t) => transfer(ue(t, p), p)]]) {
      g.strokeStyle = col
      g.lineWidth = 2
      g.beginPath()
      for (let k = 0; k <= 200; k++) {
        const t = t1 - span + (span * k) / 200
        const X = (W * k) / 200
        k ? g.lineTo(X, y(f(t))) : g.moveTo(X, y(f(t)))
      }
      g.stroke()
    }
    g.fillStyle = '#ffd23f'
    g.font = '13px system-ui'
    g.fillText('CH1 ue', 6, 16)
    g.fillStyle = '#4cc3ff'
    g.fillText('CH2 us', 70, 16)
    tex.needsUpdate = true
  })
  return (
    <group position={[2.9, 0, -0.4]} rotation={[0, -0.5, 0]}>
      <RoundedBox args={[1.5, 1.05, 0.9]} radius={0.06} position={[0, 0.53, 0]} castShadow>
        <meshStandardMaterial color="#c9ccd1" roughness={0.5} />
      </RoundedBox>
      <mesh position={[-0.2, 0.62, 0.452]}>
        <planeGeometry args={[0.88, 0.6]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {[0.15, 0.3, 0.45].map((yy, i) => (
        <mesh key={i} position={[0.48, yy + 0.3, 0.46]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.04, 20]} />
          <meshStandardMaterial color="#2a2d33" />
        </mesh>
      ))}
      <Html position={[0, 1.2, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">Oscilloscope</span></Html>
    </group>
  )
}

export default function AopScene({ sim }) {
  const p = sim.paramsRef.current
  const gbf = useRef()
  const meter = useRef()
  useFrame(() => {
    if (gbf.current) gbf.current.textContent = p.N + ' Hz'
    const pp = sim.paramsRef.current
    if (meter.current) {
      const v = transfer(ue(sim.stateRef.current.t, pp), pp)
      meter.current.textContent = (v >= 0 ? '+' : '') + v.toFixed(2) + ' V' + (Math.abs(v) >= VSAT - 1e-6 ? ' (sat.)' : '')
    }
  })
  const showR = p.montage !== 'suiveur' && p.montage !== 'comparateur'
  return (
    <group>
      <Breadboard size={[6, 0.1, 3.2]} position={[0, -0.05, 0]} />
      <Chip />
      {showR && (
        <>
          <group position={[-1.1, 0, -0.24]}>
            <Resistor ohms={p.R1 * 1000} />
          </group>
          <Html position={[-1.1, 0.45, -0.24]} center zIndexRange={[10, 0]}><span className="lbl tiny">R1 = {p.R1} kΩ</span></Html>
          <group position={[0, 0, -0.85]}>
            <Resistor ohms={p.R2 * 1000} />
          </group>
          <Html position={[0, 0.45, -0.85]} center zIndexRange={[10, 0]}><span className="lbl tiny">R2 = {p.R2} kΩ</span></Html>
          <Lead points={[[-0.55, Y, -0.24], [-0.3, Y, -0.24]]} />
          <Lead points={[[-0.55, Y, -0.85], [-0.6, Y, -0.85], [-0.6, Y, -0.24]]} />
          <Lead points={[[0.55, Y, -0.85], [0.7, Y, -0.85], [0.7, Y, 0.24], [0.3, Y, 0.24]]} />
        </>
      )}
      {p.montage === 'sommateur' && (
        <>
          <group position={[-1.1, 0, -0.55]}>
            <Resistor ohms={p.R1 * 1000} />
          </group>
          <Lead points={[[-0.55, Y, -0.55], [-0.6, Y, -0.55]]} />
        </>
      )}
      {/* alimentation symétrique ±15 V */}
      <group position={[-1.2, 0, 1.25]} rotation={[0, -Math.PI / 2, 0]}>
        <Bench kind="battery" />
      </group>
      <Html position={[-1.2, 1.05, 1.25]} center zIndexRange={[10, 0]}><span className="lbl tiny">Alimentation ±15 V</span></Html>
      <Lead smooth metal={false} color="#c0392b" radius={0.02} points={[[-1.8, 0.22, 1.75], [-1.0, 0.2, 0.9], [-0.1, Y, 0.35], [-0.1, Y, 0.24]]} />
      <Lead smooth metal={false} color="#2f6db3" radius={0.02} points={[[-0.6, 0.22, 1.75], [0.1, 0.2, 1.0], [0.3, Y, -0.4], [0.3, Y, -0.24]]} />
      {/* GBF : entrée ue */}
      <group position={[-3.0, 0, -0.2]}>
        <Bench kind="gbf" textRef={gbf} />
      </group>
      <Lead smooth metal={false} color="#ffd23f" radius={0.02} points={[[-2.47, 0.22, -0.8], [-2.1, 0.2, -0.6], [-1.75, Y, -0.24], [-1.65, Y, -0.24]]} />
      {/* sortie */}
      <mesh position={[1.1, Y + 0.05, 0.24]}>
        <cylinderGeometry args={[0.05, 0.05, 0.1, 16]} />
        <meshStandardMaterial color="#4cc3ff" />
      </mesh>
      <Html position={[1.15, 0.5, 0.5]} center zIndexRange={[10, 0]}>
        <div className="vm-screen"><small>us</small><b ref={meter}>—</b></div>
      </Html>
      <Lead smooth metal={false} color="#4cc3ff" radius={0.02} points={[[1.1, Y, 0.24], [1.6, 0.2, 0.3], [2.3, 0.4, 0.1], [2.5, 0.4, -0.05]]} />
      <Oscilloscope sim={sim} />
    </group>
  )
}
