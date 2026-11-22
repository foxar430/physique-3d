import { useMemo, useState } from 'react'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import ExperimentLayout from '../../components/ExperimentLayout.jsx'
import Slider from '../../components/Slider.jsx'
import Plot from '../../components/Plot.jsx'
import { useSimulation } from '../../lib/useSimulation.js'
import { clockModel } from '../../lib/color.js'
import { Table, steel, Path, useCanvasTexture } from '../../components/three/Lab.jsx'

export const meta = {
  id: 'refraction',
  title: 'Réflexion et réfraction de la lumière : disque gradué',
  level: '2e année',
  sections: 'Sciences',
  chapter: 'Optique : réflexion, réfraction, réflexion totale',
}

const MATS = { plexi: { name: 'Plexiglas', n: 1.5 }, eau: { name: 'Eau', n: 1.33 }, verre: { name: 'Verre flint', n: 1.65 } }
const MODES = { miroir: 'Miroir plan', airverre: 'Air → plexiglas', verreair: 'Plexiglas → air (réflexion totale)' }
const DEFAULTS = { mode: 'airverre', i: 40, mat: 'plexi' }
const rad = Math.PI / 180

/** angles (°) : i1 dans le milieu d'incidence ; renvoie r (réflexion), i2 (réfraction ou null), l (angle limite) */
function optics(p) {
  const n = MATS[p.mat].n
  if (p.mode === 'miroir') return { r: p.i, i2: null, n1: 1, n2: 1 }
  const [n1, n2] = p.mode === 'airverre' ? [1, n] : [n, 1]
  const s = (n1 / n2) * Math.sin(p.i * rad)
  const lim = n1 > n2 ? Math.asin(n2 / n1) / rad : null
  return { r: p.i, i2: s < 1 ? Math.asin(s) / rad : null, n1, n2, lim, total: s >= 1 }
}

const C = new THREE.Vector3(0, 1.5, 0.06) // centre du disque
const RD = 1.2
const dirFromNormal = (deg, up) => new THREE.Vector3(Math.sin(deg * rad), up ? Math.cos(deg * rad) : -Math.cos(deg * rad), 0)

function Disk() {
  const tex = useCanvasTexture(1024, 1024, (g, W) => {
    const c = W / 2
    g.fillStyle = '#f4f1e8'
    g.beginPath(); g.arc(c, c, c - 4, 0, Math.PI * 2); g.fill()
    g.strokeStyle = '#222'
    g.fillStyle = '#222'
    g.font = 'bold 24px system-ui'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    for (let d = 0; d < 360; d += 1) {
      const a = (d * Math.PI) / 180
      const r1 = c - 10
      const r2 = r1 - (d % 10 === 0 ? 34 : d % 5 === 0 ? 22 : 12)
      g.lineWidth = d % 10 === 0 ? 2.5 : 1
      g.beginPath(); g.moveTo(c + r1 * Math.sin(a), c - r1 * Math.cos(a)); g.lineTo(c + r2 * Math.sin(a), c - r2 * Math.cos(a)); g.stroke()
      if (d % 10 === 0) {
        const v = d <= 90 ? d : d <= 180 ? 180 - d : d <= 270 ? d - 180 : 360 - d
        g.fillText(v, c + (r2 - 22) * Math.sin(a), c - (r2 - 22) * Math.cos(a))
      }
    }
    g.setLineDash([10, 8])
    g.lineWidth = 2
    g.beginPath(); g.moveTo(c, 20); g.lineTo(c, W - 20); g.stroke()
    g.setLineDash([])
    g.beginPath(); g.moveTo(20, c); g.lineTo(W - 20, c); g.stroke()
  })
  return (
    <group>
      <mesh position={[C.x, C.y, 0]}>
        <circleGeometry args={[RD, 96]} />
        <meshStandardMaterial map={tex} roughness={0.7} />
      </mesh>
      <mesh position={[C.x, C.y, -0.03]}>
        <cylinderGeometry args={[RD + 0.04, RD + 0.04, 0.05, 96]} />
        <meshStandardMaterial color="#2a2d33" />
      </mesh>
      <mesh position={[0, C.y / 2, -0.08]}>
        <boxGeometry args={[0.12, C.y, 0.06]} />
        <meshStandardMaterial color="#2a2d33" />
      </mesh>
      <RoundedBox args={[1.2, 0.08, 0.6]} radius={0.03} position={[0, 0.04, -0.05]}>
        <meshStandardMaterial color="#2a2d33" />
      </RoundedBox>
    </group>
  )
}

function Scene({ p }) {
  const o = optics(p)
  const n = MATS[p.mat].n
  const fromTop = p.mode !== 'verreair'
  const inDir = dirFromNormal(p.i, fromTop).multiplyScalar(-1) // direction de propagation vers le centre... inversée plus bas
  // rayon incident : de la source (sur le bord) vers le centre
  const src = C.clone().add(dirFromNormal(p.i, fromTop).multiplyScalar(-1).multiplyScalar(-RD * 0.98))
  const srcPos = C.clone().add(new THREE.Vector3(-Math.sin(p.i * rad), fromTop ? Math.cos(p.i * rad) : -Math.cos(p.i * rad), 0).multiplyScalar(RD * 0.98))
  const refl = C.clone().add(new THREE.Vector3(Math.sin(p.i * rad), fromTop ? Math.cos(p.i * rad) : -Math.cos(p.i * rad), 0).multiplyScalar(RD * 0.98))
  const refr = o.i2 != null ? C.clone().add(new THREE.Vector3(Math.sin(o.i2 * rad), fromTop ? -Math.cos(o.i2 * rad) : Math.cos(o.i2 * rad), 0).multiplyScalar(RD * 0.98)) : null
  // intensités : la réflexion est faible sauf miroir et réflexion totale
  const rOpacity = p.mode === 'miroir' || o.total ? 1 : 0.25
  const half = useMemo(() => {
    const sh = new THREE.Shape()
    sh.absarc(0, 0, RD * 0.62, Math.PI, 2 * Math.PI, false)
    sh.closePath()
    return new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: false, curveSegments: 64 })
  }, [])
  void src
  void inDir
  const z = 0.09
  const at = (v) => new THREE.Vector3(v.x, v.y, z)
  return (
    <group>
      <Table size={[6, 0.16, 3]} position={[0, -0.08, 0]} />
      <Disk />
      {p.mode === 'miroir' ? (
        <mesh position={[C.x, C.y - 0.02, 0.07]}>
          <boxGeometry args={[RD * 1.3, 0.04, 0.12]} />
          <meshStandardMaterial color="#d8e2ec" metalness={1} roughness={0.05} />
        </mesh>
      ) : (
        <mesh geometry={half} position={[C.x, C.y, 0.03]}>
          <meshPhysicalMaterial color="#cfeaff" transparent opacity={0.35} roughness={0.02} clearcoat={1} ior={n} depthWrite={false} />
        </mesh>
      )}
      {/* source : lanterne à fente sur le bord du disque */}
      <group position={[srcPos.x, srcPos.y, 0.12]} rotation={[0, 0, Math.atan2(C.y - srcPos.y, C.x - srcPos.x)]}>
        <RoundedBox args={[0.3, 0.16, 0.16]} radius={0.03} position={[-0.15, 0, 0]}>
          <meshStandardMaterial color="#2a2d33" />
        </RoundedBox>
      </group>
      <Path points={[at(srcPos), at(C)]} color="#ff3b30" radius={0.012} />
      <Path points={[at(C), at(refl)]} color="#ff3b30" radius={0.012} opacity={rOpacity} />
      {refr && <Path points={[at(C), at(refr)]} color="#ff3b30" radius={0.012} opacity={0.95} />}
      <Html position={[C.x - 0.55, C.y + (fromTop ? 0.75 : -0.75), 0.1]} center zIndexRange={[10, 0]}><span className="lbl tiny">i₁ = {p.i}°</span></Html>
      {refr && <Html position={[C.x + 0.5, C.y + (fromTop ? -0.75 : 0.75), 0.1]} center zIndexRange={[10, 0]}><span className="lbl tiny">i₂ = {o.i2.toFixed(1)}°</span></Html>}
      {o.total && <Html position={[C.x + 0.6, C.y - 0.4, 0.1]} center zIndexRange={[10, 0]}><span className="lbl">Réflexion totale !</span></Html>}
      <Html position={[C.x + 0.9, C.y + 0.15, 0.1]} center zIndexRange={[10, 0]}><span className="lbl tiny">{p.mode === 'miroir' ? 'miroir' : 'air ↑ / ' + MATS[p.mat].name.toLowerCase() + ' ↓'}</span></Html>
    </group>
  )
}

export default function RefractionExperiment() {
  const [params, setParams] = useState(DEFAULTS)
  const sim = useSimulation(clockModel, params)
  const set = (k) => (v) => setParams((p) => ({ ...p, [k]: v }))
  const o = optics(params)
  const n = MATS[params.mat].n

  const curve = []
  const sinC = []
  for (let i = 0; i <= 89; i += 1) {
    const q = optics({ ...params, i })
    if (q.i2 != null) {
      curve.push([i, q.i2])
      sinC.push([Math.sin(i * rad), Math.sin(q.i2 * rad)])
    }
  }

  return (
    <ExperimentLayout
      meta={meta}
      sim={sim}
      speeds={[1]}
      camera={{ position: [0, 1.6, 3.6], target: [0, 1.4, 0] }}
      scene={<Scene p={params} />}
      onParamsReset={() => setParams(DEFAULTS)}
      readouts={
        <>
          <div className="state charge">{params.mode === 'miroir' ? 'Réflexion : r = i' : o.total ? `Réflexion totale (i₁ > λ = ${o.lim.toFixed(1)}°)` : 'Réfraction : n₁·sin i₁ = n₂·sin i₂'}</div>
          <div>Angle de réflexion r = <b>{o.r}°</b></div>
          {params.mode !== 'miroir' && <div>Angle de réfraction i₂ = <b>{o.i2 != null ? o.i2.toFixed(1) + '°' : '—'}</b></div>}
          {o.lim != null && <div>Angle limite λ : sin λ = 1/n → <b>{o.lim.toFixed(1)}°</b></div>}
        </>
      }
      controls={
        <>
          <div className="speed" role="group" aria-label="Expérience">
            {Object.entries(MODES).map(([k, v]) => (
              <button key={k} className={params.mode === k ? 'on' : ''} onClick={() => set('mode')(k)}>{v}</button>
            ))}
          </div>
          {params.mode !== 'miroir' && (
            <div className="speed" role="group" aria-label="Matériau">
              <span>Milieu</span>
              {Object.entries(MATS).map(([k, m]) => (
                <button key={k} className={params.mat === k ? 'on' : ''} onClick={() => set('mat')(k)}>{m.name} (n = {m.n})</button>
              ))}
            </div>
          )}
          <Slider label="Angle d’incidence i₁" value={params.i} min={0} max={89} step={1} unit="°" onChange={set('i')} />
        </>
      }
      charts={
        params.mode === 'miroir' ? (
          <>
            <Plot title="Angle de réflexion en fonction de l’angle d’incidence" xLabel="i (°)" yLabel="r (°)" xMin={0} xMax={90} yMin={0} yMax={90} curves={[{ pts: [[0, 0], [90, 90]], color: '#e5484d' }]} points={[{ x: params.i, y: params.i }]} />
            <Plot title="Image d’un point par un miroir plan : symétrique par rapport au miroir" xLabel="x" yLabel="y" xMin={-2} xMax={2} yMin={-2} yMax={2} points={[{ x: -1, y: 1.2, label: 'A' }, { x: -1, y: -1.2, label: 'A′', color: '#b07cff' }]} hlines={[{ v: 0, label: 'miroir', color: '#8a8f98' }]} />
          </>
        ) : (
          <>
            <Plot title="Angle de réfraction i₂ en fonction de i₁" xLabel="i₁ (°)" yLabel="i₂ (°)" xMin={0} xMax={90} yMin={0} yMax={90} curves={[{ pts: curve, color: '#ff3b30' }]} points={o.i2 != null ? [{ x: params.i, y: o.i2 }] : []} vlines={o.lim != null ? [{ v: o.lim, label: 'λ', color: '#e0a000' }] : []} />
            <Plot title={`sin i₂ en fonction de sin i₁ : droite de pente n₁/n₂`} xLabel="sin i₁" yLabel="sin i₂" xMin={0} xMax={1} yMin={0} yMax={1} curves={[{ pts: sinC, color: '#30a46c' }]} points={o.i2 != null ? [{ x: Math.sin(params.i * rad), y: Math.sin(o.i2 * rad) }] : []} />
          </>
        )
      }
      course={
        <>
          <h2>Le cours en bref</h2>
          <div className="course-grid">
            <section>
              <h3>Lois de la réflexion (Descartes)</h3>
              <p>Le rayon réfléchi est dans le plan d’incidence et l’angle de réflexion est égal à l’angle d’incidence : <b>r = i</b>. L’image d’un objet par un miroir plan est symétrique de l’objet par rapport au miroir.</p>
            </section>
            <section>
              <h3>Lois de la réfraction</h3>
              <p>Le rayon réfracté est dans le plan d’incidence et :</p>
              <p className="eq">n₁·sin i₁ = n₂·sin i₂</p>
              <p>Indice de réfraction n = c/v (air ≈ 1, eau 1,33, verre ≈ 1,5). En passant dans un milieu plus réfringent, le rayon se rapproche de la normale.</p>
            </section>
            <section>
              <h3>Réflexion totale</h3>
              <p>Du milieu le plus réfringent vers le moins réfringent (n₁ &gt; n₂), il n’y a plus de rayon réfracté si i₁ dépasse l’angle limite λ :</p>
              <p className="eq">sin λ = n₂ / n₁</p>
              <p>Application : fibres optiques, prismes à réflexion totale.</p>
            </section>
            <section>
              <h3>À toi de tester</h3>
              <ul>
                <li>Air → plexiglas : peut-on avoir i₂ &gt; i₁ ?</li>
                <li>Trouve l’angle limite pour l’eau puis pour le verre flint.</li>
                <li>Vérifie que sin i₂ = f(sin i₁) est une droite et mesure sa pente.</li>
              </ul>
            </section>
          </div>
        </>
      }
    />
  )
}
