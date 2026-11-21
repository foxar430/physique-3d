/**
 * Amplificateur opérationnel idéal (Sc. Tech.), alimenté en ±15 V : saturation à ±Vsat = ±14 V.
 *   inverseur      us = −(R2/R1)·ue
 *   non inverseur  us = (1 + R2/R1)·ue
 *   suiveur        us = ue
 *   sommateur      us = −(R2/R1)·(ue + u2)          (deux entrées, même résistance R1)
 *   comparateur    us = +Vsat si ue > Uref, sinon −Vsat
 * Unités : V, kΩ, Hz.
 */
export const VSAT = 14
export const DEFAULTS = { montage: 'inverseur', Ue: 2, N: 50, R1: 10, R2: 22, u2: 1, Uref: 0.5 }

export const MONTAGES = {
  inverseur: 'Inverseur',
  noninv: 'Non inverseur',
  suiveur: 'Suiveur',
  sommateur: 'Sommateur',
  comparateur: 'Comparateur',
}

const clamp = (v) => Math.max(-VSAT, Math.min(VSAT, v))
export function transfer(ue, p) {
  switch (p.montage) {
    case 'inverseur': return clamp((-p.R2 / p.R1) * ue)
    case 'noninv': return clamp((1 + p.R2 / p.R1) * ue)
    case 'suiveur': return clamp(ue)
    case 'sommateur': return clamp((-p.R2 / p.R1) * (ue + p.u2))
    default: return ue > p.Uref ? VSAT : -VSAT
  }
}
export function gain(p) {
  switch (p.montage) {
    case 'inverseur': return -p.R2 / p.R1
    case 'noninv': return 1 + p.R2 / p.R1
    case 'suiveur': return 1
    case 'sommateur': return -p.R2 / p.R1
    default: return null
  }
}
export const ue = (t, p) => p.Ue * Math.sin(2 * Math.PI * p.N * t)
export const aopModel = { maxDt: 1 / 20000, init: () => ({ t: 0 }), step: (s, dt) => ({ t: s.t + dt }) }
