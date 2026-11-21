import { useEffect, useMemo } from 'react'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Table, steel, Path } from '../../components/three/Lab.jsx'
import { image, fp, AB } from './model.js'

const KX = 0.08 // unités par cm le long de l'axe
const KY = 0.22 // unités par cm verticalement (hauteurs dilatées pour la lisibilité)
const AY = 1.0 // hauteur de l'axe optique
const XMAX = 75 // cm

const P = (x, y) => new THREE.Vector3(x * KX, AY + y * KY, 0)

function Bench() {
  return (
    <group>
      <Table size={[14, 0.16, 3]} position={[0, -0.08, 0]} />
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[2 * XMAX * KX + 0.4, 0.16, 0.3]} />
        <meshStandardMaterial color="#8d96a0" metalness={0.8} roughness={0.32} />
      </mesh>
      {Array.from({ length: 31 }, (_, k) => -XMAX + k * 5).map((cm) => (
        <mesh key={cm} position={[cm * KX, 0.165, 0.12]}>
          <boxGeometry args={[0.01, 0.004, cm % 10 === 0 ? 0.08 : 0.05]} />
          <meshBasicMaterial color="#222" />
        </mesh>
      ))}
      {/* axe optique */}
      <mesh position={[0, AY, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.004, 0.004, 2 * XMAX * KX, 6]} />
        <meshBasicMaterial color="#8a8f98" />
      </mesh>
    </group>
  )
}

function Rider({ x, h = AY, children }) {
  return (
    <group position={[x, 0, 0]}>
      <RoundedBox args={[0.24, 0.12, 0.42]} radius={0.03} position={[0, 0.2, 0]} castShadow>
        <meshStandardMaterial color="#2a2d33" roughness={0.5} metalness={0.3} />
      </RoundedBox>
      <mesh position={[0, (h - 0.55) / 2 + 0.25, 0]}>
        <cylinderGeometry args={[0.025, 0.025, h - 0.55, 12]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      {children}
    </group>
  )
}

function Lens({ conv, f }) {
  const geo = useMemo(() => {
    const R = 0.42
    const pts = []
    const e0 = conv ? 0.09 : 0.03
    const e1 = conv ? 0.015 : 0.1
    for (let k = 0; k <= 24; k++) {
      const r = (R * k) / 24
      const t = e0 + (e1 - e0) * Math.pow(r / R, 2)
      pts.push(new THREE.Vector2(r, t))
    }
    for (let k = 24; k >= 0; k--) {
      const r = (R * k) / 24
      const t = e0 + (e1 - e0) * Math.pow(r / R, 2)
      pts.push(new THREE.Vector2(r, -t))
    }
    const g = new THREE.LatheGeometry(pts, 48)
    g.rotateZ(Math.PI / 2)
    return g
  }, [conv])
  return (
    <group position={[0, AY, 0]}>
      <mesh geometry={geo}>
        <meshPhysicalMaterial color="#dff3ff" transparent opacity={0.35} roughness={0.02} clearcoat={1} ior={1.5} envMapIntensity={2} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.44, 0.025, 10, 48]} />
        <meshStandardMaterial color="#2a2d33" metalness={0.5} roughness={0.4} />
      </mesh>
      <Html position={[0, 0.62, 0]} center zIndexRange={[10, 0]}>
        <span className="lbl tiny">{conv ? 'Convergente' : 'Divergente'} f′ = {f > 0 ? '+' : ''}{f} cm</span>
      </Html>
    </group>
  )
}

/** objet lumineux : lanterne avec la lettre F */
function ObjectF({ x }) {
  const h = AB * KY
  return (
    <group position={[x, AY, 0]}>
      <mesh position={[-0.2, h / 2, 0]}>
        <boxGeometry args={[0.35, h * 2.6, h * 2.2]} />
        <meshStandardMaterial color="#2a2d33" />
      </mesh>
      {/* lettre F (vue de profil : flèche AB) */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[0.01, h, 0.03]} />
        <meshBasicMaterial color="#ffe28a" toneMapped={false} />
      </mesh>
      <mesh position={[0, h, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.05, 0.1, 12]} />
        <meshBasicMaterial color="#ffe28a" toneMapped={false} />
      </mesh>
      <Html position={[-0.12, -0.12, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">A</span></Html>
      <Html position={[-0.12, h + 0.12, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">B</span></Html>
    </group>
  )
}

function ImageArrow({ OAp, g, real }) {
  const h = AB * g * KY
  const x = OAp * KX
  const col = real ? '#4cd17a' : '#b07cff'
  return (
    <group position={[x, AY, 0]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[0.012, Math.abs(h), 0.012]} />
        <meshBasicMaterial color={col} transparent opacity={real ? 1 : 0.6} toneMapped={false} />
      </mesh>
      <mesh position={[0, h, 0]} rotation={[h < 0 ? Math.PI : 0, 0, 0]}>
        <coneGeometry args={[0.045, 0.1, 12]} />
        <meshBasicMaterial color={col} transparent opacity={real ? 1 : 0.6} toneMapped={false} />
      </mesh>
      <Html position={[0.15, h + (h < 0 ? -0.14 : 0.14), 0]} center zIndexRange={[10, 0]}>
        <span className="lbl tiny" style={{ color: col }}>A′B′ {real ? '(réelle)' : '(virtuelle)'}</span>
      </Html>
    </group>
  )
}

/** écran : image de la lettre F, nette si l'écran est dans le plan de l'image */
function Screen({ x, p, im }) {
  const { canvas, tex } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return { canvas, tex }
  }, [])
  useEffect(() => {
    const g = canvas.getContext('2d')
    g.fillStyle = '#ecebe6'
    g.fillRect(0, 0, 256, 256)
    if (im.real && isFinite(im.OAp)) {
      // flou : rayon de la tache ∝ |E − OA'| / OA'
      const blur = Math.min(40, (Math.abs(p.E - im.OAp) / im.OAp) * 60)
      const s = Math.min(3, Math.abs(im.g)) * 24 // pixels par cm d'objet
      g.save()
      g.translate(128, 128)
      g.scale(im.g < 0 ? -1 : 1, im.g < 0 ? -1 : 1) // image renversée
      g.filter = `blur(${blur.toFixed(1)}px)`
      g.fillStyle = `rgba(255,190,40,${Math.max(0.15, 1 - blur / 45)})`
      const u = s / 2
      g.fillRect(-u * 0.5, -u, u * 0.3, 2 * u)
      g.fillRect(-u * 0.5, -u, u * 1.1, u * 0.3)
      g.fillRect(-u * 0.5, -u * 0.15, u * 0.8, u * 0.28)
      g.restore()
    }
    tex.needsUpdate = true
  }, [p.E, p.f, p.OA, p.conv, im.OAp, im.g, im.real, canvas, tex])
  return (
    <Rider x={x}>
      <mesh position={[0, AY, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[1.1, 1.1]} />
        <meshBasicMaterial map={tex} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.02, AY, 0]}>
        <boxGeometry args={[0.03, 1.16, 1.16]} />
        <meshStandardMaterial color="#2a2d33" />
      </mesh>
      <Html position={[0, AY + 0.75, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">Écran</span></Html>
    </Rider>
  )
}

function Eye({ x }) {
  return (
    <group position={[x, AY, 0]}>
      <mesh>
        <sphereGeometry args={[0.16, 32, 24]} />
        <meshStandardMaterial color="#f4f4f4" roughness={0.3} />
      </mesh>
      <mesh position={[-0.13, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.04, 24]} />
        <meshStandardMaterial color="#3a6ea5" />
      </mesh>
      <Html position={[0, 0.3, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">Œil</span></Html>
    </group>
  )
}

/** tracé des trois rayons particuliers issus de B */
function Rays({ p, im }) {
  const f = fp(p)
  const B = [p.OA, AB]
  const xEnd = p.mode === 'banc' ? Math.max(p.E, 10) : 40
  const solid = []
  const dashed = []
  const line = (a, b) => [P(a[0], a[1]), P(b[0], b[1])]
  // 1) parallèle à l'axe puis passe par F' (ou semble venir de F')
  {
    const I = [0, AB]
    const slope = -AB / f
    const end = [xEnd, AB + slope * xEnd]
    solid.push(line(B, I), line(I, end))
    if (!im.real || f < 0) dashed.push(line(I, [Math.min(im.OAp, -1) - 10, AB + slope * (Math.min(im.OAp, -1) - 10)]))
  }
  // 2) passe par O sans être dévié
  {
    const slope = AB / p.OA
    const end = [xEnd, slope * xEnd]
    solid.push(line(B, [0, 0]), line([0, 0], end))
    if (!im.real) dashed.push(line([0, 0], [im.OAp - 10, slope * (im.OAp - 10)]))
  }
  // 3) passe par F (ou se dirige vers F) puis ressort parallèle
  if (Math.abs(p.OA + f) > 0.5) {
    const slope = (0 - AB) / (-f - p.OA)
    const yI = AB + slope * (0 - p.OA)
    if (Math.abs(yI) < 8) {
      solid.push(line(B, [0, yI]), line([0, yI], [xEnd, yI]))
      if (!im.real) dashed.push(line([0, yI], [im.OAp - 10, yI]))
    }
  }
  return (
    <group>
      {solid.map((pts, i) => <Path key={'s' + i} points={pts} color={['#ffd23f', '#ffd23f', '#ff9f40', '#ff9f40', '#ff6b6b', '#ff6b6b'][i]} radius={0.007} opacity={0.9} />)}
      {dashed.map((pts, i) => <Path key={'d' + i} points={pts} color="#b07cff" radius={0.004} opacity={0.45} />)}
    </group>
  )
}

export default function LensScene({ sim }) {
  const p = sim.paramsRef.current
  const im = image(p)
  const f = fp(p)
  const loupe = p.mode === 'loupe'
  return (
    <group>
      <Bench />
      <Rider x={p.OA * KX} h={AY - 0.05}>
        <group position={[-p.OA * KX + p.OA * KX, 0, 0]} />
      </Rider>
      <ObjectF x={p.OA * KX} />
      <Rider x={0} h={AY - 0.42} />
      <Lens conv={p.conv} f={f} />
      {/* foyers */}
      {[[f, 'F′'], [-f, 'F']].map(([x, l]) => (
        <group key={l} position={[x * KX, AY, 0]}>
          <mesh>
            <sphereGeometry args={[0.035, 12, 8]} />
            <meshBasicMaterial color="#e5484d" />
          </mesh>
          <Html position={[0, -0.16, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">{l}</span></Html>
        </group>
      ))}
      <Html position={[0.08, AY - 0.16, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">O</span></Html>
      <Rays p={p} im={im} />
      {!im.infinite && Math.abs(im.OAp) < XMAX * 1.3 && Math.abs(im.g) < 6 && <ImageArrow OAp={im.OAp} g={im.g} real={im.real} />}
      {loupe ? <Eye x={4 * KX} /> : <Screen x={p.E * KX} p={p} im={im} />}
    </group>
  )
}
