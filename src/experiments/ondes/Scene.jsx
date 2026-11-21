import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Bench } from '../../components/three/parts.jsx'
import { Lead } from '../../components/three/Wire.jsx'
import { shownTime, yS, y as yAt } from './model.js'

/* 1 unité = 10 cm. La cuve (40 cm × 40 cm d'eau) est posée sur pieds au-dessus de la paillasse. */
const W = 4 // côté de la surface d'eau (unités)
const WY = 1.0 // hauteur de la surface d'eau
const REGLETTE_X = -1.8 // position de la réglette (ondes rectilignes)
const HS = 0.004 // hauteur visuelle (unités) pour 1 mm d'amplitude
const SEG = 320

/* ---------- élongation de la surface, partagée par l'eau et l'écran ---------- */
const GLSL = /* glsl */ `
uniform float uT, uN, uV, uPulse, uMode, uAtten, uH;
float ySrc(float t) {
  if (t < 0.0) return 0.0;
  if (uPulse > 0.5 && t > 0.5 / uN) return 0.0;
  return sin(6.2831853 * uN * t);
}
float distS(vec2 pu) {
  vec2 pm = pu * 0.1;
  return uMode < 0.5 ? length(pm) : abs(pm.x - ${(REGLETTE_X * 0.1).toFixed(3)});
}
float hgt(vec2 pu) {
  float r = distS(pu);
  float A = (uAtten > 0.5 && uMode < 0.5) ? sqrt(0.01 / (r + 0.01)) : 1.0;
  return ySrc(uT - r / uV) * A;
}
`

function makeUniforms() {
  return {
    uT: { value: 0 },
    uN: { value: 20 },
    uV: { value: 0.3 },
    uPulse: { value: 0 },
    uMode: { value: 0 },
    uAtten: { value: 0 },
    uH: { value: 0.008 },
    uStrobe: { value: 0 },
  }
}

/** Surface d'eau : matériau physique (reflets de l'environnement) + déplacement et normales calculés dans le shader. */
function Water({ uniforms }) {
  const geo = useMemo(() => new THREE.PlaneGeometry(W, W, SEG, SEG).rotateX(-Math.PI / 2), [])
  const mat = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      color: '#17698c',
      roughness: 0.03,
      metalness: 0,
      ior: 1.33,
      transparent: true,
      opacity: 0.72,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 2.2,
      specularIntensity: 1,
    })
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms)
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\n' + GLSL + '\nvarying vec2 vLoc;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLoc = position.xz;\ntransformed.y += hgt(position.xz) * uH;')
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\n' + GLSL + '\nvarying vec2 vLoc;\nfloat gH = 0.0;')
        // crêtes un peu plus lumineuses (elles concentrent la lumière de la lampe)
        .replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.rgb *= 0.86 + 0.3 * gH;')
        .replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
          {
            float e = 0.004;
            float h0 = hgt(vLoc);
            gH = h0;
            float gx = (hgt(vLoc + vec2(e, 0.0)) - h0) / e * uH * 2.2;
            float gz = (hgt(vLoc + vec2(0.0, e)) - h0) / e * uH * 2.2;
            normal = normalize((viewMatrix * vec4(normalize(vec3(-gx, 1.0, -gz)), 0.0)).xyz);
          }`,
        )
    }
    m.customProgramCacheKey = () => 'cuve-eau'
    return m
  }, [uniforms])
  return <mesh geometry={geo} material={mat} position={[0, WY, 0]} />
}

/** Écran blanc sous la cuve : la lampe projette l'image des ondes (crêtes = lentilles convergentes → franges claires). */
function Screen({ uniforms }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `varying vec2 vLoc; void main(){ vLoc = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader:
          GLSL +
          `varying vec2 vLoc;
          uniform float uStrobe;
          void main(){
            // l'image est un peu agrandie (source ponctuelle au-dessus) : on lit la cuve à 1/1.12
            vec2 p = vLoc / 1.12;
            float h = hgt(p);
            float I = 0.56 + 0.40 * h;
            float edge = smoothstep(${(W / 2).toFixed(2)}, ${(W / 2 - 0.25).toFixed(2)}, max(abs(p.x), abs(p.y)));
            float vign = 1.0 - 0.35 * length(p) / 3.0;
            vec3 dark = vec3(0.10, 0.13, 0.17);
            vec3 lit = mix(vec3(1.0, 0.95, 0.85), vec3(0.88, 0.95, 1.0), uStrobe);
            vec3 c = mix(dark, lit, clamp(I, 0.0, 1.0)) * vign;
            c = mix(vec3(0.16, 0.17, 0.19), c, edge);
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [uniforms],
  )
  const geo = useMemo(() => new THREE.PlaneGeometry(W * 1.2, W * 1.2, 1, 1).rotateX(-Math.PI / 2), [])
  return <mesh geometry={geo} material={mat} position={[0, 0.006, 0]} />
}

/** Règle graduée en cm, posée sur le bord avant du cadre. */
function Ruler({ position }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 2048
    c.height = 96
    const g = c.getContext('2d')
    g.fillStyle = '#f3eee0'
    g.fillRect(0, 0, 2048, 96)
    g.strokeStyle = '#222'
    g.fillStyle = '#222'
    g.font = 'bold 30px system-ui, sans-serif'
    g.textAlign = 'center'
    const px = 2048 / 40 // 40 cm
    for (let mm = 0; mm <= 400; mm++) {
      const x = 4 + (mm / 10) * px * 0.995
      const L = mm % 10 === 0 ? 40 : mm % 5 === 0 ? 26 : 14
      g.lineWidth = mm % 10 === 0 ? 3 : 1.5
      g.beginPath()
      g.moveTo(x, 0)
      g.lineTo(x, L)
      g.stroke()
      if (mm % 50 === 0 && mm > 0 && mm < 400) g.fillText(mm / 10, x, 78)
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [])
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, 0]}>
        <planeGeometry args={[W, 0.19]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
      <mesh>
        <boxGeometry args={[W + 0.02, 0.02, 0.2]} />
        <meshStandardMaterial color="#d9d2bd" roughness={0.6} />
      </mesh>
    </group>
  )
}

/** Cuve : cadre en aluminium anodisé, fond en verre, amortisseurs en mousse, pieds réglables. */
function Tank() {
  const F = W + 0.5 // cadre extérieur
  const bars = [
    [[0, 0, -(F - 0.25) / 2], [F, 0.34, 0.25]],
    [[0, 0, (F - 0.25) / 2], [F, 0.34, 0.25]],
    [[-(F - 0.25) / 2, 0, 0], [0.25, 0.34, F - 0.5]],
    [[(F - 0.25) / 2, 0, 0], [0.25, 0.34, F - 0.5]],
  ]
  const foam = [
    [[0, 0, -W / 2 + 0.09], [W, 0.1, 0.2], [0.35, 0, 0]],
    [[0, 0, W / 2 - 0.09], [W, 0.1, 0.2], [-0.35, 0, 0]],
    [[-W / 2 + 0.09, 0, 0], [0.2, 0.1, W - 0.4], [0, 0, -0.35]],
    [[W / 2 - 0.09, 0, 0], [0.2, 0.1, W - 0.4], [0, 0, 0.35]],
  ]
  return (
    <group>
      {/* cadre */}
      <group position={[0, WY - 0.02, 0]}>
        {bars.map(([p, s], i) => (
          <RoundedBox key={i} args={s} radius={0.04} position={p} castShadow receiveShadow>
            <meshStandardMaterial color="#3a4250" metalness={0.75} roughness={0.32} />
          </RoundedBox>
        ))}
      </group>
      {/* fond en verre */}
      <mesh position={[0, WY - 0.17, 0]}>
        <boxGeometry args={[W + 0.1, 0.04, W + 0.1]} />
        <meshPhysicalMaterial color="#cfeaf2" transparent opacity={0.22} roughness={0.05} metalness={0} clearcoat={1} />
      </mesh>
      {/* volume d'eau (vu de côté à travers le verre) */}
      <mesh position={[0, WY - 0.08, 0]}>
        <boxGeometry args={[W - 0.02, 0.16, W - 0.02]} />
        <meshPhysicalMaterial color="#2a86ad" transparent opacity={0.18} roughness={0.1} depthWrite={false} />
      </mesh>
      {/* bandes de mousse anti-réflexion */}
      {foam.map(([p, s, r], i) => (
        <mesh key={i} position={[p[0], WY - 0.03, p[2]]} rotation={r} castShadow>
          <boxGeometry args={s} />
          <meshStandardMaterial color="#2b2e33" roughness={1} />
        </mesh>
      ))}
      {/* pieds avec vis de réglage */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => {
        const x = sx * (F / 2 - 0.13)
        const z = sz * (F / 2 - 0.13)
        return (
          <group key={sx + ',' + sz} position={[x, 0, z]}>
            <mesh position={[0, (WY - 0.2) / 2 + 0.06, 0]} castShadow>
              <cylinderGeometry args={[0.045, 0.045, WY - 0.2, 16]} />
              <meshStandardMaterial color="#c9ced6" metalness={0.95} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.03, 0]} castShadow>
              <cylinderGeometry args={[0.1, 0.12, 0.06, 20]} />
              <meshStandardMaterial color="#1d1f24" roughness={0.6} />
            </mesh>
          </group>
        )
      })}
      <Ruler position={[0, WY + 0.16, F / 2 - 0.125]} />
    </group>
  )
}

/** Vibreur sur potence (montée à l'arrière) : boîtier + tige, terminée par une pointe (ondes circulaires) ou une réglette (rectilignes). */
function Vibrator({ mode, rodRef }) {
  const rect = mode === 'rect'
  const x = rect ? REGLETTE_X : 0
  const F = W + 0.5
  const topY = WY + 1.25
  const pz = -(F / 2 + 0.35)
  const steel = <meshStandardMaterial color="#c9ced6" metalness={0.95} roughness={0.2} />
  return (
    <group position={[x, 0, 0]}>
      {/* pied + colonne */}
      <RoundedBox args={[0.7, 0.08, 0.5]} radius={0.03} position={[0, 0.04, pz]} castShadow receiveShadow>
        <meshStandardMaterial color="#1d1f24" roughness={0.55} />
      </RoundedBox>
      <mesh position={[0, (topY + 0.2) / 2, pz]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, topY + 0.2, 16]} />
        {steel}
      </mesh>
      {/* noix de serrage + bras horizontal */}
      <mesh position={[0, topY, pz]} castShadow>
        <boxGeometry args={[0.16, 0.16, 0.16]} />
        <meshStandardMaterial color="#8a6d2f" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, topY, pz / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, -pz, 16]} />
        {steel}
      </mesh>
      {/* boîtier du vibreur */}
      <RoundedBox args={[0.5, 0.42, 0.5]} radius={0.06} position={[0, topY - 0.05, 0]} castShadow>
        <meshStandardMaterial color="#b8372f" roughness={0.45} metalness={0.2} />
      </RoundedBox>
      <mesh position={[0, topY - 0.05, 0.255]}>
        <circleGeometry args={[0.12, 32]} />
        <meshStandardMaterial color="#2a2d33" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, topY - 0.05, 0.258]}>
        <ringGeometry args={[0.13, 0.15, 32]} />
        <meshStandardMaterial color="#e1e4e8" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* partie mobile : tige + pointe / réglette */}
      <group ref={rodRef}>
        <mesh position={[0, (topY - 0.26 + WY + 0.06) / 2, 0]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, topY - 0.26 - WY - 0.06, 12]} />
          <meshStandardMaterial color="#e1e4e8" metalness={0.95} roughness={0.15} />
        </mesh>
        {rect ? (
          <RoundedBox args={[0.08, 0.1, W - 0.5]} radius={0.02} position={[0, WY + 0.04, 0]} castShadow>
            <meshStandardMaterial color="#d8dce2" metalness={0.85} roughness={0.25} />
          </RoundedBox>
        ) : (
          <mesh position={[0, WY + 0.04, 0]} rotation={[Math.PI, 0, 0]} castShadow>
            <coneGeometry args={[0.05, 0.12, 20]} />
            <meshStandardMaterial color="#d8dce2" metalness={0.85} roughness={0.25} />
          </mesh>
        )}
      </group>
    </group>
  )
}

/** Lampe (stroboscope) au-dessus de la cuve, sur une potence. */
function Lamp({ glowRef }) {
  const H = 4.1
  const px = -2.95
  const pz = -2.75
  return (
    <group>
      <mesh position={[px, H / 2, pz]} castShadow>
        <cylinderGeometry args={[0.055, 0.055, H, 16]} />
        <meshStandardMaterial color="#c9ced6" metalness={0.95} roughness={0.2} />
      </mesh>
      <mesh position={[px, 0.04, pz]}>
        <cylinderGeometry args={[0.32, 0.36, 0.08, 32]} />
        <meshStandardMaterial color="#1d1f24" roughness={0.5} />
      </mesh>
      {/* bras vers le centre */}
      <Lead smooth={false} radius={0.04} color="#c9ced6" points={[[px, H, pz], [0, H, 0]]} />
      <group position={[0, H - 0.18, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.26, 0.4, 0.42, 32, 1, true]} />
          <meshStandardMaterial color="#2a2d33" metalness={0.5} roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.21, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.02, 32]} />
          <meshStandardMaterial color="#2a2d33" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.38, 32]} />
          <meshStandardMaterial ref={glowRef} color="#fff6e0" emissive="#fff1cc" emissiveIntensity={2} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  )
}

/** Bouchon de liège flottant au point M. */
function Cork({ corkRef }) {
  return (
    <group ref={corkRef}>
      <mesh castShadow>
        <cylinderGeometry args={[0.075, 0.065, 0.09, 24]} />
        <meshStandardMaterial color="#b98b55" roughness={0.9} />
      </mesh>
      <Html position={[0.05, 0.12, -0.28]} center zIndexRange={[20, 0]}>
        <span className="lbl">M</span>
      </Html>
    </group>
  )
}

export default function WaveScene({ sim }) {
  const uniforms = useMemo(makeUniforms, [])
  const rod = useRef()
  const cork = useRef()
  const glow = useRef()
  const gbfText = useRef()
  const mode = sim.paramsRef.current.mode

  useFrame(() => {
    const p = sim.paramsRef.current
    const t = shownTime(sim.stateRef.current.t, p)
    const u = uniforms
    u.uT.value = t
    u.uN.value = p.N
    u.uV.value = p.v
    u.uPulse.value = p.pulse ? 1 : 0
    u.uMode.value = p.mode === 'rect' ? 1 : 0
    u.uAtten.value = p.atten ? 1 : 0
    u.uH.value = HS * p.a
    u.uStrobe.value = p.strobe ? 1 : 0

    // la pointe suit y_S(t) (même échelle que la surface)
    if (rod.current) rod.current.position.y = yS(t, p) * HS
    // bouchon en M
    if (cork.current) {
      const x0 = p.mode === 'rect' ? REGLETTE_X : 0
      const r = p.d / 100
      cork.current.position.set(x0 + p.d / 10, WY + 0.02 + yAt(r, t, p) * HS, 0.0001)
    }
    if (glow.current) {
      glow.current.emissive.set(p.strobe ? '#cfe6ff' : '#fff1cc')
      glow.current.emissiveIntensity = p.strobe ? 3.2 : 1.6
    }
    if (gbfText.current) gbfText.current.textContent = p.N.toFixed(1) + ' Hz'
  })

  const vx = mode === 'rect' ? REGLETTE_X : 0
  return (
    <group>
      {/* paillasse */}
      <mesh position={[0, -0.08, 0.3]} receiveShadow>
        <boxGeometry args={[11, 0.16, 7.4]} />
        <meshStandardMaterial color="#6f5238" roughness={0.75} />
      </mesh>
      <Screen uniforms={uniforms} />
      <Tank />
      <Water uniforms={uniforms} />
      <Vibrator key={mode} mode={mode} rodRef={rod} />
      <Cork corkRef={cork} />
      <Lamp glowRef={glow} />
      {/* GBF qui alimente le vibreur */}
      <group position={[-4.1, 0, 1.6]} rotation={[0, -Math.PI / 2, 0]}>
        <Bench kind="gbf" textRef={gbfText} />
      </group>
      <Lead
        smooth
        metal={false}
        color="#22252a"
        radius={0.022}
        points={[[-3.5, 0.2, 2.12], [-3.2, 0.05, 2.8], [-3.7, 0.05, 0], [-2.6, 0.05, -(W / 2 + 0.95)], [vx, 0.05, -(W / 2 + 0.85)], [vx + 0.08, 0.9, -(W / 2 + 0.68)], [vx + 0.12, WY + 1.2, -0.25]]}
      />
      <Html position={[vx - 0.22, WY + 0.12, -0.3]} center zIndexRange={[20, 0]}>
        <span className="lbl">S</span>
      </Html>
    </group>
  )
}
