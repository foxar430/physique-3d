import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { intensity, spotWidth, prism, SPECTRUM, APEX } from './model.js'
import { wavelengthRGB, wavelengthHex } from '../../lib/color.js'

const BY = 0.9 // hauteur du faisceau
const SLIT_X = -1.6
const SCREEN_HALF_CM = 6 // l'écran montre ±6 cm
const SCR_W = 3 // largeur de l'écran (unités)
const U_PER_CM = SCR_W / (2 * SCREEN_HALF_CM)

const steel = { color: '#c9ced6', metalness: 0.95, roughness: 0.2 }

/** Banc d'optique : rail en aluminium avec graduations, sur la paillasse. */
function Bench({ from = -4.4, to = 4.6 }) {
  const len = to - from
  return (
    <group>
      <mesh position={[0, -0.08, 0.3]} receiveShadow>
        <boxGeometry args={[11, 0.16, 6]} />
        <meshStandardMaterial color="#4a3a2c" roughness={0.8} />
      </mesh>
      <mesh position={[(from + to) / 2, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[len, 0.16, 0.32]} />
        <meshStandardMaterial color="#8d96a0" metalness={0.8} roughness={0.32} />
      </mesh>
      {Array.from({ length: Math.floor(len / 0.5) + 1 }, (_, k) => (
        <mesh key={k} position={[from + k * 0.5, 0.165, 0.12]}>
          <boxGeometry args={[0.012, 0.004, 0.08]} />
          <meshBasicMaterial color="#222" />
        </mesh>
      ))}
    </group>
  )
}

/** Cavalier + tige + noix : support d'un élément à la hauteur du faisceau. */
function Rider({ x, children, h = BY }) {
  return (
    <group position={[x, 0, 0]}>
      <RoundedBox args={[0.3, 0.14, 0.46]} radius={0.03} position={[0, 0.2, 0]} castShadow>
        <meshStandardMaterial color="#2a2d33" roughness={0.5} metalness={0.3} />
      </RoundedBox>
      <mesh position={[0, (h - 0.2) / 2 + 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, h - 0.2, 12]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <group position={[0, h, 0]}>{children}</group>
    </group>
  )
}

function Laser({ color }) {
  return (
    <Rider x={-3.6} h={BY - 0.12}>
      <group position={[0, 0.12, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 1.1, 32]} />
          <meshStandardMaterial color="#1d2a3a" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[0.57, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.09, 0.12, 0.06, 32]} />
          <meshStandardMaterial {...steel} />
        </mesh>
        <mesh position={[0.6, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[0.04, 20]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        <mesh position={[-0.2, 0.17, 0]}>
          <boxGeometry args={[0.3, 0.02, 0.12]} />
          <meshStandardMaterial color="#f2c94c" />
        </mesh>
      </group>
    </Rider>
  )
}

/** Source de lumière blanche : lanterne + fente source. */
function WhiteLamp({ position, rotationY }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <RoundedBox args={[0.7, 0.6, 0.55]} radius={0.06} position={[-0.35, 0, 0]} castShadow>
        <meshStandardMaterial color="#2a2d33" roughness={0.5} metalness={0.3} />
      </RoundedBox>
      <mesh position={[0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.14, 0.14, 0.2, 32]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <mesh position={[0.16, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[0.12, 32]} />
        <meshBasicMaterial color="#fffbe8" toneMapped={false} />
      </mesh>
      <mesh position={[-0.35, -0.3 - 0.4, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.8, 12]} />
        <meshStandardMaterial {...steel} />
      </mesh>
    </group>
  )
}

/** Fente verticale de largeur a (largeur exagérée pour être visible). */
function Slit({ a }) {
  const g = Math.max(0.02, a * 0.0022)
  const side = (0.7 - g) / 2
  return (
    <Rider x={SLIT_X}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.04, 0.9, 0.86]} />
        <meshStandardMaterial color="#d8d2c4" roughness={0.7} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[-0.025, 0, s * (g / 2 + side / 2)]}>
          <boxGeometry args={[0.02, 0.6, side]} />
          <meshStandardMaterial color="#111" roughness={0.6} />
        </mesh>
      ))}
    </Rider>
  )
}

/** Écran blanc : la figure est dessinée dans une texture recalculée à chaque changement de réglage. */
function Screen({ x, rotationY = -Math.PI / 2, draw, deps, position }) {
  const { canvas, tex } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 512
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    return { canvas, tex }
  }, [])
  useEffect(() => {
    draw(canvas.getContext('2d'), canvas.width, canvas.height)
    tex.needsUpdate = true
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group position={position ?? [x, 0, 0]} rotation={[0, rotationY, 0]}>
      <mesh position={[0, BY, -0.03]} castShadow>
        <boxGeometry args={[SCR_W + 0.12, 1.62, 0.05]} />
        <meshStandardMaterial color="#2a2d33" roughness={0.6} />
      </mesh>
      <mesh position={[0, BY, 0]}>
        <planeGeometry args={[SCR_W, 1.5]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <mesh position={[0, (BY - 0.75) / 2, -0.06]}>
        <cylinderGeometry args={[0.04, 0.04, BY - 0.75, 12]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <RoundedBox args={[0.6, 0.06, 0.4]} radius={0.02} position={[0, 0.03, -0.06]}>
        <meshStandardMaterial color="#2a2d33" />
      </RoundedBox>
    </group>
  )
}

function drawRulerGrid(g, W, H) {
  g.fillStyle = '#ecebe6'
  g.fillRect(0, 0, W, H)
  g.strokeStyle = 'rgba(0,0,0,0.12)'
  g.lineWidth = 1
  const pxcm = W / (2 * SCREEN_HALF_CM)
  for (let c = -SCREEN_HALF_CM; c <= SCREEN_HALF_CM; c++) {
    const x = W / 2 + c * pxcm
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke()
  }
  g.fillStyle = '#333'
  g.font = 'bold 22px system-ui, sans-serif'
  g.textAlign = 'center'
  for (let mm = -SCREEN_HALF_CM * 10; mm <= SCREEN_HALF_CM * 10; mm++) {
    const x = W / 2 + (mm / 10) * pxcm
    const L = mm % 10 === 0 ? 26 : mm % 5 === 0 ? 16 : 9
    g.fillRect(x - (mm % 10 === 0 ? 1.5 : 0.75), H - L, mm % 10 === 0 ? 3 : 1.5, L)
    if (mm % 10 === 0 && mm !== 0) g.fillText(Math.abs(mm / 10), x, H - 34)
  }
  g.fillText('0', W / 2, H - 34)
}

/** Faisceau : cylindre lumineux entre deux points. */
function Beam({ a, b, color, radius = 0.012, opacity = 0.95 }) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a)
    const vb = new THREE.Vector3(...b)
    const d = vb.clone().sub(va)
    return { pos: va.clone().add(vb).multiplyScalar(0.5), quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), len: d.length() }
  }, [a, b])
  return (
    <group position={pos} quaternion={quat}>
      <mesh>
        <cylinderGeometry args={[radius, radius, len, 10, 1, true]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={opacity} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[radius * 4, radius * 4, len, 12, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Éventail lumineux (triangle) de la fente vers l'écran. */
function Fan({ from, halfWidth, toX, color, opacity }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute([from[0], BY, 0, toX, BY, -halfWidth, toX, BY, halfWidth], 3))
    return g
  }, [from, halfWidth, toX])
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

/* ====================================================================== */

function DiffractionSetup({ p }) {
  const color = wavelengthHex(p.lambda)
  const screenX = SLIT_X + p.D * 2
  const L = spotWidth(p) * 100 // cm
  const half = Math.min((L / 2) * U_PER_CM, SCR_W / 2)
  const draw = (g, W, H) => {
    drawRulerGrid(g, W, H)
    const [r, gg, b] = wavelengthRGB(p.lambda)
    const img = g.getImageData(0, 0, W, H)
    const pxcm = W / (2 * SCREEN_HALF_CM)
    for (let px = 0; px < W; px++) {
      const xm = ((px - W / 2) / pxcm) / 100
      const I = intensity(xm, p)
      const a = Math.min(1, 1.25 * Math.pow(I, 0.42))
      for (let py = 0; py < H; py++) {
        const dy = (py - H * 0.42) / (H * 0.09)
        const k = a * Math.exp(-dy * dy)
        if (k < 0.004) continue
        const i = (py * W + px) * 4
        const hot = Math.max(0, k - 0.75) * 2.4 // cœur de la tache, presque blanc
        img.data[i] = Math.min(255, img.data[i] * (1 - k) + 255 * (r * k + hot))
        img.data[i + 1] = Math.min(255, img.data[i + 1] * (1 - k) + 255 * (gg * k + hot))
        img.data[i + 2] = Math.min(255, img.data[i + 2] * (1 - k) + 255 * (b * k + hot))
      }
    }
    g.putImageData(img, 0, 0)
    // repère de la largeur L de la tache centrale
    if (L / 2 < SCREEN_HALF_CM) {
      g.strokeStyle = '#e0a000'
      g.fillStyle = '#b07800'
      g.lineWidth = 3
      const y = H * 0.68
      const x1 = W / 2 - (L / 2) * pxcm
      const x2 = W / 2 + (L / 2) * pxcm
      g.beginPath(); g.moveTo(x1, y); g.lineTo(x2, y); g.stroke()
      for (const xx of [x1, x2]) { g.beginPath(); g.moveTo(xx, y - 12); g.lineTo(xx, y + 12); g.stroke() }
      g.font = 'bold 28px system-ui, sans-serif'
      g.textAlign = 'center'
      g.fillText('L = ' + L.toFixed(2) + ' cm', W / 2, y + 40)
    }
  }
  return (
    <group>
      <Laser color={color} />
      <Beam a={[-3.0, BY, 0]} b={[SLIT_X, BY, 0]} color={color} />
      <Slit a={p.a} />
      <Fan from={[SLIT_X, BY, 0]} toX={screenX} halfWidth={half} color={color} opacity={0.22} />
      <Fan from={[SLIT_X, BY, 0]} toX={screenX} halfWidth={Math.min(half * 2, SCR_W / 2)} color={color} opacity={0.06} />
      <Screen x={screenX} draw={draw} deps={[p.lambda, p.a, p.D]} />
      <Html position={[-3.6, BY + 0.45, 0]} center zIndexRange={[10, 0]}><span className="lbl">Laser λ = {p.lambda} nm</span></Html>
      <Html position={[SLIT_X, BY + 0.7, 0]} center zIndexRange={[10, 0]}><span className="lbl">Fente a = {p.a} µm</span></Html>
      <Html position={[screenX, BY + 1.05, 0]} center zIndexRange={[10, 0]}><span className="lbl">Écran</span></Html>
      {/* cote D */}
      <Beam a={[SLIT_X, 0.24, 0.55]} b={[screenX, 0.24, 0.55]} color="#e0a000" radius={0.008} opacity={1} />
      <Html position={[(SLIT_X + screenX) / 2, 0.42, 0.55]} center zIndexRange={[10, 0]}><span className="lbl">D = {p.D.toFixed(2)} m</span></Html>
    </group>
  )
}

/* ---------- prisme : tracé des rayons dans le plan horizontal ---------- */

const PRISM_C = [0.2, 0] // centre (x, u) avec u = −z
const SIDE = 1.2
const HT = (SIDE * Math.sqrt(3)) / 2
const VA = [PRISM_C[0], PRISM_C[1] + (2 * HT) / 3]
const VB = [PRISM_C[0] - SIDE / 2, PRISM_C[1] - HT / 3]
const VC = [PRISM_C[0] + SIDE / 2, PRISM_C[1] - HT / 3]
const rad = Math.PI / 180
const to3 = ([x, u], y = BY) => [x, y, -u]

/** intersection de la demi-droite (P, angle) avec la droite (Q1, Q2) */
function hit(P, ang, Q1, Q2) {
  const d = [Math.cos(ang * rad), Math.sin(ang * rad)]
  const e = [Q2[0] - Q1[0], Q2[1] - Q1[1]]
  const den = d[0] * e[1] - d[1] * e[0]
  const t = ((Q1[0] - P[0]) * e[1] - (Q1[1] - P[1]) * e[0]) / den
  return [P[0] + t * d[0], P[1] + t * d[1]]
}

function PrismSetup({ p }) {
  const laser = p.source === 'laser'
  const wl = laser ? [p.lambda] : SPECTRUM
  const P1 = [VA[0] + 0.55 * (VB[0] - VA[0]), VA[1] + 0.55 * (VB[1] - VA[1])]
  const inAng = -(90 - APEX / 2) + p.i // direction du rayon incident (°)
  const back = 3.2
  const S = [P1[0] - back * Math.cos(inAng * rad), P1[1] - back * Math.sin(inAng * rad)]
  const ref = prism(560, p.i)
  const rays = wl.map((nm) => {
    const r = prism(nm, p.i)
    const P2 = hit(P1, -(90 - APEX / 2) + r.r, VA, VC)
    const outAng = r.i2 == null ? null : 90 - APEX / 2 - r.i2
    return { nm, r, P2, outAng }
  })
  const refRay = rays.find((x) => x.nm === 560) ?? rays[0]
  const refOut = 90 - APEX / 2 - (ref.i2 ?? 0)
  const dist = 3.2
  const SC = [refRay.P2[0] + dist * Math.cos(refOut * rad), refRay.P2[1] + dist * Math.sin(refOut * rad)]
  const tangent = [-Math.sin(refOut * rad), Math.cos(refOut * rad)]
  const ends = rays.map((ry) => {
    if (ry.outAng == null) return null
    const E = hit(ry.P2, ry.outAng, SC, [SC[0] + tangent[0], SC[1] + tangent[1]])
    const s = (E[0] - SC[0]) * tangent[0] + (E[1] - SC[1]) * tangent[1]
    return { E, s }
  })
  const glass = useMemo(() => {
    const sh = new THREE.Shape()
    sh.moveTo(VA[0], VA[1]); sh.lineTo(VB[0], VB[1]); sh.lineTo(VC[0], VC[1]); sh.closePath()
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.9, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 })
    g.rotateX(-Math.PI / 2) // extrusion vers le haut, u → −z
    g.translate(0, BY - 0.45, 0)
    return g
  }, [])
  const draw = (g, W, H) => {
    g.fillStyle = '#ecebe6'
    g.fillRect(0, 0, W, H)
    g.globalCompositeOperation = 'multiply'
    ends.forEach((e, k) => {
      if (!e) return
      const px = W / 2 - (e.s / SCR_W) * W
      const [r, gg, b] = wavelengthRGB(rays[k].nm)
      const wpx = laser ? 10 : W / SCR_W * 0.06
      const grad = g.createLinearGradient(px - wpx, 0, px + wpx, 0)
      const c = `rgb(${Math.round(255 * (0.15 + 0.85 * r))},${Math.round(255 * (0.15 + 0.85 * gg))},${Math.round(255 * (0.15 + 0.85 * b))})`
      grad.addColorStop(0, 'rgba(255,255,255,0)')
      grad.addColorStop(0.5, c)
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = grad
      g.fillRect(px - wpx, H * 0.25, 2 * wpx, H * 0.4)
    })
    g.globalCompositeOperation = 'source-over'
    g.fillStyle = '#333'
    g.font = 'bold 26px system-ui, sans-serif'
    g.textAlign = 'center'
    if (!laser) {
      const e0 = ends[0], e1 = ends[ends.length - 1]
      if (e0 && e1) {
        g.fillText('violet', W / 2 - (e0.s / SCR_W) * W, H * 0.78)
        g.fillText('rouge', W / 2 - (e1.s / SCR_W) * W, H * 0.78)
      }
    } else if (ends[0]) g.fillText(p.lambda + ' nm', W / 2 - (ends[0].s / SCR_W) * W, H * 0.78)
  }
  const scrRot = Math.atan2(-Math.cos(refOut * rad), Math.sin(refOut * rad))
  return (
    <group>
      {laser ? (
        <group position={to3(S, 0)} rotation={[0, inAng * rad, 0]}>
          <group position={[-0.6, BY, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.16, 0.16, 1.1, 32]} />
              <meshStandardMaterial color="#1d2a3a" metalness={0.6} roughness={0.35} />
            </mesh>
          </group>
        </group>
      ) : (
        <WhiteLamp position={to3(S)} rotationY={inAng * rad} />
      )}
      <Beam a={to3(S)} b={to3(P1)} color={laser ? wavelengthHex(p.lambda) : '#ffffff'} radius={0.016} />
      {rays.map((ry, k) => (
        <group key={ry.nm}>
          <Beam a={to3(P1)} b={to3(ry.P2)} color={wavelengthHex(ry.nm)} radius={0.006} opacity={0.7} />
          {ends[k] && <Beam a={to3(ry.P2)} b={to3(ends[k].E)} color={wavelengthHex(ry.nm)} radius={0.008} opacity={0.85} />}
        </group>
      ))}
      <mesh geometry={glass} castShadow>
        <meshPhysicalMaterial color="#dff3ff" transparent opacity={0.28} roughness={0.02} metalness={0} clearcoat={1} ior={1.75} envMapIntensity={2} depthWrite={false} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[glass, 30]} />
        <lineBasicMaterial color="#d6f0ff" transparent opacity={0.8} />
      </lineSegments>
      <mesh position={[PRISM_C[0], BY - 0.5, -PRISM_C[1]]}>
        <cylinderGeometry args={[0.55, 0.6, 0.08, 40]} />
        <meshStandardMaterial color="#2a2d33" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[PRISM_C[0], (BY - 0.54) / 2, -PRISM_C[1]]}>
        <cylinderGeometry args={[0.05, 0.05, BY - 0.54, 12]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <Screen position={to3(SC, 0)} rotationY={scrRot} draw={draw} deps={[p.i, p.source, p.lambda]} />
      <Html position={to3([PRISM_C[0], PRISM_C[1] + 0.9], BY + 0.6)} center zIndexRange={[10, 0]}>
        <span className="lbl">Prisme (flint, A = 60°)</span>
      </Html>
      <Html position={to3(S, BY + 0.55)} center zIndexRange={[10, 0]}>
        <span className="lbl">{laser ? `Laser ${p.lambda} nm` : 'Lumière blanche'}</span>
      </Html>
    </group>
  )
}

export default function DiffractionScene({ sim }) {
  const p = sim.paramsRef.current
  const room = useRef()
  useFrame(() => {}) // la scène est statique ; les réglages la reconstruisent
  return (
    <group ref={room}>
      {p.mode === 'fente' ? (
        <>
          <Bench />
          <DiffractionSetup p={p} />
        </>
      ) : (
        <>
          <mesh position={[0, -0.08, 0.3]} receiveShadow>
            <boxGeometry args={[11, 0.16, 7]} />
            <meshStandardMaterial color="#4a3a2c" roughness={0.8} />
          </mesh>
          <PrismSetup p={p} />
        </>
      )}
    </group>
  )
}
