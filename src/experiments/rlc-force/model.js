import { makeCircuitModel, buildSlots, equivalents, acSolve } from '../../lib/circuit.js'
import { withLabels } from '../../components/CircuitBuilder.jsx'

/**
 * Oscillations électriques forcées : circuit RLC série alimenté par un GBF u(t) = Um·sin(2πNt).
 * Paramètres : Um (V), N (Hz), R (Ω), L (mH), C (µF), extras. Simulation par analyse nodale ;
 * régime permanent calculé avec les impédances complexes (valable avec les ajouts).
 */
export const DEFAULTS = { Um: 5, N: 80, R: 40, L: 200, C: 10, extras: [] }

export const baseSlots = (p) => [
  { id: 'R', pos: 'top', els: [{ id: 'R', type: 'R', value: p.R, label: 'R' }] },
  { id: 'L', pos: 'top', els: [{ id: 'L', type: 'L', value: p.L, r: 0, label: 'L' }] },
  { id: 'C', pos: 'right', els: [{ id: 'C', type: 'C', value: p.C, label: 'C' }] },
]
export const slotsOf = (p) => withLabels(buildSlots(baseSlots(p), p.extras))
const eqv = (p) => {
  const e = equivalents(slotsOf(p))
  const ok = e.L > 0 && isFinite(e.C)
  return { L: ok ? e.L : p.L / 1000, C: ok ? e.C : p.C * 1e-6, R: e.R }
}

export const N0 = (p) => { const e = eqv(p); return 1 / (2 * Math.PI * Math.sqrt(e.L * e.C)) }

/** Régime permanent : impédance, amplitude de i, déphasage φ = φu − φi. */
export function steady(p, N = p.N) {
  const r = acSolve(slotsOf(p), p.Um, N)
  return { Z: r.Z, Im: r.Im, phi: r.phi, U: r.U }
}

/** Facteur de qualité Q = Lω0/R */
export const Q = (p) => { const e = eqv(p); return (e.L * 2 * Math.PI * N0(p)) / Math.max(e.R, 1e-6) }
export const Rtot = (p) => eqv(p).R

export const u = (s, p) => p.Um * Math.sin(2 * Math.PI * p.N * s.t)

export const forcedModel = makeCircuitModel({
  maxDt: 2e-6,
  base: baseSlots,
  source: (t, p) => p.Um * Math.sin(2 * Math.PI * p.N * t),
  fields: (s) => ({ i: s.iLoop, uC: s.slotU.C }),
})
