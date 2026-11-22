import { useState } from 'react'
import TPLayout from '../TPLayout.jsx'
import Plot from '../../components/Plot.jsx'
import { say, buretteReading, occupant } from '../lab.js'
import { BURETTE_X, BURETTE_Z } from '../Bench.jsx'

export const meta = {
  id: 'tp-cinetique',
  title: 'TP : suivi cinétique de l’oxydation des ions iodure',
  level: '4e année (Bac) · Chimie',
  sections: 'Maths · Sc. Exp.',
  chapter: 'Cinétique chimique : avancement, vitesse, facteurs cinétiques',
}

/*
 * S2O8²⁻ + 2 I⁻ → 2 SO4²⁻ + I2   (lente)
 * Prélèvement de 10 mL, trempe dans l'eau glacée, puis dosage du diiode formé :
 * I2 + 2 S2O3²⁻ → 2 I⁻ + S4O6²⁻ (rapide) ; à l'équivalence n(I2) = C·VE / 2.
 * Mélange : 50 mL de KI 0,40 mol/L + 50 mL de K2S2O8 0,040 mol/L → xmax = 2,0 mmol.
 */
const C_THIO = 0.02
const VPREL = 0.01
const VTOT = 0.1

const cfg = {
  burette: true,
  phmeter: false,
  shelf: { x: -3.0, z: -1.35, w: 2.9 },
  rack: { x: 3.1, z: 1.05, w: 1.8 },
  slots: [
    { id: 'r', kind: 'bench', x: 1.0, z: 0.75 },
    { id: 'hot', kind: 'bath', x: 2.1, z: -0.05, T: 40, r: 0.48, label: 'bain-marie 40 °C' },
    { id: 'b2', kind: 'bench', x: -3.8, z: 0.85 },
    { id: 'b3', kind: 'bench', x: -3.0, z: 0.85 },
    { id: 'b4', kind: 'bench', x: -2.2, z: 0.85 },
    { id: 'ice1', kind: 'ice', x: -1.25, z: 0.95, r: 0.42 },
    { id: 'ice2', kind: 'ice', x: -0.25, z: 1.05, r: 0.42, label: 'eau glacée' },
    { id: 'stir', kind: 'stirrer', x: BURETTE_X, z: BURETTE_Z },
  ],
  items: [
    { id: 'ki', kind: 'bottle', label: 'Iodure de potassium', home: [-4.0, -1.3], reagent: { V: 1, T: 20, n: { I_: 0.4 } }, tag: { name: 'Iodure de potassium', formula: 'K⁺ + I⁻', conc: '0,40 mol/L', color: '#e0a000' } },
    { id: 'pers', kind: 'bottle', label: 'Peroxodisulfate de potassium', home: [-3.0, -1.3], reagent: { V: 1, T: 20, n: { S2O8: 0.04 } }, tag: { name: 'Peroxodisulfate de potassium', formula: '2K⁺ + S₂O₈²⁻', conc: '0,040 mol/L', color: '#7c4dff' } },
    { id: 'thio', kind: 'bottle', label: 'Thiosulfate de sodium', home: [-2.0, -1.3], reagent: { V: 1, T: 20, n: { S2O3: C_THIO } }, tag: { name: 'Thiosulfate de sodium', formula: '2Na⁺ + S₂O₃²⁻', conc: '0,020 mol/L', color: '#2f9e44' } },
    { id: 'amidon', kind: 'dropper', label: 'Empois d’amidon', home: [3.2, -1.3], reagent: { V: 0.02, T: 20, n: { AMIDON: 1 } }, species: 'AMIDON', tag: { name: 'Empois d’amidon', formula: 'indicateur du diiode', color: '#5c7cfa' } },
    { id: 'fer', kind: 'dropper', label: 'Sulfate de fer II', home: [3.85, -1.3], reagent: { V: 0.02, T: 20, n: { Fe: 0.002 } }, species: 'Fe', tag: { name: 'Sulfate de fer II', formula: 'Fe²⁺ (catalyseur)', color: '#a5772d' } },
    { id: 'epr', kind: 'eprouvette', label: 'Éprouvette 50 mL', cap: 0.05, home: [3.5, 1.05] },
    { id: 'pip', kind: 'pipette', label: 'Pipette jaugée 10 mL', cap: VPREL, home: [2.6, 1.05] },
    { id: 'becher', kind: 'beaker', label: 'Bécher réactionnel', cap: 0.25, slot: 'r' },
    { id: 'e1', kind: 'erlen', label: 'Erlen 1', cap: 0.1, slot: 'b2' },
    { id: 'e2', kind: 'erlen', label: 'Erlen 2', cap: 0.1, slot: 'b3' },
    { id: 'e3', kind: 'erlen', label: 'Erlen 3', cap: 0.1, slot: 'b4' },
  ],
}

export default function CinetiqueTP() {
  const [seed, setSeed] = useState(1)
  return <Cinetique key={seed} restart={() => setSeed((s) => s + 1)} />
}

function Cinetique({ restart }) {
  const [rows, setRows] = useState([]) // { erlen, t, ve }
  const [prel, setPrel] = useState({}) // erlen → t du prélèvement

  const setupLab = (lab) => {
    lab.onEvent = (l, ev) => {
      const bec = l.items.becher
      if (ev.type === 'poured' && ev.to === 'becher' && !l.chrono.on && (bec.sol.n.S2O8 ?? 0) > 0 && (bec.sol.n.I_ ?? 0) > 0) {
        l.chrono.on = true
        l.chrono.t0 = l.t
        say(l, 'Les deux réactifs sont mélangés : le chronomètre démarre (t = 0).', 'ok')
      }
      if (ev.type === 'poured' && ev.from === 'thio' && ev.to !== 'burette') say(l, 'Le thiosulfate se verse avec la burette (dosage).', 'warn')
      if (ev.type === 'filled' && ev.what === 'pip' && ev.from === 'becher') {
        l.lastPrel = l.chrono.on ? l.t - l.chrono.t0 : 0
        say(l, `Prélèvement de 10 mL à t = ${Math.round(l.lastPrel)} s. Verse-le vite dans un erlenmeyer placé dans l’eau glacée.`, 'ok')
      }
      if (ev.type === 'pipetteEmptied' && /^e\d/.test(ev.into)) {
        const e = l.items[ev.into]
        if (!e.sol.quenched) say(l, 'Attention : cet erlenmeyer n’est pas dans l’eau glacée, la réaction continue !', 'warn')
        setPrel((p) => ({ ...p, [ev.into]: l.lastPrel ?? 0 }))
      }
      if (ev.type === 'drop' && ev.species === 'Fe' && ev.to === 'becher') say(l, 'Catalyseur ajouté : la réaction sera plus rapide.', 'ok')
    }
    say(lab, 'Mesure 50 mL de KI avec l’éprouvette (tiens-la au-dessus du flacon), puis verse-la dans le bécher.')
  }

  const steps = (lab) => {
    const bec = lab.items.becher
    const b = lab.burette
    const both = lab.chrono.on
    const titrated = rows.length
    return [
      { text: 'Verser 50 mL de KI (éprouvette) dans le bécher réactionnel.', done: (bec.sol.n.I_ ?? 0) + (bec.sol.n.I2 ?? 0) * 2 > 0.015 },
      { text: 'Ajouter 50 mL de K₂S₂O₈ : le chronomètre démarre.', done: both },
      { text: 'Remplir la burette de thiosulfate et ajuster le zéro.', done: b.filledWith === 'thio' && b.zeroed },
      { text: 'Placer un erlenmeyer dans l’eau glacée.', done: Object.values(lab.items).some((o) => o.kind === 'erlen' && o.sol.quenched) || ['ice1', 'ice2'].some((s) => occupant(lab, s)) },
      { text: 'Prélever 10 mL du mélange à la pipette et les verser dans l’erlenmeyer glacé (trempe).', done: Object.keys(prel).length > 0 },
      { text: 'Poser l’erlenmeyer sous la burette, ajouter de l’empois d’amidon (bleu), doser jusqu’à décoloration.', done: titrated > 0 },
      { text: 'Recommencer à d’autres instants : au moins 3 prélèvements dosés.', done: titrated >= 3 },
      { text: 'Tracer x = f(t) et en déduire le temps de demi-réaction.', done: titrated >= 3 },
    ]
  }

  const tools = (lab, refresh) => {
    const under = occupant(lab, 'stir')
    const ve = lab.burette.zeroed ? buretteReading(lab) : null
    return (
      <>
        <h2>Dosage en cours</h2>
        <p className="formula">
          Sous la burette : <b>{under ? under.label : '—'}</b>
          {under && prel[under.id] != null && <> (prélevé à t = {Math.round(prel[under.id])} s)</>}
          <br />V<sub>thiosulfate</sub> versé = <b>{ve == null ? '— (ajuste le zéro)' : ve.toFixed(2) + ' mL'}</b>
        </p>
        <button
          className="switch-btn"
          onClick={() => {
            if (!under || prel[under.id] == null) return say(lab, 'Place sous la burette un erlenmeyer contenant un prélèvement.', 'warn'), refresh()
            if (ve == null) return say(lab, 'Ajuste d’abord le zéro de la burette.', 'warn'), refresh()
            if ((under.sol.n.I2 ?? 0) / under.sol.V > 2e-6) say(lab, 'La solution est encore bleue : l’équivalence n’est pas atteinte.', 'warn')
            setRows((r) => [...r.filter((x) => x.erlen !== under.id), { erlen: under.id, t: prel[under.id], ve }].sort((a, b) => a.t - b.t))
            say(lab, `Équivalence notée : VE = ${ve.toFixed(2)} mL. Vide l’erlenmeyer (remets-le) pour le réutiliser, puis réajuste le zéro.`, 'ok')
            refresh()
          }}
        >
          Noter V<sub>E</sub> (décoloration)
        </button>
        <button
          className="link"
          onClick={() => {
            if (!under) return
            under.sol = { V: 0, T: 2, n: {}, quenched: true }
            setPrel((p) => {
              const q = { ...p }
              delete q[under.id]
              return q
            })
            refresh()
          }}
        >
          Vider et rincer l’erlenmeyer sous la burette
        </button>
        <button className="link" onClick={restart}>Recommencer le TP</button>
      </>
    )
  }

  const xOf = (ve) => ((C_THIO * ve * 1e-3) / 2) * (VTOT / VPREL) * 1000 // mmol dans tout le mélange

  const notebook = () => (
    <div className="notebook">
      <b>Cahier de mesures</b>
      {rows.length === 0 ? (
        <p className="small muted">Aucun dosage noté.</p>
      ) : (
        <table>
          <thead><tr><th>t (s)</th><th>V<sub>E</sub> (mL)</th><th>n(I₂) prélevé (mmol)</th><th>x (mmol)</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.erlen + r.t}>
                <td>{Math.round(r.t)}</td>
                <td>{r.ve.toFixed(2)}</td>
                <td>{((C_THIO * r.ve) / 2).toFixed(3)}</td>
                <td>{xOf(r.ve).toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="small muted">n(I₂) = C·V<sub>E</sub>/2 dans 10 mL ; x = 10 × n(I₂) pour les 100 mL du mélange. x<sub>max</sub> = 2,0 mmol.</p>
    </div>
  )

  const charts = () => (
    <Plot
      title="Avancement x = f(t)"
      xLabel="t (s)"
      yLabel="x (mmol)"
      xMin={0}
      xMax={Math.max(900, ...rows.map((r) => r.t * 1.1))}
      yMin={0}
      yMax={2.2}
      curves={rows.length > 1 ? [{ pts: [[0, 0], ...rows.map((r) => [r.t, xOf(r.ve)])], color: '#3e9bff' }] : []}
      points={rows.map((r) => ({ x: r.t, y: xOf(r.ve), r: 4 }))}
      hlines={[{ v: 2, label: 'xmax', color: '#8a8f98' }, { v: 1, label: 'xmax/2', color: '#e0a000' }]}
    />
  )

  return (
    <TPLayout
      meta={meta}
      cfg={cfg}
      setupLab={setupLab}
      steps={steps}
      tools={tools}
      notebook={notebook}
      charts={charts}
      timeSpeeds
      course={
        <>
          <h2>Le cours en bref</h2>
          <div className="course-grid">
            <section>
              <h3>La réaction étudiée</h3>
              <p className="eq">S₂O₈²⁻ + 2 I⁻ → 2 SO₄²⁻ + I₂</p>
              <p>Réaction lente et totale. Le diiode formé colore la solution en jaune-brun. On suit sa quantité au cours du temps.</p>
            </section>
            <section>
              <h3>Méthode chimique</h3>
              <ul>
                <li>Prélèvement à l’instant t, <b>trempe</b> dans l’eau glacée : dilution et refroidissement bloquent la réaction.</li>
                <li>Dosage par le thiosulfate : I₂ + 2 S₂O₃²⁻ → 2 I⁻ + S₄O₆²⁻. L’empois d’amidon (bleu avec I₂) rend l’équivalence visible.</li>
                <li>n(I₂) = C·V<sub>E</sub>/2, et x(t) = n(I₂) formé dans tout le mélange.</li>
              </ul>
            </section>
            <section>
              <h3>Vitesse et facteurs cinétiques</h3>
              <p className="eq">v = dx/dt (pente de la tangente)</p>
              <p>La vitesse diminue au cours du temps (les réactifs s’épuisent). Elle augmente avec la température, la concentration des réactifs et en présence d’un catalyseur (ions Fe²⁺).</p>
              <p>Temps de demi-réaction t<sub>½</sub> : x(t<sub>½</sub>) = x<sub>max</sub>/2.</p>
            </section>
            <section>
              <h3>À toi de tester</h3>
              <ul>
                <li>Refais le TP avec le bécher dans le bain-marie à 40 °C.</li>
                <li>Ajoute quelques gouttes de Fe²⁺ avant le persulfate : que devient t<sub>½</sub> ?</li>
                <li>Utilise la vitesse ×10 pour ne pas attendre trop longtemps.</li>
              </ul>
            </section>
          </div>
        </>
      }
    />
  )
}
