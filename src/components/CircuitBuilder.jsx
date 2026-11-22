import { useState } from 'react'
import Slider from './Slider.jsx'
import { newId, buildSlots, equivalents } from '../lib/circuit.js'

/** plages de valeurs par défaut (unités internes : Ω, µF, mH) */
export const RANGES = {
  R: { min: 10, max: 1000, step: 10, def: 100, unit: 'Ω', fmt: (v) => v },
  C: { min: 1, max: 470, step: 1, def: 10, unit: 'µF', fmt: (v) => v },
  L: { min: 10, max: 1000, step: 10, def: 100, unit: 'mH', fmt: (v) => v },
}
const NAMES = { R: 'Résistor', C: 'Condensateur', L: 'Bobine' }

export const fmtValue = (el) =>
  el.type === 'R' ? (el.value >= 1000 ? +(el.value / 1000).toFixed(2) + ' kΩ' : el.value + ' Ω') : el.type === 'C' ? el.value + ' µF' : el.value + ' mH'

/** noms automatiques : R2, C2, L2… */
export function withLabels(slots) {
  // les dipôles de base gardent leur nom ; les ajouts sont numérotés ensuite (R2, C2…)
  const count = { R: 0, C: 0, L: 0 }
  for (const s of slots) for (const el of s.els) if (!el.extra) count[el.type]++
  for (const s of slots) for (const el of s.els) {
    if (!el.extra) continue
    count[el.type]++
    el.label = count[el.type] === 1 ? el.type : el.type + count[el.type]
  }
  return slots
}

/**
 * Transforme les blocs du simulateur en blocs pour CircuitScene.
 *  names : { idDuBloc: nom JSX de la tension }  (sinon u_{label})
 */
export function sceneSlots(slots, names = {}) {
  const view = slots.map((s) => ({
    key: s.id,
    name: names[s.id] ?? (<>u<sub>{s.els[0].label}</sub></>),
    u: (st) => st.slotU?.[s.id] ?? 0,
    els: s.els.map((e) => ({ type: e.type, label: e.label, ohms: e.type === 'R' ? e.value : undefined })),
  }))
  return { top: view.filter((_, k) => slots[k].pos === 'top'), right: view.find((_, k) => slots[k].pos === 'right') }
}

/**
 * Panneau « Ajouter un composant » : en série ou en parallèle d'un bloc existant.
 *  base(p) : blocs de base de l'expérience ; types : dipôles proposés ; ranges : plages propres.
 */
export default function CircuitBuilder({ params, setParams, base, types = ['R', 'C', 'L'], ranges = {} }) {
  const [type, setType] = useState(types[0])
  const R = { ...RANGES, ...ranges }
  const [value, setValue] = useState(R[types[0]].def)
  const [mode, setMode] = useState('parallele')
  const slots = withLabels(buildSlots(base(params), params.extras))
  const [target, setTarget] = useState(slots[slots.length - 1]?.id)
  const tgt = slots.find((s) => s.id === target) ?? slots[slots.length - 1]
  const extras = params.extras ?? []
  const nTop = slots.filter((s) => s.pos === 'top').length
  const full = mode === 'parallele' ? tgt.els.length >= 3 : nTop >= 4
  const eq = equivalents(slots)

  const pick = (t) => {
    setType(t)
    setValue(R[t].def)
  }
  const add = () => {
    if (full) return
    const x = { id: newId(), type, value, r: 0, mode, target: tgt.id }
    setParams((p) => ({ ...p, extras: [...(p.extras ?? []), x] }))
  }
  const remove = (id) => setParams((p) => ({ ...p, extras: (p.extras ?? []).filter((x) => x.id !== id) }))
  const labelOf = (id) => {
    for (const s of slots) for (const e of s.els) if (e.id === id) return e.label
    return '?'
  }
  const slotName = (s) => s.els.map((e) => e.label).join(' ∥ ')

  return (
    <div className="builder">
      <h2>Ajouter un composant</h2>
      <div className="speed" role="group" aria-label="Type">
        {types.map((t) => (
          <button key={t} className={type === t ? 'on' : ''} onClick={() => pick(t)}>{NAMES[t]}</button>
        ))}
      </div>
      <Slider label={`Valeur (${NAMES[type].toLowerCase()})`} value={value} min={R[type].min} max={R[type].max} step={R[type].step} unit={R[type].unit} onChange={setValue} format={R[type].fmt} />
      <div className="speed" role="group" aria-label="Montage">
        <span>Montage</span>
        <button className={mode === 'parallele' ? 'on' : ''} onClick={() => setMode('parallele')}>En parallèle avec</button>
        <button className={mode === 'serie' ? 'on' : ''} onClick={() => setMode('serie')}>En série après</button>
      </div>
      <div className="speed" role="group" aria-label="Bloc">
        {slots.map((s) => (
          <button key={s.id} className={tgt.id === s.id ? 'on' : ''} onClick={() => setTarget(s.id)}>{slotName(s)}</button>
        ))}
      </div>
      <button className="switch-btn" onClick={add} disabled={full}>
        {full ? (mode === 'parallele' ? '3 dipôles maximum en parallèle' : '4 blocs maximum sur la ligne') : `+ Ajouter ${type}${''} (${fmtValue({ type, value })})`}
      </button>
      {extras.length > 0 && (
        <ul className="extras">
          {extras.map((x) => (
            <li key={x.id}>
              <b>{labelOf(x.id)}</b> = {fmtValue(x)} · {x.mode === 'parallele' ? 'en parallèle avec' : 'en série après'} {labelOf(x.target) === '?' ? x.target : labelOf(x.target)}
              <button className="link" onClick={() => remove(x.id)} title="Retirer">✕</button>
            </li>
          ))}
        </ul>
      )}
      {extras.length > 0 && (
        <p className="formula">
          {eq.simple ? (
            <>
              Équivalents : R<sub>éq</sub> = {eq.R >= 1000 ? (eq.R / 1000).toFixed(2) + ' kΩ' : eq.R.toFixed(1) + ' Ω'}
              {isFinite(eq.C) && <> · C<sub>éq</sub> = {(eq.C * 1e6).toFixed(2)} µF</>}
              {eq.L > 0 && <> · L<sub>éq</sub> = {(eq.L * 1000).toFixed(0)} mH</>}
            </>
          ) : (
            <>Bloc mixte (par exemple R ∥ C) : pas de valeur équivalente simple, et les formules τ, N₀ ne s’appliquent plus. La simulation reste exacte.</>
          )}
        </p>
      )}
    </div>
  )
}
