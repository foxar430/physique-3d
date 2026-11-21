import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { Wire, Polyline, Node, makePath } from './Wire.jsx'

/*
 * Circuit générique sur une plaque d'essai (vue de dessus : x → droite, z → observateur).
 *
 *   E(+)──1  K  P ──[ top[0] ]──[ top[1] ]── TR
 *    │       2                               │
 *    │       │                           [ right ]
 *   E(−)─────J───────────────────────────── BR
 *
 * K en 1 : maille du générateur. K en 2 : maille sans générateur (P→…→J→2).
 * Sens positif du courant : de P vers la droite dans la branche du haut.
 */
const Y = 0.05
const SX = -2.6 // abscisse du générateur
const BAT_P = [SX, Y, -0.8]
const BAT_N = [SX, Y, 0.8]
const TL = [SX, Y, -1.2]
const BL = [SX, Y, 1.2]
const T1 = [-1.5, Y, -1.2]
const P = [-0.7, Y, -1.2]
const T2 = [-0.7, Y, -0.4]
const TOP_A = -0.2
const TOP_B = 2.3
const TR = [2.6, Y, -1.2]
const RIGHT_A = -0.55
const RIGHT_B = 0.55
const BR = [2.6, Y, 1.2]
const J = [-0.7, Y, 1.2]
const N_DOTS = 52

const LEN = { R: 0.8, L: 0.95, C: 0.26 }

function Label({ at, children, className = 'lbl' }) {
  return (
    <Html position={at} center className={className} zIndexRange={[10, 0]}>
      {children}
    </Html>
  )
}

/* ---------- composants, construits le long de +x et centrés ---------- */

function Resistor({ glowRef }) {
  return (
    <group position={[0, 0.12, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.8, 24]} />
        <meshStandardMaterial ref={glowRef} color="#d8c7a0" emissive="#ff5a1f" emissiveIntensity={0} roughness={0.6} />
      </mesh>
      {[-0.25, -0.12, 0.01, 0.25].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.155, 0.155, 0.05, 24]} />
          <meshStandardMaterial color={['#8b4513', '#111', '#e0a000', '#c9a227'][i]} />
        </mesh>
      ))}
      <Wire a={[-0.4, 0, 0]} b={[-0.4, -0.07, 0]} />
      <Wire a={[0.4, 0, 0]} b={[0.4, -0.07, 0]} />
    </group>
  )
}

function useHelixX(turns, radius, length, wire) {
  return useMemo(() => {
    class Helix extends THREE.Curve {
      getPoint(u, out = new THREE.Vector3()) {
        const a = u * turns * Math.PI * 2
        return out.set((u - 0.5) * length, radius * Math.cos(a), radius * Math.sin(a))
      }
    }
    return new THREE.TubeGeometry(new Helix(), turns * 20, wire, 6, false)
  }, [turns, radius, length, wire])
}

function Coil({ glowRef }) {
  const helix = useHelixX(13, 0.2, 0.8, 0.028)
  return (
    <group position={[0, 0.25, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.95, 24]} />
        <meshStandardMaterial ref={glowRef} color="#5c6670" metalness={0.6} roughness={0.4} emissive="#4da3ff" emissiveIntensity={0} />
      </mesh>
      <mesh geometry={helix} castShadow>
        <meshStandardMaterial color="#c8873a" metalness={0.7} roughness={0.3} />
      </mesh>
      <Wire a={[-0.4, 0.2, 0]} b={[-0.475, -0.2, 0]} />
      <Wire a={[0.4, 0.2, 0]} b={[0.475, -0.2, 0]} />
    </group>
  )
}

function Capacitor({ plateA, plateB, field }) {
  return (
    <group position={[0, 0.4, 0]}>
      <mesh position={[-0.12, 0, 0]} castShadow>
        <boxGeometry args={[0.05, 0.7, 0.9]} />
        <meshStandardMaterial ref={plateA} color="#9aa3ad" metalness={0.8} roughness={0.25} emissive="#ff3b30" emissiveIntensity={0} />
      </mesh>
      <mesh position={[0.12, 0, 0]} castShadow>
        <boxGeometry args={[0.05, 0.7, 0.9]} />
        <meshStandardMaterial ref={plateB} color="#9aa3ad" metalness={0.8} roughness={0.25} emissive="#2f7bff" emissiveIntensity={0} />
      </mesh>
      <mesh>
        <boxGeometry args={[0.19, 0.66, 0.86]} />
        <meshBasicMaterial ref={field} color="#ffd54a" transparent opacity={0} depthWrite={false} />
      </mesh>
      <Wire a={[-0.12, -0.35, 0]} b={[-0.12, -0.33, 0]} />
    </group>
  )
}

/**
 * Place un composant sur le segment [a, b] (axe 'x' ou 'z') et le relie par des fils.
 * Retourne aussi la zone où les porteurs sont cachés (diélectrique d'un condensateur).
 */
function Slot({ el, a, b, axis, refs }) {
  const len = LEN[el.type]
  const c = a.map((v, i) => (v + b[i]) / 2)
  const dir = axis === 'x' ? [1, 0, 0] : [0, 0, 1]
  const e1 = c.map((v, i) => v - (dir[i] * len) / 2)
  const e2 = c.map((v, i) => v + (dir[i] * len) / 2)
  const rot = axis === 'x' ? 0 : -Math.PI / 2
  return (
    <>
      <Wire a={a} b={e1} />
      <Wire a={e2} b={b} />
      <group position={c} rotation={[0, rot, 0]}>
        {el.type === 'R' && <Resistor glowRef={(m) => m && refs.resistors.add(m)} />}
        {el.type === 'L' && <Coil glowRef={(m) => m && refs.coils.add(m)} />}
        {el.type === 'C' && (
          <Capacitor
            plateA={(m) => m && refs.platesA.add(m)}
            plateB={(m) => m && refs.platesB.add(m)}
            field={(m) => m && refs.fields.add(m)}
          />
        )}
      </group>
      <Label at={[c[0] + (axis === 'z' ? 0.75 : 0), 0.95, c[2] + (axis === 'x' ? -0.45 : 0)]} className="lbl big">
        {el.label}
      </Label>
    </>
  )
}

function slotsAlong(n, a, b) {
  const out = []
  for (let k = 0; k < n; k++) out.push([a + ((b - a) * k) / n, a + ((b - a) * (k + 1)) / n])
  return out
}

/** Zones (boîtes alignées) où les porteurs ne sont pas dessinés. */
function hiddenZones(top, right) {
  const zones = [{ x: [SX - 0.01, SX + 0.01], z: [-0.8, 0.8] }] // intérieur du générateur
  slotsAlong(top.length, TOP_A, TOP_B).forEach(([a, b], k) => {
    if (top[k].type === 'C') {
      const c = (a + b) / 2
      zones.push({ x: [c - 0.12, c + 0.12], z: [-1.21, -1.19] })
    }
  })
  if (right?.type === 'C') zones.push({ x: [2.59, 2.61], z: [-0.12, 0.12] })
  return zones
}

export default function CircuitScene({ sim, source = 'battery', hasSwitch = true, onToggle, top, right, current, charge, meter, sourceText }) {
  const lever = useRef()
  const dots = useRef()
  const meterText = useRef()
  const srcText = useRef()
  const refs = useMemo(
    () => ({ resistors: new Set(), coils: new Set(), platesA: new Set(), platesB: new Set(), fields: new Set() }),
    [],
  )
  const paths = useMemo(
    () => ({
      1: makePath([BAT_P, TL, T1, P, TR, BR, J, BL, BAT_N, BAT_P]),
      2: makePath([P, TR, BR, J, T2, P]),
    }),
    [],
  )
  const zones = useMemo(() => hiddenZones(top, right), [top, right])
  const phase = useRef(0)
  const lastT = useRef(0)
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), v: new THREE.Vector3(), s: new THREE.Vector3(), q: new THREE.Quaternion() }), [])
  const red = useMemo(() => new THREE.Color('#ff3b30'), [])
  const blue = useMemo(() => new THREE.Color('#2f7bff'), [])

  useFrame((_, delta) => {
    const s = sim.stateRef.current
    const p = sim.paramsRef.current
    const k = hasSwitch ? s.k : 1
    const ratio = THREE.MathUtils.clamp(current(s, p), -1, 1)
    const r2 = ratio * ratio

    if (lever.current) {
      const target = k === 1 ? Math.PI : -Math.PI / 2
      lever.current.rotation.y = THREE.MathUtils.damp(lever.current.rotation.y, target, 12, delta)
    }
    refs.resistors.forEach((m) => (m.emissiveIntensity = 2.2 * r2))
    refs.coils.forEach((m) => (m.emissiveIntensity = 2.5 * r2))
    if (charge) {
      const f = THREE.MathUtils.clamp(charge(s, p), -1, 1)
      const a = Math.abs(f)
      refs.platesA.forEach((m) => {
        m.emissive.copy(f >= 0 ? red : blue)
        m.emissiveIntensity = 1.6 * a
      })
      refs.platesB.forEach((m) => {
        m.emissive.copy(f >= 0 ? blue : red)
        m.emissiveIntensity = 1.6 * a
      })
      refs.fields.forEach((m) => (m.opacity = 0.35 * a))
    }

    // porteurs : vitesse visuelle ∝ i (signée), seulement quand la simulation avance
    const advancing = s.t > lastT.current
    if (s.t < lastT.current) phase.current = 0
    lastT.current = s.t
    if (advancing) phase.current += ratio * delta * 2.4
    const path = paths[k]
    const show = Math.abs(ratio) > 0.004
    for (let n = 0; n < N_DOTS; n++) {
      path.at((n / N_DOTS) * path.total + phase.current, tmp.v)
      let hidden = !show
      for (const zn of zones) {
        if (tmp.v.x >= zn.x[0] && tmp.v.x <= zn.x[1] && tmp.v.z > zn.z[0] && tmp.v.z < zn.z[1]) hidden = true
      }
      tmp.s.setScalar(hidden ? 0 : 1)
      tmp.v.y = Y + 0.02
      tmp.m.compose(tmp.v, tmp.q, tmp.s)
      dots.current.setMatrixAt(n, tmp.m)
    }
    dots.current.instanceMatrix.needsUpdate = true

    if (meterText.current && meter) meterText.current.textContent = meter.value(s, p)
    if (srcText.current && sourceText) srcText.current.textContent = sourceText(s, p)
  })

  const topSlots = slotsAlong(top.length, TOP_A, TOP_B)

  return (
    <group>
      <mesh position={[0.5, -0.06, 0]} receiveShadow>
        <boxGeometry args={[8.2, 0.12, 3.8]} />
        <meshStandardMaterial color="#2a3b33" roughness={0.9} />
      </mesh>

      {/* générateur */}
      {source === 'battery' ? (
        <>
          <group position={[SX, 0.3, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.3, 0.3, 1.5, 32]} />
              <meshStandardMaterial color="#2b2f36" metalness={0.3} roughness={0.5} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.55]}>
              <cylinderGeometry args={[0.305, 0.305, 0.4, 32]} />
              <meshStandardMaterial color="#c98a2e" metalness={0.5} roughness={0.4} />
            </mesh>
          </group>
          <Label at={[SX - 0.7, 0.35, -0.6]}>+</Label>
          <Label at={[SX - 0.7, 0.35, 0.6]}>−</Label>
          <Label at={[SX - 0.6, 0.9, 0]} className="lbl big">E</Label>
        </>
      ) : (
        <group position={[SX - 0.15, 0.4, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.9, 0.8, 1.6]} />
            <meshStandardMaterial color="#3b4a63" roughness={0.6} />
          </mesh>
          <Html position={[0, 0.6, 0]} center className="vm" zIndexRange={[10, 0]}>
            <div className="vm-screen gbf">
              <small>GBF ∿</small>
              <b ref={srcText}>—</b>
            </div>
          </Html>
        </group>
      )}

      {/* fils et interrupteur */}
      <Polyline points={[BAT_P, TL, T1]} />
      {hasSwitch ? (
        <>
          <Node at={T1} />
          <Node at={T2} />
          <Node at={P} />
          <Wire a={T2} b={J} />
          <group ref={lever} position={[P[0], Y + 0.08, P[2]]} rotation={[0, Math.PI, 0]}>
            <mesh
              position={[0.4, 0, 0]}
              castShadow
              onClick={(e) => {
                e.stopPropagation()
                onToggle?.()
              }}
              onPointerOver={() => (document.body.style.cursor = 'pointer')}
              onPointerOut={() => (document.body.style.cursor = '')}
            >
              <boxGeometry args={[0.85, 0.07, 0.12]} />
              <meshStandardMaterial color="#e8e2d0" metalness={0.4} roughness={0.3} />
            </mesh>
            <mesh position={[0.4, 0.12, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.2, 12]} />
              <meshStandardMaterial color="#b3261e" />
            </mesh>
          </group>
          <Label at={[-1.15, 0.6, -1.65]} className="lbl big">K</Label>
          <Label at={[-1.55, 0.35, -0.9]}>1</Label>
          <Label at={[-0.35, 0.35, -0.4]}>2</Label>
        </>
      ) : (
        <Wire a={T1} b={P} />
      )}
      <Wire a={P} b={[TOP_A, Y, -1.2]} />
      {top.map((el, k) => (
        <Slot key={k} el={el} a={[topSlots[k][0], Y, -1.2]} b={[topSlots[k][1], Y, -1.2]} axis="x" refs={refs} />
      ))}
      <Polyline points={[[TOP_B, Y, -1.2], TR, [2.6, Y, RIGHT_A]]} />
      {right ? (
        <Slot el={right} a={[2.6, Y, RIGHT_A]} b={[2.6, Y, RIGHT_B]} axis="z" refs={refs} />
      ) : (
        <Wire a={[2.6, Y, RIGHT_A]} b={[2.6, Y, RIGHT_B]} />
      )}
      <Polyline points={[[2.6, Y, RIGHT_B], BR, J, BL, BAT_N]} />

      {/* appareil de mesure aux bornes de la branche de droite */}
      {meter && (
        <>
          <group position={[3.85, 0.25, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.7, 0.5, 0.9]} />
              <meshStandardMaterial color="#e6b400" roughness={0.6} />
            </mesh>
            <Html position={[0, 0.45, 0]} center className="vm" zIndexRange={[10, 0]}>
              <div className="vm-screen">
                <small>{meter.label}</small>
                <b ref={meterText}>—</b>
              </div>
            </Html>
          </group>
          <Wire a={[3.5, Y, -0.25]} b={[2.6, Y, -0.8]} color="#d33" radius={0.018} />
          <Wire a={[3.5, Y, 0.25]} b={[2.6, Y, 0.8]} color="#222" radius={0.018} />
        </>
      )}

      <instancedMesh ref={dots} args={[null, null, N_DOTS]}>
        <sphereGeometry args={[0.055, 10, 8]} />
        <meshBasicMaterial color="#ffe066" />
      </instancedMesh>
    </group>
  )
}
