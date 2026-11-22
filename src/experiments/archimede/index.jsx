import { useState } from 'react'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import Plot from '../../components/Plot.jsx'
import { useSimulation } from '../../lib/useSimulation.js'
import { clockModel } from '../../lib/color.js'
import { Table, steel } from '../../components/three/Lab.jsx'

export const meta = {
  id: 'archimede',
  title: 'Fluides : pression, poussée d’Archimède, Torricelli',
  level: '2e année',
  sections: 'Sciences',
  chapter: 'Fluides : pression, poussée d’Archimède, pression atmosphérique',
}

const G = 9.8
const LIQ = {
  eau: { name: 'Eau', rho: 1000, color: '#4aa3d8' },
  salee: { name: 'Eau salée', rho: 1100, color: '#5fb6c9' },
  huile: { name: 'Huile', rho: 920, color: '#d8b44a' },
  alcool: { name: 'Alcool', rho: 800, color: '#b9d9ef' },
}
const DEFAULTS = { mode: 'archimede', liq: 'eau', V: 100, m: 270, imm: 60, h: 10, patm: 1013 }

/* ---------- Archimède ---------- */
function archi(p) {
  const rho = LIQ[p.liq].rho
  const P = (p.m / 1000) * G
  const Vimm = (p.V * p.imm) / 100 // cm³
  const Pa = rho * Vimm * 1e-6 * G
  return { P, Pa, F: Math.max(0, P - Pa), rho, Vimm }
}

function Beaker({ x = 0, R = 0.55, H = 1.1, level = 0.75, color }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, H / 2, 0]}>
        <cylinderGeometry args={[R, R, H, 48, 1, true]} />
        <meshPhysicalMaterial color="#e8f4ff" transparent opacity={0.18} roughness={0.03} clearcoat={1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[R, R, 0.02, 48]} />
        <meshPhysicalMaterial color="#e8f4ff" transparent opacity={0.3} />
      </mesh>
      <mesh position={[0, (level * H) / 2 + 0.01, 0]}>
        <cylinderGeometry args={[R - 0.015, R - 0.015, level * H, 48]} />
        <meshPhysicalMaterial color={color} transparent opacity={0.45} roughness={0.1} depthWrite={false} />
      </mesh>
      {Array.from({ length: 6 }, (_, k) => (
        <mesh key={k} position={[0, 0.15 + k * 0.15, R + 0.001]}>
          <boxGeometry args={[0.12, 0.006, 0.002]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  )
}

function ArchimedeScene({ p }) {
  const a = archi(p)
  const H = 1.1
  const level = 0.6
  const surface = level * H
  const hCyl = 0.6 // hauteur dessinée du solide
  const rCyl = 0.18
  // bas du solide : immergé sur imm % de sa hauteur
  const bottom = surface - (p.imm / 100) * hCyl
  const top = bottom + hCyl
  const stretch = a.F * 0.12 // allongement du ressort du dynamomètre
  return (
    <group>
      <Table size={[6, 0.16, 3]} position={[0, -0.08, 0]} />
      <Beaker R={0.5} H={H} level={level + ((p.imm / 100) * hCyl * rCyl * rCyl) / (0.5 * 0.5) / H} color={LIQ[p.liq].color} />
      {/* potence */}
      <RoundedBox args={[0.6, 0.06, 0.5]} radius={0.02} position={[-1.2, 0.03, 0]}>
        <meshStandardMaterial color="#2a2d33" />
      </RoundedBox>
      <mesh position={[-1.2, 1.4, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 2.8, 12]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <mesh position={[-0.6, 2.75, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 1.2, 12]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      {/* dynamomètre */}
      <group position={[0, 2.7, 0]}>
        <mesh position={[0, -0.35, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.7, 20]} />
          <meshPhysicalMaterial color="#e8f4ff" transparent opacity={0.4} />
        </mesh>
        <mesh position={[0, -0.12 - stretch, 0]}>
          <boxGeometry args={[0.1, 0.02, 0.1]} />
          <meshBasicMaterial color="#e5484d" />
        </mesh>
        <Html position={[0.45, -0.35, 0]} center zIndexRange={[10, 0]}>
          <div className="vm-screen"><small>dynamomètre</small><b>{a.F.toFixed(2)} N</b></div>
        </Html>
      </group>
      {/* fil + solide */}
      <mesh position={[0, (2.0 + top) / 2, 0]}>
        <cylinderGeometry args={[0.006, 0.006, Math.max(2.0 - top, 0.01), 6]} />
        <meshStandardMaterial color="#e9e4d8" />
      </mesh>
      <mesh position={[0, bottom + hCyl / 2, 0]} castShadow>
        <cylinderGeometry args={[rCyl, rCyl, hCyl, 32]} />
        <meshStandardMaterial color="#b8bec7" metalness={0.85} roughness={0.3} />
      </mesh>
      <Html position={[0.7, surface + 0.1, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">{LIQ[p.liq].name} (ρ = {a.rho} kg/m³)</span></Html>
    </group>
  )
}

/* ---------- pression dans un liquide ---------- */
function PressureScene({ p }) {
  const rho = LIQ[p.liq].rho
  const K = 0.05 // unités par cm
  const dh = (rho * G * (p.h / 100)) / (1000 * G) * 100 // dénivellation du manomètre à eau (cm)
  const tankH = 1.5
  const capY = tankH * 0.9 - p.h * K
  return (
    <group>
      <Table size={[6, 0.16, 3]} position={[0, -0.08, 0]} />
      <mesh position={[0, tankH / 2, 0]}>
        <boxGeometry args={[1.2, tankH, 0.9]} />
        <meshPhysicalMaterial color="#e8f4ff" transparent opacity={0.15} roughness={0.03} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, (tankH * 0.9) / 2, 0]}>
        <boxGeometry args={[1.18, tankH * 0.9, 0.88]} />
        <meshPhysicalMaterial color={LIQ[p.liq].color} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      {/* capsule manométrique */}
      <mesh position={[0, capY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.04, 24]} />
        <meshStandardMaterial color="#2a2d33" />
      </mesh>
      <mesh position={[0, (capY + tankH + 0.2) / 2, 0]}>
        <cylinderGeometry args={[0.012, 0.012, tankH + 0.2 - capY, 8]} />
        <meshStandardMaterial color="#b0b0b0" />
      </mesh>
      {/* tube en U */}
      <group position={[1.6, 0, 0]}>
        <mesh position={[0, 0.9, -0.05]}>
          <boxGeometry args={[0.7, 1.6, 0.04]} />
          <meshStandardMaterial color="#f3eee0" />
        </mesh>
        {[-0.2, 0.2].map((x, i) => {
          const lv = 0.9 + (i ? 1 : -1) * dh * K * 0.5
          return (
            <group key={x}>
              <mesh position={[x, 0.95, 0.03]}>
                <cylinderGeometry args={[0.035, 0.035, 1.3, 16, 1, true]} />
                <meshPhysicalMaterial color="#e8f4ff" transparent opacity={0.3} side={THREE.DoubleSide} />
              </mesh>
              <mesh position={[x, (lv + 0.3) / 2, 0.03]}>
                <cylinderGeometry args={[0.03, 0.03, lv - 0.3, 16]} />
                <meshStandardMaterial color="#e5484d" transparent opacity={0.8} />
              </mesh>
            </group>
          )
        })}
        <mesh position={[0, 0.3, 0.03]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 0.4, 12]} />
          <meshStandardMaterial color="#e5484d" />
        </mesh>
        <Html position={[0, 1.85, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">Manomètre : Δh = {dh.toFixed(1)} cm d’eau</span></Html>
      </group>
      <mesh position={[0.8, tankH + 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 1.6, 8]} />
        <meshStandardMaterial color="#b0b0b0" />
      </mesh>
      <Html position={[-0.9, capY, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">h = {p.h} cm</span></Html>
    </group>
  )
}

/* ---------- Torricelli ---------- */
const RHO_HG = 13600
function TorricelliScene({ p }) {
  const h = (p.patm * 100) / (RHO_HG * G) // m
  const K = 1.6 // unités par mètre
  return (
    <group>
      <Table size={[6, 0.16, 3]} position={[0, -0.08, 0]} />
      {/* cuve de mercure */}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.45, 0.4, 0.24, 40]} />
        <meshPhysicalMaterial color="#e8f4ff" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.43, 0.39, 0.16, 40]} />
        <meshStandardMaterial color="#d6dbe2" metalness={1} roughness={0.08} />
      </mesh>
      {/* tube de 1 m retourné */}
      <mesh position={[0, 0.05 + (1 * K) / 2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1 * K, 24, 1, true]} />
        <meshPhysicalMaterial color="#e8f4ff" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.17 + (h * K) / 2 - 0.06, 0]}>
        <cylinderGeometry args={[0.045, 0.045, h * K, 24]} />
        <meshStandardMaterial color="#d6dbe2" metalness={1} roughness={0.08} />
      </mesh>
      <Html position={[0.25, 0.17 + h * K + 0.1, 0]} center zIndexRange={[10, 0]}><span className="lbl tiny">vide</span></Html>
      {/* règle */}
      <mesh position={[0.3, 0.17 + 0.5 * K - 0.06, -0.02]}>
        <boxGeometry args={[0.1, 1 * K, 0.01]} />
        <meshStandardMaterial color="#f3eee0" />
      </mesh>
      {Array.from({ length: 11 }, (_, k) => (
        <mesh key={k} position={[0.27, 0.11 + k * 0.1 * K, -0.01]}>
          <boxGeometry args={[0.05, 0.006, 0.004]} />
          <meshBasicMaterial color="#222" />
        </mesh>
      ))}
      <Html position={[0.7, 0.17 + h * K - 0.06, 0]} center zIndexRange={[10, 0]}><span className="lbl">h = {(h * 100).toFixed(1)} cm de mercure</span></Html>
    </group>
  )
}

export default function FluidsExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(clockModel, params)
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const mode = params.mode
  const a = archi(params)
  const rho = LIQ[params.liq].rho
  const p0 = 101300
  const hHg = (params.patm * 100) / (RHO_HG * G)

  let readouts, controls, charts, scene, camera
  if (mode === 'archimede') {
    scene = <ArchimedeScene p={params} />
    camera = { position: [0.4, 1.9, 3.6], target: [0, 1.2, 0] }
    readouts = (
      <>
        <div className="state charge">{a.Pa >= a.P ? 'Le solide flotterait : la poussée compense le poids' : 'Poids apparent = P − Pa'}</div>
        <div>Poids P = m·g = <b>{a.P.toFixed(3)} N</b></div>
        <div>Poussée Pa = ρ·V<sub>imm</sub>·g = <b>{a.Pa.toFixed(3)} N</b> (V<sub>imm</sub> = {a.Vimm.toFixed(0)} cm³)</div>
        <div>Indication du dynamomètre : <b>{a.F.toFixed(3)} N</b></div>
      </>
    )
    controls = (
      <>
        <Slider label="Partie immergée" value={params.imm} min={0} max={100} step={5} unit="%" onChange={set('imm')} />
        <Slider label="Volume du solide V" value={params.V} min={20} max={200} step={10} unit="cm³" onChange={set('V')} />
        <Slider label="Masse du solide m" value={params.m} min={20} max={800} step={10} unit="g" onChange={set('m')} />
        <p className="formula">Masse volumique du solide : {((params.m / params.V) * 1000).toFixed(0)} kg/m³ ({params.m / params.V > 2.6 ? 'métal dense' : 'aluminium ≈ 2 700'})</p>
      </>
    )
    charts = (
      <>
        <Plot title="Poussée Pa en fonction du volume immergé (droite de pente ρ·g)" xLabel="V immergé (cm³)" yLabel="Pa (N)" xMin={0} xMax={200} yMin={0} yMax={2.3} curves={Object.values(LIQ).map((l) => ({ pts: [[0, 0], [200, l.rho * 200e-6 * G]], color: l.color, width: l.rho === rho ? 2.6 : 1.2, dash: l.rho === rho ? undefined : '4 4' }))} points={[{ x: a.Vimm, y: a.Pa }]} />
        <Plot title="Indication du dynamomètre en fonction de l’immersion" xLabel="immersion (%)" yLabel="F (N)" xMin={0} xMax={100} yMin={0} yMax={a.P * 1.1 || 1} curves={[{ pts: Array.from({ length: 21 }, (_, k) => [k * 5, archi({ ...params, imm: k * 5 }).F]), color: '#e5484d' }]} points={[{ x: params.imm, y: a.F }]} />
      </>
    )
  } else if (mode === 'pression') {
    scene = <PressureScene p={params} />
    camera = { position: [0.6, 1.6, 3.8], target: [0.6, 0.9, 0] }
    const dp = rho * G * (params.h / 100)
    readouts = (
      <>
        <div className="state charge">Loi fondamentale de l’hydrostatique</div>
        <div>p<sub>B</sub> − p<sub>A</sub> = ρ·g·h = <b>{dp.toFixed(0)} Pa</b></div>
        <div>Pression absolue à la profondeur h : <b>{((p0 + dp) / 100).toFixed(1)} hPa</b></div>
      </>
    )
    controls = <Slider label="Profondeur de la capsule h" value={params.h} min={0} max={25} step={1} unit="cm" onChange={set('h')} />
    charts = (
      <>
        <Plot title="Pression relative en fonction de la profondeur" xLabel="h (cm)" yLabel="Δp (Pa)" xMin={0} xMax={25} yMin={0} yMax={2800} curves={Object.values(LIQ).map((l) => ({ pts: [[0, 0], [25, l.rho * G * 0.25]], color: l.color, width: l.rho === rho ? 2.6 : 1.2, dash: l.rho === rho ? undefined : '4 4' }))} points={[{ x: params.h, y: dp }]} />
        <Plot title="Pression absolue p = p₀ + ρgh" xLabel="h (cm)" yLabel="p (hPa)" xMin={0} xMax={25} yMin={1010} yMax={1043} curves={[{ pts: [[0, 1013], [25, 1013 + (rho * G * 0.25) / 100]], color: LIQ[params.liq].color }]} points={[{ x: params.h, y: (p0 + dp) / 100 }]} />
      </>
    )
  } else {
    scene = <TorricelliScene p={params} />
    camera = { position: [0.5, 1.2, 3.0], target: [0.2, 0.9, 0] }
    readouts = (
      <>
        <div className="state charge">Expérience de Torricelli</div>
        <div>p<sub>atm</sub> = ρ<sub>Hg</sub>·g·h → h = <b>{(hHg * 100).toFixed(1)} cm</b></div>
        <div className="small">Au niveau de la mer (1013 hPa) : 76 cm de mercure, ou ≈ 10,3 m d’eau.</div>
      </>
    )
    controls = (
      <>
        <Slider label="Pression atmosphérique" value={params.patm} min={600} max={1050} step={1} unit="hPa" onChange={set('patm')} />
        <p className="formula">Altitude approximative : {Math.max(0, (8000 * Math.log(1013 / params.patm))).toFixed(0)} m</p>
      </>
    )
    charts = (
      <>
        <Plot title="Hauteur de mercure en fonction de la pression" xLabel="p (hPa)" yLabel="h (cm)" xMin={600} xMax={1050} yMin={40} yMax={80} curves={[{ pts: [[600, (60000 / (RHO_HG * G)) * 100], [1050, (105000 / (RHO_HG * G)) * 100]], color: '#9aa2ab' }]} points={[{ x: params.patm, y: hHg * 100 }]} />
        <Plot title="Pression en fonction de l’altitude (modèle simple)" xLabel="altitude (m)" yLabel="p (hPa)" xMin={0} xMax={4000} yMin={600} yMax={1050} curves={[{ pts: Array.from({ length: 41 }, (_, k) => [k * 100, 1013 * Math.exp(-(k * 100) / 8000)]), color: '#3e9bff' }]} points={[{ x: Math.max(0, 8000 * Math.log(1013 / params.patm)), y: params.patm }]} />
      </>
    )
  }

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={[1]}
      camera={camera}
      scene={scene}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={readouts}
      controls={
        <>
          <div className="speed" role="group" aria-label="Expérience">
            <span>Expérience</span>
            <button className={mode === 'archimede' ? 'on' : ''} onClick={() => set('mode')('archimede')}>Poussée d’Archimède</button>
            <button className={mode === 'pression' ? 'on' : ''} onClick={() => set('mode')('pression')}>Pression dans un liquide</button>
            <button className={mode === 'torricelli' ? 'on' : ''} onClick={() => set('mode')('torricelli')}>Torricelli</button>
          </div>
          {mode !== 'torricelli' && (
            <div className="speed" role="group" aria-label="Liquide">
              <span>Liquide</span>
              {Object.entries(LIQ).map(([k, l]) => (
                <button key={k} className={params.liq === k ? 'on' : ''} onClick={() => set('liq')(k)}>{l.name}</button>
              ))}
            </div>
          )}
          {controls}
        </>
      }
      charts={charts}
      course={
        <>
          <h2>Le cours en bref</h2>
          <div className="course-grid">
            <section>
              <h3>Pression</h3>
              <p className="eq">p = F / S   (Pa)    1 bar = 10⁵ Pa</p>
              <p>Dans un liquide au repos, la différence de pression entre deux points ne dépend que de leur dénivellation :</p>
              <p className="eq">p<sub>B</sub> − p<sub>A</sub> = ρ·g·h</p>
            </section>
            <section>
              <h3>Poussée d’Archimède</h3>
              <p>Tout corps immergé dans un fluide subit une force verticale, dirigée vers le haut, égale au poids du fluide déplacé :</p>
              <p className="eq">Pa = ρ<sub>fluide</sub>·V<sub>immergé</sub>·g</p>
              <p>Un corps flotte si sa masse volumique est inférieure à celle du liquide.</p>
            </section>
            <section>
              <h3>Pression atmosphérique</h3>
              <p>Torricelli : l’atmosphère équilibre une colonne de mercure de 76 cm. p<sub>atm</sub> = ρ<sub>Hg</sub>·g·h ≈ 1,013·10⁵ Pa. Elle diminue avec l’altitude.</p>
            </section>
            <section>
              <h3>À toi de tester</h3>
              <ul>
                <li>Immerge complètement le solide dans l’eau puis dans l’eau salée : que change-t-il ?</li>
                <li>La poussée dépend-elle de la masse du solide ?</li>
                <li>À quelle profondeur la pression augmente-t-elle de 10 % ?</li>
              </ul>
            </section>
          </div>
        </>
      }
    />
  )
}
