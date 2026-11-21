import { rk4Step } from '../../lib/rk4.js'

/**
 * Pendule élastique horizontal : solide (m) accroché à un ressort (k),
 * frottement visqueux f = −h·v.
 * Équation : m·x'' + h·x' + k·x = 0, intégrée par RK4.
 * Paramètres : k (N/m), m (g), h (kg/s), x0 (cm), v0 (cm/s).
 */
export const DEFAULTS = { k: 20, m: 200, h: 0, x0: 6, v0: 0 }

export const T0 = (p) => 2 * Math.PI * Math.sqrt(p.m / 1000 / p.k)

export const springModel = {
  maxDt: 1 / 1000,
  init: (p) => ({ t: 0, x: p.x0 / 100, v: p.v0 / 100 }),
  step(s, dt, p) {
    const m = p.m / 1000
    const f = (_t, [x, v]) => [v, (-p.k * x - p.h * v) / m]
    const [x, v] = rk4Step(f, s.t, [s.x, s.v], dt)
    return { t: s.t + dt, x, v }
  },
}

export function energies(s, p) {
  const Ec = 0.5 * (p.m / 1000) * s.v * s.v
  const Ep = 0.5 * p.k * s.x * s.x
  return { Ec, Ep, E: Ec + Ep }
}
