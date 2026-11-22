import { Component, Suspense, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Lightformer } from '@react-three/drei'

const SPEEDS = [0.1, 0.25, 0.5, 1, 2, 5]

/** Si la scène 3D plante, on affiche un message au lieu de vider toute la page. */
class SceneBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error) {
    console.error('Scène 3D :', error)
  }
  render() {
    if (this.state.error)
      return (
        <div className="scene-error">
          La scène 3D n’a pas pu s’afficher. Les réglages et les courbes restent utilisables.
          <button onClick={() => this.setState({ error: null })}>Réessayer</button>
        </div>
      )
    return this.props.children
  }
}
/** vitesses pour les phénomènes de quelques millisecondes (RL, RLC) */
export const FAST_SPEEDS = [0.002, 0.005, 0.01, 0.02, 0.05, 0.1]
const speedLabel = (s) => (s >= 1 ? '×' + s : s >= 0.1 ? '×' + s : '÷' + Math.round(1 / s))

/**
 * Gabarit commun à toutes les expériences :
 * scène 3D + panneau de réglages + courbes + cours en bref.
 */
export default function ExperimentLayout({ meta, sim, scene, camera, controls, readouts, charts, course, onParamsReset, speeds = SPEEDS, speedNote, viewToggles = false }) {
  const stageRef = useRef(null)
  const toggles =
    viewToggles === true
      ? [{ key: 'tensions', label: 'Flèches tension et intensité' }, { key: 'flow', label: 'Sens du courant (animé)' }]
      : viewToggles || []
  const [view, setView] = useState(() => Object.fromEntries([['tensions', true], ['flow', true], ...toggles.map((t) => [t.key, t.on ?? true])]))
  const toggleView = (k) => setView((v) => ({ ...v, [k]: !v[k] }))
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
          <SceneBoundary>
          <Canvas key={String(camera?.position)} camera={{ position: camera?.position ?? [0, 2, 6], fov: camera?.fov ?? 45 }} shadows dpr={[1, 2]}>
            <Suspense fallback={null}>
              <color attach="background" args={['#14171c']} />
              <ambientLight intensity={0.5} />
              <directionalLight
                position={[4, 8, 5]}
                intensity={1.6}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-left={-7}
                shadow-camera-right={7}
                shadow-camera-top={5}
                shadow-camera-bottom={-5}
                shadow-bias={-0.0004}
              />
              <directionalLight position={[-5, 3, -4]} intensity={0.4} />
              {/* éclairage studio procédural (reflets des métaux), sans fichier externe */}
              <Environment resolution={128} frames={1}>
                <Lightformer form="rect" intensity={2.2} position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[10, 6, 1]} />
                <Lightformer form="rect" intensity={1.2} position={[-6, 2, 0]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
                <Lightformer form="rect" intensity={0.8} position={[6, 2, -2]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} color="#cfe3ff" />
              </Environment>
              {typeof scene === 'function' ? scene(view) : scene}
              <OrbitControls makeDefault target={camera?.target ?? [0, 0, 0]} enablePan={false} minDistance={2} maxDistance={20} />
            </Suspense>
          </Canvas>
          </SceneBoundary>
          <div className="hud">{readouts}</div>
          {toggles.length > 0 && (
            <div className="view-toggles">
              {toggles.map((t) => (
                <label key={t.key}>
                  <input type="checkbox" checked={!!view[t.key]} onChange={() => toggleView(t.key)} /> {t.label}
                </label>
              ))}
            </div>
          )}
          {!sim.started && (
            <div className="start-banner">
              <span>Règle les paramètres, puis lance l’expérience</span>
              <button className="primary" onClick={() => sim.setRunning(true)}>▶ Lancer</button>
            </div>
          )}
          <p className="hint">Glisse pour tourner · molette pour zoomer</p>
        </section>

        <aside className="panel">
          <div className="sim-buttons">
            <button className="primary" onClick={() => sim.setRunning(!sim.running)}>
              {sim.running ? '⏸ Pause' : sim.started ? '▶ Reprendre' : '▶ Lancer'}
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
