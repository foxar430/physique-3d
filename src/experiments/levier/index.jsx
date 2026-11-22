import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import Plot from '../../components/Plot.jsx'
import { useSimulation, useSampled } from '../../lib/useSimulation.js'
import { Table, steel } from '../../components/three/Lab.jsx'

export const meta = {
  id: 'levier',
  title: 'Moment d’une force : le levier',
  level: '2e année',
  sections: 'Sciences',
  chapter: 'Mécanique : solide mobile autour d’un axe fixe',
}

const G = 9.8
const DEFAULTS = { mode: 'masses', m1: 200, d1: 15, m2: 100, d2: 25, d3: 20 }
const MAX = (12 * Math.PI) / 180

/** moment résultant (N·m) ; positif = sens horaire (côté droit qui descend) */
function moments(p) {
  const M1 = -(p.m1 / 1000) * G * (p.d1 / 100)
  const M2 = p.mode === 'masses' ? (p.m2 / 1000) * G * (p.d2 / 100) : 0
  return { M1, M2, sum: M1 + M2 }
}
export const dynamo = (p) => ((p.m1 / 1000) * G * p.d1) / p.d3 // force verticale à exercer en d3 (N)

const leverModel = {
  maxDt: 1 / 240,
  init: () => ({ t: 0, a: 0, w: 0 }),
  step(s, dt, p) {
    const M = p.mode === 'masses' ? moments(p).sum : 0 // le dynamomètre équilibre toujours
    let w = s.w + (M * 30 - 3 * s.w - 4 * s.a) * dt
    let a = s.a + w * dt
    if (a > MAX) { a = MAX; w = 0 }
    if (a < -MAX) { a = -MAX; w = 0 }
    return { t: s.t + dt, a, w }
  },
}

const K = 0.08 // unités par cm
const PY = 1.6

function Hanger({ x, m, color = '#5b6470', label }) {
  const h = 0.08 + (m / 1000) * 0.6
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.5, 6]} />
        <meshStandardMaterial color="#e9e4d8" />
      </mesh>
      <mesh position={[0, -0.5 - h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, h, 24]} />
        <meshStandardMaterial color={color} metalness={0.75} roughness={0.3} />
      </mesh>
      <Html position={[0, -0.6 - h, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">{label}</span></Html>
    </group>
  )
}

function LeverScene({ sim }) {
  const p = sim.paramsRef.current
  const bar = useRef()
  useFrame(() => {
    bar.current.rotation.z = -sim.stateRef.current.a
  })
  const F = dynamo(p)
  return (
    <group>
      <Table size={[7, 0.16, 3]} position={[0, -0.08, 0]} />
      {/* potence */}
      <RoundedBox args={[1, 0.08, 0.6]} radius={0.03} position={[0, 0.04, -0.3]}>
        <meshStandardMaterial color="#2a2d33" />
      </RoundedBox>
      <mesh position={[0, (PY + 0.1) / 2, -0.3]}>
        <cylinderGeometry args={[0.04, 0.04, PY + 0.1, 12]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <mesh position={[0, PY, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.35, 12]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      {/* barre percée tous les 5 cm, en rotation autour de l'axe */}
      <group ref={bar} position={[0, PY, 0]}>
        <mesh castShadow>
          <boxGeometry args={[60 * K + 0.1, 0.1, 0.05]} />
          <meshStandardMaterial color="#d6dade" metalness={0.7} roughness={0.3} />
        </mesh>
        {Array.from({ length: 13 }, (_, k) => -30 + 5 * k).map((cm) => (
          <group key={cm}>
            <mesh position={[cm * K, 0, 0.027]}>
              <circleGeometry args={[0.018, 12]} />
              <meshBasicMaterial color="#222" />
            </mesh>
            {cm % 10 === 0 && (
              <Html position={[cm * K, 0.13, 0.03]} center zIndexRange={[10, 0]}><span className="lbl tiny">{Math.abs(cm)}</span></Html>
            )}
          </group>
        ))}
        <Hanger x={-p.d1 * K} m={p.m1} color="#c0504d" label={`m1 = ${p.m1} g`} />
        {p.mode === 'masses' ? (
          <Hanger x={p.d2 * K} m={p.m2} color="#4a6fa5" label={`m2 = ${p.m2} g`} />
        ) : (
          <group position={[p.d3 * K, 0, 0]}>
            {/* dynamomètre tiré vers le bas */}
            <mesh position={[0, -0.45, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.6, 16]} />
              <meshPhysicalMaterial color="#e8f4ff" transparent opacity={0.5} />
            </mesh>
            <mesh position={[0, -0.45 + 0.25 - Math.min(0.45, F * 0.12), 0]}>
              <boxGeometry args={[0.07, 0.02, 0.07]} />
              <meshBasicMaterial color="#e5484d" />
            </mesh>
            <mesh position={[0, -0.9, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.3, 6]} />
              <meshStandardMaterial {...steel} />
            </mesh>
            <Html position={[0.35, -0.45, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">F = {F.toFixed(2)} N</span></Html>
          </group>
        )}
      </group>
    </group>
  )
}

export default function LeverExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(leverModel, params)
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const m = moments(params)
  const bal = params.mode === 'dyn' || Math.abs(m.sum) < 1e-4
  const angle = useSampled(sim, (s) => (s.a * 180) / Math.PI)
  const F = dynamo(params)

  const curve = []
  for (let d = 5; d <= 30; d += 0.5) curve.push([d, ((params.m1 / 1000) * G * params.d1) / d])

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={[1]}
      camera={{ position: [0, 1.4, 4.2], target: [0, 1.1, 0] }}
      scene={<LeverScene sim={sim} />}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        <>
          <div className="state charge">{bal ? 'Équilibre : la somme des moments est nulle' : m.sum > 0 ? 'La barre tourne : le côté droit descend' : 'La barre tourne : le côté gauche descend'}</div>
          <div>M(P1) = m1·g·d1 = <b>{(Math.abs(m.M1) * 100).toFixed(1)} N·cm</b> (sens antihoraire)</div>
          {params.mode === 'masses' ? (
            <div>M(P2) = m2·g·d2 = <b>{(m.M2 * 100).toFixed(1)} N·cm</b> (sens horaire)</div>
          ) : (
            <div>M(F) = F·d3 = <b>{(F * params.d3).toFixed(1)} N·cm</b> (sens horaire)</div>
          )}
          <div>Inclinaison de la barre : <b>{angle.toFixed(1)}°</b></div>
        </>
      }
      controls={
        <>
          <div className="speed" role="group" aria-label="Expérience">
            <span>Côté droit</span>
            <button className={params.mode === 'masses' ? 'on' : ''} onClick={() => set('mode')('masses')}>Une masse</button>
            <button className={params.mode === 'dyn' ? 'on' : ''} onClick={() => set('mode')('dyn')}>Un dynamomètre</button>
          </div>
          <Slider label="Masse m1 (à gauche)" value={params.m1} min={50} max={500} step={50} unit="g" onChange={set('m1')} />
          <Slider label="Distance d1 à l’axe" value={params.d1} min={5} max={30} step={5} unit="cm" onChange={set('d1')} />
          {params.mode === 'masses' ? (
            <>
              <Slider label="Masse m2 (à droite)" value={params.m2} min={50} max={500} step={50} unit="g" onChange={set('m2')} />
              <Slider label="Distance d2 à l’axe" value={params.d2} min={5} max={30} step={5} unit="cm" onChange={set('d2')} />
            </>
          ) : (
            <Slider label="Position du dynamomètre d3" value={params.d3} min={5} max={30} step={5} unit="cm" onChange={set('d3')} />
          )}
        </>
      }
      charts={
        <>
          <Plot
            title="Force à exercer pour équilibrer, en fonction de la distance (F·d = constante)"
            xLabel="d (cm)"
            yLabel="F (N)"
            xMin={5}
            xMax={30}
            yMin={0}
            yMax={Math.max(...curve.map((c) => c[1])) * 1.05}
            curves={[{ pts: curve, color: '#e5484d' }]}
            points={params.mode === 'dyn' ? [{ x: params.d3, y: F }] : [{ x: params.d2, y: (params.m2 / 1000) * G, color: '#4a6fa5' }]}
          />
          <Plot
            title="Moments en jeu (N·cm)"
            xLabel=""
            yLabel="M (N·cm)"
            xMin={0}
            xMax={3}
            yMin={0}
            yMax={Math.max(Math.abs(m.M1), m.M2, F * params.d3 / 100) * 120 || 1}
            xTicks={[]}
          >
            {({ x, y }) => {
              const bars = [
                [Math.abs(m.M1) * 100, '#c0504d', 'M(P1)'],
                [params.mode === 'masses' ? m.M2 * 100 : F * params.d3, '#4a6fa5', params.mode === 'masses' ? 'M(P2)' : 'M(F)'],
              ]
              return bars.map(([v, c, l], i) => (
                <g key={i}>
                  <rect x={x(0.6 + i * 1.2)} y={y(v)} width={x(1.4) - x(0.6)} height={y(0) - y(v)} fill={c} opacity="0.85" rx="4" />
                  <text x={x(1 + i * 1.2)} y={y(v) - 6} className="tick" textAnchor="middle">{l} = {v.toFixed(1)}</text>
                </g>
              ))
            }}
          </Plot>
        </>
      }
      course={
        <>
          <h2>Le cours en bref</h2>
          <div className="course-grid">
            <section>
              <h3>Moment d’une force</h3>
              <p>L’effet de rotation d’une force F autour d’un axe Δ dépend de sa valeur et de son bras de levier d (distance de l’axe à la droite d’action) :</p>
              <p className="eq">M<sub>Δ</sub>(F) = ± F·d   (N·m)</p>
              <p>On choisit un sens positif de rotation. Une force dont la droite d’action passe par l’axe a un moment nul.</p>
            </section>
            <section>
              <h3>Théorème des moments</h3>
              <p>Un solide mobile autour d’un axe fixe est en équilibre si la somme algébrique des moments des forces est nulle :</p>
              <p className="eq">Σ M<sub>Δ</sub>(F) = 0   ⇔   m1·g·d1 = m2·g·d2</p>
            </section>
            <section>
              <h3>À toi de tester</h3>
              <ul>
                <li>200 g à 15 cm : où mettre 100 g pour équilibrer ?</li>
                <li>Avec le dynamomètre, divise la distance par deux : que devient F ?</li>
                <li>Pourquoi une poignée de porte est-elle loin des gonds ?</li>
              </ul>
            </section>
          </div>
        </>
      }
    />
  )
}
