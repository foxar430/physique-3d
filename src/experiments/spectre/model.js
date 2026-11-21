/**
 * Atome d'hydrogène : niveaux d'énergie quantifiés En = −E0/n² (E0 = 13,6 eV).
 * Transition p → n (p > n) : photon d'énergie Ep − En, λ = hc / (Ep − En).
 * hc = 1240 eV·nm (h = 6,62·10⁻³⁴ J·s, c = 3·10⁸ m/s, 1 eV = 1,6·10⁻¹⁹ J).
 */
export const E0 = 13.6
export const HC = 1240 // eV·nm
export const NMAX = 6

export const DEFAULTS = { mode: 'emission', up: 3, low: 2, W: 10.2 }

export const En = (n) => -E0 / (n * n)
export const dE = (p, n) => En(p) - En(n)
export const lambdaNm = (p, n) => HC / dE(p, n)
export const freq = (p, n) => (dE(p, n) * 1.6e-19) / 6.62e-34

export const SERIES = { 1: 'Lyman (UV)', 2: 'Balmer (visible)', 3: 'Paschen (IR)' }
export const domain = (nm) => (nm < 380 ? 'ultraviolet' : nm > 780 ? 'infrarouge' : 'visible')

/** raies de Balmer visibles (p → 2) */
export const BALMER = [3, 4, 5, 6].map((p) => ({ p, nm: lambdaNm(p, 2) }))

/** Que devient un photon d'énergie W reçu par l'atome dans l'état fondamental ? */
export function absorb(W) {
  if (W >= E0) return { kind: 'ion', Ec: W - E0 }
  for (let p = 2; p <= 12; p++) if (Math.abs(W - dE(p, 1)) < 0.03) return { kind: 'abs', p }
  return { kind: 'none' }
}
