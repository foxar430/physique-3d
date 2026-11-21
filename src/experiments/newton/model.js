/**
 * Mobile sur un plan incliné (banc à coussin d'air incliné) : cinématique, 2e loi de Newton, énergie cinétique.
 * Axe x le long du plan, orienté vers le bas. Forces : poids P, réaction normale R, frottement f (opposé à v).
 *   m·a = m·g·sinα − f·sgn(v)          (si v = 0 : le mobile démarre seulement si m·g·sinα > f)
 * Théorème de l'énergie cinétique : ΔEc = W(P) + W(f) = m·g·sinα·x − f·x.
 * Unités : α (°), m (g), f (mN), v0 (m/s, positive vers le bas).
 */
export const G = 9.8
export const LEN = 1.6 // longueur utile du plan (m)
export const TAU = 0.06 // intervalle de la chronophotographie (s)
export const DEFAULTS = { alpha: 10, m: 200, f: 0, v0: 0 }

const rad = Math.PI / 180
export function accel(p, v) {
  const m = p.m / 1000
  const drive = m * G * Math.sin(p.alpha * rad)
  const f = p.f / 1000
  if (Math.abs(v) < 1e-6) return Math.abs(drive) > f ? (drive - Math.sign(drive) * f) / m : 0
  return (drive - Math.sign(v) * f) / m
}

export const inclineModel = {
  maxDt: 1 / 1000,
  init: (p) => ({ t: 0, x: 0, v: p.v0, marks: [0], nextMark: TAU, done: false, Wf: 0 }),
  step(s, dt, p) {
    if (s.done) return { ...s, t: s.t + dt }
    const a = accel(p, s.v)
    let v = s.v + a * dt
    if (s.v !== 0 && Math.sign(v) !== Math.sign(s.v) && p.f > 0) v = 0 // arrêt par frottement
    let x = s.x + v * dt
    const Wf = s.Wf - (p.f / 1000) * Math.abs(v * dt)
    let done = false
    if (x >= LEN) { x = LEN; done = true }
    if (x < 0) { x = 0; v = 0; done = s.t > 0.05 }
    const t = s.t + dt
    let marks = s.marks
    let nextMark = s.nextMark
    if (t >= nextMark) { marks = [...marks, x]; nextMark += TAU }
    return { t, x, v, a, marks, nextMark, done, Wf }
  },
}

export const Ec = (s, p) => 0.5 * (p.m / 1000) * s.v * s.v
export const WP = (s, p) => (p.m / 1000) * G * Math.sin(p.alpha * rad) * s.x
