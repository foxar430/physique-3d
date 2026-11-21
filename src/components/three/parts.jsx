/*
 * Modèles 3D procéduraux (aucun fichier externe) des appareils et composants de TP.
 * Chaque composant est construit le long de l'axe +x local, centré, posé sur la plaque (y = 0).
 */
import { useMemo } from 'react'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Lead } from './Wire.jsx'

export const BOARD_Y = 0.05

/* ---------------- résistor : corps « os de chien » + anneaux du code couleur ---------------- */

const CODE = ['#111111', '#7a4520', '#d0302a', '#f07c12', '#f2d21b', '#2e9e3e', '#2f5fd0', '#8a3fc7', '#8a8f98', '#f4f4f4']
const GOLD = '#c9a227'

/** Couleurs des 3 premiers anneaux (2 chiffres significatifs + multiplicateur). */
export function colorBands(ohms) {
  if (!(ohms > 0)) return [CODE[0], CODE[0], CODE[0]]
  let exp = Math.floor(Math.log10(ohms)) - 1
  let sig = Math.round(ohms / Math.pow(10, exp))
  if (sig >= 100) { sig = Math.round(sig / 10); exp += 1 }
  if (exp < 0) { return [CODE[Math.floor(sig / 10)], CODE[sig % 10], GOLD] }
  return [CODE[Math.floor(sig / 10)], CODE[sig % 10], CODE[Math.min(exp, 9)]]
}

const RES_PROFILE = [
  [0, -0.42], [0.08, -0.415], [0.145, -0.37], [0.155, -0.3], [0.13, -0.21], [0.122, -0.12],
  [0.122, 0.12], [0.13, 0.21], [0.155, 0.3], [0.145, 0.37], [0.08, 0.415], [0, 0.42],
].map(([r, y]) => new THREE.Vector2(r, y))

export function Resistor({ ohms, glowRef }) {
  const body = useMemo(() => new THREE.LatheGeometry(RES_PROFILE, 40), [])
  const [b1, b2, b3] = colorBands(ohms)
  const bands = [
    [-0.3, 0.158, b1],
    [-0.16, 0.127, b2],
    [-0.06, 0.125, b3],
    [0.3, 0.158, GOLD],
  ]
  const h = 0.24
  return (
    <group>
      <group position={[0, h, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <mesh geometry={body} castShadow>
          <meshPhysicalMaterial ref={glowRef} color="#d8c39a" roughness={0.55} clearcoat={0.4} emissive="#ff5a1f" emissiveIntensity={0} />
        </mesh>
        {bands.map(([y, r, c], i) => (
          <mesh key={i} position={[0, y, 0]}>
            <cylinderGeometry args={[r, r, 0.045, 32]} />
            <meshStandardMaterial color={c} roughness={0.5} metalness={c === GOLD ? 0.7 : 0} />
          </mesh>
        ))}
      </group>
      <Lead points={[[-0.42, h, 0], [-0.5, h, 0], [-0.55, h - 0.08, 0], [-0.55, BOARD_Y, 0]]} />
      <Lead points={[[0.42, h, 0], [0.5, h, 0], [0.55, h - 0.08, 0], [0.55, BOARD_Y, 0]]} />
    </group>
  )
}

/* ---------------- condensateur électrolytique ---------------- */

export function Capacitor({ labelA, labelB }) {
  const H = 0.62
  const R = 0.21
  const y0 = 0.14
  return (
    <group>
      {/* gaine bleue vernie */}
      <mesh position={[0, y0 + H / 2, 0]} castShadow>
        <cylinderGeometry args={[R, R, H, 40]} />
        <meshPhysicalMaterial color="#1d4f9c" roughness={0.3} clearcoat={1} clearcoatRoughness={0.15} />
      </mesh>
      {/* bande « − » côté armature B (+x) */}
      <mesh position={[0, y0 + H / 2, 0]}>
        <cylinderGeometry args={[R + 0.002, R + 0.002, H * 0.96, 24, 1, true, Math.PI / 2 - 0.32, 0.64]} />
        <meshPhysicalMaterial color="#b8cdf2" roughness={0.35} clearcoat={1} side={THREE.DoubleSide} />
      </mesh>
      {/* capot aluminium avec évent en croix */}
      <mesh position={[0, y0 + H + 0.005, 0]}>
        <cylinderGeometry args={[R - 0.015, R - 0.015, 0.012, 40]} />
        <meshStandardMaterial color="#c8ccd2" metalness={0.9} roughness={0.25} />
      </mesh>
      {[0, Math.PI / 2].map((a) => (
        <mesh key={a} position={[0, y0 + H + 0.012, 0]} rotation={[0, a, 0]}>
          <boxGeometry args={[0.26, 0.006, 0.018]} />
          <meshStandardMaterial color="#5a6068" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* joint caoutchouc */}
      <mesh position={[0, y0 + 0.01, 0]}>
        <cylinderGeometry args={[R - 0.01, R - 0.01, 0.03, 32]} />
        <meshStandardMaterial color="#222" roughness={0.9} />
      </mesh>
      <Lead points={[[-0.08, y0, 0], [-0.08, 0.09, 0], [-0.25, BOARD_Y, 0]]} />
      <Lead points={[[0.08, y0, 0], [0.08, 0.09, 0], [0.25, BOARD_Y, 0]]} />
      {/* charges des armatures (mises à jour par la scène) */}
      <Html position={[-0.34, y0 + H + 0.15, 0]} center zIndexRange={[10, 0]}>
        <span ref={labelA} className="qbadge" />
      </Html>
      <Html position={[0.34, y0 + H + 0.15, 0]} center zIndexRange={[10, 0]}>
        <span ref={labelB} className="qbadge" />
      </Html>
    </group>
  )
}

/* ---------------- bobine de laboratoire (carcasse, enroulement, bornes) ---------------- */

function useHelix(turns, radius, length, wire) {
  return useMemo(() => {
    class Helix extends THREE.Curve {
      getPoint(u, out = new THREE.Vector3()) {
        const a = u * turns * Math.PI * 2
        return out.set((u - 0.5) * length, radius * Math.cos(a), radius * Math.sin(a))
      }
    }
    return new THREE.TubeGeometry(new Helix(), turns * 16, wire, 6, false)
  }, [turns, radius, length, wire])
}

function useFieldLines() {
  return useMemo(() => {
    const lines = []
    for (const [ry, rz] of [[0.48, 0], [0.62, 0], [0, 0.48], [0, 0.62]]) {
      // boucle : traverse le noyau selon x puis revient par l'extérieur
      const curve = new THREE.CatmullRomCurve3(
        [
          [-0.95, 0, 0], [-0.6, ry * 0.55, rz * 0.55], [0, ry, rz], [0.6, ry * 0.55, rz * 0.55],
          [0.95, 0, 0], [0.6, -ry * 0.05, -rz * 0.05], [0, 0, 0], [-0.6, -ry * 0.05, -rz * 0.05],
        ].map((p) => new THREE.Vector3(...p)),
        true,
      )
      lines.push(new THREE.TubeGeometry(curve, 80, 0.012, 6, true))
      // symétrique
      const curve2 = new THREE.CatmullRomCurve3(curve.points.map((p) => new THREE.Vector3(p.x, -p.y, -p.z)), true)
      lines.push(new THREE.TubeGeometry(curve2, 80, 0.012, 6, true))
    }
    return lines
  }, [])
}

export function Coil({ fieldRef }) {
  const helix = useHelix(26, 0.27, 0.66, 0.02)
  const field = useFieldLines()
  const cy = 0.42
  return (
    <group>
      <group position={[0, cy, 0]}>
        {/* enroulement cuivre */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.255, 0.255, 0.68, 32]} />
          <meshStandardMaterial color="#b0642a" metalness={0.8} roughness={0.35} />
        </mesh>
        <mesh geometry={helix} castShadow>
          <meshStandardMaterial color="#d08a4a" metalness={0.85} roughness={0.28} />
        </mesh>
        {/* noyau */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 0.9, 20]} />
          <meshStandardMaterial color="#6b7078" metalness={0.7} roughness={0.4} />
        </mesh>
        {/* flasques de la carcasse */}
        {[-0.37, 0.37].map((x) => (
          <RoundedBox key={x} args={[0.06, 0.78, 0.78]} radius={0.02} position={[x, 0, 0]} castShadow>
            <meshStandardMaterial color="#2b2f36" roughness={0.6} />
          </RoundedBox>
        ))}
        {/* lignes de champ magnétique (opacité ∝ i²) */}
        {field.map((g, i) => (
          <mesh key={i} geometry={g}>
            <meshBasicMaterial ref={(m) => m && fieldRef?.(m)} color="#6cc4ff" transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </group>
      {/* bornes de sécurité sur les flasques */}
      {[[-0.37, '#c0392b'], [0.37, '#22252a']].map(([x, c]) => (
        <group key={x} position={[x, cy + 0.45, 0]}>
          <mesh>
            <cylinderGeometry args={[0.055, 0.065, 0.12, 20]} />
            <meshPhysicalMaterial color={c} roughness={0.35} clearcoat={0.8} />
          </mesh>
          <mesh position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.04, 12]} />
            <meshStandardMaterial color="#c9a227" metalness={0.9} roughness={0.3} />
          </mesh>
        </group>
      ))}
      <Lead smooth metal={false} color="#c0392b" radius={0.024} points={[[-0.37, cy + 0.5, 0], [-0.5, cy + 0.55, 0], [-0.62, 0.3, 0], [-0.6, BOARD_Y, 0]]} />
      <Lead smooth metal={false} color="#22252a" radius={0.024} points={[[0.37, cy + 0.5, 0], [0.5, cy + 0.55, 0], [0.62, 0.3, 0], [0.6, BOARD_Y, 0]]} />
    </group>
  )
}

/* ---------------- alimentation stabilisée / GBF ---------------- */

export function Bench({ kind = 'battery', textRef }) {
  const gbf = kind === 'gbf'
  return (
    <group>
      <RoundedBox args={[0.95, 0.8, 1.6]} radius={0.06} position={[0, 0.4, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={gbf ? '#3b4a63' : '#d6dade'} roughness={0.55} metalness={0.1} />
      </RoundedBox>
      {/* face avant (+x) */}
      <mesh position={[0.48, 0.42, 0]}>
        <boxGeometry args={[0.02, 0.66, 1.44]} />
        <meshStandardMaterial color="#1b1e23" roughness={0.7} />
      </mesh>
      <mesh position={[0.495, 0.58, -0.25]}>
        <boxGeometry args={[0.01, 0.2, 0.62]} />
        <meshStandardMaterial color={gbf ? '#0e1626' : '#0e1a12'} emissive={gbf ? '#123a66' : '#0d3d1a'} emissiveIntensity={0.6} />
      </mesh>
      {[0.12, 0.38].map((z, i) => (
        <group key={z} position={[0.5, 0.3, z]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.07, 0.08, 0.05, 24]} />
            <meshStandardMaterial color="#cfd3d8" metalness={0.5} roughness={0.35} />
          </mesh>
          <mesh position={[0.03, 0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.012, 0.012, 0.05]} />
            <meshStandardMaterial color={i ? '#c0392b' : '#333'} />
          </mesh>
        </group>
      ))}
      {/* bornes de sortie + (rouge) et − (noire) */}
      {[[-0.6, '#c0392b'], [0.6, '#22252a']].map(([z, c]) => (
        <mesh key={z} position={[0.52, 0.22, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.07, 0.1, 20]} />
          <meshPhysicalMaterial color={c} roughness={0.35} clearcoat={0.8} />
        </mesh>
      ))}
      <Html position={[0.55, 0.92, -0.25]} center zIndexRange={[10, 0]}>
        <div className={'vm-screen' + (gbf ? ' gbf' : '')}>
          <small>{gbf ? 'GBF ∿' : 'ALIM'}</small>
          <b ref={textRef}>—</b>
        </div>
      </Html>
    </group>
  )
}

/* ---------------- inverseur K ---------------- */

export function SwitchBase({ size = [1.05, 0.06, 1.05], position }) {
  return (
    <RoundedBox args={size} radius={0.025} position={position} receiveShadow castShadow>
      <meshStandardMaterial color="#2a2d33" roughness={0.65} />
    </RoundedBox>
  )
}

export function Contact({ at }) {
  return (
    <group position={at}>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.075, 0.085, 0.1, 20]} />
        <meshStandardMaterial color="#c9a227" metalness={0.9} roughness={0.25} />
      </mesh>
    </group>
  )
}

/* ---------------- multimètre ---------------- */

export function Multimeter({ textRef, label }) {
  return (
    <group>
      <RoundedBox args={[0.8, 0.16, 1.15]} radius={0.05} position={[0, 0.08, 0]} castShadow>
        <meshStandardMaterial color="#f2b705" roughness={0.7} />
      </RoundedBox>
      <mesh position={[0, 0.165, 0.02]}>
        <boxGeometry args={[0.62, 0.01, 0.95]} />
        <meshStandardMaterial color="#25282e" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.172, -0.26]}>
        <boxGeometry args={[0.5, 0.008, 0.26]} />
        <meshStandardMaterial color="#9fb39a" emissive="#4d6b45" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, 0.19, 0.12]}>
        <cylinderGeometry args={[0.16, 0.17, 0.05, 32]} />
        <meshStandardMaterial color="#3a3e45" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.22, 0.12]}>
        <boxGeometry args={[0.04, 0.02, 0.28]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>
      {[[-0.16, '#c0392b'], [0.16, '#22252a']].map(([x, c]) => (
        <mesh key={x} position={[x, 0.18, 0.42]}>
          <cylinderGeometry args={[0.045, 0.045, 0.04, 16]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
      <Html position={[0, 0.45, -0.26]} center zIndexRange={[10, 0]}>
        <div className="vm-screen">
          <small>{label}</small>
          <b ref={textRef}>—</b>
        </div>
      </Html>
    </group>
  )
}

/* ---------------- plaque de montage perforée ---------------- */

export function Breadboard({ size = [7.6, 0.1, 3.5], position = [0.3, -0.05, 0] }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 256
    const g = c.getContext('2d')
    g.fillStyle = '#e9e6dd'
    g.fillRect(0, 0, 512, 256)
    g.fillStyle = '#b9b4a6'
    for (let x = 8; x < 512; x += 16) for (let y = 8; y < 256; y += 16) g.fillRect(x - 2.5, y - 2.5, 5, 5)
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(3, 3)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [])
  return (
    <group>
      <RoundedBox args={size} radius={0.04} position={position} receiveShadow>
        <meshStandardMaterial map={tex} roughness={0.8} />
      </RoundedBox>
      {/* paillasse */}
      <mesh position={[position[0], -0.16, position[2]]} receiveShadow>
        <boxGeometry args={[size[0] + 1.6, 0.12, size[2] + 1.4]} />
        <meshStandardMaterial color="#6f5238" roughness={0.75} />
      </mesh>
    </group>
  )
}
