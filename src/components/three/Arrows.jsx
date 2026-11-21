import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Flèche-tension : arc qui part de `from` et pointe vers `to`.
 * Convention : la flèche de u_AB pointe vers A.
 */
export function TensionArrow({ from, to, lift = 0.55, bulge = [0, 0, 0], color, name, valueRef, visible = true }) {
  const { tube, tip, quat, apex } = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const mid = a.clone().add(b).multiplyScalar(0.5).add(new THREE.Vector3(bulge[0], lift, bulge[2]))
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b)
    const tube = new THREE.TubeGeometry(curve, 40, 0.022, 8, false)
    const tan = curve.getTangent(1)
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan)
    const apex = curve.getPoint(0.5)
    return { tube, tip: b.clone().addScaledVector(tan, 0.06), quat, apex }
  }, [from, to, lift, bulge])
  return (
    <group visible={visible}>
      <mesh geometry={tube}>
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={tip} quaternion={quat}>
        <coneGeometry args={[0.07, 0.2, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {visible && (
        <Html position={[apex.x, apex.y + 0.13, apex.z]} center zIndexRange={[20, 0]}>
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
