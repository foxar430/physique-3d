import { rk4Step } from '../../lib/rk4.js'

/**
 * Oscillations forcées d'un pendule élastique horizontal.
 * L'excitateur (moteur + bielle) déplace l'extrémité du ressort : x_e(t) = Xe·sin(2πNt).
 * Le solide subit donc F(t) = k·x_e(t) = Fm·sin(2πNt), avec Fm = k·Xe.
 *   m·x'' + h·x' + k·x = Fm·sin(2πNt)          (intégration RK4)
 * Paramètres : k (N/m), m (g), h (kg/s), Xe (cm), N (Hz).
 */
export const DEFAULTS = { k: 20, m: 200, h: 0.4, Xe: 1, N: 1.2 }

const SI = (p) => ({ m: p.m / 1000, Fm: p.k * (p.Xe / 100) })

export const N0 = (p) => Math.sqrt(p.k / (p.m / 1000)) / (2 * Math.PI)

/** fréquence de résonance d'élongation (existe si h < √(2km)) */
export function Nr(p) {
  const m = p.m / 1000
  const w2 = p.k / m - (p.h * p.h) / (2 * m * m)
  return w2 > 0 ? Math.sqrt(w2) / (2 * Math.PI) : null
}

/** Régime permanent : Xm (m), Vm (m/s), déphasage φ = φ_F − φ_x ∈ [0, π] */
export function steady(p, N = p.N) {
  const { m, Fm } = SI(p)
  const w = 2 * Math.PI * N
  const D = Math.hypot(p.k - m * w * w, p.h * w)
  const Xm = Fm / D
  return { Xm, Vm: w * Xm, phi: Math.atan2(p.h * w, p.k - m * w * w) }
}

export const force = (t, p) => SI(p).Fm * Math.sin(2 * Math.PI * p.N * t)
export const xe = (t, p) => (p.Xe / 100) * Math.sin(2 * Math.PI * p.N * t)

export const forcedSpring = {
  maxDt: 1 / 2000,
  init: () => ({ t: 0, x: 0, v: 0 }),
  step(s, dt, p) {
    const { m } = SI(p)
    const f = (t, [x, v]) => [v, (force(t, p) - p.k * x - p.h * v) / m]
    const [x, v] = rk4Step(f, s.t, [s.x, s.v], dt)
    return { t: s.t + dt, x, v }
  },
}
