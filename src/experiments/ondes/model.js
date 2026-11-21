/**
 * Onde mécanique progressive à la surface de l'eau (cuve à ondes).
 *
 * Source S : y_S(t) = a·sin(2πN·t) pour t ≥ 0 (début vers le haut).
 * Point M à la distance r de S : y_M(t) = y_S(t − r/v) si t ≥ r/v, sinon 0.
 * Mode « ébranlement » : la source ne fait qu'une demi-oscillation (durée T/2).
 * Affaiblissement (option) : onde circulaire, a(r) = a·√(r0/(r+r0)) (énergie répartie sur un cercle).
 *
 * Unités : SI dans ce fichier (m, s, Hz). a en mm.
 */
export const DEFAULTS = {
  mode: 'circ', // 'circ' (pointe) | 'rect' (réglette)
  pulse: false, // ébranlement unique
  N: 20, // Hz
  v: 0.3, // m/s
  a: 2, // mm
  d: 4.5, // cm, distance SM
  atten: false,
  strobe: false,
  Ne: 20, // Hz
}

export const R0 = 0.01 // m

export const wave = {
  maxDt: 1 / 2000,
  init: () => ({ t: 0 }),
  step: (s, dt) => ({ t: s.t + dt }),
}

export const lambda = (p) => p.v / p.N

/** amplitude (mm) à la distance r (m) */
export function amp(r, p) {
  if (!p.atten || p.mode !== 'circ') return p.a
  return p.a * Math.sqrt(R0 / (r + R0))
}

/** élongation de la source (mm) */
export function yS(t, p) {
  if (t < 0) return 0
  if (p.pulse && t > 0.5 / p.N) return 0
  return p.a * Math.sin(2 * Math.PI * p.N * t)
}

/** élongation (mm) d'un point situé à la distance r (m) de la source */
export function y(r, t, p) {
  const tau = t - r / p.v
  if (tau < 0) return 0
  return (yS(tau, p) * amp(r, p)) / p.a
}

/** instant affiché : avec le stroboscope, on ne voit la cuve qu'aux éclairs t = k/Ne */
export const shownTime = (t, p) => (p.strobe ? Math.floor(t * p.Ne + 1e-9) / p.Ne : t)

/** fréquence apparente (Hz) du mouvement observé sous stroboscope (repliement) */
export function apparent(p) {
  let f = p.N % p.Ne
  if (f > p.Ne / 2) f -= p.Ne
  return f // < 0 : mouvement apparent inversé
}
