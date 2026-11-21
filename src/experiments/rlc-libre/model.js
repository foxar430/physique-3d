import { rk4Step } from '../../lib/rk4.js'

/**
 * Oscillations électriques libres : condensateur chargé (q0 = C·E) qui se décharge
 * dans une bobine (L) en série avec une résistance totale R (résistor + r de la bobine).
 * K en 2 : L·di/dt + R·i + q/C = 0    K en 1 : … = E (le générateur recharge C)
 * Paramètres : E (V), R (Ω), L (mH), C (µF). Intégration RK4.
 */
export const DEFAULTS = { E: 6, R: 20, L: 100, C: 10 }

const SI = (p) => ({ L: p.L / 1000, C: p.C * 1e-6, R: p.R, E: p.E })

export const T0 = (p) => 2 * Math.PI * Math.sqrt((p.L / 1000) * p.C * 1e-6)
export const Rc = (p) => 2 * Math.sqrt((p.L / 1000) / (p.C * 1e-6)) // résistance critique

export const rlcModel = {
  maxDt: 5e-6,
  // le condensateur est déjà chargé sous E ; K est en position 2
  init: (p) => ({ t: 0, q: p.C * 1e-6 * p.E, i: 0, k: 2 }),
  step(s, dt, p) {
    const { L, C, R, E } = SI(p)
    const e = s.k === 1 ? E : 0
    // q : charge de l'armature A ; i = dq/dt
    const f = (_t, [q, i]) => [i, (e - R * i - q / C) / L]
    const [q, i] = rk4Step(f, s.t, [s.q, s.i], dt)
    return { ...s, t: s.t + dt, q, i }
  },
}

export function derived(s, p) {
  const { L, C } = SI(p)
  const uC = s.q / C
  const Ee = 0.5 * s.q * s.q / C
  const Em = 0.5 * L * s.i * s.i
  return { uC, uR: p.R * s.i, Ee, Em, E: Ee + Em }
}

/** intensité maximale du circuit non amorti, pour normaliser l'animation */
export const Imax = (p) => p.E * Math.sqrt((p.C * 1e-6) / (p.L / 1000))
