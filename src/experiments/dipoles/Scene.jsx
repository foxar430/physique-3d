import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Breadboard, Bench, Resistor, Multimeter } from '../../components/three/parts.jsx'
import { Lead } from '../../components/three/Wire.jsx'
import { operating, pouillet } from './model.js'

const Y = 0.05
const RED = '#c0392b'
const BLACK = '#22252a'

function Lamp({ glowRef }) {
  return (
    <group>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.16, 24]} />
        <meshStandardMaterial color="#c9ced6" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <sphereGeometry args={[0.2, 32, 24]} />
        <meshPhysicalMaterial color="#fff8e8" transparent opacity={0.35} roughness={0.05} clearcoat={1} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.36, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.05, 0.008, 6, 20]} />
        <meshStandardMaterial ref={glowRef} color="#5a4a30" emissive="#ffb347" emissiveIntensity={0} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Diode() {
  return (
    <group position={[0, 0.12, 0]} rotation={[0, 0, Math.PI / 2]}>
      <mesh>
        <cylinderGeometry args={[0.06, 0.06, 0.3, 20]} />
        <meshStandardMaterial color="#1b1d21" roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.062, 0.062, 0.04, 20]} />
        <meshStandardMaterial color="#d8dce2" metalness={0.8} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.01, 0.01, 0.9, 8]} />
        <meshStandardMaterial color="#c9ced6" metalness={0.9} roughness={0.25} />
      </mesh>
    </group>
  )
}

function Motor({ fanRef }) {
  return (
    <group>
      <mesh position={[0, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.17, 0.17, 0.36, 28]} />
        <meshStandardMaterial color="#c9ced6" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[0.25, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 0.16, 8]} />
        <meshStandardMaterial color="#9aa2ab" metalness={0.9} />
      </mesh>
      <group ref={fanRef} position={[0.33, 0.2, 0]}>
        {[0, 1, 2].map((k) => (
          <mesh key={k} rotation={[(k * 2 * Math.PI) / 3, 0, 0]} position={[0, 0, 0]}>
            <boxGeometry args={[0.02, 0.32, 0.08]} />
            <meshStandardMaterial color="#e5484d" />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function Pile() {
  return (
    <group>
      <RoundedBox args={[0.5, 0.32, 0.3]} radius={0.03} position={[0, 0.16, 0]} castShadow>
        <meshStandardMaterial color="#2f6db3" roughness={0.45} />
      </RoundedBox>
      <mesh position={[0, 0.33, 0]}>
        <boxGeometry args={[0.52, 0.02, 0.32]} />
        <meshStandardMaterial color="#e0a000" />
      </mesh>
      {[-0.12, 0.12].map((x, i) => (
        <mesh key={x} position={[x, 0.4, 0]}>
          <boxGeometry args={[0.03, 0.12, 0.08]} />
          <meshStandardMaterial color={i ? '#c9ced6' : '#d8b060'} metalness={0.9} />
        </mesh>
      ))}
      <Html position={[0, 0.6, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">4,5 V</span></Html>
    </group>
  )
}

/** rhéostat : enroulement sur un tube céramique, curseur mobile */
function Rheostat({ pos = 0.5 }) {
  return (
    <group>
      <mesh position={[0, 0.25, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.13, 0.13, 1.0, 28]} />
        <meshStandardMaterial color="#b86b3a" metalness={0.6} roughness={0.35} />
      </mesh>
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.2, 0]}>
          <boxGeometry args={[0.06, 0.4, 0.3]} />
          <meshStandardMaterial color="#2a2d33" />
        </mesh>
      ))}
      <mesh position={[0, 0.45, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 1.1, 8]} />
        <meshStandardMaterial color="#c9ced6" metalness={0.9} />
      </mesh>
      <mesh position={[-0.45 + 0.9 * pos, 0.42, 0]}>
        <boxGeometry args={[0.08, 0.1, 0.12]} />
        <meshStandardMaterial color="#1b1d21" />
      </mesh>
    </group>
  )
}

export default function DipoleScene({ sim }) {
  const p = sim.paramsRef.current
  const glow = useRef()
  const fan = useRef()
  const aText = useRef()
  const vText = useRef()
  const res = useRef()
  const pou = p.mode === 'pouillet'
  const op = pou ? pouillet(p) : operating(p)

  useFrame((_, delta) => {
    const P = op.U * op.I
    if (glow.current) glow.current.emissiveIntensity = Math.min(6, P * 1.5)
    if (res.current) res.current.emissiveIntensity = Math.min(1.8, P * 6)
    if (fan.current && sim.running) fan.current.rotation.x += delta * Math.max(0, op.U - (p.Ep ?? 0)) * 6
    if (aText.current) aText.current.textContent = (op.I * 1000).toFixed(1) + ' mA'
    if (vText.current) vText.current.textContent = op.U.toFixed(2) + ' V'
  })

  const dip = pou ? 'pouillet' : p.dip
  return (
    <group>
      <Breadboard size={[7, 0.1, 3.4]} position={[0.3, -0.05, 0]} />
      {/* source */}
      {dip === 'pile' || pou ? (
        <group position={[-2.4, 0, 0]}>
          <Pile />
          <Html position={[0, 0.85, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">E = {p.E} V · r = {p.r} Ω</span></Html>
        </group>
      ) : (
        <group position={[-2.9, 0, 0]}>
          <Bench kind="battery" />
          <Html position={[0.3, 1.05, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">Générateur réglable {p.Eg} V</span></Html>
        </group>
      )}
      {/* élément de réglage : rhéostat (protection ou charge) */}
      <group position={[-0.8, 0, -1.0]}>
        <Rheostat pos={dip === 'pile' ? Math.min(1, p.Rload / 100) : 0.5} />
        <Html position={[0, 0.75, 0]} center zIndexRange={[10, 0]}>
          <span className="lbl tiny">{dip === 'pile' ? `Rhéostat R = ${p.Rload} Ω` : pou ? `R = ${p.Rpou} Ω` : 'Protection 47 Ω'}</span>
        </Html>
      </group>
      {/* dipôle étudié */}
      <group position={[1.0, 0, -1.0]}>
        {dip === 'resistor' && (
          <group>
            <Resistor ohms={p.R} glowRef={(m) => (res.current = m)} />
          </group>
        )}
        {dip === 'lampe' && <Lamp glowRef={glow} />}
        {dip === 'diode' && <Diode />}
        {(dip === 'moteur' || pou) && <Motor fanRef={fan} />}
        {dip === 'pile' && (
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.3, 0.2, 0.3]} />
            <meshStandardMaterial color="#2a2d33" />
          </mesh>
        )}
        <Html position={[0, 0.85, 0]} center zIndexRange={[10, 0]}>
          <span className="lbl">{pou ? `Moteur E′ = ${p.Ep} V, r′ = ${p.rp} Ω` : { resistor: `R = ${p.R} Ω`, lampe: 'Lampe 12 V', diode: 'Diode', moteur: `Moteur (E′, r′)`, pile: '' }[dip]}</span>
        </Html>
      </group>
      {/* ampèremètre (série) et voltmètre (dérivation) */}
      <group position={[0.2, 0, 0.9]} rotation={[0, 0.15, 0]}>
        <Multimeter textRef={aText} label="A" />
      </group>
      <group position={[2.6, 0, 0.3]} rotation={[0, -0.4, 0]}>
        <Multimeter textRef={vText} label="V" />
      </group>
      {/* câblage */}
      <Lead smooth metal={false} color={RED} radius={0.025} points={[[-2.4, 0.3, -0.5], [-1.9, 0.15, -1.0], [-1.4, Y, -1.0]]} />
      <Lead smooth metal={false} color={RED} radius={0.025} points={[[-0.2, Y, -1.0], [0.2, Y, -1.0], [0.45, Y, -1.0]]} />
      <Lead smooth metal={false} color={BLACK} radius={0.025} points={[[1.6, Y, -1.0], [2.0, Y, -0.6], [1.2, Y, 0.6], [0.6, 0.2, 0.95]]} />
      <Lead smooth metal={false} color={BLACK} radius={0.025} points={[[-0.1, 0.2, 1.1], [-1.2, Y, 1.2], [-2.0, 0.1, 0.7], [-2.4, 0.3, 0.5]]} />
      <Lead smooth metal={false} color={RED} radius={0.018} points={[[0.45, Y, -1.0], [1.4, 0.6, -0.4], [2.45, 0.25, 0.15]]} />
      <Lead smooth metal={false} color={BLACK} radius={0.018} points={[[1.6, Y, -1.0], [2.4, 0.5, -0.3], [2.75, 0.25, 0.1]]} />
    </group>
  )
}
