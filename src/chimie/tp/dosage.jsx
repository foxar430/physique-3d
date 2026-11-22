import { useState } from 'react'
import TPLayout from '../TPLayout.jsx'
import Plot from '../../components/Plot.jsx'
import { say, readPH, buretteReading } from '../lab.js'
import { BURETTE_X, BURETTE_Z } from '../Bench.jsx'

export const meta = {
  id: 'tp-dosage',
  title: 'TP : dosage pH-métrique d’un acide par la soude',
  level: '4e année (Bac) · Chimie',
  sections: 'Maths · Sc. Exp. · Sc. Tech.',
  chapter: 'Réactions acide-base : variation du pH au cours d’un dosage',
}

const CB = 0.1 // mol/L
const VA = 0.02 // L

const ACIDS = {
  HCl: { name: 'acide chlorhydrique', key: 'HCl', ind: 'bbt', indName: 'BBT', strong: true },
  AcOH: { name: 'acide éthanoïque', key: 'AcOH', ind: 'pp', indName: 'phénolphtaléine', strong: false },
}

function makeCfg(acid, Ca) {
  const A = ACIDS[acid]
  return {
    burette: true,
    phmeter: true,
    slots: [
      { id: 'b1', kind: 'bench', x: -3.4, z: 0.55 },
      { id: 'b2', kind: 'bench', x: -2.5, z: 0.55 },
      { id: 'b3', kind: 'bench', x: 1.3, z: 0.6 },
      { id: 'b4', kind: 'bench', x: 2.2, z: 0.6 },
      { id: 'stir', kind: 'stirrer', x: BURETTE_X, z: BURETTE_Z },
    ],
    items: [
      { id: 'acide', kind: 'bottle', label: `${A.name[0].toUpperCase() + A.name.slice(1)} (Ca = ?)`, home: [-3.6, -0.9], reagent: { V: 1, T: 20, n: { [A.key]: Ca } } },
      { id: 'soude', kind: 'bottle', label: 'Soude 0,100 mol/L', home: [-2.9, -0.9], reagent: { V: 1, T: 20, n: { NaOH: CB } } },
      { id: 'eau', kind: 'bottle', label: 'Eau distillée', home: [-2.2, -0.9], reagent: { V: 1, T: 20, n: {} } },
      { id: 'bbt', kind: 'dropper', label: 'BBT', home: [3.3, -0.4], reagent: { V: 0.02, T: 20, n: { BBT: 1 } }, species: 'BBT' },
      { id: 'pp', kind: 'dropper', label: 'Phénolphtaléine', home: [3.7, 0.1], reagent: { V: 0.02, T: 20, n: { PP: 1 } }, species: 'PP' },
      { id: 'pip', kind: 'pipette', label: 'Pipette jaugée 20 mL', cap: VA, home: [3.0, 0.75] },
      { id: 'epr', kind: 'eprouvette', label: 'Éprouvette 30 mL', cap: 0.03, home: [3.7, 0.8] },
      { id: 'becher', kind: 'beaker', label: 'Bécher 150 mL', cap: 0.15, slot: 'b3' },
      { id: 'probe', kind: 'probe', label: 'Sonde pH', home: [2.75, -0.55] },
    ],
  }
}

export default function DosageTP() {
  const [acid, setAcid] = useState('AcOH')
  const [seed, setSeed] = useState(1)
  // concentration inconnue, tirée au hasard pour chaque séance (entre 0,060 et 0,140 mol/L)
  const [Ca] = useState(() => Math.round((0.06 + Math.random() * 0.08) * 1000) / 1000)
  return <Dosage key={acid + seed} acid={acid} Ca={Ca} setAcid={setAcid} restart={() => setSeed((s) => s + 1)} />
}

function Dosage({ acid, Ca, setAcid, restart }) {
  const A = ACIDS[acid]
  const [points, setPoints] = useState([])
  const [answer, setAnswer] = useState({ ve: '', ca: '' })
  const [verdict, setVerdict] = useState(null)
  const VE = (Ca * VA) / CB * 1000 // mL

  const setupLab = (lab) => {
    lab.onEvent = (l, ev) => {
      if (ev.type === 'poured' && ev.from === 'soude' && ev.to === 'becher') say(l, 'La soude doit être versée avec la burette, goutte à goutte : remplis la burette.', 'warn')
      if (ev.type === 'poured' && ev.from === 'acide' && ev.to === 'becher') say(l, 'Pour prélever exactement 20 mL d’acide, utilise la pipette jaugée.', 'warn')
      if (ev.type === 'filled' && ev.what === 'pip' && ev.from === 'acide') say(l, 'Bien : 20,0 mL d’acide prélevés à la pipette jaugée.', 'ok')
      if (ev.type === 'drop' && ev.to === 'becher') {
        const right = ev.species === (A.ind === 'bbt' ? 'BBT' : 'PP')
        say(l, right ? `Indicateur ajouté : ${A.indName}, adapté à ce dosage.` : `Cet indicateur n’est pas le mieux adapté ici : sa zone de virage ne contient pas le pH à l’équivalence.`, right ? 'ok' : 'warn')
      }
    }
    say(lab, 'Commence par remplir la burette avec la soude : prends le flacon et maintiens-le au-dessus de la burette.')
  }

  const steps = (lab) => {
    const b = lab.burette
    const bec = lab.items.becher
    const acidIn = (bec.sol.n[A.key] ?? 0) > 0
    const drops = (bec.sol.n.BBT ?? 0) + (bec.sol.n.PP ?? 0) > 0
    return [
      { text: 'Remplir la burette avec la soude (Cb = 0,100 mol/L).', done: b.filledWith === 'soude' && (b.sol.V > 0.022 || b.zeroed) },
      { text: 'Ajuster le zéro de la burette.', done: b.zeroed },
      { text: 'Prélever 20,0 mL d’acide avec la pipette jaugée.', done: lab.events.some((e) => e.type === 'filled' && e.what === 'pip' && e.from === 'acide') },
      { text: 'Vider la pipette dans le bécher.', done: acidIn && lab.events.some((e) => e.type === 'pipetteEmptied' && e.into === 'becher') },
      { text: 'Ajouter de l’eau distillée (éprouvette) pour que la sonde trempe.', done: bec.sol.V > 0.035 },
      { text: 'Poser le bécher sur l’agitateur, sous la burette, et le mettre en marche.', done: bec.slot === 'stir' && lab.stirring },
      { text: 'Plonger la sonde du pH-mètre dans le bécher.', done: lab.items.probe.inside === 'becher' },
      { text: `Ajouter 2 ou 3 gouttes d’indicateur coloré (${A.indName}).`, done: drops },
      { text: 'Verser la soude mL par mL et noter pH à chaque fois (au moins 12 points).', done: points.length >= 12 },
      { text: 'Dépasser l’équivalence d’au moins 5 mL (saut de pH).', done: points.some((p) => p[0] > VE + 5) },
      { text: 'Déterminer VE et calculer la concentration Ca de l’acide.', done: verdict?.ok },
    ]
  }

  const tools = (lab, refresh) => {
    const p = readPH(lab)
    const vb = lab.burette.zeroed ? buretteReading(lab) : null
    return (
      <>
        <h2>Mesures</h2>
        <p className="formula">
          V<sub>b</sub> versé = <b>{vb == null ? '— (ajuste le zéro)' : vb.toFixed(2) + ' mL'}</b> · pH = <b>{p == null ? '—' : p.toFixed(2)}</b>
        </p>
        <button
          className="switch-btn"
          onClick={() => {
            if (vb == null) return say(lab, 'Ajuste d’abord le zéro de la burette.', 'warn'), refresh()
            if (p == null) return say(lab, 'La sonde du pH-mètre ne trempe pas dans la solution.', 'warn'), refresh()
            setPoints((pts) => [...pts.filter((q) => Math.abs(q[0] - vb) > 0.01), [vb, p]].sort((a, b) => a[0] - b[0]))
          }}
        >
          Noter le point (V<sub>b</sub>, pH)
        </button>
        <h2>Choix de l’acide</h2>
        <div className="speed">
          {Object.entries(ACIDS).map(([k, a]) => (
            <button key={k} className={acid === k ? 'on' : ''} onClick={() => setAcid(k)}>{a.name}</button>
          ))}
        </div>
        <button className="link" onClick={restart}>Recommencer le TP</button>
      </>
    )
  }

  const notebook = () => (
    <div className="notebook">
      <b>Cahier de mesures</b>
      {points.length === 0 ? (
        <p className="small muted">Aucun point noté pour l’instant.</p>
      ) : (
        <table>
          <thead><tr><th>V<sub>b</sub> (mL)</th><th>pH</th></tr></thead>
          <tbody>{points.map(([v, p]) => <tr key={v}><td>{v.toFixed(2)}</td><td>{p.toFixed(2)}</td></tr>)}</tbody>
        </table>
      )}
      <div className="answer">
        <label>V<sub>E</sub> = <input value={answer.ve} onChange={(e) => setAnswer({ ...answer, ve: e.target.value })} placeholder="mL" /></label>
        <label>C<sub>a</sub> = <input value={answer.ca} onChange={(e) => setAnswer({ ...answer, ca: e.target.value })} placeholder="mol/L" /></label>
        <button
          onClick={() => {
            const ve = parseFloat(String(answer.ve).replace(',', '.'))
            const ca = parseFloat(String(answer.ca).replace(',', '.'))
            const okVe = Math.abs(ve - VE) / VE < 0.04
            const okCa = Math.abs(ca - Ca) / Ca < 0.05
            setVerdict({
              ok: okVe && okCa,
              text: okVe && okCa
                ? `Bravo ! VE ≈ ${VE.toFixed(1)} mL et Ca = Cb·VE/Va = ${Ca.toFixed(3)} mol/L.`
                : !okVe
                  ? 'VE n’est pas encore juste : cherche le milieu du saut de pH (méthode des tangentes ou maximum de dpH/dV).'
                  : 'VE est juste, mais vérifie le calcul : à l’équivalence Ca·Va = Cb·VE.',
            })
          }}
        >
          Vérifier
        </button>
      </div>
      {verdict && <p className={'small ' + (verdict.ok ? 'ok-text' : 'warn-text')}>{verdict.text}</p>}
    </div>
  )

  const charts = () => {
    const deriv = points.slice(1).map((q, i) => [(q[0] + points[i][0]) / 2, (q[1] - points[i][1]) / Math.max(q[0] - points[i][0], 1e-3)])
    const dmax = Math.max(1, ...deriv.map((d) => d[1]))
    return (
      <Plot
        title="Courbe de dosage pH = f(Vb) (points notés, dérivée en pointillés)"
        xLabel="Vb (mL)"
        yLabel="pH"
        xMin={0}
        xMax={Math.max(25, ...points.map((p) => p[0] + 1))}
        yMin={0}
        yMax={14}
        curves={[
          { pts: points, color: '#3e9bff' },
          { pts: deriv.map(([v, d]) => [v, (d / dmax) * 13]), color: '#e0a000', dash: '4 4', width: 1.4 },
        ]}
        points={points.map(([x, y]) => ({ x, y, r: 3.5, color: '#3e9bff' }))}
      />
    )
  }

  return (
    <TPLayout
      meta={meta}
      cfg={makeCfg(acid, Ca)}
      setupLab={setupLab}
      steps={steps}
      tools={tools}
      notebook={notebook}
      charts={charts}
      course={
        <>
          <h2>Le cours en bref</h2>
          <div className="course-grid">
            <section>
              <h3>Principe du dosage</h3>
              <p>On verse progressivement une base forte (soude, Cb connue) dans un volume Va d’acide de concentration inconnue Ca. La réaction de dosage est totale :</p>
              <p className="eq">H₃O⁺ + OH⁻ → 2 H₂O    ou    CH₃COOH + OH⁻ → CH₃COO⁻ + H₂O</p>
              <p>À l’équivalence, les réactifs ont été introduits dans les proportions stœchiométriques : <b>Ca·Va = Cb·VE</b>.</p>
            </section>
            <section>
              <h3>Repérer l’équivalence</h3>
              <ul>
                <li>Saut de pH : point d’inflexion de la courbe (méthode des tangentes parallèles).</li>
                <li>Maximum de la dérivée dpH/dV.</li>
                <li>Virage d’un indicateur coloré dont la zone de virage contient pH<sub>E</sub>.</li>
              </ul>
            </section>
            <section>
              <h3>Acide fort ou faible ?</h3>
              <p>Acide fort + base forte : pH<sub>E</sub> = 7 (indicateur : BBT, 6,0–7,6).</p>
              <p>Acide faible + base forte : pH<sub>E</sub> &gt; 7 (indicateur : phénolphtaléine, 8,2–10). À la demi-équivalence, <b>pH = pKa</b> (4,8 pour l’acide éthanoïque).</p>
            </section>
            <section>
              <h3>Bonnes pratiques</h3>
              <ul>
                <li>Rincer la burette avec la soude et la pipette avec l’acide avant usage.</li>
                <li>Verser lentement (goutte à goutte) au voisinage de l’équivalence.</li>
                <li>Agiter en permanence pour homogénéiser.</li>
              </ul>
            </section>
          </div>
        </>
      }
    />
  )
}
