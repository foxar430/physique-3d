/**
 * Décroissance radioactive d'un échantillon de N0 noyaux.
 * Chaque noyau a une date de désintégration aléatoire (loi exponentielle de constante λ) :
 * la décroissance observée fluctue autour de N(t) = N0·e^(−λt).
 * Le temps de la simulation est compté en demi-vies (τ = t / T).
 */
export const N0 = 512

export const NUCLIDES = {
  rn220: { name: 'Radon 220', T: 55.6, unit: 's', type: 'α', eq: ['²²⁰₈₆Rn', '²¹⁶₈₄Po', '⁴₂He'] },
  p30: { name: 'Phosphore 30', T: 2.5, unit: 'min', type: 'β⁺', eq: ['³⁰₁₅P', '³⁰₁₄Si', '⁰₁e'] },
  i131: { name: 'Iode 131', T: 8.02, unit: 'jours', type: 'β⁻', eq: ['¹³¹₅₃I', '¹³¹₅₄Xe', '⁰₋₁e'] },
  po210: { name: 'Polonium 210', T: 138, unit: 'jours', type: 'α', eq: ['²¹⁰₈₄Po', '²⁰⁶₈₂Pb', '⁴₂He'] },
  co60: { name: 'Cobalt 60', T: 5.27, unit: 'ans', type: 'β⁻ + γ', eq: ['⁶⁰₂₇Co', '⁶⁰₂₈Ni', '⁰₋₁e + γ'] },
  c14: { name: 'Carbone 14', T: 5730, unit: 'ans', type: 'β⁻', eq: ['¹⁴₆C', '¹⁴₇N', '⁰₋₁e'] },
}

export const DEFAULTS = { nuc: 'rn220', absorber: 'none' }

export const ABSORBERS = {
  none: 'Rien',
  paper: 'Feuille de papier',
  alu: 'Aluminium (5 mm)',
  lead: 'Plomb (2 cm)',
}

/** probabilité qu'une particule traverse l'écran */
export function passes(kind, absorber) {
  if (absorber === 'none') return 1
  if (kind === 'α') return 0
  if (kind === 'β') return absorber === 'paper' ? 1 : 0
  return absorber === 'lead' ? 0.3 : 1 // γ
}

export const theory = (tau) => N0 * Math.pow(2, -tau)

export const decayModel = {
  maxDt: 1 / 240,
  init() {
    // dates de désintégration (en demi-vies) triées, avec l'indice du noyau
    const list = []
    for (let id = 0; id < N0; id++) list.push({ id, t: -Math.log(1 - Math.random()) / Math.LN2 })
    list.sort((a, b) => a.t - b.t)
    return { t: 0, idx: 0, N: N0, list }
  },
  step(s, dt) {
    const t = s.t + dt
    let idx = s.idx
    while (idx < N0 && s.list[idx].t <= t) idx++
    return { t, idx, N: N0 - idx, list: s.list }
  },
}
