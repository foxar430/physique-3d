import { useMemo } from 'react'
import * as THREE from 'three'

/** Fil droit entre deux points (cylindre orienté). metal : fil nu, sinon câble gainé. */
export function Wire({ a, b, color = '#c0392b', radius = 0.035, metal = false }) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a)
    const vb = new THREE.Vector3(...b)
    const dir = vb.clone().sub(va)
    const len = dir.length()
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    return { pos: va.add(vb).multiplyScalar(0.5).toArray(), quat, len }
  }, [a, b])
  return (
    <mesh position={pos} quaternion={quat} castShadow>
      <cylinderGeometry args={[radius, radius, len, 12]} />
      {metal ? (
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.25} />
      ) : (
        <meshPhysicalMaterial color={color} roughness={0.4} clearcoat={0.6} clearcoatRoughness={0.3} />
      )}
    </mesh>
  )
}

/** Câble le long d'une polyligne, avec des coudes arrondis. */
export function Polyline({ points, color = '#c0392b', radius = 0.035, metal = false }) {
  return (
    <>
      {points.slice(1).map((p, i) => (
        <Wire key={i} a={points[i]} b={p} color={color} radius={radius} metal={metal} />
      ))}
      {points.slice(1, -1).map((p, i) => (
        <mesh key={'j' + i} position={p}>
          <sphereGeometry args={[radius, 12, 10]} />
          {metal ? (
            <meshStandardMaterial color={color} metalness={0.9} roughness={0.25} />
          ) : (
            <meshPhysicalMaterial color={color} roughness={0.4} clearcoat={0.6} />
          )}
        </mesh>
      ))}
    </>
  )
}

/** Fil fin courbé (pattes de composant, cordons) passant par des points lissés. */
export function Lead({ points, color = '#c9ced6', radius = 0.014, metal = true, smooth = false }) {
  const geo = useMemo(() => {
    const v = points.map((p) => new THREE.Vector3(...p))
    const curve = smooth ? new THREE.CatmullRomCurve3(v) : new THREE.CurvePath()
    if (!smooth) for (let i = 1; i < v.length; i++) curve.add(new THREE.LineCurve3(v[i - 1], v[i]))
    return new THREE.TubeGeometry(curve, smooth ? 48 : 8 * v.length, radius, 8, false)
  }, [points, radius, smooth])
  return (
    <mesh geometry={geo} castShadow>
      {metal ? (
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.25} />
      ) : (
        <meshPhysicalMaterial color={color} roughness={0.45} clearcoat={0.5} />
      )}
    </mesh>
  )
}

/** Longueurs cumulées d'une polyligne ; point et direction à l'abscisse curviligne s. */
export function makePath(points) {
  const v = points.map((p) => new THREE.Vector3(...p))
  const cum = [0]
  for (let i = 1; i < v.length; i++) cum.push(cum[i - 1] + v[i].distanceTo(v[i - 1]))
  const total = cum[cum.length - 1]
  const at = (s, out = new THREE.Vector3(), dir) => {
    s = ((s % total) + total) % total
    let i = 1
    while (i < cum.length - 1 && cum[i] < s) i++
    const f = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1)
    if (dir) dir.copy(v[i]).sub(v[i - 1]).normalize()
    return out.copy(v[i - 1]).lerp(v[i], f)
  }
  return { total, at }
}
