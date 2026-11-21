import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { En, lambdaNm, BALMER, NMAX, E0 } from './model.js'
import { wavelengthRGB, wavelengthHex } from '../../lib/color.js'

const steel = { color: '#c9ced6', metalness: 0.95, roughness: 0.2 }
const BY = 1.0 // hauteur du faisceau
const GRATING = [-0.9, BY, 0.2]
const SCREEN = { x0: -1.5, x1: 2.7, y: 1.6, z: -1.5, h: 1.0 }
const L_MIN = 380
const L_MAX = 720
const screenX = (nm) => SCREEN.x0 + ((nm - L_MIN) / (L_MAX - L_MIN)) * (SCREEN.x1 - SCREEN.x0)

/* diagramme d'énergie 3D */
const DX = 3.3
const DY0 = 0.35
const DH = 3.3
const levelY = (E) => DY0 + (DH * (E + E0)) / E0

function Tube({ on }) {
  const glow = useRef()
  useFrame(({ clock }) => {
    if (glow.current) glow.current.emissiveIntensity = on ? 2.6 + 0.25 * Math.sin(clock.elapsedTime * 40) : 0
  })
  return (
    <group position={[-3.1, 0, 0.2]}>
      {/* support */}
      <RoundedBox args={[0.7, 0.12, 0.6]} radius={0.03} position={[0, 0.06, 0]} castShadow>
        <meshStandardMaterial color="#2a2d33" roughness={0.5} />
      </RoundedBox>
      {[0.35, 1.65].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow>
          <cylinderGeometry args={[0.13, 0.13, 0.22, 24]} />
          <meshStandardMaterial color="#1d1f24" roughness={0.4} metalness={0.4} />
        </mesh>
      ))}
      {/* tube de Plücker : ampoules + capillaire */}
      {[0.6, 1.4].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <sphereGeometry args={[0.12, 24, 16]} />
          <meshPhysicalMaterial color="#f3e7ff" transparent opacity={0.35} roughness={0.05} clearcoat={1} />
        </mesh>
      ))}
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.7, 16]} />
        <meshStandardMaterial ref={glow} color="#f0d0ff" emissive="#e05cff" emissiveIntensity={2.6} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.7, 16, 1, true]} />
        <meshBasicMaterial color="#d36cff" transparent opacity={on ? 0.22 : 0} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {on && <pointLight position={[0, 1, 0.3]} color="#d36cff" intensity={2.5} distance={3} />}
    </group>
  )
}

function HighVoltage() {
  return (
    <group position={[-4.25, 0, 0.6]} rotation={[0, 0.5, 0]}>
      <RoundedBox args={[0.9, 0.6, 0.7]} radius={0.05} position={[0, 0.3, 0]} castShadow>
        <meshStandardMaterial color="#c0392b" roughness={0.5} />
      </RoundedBox>
      <mesh position={[0.46, 0.4, 0]}>
        <boxGeometry args={[0.01, 0.16, 0.4]} />
        <meshStandardMaterial color="#111" emissive="#ff8c00" emissiveIntensity={0.6} />
      </mesh>
      <Html position={[0, 0.75, 0]} center zIndexRange={[10, 0]}>
        <span className="lbl">Haute tension ⚡</span>
      </Html>
    </group>
  )
}

function WhiteSource() {
  return (
    <group>
      <group position={[-4.0, BY, 0.2]}>
        <RoundedBox args={[0.7, 0.6, 0.55]} radius={0.06} castShadow>
          <meshStandardMaterial color="#2a2d33" roughness={0.5} metalness={0.3} />
        </RoundedBox>
        <mesh position={[0.36, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[0.13, 32]} />
          <meshBasicMaterial color="#fffbe8" toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.6, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.9, 12]} />
          <meshStandardMaterial {...steel} />
        </mesh>
      </group>
      {/* ballon d'hydrogène froid */}
      <group position={[-2.9, BY, 0.2]}>
        <mesh>
          <sphereGeometry args={[0.32, 32, 24]} />
          <meshPhysicalMaterial color="#efe6ff" transparent opacity={0.22} roughness={0.03} clearcoat={1} depthWrite={false} />
        </mesh>
        <mesh position={[0, -0.6, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.9, 12]} />
          <meshStandardMaterial {...steel} />
        </mesh>
        <Html position={[0, 0.55, 0]} center zIndexRange={[10, 0]}>
          <span className="lbl">H₂ froid</span>
        </Html>
      </group>
    </group>
  )
}

/** Spectroscope à réseau : collimateur + plate-forme + réseau. */
function Spectroscope() {
  return (
    <group>
      <mesh position={[-1.9, BY, 0.2]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 1.4, 24]} />
        <meshStandardMaterial color="#3b4a63" metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[-2.62, BY, 0.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.13, 0.13, 0.06, 24]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <mesh position={[-1.9, BY - 0.45, 0.2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.9, 12]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <mesh position={[GRATING[0], BY - 0.25, GRATING[2]]} castShadow>
        <cylinderGeometry args={[0.45, 0.5, 0.06, 40]} />
        <meshStandardMaterial color="#2a2d33" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[GRATING[0], (BY - 0.28) / 2, GRATING[2]]}>
        <cylinderGeometry args={[0.06, 0.06, BY - 0.28, 12]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <mesh position={GRATING} rotation={[0, Math.PI / 2 - 0.35, 0]}>
        <boxGeometry args={[0.4, 0.4, 0.015]} />
        <meshPhysicalMaterial color="#cfe3ff" metalness={0.3} roughness={0.05} iridescence={1} iridescenceIOR={1.6} clearcoat={1} transparent opacity={0.7} />
      </mesh>
      <Html position={[GRATING[0], BY + 0.45, GRATING[2]]} center zIndexRange={[10, 0]}>
        <span className="lbl">Réseau</span>
      </Html>
    </group>
  )
}

function Ray({ a, b, color, opacity = 0.8, r = 0.008 }) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a)
    const vb = new THREE.Vector3(...b)
    const d = vb.clone().sub(va)
    return { pos: va.clone().add(vb).multiplyScalar(0.5), quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), len: d.length() }
  }, [a, b])
  return (
    <mesh position={pos} quaternion={quat}>
      <cylinderGeometry args={[r, r, len, 8, 1, true]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

/** Écran où se forme le spectre (texture recalculée selon le mode). */
function SpectrumScreen({ mode, sel }) {
  const { canvas, tex } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 220
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    return { canvas, tex }
  }, [])
  useEffect(() => {
    const g = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    const X = (nm) => ((nm - L_MIN) / (L_MAX - L_MIN)) * W
    g.fillStyle = '#050608'
    g.fillRect(0, 0, W, H)
    if (mode === 'absorption') {
      for (let px = 0; px < W; px++) {
        const nm = L_MIN + (px / W) * (L_MAX - L_MIN)
        const [r, gg, b] = wavelengthRGB(nm)
        g.fillStyle = `rgb(${r * 255},${gg * 255},${b * 255})`
        g.fillRect(px, 30, 1, H - 80)
      }
      g.fillStyle = '#050608'
      for (const l of BALMER) g.fillRect(X(l.nm) - 3, 30, 6, H - 80)
    } else {
      for (const l of BALMER) {
        const [r, gg, b] = wavelengthRGB(l.nm)
        const grad = g.createLinearGradient(X(l.nm) - 10, 0, X(l.nm) + 10, 0)
        grad.addColorStop(0, 'rgba(0,0,0,0)')
        grad.addColorStop(0.5, `rgb(${Math.min(255, r * 255 + 60)},${Math.min(255, gg * 255 + 60)},${Math.min(255, b * 255 + 60)})`)
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        g.fillStyle = grad
        g.fillRect(X(l.nm) - 10, 30, 20, H - 80)
      }
    }
    g.fillStyle = '#cfd3d8'
    g.font = 'bold 20px system-ui, sans-serif'
    g.textAlign = 'center'
    for (let nm = 400; nm <= 700; nm += 50) {
      g.fillRect(X(nm) - 1, H - 48, 2, 10)
      g.fillText(nm, X(nm), H - 16)
    }
    if (sel && sel >= L_MIN && sel <= L_MAX) {
      g.strokeStyle = '#ffffff'
      g.lineWidth = 3
      g.strokeRect(X(sel) - 14, 24, 28, H - 68)
    }
    tex.needsUpdate = true
  }, [mode, sel, canvas, tex])
  const w = SCREEN.x1 - SCREEN.x0
  return (
    <group position={[(SCREEN.x0 + SCREEN.x1) / 2, SCREEN.y, SCREEN.z]}>
      <mesh position={[0, 0, -0.03]} castShadow>
        <boxGeometry args={[w + 0.14, SCREEN.h + 0.14, 0.05]} />
        <meshStandardMaterial color="#2a2d33" roughness={0.6} />
      </mesh>
      <mesh>
        <planeGeometry args={[w, SCREEN.h]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {[-w / 2 + 0.2, w / 2 - 0.2].map((x) => (
        <mesh key={x} position={[x, -SCREEN.y / 2 - 0.2, -0.05]}>
          <cylinderGeometry args={[0.035, 0.035, SCREEN.y - 0.4, 12]} />
          <meshStandardMaterial {...steel} />
        </mesh>
      ))}
      <Html position={[0, SCREEN.h / 2 + 0.2, 0]} center zIndexRange={[10, 0]}>
        <span className="lbl">{mode === 'absorption' ? 'Spectre d’absorption' : 'Spectre d’émission'} de l’hydrogène</span>
      </Html>
    </group>
  )
}

/** Diagramme des niveaux d'énergie en 3D, avec l'électron et le photon animés. */
function EnergyLadder({ sim }) {
  const electron = useRef()
  const photon = useRef()
  const photonMat = useRef()
  const arrow = useRef()
  const wave = useMemo(() => {
    class Wave extends THREE.Curve {
      getPoint(u, out = new THREE.Vector3()) {
        return out.set(u * 0.9, 0.06 * Math.sin(u * Math.PI * 2 * 5), 0)
      }
    }
    return new THREE.TubeGeometry(new Wave(), 120, 0.012, 6, false)
  }, [])
  const p = sim.paramsRef.current
  const em = p.mode === 'emission'
  const color = wavelengthHex(Math.min(Math.max(lambdaNm(p.up, p.low), 381), 779))
  const visible = lambdaNm(p.up, p.low) >= 380 && lambdaNm(p.up, p.low) <= 780
  const yUp = levelY(En(p.up))
  const yLow = levelY(En(p.low))
  const ax = DX + 0.15 + (p.low - 1) * 0.12

  useFrame(() => {
    const s = sim.stateRef.current
    const ph = (s.t % 2.6) / 2.6
    const ease = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b)
    let ey
    if (em) ey = THREE.MathUtils.lerp(yUp, yLow, ease(0.3, 0.45, ph))
    else ey = THREE.MathUtils.lerp(yLow, yUp, ease(0.5, 0.65, ph))
    electron.current.position.set(ax, ey, 0.05)
    // photon : émis vers la droite (émission) ou arrivant de la gauche (absorption)
    let px, op
    if (em) {
      const k = THREE.MathUtils.clamp((ph - 0.42) / 0.55, 0, 1)
      px = ax + 0.1 + k * 1.6
      op = ph > 0.42 ? 1 - k * 0.8 : 0
    } else {
      const k = THREE.MathUtils.clamp(ph / 0.5, 0, 1)
      px = ax - 2.0 + k * 1.9
      op = ph < 0.52 ? 0.3 + 0.7 * k : 0
    }
    photon.current.position.set(px, (yUp + yLow) / 2, 0.05)
    photonMat.current.opacity = op
  })

  const levels = []
  for (let n = 1; n <= NMAX; n++) levels.push(n)
  const len = Math.abs(yUp - yLow)
  return (
    <group>
      {/* axe des énergies */}
      <mesh position={[DX - 0.25, DY0 + DH / 2, 0]}>
        <cylinderGeometry args={[0.012, 0.012, DH + 0.3, 8]} />
        <meshBasicMaterial color="#8a8f98" />
      </mesh>
      <mesh position={[DX - 0.25, DY0 + DH + 0.2, 0]}>
        <coneGeometry args={[0.05, 0.14, 12]} />
        <meshBasicMaterial color="#8a8f98" />
      </mesh>
      <Html position={[DX - 0.25, DY0 + DH + 0.42, 0]} center zIndexRange={[10, 0]}>
        <span className="lbl">E (eV)</span>
      </Html>
      {levels.map((n) => {
        const y = levelY(En(n))
        const on = n === p.up || n === p.low
        return (
          <group key={n}>
            <mesh position={[DX + 0.6, y, 0]}>
              <boxGeometry args={[1.5, 0.018, 0.08]} />
              <meshBasicMaterial color={on ? '#ffd23f' : '#9aa6b2'} toneMapped={false} />
            </mesh>
            {n <= 4 && (
              <Html position={[DX + 1.55, y, 0]} center zIndexRange={[10, 0]}>
                <span className="lbl tiny">n={n} · {En(n).toFixed(2)}</span>
              </Html>
            )}
          </group>
        )
      })}
      <mesh position={[DX + 0.6, levelY(0), 0]}>
        <boxGeometry args={[1.5, 0.012, 0.06]} />
        <meshBasicMaterial color="#5b6470" />
      </mesh>
      <Html position={[DX + 1.5, levelY(0) + 0.12, 0]} center zIndexRange={[10, 0]}>
        <span className="lbl tiny">n=∞ · 0 (ionisation)</span>
      </Html>
      {/* flèche de transition */}
      <group ref={arrow} position={[ax, (yUp + yLow) / 2, 0]} rotation={[0, 0, em ? Math.PI : 0]}>
        <mesh>
          <cylinderGeometry args={[0.02, 0.02, Math.max(len - 0.12, 0.01), 10]} />
          <meshBasicMaterial color={visible ? color : '#bbbbbb'} toneMapped={false} />
        </mesh>
        <mesh position={[0, len / 2 - 0.05, 0]}>
          <coneGeometry args={[0.05, 0.12, 12]} />
          <meshBasicMaterial color={visible ? color : '#bbbbbb'} toneMapped={false} />
        </mesh>
      </group>
      <mesh ref={electron}>
        <sphereGeometry args={[0.055, 20, 14]} />
        <meshStandardMaterial color="#6cb6ff" emissive="#3e9bff" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <mesh ref={photon} geometry={wave}>
        <meshBasicMaterial ref={photonMat} color={visible ? color : '#dddddd'} transparent toneMapped={false} />
      </mesh>
    </group>
  )
}

export default function SpectrumScene({ sim }) {
  const p = sim.paramsRef.current
  const em = p.mode === 'emission'
  const sel = p.low === 2 ? lambdaNm(p.up, p.low) : null
  return (
    <group>
      <mesh position={[0.4, -0.08, 0]} receiveShadow>
        <boxGeometry args={[11.5, 0.16, 5]} />
        <meshStandardMaterial color="#4a3a2c" roughness={0.8} />
      </mesh>
      {em ? (
        <>
          <HighVoltage />
          <Tube on />
          <Html position={[-3.1, 2.0, 0.2]} center zIndexRange={[10, 0]}>
            <span className="lbl">Tube à hydrogène</span>
          </Html>
        </>
      ) : (
        <WhiteSource />
      )}
      <Spectroscope />
      <Ray a={[em ? -3.05 : -3.65, BY, 0.2]} b={GRATING} color={em ? '#e78bff' : '#ffffff'} opacity={0.5} r={0.02} />
      {em
        ? BALMER.map((l) => <Ray key={l.p} a={GRATING} b={[screenX(l.nm), SCREEN.y, SCREEN.z + 0.01]} color={wavelengthHex(l.nm)} opacity={0.75} r={0.01} />)
        : [400, 440, 480, 520, 560, 600, 640, 680, 715].map((nm) => <Ray key={nm} a={GRATING} b={[screenX(nm), SCREEN.y, SCREEN.z + 0.01]} color={wavelengthHex(nm)} opacity={0.45} r={0.008} />)}
      <SpectrumScreen mode={p.mode} sel={sel} />
      <EnergyLadder sim={sim} />
    </group>
  )
}
