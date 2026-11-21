/**
 * Force de Laplace : F = I·ℓ ∧ B ; si ℓ ⟂ B : F = I·ℓ·B.
 * Rails : la tige (longueur ℓ entre les rails) roule ; elle ne subit la force que dans l'entrefer de l'aimant.
 *   m·dv/dt = F − h·v       (h : frottements)
 * Roue de Barlow : le courant va de l'axe à la pointe plongée dans le mercure ; moment Γ = I·B·R²/2.
 *   J·dω/dt = Γ − k·ω
 * Unités des réglages : I (A), B (mT), ℓ (cm), m (g).
 */
export const DEFAULTS = { mode: 'rails', I: 4, B: 80, l: 10, m: 20, flip: false }
export const GAP = [-0.035, 0.035] // zone de champ (m), autour de x = 0
export const XMIN = -0.115
export const XMAX = 0.115
export const WHEEL_R = 0.05 // m

export const Bsigned = (p) => (p.B / 1000) * (p.flip ? -1 : 1)
/** composante x de la force (N) quand la tige est dans l'entrefer ; I > 0 : courant selon +z dans la tige */
export const force = (p) => -p.I * (p.l / 100) * Bsigned(p)
export const torque = (p) => (p.I * Bsigned(p) * WHEEL_R * WHEEL_R) / 2

export const laplaceModel = {
  maxDt: 1 / 1000,
  init: () => ({ t: 0, x: 0, v: 0, th: 0, w: 0 }),
  step(s, dt, p) {
    // rails
    const inside = s.x > GAP[0] && s.x < GAP[1]
    const F = inside ? force(p) : 0
    const m = p.m / 1000
    let v = s.v + ((F - 0.02 * s.v) / m) * dt
    let x = s.x + v * dt
    if (x < XMIN) { x = XMIN; v = -0.3 * v }
    if (x > XMAX) { x = XMAX; v = -0.3 * v }
    // roue de Barlow (J = 2·10⁻⁵ kg·m², k = 4·10⁻⁵ N·m·s)
    const w = s.w + ((torque(p) - 4e-5 * s.w) / 2e-5) * dt
    return { t: s.t + dt, x, v, th: s.th + w * dt, w, F }
  },
}
