/**
 * Déviation d'une particule chargée dans le champ électrique uniforme d'un condensateur plan.
 * Accélération préalable sous U0 : ½mv0² = |q|U0.  Entre les plaques : E = U/d, a = qE/m.
 *   y(x) = q·U·x² / (2·m·d·v0²) = ± U·x² / (4·d·U0)   (même trajectoire pour toutes les particules de même signe)
 * Déflexion sur l'écran : Y = L·D·U / (2·d·U0)   (D : distance du centre des plaques à l'écran)
 */
export const PARTICLES = {
  e: { name: 'Électron', q: -1.6e-19, m: 9.11e-31, color: '#4cc3ff' },
  p: { name: 'Proton', q: 1.6e-19, m: 1.67e-27, color: '#ff6b6b' },
  a: { name: 'Particule α', q: 3.2e-19, m: 6.64e-27, color: '#ffcc33' },
}
export const DEFAULTS = { particle: 'e', U0: 1000, U: 100, d: 2, L: 8, D: 20 }

export const v0 = (p) => Math.sqrt((2 * Math.abs(PARTICLES[p.particle].q) * p.U0) / PARTICLES[p.particle].m)
const sign = (p) => Math.sign(PARTICLES[p.particle].q)

/** y (cm) à l'abscisse x (cm) mesurée depuis l'entrée des plaques ; null si la particule heurte une plaque */
export function yAt(x, p) {
  // plaque du haut au potentiel +U : E vers le bas, F = qE vers le haut pour q < 0
  const k = (-sign(p) * p.U) / (4 * p.d * p.U0) // cm⁻¹
  if (x <= p.L) return k * x * x
  const ys = k * p.L * p.L
  return ys + 2 * k * p.L * (x - p.L) // tangente en sortie
}
export const exitY = (p) => yAt(p.L, p)
export const hitsPlate = (p) => Math.abs(exitY(p)) > p.d / 2
/** abscisse du choc sur une plaque */
export const hitX = (p) => Math.sqrt((p.d / 2) / Math.abs(p.U / (4 * p.d * p.U0)))
export const screenY = (p) => yAt(p.L / 2 + p.D, p)
export const E = (p) => p.U / (p.d / 100)
