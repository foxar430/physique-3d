import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Lead } from '../../components/three/Wire.jsx'
import { N0, NUCLIDES, passes } from './model.js'

const SY = 0.95 // hauteur de l'échantillon
const SAMPLE_X = -1.6
const ABS_X = 0.25
const GM_X = 1.55
const SIDE = 8 // 8×8×8 = 512 noyaux
const GAP = 0.085
const POOL = 120
const steel = { color: '#c9ced6', metalness: 0.95, roughness: 0.2 }
const PARENT = new THREE.Color('#ff8a3d')
const DAUGHTER = new THREE.Color('#4b5563')
const FLASH = new THREE.Color('#ffffff')
const PCOLOR = { α: new THREE.Color('#ffcc33'), 'β⁻': new THREE.Color('#3e9bff'), 'β⁺': new THREE.Color('#ff5577'), γ: new THREE.Color('#7dff6a') }
const SPEED = { α: 2.2, 'β⁻': 4.2, 'β⁺': 4.2, γ: 7.5 }
const SIZE = { α: 0.055, 'β⁻': 0.028, 'β⁺': 0.028, γ: 0.022 }

function LeadCastle() {
  const bricks = []
  // mur avant abaissé pour voir l'échantillon
  for (const y of [0.18, 0.5, 0.82, 1.14, 1.46]) bricks.push([SAMPLE_X, y, -0.62, 1.0, 0.3, 0.22])
  bricks.push([SAMPLE_X, 0.18, 0.62, 1.0, 0.3, 0.22])
  for (const y of [0.18, 0.5, 0.82, 1.14, 1.46]) bricks.push([SAMPLE_X - 0.62, y, 0, 0.22, 0.3, 1.46])
  bricks.push([SAMPLE_X - 0.1, 1.68, 0, 1.24, 0.14, 1.46])
  return (
    <group>
      {bricks.map(([x, y, z, w, h, d], i) => (
        <RoundedBox key={i} args={[w, h, d]} radius={0.02} position={[x, y, z]} castShadow receiveShadow>
          <meshStandardMaterial color="#6b7280" metalness={0.55} roughness={0.55} />
        </RoundedBox>
      ))}
      <Html position={[SAMPLE_X - 0.2, 1.95, 0]} center zIndexRange={[10, 0]}>
        <span className="lbl">Château de plomb</span>
      </Html>
    </group>
  )
}

function Absorber({ kind }) {
  if (kind === 'none') return null
  const props = {
    paper: { t: 0.01, color: '#f5f1e6', metal: 0, rough: 0.9, label: 'Papier' },
    alu: { t: 0.05, color: '#d4d8de', metal: 0.9, rough: 0.3, label: 'Aluminium' },
    lead: { t: 0.2, color: '#6b7280', metal: 0.5, rough: 0.55, label: 'Plomb' },
  }[kind]
  return (
    <group position={[ABS_X, 0, 0]}>
      <mesh position={[0, SY, 0]} castShadow>
        <boxGeometry args={[props.t, 0.9, 0.9]} />
        <meshStandardMaterial color={props.color} metalness={props.metal} roughness={props.rough} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.3, 0.06, 0.4]} />
        <meshStandardMaterial color="#2a2d33" />
      </mesh>
      <mesh position={[0, (SY - 0.45 + 0.25) / 2, 0]}>
        <boxGeometry args={[0.04, SY - 0.45 - 0.25, 0.04]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <Html position={[0, SY + 0.62, 0]} center zIndexRange={[10, 0]}>
        <span className="lbl">{props.label}</span>
      </Html>
    </group>
  )
}

function Geiger({ glowRef, textRef }) {
  return (
    <group>
      {/* sonde Geiger-Müller */}
      <group position={[GM_X + 0.55, SY, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.13, 0.13, 1.1, 32]} />
          <meshStandardMaterial color="#d6d9de" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[-0.56, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.14, 0.14, 0.04, 32]} />
          <meshStandardMaterial color="#1d1f24" />
        </mesh>
        <mesh position={[-0.585, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <circleGeometry args={[0.1, 32]} />
          <meshStandardMaterial ref={glowRef} color="#3a2a1a" emissive="#ffb347" emissiveIntensity={0} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.45, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.6, 12]} />
          <meshStandardMaterial {...steel} />
        </mesh>
        <Html position={[0.1, 0.38, 0]} center zIndexRange={[10, 0]}>
          <span className="lbl">Compteur Geiger-Müller</span>
        </Html>
      </group>
      {/* compteur */}
      <group position={[3.3, 0, 0.9]} rotation={[0, -0.5, 0]}>
        <RoundedBox args={[1.1, 0.55, 0.7]} radius={0.06} position={[0, 0.28, 0]} castShadow>
          <meshStandardMaterial color="#e3c443" roughness={0.5} />
        </RoundedBox>
        <Html position={[0, 0.62, 0.2]} center zIndexRange={[10, 0]}>
          <div className="vm-screen">
            <small>COMPTAGE</small>
            <b ref={textRef}>0</b>
          </div>
        </Html>
      </group>
      <Lead smooth metal={false} color="#22252a" radius={0.025} points={[[GM_X + 1.1, SY, 0], [GM_X + 1.4, SY - 0.1, 0], [2.95, 0.3, 0.6], [3.0, 0.2, 0.75]]} />
    </group>
  )
}

export default function DecayScene({ sim }) {
  const nuclei = useRef()
  const parts = useRef()
  const glow = useRef()
  const counter = useRef()
  const st = useMemo(
    () => ({
      last: 0,
      count: 0,
      flash: new Float32Array(N0),
      p: Array.from({ length: POOL }, () => ({ alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), kind: 'α', aimed: false, stop: Infinity, life: 0, counted: false })),
      next: 0,
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      s: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
      c: new THREE.Color(),
      dir: new THREE.Vector3(),
      gm: 0,
    }),
    [],
  )
  const home = useMemo(() => {
    const out = []
    for (let i = 0; i < SIDE; i++) for (let j = 0; j < SIDE; j++) for (let k = 0; k < SIDE; k++)
      out.push(new THREE.Vector3(SAMPLE_X + (i - 3.5) * GAP, SY + (j - 3.5) * GAP, (k - 3.5) * GAP))
    return out
  }, [])

  const spawn = (origin, kind, absorber) => {
    const P = st.p[st.next]
    st.next = (st.next + 1) % POOL
    P.alive = true
    P.kind = kind
    P.pos.copy(origin)
    P.life = 0
    P.counted = false
    P.aimed = Math.random() < 0.45
    if (P.aimed) P.vel.set(1, (Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.12)
    else {
      // directions vers l'ouverture du château (+x), avec un large cône
      P.vel.set(0.2 + Math.random(), (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.6)
    }
    P.vel.normalize().multiplyScalar(SPEED[kind])
    const k = kind.startsWith('β') ? 'β' : kind === 'γ' ? 'γ' : 'α'
    P.stop = absorber !== 'none' && Math.random() >= passes(k, absorber) ? ABS_X - 0.05 : Infinity
    if (kind === 'α' && absorber === 'none') P.stop = Infinity
  }

  useFrame((_, delta) => {
    const s = sim.stateRef.current
    const p = sim.paramsRef.current
    const nuc = NUCLIDES[p.nuc]
    const types = nuc.type === 'β⁻ + γ' ? ['β⁻', 'γ'] : [nuc.type]

    // remise à zéro
    if (s.idx < st.last) {
      st.last = 0
      st.count = 0
      st.flash.fill(0)
      st.p.forEach((P) => (P.alive = false))
    }
    // nouvelles désintégrations
    let spawned = 0
    for (let k = st.last; k < s.idx; k++) {
      const id = s.list[k].id
      st.flash[id] = 1
      if (spawned < 14) {
        types.forEach((t) => spawn(home[id], t, p.absorber))
        spawned++
      }
    }
    st.last = s.idx
    const decayed = new Set()
    for (let k = 0; k < s.idx; k++) decayed.add(s.list[k].id)

    // couleurs et positions des noyaux (légère agitation thermique)
    for (let i = 0; i < N0; i++) {
      st.flash[i] = Math.max(0, st.flash[i] - delta * 3)
      st.c.copy(decayed.has(i) ? DAUGHTER : PARENT).lerp(FLASH, st.flash[i])
      nuclei.current.setColorAt(i, st.c)
      st.s.setScalar(decayed.has(i) ? 0.75 : 1)
      st.m.compose(home[i], st.q.identity(), st.s)
      nuclei.current.setMatrixAt(i, st.m)
    }
    nuclei.current.instanceMatrix.needsUpdate = true
    nuclei.current.instanceColor.needsUpdate = true

    // particules
    const running = sim.running
    for (let i = 0; i < POOL; i++) {
      const P = st.p[i]
      if (P.alive && running) {
        P.life += delta
        P.pos.addScaledVector(P.vel, delta)
        if (P.pos.x > P.stop) {
          P.pos.x = P.stop
          P.vel.set(0, 0, 0)
        }
        if (P.aimed && !P.counted && P.pos.x >= GM_X - 0.05) {
          P.counted = true
          st.count++
          st.gm = 1
          P.alive = false
        }
        // absorbées par les murs du château de plomb
        if (P.pos.x < SAMPLE_X + 0.5 && (Math.abs(P.pos.z) > 0.5 || P.pos.y > SY + 0.6 || P.pos.x < SAMPLE_X - 0.5)) P.alive = false
        const range = P.kind === 'α' ? 3.4 : 6
        if (P.life > 1.6 || P.pos.length() > range + 3 || (P.vel.lengthSq() === 0 && P.life > 0.5)) P.alive = false
      }
      if (P.alive) {
        st.s.setScalar(SIZE[P.kind] / 0.05)
        if (P.kind === 'γ' && P.vel.lengthSq() > 0) {
          st.q.setFromUnitVectors(st.up, st.dir.copy(P.vel).normalize())
          st.s.set(0.5, 4, 0.5)
        } else st.q.identity()
        st.m.compose(P.pos, st.q, st.s)
      } else {
        st.s.setScalar(0)
        st.m.compose(P.pos, st.q.identity(), st.s)
      }
      parts.current.setMatrixAt(i, st.m)
      parts.current.setColorAt(i, PCOLOR[P.kind])
    }
    parts.current.instanceMatrix.needsUpdate = true
    parts.current.instanceColor.needsUpdate = true

    st.gm = Math.max(0, st.gm - delta * 6)
    if (glow.current) glow.current.emissiveIntensity = 3 * st.gm
    if (counter.current) counter.current.textContent = String(st.count)
  })

  return (
    <group>
      <mesh position={[0.6, -0.08, 0]} receiveShadow>
        <boxGeometry args={[9.5, 0.16, 4.4]} />
        <meshStandardMaterial color="#4a3a2c" roughness={0.8} />
      </mesh>
      <LeadCastle />
      {/* porte-échantillon */}
      <mesh position={[SAMPLE_X, 0.3, 0]}>
        <cylinderGeometry args={[0.3, 0.35, 0.3, 32]} />
        <meshStandardMaterial color="#2a2d33" />
      </mesh>
      <mesh position={[SAMPLE_X, (SY - 0.38 + 0.45) / 2, 0]}>
        <cylinderGeometry args={[0.04, 0.04, SY - 0.38 - 0.45, 12]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <instancedMesh ref={nuclei} args={[null, null, N0]}>
        <sphereGeometry args={[0.034, 14, 10]} />
        <meshStandardMaterial roughness={0.35} metalness={0.1} emissive="#3a1a00" emissiveIntensity={0.4} />
      </instancedMesh>
      <instancedMesh ref={parts} args={[null, null, POOL]}>
        <sphereGeometry args={[0.05, 10, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <Absorber kind={sim.paramsRef.current.absorber} />
      <Geiger glowRef={glow} textRef={counter} />
    </group>
  )
}
