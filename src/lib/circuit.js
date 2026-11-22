/**
 * Simulateur de circuit « en chaîne » pour les expériences électriques.
 *
 * Le circuit est une boucle : générateur (entre la masse et le nœud 1), puis une suite de
 * « blocs » en série. Chaque bloc contient un ou plusieurs dipôles montés en parallèle
 * (R, C ou bobine L de résistance interne r). Le dernier bloc revient à la masse.
 * L'interrupteur K en position 2 remplace le générateur par un fil (tension nulle).
 *
 * Méthode : analyse nodale modifiée (MNA). Condensateurs et bobines sont remplacés à chaque pas
 * par leur modèle compagnon (méthode des trapèzes ; Euler implicite pendant 2 pas après une
 * commutation pour éviter les oscillations numériques).
 *
 * Unités internes SI. Valeurs des dipôles saisies : R en Ω, C en µF, L en mH, r en Ω.
 */

let uid = 0
export const newId = () => 'X' + ++uid

/** valeurs SI d'un dipôle */
const SI = (el) => ({ R: el.value, C: el.value * 1e-6, L: el.value / 1000, r: el.r ?? 0 })

/**
 * Construit la liste des blocs à partir des blocs de base et des ajouts de l'utilisateur.
 *  base : [{ id, pos: 'top' | 'right', els: [{ id, type, value, r? }] }]
 *  extras : [{ id, type, value, r?, mode: 'serie' | 'parallele', target: idDuBloc }]
 */
export function buildSlots(base, extras = []) {
  const slots = base.map((s) => ({ ...s, els: s.els.map((e) => ({ ...e })) }))
  for (const x of extras) {
    const el = { id: x.id, type: x.type, value: x.value, r: x.r ?? 0, extra: true }
    if (x.mode === 'parallele') {
      const t = slots.find((s) => s.id === x.target)
      if (t && t.els.length < 3) t.els.push(el)
    } else {
      const top = slots.filter((s) => s.pos === 'top')
      if (top.length >= 4) continue
      const idx = slots.findIndex((s) => s.id === x.target)
      const ins = idx >= 0 && slots[idx].pos === 'top' ? idx + 1 : slots.findIndex((s) => s.pos === 'right')
      slots.splice(ins < 0 ? slots.length : ins, 0, { id: x.id, pos: 'top', els: [el], extra: true })
    }
  }
  return slots
}

/** Résolution d'un système linéaire (Gauss avec pivot partiel), en place. */
function solve(A, b) {
  const n = b.length
  for (let c = 0; c < n; c++) {
    let piv = c
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r
    if (Math.abs(A[piv][c]) < 1e-30) continue
    ;[A[c], A[piv]] = [A[piv], A[c]]
    ;[b[c], b[piv]] = [b[piv], b[c]]
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / A[c][c]
      if (!f) continue
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]
      b[r] -= f * b[c]
    }
  }
  const x = new Array(n).fill(0)
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r]
    for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k]
    x[r] = Math.abs(A[r][r]) < 1e-30 ? 0 : s / A[r][r]
  }
  return x
}

/** Compagnon (G, J) d'un dipôle : i = G·v + J */
function companion(el, st, dt, be) {
  const q = SI(el)
  if (el.type === 'R') return { G: 1 / Math.max(q.R, 1e-6), J: 0 }
  if (el.type === 'C') {
    if (be) { const G = q.C / dt; return { G, J: -G * st.v } }
    const G = (2 * q.C) / dt
    return { G, J: -G * st.v - st.i }
  }
  // bobine L en série avec r
  if (be) { const G = 1 / (q.L / dt + q.r); return { G, J: G * (q.L / dt) * st.i } }
  const G = 1 / ((2 * q.L) / dt + q.r)
  return { G, J: G * (st.v + ((2 * q.L) / dt - q.r) * st.i) }
}

/** Un pas de simulation. state.els : { [idDipôle]: { v, i } } */
export function stepCircuit(slots, els, Vs, dt, be) {
  const N = slots.length
  const n = N + 1 // N tensions de nœuds + courant du générateur
  const A = Array.from({ length: n }, () => new Array(n).fill(0))
  const b = new Array(n).fill(0)
  const comps = []
  slots.forEach((s, j) => {
    const a = j // index matriciel du nœud j+1
    const c = j + 1 < N ? j + 1 : -1 // −1 = masse
    for (const el of s.els) {
      const st = els[el.id] ?? { v: 0, i: 0 }
      const { G, J } = companion(el, st, dt, be)
      comps.push({ el, a, c, G, J })
      A[a][a] += G
      if (c >= 0) { A[c][c] += G; A[a][c] -= G; A[c][a] -= G }
      b[a] -= J
      if (c >= 0) b[c] += J
    }
  })
  // générateur idéal entre le nœud 1 (+) et la masse
  A[0][N] += 1
  A[N][0] += 1
  b[N] = Vs
  const x = solve(A, b)
  const out = {}
  for (const { el, a, c, G, J } of comps) {
    const v = x[a] - (c >= 0 ? x[c] : 0)
    out[el.id] = { v, i: G * v + J }
  }
  const slotU = {}
  slots.forEach((s, j) => (slotU[s.id] = x[j] - (j + 1 < N ? x[j + 1] : 0)))
  return { els: out, slotU, iLoop: -x[N] }
}

/**
 * Fabrique un modèle utilisable par useSimulation.
 *  base(p) : blocs de base ; source(t, p, k) : tension du générateur ;
 *  init(p, el) : tension initiale d'un condensateur ; initK : position initiale de K ;
 *  fields(state, p) : grandeurs supplémentaires (compatibilité avec les courbes existantes).
 */
export function makeCircuitModel({ maxDt, base, source, init = () => 0, initK = 1, fields = () => ({}) }) {
  return {
    maxDt,
    init(p) {
      const slots = buildSlots(base(p), p.extras)
      const els = {}
      for (const s of slots) for (const el of s.els) els[el.id] = { v: el.type === 'C' ? init(p, el, s) : 0, i: 0 }
      const slotU = {}
      for (const s of slots) slotU[s.id] = s.els.find((e) => e.type === 'C') ? els[s.els.find((e) => e.type === 'C').id].v : 0
      const st = { t: 0, k: initK, kPrev: initK, be: 2, els, slotU, iLoop: 0, tSwitch: 0 }
      return { ...st, ...fields(st, p, slots) }
    },
    step(s, dt, p) {
      const slots = buildSlots(base(p), p.extras)
      const be = s.be > 0 || s.k !== s.kPrev
      const Vs = s.k === 1 ? source(s.t + dt, p) : 0
      const r = stepCircuit(slots, s.els, Vs, dt, be)
      const st = { ...s, t: s.t + dt, els: r.els, slotU: r.slotU, iLoop: r.iLoop, kPrev: s.k, be: s.k !== s.kPrev ? 2 : Math.max(0, s.be - 1) }
      return { ...st, ...fields(st, p, slots) }
    },
  }
}

/* ---------------- grandeurs équivalentes et régime sinusoïdal ---------------- */

/** impédance complexe [re, im] d'un dipôle à la pulsation w */
function zEl(el, w) {
  const q = SI(el)
  if (el.type === 'R') return [q.R, 0]
  if (el.type === 'C') return [0, -1 / (w * q.C)]
  return [q.r, w * q.L]
}
const cdiv = ([a, b], [c, d]) => { const m = c * c + d * d; return [(a * c + b * d) / m, (b * c - a * d) / m] }
const cinv = (z) => cdiv([1, 0], z)

/** impédance d'un bloc (dipôles en parallèle) */
export function zSlot(slot, w) {
  let y = [0, 0]
  for (const el of slot.els) {
    const z = zEl(el, w)
    if (Math.hypot(z[0], z[1]) < 1e-12) return [0, 0]
    const yi = cinv(z)
    y = [y[0] + yi[0], y[1] + yi[1]]
  }
  return cinv(y)
}

/** régime sinusoïdal : amplitude du courant et des tensions de blocs pour une tension Um à N Hz */
export function acSolve(slots, Um, N) {
  const w = 2 * Math.PI * N
  const zs = slots.map((s) => zSlot(s, w))
  const Z = zs.reduce((a, z) => [a[0] + z[0], a[1] + z[1]], [0, 0])
  const I = cdiv([Um, 0], Z) // phase de u = 0
  const U = {}
  slots.forEach((s, j) => {
    const z = zs[j]
    const u = [I[0] * z[0] - I[1] * z[1], I[0] * z[1] + I[1] * z[0]]
    U[s.id] = { amp: Math.hypot(u[0], u[1]), phase: Math.atan2(u[1], u[0]) }
  })
  return { Z: Math.hypot(Z[0], Z[1]), Im: Math.hypot(I[0], I[1]), phi: -Math.atan2(I[1], I[0]), U }
}

/**
 * Grandeurs équivalentes pour les formules du cours (τ, N0…) :
 * somme des résistances (y compris r des bobines), inductance totale, capacité équivalente.
 * « simple » est faux si un bloc mélange des dipôles de natures différentes.
 */
export function equivalents(slots) {
  let R = 0, L = 0, invC = 0, simple = true
  for (const s of slots) {
    const types = new Set(s.els.map((e) => e.type))
    if (types.size > 1) { simple = false; continue }
    const t = s.els[0].type
    if (t === 'R') R += 1 / s.els.reduce((a, e) => a + 1 / Math.max(e.value, 1e-6), 0)
    else if (t === 'C') invC += 1 / (s.els.reduce((a, e) => a + e.value, 0) * 1e-6)
    else {
      if (s.els.length > 1) {
        L += 1 / s.els.reduce((a, e) => a + 1 / (e.value / 1000), 0)
        R += 1 / s.els.reduce((a, e) => a + 1 / Math.max(e.r ?? 0, 1e-9), 0)
        if (s.els.some((e) => (e.r ?? 0) > 0)) simple = false
      } else {
        L += s.els[0].value / 1000
        R += s.els[0].r ?? 0
      }
    }
  }
  return { R, L, C: invC > 0 ? 1 / invC : Infinity, simple }
}

/** énergies stockées */
export function energies(slots, els) {
  let Ee = 0, Em = 0
  for (const s of slots) for (const el of s.els) {
    const st = els[el.id]
    if (!st) continue
    if (el.type === 'C') Ee += 0.5 * el.value * 1e-6 * st.v * st.v
    if (el.type === 'L') Em += 0.5 * (el.value / 1000) * st.i * st.i
  }
  return { Ee, Em }
}
