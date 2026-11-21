/**
 * Champ magnétique d'un aimant droit ou d'un solénoïde (même champ à l'extérieur).
 * Modèle : cylindre aimanté uniformément ; on représente ses faces par des « charges magnétiques »
 * (+ au pôle Nord, − au pôle Sud) et on ajoute l'aimantation à l'intérieur pour obtenir B.
 * Solénoïde long : B = µ0·N·I / L au centre.  Boussole : tan α = B / B_H.
 */
export const MU0 = 4 * Math.PI * 1e-7
export const BH = 2e-5 // composante horizontale du champ terrestre (T)

export const DEFAULTS = { mode: 'aimant', I: 0.01, N: 200, L: 12, needles: true }

export const geom = (p) => (p.mode === 'aimant' ? { half: 5, rad: 1 } : { half: p.L / 2, rad: 2.5 })
export const Bsol = (p) => (MU0 * p.N * p.I) / (p.L / 100) // T
export const alpha = (p) => Math.atan(Bsol(p) / BH) // rad

/** échantillons d'une face (disque) dans le plan de la table */
function faceSamples(g) {
  const out = []
  const n = 9
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const u = -1 + (2 * i) / (n - 1)
    const v = -1 + (2 * j) / (n - 1)
    if (u * u + v * v <= 1.0001) out.push([u * g.rad, v * g.rad])
  }
  return out
}

/** B (direction seulement, unités arbitraires) au point (x, w) du plan, en cm */
export function makeField(p) {
  const g = geom(p)
  const fs = faceSamples(g)
  const q = (Math.PI * g.rad * g.rad) / fs.length
  return (x, w) => {
    let bx = 0, bw = 0
    for (const [s, sign] of [[g.half, 1], [-g.half, -1]]) {
      for (const [a, b] of fs) {
        const dx = x - s
        const dw = w - a
        const dz = -b
        const r2 = dx * dx + dw * dw + dz * dz + 1e-4
        const f = (sign * q) / (r2 * Math.sqrt(r2))
        bx += f * dx
        bw += f * dw
      }
    }
    if (Math.abs(x) < g.half && Math.abs(w) < g.rad) bx += 4 * Math.PI // aimantation (B = H + M)
    return [bx, bw]
  }
}
