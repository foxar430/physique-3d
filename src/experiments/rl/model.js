import { makeCircuitModel, buildSlots, equivalents, energies } from '../../lib/circuit.js'
import { withLabels } from '../../components/CircuitBuilder.jsx'

/**
 * Dipôle RL : établissement (K en 1) et rupture (K en 2) du courant.
 * Bobine (L, r) en série avec un résistor R. Paramètres : E (V), R (Ω), r (Ω), L (mH), extras.
 * Simulation par analyse nodale ; sans ajout : i(t) = I0·(1 − e^(−t/τ)), τ = L/(R + r).
 */
export const DEFAULTS = { E: 6, R: 40, r: 10, L: 500, extras: [] }

export const baseSlots = (p) => [
  { id: 'R', pos: 'top', els: [{ id: 'R', type: 'R', value: p.R, label: 'R' }] },
  { id: 'L', pos: 'right', els: [{ id: 'L', type: 'L', value: p.L, r: p.r, label: '(L, r)' }] },
]
export const slotsOf = (p) => withLabels(buildSlots(baseSlots(p), p.extras))

export function tau(p) {
  const e = equivalents(slotsOf(p))
  return e.simple && !isFinite(e.C) && e.R > 0 && e.L > 0 ? e.L / e.R : NaN
}
/** intensité en régime permanent (courant continu : les condensateurs bloquent) */
export function I0(p) {
  const e = equivalents(slotsOf(p))
  return isFinite(e.C) ? 0 : p.E / Math.max(e.R, 1e-6)
}

export const rlModel = makeCircuitModel({
  maxDt: 2e-5,
  base: baseSlots,
  source: (t, p) => p.E,
  fields: (s) => ({ i: s.iLoop }),
})

/** uR = R·i ; uB : tension aux bornes du bloc de la bobine */
export function derived(s, p) {
  const { Em } = energies(slotsOf(p), s.els)
  return { uR: s.slotU.R, uB: s.slotU.L, energy: Em }
}
