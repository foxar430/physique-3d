import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Boucle de simulation partagée par la 3D et les courbes.
 *
 * model = {
 *   init(params) -> state            état initial (doit contenir t)
 *   step(state, dt, params) -> state un pas de dt secondes (temps simulé)
 *   maxDt                            pas maximum (sous-échantillonnage)
 * }
 *
 * L'état vit dans une ref (pas dans le state React) pour tenir 60 i/s.
 * Les abonnés (courbes, affichages) sont notifiés à chaque pas.
 */
export function useSimulation(model, params, options = {}) {
  const stateRef = useRef(model.init(params))
  const paramsRef = useRef(params)
  const listeners = useRef(new Set())
  const [running, setRunning] = useState(true)
  const [speed, setSpeed] = useState(options.speed ?? 1)
  const runningRef = useRef(running)
  const speedRef = useRef(speed)
  runningRef.current = running
  speedRef.current = speed
  paramsRef.current = params

  const notify = (reset = false) => listeners.current.forEach((fn) => fn(stateRef.current, reset))

  const reset = useCallback(() => {
    stateRef.current = model.init(paramsRef.current)
    notify(true)
  }, [model])

  // boucle requestAnimationFrame indépendante du rendu 3D
  useEffect(() => {
    let raf
    let last = performance.now()
    const loop = (now) => {
      const realDt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (runningRef.current) {
        let remaining = realDt * speedRef.current
        const maxDt = model.maxDt ?? 1 / 600
        while (remaining > 1e-12) {
          const dt = Math.min(remaining, maxDt)
          stateRef.current = model.step(stateRef.current, dt, paramsRef.current)
          remaining -= dt
        }
        notify(false)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [model])

  const subscribe = useCallback((fn) => {
    listeners.current.add(fn)
    return () => listeners.current.delete(fn)
  }, [])

  return { stateRef, paramsRef, running, setRunning, speed, setSpeed, reset, subscribe, notify }
}

/** Petit hook : relit une valeur de l'état ~10 fois/s pour l'afficher en texte. */
export function useSampled(sim, pick, hz = 10) {
  const pickRef = useRef(pick)
  pickRef.current = pick
  const [v, setV] = useState(() => pick(sim.stateRef.current))
  useEffect(() => {
    const id = setInterval(() => setV(pickRef.current(sim.stateRef.current)), 1000 / hz)
    return () => clearInterval(id)
  }, [sim.stateRef, hz])
  return v
}
