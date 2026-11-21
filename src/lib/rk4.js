/**
 * Un pas de Runge-Kutta d'ordre 4.
 * @param {(t:number, y:number[]) => number[]} f  dérivée dy/dt
 * @param {number} t   instant courant
 * @param {number[]} y état courant
 * @param {number} h   pas de temps
 * @returns {number[]} état à t + h
 */
export function rk4Step(f, t, y, h) {
  const n = y.length
  const add = (a, b, s) => {
    const r = new Array(n)
    for (let i = 0; i < n; i++) r[i] = a[i] + s * b[i]
    return r
  }
  const k1 = f(t, y)
  const k2 = f(t + h / 2, add(y, k1, h / 2))
  const k3 = f(t + h / 2, add(y, k2, h / 2))
  const k4 = f(t + h, add(y, k3, h))
  const out = new Array(n)
  for (let i = 0; i < n; i++) out[i] = y[i] + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])
  return out
}
