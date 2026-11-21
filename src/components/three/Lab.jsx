import { useMemo, useRef, useImperativeHandle, forwardRef } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

export const steel = { color: '#c9ced6', metalness: 0.95, roughness: 0.2 }

/** Paillasse en bois. */
export function Table({ size = [10, 0.16, 5], position = [0, -0.08, 0], color = '#4a3a2c' }) {
  return (
    <mesh position={position} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  )
}

/** Support : socle + tige verticale. */
export function Stand({ position = [0, 0, 0], height = 1.5 }) {
  return (
    <group position={position}>
      <RoundedBox args={[0.5, 0.06, 0.36]} radius={0.02} position={[0, 0.03, 0]} castShadow>
        <meshStandardMaterial color="#2a2d33" roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, height, 12]} />
        <meshStandardMaterial {...steel} />
      </mesh>
    </group>
  )
}

const UP = new THREE.Vector3(0, 1, 0)

/**
 * Vecteur 3D (tige + pointe). On le pilote dans useFrame :
 *   ref.current.set(origin, vector, scale)  (vector en unités de scène)
 */
export const Vector = forwardRef(function Vector({ color = '#ff6b6b', radius = 0.025 }, ref) {
  const g = useRef()
  const shaft = useRef()
  const head = useRef()
  const tmp = useMemo(() => ({ d: new THREE.Vector3(), q: new THREE.Quaternion() }), [])
  useImperativeHandle(ref, () => ({
    set(origin, vec) {
      const len = vec.length()
      g.current.visible = len > 0.02
      if (!g.current.visible) return
      g.current.position.copy(origin)
      tmp.d.copy(vec).normalize()
      g.current.quaternion.copy(tmp.q.setFromUnitVectors(UP, tmp.d))
      const hl = Math.min(0.16, len * 0.4)
      shaft.current.scale.set(1, Math.max(len - hl, 0.001), 1)
      shaft.current.position.y = (len - hl) / 2
      head.current.position.y = len - hl / 2
      head.current.scale.setScalar(hl / 0.16)
    },
    get visible() {
      return g.current.visible
    },
    set visible(v) {
      g.current.visible = v
    },
  }))
  return (
    <group ref={g}>
      <mesh ref={shaft}>
        <cylinderGeometry args={[radius, radius, 1, 10]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={head}>
        <coneGeometry args={[radius * 2.6, 0.16, 14]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  )
})

/** Trace d'une trajectoire : ligne dont on ajoute les points au fil du temps. */
export const Trail = forwardRef(function Trail({ max = 2000, color = '#ffd23f', opacity = 0.9 }, ref) {
  const line = useRef()
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(max * 3), 3))
    g.setDrawRange(0, 0)
    return g
  }, [max])
  const n = useRef(0)
  useImperativeHandle(ref, () => ({
    clear() {
      n.current = 0
      geo.setDrawRange(0, 0)
    },
    push(v) {
      if (n.current >= max) return
      geo.attributes.position.setXYZ(n.current++, v.x, v.y, v.z)
      geo.attributes.position.needsUpdate = true
      geo.setDrawRange(0, n.current)
    },
    setPoints(pts) {
      const k = Math.min(pts.length, max)
      for (let i = 0; i < k; i++) geo.attributes.position.setXYZ(i, pts[i].x, pts[i].y, pts[i].z)
      n.current = k
      geo.attributes.position.needsUpdate = true
      geo.setDrawRange(0, k)
      geo.computeBoundingSphere()
    },
  }))
  return (
    <line ref={line} geometry={geo} frustumCulled={false}>
      <lineBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
    </line>
  )
})

/** Tube fixe le long d'une liste de points (trajectoire théorique, lignes de champ…). */
export function Path({ points, color = '#ffd23f', radius = 0.012, opacity = 1 }) {
  const geo = useMemo(() => {
    if (points.length < 2) return null
    const curve = new THREE.CurvePath()
    for (let i = 1; i < points.length; i++) curve.add(new THREE.LineCurve3(points[i - 1], points[i]))
    return new THREE.TubeGeometry(curve, Math.min(points.length * 2, 600), radius, 6, false)
  }, [points, radius])
  if (!geo) return null
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} toneMapped={false} />
    </mesh>
  )
}

/** Texture canvas réutilisable (dessin à la création). */
export function useCanvasTexture(w, h, draw, deps = []) {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    draw(c.getContext('2d'), w, h)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
}
