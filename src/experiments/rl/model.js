/**
 * Dipôle RL : établissement (K en 1) et rupture (K en 2) du courant.
 * Bobine (L, r) en série avec un résistor R.
 * Paramètres : E (V), R (Ω), r (Ω), L (mH).
 * Solution exacte : i(t) = I∞ + (i0 − I∞)·e^(−(t − t0)/τ), avec τ = L/(R + r).
 */
export const DEFAULTS = { E: 6, R: 40, r: 10, L: 500 }

export const tau = (p) => (p.L / 1000) / (p.R + p.r) // s
export const I0 = (p) => p.E / (p.R + p.r) // A, intensité en régime permanent

export const rlModel = {
  maxDt: 1e-4,
  init: () => ({ t: 0, i: 0, k: 1, tSwitch: 0, iSwitch: 0 }),
  step(s, dt, p) {
    const target = s.k === 1 ? I0(p) : 0
    const i = target + (s.i - target) * Math.exp(-dt / tau(p))
    return { ...s, t: s.t + dt, i }
  },
}

/** uR = R·i ; uB = L·di/dt + r·i (tension aux bornes de la bobine) */
export function derived(s, p) {
  const uR = p.R * s.i
  const uB = (s.k === 1 ? p.E : 0) - uR // loi des mailles
  return { uR, uB, energy: 0.5 * (p.L / 1000) * s.i * s.i }
}
