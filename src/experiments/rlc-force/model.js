import { rk4Step } from '../../lib/rk4.js'

/**
 * Oscillations électriques forcées : circuit RLC série alimenté par un GBF
 * u(t) = Um·sin(2πNt).  L·di/dt + R·i + q/C = u(t).  Intégration RK4.
 * Paramètres : Um (V), N (Hz), R (Ω), L (mH), C (µF).
 */
export const DEFAULTS = { Um: 5, N: 80, R: 40, L: 200, C: 10 }

const SI = (p) => ({ L: p.L / 1000, C: p.C * 1e-6, R: p.R })

export const N0 = (p) => 1 / (2 * Math.PI * Math.sqrt((p.L / 1000) * p.C * 1e-6))

/** Régime permanent : impédance, amplitude de i, déphasage φ = φu − φi. */
export function steady(p, N = p.N) {
  const { L, C, R } = SI(p)
  const w = 2 * Math.PI * N
  const X = L * w - 1 / (C * w)
  const Z = Math.sqrt(R * R + X * X)
  return { Z, Im: p.Um / Z, phi: Math.atan2(X, R) }
}

/** Facteur de qualité Q = N0/(N2 − N1) = Lω0/R */
export const Q = (p) => ((p.L / 1000) * 2 * Math.PI * N0(p)) / p.R

export const forcedModel = {
  maxDt: 2e-6,
  init: () => ({ t: 0, q: 0, i: 0 }),
  step(s, dt, p) {
    const { L, C, R } = SI(p)
    const w = 2 * Math.PI * p.N
    const f = (t, [q, i]) => [i, (p.Um * Math.sin(w * t) - R * i - q / C) / L]
    const [q, i] = rk4Step(f, s.t, [s.q, s.i], dt)
    return { t: s.t + dt, q, i }
  },
}

export const u = (s, p) => p.Um * Math.sin(2 * Math.PI * p.N * s.t)
