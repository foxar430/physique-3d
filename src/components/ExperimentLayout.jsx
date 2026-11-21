import { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

const SPEEDS = [0.1, 0.25, 0.5, 1, 2, 5]
/** vitesses pour les phénomènes de quelques millisecondes (RL, RLC) */
export const FAST_SPEEDS = [0.002, 0.005, 0.01, 0.02, 0.05, 0.1]
const speedLabel = (s) => (s >= 1 ? '×' + s : s >= 0.1 ? '×' + s : '÷' + Math.round(1 / s))

/**
 * Gabarit commun à toutes les expériences :
 * scène 3D + panneau de réglages + courbes + cours en bref.
 */
export default function ExperimentLayout({ meta, sim, scene, camera, controls, readouts, charts, course, onParamsReset, speeds = SPEEDS, speedNote }) {
  const stageRef = useRef(null)
  const fullscreen = () => {
    const el = stageRef.current
    if (!document.fullscreenElement) el?.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  return (
    <div className="exp">
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

      <div className="exp-grid" ref={stageRef}>
        <section className="stage" aria-label="Scène 3D">
          <Canvas camera={{ position: camera?.position ?? [0, 2, 6], fov: camera?.fov ?? 45 }} shadows dpr={[1, 2]}>
            <Suspense fallback={null}>
              <color attach="background" args={['#14171c']} />
              <ambientLight intensity={0.5} />
              <directionalLight position={[4, 8, 5]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
              <directionalLight position={[-5, 3, -4]} intensity={0.4} />
              {scene}
              <OrbitControls makeDefault target={camera?.target ?? [0, 0, 0]} enablePan={false} minDistance={2} maxDistance={20} />
            </Suspense>
          </Canvas>
          <div className="hud">{readouts}</div>
          <p className="hint">Glisse pour tourner · molette pour zoomer</p>
        </section>

        <aside className="panel">
          <div className="sim-buttons">
            <button className="primary" onClick={() => sim.setRunning(!sim.running)}>
              {sim.running ? '⏸ Pause' : '▶ Lecture'}
            </button>
            <button onClick={sim.reset}>↺ Recommencer</button>
            <button onClick={fullscreen} title="Plein écran (projection en classe)">⛶</button>
          </div>
          <div className="speed" role="group" aria-label="Vitesse de simulation">
            <span>Vitesse</span>
            {speeds.map((s) => (
              <button key={s} className={s === sim.speed ? 'on' : ''} onClick={() => sim.setSpeed(s)}>
                {speedLabel(s)}
              </button>
            ))}
          </div>
          {speedNote && <p className="small muted">{speedNote}</p>}
          <h2>Paramètres</h2>
          {controls}
          {onParamsReset && (
            <button className="link" onClick={onParamsReset}>
              Valeurs par défaut
            </button>
          )}
        </aside>

        <section className="charts">{charts}</section>
      </div>

      <article className="course">{course}</article>
    </div>
  )
}
