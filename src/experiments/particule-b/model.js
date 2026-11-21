/**
 * Particule chargée dans un champ magnétique uniforme B ⟂ v :
 * force de Lorentz F = q·v ∧ B, mouvement circulaire uniforme de rayon R = m·v / (|q|·B).
 * Période T = 2πm / (|q|·B) : indépendante de la vitesse (principe du cyclotron).
 */
export const e = 1.6e-19
export const me = 9.11e-31
export const u = 1.66e-27

export const DEFAULTS = {
  mode: 'cercle',
  // tube à faisceau filiforme (électrons) dans des bobines de Helmholtz
  U: 200, // V
  B: 1.2, // mT
  // spectrographe
  Us: 2000, // V
  Bs: 0.25, // T
  // cyclotron
  Bc: 1.2, // T
  Uc: 100, // kV
}

export const ISOTOPES = [
  { name: '²⁰Ne⁺', A: 20, color: '#ff6b6b' },
  { name: '²²Ne⁺', A: 22, color: '#4cc3ff' },
]

export const vFromU = (m, q, U) => Math.sqrt((2 * q * U) / m)
export const radius = (m, q, v, B) => (m * v) / (q * B)

export function electron(p) {
  const v = vFromU(me, e, p.U)
  const B = p.B / 1000
  return { v, R: radius(me, e, v, B), T: (2 * Math.PI * me) / (e * B) }
}

export function spectro(p) {
  return ISOTOPES.map((iso) => {
    const m = iso.A * u
    const v = vFromU(m, e, p.Us)
    return { ...iso, v, R: radius(m, e, v, p.Bs) }
  })
}

/** cyclotron à protons : rayon des dees 0,5 m ; le proton gagne e·Uc à chaque passage */
export const DEE_R = 0.5
export function cyclotron(p) {
  const m = 1.67e-27
  const f = (e * p.Bc) / (2 * Math.PI * m)
  const radii = []
  for (let n = 1; n < 4000; n++) {
    const Ec = n * e * p.Uc * 1000
    const R = Math.sqrt(2 * m * Ec) / (e * p.Bc)
    if (R > DEE_R) break
    radii.push(R)
  }
  const Rmax = DEE_R
  const EcMax = (e * e * p.Bc * p.Bc * Rmax * Rmax) / (2 * m) // J
  return { f, radii, turns: radii.length / 2, EcMeV: EcMax / e / 1e6 }
}
