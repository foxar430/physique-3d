import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Flèche-tension droite, couchée sur la plaque, parallèle au dipôle.
 * Convention : la flèche de u_AB pointe vers A (elle va de `from` vers `to`).
 */
export function TensionArrow({ from, to, color, name, valueRef, visible = true, labelOffset = [0, 0.16, 0] }) {
  const { pos, quat, len, tip, mid } = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const d = b.clone().sub(a)
    const len = d.length()
    const dir = d.clone().normalize()
    const head = Math.min(0.16, len * 0.3)
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    return {
      pos: a.clone().addScaledVector(dir, (len - head) / 2),
      quat,
      len: len - head,
      tip: b.clone().addScaledVector(dir, -head / 2),
      mid: a.clone().add(b).multiplyScalar(0.5),
    }
  }, [from, to])
  return (
    <group visible={visible}>
      <mesh position={pos} quaternion={quat}>
        <cylinderGeometry args={[0.018, 0.018, Math.max(len, 0.01), 10]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={tip} quaternion={quat}>
        <coneGeometry args={[0.06, 0.16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {visible && (
        <Html position={[mid.x + labelOffset[0], mid.y + labelOffset[1], mid.z + labelOffset[2]]} center zIndexRange={[20, 0]}>
          <div className="arrow-lbl" style={{ borderColor: color, color }}>
            {name} = <b ref={valueRef}>—</b>
          </div>
        </Html>
      )}
    </group>
  )
}

/** Flèche-intensité : petite flèche posée sur un fil, sens d'orientation choisi. */
export function CurrentArrow({ at, dir, color = '#30a46c', valueRef, visible = true }) {
  const quat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dir).normalize()),
    [dir],
  )
  return (
    <group position={at} visible={visible}>
      <mesh quaternion={quat} position={[0, 0.02, 0]}>
        <coneGeometry args={[0.1, 0.28, 18]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {visible && (
        <Html position={[0, 0.3, -0.42]} center zIndexRange={[20, 0]}>
          <div className="arrow-lbl" style={{ borderColor: color, color }}>
            i = <b ref={valueRef}>—</b>
          </div>
        </Html>
      )}
    </group>
  )
}
