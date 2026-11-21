/** Couleur approchée d'une radiation visible (λ en nm) → [r, g, b] entre 0 et 1. */
export function wavelengthRGB(nm) {
  let r = 0, g = 0, b = 0
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1 }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1 }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20 }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1 }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65 }
  else if (nm <= 780) { r = 1 }
  // atténuation aux bords du visible
  let f = 1
  if (nm < 420) f = 0.3 + (0.7 * (nm - 380)) / 40
  else if (nm > 700) f = 0.3 + (0.7 * (780 - nm)) / 80
  if (nm < 380 || nm > 780) f = 0
  return [r * f, g * f, b * f].map((c) => Math.max(0, Math.min(1, c)))
}

export const wavelengthCSS = (nm, a = 1) => {
  const [r, g, b] = wavelengthRGB(nm)
  return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`
}

export const wavelengthHex = (nm) => {
  const [r, g, b] = wavelengthRGB(nm)
  return '#' + [r, g, b].map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')
}

/** horloge simple pour les expériences sans dynamique (la 3D peut quand même s'animer) */
export const clockModel = { maxDt: 1 / 60, init: () => ({ t: 0 }), step: (s, dt) => ({ t: s.t + dt }) }
