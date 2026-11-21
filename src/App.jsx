import { Suspense, useEffect, useState } from 'react'
import { EXPERIMENTS, LEVELS } from './experiments/registry.js'

function useHashRoute() {
  const get = () => window.location.hash.replace(/^#\/?/, '')
  const [route, setRoute] = useState(get)
  useEffect(() => {
    const on = () => {
      setRoute(get())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export default function App() {
  const route = useHashRoute()
  const exp = EXPERIMENTS.find((e) => e.id === route && e.load)
  if (exp) {
    const Comp = exp.load
    return (
      <Suspense fallback={<p className="loading">Chargement de l’expérience…</p>}>
        <Comp />
      </Suspense>
    )
  }
  return <Home />
}

function Home() {
  return (
    <div className="home">
      <header className="hero">
        <h1>Physique 3D</h1>
        <p>
          Les expériences du programme tunisien de physique, en 3D interactive. Règle les paramètres, observe les courbes en
          temps réel et relis l’essentiel du cours.
        </p>
      </header>
      {LEVELS.map((lv) => (
        <section key={lv.id} className="level">
          <h2>{lv.label}</h2>
          <div className="cards">
            {EXPERIMENTS.filter((e) => e.level === lv.id).map((e) =>
              e.load ? (
                <a key={e.id} className="card ready" href={'#/' + e.id}>
                  <span className="icon">{e.icon}</span>
                  <span className="t">{e.title}</span>
                  <span className="c">{e.chapter}</span>
                </a>
              ) : (
                <div key={e.id} className="card soon" aria-disabled="true">
                  <span className="icon">{e.icon}</span>
                  <span className="t">{e.title}</span>
                  <span className="c">{e.chapter} · bientôt</span>
                </div>
              ),
            )}
          </div>
        </section>
      ))}
      <footer>Prototype v0.1 · programme d’après les manuels officiels du CNP · site statique, gratuit</footer>
    </div>
  )
}
