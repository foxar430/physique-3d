/**
 * Solide en rotation autour d'un axe fixe (relation fondamentale de la dynamique de rotation).
 * Tige (J0) portant deux masselottes M à la distance d de l'axe : J = J0 + 2·M·d².
 * Un fil enroulé sur un tambour de rayon r porte une masse m qui descend.
 *   (J + m·r²)·θ'' = m·g·r − Cf      tant que la masse descend ;  J·θ'' = −Cf ensuite.
 */
export const G = 9.8
export const R_DRUM = 0.02 // m
export const J0 = 0.006 // kg·m² (tige de 60 cm, 200 g)
export const H = 0.7 // hauteur de chute (m)
export const DEFAULTS = { M: 100, d: 15, m: 50, Cf: 2 } // g, cm, g, mN·m

export const J = (p) => J0 + 2 * (p.M / 1000) * Math.pow(p.d / 100, 2)
export const alphaDrive = (p) => ((p.m / 1000) * G * R_DRUM - p.Cf / 1000) / (J(p) + (p.m / 1000) * R_DRUM * R_DRUM)

export const rotationModel = {
  maxDt: 1 / 1000,
  init: () => ({ t: 0, th: 0, w: 0, fall: 0, landed: false }),
  step(s, dt, p) {
    let w = s.w
    let landed = s.landed
    if (!landed) {
      const a = Math.max(alphaDrive(p), 0)
      w += a * dt
    } else if (w > 0) {
      w = Math.max(0, w - ((p.Cf / 1000) / J(p)) * dt)
    }
    const th = s.th + w * dt
    let fall = landed ? s.fall : th * R_DRUM
    if (!landed && fall >= H) { fall = H; landed = true }
    return { t: s.t + dt, th, w, fall, landed }
  },
}
