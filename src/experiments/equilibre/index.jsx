import { useMemo, useState } from 'react'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import Plot from '../../components/Plot.jsx'
import { useSimulation } from '../../lib/useSimulation.js'
import { clockModel } from '../../lib/color.js'
import { Table, steel } from '../../components/three/Lab.jsx'

export const meta = {
  id: 'equilibre',
  title: 'Équilibre d’un solide soumis à trois forces : la table à forces',
  level: '2e année',
  sections: 'Sciences',
  chapter: 'Mécanique : équilibre d’un solide',
}

const G = 9.8
const DEFAULTS = { m1: 200, m2: 150, m3: 250 }
const COLORS = ['#e5484d', '#3e9bff', '#30a46c']

/**
 * Trois fils tendus par des masses passent sur des poulies et tirent un anneau léger.
 * À l'équilibre : F1 + F2 + F3 = 0 (le triangle des forces se ferme), donc les angles sont imposés :
 *   cos(θ12) = (F3² − F1² − F2²) / (2·F1·F2) …
 */
function solve(p) {
  const [F1, F2, F3] = [p.m1, p.m2, p.m3].map((m) => (m / 1000) * G)
  const ok = F1 < F2 + F3 && F2 < F1 + F3 && F3 < F1 + F2
  if (!ok) return { ok, F: [F1, F2, F3] }
  const a2 = Math.acos((F3 * F3 - F1 * F1 - F2 * F2) / (2 * F1 * F2)) // angle entre F1 et F2
  const a3 = Math.acos((F2 * F2 - F1 * F1 - F3 * F3) / (2 * F1 * F3)) // angle entre F1 et F3
  return { ok, F: [F1, F2, F3], ang: [0, a2, -a3] }
}

function ForceTable({ p }) {
  const s = solve(p)
  const R = 1.6
  const TY = 0.9
  const angles = s.ok ? s.ang : [0, (2 * Math.PI) / 3, (-2 * Math.PI) / 3]
  const ms = [p.m1, p.m2, p.m3]
  // anneau : centré à l'équilibre, sinon entraîné vers la plus grande force
  const ring = useMemo(() => {
    if (s.ok) return new THREE.Vector3(0, TY + 0.06, 0)
    const k = s.F.indexOf(Math.max(...s.F))
    return new THREE.Vector3(Math.cos(angles[k]) * R * 0.75, TY + 0.06, -Math.sin(angles[k]) * R * 0.75)
  }, [p.m1, p.m2, p.m3]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group>
      <Table size={[7, 0.16, 5]} position={[0, -0.08, 0]} />
      {/* table circulaire graduée */}
      <mesh position={[0, TY, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[R, R, 0.06, 96]} />
        <meshStandardMaterial color="#e9e4d8" roughness={0.7} />
      </mesh>
      {Array.from({ length: 36 }, (_, k) => (
        <mesh key={k} position={[Math.cos((k * Math.PI) / 18) * (R - 0.08), TY + 0.032, -Math.sin((k * Math.PI) / 18) * (R - 0.08)]} rotation={[0, (k * Math.PI) / 18, 0]}>
          <boxGeometry args={[k % 3 === 0 ? 0.14 : 0.07, 0.004, 0.01]} />
          <meshBasicMaterial color="#333" />
        </mesh>
      ))}
      <mesh position={[0, TY / 2, 0]}>
        <cylinderGeometry args={[0.06, 0.06, TY, 12]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      {/* pion central (enlevé : l'anneau est libre) */}
      <mesh position={ring}>
        <torusGeometry args={[0.08, 0.018, 10, 32]} />
        <meshStandardMaterial color="#d4a54a" metalness={0.9} roughness={0.25} />
      </mesh>
      {angles.map((a, i) => {
        const dir = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a))
        const pul = dir.clone().multiplyScalar(R + 0.12).setY(TY + 0.06)
        const hang = (ms[i] / 1000) * 1.2 + 0.15
        const mid = ring.clone().add(pul).multiplyScalar(0.5)
        const len = ring.distanceTo(pul)
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), pul.clone().sub(ring).normalize())
        const yM = TY - 0.25 - hang
        return (
          <group key={i}>
            <mesh position={mid} quaternion={q}>
              <boxGeometry args={[len, 0.008, 0.008]} />
              <meshBasicMaterial color={COLORS[i]} />
            </mesh>
            <group position={pul}>
              <mesh rotation={[0, a, Math.PI / 2]}>
                <cylinderGeometry args={[0.1, 0.1, 0.04, 24]} />
                <meshStandardMaterial color="#cfd3d8" metalness={0.8} roughness={0.3} />
              </mesh>
            </group>
            <mesh position={[pul.x + dir.x * 0.1, (TY + yM) / 2, pul.z + dir.z * 0.1]}>
              <cylinderGeometry args={[0.005, 0.005, TY - yM, 6]} />
              <meshBasicMaterial color={COLORS[i]} />
            </mesh>
            <mesh position={[pul.x + dir.x * 0.1, yM, pul.z + dir.z * 0.1]} castShadow>
              <cylinderGeometry args={[0.09, 0.09, 0.08 + (ms[i] / 1000) * 0.5, 24]} />
              <meshStandardMaterial color="#5b6470" metalness={0.7} roughness={0.35} />
            </mesh>
            <Html position={[pul.x + dir.x * 0.4, yM, pul.z + dir.z * 0.4]} center zIndexRange={[10, 0]}>
              <span className="lbl tiny" style={{ color: COLORS[i] }}>m{i + 1} = {ms[i]} g</span>
            </Html>
          </group>
        )
      })}
    </group>
  )
}

export default function EquilibriumExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(clockModel, params)
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const s = solve(params)
  const deg = (r) => ((r * 180) / Math.PI).toFixed(1)

  // polygone des forces (mis bout à bout)
  const poly = []
  if (s.ok) {
    let x = 0, y = 0
    poly.push([x, y])
    s.F.forEach((F, i) => {
      x += F * Math.cos(s.ang[i])
      y += F * Math.sin(s.ang[i])
      poly.push([x, y])
    })
  }
  const lim = Math.max(...s.F) * 1.8

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={[1]}
      camera={{ position: [0, 3.6, 3.6], target: [0, 0.6, 0] }}
      scene={<ForceTable p={params} />}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        <>
          <div className="state charge">{s.ok ? 'Équilibre : F1 + F2 + F3 = 0' : 'Pas d’équilibre possible : une force est plus grande que la somme des deux autres'}</div>
          <div>F1 = <b>{s.F[0].toFixed(2)} N</b> · F2 = <b>{s.F[1].toFixed(2)} N</b> · F3 = <b>{s.F[2].toFixed(2)} N</b></div>
          {s.ok && <div>Angle (F1, F2) = <b>{deg(s.ang[1])}°</b> · angle (F1, F3) = <b>{deg(-s.ang[2])}°</b></div>}
          {s.ok && <div className="small">Les trois fils sont dans le même plan et leurs directions passent par le même point (le centre de l’anneau).</div>}
        </>
      }
      controls={
        <>
          <Slider label="Masse m1" value={params.m1} min={50} max={500} step={10} unit="g" onChange={set('m1')} />
          <Slider label="Masse m2" value={params.m2} min={50} max={500} step={10} unit="g" onChange={set('m2')} />
          <Slider label="Masse m3" value={params.m3} min={50} max={500} step={10} unit="g" onChange={set('m3')} />
          <p className="formula">Chaque fil transmet le poids de sa masse : F = m·g (g = 9,8 N/kg).</p>
        </>
      }
      charts={
        <>
          <Plot title="Le polygone des forces se ferme (somme nulle)" xLabel="x (N)" yLabel="y (N)" xMin={-lim} xMax={lim} yMin={-lim * 0.6} yMax={lim * 0.6}>
            {({ x, y }) =>
              s.ok ? (
                <g>
                  {s.F.map((_, i) => (
                    <line key={i} x1={x(poly[i][0])} y1={y(poly[i][1])} x2={x(poly[i + 1][0])} y2={y(poly[i + 1][1])} stroke={COLORS[i]}  strokeWidth="3" />
                  ))}
                </g>
              ) : null
            }
          </Plot>
          <Plot
            title="Angles d’équilibre en fonction de m3 (m1, m2 fixées)"
            xLabel="m3 (g)"
            yLabel="angle (°)"
            xMin={50}
            xMax={500}
            yMin={0}
            yMax={180}
            curves={[
              { pts: Array.from({ length: 91 }, (_, k) => { const m3 = 50 + 5 * k; const q = solve({ ...params, m3 }); return [m3, q.ok ? (q.ang[1] * 180) / Math.PI : NaN] }).filter((v) => !isNaN(v[1])), color: COLORS[1] },
              { pts: Array.from({ length: 91 }, (_, k) => { const m3 = 50 + 5 * k; const q = solve({ ...params, m3 }); return [m3, q.ok ? (-q.ang[2] * 180) / Math.PI : NaN] }).filter((v) => !isNaN(v[1])), color: COLORS[2] },
            ]}
            points={s.ok ? [{ x: params.m3, y: (s.ang[1] * 180) / Math.PI, color: COLORS[1] }, { x: params.m3, y: (-s.ang[2] * 180) / Math.PI, color: COLORS[2] }] : []}
          />
        </>
      }
      course={
        <>
          <h2>Le cours en bref</h2>
          <div className="course-grid">
            <section>
              <h3>Conditions d’équilibre</h3>
              <p>Un solide soumis à trois forces non parallèles est en équilibre si :</p>
              <ul>
                <li>les trois forces sont dans un même plan et leurs droites d’action sont concourantes ;</li>
                <li>leur somme vectorielle est nulle : F1 + F2 + F3 = 0.</li>
              </ul>
            </section>
            <section>
              <h3>Méthode graphique</h3>
              <p>On met les vecteurs bout à bout : à l’équilibre, ils forment un triangle fermé. On peut aussi projeter la relation sur deux axes.</p>
            </section>
            <section>
              <h3>À toi de tester</h3>
              <ul>
                <li>Prends m1 = m2 = m3 : quels angles obtiens-tu ?</li>
                <li>Prends m3 = m1 + m2 : que se passe-t-il ?</li>
                <li>Vérifie avec le théorème de Pythagore le cas m1 = 300 g, m2 = 400 g, m3 = 500 g.</li>
              </ul>
            </section>
          </div>
        </>
      }
    />
  )
}
