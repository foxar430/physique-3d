import { useState } from 'react'
import TPLayout from '../TPLayout.jsx'
import Plot from '../../components/Plot.jsx'
import { say, buretteReading, occupant } from '../lab.js'
import { BURETTE_X, BURETTE_Z } from '../Bench.jsx'

export const meta = {
  id: 'tp-esterification',
  title: 'TP : étude de la réaction d’estérification',
  level: '4e année (Bac) · Chimie',
  sections: 'Maths · Sc. Exp. · Sc. Tech.',
  chapter: 'Équilibre chimique : estérification et hydrolyse',
}

/*
 * CH3COOH + C2H5OH ⇌ CH3COOC2H5 + H2O   (K = 4, lente, catalysée par H2SO4)
 * Mélange équimolaire 0,10 mol + 0,10 mol réparti dans 4 tubes, au bain-marie à 80 °C.
 * À l'instant t : trempe, puis dosage de l'acide restant par la soude (phénolphtaléine).
 * x = n0 − n(acide restant), avec n(acide restant) ≈ Cb·VE.
 */
const CB = 1.0
const RHO_ACIDE = 1.05 / 60 * 1000 // mol/L (acide pur ≈ 17,5 mol/L)
const RHO_ETHANOL = 0.79 / 46 * 1000 // mol/L (éthanol pur ≈ 17,2 mol/L)

const tubeSlots = [0, 1, 2, 3].map((k) => ({ id: 'bm' + k, kind: 'bath', x: 1.6 + (k % 2) * 0.55, z: 0.25 + Math.floor(k / 2) * 0.55, T: 80, r: 0.24, label: k === 0 ? 'bain-marie 80 °C' : '' }))

const cfg = {
  burette: true,
  phmeter: false,
  slots: [
    { id: 'p1', kind: 'bench', x: -3.4, z: 0.6 },
    { id: 'p2', kind: 'bench', x: -2.6, z: 0.75 },
    { id: 't0', kind: 'bench', x: -1.6, z: 0.95 },
    { id: 't1', kind: 'bench', x: -1.2, z: 1.15 },
    { id: 't2', kind: 'bench', x: -0.8, z: 1.25 },
    { id: 't3', kind: 'bench', x: -0.4, z: 1.3 },
    ...tubeSlots,
    { id: 'ice', kind: 'ice', x: 3.0, z: 0.9, r: 0.38 },
    { id: 'stir', kind: 'stirrer', x: BURETTE_X, z: BURETTE_Z },
  ],
  items: [
    { id: 'acide', kind: 'bottle', label: 'Acide éthanoïque pur', home: [-3.7, -0.9], reagent: { V: 1, T: 20, n: { AcOH: RHO_ACIDE } } },
    { id: 'alcool', kind: 'bottle', label: 'Éthanol pur', home: [-3.0, -0.9], reagent: { V: 1, T: 20, n: { EtOH: RHO_ETHANOL } } },
    { id: 'soude', kind: 'bottle', label: 'Soude 1,00 mol/L', home: [-2.3, -0.9], reagent: { V: 1, T: 20, n: { NaOH: CB } } },
    { id: 'h2so4', kind: 'dropper', label: 'H₂SO₄ (catalyseur)', home: [3.5, -0.6], reagent: { V: 0.02, T: 20, n: { H2SO4: 0.04 } }, species: 'H2SO4' },
    { id: 'pp', kind: 'dropper', label: 'Phénolphtaléine', home: [3.9, -0.1], reagent: { V: 0.02, T: 20, n: { PP: 1 } }, species: 'PP' },
    { id: 'eprA', kind: 'eprouvette', label: 'Éprouvette (5,7 mL)', cap: 0.01, target: 0.0057, home: [2.9, -0.6] },
    { id: 'eprE', kind: 'eprouvette', label: 'Éprouvette (5,8 mL)', cap: 0.01, target: 0.0058, home: [2.6, -0.05] },
    { id: 'mix', kind: 'erlen', label: 'Erlen du mélange', cap: 0.05, slot: 'p1' },
    { id: 'dos', kind: 'erlen', label: 'Erlen de dosage', cap: 0.1, slot: 'p2' },
    { id: 'T1', kind: 'tube', label: 'Tube 1', cap: 0.0029, slot: 't0' },
    { id: 'T2', kind: 'tube', label: 'Tube 2', cap: 0.0029, slot: 't1' },
    { id: 'T3', kind: 'tube', label: 'Tube 3', cap: 0.0029, slot: 't2' },
    { id: 'T4', kind: 'tube', label: 'Tube 4', cap: 0.0029, slot: 't3' },
  ],
}

export default function EsterTP() {
  const [seed, setSeed] = useState(1)
  return <Ester key={seed} restart={() => setSeed((s) => s + 1)} />
}

function Ester({ restart }) {
  const [quench, setQuench] = useState({}) // tube → { t, n0 }
  const [rows, setRows] = useState([]) // { tube, t, ve, n0 }
  const [inDos, setInDos] = useState(null) // tube versé dans l'erlen de dosage

  const setupLab = (lab) => {
    lab.onEvent = (l, ev) => {
      if (ev.type === 'bath' && !l.chrono.on) {
        l.chrono.on = true
        l.chrono.t0 = l.t
        say(l, 'Premier tube au bain-marie : le chronomètre démarre.', 'ok')
      }
      if (ev.type === 'quench' && /^T\d/.test(ev.id) && l.chrono.on) {
        const s = l.items[ev.id].sol
        const n0 = (s.n.AcOH ?? 0) + (s.n.Ester ?? 0)
        if (n0 > 0) {
          setQuench((q) => (q[ev.id] ? q : { ...q, [ev.id]: { t: l.t - l.chrono.t0, n0 } }))
          say(l, `${l.items[ev.id].label} trempé à t = ${Math.round((l.t - l.chrono.t0) / 60)} min : la réaction est bloquée.`, 'ok')
        }
      }
      if (ev.type === 'poured' && /^T\d/.test(ev.from) && ev.to === 'dos') setInDos(ev.from)
      if (ev.type === 'poured' && ev.from === 'soude' && ev.to !== 'burette') say(l, 'La soude se verse avec la burette.', 'warn')
      if (ev.type === 'poured' && (ev.from === 'acide' || ev.from === 'alcool')) say(l, 'Mesure les volumes avec les éprouvettes (5,7 mL d’acide et 5,8 mL d’éthanol = 0,10 mol chacun).', 'warn')
    }
    lab.bathT = 80
    say(lab, 'Mesure 5,7 mL d’acide éthanoïque avec l’éprouvette (au-dessus du flacon) et verse-les dans l’erlenmeyer du mélange.')
  }

  const steps = (lab) => {
    const mix = lab.items.mix.sol.n
    const tubes = ['T1', 'T2', 'T3', 'T4'].map((k) => lab.items[k])
    const filled = tubes.filter((t) => t.sol.V > 0.0025).length
    return [
      { text: 'Verser 5,7 mL d’acide éthanoïque (0,10 mol) dans l’erlenmeyer.', done: (mix.AcOH ?? 0) + (mix.Ester ?? 0) > 0.09 || filled > 0 },
      { text: 'Ajouter 5,8 mL d’éthanol (0,10 mol).', done: (mix.EtOH ?? 0) + (mix.Ester ?? 0) > 0.09 || filled > 0 },
      { text: 'Ajouter 3 gouttes d’acide sulfurique (catalyseur).', done: (mix.H2SO4 ?? 0) > 0 || tubes.some((t) => (t.sol.n.H2SO4 ?? 0) > 0) },
      { text: 'Répartir le mélange dans les 4 tubes.', done: filled === 4 },
      { text: 'Placer les tubes dans le bain-marie à 80 °C (chronomètre).', done: lab.chrono.on },
      { text: 'Remplir la burette de soude 1,00 mol/L et ajuster le zéro.', done: lab.burette.filledWith === 'soude' && lab.burette.zeroed },
      { text: 'À un instant t, sortir un tube et le tremper dans l’eau glacée.', done: Object.keys(quench).length > 0 },
      { text: 'Verser ce tube dans l’erlen de dosage (sous la burette), ajouter de la phénolphtaléine, doser jusqu’au rose.', done: rows.length > 0 },
      { text: 'Doser au moins 3 tubes, à des instants différents. Calculer x et K.', done: rows.length >= 3 },
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
          {inDos && quench[inDos] && <> · contient le {lab.items[inDos].label} (t = {Math.round(quench[inDos].t / 60)} min)</>}
          <br />V<sub>soude</sub> versé = <b>{ve == null ? '— (ajuste le zéro)' : ve.toFixed(2) + ' mL'}</b>
        </p>
        <button
          className="switch-btn"
          onClick={() => {
            if (!inDos || !quench[inDos]) return say(lab, 'Verse d’abord un tube trempé dans l’erlen de dosage.', 'warn'), refresh()
            if (!under || under.id !== 'dos') return say(lab, 'Place l’erlen de dosage sous la burette.', 'warn'), refresh()
            if (ve == null) return say(lab, 'Ajuste d’abord le zéro de la burette.', 'warn'), refresh()
            setRows((r) => [...r.filter((x) => x.tube !== inDos), { tube: inDos, t: quench[inDos].t, ve, n0: quench[inDos].n0 }].sort((a, b) => a.t - b.t))
            say(lab, `Équivalence notée : VE = ${ve.toFixed(2)} mL. Vide l’erlen de dosage et réajuste le zéro avant le tube suivant.`, 'ok')
            refresh()
          }}
        >
          Noter V<sub>E</sub> (virage au rose)
        </button>
        <button
          className="link"
          onClick={() => {
            lab.items.dos.sol = { V: 0, T: 20, n: {} }
            setInDos(null)
            refresh()
          }}
        >
          Vider et rincer l’erlen de dosage
        </button>
        <button className="link" onClick={restart}>Recommencer le TP</button>
      </>
    )
  }

  const calc = (r) => {
    const nAc = (CB * r.ve) / 1000
    const x = Math.max(0, r.n0 - nAc)
    return { nAc, x, ratio: x / r.n0 }
  }

  const notebook = () => (
    <div className="notebook">
      <b>Cahier de mesures</b>
      {rows.length === 0 ? (
        <p className="small muted">Aucun tube dosé.</p>
      ) : (
        <table>
          <thead><tr><th>Tube</th><th>t (min)</th><th>V<sub>E</sub> (mL)</th><th>n acide (mmol)</th><th>x (mmol)</th><th>x/n₀</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const c = calc(r)
              return (
                <tr key={r.tube}>
                  <td>{r.tube}</td>
                  <td>{(r.t / 60).toFixed(1)}</td>
                  <td>{r.ve.toFixed(2)}</td>
                  <td>{(c.nAc * 1000).toFixed(2)}</td>
                  <td>{(c.x * 1000).toFixed(2)}</td>
                  <td>{c.ratio.toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <p className="small muted">n(acide restant) = C<sub>b</sub>·V<sub>E</sub> (l’acide sulfurique, en très petite quantité, est négligé). À l’équilibre, x/n₀ → 2/3 et K = x²/(n₀ − x)² = 4.</p>
    </div>
  )

  const charts = () => (
    <Plot
      title="Taux d’avancement x/n₀ en fonction du temps"
      xLabel="t (min)"
      yLabel="x / n₀"
      xMin={0}
      xMax={Math.max(60, ...rows.map((r) => (r.t / 60) * 1.1))}
      yMin={0}
      yMax={1}
      curves={rows.length > 1 ? [{ pts: [[0, 0], ...rows.map((r) => [r.t / 60, calc(r).ratio])], color: '#3e9bff' }] : []}
      points={rows.map((r) => ({ x: r.t / 60, y: calc(r).ratio, r: 4 }))}
      hlines={[{ v: 2 / 3, label: '2/3 (équilibre)', color: '#e0a000' }]}
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
              <h3>Estérification et hydrolyse</h3>
              <p className="eq">CH₃COOH + C₂H₅OH ⇌ CH₃COOC₂H₅ + H₂O</p>
              <p>Les deux réactions inverses (estérification, hydrolyse de l’ester) sont lentes et limitées. Elles conduisent à un <b>équilibre dynamique</b>.</p>
            </section>
            <section>
              <h3>Loi d’action de masse</h3>
              <p className="eq">K = [ester]·[eau] / ([acide]·[alcool]) = 4</p>
              <p>Pour un mélange équimolaire d’un acide et d’un alcool primaire, le taux d’avancement final vaut 2/3 (67 %).</p>
            </section>
            <section>
              <h3>Facteurs cinétiques</h3>
              <p>Le chauffage (bain-marie) et l’acide sulfurique (catalyseur) accélèrent l’atteinte de l’équilibre, sans changer sa composition.</p>
              <p>La trempe dans l’eau glacée bloque la réaction avant le dosage.</p>
            </section>
            <section>
              <h3>À toi de tester</h3>
              <ul>
                <li>Dose un tube après 5 min, 15 min, 30 min et 50 min (utilise la vitesse ×60).</li>
                <li>Oublie l’acide sulfurique : que devient l’évolution ?</li>
                <li>Calcule K à partir de ton dernier tube.</li>
              </ul>
            </section>
          </div>
        </>
      }
    />
  )
}
