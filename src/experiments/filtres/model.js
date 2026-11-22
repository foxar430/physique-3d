import { makeCircuitModel, buildSlots, equivalents, acSolve } from '../../lib/circuit.js'
import { withLabels } from '../../components/CircuitBuilder.jsx'

/**
 * Filtres RC alimentés par un GBF : ue(t) = Ue·sin(2πNt).
 * Passe-bas : sortie aux bornes de C (bloc de droite). Passe-haut : sortie aux bornes de R.
 * T = Us/Ue, G = 20·log T, Nc = 1/(2πRC). Simulation par analyse nodale ; la courbe de gain
 * est calculée avec les impédances complexes (elle reste juste avec les composants ajoutés).
 * Paramètres : type ('bas' | 'haut'), Ue (V), N (Hz), R (Ω), C (µF), extras.
 */
export const DEFAULTS = { type: 'bas', Ue: 4, N: 200, R: 1000, C: 0.47, extras: [] }

const elR = (p) => ({ id: 'R', type: 'R', value: p.R, label: 'R' })
const elC = (p) => ({ id: 'C', type: 'C', value: p.C, label: 'C' })
export const baseSlots = (p) =>
  p.type === 'bas'
    ? [{ id: 'R', pos: 'top', els: [elR(p)] }, { id: 'C', pos: 'right', els: [elC(p)] }]
    : [{ id: 'C', pos: 'top', els: [elC(p)] }, { id: 'R', pos: 'right', els: [elR(p)] }]
export const slotsOf = (p) => withLabels(buildSlots(baseSlots(p), p.extras))
export const outId = (p) => (p.type === 'bas' ? 'C' : 'R')

export function Nc(p) {
  const e = equivalents(slotsOf(p))
  const R = e.simple && e.R > 0 ? e.R : p.R
  const C = e.simple && isFinite(e.C) ? e.C : p.C * 1e-6
  return 1 / (2 * Math.PI * R * C)
}

export function transfer(p, N = p.N) {
  const r = acSolve(slotsOf(p), p.Ue, N)
  const o = r.U[outId(p)]
  const T = o.amp / p.Ue
  return { T, G: 20 * Math.log10(Math.max(T, 1e-9)), phi: o.phase }
}

export const ue = (t, p) => p.Ue * Math.sin(2 * Math.PI * p.N * t)

export const filterModel = makeCircuitModel({
  maxDt: 2e-6,
  base: baseSlots,
  source: (t, p) => ue(t, p),
  fields: (s) => ({ i: s.iLoop }),
})

export const us = (s, p) => s.slotU?.[outId(p)] ?? 0
