/**
 * Mouvement d'un projectile dans le champ de pesanteur uniforme (sans frottement).
 *   x(t) = v0·cosα·t        y(t) = h0 + v0·sinα·t − ½·g·t²
 * Trajectoire : y = −g·x² / (2·v0²·cos²α) + tanα·x + h0   (parabole)
 */
export const PLANETS = { terre: { name: 'Terre', g: 9.8 }, mars: { name: 'Mars', g: 3.71 }, lune: { name: 'Lune', g: 1.62 } }
export const DEFAULTS = { v0: 10, alpha: 45, h0: 0, planet: 'terre' }

const rad = Math.PI / 180
export const g = (p) => PLANETS[p.planet].g

export function flight(p) {
  const a = p.alpha * rad
  const vx = p.v0 * Math.cos(a)
  const vy = p.v0 * Math.sin(a)
  const G = g(p)
  const tf = (vy + Math.sqrt(vy * vy + 2 * G * p.h0)) / G
  const tS = vy / G // sommet
  return { vx, vy, tf, range: vx * tf, top: p.h0 + (vy * vy) / (2 * G), tS: Math.max(tS, 0) }
}

export function at(t, p) {
  const { vx, vy } = flight(p)
  const G = g(p)
  return { x: vx * t, y: p.h0 + vy * t - 0.5 * G * t * t, vx, vy: vy - G * t }
}

export const projectileModel = {
  maxDt: 1 / 240,
  init: (p) => ({ t: 0, ...at(0, p), landed: false }),
  step(s, dt, p) {
    const { tf } = flight(p)
    const t = Math.min(s.t + dt, tf)
    return { t: s.landed ? s.t : t, ...at(s.landed ? s.t : t, p), landed: t >= tf }
  },
}
