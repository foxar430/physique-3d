import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { color } from './chem.js'
import { grab, moveHeld, release, isContainer, readPH, buretteReading, canTarget, canFillBurette } from './lab.js'
import { steel } from '../components/three/Lab.jsx'

/* Dimensions de la verrerie (unités de scène ≈ 10 cm) */
const GEO = {
  beaker: { r: 0.3, h: 0.72 },
  erlen: { r: 0.32, h: 0.7, neck: 0.11 },
  tube: { r: 0.08, h: 0.75 },
  bottle: { r: 0.24, h: 0.72 },
  dropper: { r: 0.12, h: 0.34 },
  eprouvette: { r: 0.1, h: 1.0 },
  pipette: { r: 0.03, h: 1.25 },
}
export const BURETTE_X = -0.2
export const BURETTE_Z = -0.55
const STIR_Y = 0.18

const glassMat = <meshPhysicalMaterial color="#eaf6ff" transparent opacity={0.22} roughness={0.03} metalness={0} clearcoat={1} side={THREE.DoubleSide} depthWrite={false} />

/** hauteur du bord supérieur d'un objet (pour verser au-dessus) */
export const topOf = (o) => (GEO[o.kind]?.h ?? 0.6) + o.pos[1]

/** liquide : cylindre (ou cône pour l'erlenmeyer) coloré selon la composition */
function Liquid({ item, r, h, cone }) {
  const mesh = useRef()
  const mat = useRef()
  useFrame(() => {
    const sol = item.sol
    const f = Math.min(1, sol.V / item.cap)
    const level = Math.max(0.001, f * h * 0.92)
    mesh.current.visible = sol.V > 1e-7
    mesh.current.scale.set(1, level, 1)
    mesh.current.position.y = level / 2 + 0.01
    const c = color(sol)
    mat.current.color.setRGB(...c.rgb)
    mat.current.opacity = c.alpha
    if (cone) {
      const rr = r * (1 - (level / h) * (1 - 0.35))
      mesh.current.scale.x = mesh.current.scale.z = 1
      mesh.current.geometry.parameters // forme approchée : on garde le tronc de cône de base
      void rr
    }
  })
  return (
    <mesh ref={mesh}>
      {cone ? <cylinderGeometry args={[r * 0.55, r * 0.97, 1, 32]} /> : <cylinderGeometry args={[r * 0.95, r * 0.95, 1, 32]} />}
      <meshPhysicalMaterial ref={mat} transparent roughness={0.1} depthWrite={false} />
    </mesh>
  )
}

function Beaker({ item }) {
  const { r, h } = GEO.beaker
  return (
    <group>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[r, r, h, 40, 1, true]} />
        {glassMat}
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r, 40]} />
        {glassMat}
      </mesh>
      {[0.25, 0.4, 0.55].map((y) => (
        <mesh key={y} position={[0, y, r + 0.002]}>
          <boxGeometry args={[0.1, 0.006, 0.002]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      <Liquid item={item} r={r} h={h} />
    </group>
  )
}

function Erlen({ item }) {
  const { r, h, neck } = GEO.erlen
  const geo = useMemo(() => {
    const pts = [new THREE.Vector2(r, 0), new THREE.Vector2(r, 0.03), new THREE.Vector2(neck, h * 0.72), new THREE.Vector2(neck, h)]
    return new THREE.LatheGeometry(pts, 40)
  }, [r, h, neck])
  return (
    <group>
      <mesh geometry={geo}>{glassMat}</mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r, 40]} />
        {glassMat}
      </mesh>
      <Liquid item={item} r={r} h={h * 0.7} cone />
    </group>
  )
}

function Tube({ item }) {
  const { r, h } = GEO.tube
  return (
    <group>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[r, r, h, 24, 1, true]} />
        {glassMat}
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <sphereGeometry args={[r, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        {glassMat}
      </mesh>
      <Liquid item={item} r={r} h={h} />
      {/* portoir */}
      <mesh position={[0, 0.1, 0]}>
        <torusGeometry args={[r + 0.02, 0.012, 6, 24]} />
        <meshStandardMaterial color="#2a2d33" />
      </mesh>
    </group>
  )
}

/** texture d'étiquette : nom complet, formule, concentration, bandeau de couleur */
function useLabelTexture(tag, small) {
  return useMemo(() => {
    const W = 512
    const H = small ? 360 : 420
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const g = c.getContext('2d')
    g.fillStyle = '#fbf8f0'
    g.fillRect(0, 0, W, H)
    g.fillStyle = tag?.color ?? '#3e6fb8'
    g.fillRect(0, 0, W, 46)
    g.fillStyle = '#1b1d21'
    g.textAlign = 'center'
    const wrap = (text, y, size, weight = 700) => {
      g.font = `${weight} ${size}px system-ui, sans-serif`
      const words = String(text).split(' ')
      const lines = []
      let line = ''
      for (const w of words) {
        const test = line ? line + ' ' + w : w
        if (g.measureText(test).width > W - 40 && line) {
          lines.push(line)
          line = w
        } else line = test
      }
      lines.push(line)
      lines.forEach((l, i) => g.fillText(l, W / 2, y + i * size * 1.1))
      return y + lines.length * size * 1.1
    }
    let y = 100
    y = wrap(tag?.name ?? '', y, small ? 50 : 54)
    if (tag?.formula) y = wrap(tag.formula, y + 8, small ? 44 : 50, 600)
    if (tag?.conc) {
      g.fillStyle = '#c0392b'
      wrap(tag.conc, y + 10, small ? 46 : 52, 800)
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [tag?.name, tag?.formula, tag?.conc, tag?.color, small])
}

function Bottle({ item }) {
  const dropper = item.kind === 'dropper'
  const { r, h } = dropper ? GEO.dropper : GEO.bottle
  const c = color(item.sol)
  const brown = item.brown
  const tex = useLabelTexture(item.tag ?? { name: item.label }, dropper)
  const lh = h * (dropper ? 0.7 : 0.62)
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[r, r, h, 32]} />
        <meshPhysicalMaterial color={brown ? '#6b3a12' : '#eaf6ff'} transparent opacity={brown ? 0.85 : 0.35} roughness={0.05} clearcoat={1} />
      </mesh>
      {!brown && (
        <mesh position={[0, h * 0.4, 0]}>
          <cylinderGeometry args={[r * 0.92, r * 0.92, h * 0.78, 24]} />
          <meshStandardMaterial color={new THREE.Color(...c.rgb)} transparent opacity={Math.max(0.3, c.alpha)} />
        </mesh>
      )}
      <mesh position={[0, h + 0.05, 0]}>
        <cylinderGeometry args={[r * 0.45, r * 0.5, 0.1, 20]} />
        <meshStandardMaterial color={dropper ? '#1b1d21' : item.tag?.color ?? '#2f6db3'} roughness={0.5} />
      </mesh>
      {dropper && (
        <mesh position={[0, h + 0.16, 0]}>
          <sphereGeometry args={[0.05, 16, 12]} />
          <meshStandardMaterial color="#1b1d21" />
        </mesh>
      )}
      {/* étiquette imprimée, courbée sur la face avant */}
      <mesh position={[0, h * 0.5, 0]}>
        <cylinderGeometry args={[r + 0.004, r + 0.004, lh, 32, 1, true, -1.15, 2.3]} />
        <meshStandardMaterial map={tex} roughness={0.7} />
      </mesh>
    </group>
  )
}

function Eprouvette({ item }) {
  const { r, h } = GEO.eprouvette
  return (
    <group>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.18, 0.2, 0.04, 24]} />
        {glassMat}
      </mesh>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[r, r, h, 24, 1, true]} />
        {glassMat}
      </mesh>
      {Array.from({ length: 10 }, (_, k) => (
        <mesh key={k} position={[0, 0.1 + (k * (h - 0.15)) / 10, r + 0.002]}>
          <boxGeometry args={[k % 5 === 0 ? 0.08 : 0.04, 0.005, 0.002]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      <Liquid item={item} r={r} h={h} />
    </group>
  )
}

function Pipette({ item }) {
  const { r, h } = GEO.pipette
  const liq = useRef()
  useFrame(() => {
    const full = item.sol.V > 1e-7 || (item.filling ?? 0) > 0
    liq.current.visible = full
    const f = item.sol.V > 1e-7 ? item.sol.V / item.cap : (item.filling ?? 0) / item.cap
    liq.current.scale.y = Math.max(0.01, f)
    const c = color(item.sol.V > 1e-7 ? item.sol : { V: 1, n: {} })
    liq.current.material.color.setRGB(...c.rgb)
  })
  return (
    <group>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[r, r * 0.4, h, 12]} />
        {glassMat}
      </mesh>
      <mesh position={[0, h * 0.45, 0]}>
        <sphereGeometry args={[0.07, 20, 14]} />
        {glassMat}
      </mesh>
      <group position={[0, 0.05, 0]}>
        <mesh ref={liq} position={[0, h * 0.4, 0]} scale={[1, 0.01, 1]}>
          <cylinderGeometry args={[0.05, 0.05, h * 0.8, 12]} />
          <meshStandardMaterial color="#cfe8ff" transparent opacity={0.8} />
        </mesh>
      </group>
      {/* trait de jauge */}
      <mesh position={[0, h * 0.82, 0]}>
        <torusGeometry args={[r + 0.004, 0.004, 4, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* propipette */}
      <mesh position={[0, h + 0.08, 0]}>
        <sphereGeometry args={[0.08, 20, 14]} />
        <meshStandardMaterial color="#c0392b" roughness={0.6} />
      </mesh>
    </group>
  )
}

function Probe({ item }) {
  return (
    <group>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.9, 16]} />
        <meshStandardMaterial color="#1b1d21" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <sphereGeometry args={[0.045, 16, 12]} />
        <meshPhysicalMaterial color="#cfe8ff" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, 0.97, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.08, 16]} />
        <meshStandardMaterial color="#e0a000" />
      </mesh>
    </group>
  )
}

/** position de l'étiquette : devant le pied des flacons (étagère), au-dessus des autres objets */
const labelPos = (item) =>
  item.labelUp
    ? [0, (GEO[item.kind]?.h ?? 0.6) + 0.32, 0]
    : item.kind === 'bottle' || item.kind === 'dropper' || item.kind === 'pipette' || item.kind === 'eprouvette' || item.kind === 'probe'
      ? [0, 0.02, (GEO[item.kind]?.r ?? 0.2) + 0.24]
      : [0, (GEO[item.kind]?.h ?? 0.6) + 0.28, 0]

const VIEW = { beaker: Beaker, erlen: Erlen, tube: Tube, bottle: Bottle, dropper: Bottle, eprouvette: Eprouvette, pipette: Pipette, probe: Probe }

/** objet déplaçable : suit la souris quand on le tient, s'incline pour verser */
function Item({ lab, item, onChange }) {
  const g = useRef()
  const label = useRef()
  const controls = useThree((s) => s.controls)
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.9), [])
  const hit = useMemo(() => new THREE.Vector3(), [])
  const View = VIEW[item.kind]

  useFrame((_, delta) => {
    const o = item
    let [x, y, z] = o.pos
    let tilt = 0
    // probe dans un récipient : suit le récipient
    if (o.kind === 'probe' && o.inside) {
      const c = lab.items[o.inside]
      x = c.pos[0] + 0.12
      y = c.pos[1] + 0.05
      z = c.pos[2] - 0.05
    }
    if (o.held && lab.hover) {
      const t = lab.hover === 'burette' ? { pos: [BURETTE_X, 0, BURETTE_Z], kind: 'burette' } : lab.items[lab.hover]
      const top = t.kind === 'burette' ? 2.55 : topOf(t)
      const pouring = lab.pour && lab.pour.from === o.id
      const filling = lab.pour && lab.pour.to === o.id && lab.pour.mode === 'fill'
      if (filling) {
        // la pipette / l'éprouvette plonge dans le flacon
        x = t.pos[0]
        z = t.pos[2]
        y = t.pos[1] + 0.12
      } else if (o.kind === 'pipette' || o.kind === 'dropper' || o.kind === 'probe') {
        x = t.pos[0]
        z = t.pos[2]
        y = top + (o.kind === 'pipette' ? -0.35 : 0.08)
      } else {
        x = t.pos[0] - 0.28
        z = t.pos[2]
        y = top + 0.1
        tilt = pouring ? 1.25 : 0.4
      }
    }
    const k = 1 - Math.exp(-delta * 18)
    g.current.position.x += (x - g.current.position.x) * k
    g.current.position.y += (y - g.current.position.y) * k
    g.current.position.z += (z - g.current.position.z) * k
    g.current.rotation.z += (-tilt - g.current.rotation.z) * k
    if (label.current) {
      const vol = o.sol.V > 1e-7 ? `${(o.sol.V * 1000).toFixed(1)} mL` : ''
      const isTarget = lab.hover === o.id
      const hovered = lab.hoverItem === o.id && !lab.held
      const tool = o.kind === 'bottle' || o.kind === 'dropper' || o.kind === 'probe'
      let txt = ''
      if (o.held) txt = o.label + (vol && !tool ? ' · ' + vol : '')
      else if (isTarget) txt = (lab.pour?.mode === 'fill' ? '↑ remplir depuis : ' : '↓ verser dans : ') + o.label + (vol && !tool ? ' · ' + vol : '')
      else if (hovered) txt = (o.tag ? o.tag.name + (o.tag.conc ? ' · ' + o.tag.conc : '') : o.label) + (vol && !tool ? ' · ' + vol : '')
      else if (lab.held) txt = '' // pendant un geste : seulement l'objet tenu et sa cible
      else if (isContainer(o)) txt = (o.short ?? o.label) + (vol ? (o.short ? '\n' : ' · ') + vol : '')
      else txt = (o.short ?? o.label) + (o.tag?.conc ? '\n' + o.tag.conc : '')
      label.current.textContent = txt
      label.current.style.display = txt ? '' : 'none'
      const chip = !o.held && !isTarget && !hovered
      label.current.className = 'lbl tiny chem-lbl' + (o.held ? ' held' : isTarget ? ' target' : chip ? ' chip' : '')
    }
  })

  const down = (e) => {
    e.stopPropagation()
    if (lab.held) return
    grab(lab, item.id)
    if (controls) controls.enabled = false
    e.target.setPointerCapture?.(e.pointerId)
    onChange()
  }
  const move = (e) => {
    if (lab.held !== item.id) return
    e.stopPropagation()
    if (e.ray.intersectPlane(plane, hit)) moveHeld(lab, THREE.MathUtils.clamp(hit.x, -4.2, 4.2), THREE.MathUtils.clamp(hit.z, -1.5, 1.6), e.ray, { x: e.clientX, y: e.clientY })
  }
  const up = (e) => {
    if (lab.held !== item.id) return
    e.stopPropagation()
    release(lab)
    if (controls) controls.enabled = true
    onChange()
  }

  return (
    <group
      ref={g}
      position={item.pos}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'grab'
        lab.hoverItem = item.id
      }}
      onPointerOut={() => {
        document.body.style.cursor = ''
        if (lab.hoverItem === item.id) lab.hoverItem = null
      }}
    >
      <View item={item} />
      {/* zone de saisie un peu plus large que l'objet */}
      <mesh position={[0, 0.4, 0]} visible={false}>
        <cylinderGeometry args={[0.32, 0.32, 0.9, 12]} />
        <meshBasicMaterial />
      </mesh>
      <Html position={labelPos(item)} center zIndexRange={[10, 0]}>
        <span ref={label} className="lbl tiny chem-lbl" />
      </Html>
    </group>
  )
}

/** anneau posé au sol sous un objet (surbrillance de cible) */
function TargetRing({ lab, item }) {
  const ref = useRef()
  const r = (GEO[item.kind]?.r ?? 0.3) + 0.1
  useFrame(() => {
    const heldObj = lab.held ? lab.items[lab.held] : null
    const cand = heldObj && canTarget(heldObj, item)
    ref.current.visible = !!cand
    if (!cand) return
    const active = lab.hover === item.id
    ref.current.material.color.set(active ? '#30d158' : '#ffd23f')
    ref.current.material.opacity = active ? 0.95 : 0.4 + 0.25 * Math.sin(performance.now() / 180)
    ref.current.position.set(item.pos[0], (item.pos[1] ?? 0) + 0.012, item.pos[2])
    ref.current.scale.setScalar(active ? 1.15 : 1)
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[r, r + 0.06, 48]} />
      <meshBasicMaterial transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

/** filet de liquide pendant un versement */
function Stream({ lab }) {
  const m = useRef()
  const mat = useRef()
  useFrame(() => {
    const p = lab.pour
    if (!p || p.mode === 'fill' || !lab.held) {
      m.current.visible = false
      return
    }
    const from = lab.items[p.from]
    const to = p.to === 'burette' ? null : lab.items[p.to]
    const tx = to ? to.pos[0] : BURETTE_X
    const tz = to ? to.pos[2] : BURETTE_Z
    const top = to ? topOf(to) : 2.5
    const surf = to ? to.pos[1] + 0.05 + (Math.min(1, to.sol.V / to.cap) * (GEO[to.kind]?.h ?? 0.6)) : 2.4
    const y0 = top + 0.12
    m.current.visible = true
    m.current.position.set(tx - (p.mode === 'drops' ? 0 : 0.02), (y0 + surf) / 2, tz)
    m.current.scale.set(p.mode === 'drops' ? 0.5 : 1, Math.max(0.01, y0 - surf), 1)
    const c = color(from.kind === 'bottle' || from.kind === 'dropper' ? { ...from.sol, V: 1 } : from.sol)
    mat.current.color.setRGB(...c.rgb)
  })
  return (
    <mesh ref={m} visible={false}>
      <cylinderGeometry args={[0.012, 0.012, 1, 8]} />
      <meshStandardMaterial ref={mat} transparent opacity={0.85} />
    </mesh>
  )
}

/** burette graduée sur son support, avec robinet cliquable */
function Burette({ lab, onChange }) {
  const col = useRef()
  const mat = useRef()
  const reading = useRef()
  const tap = useRef()
  const glow = useRef()
  const H = 1.5
  const y0 = 0.95 // bas de la colonne graduée
  useFrame(() => {
    const b = lab.burette
    const f = Math.min(1.08, b.sol.V / b.cap)
    col.current.visible = b.sol.V > 1e-7
    col.current.scale.y = Math.max(0.001, f * H)
    col.current.position.y = y0 + (f * H) / 2
    const c = color(b.sol)
    mat.current.color.setRGB(...c.rgb)
    tap.current.rotation.x = b.open ? Math.PI / 2 : 0
    const heldObj = lab.held ? lab.items[lab.held] : null
    const cand = canFillBurette(lab, heldObj)
    glow.current.visible = cand
    if (cand) {
      const active = lab.hover === 'burette'
      glow.current.material.color.set(active ? '#30d158' : '#ffd23f')
      glow.current.material.opacity = active ? 0.95 : 0.4 + 0.25 * Math.sin(performance.now() / 180)
    }
    if (reading.current) reading.current.textContent = b.sol.V < 1e-7 ? 'vide' : b.zeroed ? 'lu : ' + buretteReading(lab).toFixed(2) + ' mL' : (b.sol.V * 1000).toFixed(1) + ' mL dedans'
  })
  const setOpen = (v) => (e) => {
    e.stopPropagation()
    lab.burette.open = v
    onChange()
  }
  return (
    <group position={[BURETTE_X, 0, BURETTE_Z]}>
      {/* support */}
      <RoundedBox args={[0.9, 0.06, 0.6]} radius={0.02} position={[-0.25, 0.03, -0.1]}>
        <meshStandardMaterial color="#2a2d33" />
      </RoundedBox>
      <mesh position={[-0.55, 1.4, -0.1]}>
        <cylinderGeometry args={[0.03, 0.03, 2.8, 12]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <mesh position={[-0.28, 2.1, -0.05]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.55, 8]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      {/* repère : on peut remplir la burette par le haut */}
      <mesh ref={glow} position={[0, y0 + H + 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <torusGeometry args={[0.13, 0.025, 8, 32]} />
        <meshBasicMaterial transparent toneMapped={false} />
      </mesh>
      {/* tube gradué */}
      <mesh position={[0, y0 + H / 2 + 0.05, 0]}>
        <cylinderGeometry args={[0.045, 0.045, H + 0.2, 16, 1, true]} />
        {glassMat}
      </mesh>
      {Array.from({ length: 26 }, (_, k) => (
        <mesh key={k} position={[0, y0 + H - (k * H) / 25, 0.046]}>
          <boxGeometry args={[k % 5 === 0 ? 0.05 : 0.025, 0.004, 0.002]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      <mesh ref={col}>
        <cylinderGeometry args={[0.04, 0.04, 1, 12]} />
        <meshStandardMaterial ref={mat} transparent opacity={0.8} />
      </mesh>
      {/* pointe + robinet */}
      <mesh position={[0, y0 - 0.12, 0]}>
        <cylinderGeometry args={[0.02, 0.008, 0.22, 10]} />
        {glassMat}
      </mesh>
      <group
        position={[0, y0 - 0.05, 0]}
        onPointerDown={setOpen(true)}
        onPointerUp={setOpen(false)}
        onPointerLeave={() => lab.burette.open && (lab.burette.open = false)}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <mesh ref={tap}>
          <boxGeometry args={[0.24, 0.035, 0.035]} />
          <meshStandardMaterial color="#e5484d" />
        </mesh>
        <mesh visible={false}>
          <boxGeometry args={[0.4, 0.18, 0.18]} />
          <meshBasicMaterial />
        </mesh>
      </group>
      <Html position={[0.35, y0 + H + 0.2, 0]} center zIndexRange={[10, 0]}>
        <div className="vm-screen"><small>burette</small><b ref={reading}>vide</b></div>
      </Html>
      <Html position={[0.38, y0 - 0.05, 0]} center zIndexRange={[10, 0]}>
        <span className="lbl tiny">robinet (maintenir)</span>
      </Html>
    </group>
  )
}

function Stirrer({ lab, slot, onChange }) {
  const bar = useRef()
  useFrame((_, d) => {
    const o = Object.values(lab.items).find((x) => x.slot === slot.id && !x.held)
    bar.current.visible = !!o && lab.stirring && o.sol.V > 1e-6
    if (o) bar.current.position.set(o.pos[0], o.pos[1] + 0.03, o.pos[2])
    bar.current.rotation.y += d * 18
  })
  return (
    <group>
      <group position={[slot.x, 0, slot.z]}>
        <RoundedBox args={[0.75, 0.16, 0.7]} radius={0.04} position={[0, 0.08, 0]} castShadow>
          <meshStandardMaterial color="#e9ecef" roughness={0.5} />
        </RoundedBox>
        <mesh position={[0, 0.165, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.28, 32]} />
          <meshStandardMaterial color="#c9ced6" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh
          position={[0.27, 0.09, 0.36]}
          rotation={[Math.PI / 2, 0, 0]}
          onClick={(e) => {
            e.stopPropagation()
            lab.stirring = !lab.stirring
            onChange()
          }}
          onPointerOver={() => (document.body.style.cursor = 'pointer')}
          onPointerOut={() => (document.body.style.cursor = '')}
        >
          <cylinderGeometry args={[0.06, 0.06, 0.04, 20]} />
          <meshStandardMaterial color={lab.stirring ? '#30a46c' : '#2a2d33'} />
        </mesh>
        <Html position={[0, -0.02, 0.55]} center zIndexRange={[10, 0]}>
          <span className="lbl tiny">agitateur {lab.stirring ? '(marche)' : '(arrêt)'}</span>
        </Html>
      </group>
      <mesh ref={bar} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.025, 0.12, 4, 8]} />
        <meshStandardMaterial color="#f2f2f2" />
      </mesh>
    </group>
  )
}

function Bath({ slot, ice, temp }) {
  const R = slot.r ?? 0.55
  return (
    <group position={[slot.x, 0, slot.z]} scale={[R / 0.55, 1, R / 0.55]}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.55, 0.5, 0.3, 40, 1, true]} />
        {ice ? glassMat : <meshStandardMaterial color="#9aa2ab" metalness={0.8} roughness={0.3} side={THREE.DoubleSide} />}
      </mesh>
      <mesh position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.53, 0.5, 0.24, 40]} />
        <meshPhysicalMaterial color={ice ? '#bfe6ff' : '#8ec5ff'} transparent opacity={0.45} depthWrite={false} />
      </mesh>
      {ice &&
        [[-0.25, 0.1], [0.2, -0.2], [0.15, 0.25], [-0.15, -0.28], [0.32, 0.05]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.27, z]} rotation={[i, i * 0.7, 0]}>
            <boxGeometry args={[0.1, 0.08, 0.1]} />
            <meshPhysicalMaterial color="#ffffff" transparent opacity={0.7} roughness={0.1} />
          </mesh>
        ))}
      <Html position={[0, -0.05, 0.62]} center zIndexRange={[10, 0]}>
        <span className="lbl tiny">{slot.label ?? (ice ? 'eau glacée (trempe)' : `bain-marie ${temp} °C`)}</span>
      </Html>
    </group>
  )
}

function PHMeter({ lab, pos = [2.2, -0.95] }) {
  const screen = useRef()
  useFrame(() => {
    const p = readPH(lab)
    if (screen.current) screen.current.textContent = p == null ? '- - -' : p.toFixed(2)
  })
  return (
    <group position={[pos[0], 0, pos[1]]}>
      <RoundedBox args={[0.8, 0.35, 0.55]} radius={0.05} position={[0, 0.18, 0]} castShadow>
        <meshStandardMaterial color="#d6dade" roughness={0.5} />
      </RoundedBox>
      <Html position={[0, 0.55, 0.1]} center zIndexRange={[10, 0]}>
        <div className="vm-screen"><small>pH-mètre</small><b ref={screen}>- - -</b></div>
      </Html>
    </group>
  )
}

/** paillasse complète */
export default function Bench({ lab, cfg, onChange }) {
  const stir = lab.slots.find((s) => s.kind === 'stirrer')
  const ices = lab.slots.filter((s) => s.kind === 'ice')
  const baths = lab.slots.filter((s) => s.kind === 'bath')
  lab.buretteTop = [BURETTE_X, BURETTE_Z]
  lab.topOf = topOf
  for (const kinds of [['bottle'], ['dropper'], ['pipette', 'eprouvette']]) {
    Object.values(lab.items)
      .filter((o) => kinds.includes(o.kind))
      .sort((a, b) => a.home[0] - b.home[0])
      .forEach((o, i) => (o.labelUp = i % 2 === 1))
  }
  return (
    <group>
      {/* paillasse carrelée */}
      <mesh position={[0, -0.08, 0]} receiveShadow>
        <boxGeometry args={[9.5, 0.16, 3.8]} />
        <meshStandardMaterial color="#e8e6df" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.6, 1.85]}>
        <boxGeometry args={[9.5, 1.0, 0.1]} />
        <meshStandardMaterial color="#3b4a63" />
      </mesh>
      {/* étagère des réactifs (au fond) */}
      {cfg.shelf && (
        <group position={[cfg.shelf.x, 0, cfg.shelf.z]}>
          <RoundedBox args={[cfg.shelf.w, 0.06, 0.62]} radius={0.02} position={[0, 0.03, 0]} receiveShadow>
            <meshStandardMaterial color="#8d6b4a" roughness={0.7} />
          </RoundedBox>
          <mesh position={[0, 0.55, -0.32]}>
            <boxGeometry args={[cfg.shelf.w, 1.1, 0.04]} />
            <meshStandardMaterial color="#a58260" roughness={0.75} />
          </mesh>
          <Html position={[0, 1.22, -0.3]} center zIndexRange={[10, 0]}>
            <span className="lbl tiny">Réactifs</span>
          </Html>
        </group>
      )}
      {/* porte-outils (pipettes, éprouvettes, compte-gouttes) */}
      {cfg.rack && (
        <group position={[cfg.rack.x, 0, cfg.rack.z]}>
          <RoundedBox args={[cfg.rack.w, 0.05, 0.55]} radius={0.02} position={[0, 0.025, 0]} receiveShadow>
            <meshStandardMaterial color="#3b4a63" roughness={0.6} />
          </RoundedBox>
          <Html position={[0, -0.02, 0.4]} center zIndexRange={[10, 0]}>
            <span className="lbl tiny">Verrerie de mesure</span>
          </Html>
        </group>
      )}
      {/* emplacements de pose */}
      {lab.slots
        .filter((s) => s.kind === 'bench')
        .map((s) => (
          <group key={s.id} position={[s.x, 0.002, s.z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.34, 0.36, 40]} />
              <meshBasicMaterial color="#b9bcc4" />
            </mesh>
          </group>
        ))}
      {cfg.burette && <Burette lab={lab} onChange={onChange} />}
      {stir && <Stirrer lab={lab} slot={stir} onChange={onChange} />}
      {ices.map((s) => <Bath key={s.id} slot={s} ice />)}
      {baths.map((s) => <Bath key={s.id} slot={s} temp={s.T ?? lab.bathT ?? 60} />)}
      {cfg.phmeter && <PHMeter lab={lab} pos={cfg.phmeterPos} />}
      {Object.values(lab.items).map((it) => (
        <Item key={it.id} lab={lab} item={it} onChange={onChange} />
      ))}
      {Object.values(lab.items).map((it) => (
        <TargetRing key={'r' + it.id} lab={lab} item={it} />
      ))}
      <Stream lab={lab} />
    </group>
  )
}

export { isContainer }
