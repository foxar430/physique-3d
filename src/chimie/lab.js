import { EMPTY, clone, take, mix, react, pH } from './chem.js'

/**
 * Logique de la paillasse (sans React) : objets, emplacements, transvasements.
 *
 * Objet : { id, kind, label, cap (L), sol, slot, home, held, ... }
 *  kind : 'beaker' | 'erlen' | 'tube' (récipients posables)
 *         'bottle' (flacon de réactif, inépuisable) | 'dropper' (flacon compte-gouttes d'indicateur)
 *         'pipette' (pipette jaugée) | 'eprouvette' (éprouvette graduée) | 'probe' (sonde du pH-mètre)
 * Emplacements (slots) : { id, x, z, kind: 'bench' | 'stirrer' | 'ice' | 'bath', label }
 */

export const POUR_RATE = 0.006 // L/s (6 mL/s) en versant à la main
export const PIPETTE_RATE = 0.004
export const DROP = 0.00005 // 0,05 mL par goutte
export const BURETTE_RATE = 0.0004 // L/s, robinet grand ouvert

export function createLab(cfg) {
  const lab = {
    t: 0, // temps simulé (s)
    items: {},
    slots: cfg.slots,
    burette: cfg.burette ? { sol: EMPTY(), cap: 0.025, open: false, delivered: 0, filledWith: null, zeroed: false } : null,
    stirring: false,
    chrono: { on: false, t0: 0 },
    held: null,
    hover: null, // cible survolée pendant un déplacement
    pour: null, // { from, to, mode }
    events: [],
    log: [], // messages affichés à l'élève
    version: 0,
  }
  for (const it of cfg.items) {
    lab.items[it.id] = {
      held: false,
      sol: it.reagent ? clone(it.reagent) : EMPTY(),
      cap: 0.25,
      pos: [0, 0, 0],
      ...it,
    }
    const o = lab.items[it.id]
    if (o.slot) placeOn(lab, o, o.slot)
    else o.pos = [o.home[0], 0, o.home[1]]
  }
  return lab
}

export const slotOf = (lab, id) => lab.slots.find((s) => s.id === id)
export const occupant = (lab, slotId) => Object.values(lab.items).find((o) => o.slot === slotId && !o.held)
export const isContainer = (o) => o && (o.kind === 'beaker' || o.kind === 'erlen' || o.kind === 'tube')

function placeOn(lab, o, slotId) {
  const s = slotOf(lab, slotId)
  o.slot = slotId
  o.pos = [s.x, s.kind === 'ice' || s.kind === 'bath' ? 0.12 : s.kind === 'stirrer' ? 0.18 : 0, s.z]
  if (s.kind === 'ice') o.sol.T = 2
  if (s.kind === 'bath') o.sol.T = s.T ?? lab.bathT ?? 60
  if (s.kind === 'ice' && isContainer(o)) o.sol.quenched = true
  if (s.kind === 'ice' && isContainer(o)) o.coldSince = lab.t
}

export function emit(lab, type, data = {}) {
  const ev = { type, t: lab.t, ...data }
  lab.events.push(ev)
  lab.version++
  lab.onEvent?.(lab, ev)
}
export function say(lab, text, level = 'info') {
  if (lab.log[0]?.text === text) return
  lab.log.unshift({ text, level, id: Math.random() })
  if (lab.log.length > 4) lab.log.pop()
  lab.version++
}

/* ----------------------------- prise / dépôt ----------------------------- */

export function grab(lab, id) {
  const o = lab.items[id]
  if (!o) return
  o.held = true
  lab.held = id
  if (o.kind === 'probe' && o.inside) o.inside = null
  lab.version++
}

/** déplacement de l'objet tenu (coordonnées de la paillasse) */
export function moveHeld(lab, x, z) {
  const o = lab.items[lab.held]
  if (!o) return
  o.pos = [x, 0.9, z]
  lab.hover = findTarget(lab, o, x, z)
}

/** cible sous l'objet tenu : récipient, flacon, burette */
function findTarget(lab, o, x, z) {
  const emptyTool = (o.kind === 'pipette' || o.kind === 'eprouvette') && o.sol.V < 1e-7
  const accepts = (t) => {
    if (t.id === o.id || t.held) return false
    if (emptyTool) {
      // l'éprouvette se remplit au flacon ; la pipette au flacon ou dans un récipient (prélèvement),
      // mais pas dans le récipient où elle vient d'être vidée
      if (t.kind === 'bottle') return true
      return o.kind === 'pipette' && isContainer(t) && t.id !== o.justEmptied
    }
    return isContainer(t)
  }
  let best = null
  let bd = 0.55
  for (const t of Object.values(lab.items)) {
    if (!accepts(t)) continue
    const d = Math.hypot(t.pos[0] - x, t.pos[2] - z)
    if (d < bd) {
      bd = d
      best = t.id
    }
  }
  if (lab.burette && o.kind === 'bottle') {
    const b = lab.buretteTop ?? [0, 0]
    if (Math.hypot(b[0] - x, b[1] - z) < 0.45) best = 'burette'
  }
  return best
}

export function release(lab) {
  const o = lab.items[lab.held]
  lab.held = null
  lab.pour = null
  if (!o) return
  o.held = false
  o.justEmptied = null
  const tgt = lab.hover
  lab.hover = null
  if (isContainer(o)) {
    // poser sur l'emplacement libre le plus proche
    let best = null
    let bd = 0.7
    for (const s of lab.slots) {
      if (occupant(lab, s.id)) continue
      const d = Math.hypot(s.x - o.pos[0], s.z - o.pos[2])
      if (d < bd) {
        bd = d
        best = s.id
      }
    }
    placeOn(lab, o, best ?? o.slot)
    if (best && slotOf(lab, best).kind === 'stirrer') emit(lab, 'placeStirrer', { id: o.id })
    if (best && slotOf(lab, best).kind === 'ice') emit(lab, 'quench', { id: o.id })
    if (best && slotOf(lab, best).kind === 'bath') emit(lab, 'bath', { id: o.id })
  } else if (o.kind === 'probe' && tgt && isContainer(lab.items[tgt])) {
    o.inside = tgt
    emit(lab, 'probeIn', { id: tgt })
  } else {
    o.pos = [o.home[0], 0, o.home[1]]
  }
  lab.version++
}

/* ----------------------------- transvasements ----------------------------- */

/** appelé à chaque image pendant qu'on tient un objet au-dessus d'une cible */
export function pourStep(lab, dt) {
  const o = lab.items[lab.held]
  const tid = lab.hover
  if (!o || !tid) {
    lab.pour = null
    return
  }
  const t = tid === 'burette' ? null : lab.items[tid]
  // pipette / éprouvette au-dessus d'un flacon ou d'un récipient : prélèvement
  if ((o.kind === 'pipette' || o.kind === 'eprouvette') && o.sol.V < 1e-7 && t && (t.kind === 'bottle' || isContainer(t))) {
    lab.pour = { from: t.id, to: o.id, mode: 'fill' }
    const want = o.kind === 'pipette' ? o.cap : Math.min(o.cap, (o.target ?? o.cap))
    const rate = o.kind === 'pipette' ? PIPETTE_RATE : POUR_RATE
    const v = Math.min(rate * dt, want - (o.filling ?? 0))
    if (t.kind !== 'bottle' && t.sol.V < v) return say(lab, `${t.label} ne contient plus assez de liquide.`, 'warn')
    o.filling = (o.filling ?? 0) + v
    if (o.filling >= want - 1e-9) {
      const src = t.kind === 'bottle' ? { ...clone(t.sol), V: t.sol.V } : t.sol
      const { out, rest } = take(t.kind === 'bottle' ? scaleTo(src, want) : src, want)
      o.sol = t.kind === 'bottle' ? scaleTo(t.sol, want) : out
      if (t.kind !== 'bottle') t.sol = rest
      o.filling = 0
      o.from = t.label
      emit(lab, 'filled', { what: o.id, from: t.id, V: want })
      say(lab, `${o.label} remplie : ${(want * 1000).toFixed(1)} mL de ${t.label}.`)
    }
    return
  }
  // flacon au-dessus de la burette : remplissage
  if (tid === 'burette' && o.kind === 'bottle') {
    const b = lab.burette
    lab.pour = { from: o.id, to: 'burette', mode: 'pour' }
    if (b.filledWith && b.filledWith !== o.id) return say(lab, 'La burette contient déjà une autre solution : vide-la et rince-la d’abord.', 'warn')
    const v = Math.min(POUR_RATE * dt, b.cap + 0.002 - b.sol.V)
    if (v <= 0) return
    b.sol = mix(b.sol, scaleTo(o.sol, v))
    b.filledWith = o.id
    b.zeroed = false
    lab.version++
    return
  }
  if (!t || !isContainer(t)) return
  // compte-gouttes : quelques gouttes d'indicateur
  if (o.kind === 'dropper') {
    o.acc = (o.acc ?? 0) + dt
    lab.pour = { from: o.id, to: t.id, mode: 'drops' }
    if (o.acc > 0.45) {
      o.acc = 0
      t.sol = mix(t.sol, scaleTo(o.sol, DROP))
      emit(lab, 'drop', { from: o.id, to: t.id, species: o.species })
    }
    return
  }
  // versement : flacon, éprouvette, pipette (pleine), récipient
  const src = o.kind === 'bottle' ? null : o.sol
  if (src && src.V < 1e-7) return
  const rate = o.kind === 'pipette' ? PIPETTE_RATE : POUR_RATE
  let v = rate * dt
  if (src) v = Math.min(v, src.V)
  if (t.sol.V + v > t.cap) {
    v = Math.max(0, t.cap - t.sol.V)
    if (v === 0) return say(lab, `${t.label} est plein !`, 'warn')
  }
  lab.pour = { from: o.id, to: t.id, mode: 'pour' }
  if (o.kind === 'bottle') t.sol = mix(t.sol, scaleTo(o.sol, v))
  else {
    const { out, rest } = take(src, v)
    o.sol = rest
    t.sol = mix(t.sol, out)
    if ((o.kind === 'pipette' || o.kind === 'eprouvette') && rest.V < 1e-7) {
      o.justEmptied = t.id
      lab.hover = null
      if (o.kind === 'pipette') emit(lab, 'pipetteEmptied', { into: t.id, V: o.cap })
    }
  }
  emit(lab, 'poured', { from: o.id, to: t.id, V: v })
}

/** copie d'un réactif ramenée au volume v (concentrations inchangées) */
export function scaleTo(sol, v) {
  const f = sol.V > 0 ? v / sol.V : 0
  const out = { V: v, T: sol.T, n: {} }
  for (const [k, x] of Object.entries(sol.n)) out.n[k] = x * f
  return out
}

/* ----------------------------- burette ----------------------------- */

export function buretteDeliver(lab, v) {
  const b = lab.burette
  if (!b) return
  v = Math.min(v, b.sol.V)
  if (v <= 0) return say(lab, 'La burette est vide.', 'warn')
  if (!b.zeroed) say(lab, 'Pense à ajuster le zéro de la burette avant de commencer.', 'warn')
  const { out, rest } = take(b.sol, v)
  b.sol = rest
  b.delivered += v
  const under = occupant(lab, lab.slots.find((s) => s.kind === 'stirrer')?.id)
  if (under) {
    under.sol = mix(under.sol, out)
    emit(lab, 'burette', { to: under.id, V: v })
  } else say(lab, 'Aucun récipient sous la burette : la solution coule sur la paillasse !', 'warn')
  lab.version++
}

export function buretteZero(lab) {
  const b = lab.burette
  if (!b || b.sol.V < 0.001) return say(lab, 'Remplis d’abord la burette.', 'warn')
  if (b.sol.V < b.cap - 1e-6) return say(lab, 'Le niveau est sous le zéro : complète la burette avec le flacon, puis ajuste le zéro.', 'warn')
  // on laisse couler l'excès pour amener le niveau au zéro (25,0 mL dans la burette)
  if (b.sol.V > b.cap) b.sol = take(b.sol, b.cap).out
  b.delivered = b.cap - b.sol.V
  b.zeroed = true
  b.delivered = 0
  b.offset = b.cap - b.sol.V // volume « manquant » par rapport au zéro
  emit(lab, 'zero')
  say(lab, 'Zéro de la burette ajusté.')
}

/** lecture de la burette (mL) : volume versé depuis le zéro */
export const buretteReading = (lab) => (lab.burette ? (lab.burette.cap - lab.burette.sol.V) * 1000 : 0)

/* ----------------------------- évolution temporelle ----------------------------- */

export function tick(lab, dt, simDt) {
  lab.t += simDt
  for (const o of Object.values(lab.items)) if (isContainer(o)) react(o.sol, simDt)
  if (lab.burette?.open) buretteDeliver(lab, BURETTE_RATE * dt)
  if (lab.held) pourStep(lab, dt)
}

export function readPH(lab) {
  const probe = Object.values(lab.items).find((o) => o.kind === 'probe')
  if (!probe?.inside) return null
  const s = lab.items[probe.inside].sol
  if (s.V < 0.002) return null // la sonde ne trempe pas
  return pH(s)
}
