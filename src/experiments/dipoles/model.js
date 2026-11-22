/**
 * Dipôles électriques (2e année) : caractéristiques U = f(I), loi de Pouillet, puissance.
 * Montage de mesure : générateur réglable Eg + résistance de protection Rp + dipôle étudié.
 * Le point de fonctionnement vérifie Eg = Rp·I + U(I) (résolu par dichotomie).
 */
export const RP = 47 // Ω
export const DIPOLES = {
  resistor: { name: 'Résistor', kind: 'passif' },
  lampe: { name: 'Lampe', kind: 'passif' },
  diode: { name: 'Diode', kind: 'passif' },
  moteur: { name: 'Moteur', kind: 'actif' },
  pile: { name: 'Pile (générateur)', kind: 'generateur' },
}
export const DEFAULTS = { mode: 'carac', dip: 'resistor', R: 100, Eg: 6, Rload: 20, E: 4.5, r: 1.5, Ep: 2, rp: 4, Rpou: 10 }

/** U(I) du dipôle (convention récepteur) */
export function U(I, p) {
  switch (p.dip) {
    case 'resistor': return p.R * I
    case 'lampe': return I <= 0 ? 0 : 12 * Math.pow(I / 0.3, 1.6) // filament : résistance croissante
    case 'diode': return I <= 0 ? 0 : 0.026 * 1.8 * Math.log(1 + I / 1e-9)
    case 'moteur': return I <= 0 ? 0 : p.Ep + p.rp * I
    default: return 0
  }
}

/** point de fonctionnement du montage de mesure */
export function operating(p) {
  if (p.dip === 'pile') {
    const I = p.E / (p.r + p.Rload)
    return { I, U: p.E - p.r * I }
  }
  if (p.Eg <= 0) return { I: 0, U: 0 }
  let lo = 0, hi = p.Eg / RP
  for (let k = 0; k < 80; k++) {
    const m = (lo + hi) / 2
    if (RP * m + U(m, p) > p.Eg) hi = m
    else lo = m
  }
  const I = (lo + hi) / 2
  return { I, U: U(I, p) }
}

/** loi de Pouillet : générateur (E, r) + récepteur actif (E', r') + résistor R */
export function pouillet(p) {
  const I = Math.max(0, (p.E - p.Ep) / (p.r + p.rp + p.Rpou))
  return { I, U: p.E - p.r * I }
}
