/**
 * Dipôle RC : charge (interrupteur K en position 1) et décharge (position 2).
 * Paramètres : E (V), R (kΩ), C (µF).
 * Solution exacte : uC(t) = U∞ + (uC0 − U∞)·e^(−(t − t0)/τ), avec τ = R·C.
 */
export const DEFAULTS = { E: 6, R: 10, C: 220 }

export const tau = (p) => p.R * 1e3 * p.C * 1e-6 // s

export const rcModel = {
  maxDt: 1 / 240,
  init: () => ({ t: 0, uC: 0, k: 1, tSwitch: 0, uSwitch: 0 }),
  step(s, dt, p) {
    const T = tau(p)
    const target = s.k === 1 ? p.E : 0
    const uC = target + (s.uC - target) * Math.exp(-dt / T)
    return { ...s, t: s.t + dt, uC }
  },
}

/** Grandeurs dérivées (convention récepteur pour C, i > 0 en charge). */
export function derived(s, p) {
  const R = p.R * 1e3
  const i = s.k === 1 ? (p.E - s.uC) / R : -s.uC / R // A
  return {
    i,
    uR: R * i,
    q: p.C * 1e-6 * s.uC, // C
    energy: 0.5 * p.C * 1e-6 * s.uC * s.uC, // J
  }
}
