/**
 * Interaction électrique (loi de Coulomb) et champ électrique.
 *   F = k·|q1·q2| / r²     E = k·|q| / r²     k = 9·10⁹ SI
 * Charges en nC, distances en cm.
 */
export const K = 9e9
export const DEFAULTS = {
  mode: 'charges', // 'charges' | 'pendule'
  config: 'dipole', // 'seule' | 'dipole' | 'memes' | 'condensateur'
  q1: 20, // nC
  q2: -20,
  dist: 8, // cm
  mx: 0, // point M (cm)
  my: 4,
  // pendule électrostatique
  Q: 50, // nC (sphère)
  q: 10, // nC (boule)
  m: 0.2, // g
  a: 6, // cm (distance horizontale sphère - verticale du fil)
}

/** liste des charges { x, y (cm), q (nC) } */
export function charges(p) {
  if (p.config === 'seule') return [{ x: 0, y: 0, q: p.q1 }]
  if (p.config === 'memes') return [{ x: -p.dist / 2, y: 0, q: Math.abs(p.q1) }, { x: p.dist / 2, y: 0, q: Math.abs(p.q1) }]
  if (p.config === 'condensateur') {
    const out = []
    const n = 21
    for (let i = 0; i < n; i++) {
      const x = -10 + (20 * i) / (n - 1)
      out.push({ x, y: p.dist / 2, q: Math.abs(p.q1) / 4 }, { x, y: -p.dist / 2, q: -Math.abs(p.q1) / 4 })
    }
    return out
  }
  return [{ x: -p.dist / 2, y: 0, q: p.q1 }, { x: p.dist / 2, y: 0, q: p.q2 }]
}

/** champ (V/m) au point (x, y) en cm */
export function field(x, y, list) {
  let ex = 0, ey = 0
  for (const c of list) {
    const dx = (x - c.x) / 100
    const dy = (y - c.y) / 100
    const r2 = dx * dx + dy * dy
    if (r2 < 1e-8) continue
    const f = (K * c.q * 1e-9) / (r2 * Math.sqrt(r2))
    ex += f * dx
    ey += f * dy
  }
  return [ex, ey]
}

/** force de Coulomb entre q1 et q2 (N) */
export const coulomb = (p) => (K * Math.abs(p.q1 * p.q2) * 1e-18) / Math.pow(p.dist / 100, 2)

/**
 * Pendule électrostatique : fil de longueur L = 20 cm accroché en O, sphère fixe de charge Q
 * à la distance horizontale a de la verticale de O, à la hauteur de la boule au repos.
 * On cherche l'angle d'équilibre θ (positif vers la sphère).
 */
export const LF = 20
export function pendulum(p) {
  const g = 9.8
  const m = p.m / 1000
  const kqQ = K * p.q * p.Q * 1e-18 // > 0 : répulsion
  // relaxation vers l'équilibre stable à partir de la verticale
  let th = 0
  let touch = false
  for (let it = 0; it < 4000; it++) {
    const bx = LF * Math.sin(th)
    const by = -LF * Math.cos(th)
    const dx = (bx - p.a) / 100
    const dy = (by + LF) / 100
    const r = Math.max(Math.hypot(dx, dy), 0.015)
    const F = kqQ / (r * r)
    const tq = (bx / 100) * ((F * dy) / r - m * g) - (by / 100) * ((F * dx) / r)
    th += (0.4 * tq) / (m * g * (LF / 100))
    th = Math.max(-1.3, Math.min(1.3, th))
    if (Math.hypot(dx, dy) < 0.016) { touch = true; break }
  }
  const best = touch ? Math.asin(Math.min(1, (p.a - 1.6) / LF)) : th
  const bx = LF * Math.sin(best)
  const by = -LF * Math.cos(best)
  const r = Math.hypot(bx - p.a, by + LF)
  const F = kqQ / Math.pow(r / 100, 2)
  return { theta: best, bx, by, r, F, P: m * g, touch }
}
