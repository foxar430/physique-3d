/**
 * Lentilles minces. Relation de conjugaison (origine au centre optique O, distances algébriques) :
 *   1/OA' − 1/OA = 1/f'        γ = A'B'/AB = OA'/OA
 * f' > 0 : lentille convergente ; f' < 0 : divergente. Vergence C = 1/f' (en dioptries, f' en m).
 * Unités : cm.
 */
export const AB = 2 // taille de l'objet (cm)
export const DEFAULTS = { mode: 'banc', f: 10, OA: -30, E: 15, conv: true }

export const fp = (p) => (p.conv ? Math.abs(p.f) : -Math.abs(p.f))
export function image(p) {
  const f = fp(p)
  const inv = 1 / f + 1 / p.OA
  if (Math.abs(inv) < 1e-6) return { OAp: Infinity, g: Infinity, real: false, infinite: true }
  const OAp = 1 / inv
  return { OAp, g: OAp / p.OA, real: OAp > 0, infinite: false }
}
export const vergence = (p) => 100 / fp(p)
