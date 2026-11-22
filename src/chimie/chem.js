/**
 * Moteur chimique des TP de chimie (bac).
 *
 * Une solution = { V (L), T (°C), n: { espèce: quantité de matière en mol } }.
 * On ne suit que les espèces utiles aux TP. Le pH est calculé par résolution de
 * l'électroneutralité (dichotomie sur log[H3O+]) à partir des quantités totales.
 *
 * Espèces (clé → rôle) :
 *  HCl        acide fort (apporte H3O+ et Cl−)
 *  H2SO4      diacide fort (catalyseur de l'estérification)
 *  NaOH       base forte
 *  AcOH       acide éthanoïque (pKa 4,8) — l'ion éthanoate est compté dans AcOH (total)
 *  NH3        ammoniac (pKa de NH4+ : 9,2) — total NH3 + NH4+
 *  EtOH, Ester, H2O_r   estérification (H2O_r : eau formée ou ajoutée, en mol)
 *  I_, S2O8, I2, S2O3, S4O6, SO4   cinétique des iodures et dosage du diiode
 *  Fe         catalyseur (ions fer II/III)
 *  BBT, PP, HEL, AMIDON   indicateurs (en « gouttes », quantité symbolique)
 */

export const EMPTY = () => ({ V: 0, T: 20, n: {} })

export const clone = (s) => ({ V: s.V, T: s.T, n: { ...s.n } })

/** prélève un volume v (L) d'une solution (composition identique) */
export function take(s, v) {
  if (s.V <= 0) return { out: EMPTY(), rest: s }
  const f = Math.min(1, v / s.V)
  const out = { V: s.V * f, T: s.T, n: {}, quenched: s.quenched }
  const rest = { V: s.V * (1 - f), T: s.T, n: {}, quenched: s.quenched }
  for (const [k, x] of Object.entries(s.n)) {
    out.n[k] = x * f
    rest.n[k] = x * (1 - f)
  }
  return { out, rest }
}

/** mélange deux solutions (température moyenne pondérée) puis réactions instantanées */
export function mix(a, b) {
  const V = a.V + b.V
  const out = { V, T: V > 0 ? (a.T * a.V + b.T * b.V) / V : 20, n: { ...a.n }, quenched: a.quenched || b.quenched }
  for (const [k, x] of Object.entries(b.n)) out.n[k] = (out.n[k] ?? 0) + x
  return instant(out)
}

/** réactions quasi instantanées : diiode + thiosulfate */
function instant(s) {
  const n = s.n
  const i2 = n.I2 ?? 0
  const th = n.S2O3 ?? 0
  if (i2 > 0 && th > 0) {
    // I2 + 2 S2O3²⁻ → 2 I⁻ + S4O6²⁻
    const x = Math.min(i2, th / 2)
    n.I2 = i2 - x
    n.S2O3 = th - 2 * x
    n.I_ = (n.I_ ?? 0) + 2 * x
    n.S4O6 = (n.S4O6 ?? 0) + x
  }
  return s
}

/* ------------------------------ pH ------------------------------ */

const KE = 1e-14
const KA_ACOH = Math.pow(10, -4.8)
const KA_NH4 = Math.pow(10, -9.2)

export function pH(s) {
  if (s.V <= 1e-9) return null
  const c = (k) => (s.n[k] ?? 0) / s.V
  const strongAcid = c('HCl') + 2 * c('H2SO4')
  const strongBase = c('NaOH')
  const acoh = c('AcOH')
  const nh3 = c('NH3')
  // bilan des charges : h + Na + NH4 = OH + Cl + 2 SO4 + Ac
  const f = (h) => h + strongBase + (nh3 * h) / (h + KA_NH4) - KE / h - strongAcid - (acoh * KA_ACOH) / (h + KA_ACOH)
  let lo = -15, hi = 1
  for (let k = 0; k < 80; k++) {
    const m = (lo + hi) / 2
    if (f(Math.pow(10, m)) > 0) hi = m
    else lo = m
  }
  return -((lo + hi) / 2)
}

/* --------------------------- couleurs --------------------------- */

const mixRGB = (a, b, t) => a.map((x, i) => x + (b[i] - x) * Math.max(0, Math.min(1, t)))
const smooth = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)))

/** couleur [r, g, b] (0–1) et opacité de la solution */
export function color(s) {
  if (s.V <= 1e-9) return { rgb: [0.85, 0.9, 1], alpha: 0.25 }
  const n = s.n
  let rgb = [0.86, 0.93, 1]
  let alpha = 0.32
  const p = pH(s)
  const cI2 = (n.I2 ?? 0) / s.V
  if (cI2 > 1e-6) {
    if ((n.AMIDON ?? 0) > 0) {
      rgb = mixRGB(rgb, [0.05, 0.05, 0.35], smooth(Math.log10(cI2), -6, -4.5))
      alpha = 0.55 + 0.35 * smooth(Math.log10(cI2), -6, -4)
    } else {
      rgb = mixRGB(rgb, [0.55, 0.3, 0.05], smooth(Math.log10(cI2), -5, -2))
      rgb = mixRGB([0.95, 0.85, 0.35], rgb, smooth(Math.log10(cI2), -4.5, -3))
      alpha = 0.4 + 0.45 * smooth(Math.log10(cI2), -5, -2)
    }
  }
  if ((n.BBT ?? 0) > 0 && p != null) {
    const yellow = [0.95, 0.85, 0.15], green = [0.2, 0.7, 0.35], blue = [0.12, 0.3, 0.85]
    rgb = p < 6.8 ? mixRGB(yellow, green, smooth(p, 6.0, 6.9)) : mixRGB(green, blue, smooth(p, 6.9, 7.6))
    alpha = 0.6
  }
  if ((n.HEL ?? 0) > 0 && p != null) {
    rgb = mixRGB([0.9, 0.15, 0.15], [0.95, 0.75, 0.15], smooth(p, 3.1, 4.4))
    alpha = 0.6
  }
  if ((n.PP ?? 0) > 0 && p != null) {
    const t = smooth(p, 8.2, 9.6)
    if (t > 0) {
      rgb = mixRGB(rgb, [0.95, 0.2, 0.6], t)
      alpha = Math.max(alpha, 0.32 + 0.4 * t)
    }
  }
  if ((n.Fe ?? 0) / s.V > 1e-4) rgb = mixRGB(rgb, [0.9, 0.75, 0.4], 0.25)
  return { rgb, alpha }
}

/* ---------------------------- cinétique ---------------------------- */

const R = 8.314
/** facteur d'Arrhenius relatif à 20 °C */
const arr = (T, Ea) => Math.exp((-Ea / R) * (1 / (T + 273.15) - 1 / 293.15))

/**
 * Avance les réactions lentes d'une durée dt (s).
 *  - S2O8²⁻ + 2 I⁻ → 2 SO4²⁻ + I2 : v = k[S2O8][I⁻], k20 = 0,012 L/mol/s (×12 avec catalyseur Fe)
 *  - estérification AcOH + EtOH ⇌ Ester + H2O, K = 4 : très lente sans acide sulfurique
 * Une solution « trempée » (eau glacée) a quenched = true : la réaction est figée.
 */
export function react(s, dt) {
  if (s.V <= 1e-9 || s.quenched) return s
  const n = s.n
  // iodures / peroxodisulfate (intégration par sous-pas)
  if ((n.S2O8 ?? 0) > 0 && (n.I_ ?? 0) > 0) {
    let k = 0.012 * arr(s.T, 50000) * ((n.Fe ?? 0) > 0 ? 12 : 1)
    let left = dt
    while (left > 0) {
      const h = Math.min(left, 1)
      const r = (k * ((n.S2O8 / s.V) * (n.I_ / s.V))) * s.V * h // mol
      const x = Math.min(r, n.S2O8, n.I_ / 2)
      n.S2O8 -= x
      n.I_ -= 2 * x
      n.I2 = (n.I2 ?? 0) + x
      n.SO4 = (n.SO4 ?? 0) + 2 * x
      left -= h
    }
  }
  // estérification
  if (((n.AcOH ?? 0) > 0 && (n.EtOH ?? 0) > 0) || ((n.Ester ?? 0) > 0 && (n.H2O_r ?? 0) > 0)) {
    const cat = (n.H2SO4 ?? 0) > 0 ? 1 : 0.02
    const k = 3e-6 * cat * arr(s.T, 60000) // L/mol/s (lente à 20 °C, ~1 h au bain-marie à 80 °C)
    let left = dt
    while (left > 0) {
      const h = Math.min(left, 2)
      const a = n.AcOH ?? 0, b = n.EtOH ?? 0, c = n.Ester ?? 0, d = n.H2O_r ?? 0
      const r = (k * (a * b - (c * d) / 4) / s.V) * h
      const x = Math.max(-Math.min(c, d), Math.min(r, a, b))
      n.AcOH = a - x
      n.EtOH = b - x
      n.Ester = c + x
      n.H2O_r = d + x
      left -= h
    }
  }
  return s
}
