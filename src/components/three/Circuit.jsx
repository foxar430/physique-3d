import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { Wire, Polyline, Lead, makePath } from './Wire.jsx'
import { Resistor, Capacitor, Coil, Bench, SwitchBase, Contact, Multimeter, Breadboard } from './parts.jsx'
import { TensionArrow, CurrentArrow } from './Arrows.jsx'

/*
 * Circuit générique sur une plaque de montage (vue de dessus : x → droite, z → observateur).
 *
 *  ALIM(+)──1  K  P ─i→─[ bloc 1 ]─[ bloc 2 ]─…── TR
 *     │        2                                  │
 *     │        │                              [ bloc droit ]
 *  ALIM(−)─────J───────────────────────────────── BR
 *
 * Chaque bloc peut contenir jusqu'à 3 dipôles en parallèle : le premier sur la ligne principale,
 * les autres décalés vers l'intérieur du circuit et reliés par deux fils de dérivation.
 * Les flèches-tension sont droites, parallèles au bloc, en convention récepteur (opposées à i) ;
 * celle du générateur est en convention générateur.
 */
const Y = 0.05
const SX = -2.4
const BAT_P = [SX, Y, -0.6]
const BAT_N = [SX, Y, 0.6]
const TL = [SX, Y, -1.2]
const BL = [SX, Y, 1.2]
const T1 = [-1.5, Y, -1.2]
const P = [-0.7, Y, -1.2]
const T2 = [-0.7, Y, -0.4]
const TOP_A = -0.2
const TOP_B = 2.3
const ZT = -1.2 // ligne du haut
const XR = 2.6 // ligne de droite
const TR = [XR, Y, ZT]
const RIGHT_A = -0.68
const RIGHT_B = 0.68
const BR = [XR, Y, 1.2]
const J = [-0.7, Y, 1.2]
const N_FLOW = 44
const RED = '#c0392b'
const BLACK = '#22252a'
const PAR = 0.62 // décalage d'un dipôle en parallèle
const TEXT_PERIOD = 0.25 // s : rafraîchissement des valeurs affichées

const LEN = { R: 1.1, L: 1.2, C: 0.5 }
export const U_COLORS = { R: '#3e9bff', L: '#b07cff', C: '#e5484d', E: '#e0a000', i: '#30a46c' }

function slotsAlong(n, a, b) {
  const out = []
  for (let k = 0; k < n; k++) out.push([a + ((b - a) * k) / n, a + ((b - a) * (k + 1)) / n])
  return out
}

/** éléments d'un bloc (compatibilité : un élément simple devient un bloc d'un seul dipôle) */
const elsOf = (slot) => slot.els ?? [{ type: slot.type, ohms: slot.ohms, label: slot.label }]

/** géométrie d'un bloc placé sur [a, b] */
function placement(slot, a, b) {
  const c = (a + b) / 2
  const els = elsOf(slot)
  const room = b - a - 0.22
  const scale = Math.min(1, ...els.map((e) => room / LEN[e.type]))
  const half = Math.max(...els.map((e) => (LEN[e.type] * scale) / 2))
  const main = (LEN[els[0].type] * scale) / 2
  return { c, a, b, scale, e1: c - main, e2: c + main, bus1: c - half - 0.06, bus2: c + half + 0.06, els }
}

export default function CircuitScene({
  sim, params, view = { tensions: true, flow: true },
  source = { kind: 'battery' }, hasSwitch = true, onToggle,
  top, right, current, amps, charge, meter,
}) {
  const lever = useRef()
  const flow = useRef()
  const meterText = useRef()
  const srcText = useRef()
  const iText = useRef()
  const uSrcText = useRef()
  const uTexts = useRef([])
  const lastText = useRef(-1)
  const live = useMemo(() => ({ glows: new Set(), fields: new Set(), qA: new Set(), qB: new Set() }), [])
  const paths = useMemo(() => ({ 1: makePath([BAT_P, TL, T1, P, TR, BR, J, BL, BAT_N, BAT_P]), 2: makePath([P, TR, BR, J, T2, P]) }), [])

  const topSlots = slotsAlong(top.length, TOP_A, TOP_B)
  const topPl = top.map((sl, k) => placement(sl, topSlots[k][0], topSlots[k][1]))
  const rightPl = right ? placement(right, RIGHT_A, RIGHT_B) : null

  // zones où l'on ne dessine pas le courant : générateur, corps des dipôles principaux
  const zones = [{ x: [SX - 0.01, SX + 0.01], z: [-0.6, 0.6] }]
  topPl.forEach((pl) => zones.push({ x: [pl.e1, pl.e2], z: [ZT - 0.01, ZT + 0.01] }))
  if (rightPl) zones.push({ x: [XR - 0.01, XR + 0.01], z: [rightPl.e1, rightPl.e2] })

  const phase = useRef(0)
  const lastT = useRef(0)
  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), v: new THREE.Vector3(), d: new THREE.Vector3(), s: new THREE.Vector3(), q: new THREE.Quaternion(), up: new THREE.Vector3(0, 1, 0) }),
    [],
  )
  const slots = [...top, ...(right ? [right] : [])]

  useFrame(({ clock }, delta) => {
    const s = sim.stateRef.current
    const p = sim.paramsRef.current
    const k = hasSwitch ? s.k : 1
    const ratio = THREE.MathUtils.clamp(current(s, p), -1, 1)
    const r2 = ratio * ratio

    if (lever.current) {
      const target = k === 1 ? Math.PI : -Math.PI / 2
      lever.current.rotation.y = THREE.MathUtils.damp(lever.current.rotation.y, target, 12, delta)
    }
    live.glows.forEach((m) => (m.emissiveIntensity = 1.8 * r2))
    live.fields.forEach((m) => (m.opacity = 0.75 * r2))

    // sens réel du courant : chevrons qui avancent dans le sens de i
    const advancing = s.t > lastT.current
    if (s.t < lastT.current) phase.current = 0
    lastT.current = s.t
    if (advancing) phase.current += ratio * delta * 2.4
    const path = paths[k]
    const show = view.flow && Math.abs(ratio) > 0.004
    const sign = ratio >= 0 ? 1 : -1
    for (let n = 0; n < N_FLOW; n++) {
      path.at((n / N_FLOW) * path.total + phase.current, tmp.v, tmp.d)
      let hidden = !show
      for (const zn of zones) {
        if (tmp.v.x >= zn.x[0] && tmp.v.x <= zn.x[1] && tmp.v.z > zn.z[0] && tmp.v.z < zn.z[1]) hidden = true
      }
      tmp.d.multiplyScalar(sign)
      tmp.q.setFromUnitVectors(tmp.up, tmp.d)
      tmp.s.setScalar(hidden ? 0 : 0.6 + 0.4 * Math.min(1, Math.abs(ratio) * 3))
      tmp.v.y = Y + 0.06
      tmp.m.compose(tmp.v, tmp.q, tmp.s)
      flow.current.setMatrixAt(n, tmp.m)
    }
    flow.current.instanceMatrix.needsUpdate = true

    // valeurs affichées : rafraîchies 4 fois par seconde pour rester lisibles
    const now = clock.elapsedTime
    if (now - lastText.current < TEXT_PERIOD) return
    lastText.current = now
    if (charge) {
      const f = THREE.MathUtils.clamp(charge(s, p), -1, 1)
      const a = Math.min(1, Math.abs(f) * 1.4)
      const setQ = (set, plus) =>
        set.forEach((el) => {
          el.textContent = plus ? '+q' : '−q'
          el.className = 'qbadge ' + (plus ? 'pos' : 'neg')
          el.style.opacity = a.toFixed(2)
        })
      setQ(live.qA, f >= 0)
      setQ(live.qB, f < 0)
    }
    if (meterText.current && meter) meterText.current.textContent = meter.value(s, p)
    if (srcText.current && source.display) srcText.current.textContent = source.display(s, p)
    if (view.tensions) {
      if (iText.current && amps) iText.current.textContent = fmtA(amps(s, p))
      if (uSrcText.current && source.u) uSrcText.current.textContent = fmtV(source.u(s, p))
      slots.forEach((sl, n) => {
        const t = uTexts.current[n]
        if (t && sl.u) t.textContent = fmtV(sl.u(s, p))
      })
    }
  })

  const renderPart = (el) => {
    if (el.type === 'R') return <Resistor ohms={el.ohms} glowRef={(m) => m && live.glows.add(m)} />
    if (el.type === 'L') return <Coil fieldRef={(m) => m && live.fields.add(m)} />
    return <Capacitor labelA={(e) => e && live.qA.add(e)} labelB={(e) => e && live.qB.add(e)} />
  }

  /** dessine un bloc du haut (dipôles en parallèle décalés vers +z) */
  const topBlock = (sl, pl, k) => {
    const els = pl.els
    const color = (i) => (i === 0 ? RED : RED)
    return (
      <group key={k}>
        <Wire a={[pl.a, Y, ZT]} b={[pl.e1, Y, ZT]} color={RED} />
        <Wire a={[pl.e2, Y, ZT]} b={[pl.b, Y, ZT]} color={RED} />
        {els.map((el, i) => {
          const z = ZT + i * PAR
          const half = (LEN[el.type] * pl.scale) / 2
          return (
            <group key={i}>
              <group position={[pl.c, 0, z]} scale={pl.scale}>{renderPart(el)}</group>
              {i > 0 && (
                <>
                  <Polyline points={[[pl.bus1, Y, ZT], [pl.bus1, Y, z], [pl.c - half, Y, z]]} color={color(i)} radius={0.028} />
                  <Polyline points={[[pl.c + half, Y, z], [pl.bus2, Y, z], [pl.bus2, Y, ZT]]} color={color(i)} radius={0.028} />
                </>
              )}
              <Html position={[pl.c, 0.12, z + (i === els.length - 1 ? 0.42 : 0.3)]} center className="lbl big" zIndexRange={[10, 0]}>{el.label}</Html>
            </group>
          )
        })}
        <TensionArrow
          visible={view.tensions}
          from={[pl.bus2, 0.1, ZT - 0.5]}
          to={[pl.bus1, 0.1, ZT - 0.5]}
          color={U_COLORS[els[0].type]}
          name={sl.name}
          valueRef={(e) => (uTexts.current[k] = e)}
          labelOffset={[0, 0.12, -0.22]}
        />
      </group>
    )
  }

  /** bloc de droite (dipôles en parallèle décalés vers −x) */
  const rightBlock = (sl, pl) => {
    const els = pl.els
    return (
      <group>
        <Wire a={[XR, Y, RIGHT_A]} b={[XR, Y, pl.e1]} color={RED} />
        <Wire a={[XR, Y, pl.e2]} b={[XR, Y, RIGHT_B]} color={BLACK} />
        {els.map((el, i) => {
          const x = XR - i * PAR
          const half = (LEN[el.type] * pl.scale) / 2
          return (
            <group key={i}>
              <group position={[x, 0, 0]} rotation={[0, -Math.PI / 2, 0]} scale={pl.scale}>{renderPart(el)}</group>
              {i > 0 && (
                <>
                  <Polyline points={[[XR, Y, pl.bus1], [x, Y, pl.bus1], [x, Y, -half]]} color={RED} radius={0.028} />
                  <Polyline points={[[x, Y, half], [x, Y, pl.bus2], [XR, Y, pl.bus2]]} color={BLACK} radius={0.028} />
                </>
              )}
              <Html position={[x - 0.45, 0.12, 0]} center className="lbl big" zIndexRange={[10, 0]}>{el.label}</Html>
            </group>
          )
        })}
        <TensionArrow
          visible={view.tensions}
          from={[XR + 0.55, 0.1, pl.bus2]}
          to={[XR + 0.55, 0.1, pl.bus1]}
          color={U_COLORS[els[0].type]}
          name={sl.name}
          valueRef={(e) => (uTexts.current[top.length] = e)}
          labelOffset={[0.35, 0.12, 0]}
        />
      </group>
    )
  }

  return (
    <group>
      <Breadboard />

      {/* générateur : alimentation stabilisée ou GBF */}
      <group position={[SX - 0.78, 0, 0]}>
        <Bench kind={source.kind} textRef={srcText} />
      </group>
      <Lead smooth metal={false} color={RED} radius={0.035} points={[[SX - 0.22, 0.22, -0.6], [SX - 0.1, 0.2, -0.6], [SX, Y, -0.6]]} />
      <Lead smooth metal={false} color={BLACK} radius={0.035} points={[[SX - 0.22, 0.22, 0.6], [SX - 0.1, 0.2, 0.6], [SX, Y, 0.6]]} />
      <Html position={[SX - 0.1, 0.45, -0.75]} center className="lbl" zIndexRange={[10, 0]}>+</Html>
      <Html position={[SX - 0.1, 0.45, 0.75]} center className="lbl" zIndexRange={[10, 0]}>−</Html>

      {/* câbles : rouge à l'aller, noir au retour */}
      <Polyline points={[BAT_P, TL, T1]} color={RED} />
      {hasSwitch ? (
        <>
          <SwitchBase position={[-1.07, 0, -0.85]} />
          <Contact at={T1} />
          <Contact at={T2} />
          <Contact at={P} />
          <Wire a={T2} b={J} color={BLACK} />
          <group ref={lever} position={[P[0], Y + 0.13, P[2]]} rotation={[0, Math.PI, 0]}>
            <mesh
              position={[0.42, 0, 0]}
              castShadow
              onClick={(e) => {
                e.stopPropagation()
                onToggle?.()
              }}
              onPointerOver={() => (document.body.style.cursor = 'pointer')}
              onPointerOut={() => (document.body.style.cursor = '')}
            >
              <boxGeometry args={[0.88, 0.05, 0.11]} />
              <meshStandardMaterial color="#d9b54a" metalness={0.9} roughness={0.25} />
            </mesh>
            <mesh position={[0.62, 0.11, 0]} castShadow>
              <cylinderGeometry args={[0.055, 0.06, 0.2, 16]} />
              <meshPhysicalMaterial color="#b3261e" roughness={0.3} clearcoat={1} />
            </mesh>
          </group>
          <Html position={[-1.1, 0.55, -1.6]} center className="lbl big" zIndexRange={[10, 0]}>K</Html>
          <Html position={[-1.5, 0.32, -0.95]} center className="lbl" zIndexRange={[10, 0]}>1</Html>
          <Html position={[-0.42, 0.32, -0.4]} center className="lbl" zIndexRange={[10, 0]}>2</Html>
        </>
      ) : (
        <Wire a={T1} b={P} color={RED} />
      )}
      <Wire a={P} b={[TOP_A, Y, ZT]} color={RED} />

      {/* branche du haut */}
      {top.map((sl, k) => topBlock(sl, topPl[k], k))}
      <Polyline points={[[TOP_B, Y, ZT], TR, [XR, Y, RIGHT_A]]} color={RED} />

      {/* branche de droite */}
      {right && rightBlock(right, rightPl)}
      <Polyline points={[[XR, Y, RIGHT_B], BR, J, BL, BAT_N]} color={BLACK} />

      {/* tension du générateur (convention générateur : la flèche pointe vers la borne +) */}
      {source.u && (
        <TensionArrow
          visible={view.tensions}
          from={[SX + 0.35, 0.1, 0.55]}
          to={[SX + 0.35, 0.1, -0.55]}
          color={U_COLORS.E}
          name={source.name}
          valueRef={uSrcText}
          labelOffset={[0.45, 0.12, 0]}
        />
      )}

      {/* flèche d'orientation de l'intensité */}
      {amps && <CurrentArrow visible={view.tensions} at={[-0.45, Y + 0.05, ZT]} dir={[1, 0, 0]} valueRef={iText} />}

      {/* multimètre branché aux bornes du bloc de droite */}
      {meter && right && (
        <>
          <group position={[4.15, 0, 0.75]} rotation={[0, -0.35, 0]}>
            <Multimeter textRef={meterText} label={meter.label} />
          </group>
          <Lead smooth metal={false} color={RED} radius={0.02} points={[[4.03, 0.2, 1.18], [3.6, 0.5, 0.6], [3.0, 0.4, -0.6], [XR + 0.06, 0.1, rightPl.bus1 - 0.04]]} />
          <Lead smooth metal={false} color={BLACK} radius={0.02} points={[[4.33, 0.2, 1.05], [3.9, 0.45, 1.25], [3.0, 0.35, 1.0], [XR + 0.06, 0.1, rightPl.bus2 + 0.04]]} />
        </>
      )}

      {/* sens réel du courant */}
      <instancedMesh ref={flow} args={[null, null, N_FLOW]}>
        <coneGeometry args={[0.055, 0.15, 10]} />
        <meshBasicMaterial color="#ffd23f" />
      </instancedMesh>
    </group>
  )
}

function fmtV(v) {
  const a = Math.abs(v)
  if (a < 1e-4) return '0 V'
  return (a < 1 ? (v * 1000).toFixed(0) + ' mV' : v.toFixed(2) + ' V').replace('-', '−')
}
function fmtA(i) {
  const a = Math.abs(i)
  if (a < 1e-7) return '0 mA'
  return (a < 1e-3 ? (i * 1e6).toFixed(0) + ' µA' : (i * 1000).toFixed(a < 0.01 ? 2 : 1) + ' mA').replace('-', '−')
}
