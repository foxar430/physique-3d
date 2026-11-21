/**
 * Interaction gravitationnelle : F = G·M·m / r².  Champ g(h) = G·M / (R + h)².
 * Satellite en orbite circulaire : v = √(G·M / r), T = 2π·√(r³ / (G·M))  (3e loi de Kepler : T²/r³ = cte).
 */
export const G = 6.67e-11
export const M = 5.97e24
export const R = 6.37e6
export const GM = G * M

export const PRESETS = [
  { name: 'Station spatiale (ISS)', h: 400 },
  { name: 'Satellite d’observation', h: 800 },
  { name: 'GPS', h: 20200 },
  { name: 'Géostationnaire', h: 35786 },
  { name: 'Lune', h: 384400 - 6370 },
]

export const DEFAULTS = { h: 400, m: 420 } // h en km, m en tonnes (ISS)

export const r = (p) => R + p.h * 1000
export const gAt = (h) => GM / Math.pow(R + h * 1000, 2)
export const v = (p) => Math.sqrt(GM / r(p))
export const T = (p) => 2 * Math.PI * Math.sqrt(Math.pow(r(p), 3) / GM)
export const force = (p) => (GM * p.m * 1000) / Math.pow(r(p), 2)

export const orbitModel = { maxDt: 5, init: () => ({ t: 0 }), step: (s, dt) => ({ t: s.t + dt }) }
