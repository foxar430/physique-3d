import { Suspense, useEffect, useState } from 'react'
import { EXPERIMENTS, LEVELS, SECTIONS, trimester } from './experiments/registry.js'

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

const TRI = { 1: '1er trimestre', 2: '2e trimestre', 3: '3e trimestre' }
const SHORT = { M: 'Maths', SE: 'Sc. Exp.', ST: 'Sc. Tech.', S: 'Sciences' }

/** préférence mémorisée dans le navigateur (facultative) */
function useStored(key, init) {
  const [v, setV] = useState(() => {
    try {
      return localStorage.getItem(key) ?? init
    } catch {
      return init
    }
  })
  const set = (x) => {
    setV(x)
    try {
      localStorage.setItem(key, x)
    } catch {
      /* stockage indisponible : on garde la valeur en mémoire */
    }
  }
  return [v, set]
}

function Home() {
  const [levelId, setLevel] = useStored('p3d-level', '4e')
  const [sec, setSec] = useStored('p3d-section', 'all')
  const level = LEVELS.find((l) => l.id === levelId) ?? LEVELS[0]
  const section = level.sections.includes(sec) ? sec : 'all'
  const list = EXPERIMENTS.filter((e) => e.level === level.id && (section === 'all' || e.sections?.includes(section)))
  const groups = [1, 2, 3].map((t) => ({ t, items: list.filter((e) => trimester(e, section === 'all' ? null : section) === t) }))

  return (
    <div className="home">
      <header className="hero">
        <h1>Physique 3D</h1>
        <p>
          Les expériences du programme tunisien de physique, en 3D interactive. Règle les paramètres, observe les courbes en
          temps réel et relis l’essentiel du cours.
        </p>
      </header>

      <nav className="filters" aria-label="Choix du niveau et de la section">
        <div className="tabs" role="tablist">
          {LEVELS.map((lv) => (
            <button key={lv.id} role="tab" aria-selected={lv.id === level.id} className={lv.id === level.id ? 'on' : ''} onClick={() => setLevel(lv.id)}>
              {lv.label}
            </button>
          ))}
        </div>
        {level.sections.length > 1 && (
          <div className="chips" role="group" aria-label="Section">
            <button className={section === 'all' ? 'on' : ''} onClick={() => setSec('all')}>Toutes les sections</button>
            {level.sections.map((s) => (
              <button key={s} className={section === s ? 'on' : ''} onClick={() => setSec(s)}>{SECTIONS[s]}</button>
            ))}
          </div>
        )}
      </nav>

      {groups.map(({ t, items }) =>
        items.length ? (
          <section key={t} className="level">
            <h2>
              {TRI[t]} <span className="count">{items.length} expérience{items.length > 1 ? 's' : ''}</span>
            </h2>
            <div className="cards">
              {items.map((e) =>
                e.load ? (
                  <a key={e.id} className="card ready" href={'#/' + e.id}>
                    <span className="icon">{e.icon}</span>
                    <span className="t">{e.title}</span>
                    <span className="c">{e.chapter}</span>
                    {level.sections.length > 1 && (
                      <span className="secs">
                        {e.sections.map((x) => (
                          <i key={x} className={section === x ? 'hit' : ''}>{SHORT[x]}</i>
                        ))}
                      </span>
                    )}
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
        ) : null,
      )}
      <p className="note">
        Répartition par trimestre indicative, d’après l’ordre des chapitres des manuels officiels : vérifie-la avec ton professeur
        ou la circulaire de l’année.
      </p>
      <footer>Physique 3D · programme d’après les manuels officiels du CNP · site statique, gratuit</footer>
    </div>
  )
}
