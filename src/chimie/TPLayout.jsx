import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { OrbitControls, Environment, Lightformer } from '@react-three/drei'
import Bench, { BURETTE_X, BURETTE_Z } from './Bench.jsx'
import { createLab, tick, buretteDeliver, buretteZero, buretteReading, DROP, occupant } from './lab.js'

/** fait avancer la paillasse à chaque image et rafraîchit l'interface ~6 fois/s */
function Ticker({ lab, speed, refresh }) {
  const last = useRef({ v: -1, t: 0 })
  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    tick(lab, dt, dt * speed.current)
    if (lab.version !== last.current.v && clock.elapsedTime - last.current.t > 0.16) {
      last.current = { v: lab.version, t: clock.elapsedTime }
      refresh()
    }
  })
  return null
}

const SPEEDS = [1, 10, 60]
const HOME_POS = [0, 5.0, 6.4]
const HOME_TGT = [0, 0.5, 0]

/**
 * Zoom automatique : quand on tient un objet au-dessus d'une cible (ou qu'on utilise la burette),
 * la caméra s'approche de l'action, puis revient à la vue choisie par l'élève.
 */
function FocusCamera({ lab, zoomOn }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls)
  const st = useMemo(() => ({ active: false, homePos: new THREE.Vector3(), homeTgt: new THREE.Vector3(), p: new THREE.Vector3(), t: new THREE.Vector3() }), [])
  useFrame((_, delta) => {
    if (!controls) return
    const buretteBusy = lab.burette && (lab.burette.open || performance.now() < (lab.buretteFocusUntil ?? 0))
    let F = null
    if (zoomOn.current && lab.held && lab.hover) {
      if (lab.hover === 'burette') F = [BURETTE_X, 2.25, BURETTE_Z]
      else {
        const t = lab.items[lab.hover]
        F = [t.pos[0], (lab.topOf ? lab.topOf(t) : 0.6) * 0.7 + (t.pos[1] ?? 0), t.pos[2]]
      }
    } else if (zoomOn.current && buretteBusy) F = [BURETTE_X, 0.85, BURETTE_Z]
    const k = 1 - Math.exp(-delta * 3.2)
    // bouton « Vue d'ensemble » : retour à la vue de départ
    if (lab.resetView) {
      st.active = true
      st.homePos.set(...HOME_POS)
      st.homeTgt.set(...HOME_TGT)
      lab.resetView = false
    }
    if (F) {
      if (!st.active) {
        st.homePos.copy(camera.position)
        st.homeTgt.copy(controls.target)
        st.active = true
      }
      st.t.set(F[0], F[1], F[2])
      st.p.set(F[0] + 0.5, F[1] + 1.0, F[2] + 2.2)
      camera.position.lerp(st.p, k)
      controls.target.lerp(st.t, k)
      controls.update()
    } else if (st.active) {
      camera.position.lerp(st.homePos, k)
      controls.target.lerp(st.homeTgt, k)
      controls.update()
      if (camera.position.distanceTo(st.homePos) < 0.02) st.active = false
    }
  })
  return null
}

/** bandeau : ce qui est en train de se passer, avec le volume en grand */
function actionText(lab) {
  const p = lab.pour
  const held = lab.held ? lab.items[lab.held] : null
  const mL = (v) => (v * 1000).toFixed(1) + ' mL'
  if (p && held) {
    if (p.mode === 'fill') {
      const src = lab.items[p.from]
      const want = held.kind === 'pipette' ? held.cap : Math.min(held.cap, held.target ?? held.cap)
      return { title: `Remplissage : ${held.label}`, sub: `depuis ${src.tag?.name ?? src.label}`, value: `${mL(held.filling ?? 0)} / ${mL(want)}` }
    }
    if (p.to === 'burette') return { title: `Remplissage de la burette`, sub: held.tag?.name ?? held.label, value: mL(lab.burette.sol.V) + ' dedans' }
    const to = lab.items[p.to]
    if (p.mode === 'drops') return { title: `${held.tag?.name ?? held.label}`, sub: `gouttes dans ${to.label}`, value: '💧' }
    return { title: `Versement : ${held.tag?.name ?? held.label} → ${to.label}`, sub: 'relâche pour arrêter', value: mL(to.sol.V) }
  }
  if (held && !lab.hover) return { title: `${held.label} en main`, sub: 'approche-le d’une cible surlignée en jaune', value: '' }
  if (lab.burette?.open) {
    const under = occupant(lab, lab.slots.find((s) => s.kind === 'stirrer')?.id)
    return { title: 'Burette ouverte', sub: under ? `vers ${under.label}` : 'aucun récipient dessous !', value: lab.burette.zeroed ? buretteReading(lab).toFixed(2) + ' mL' : '' }
  }
  return null
}

/**
 * Gabarit d'un TP de chimie : paillasse 3D interactive + fiche de TP (étapes cochées automatiquement)
 * + messages + commandes + cahier de mesures + cours.
 *  cfg   : objets, emplacements, burette, pH-mètre (voir lab.js)
 *  steps : (lab) => [{ text, done }]
 *  tools : (lab, refresh) => JSX (commandes propres au TP)
 *  notebook, charts, course : (lab) => JSX
 */
export default function TPLayout({ meta, cfg, steps, tools, notebook, charts, course, timeSpeeds = false, setupLab }) {
  const lab = useMemo(() => {
    const l = createLab(cfg)
    setupLab?.(l)
    if (import.meta.env.DEV) window.__lab = l // tests en local
    return l
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [, setV] = useState(0)
  const refresh = () => setV((v) => v + 1)
  const speed = useRef(1)
  const [sp, setSp] = useState(1)
  const zoomOn = useRef(true)
  const [zoom, setZoom] = useState(true)
  const act = actionText(lab)
  const list = steps(lab)
  const doneCount = list.filter((s) => s.done).length
  const current = list.findIndex((s) => !s.done)

  const fmtT = (t) => {
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m} min ${String(s).padStart(2, '0')} s`
  }

  return (
    <div className="exp chem">
      <header className="exp-head">
        <a href="#/" className="back">← Expériences</a>
        <div>
          <h1>{meta.title}</h1>
          <p className="tags">
            <span>{meta.level}</span>
            <span>{meta.sections}</span>
            <span>{meta.chapter}</span>
          </p>
        </div>
      </header>

      <div className="exp-grid">
        <section className="stage" aria-label="Paillasse 3D">
          <Canvas camera={{ position: HOME_POS, fov: 45 }} shadows dpr={[1, 2]}>
            <Suspense fallback={null}>
              <color attach="background" args={['#14171c']} />
              <ambientLight intensity={0.6} />
              <directionalLight position={[3, 8, 5]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={4} shadow-camera-bottom={-4} />
              <Environment resolution={128} frames={1}>
                <Lightformer form="rect" intensity={2.2} position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[10, 6, 1]} />
                <Lightformer form="rect" intensity={1} position={[-6, 2, 0]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
              </Environment>
              <Bench lab={lab} cfg={cfg} onChange={refresh} />
              <Ticker lab={lab} speed={speed} refresh={refresh} />
              <FocusCamera lab={lab} zoomOn={zoomOn} />
              <OrbitControls makeDefault target={HOME_TGT} enablePan={false} minDistance={2} maxDistance={11} maxPolarAngle={1.35} />
            </Suspense>
          </Canvas>
          {act && (
            <div className="action-banner">
              {act.title} {act.value && <b>{act.value}</b>}
              <small>{act.sub}</small>
            </div>
          )}
          <div className="zoom-toggle">
            <button onClick={() => ((zoomOn.current = !zoom), setZoom(!zoom))} title="Zoom automatique sur l’action">
              🔍 Zoom auto : {zoom ? 'oui' : 'non'}
            </button>
            <button onClick={() => (lab.resetView = true)} title="Revenir à la vue de toute la paillasse">⤢ Vue d’ensemble</button>
          </div>
          <div className="chem-log">
            {lab.log.slice(0, 2).map((m) => (
              <div key={m.id} className={'msg ' + m.level}>{m.text}</div>
            ))}
          </div>
          <p className="hint">Clique-glisse un objet pour le prendre · maintiens-le au-dessus d’un récipient pour verser · glisse le fond pour tourner</p>
        </section>

        <aside className="panel">
          <h2>Fiche de TP <span className="count">{doneCount}/{list.length}</span></h2>
          <ol className="steps">
            {list.map((s, i) => (
              <li key={i} className={s.done ? 'done' : i === current ? 'now' : ''}>
                <span className="box">{s.done ? '✓' : i + 1}</span>
                <span>{s.text}</span>
              </li>
            ))}
          </ol>
          {cfg.burette && (
            <div className="bur-tools">
              <h2>Burette</h2>
              <div className="speed">
                <button onClick={() => (buretteZero(lab), refresh())}>Ajuster le zéro</button>
                <button onClick={() => ((lab.buretteFocusUntil = performance.now() + 2500), buretteDeliver(lab, DROP), refresh())}>+ 1 goutte</button>
                <button onClick={() => ((lab.buretteFocusUntil = performance.now() + 2500), buretteDeliver(lab, 0.0005), refresh())}>+ 0,5 mL</button>
                <button onClick={() => ((lab.buretteFocusUntil = performance.now() + 2500), buretteDeliver(lab, 0.001), refresh())}>+ 1 mL</button>
              </div>
            </div>
          )}
          {timeSpeeds && (
            <div className="speed" role="group" aria-label="Vitesse du temps">
              <span>Temps</span>
              {SPEEDS.map((s) => (
                <button key={s} className={sp === s ? 'on' : ''} onClick={() => ((speed.current = s), setSp(s))}>×{s}</button>
              ))}
              <span className="chrono">⏱ {lab.chrono.on ? fmtT(lab.t - lab.chrono.t0) : '—'}</span>
            </div>
          )}
          {tools?.(lab, refresh)}
        </aside>

        <section className="charts">
          {notebook?.(lab, refresh)}
          {charts?.(lab)}
        </section>
      </div>

      <article className="course">{course}</article>
    </div>
  )
}
