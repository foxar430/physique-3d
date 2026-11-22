import { makeCircuitModel, buildSlots, equivalents, energies } from '../../lib/circuit.js'
import { withLabels } from '../../components/CircuitBuilder.jsx'

/**
 * Dipôle RC : charge (interrupteur K en position 1) et décharge (position 2).
 * Paramètres : E (V), R (kΩ), C (µF), extras (dipôles ajoutés en série / parallèle).
 * Le circuit est simulé par analyse nodale (voir lib/circuit.js) ; sans ajout, on retrouve
 * uC(t) = E·(1 − e^(−t/τ)) avec τ = R·C.
 */
export const DEFAULTS = { E: 6, R: 10, C: 220, extras: [] }

export const baseSlots = (p) => [
  { id: 'R', pos: 'top', els: [{ id: 'R', type: 'R', value: p.R * 1e3, label: 'R' }] },
  { id: 'C', pos: 'right', els: [{ id: 'C', type: 'C', value: p.C, label: 'C' }] },
]
export const slotsOf = (p) => withLabels(buildSlots(baseSlots(p), p.extras))

/** τ = Réq·Céq (circuit RC simple) */
export function tau(p) {
  const e = equivalents(slotsOf(p))
  return e.simple && isFinite(e.C) && e.R > 0 ? e.R * e.C : NaN
}

export const rcModel = makeCircuitModel({
  maxDt: 5e-4,
  base: baseSlots,
  source: (t, p) => p.E,
  fields: (s) => ({ uC: s.slotU.C, i: s.iLoop }),
})

/** Grandeurs dérivées (convention récepteur, i > 0 en charge). */
export function derived(s, p) {
  const { Ee } = energies(slotsOf(p), s.els)
  return { i: s.iLoop, uR: s.slotU.R, q: (s.els.C?.v ?? 0) * p.C * 1e-6, energy: Ee }
}
