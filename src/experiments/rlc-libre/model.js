import { makeCircuitModel, buildSlots, equivalents, energies } from '../../lib/circuit.js'
import { withLabels } from '../../components/CircuitBuilder.jsx'

/**
 * Oscillations électriques libres : condensateur chargé (q0 = C·E) qui se décharge
 * dans une bobine (L) en série avec une résistance R. K en 2 : oscillations libres ; K en 1 : recharge.
 * Paramètres : E (V), R (Ω), L (mH), C (µF), extras. Simulation par analyse nodale.
 */
export const DEFAULTS = { E: 6, R: 20, L: 100, C: 10, extras: [] }

export const baseSlots = (p) => [
  { id: 'R', pos: 'top', els: [{ id: 'R', type: 'R', value: Math.max(p.R, 1e-3), label: 'R' }] },
  { id: 'L', pos: 'top', els: [{ id: 'L', type: 'L', value: p.L, r: 0, label: 'L' }] },
  { id: 'C', pos: 'right', els: [{ id: 'C', type: 'C', value: p.C, label: 'C' }] },
]
export const slotsOf = (p) => withLabels(buildSlots(baseSlots(p), p.extras))
const eqv = (p) => {
  const e = equivalents(slotsOf(p))
  const ok = e.L > 0 && isFinite(e.C)
  return { L: ok ? e.L : p.L / 1000, C: ok ? e.C : p.C * 1e-6, R: e.R }
}

export const T0 = (p) => { const e = eqv(p); return 2 * Math.PI * Math.sqrt(e.L * e.C) }
export const Rc = (p) => { const e = eqv(p); return 2 * Math.sqrt(e.L / e.C) }
export const Rtot = (p) => eqv(p).R

export const rlcModel = makeCircuitModel({
  maxDt: 5e-6,
  initK: 2,
  base: baseSlots,
  source: (t, p) => p.E,
  // le condensateur (et ceux qui lui sont en parallèle) est déjà chargé sous E
  init: (p, el, slot) => (slot.id === 'C' ? p.E : 0),
  fields: (s) => ({ i: s.iLoop }),
})

export function derived(s, p) {
  const { Ee, Em } = energies(slotsOf(p), s.els)
  return { uC: s.slotU.C, uR: s.slotU.R, uL: s.slotU.L, Ee, Em, E: Ee + Em }
}

/** intensité maximale du circuit non amorti, pour normaliser l'animation */
export const Imax = (p) => { const e = eqv(p); return p.E * Math.sqrt(e.C / e.L) }
