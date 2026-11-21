/**
 * Nature ondulatoire de la lumière.
 *  - Diffraction par une fente de largeur a : I(θ) = I0·sinc²(π a sinθ / λ).
 *    Demi-ouverture de la tache centrale θ = λ/a ; largeur sur l'écran L = 2λD/a.
 *  - Dispersion par un prisme (verre flint dense, loi de Cauchy n = A + B/λ²).
 */
export const DEFAULTS = { mode: 'fente', lambda: 633, a: 100, D: 2, source: 'blanche', i: 65 }

export const theta = (p) => (p.lambda * 1e-9) / (p.a * 1e-6) // rad
export const spotWidth = (p) => 2 * theta(p) * p.D // m

/** intensité relative au point x (m) de l'écran */
export function intensity(x, p) {
  const u = (Math.PI * p.a * 1e-6 * Math.sin(Math.atan(x / p.D))) / (p.lambda * 1e-9)
  if (Math.abs(u) < 1e-9) return 1
  const s = Math.sin(u) / u
  return s * s
}

/* ---------- prisme ---------- */
export const CAUCHY = { A: 1.745, B: 13000 } // λ en nm
export const nGlass = (nm) => CAUCHY.A + CAUCHY.B / (nm * nm)
export const APEX = 60 // angle du prisme (°)

/** formules du prisme : sin i = n sin r, r + r' = A, sin i' = n sin r', D = i + i' − A (angles en °) */
export function prism(nm, iDeg) {
  const n = nGlass(nm)
  const rad = Math.PI / 180
  const r = Math.asin(Math.sin(iDeg * rad) / n) / rad
  const r2 = APEX - r
  const s = n * Math.sin(r2 * rad)
  if (s >= 1) return { n, r, r2, i2: null, D: null } // réflexion totale
  const i2 = Math.asin(s) / rad
  return { n, r, r2, i2, D: iDeg + i2 - APEX }
}

export const SPECTRUM = [400, 420, 440, 460, 480, 500, 520, 540, 560, 580, 600, 620, 640, 660, 680, 700]
