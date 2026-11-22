import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Lightformer } from '@react-three/drei'
import Bench from './Bench.jsx'
import { createLab, tick, buretteDeliver, buretteZero, DROP } from './lab.js'

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
          <Canvas camera={{ position: [0, 4.6, 6.6], fov: 45 }} shadows dpr={[1, 2]}>
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
              <OrbitControls makeDefault target={[0, 0.5, 0]} enablePan={false} minDistance={3} maxDistance={11} maxPolarAngle={1.35} />
            </Suspense>
          </Canvas>
          <div className="chem-log">
            {lab.log.map((m) => (
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
                <button onClick={() => (buretteDeliver(lab, DROP), refresh())}>+ 1 goutte</button>
                <button onClick={() => (buretteDeliver(lab, 0.0005), refresh())}>+ 0,5 mL</button>
                <button onClick={() => (buretteDeliver(lab, 0.001), refresh())}>+ 1 mL</button>
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
