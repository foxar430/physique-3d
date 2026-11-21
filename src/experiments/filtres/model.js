import { rk4Step } from '../../lib/rk4.js'

/**
 * Filtres RC passifs alimentés par un GBF : ue(t) = Ue·sin(2πNt).
 *   R·dq/dt + q/C = ue(t)
 * Passe-bas : sortie aux bornes de C (us = q/C). Passe-haut : sortie aux bornes de R (us = R·i).
 * Transmittance T = Us/Ue, gain G = 20·log T, fréquence de coupure Nc = 1/(2πRC) (G = G0 − 3 dB).
 * Paramètres : type ('bas' | 'haut'), Ue (V), N (Hz), R (Ω), C (µF).
 */
export const DEFAULTS = { type: 'bas', Ue: 4, N: 200, R: 1000, C: 0.47 }

export const Nc = (p) => 1 / (2 * Math.PI * p.R * p.C * 1e-6)

export function transfer(p, N = p.N) {
  const x = N / Nc(p)
  const T = p.type === 'bas' ? 1 / Math.sqrt(1 + x * x) : x / Math.sqrt(1 + x * x)
  // déphasage φ = φs − φe (rad)
  const phi = p.type === 'bas' ? -Math.atan(x) : Math.PI / 2 - Math.atan(x)
  return { T, G: 20 * Math.log10(T), phi }
}

export const ue = (t, p) => p.Ue * Math.sin(2 * Math.PI * p.N * t)

export const filterModel = {
  maxDt: 2e-6,
  init: () => ({ t: 0, q: 0, i: 0 }),
  step(s, dt, p) {
    const C = p.C * 1e-6
    const f = (t, [q]) => [(ue(t, p) - q / C) / p.R]
    const [q] = rk4Step(f, s.t, [s.q], dt)
    const t = s.t + dt
    return { t, q, i: (ue(t, p) - q / C) / p.R }
  },
}

export const us = (s, p) => (p.type === 'bas' ? s.q / (p.C * 1e-6) : p.R * s.i)
