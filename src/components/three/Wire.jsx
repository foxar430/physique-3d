import { useMemo } from 'react'
import * as THREE from 'three'

/** Fil droit entre deux points (cylindre orienté). */
export function Wire({ a, b, color = '#c8873a', radius = 0.03 }) {
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
      <cylinderGeometry args={[radius, radius, len, 10]} />
      <meshStandardMaterial color={color} metalness={0.6} roughness={0.35} />
    </mesh>
  )
}

/** Fil le long d'une polyligne. */
export function Polyline({ points, ...rest }) {
  return points.slice(1).map((p, i) => <Wire key={i} a={points[i]} b={p} {...rest} />)
}

/** Petite borne (connexion). */
export function Node({ at, color = '#d0d4da' }) {
  return (
    <mesh position={at}>
      <sphereGeometry args={[0.06, 16, 12]} />
      <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
    </mesh>
  )
}

/** Longueurs cumulées d'une polyligne, et point à l'abscisse curviligne s. */
export function makePath(points) {
  const v = points.map((p) => new THREE.Vector3(...p))
  const cum = [0]
  for (let i = 1; i < v.length; i++) cum.push(cum[i - 1] + v[i].distanceTo(v[i - 1]))
  const total = cum[cum.length - 1]
  const at = (s, out = new THREE.Vector3()) => {
    s = ((s % total) + total) % total
    let i = 1
    while (i < cum.length - 1 && cum[i] < s) i++
    const f = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1)
    return out.copy(v[i - 1]).lerp(v[i], f)
  }
  return { total, at }
}
