import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

export default function PresenterModel({ scrollY }) {
  const group      = useRef()
  const { scene }  = useGLTF('/models/presenter.glb')
  const { camera } = useThree()

  useEffect(() => {
    if (!group.current) return

    const box    = new THREE.Box3().setFromObject(group.current)
    const size   = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    // Center model at world origin
    group.current.position.set(-center.x, -center.y, -center.z)

    // Fit camera to show full body
    const fovRad    = camera.fov * (Math.PI / 180)
    const fitHeight = size.y / (2 * Math.tan(fovRad / 2))
    const fitWidth  = (size.x / camera.aspect) / (2 * Math.tan(fovRad / 2))
    camera.position.set(0, 0, Math.max(fitHeight, fitWidth) * 1.12)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [scene, camera])

  useFrame(() => {
    if (!group.current) return
    // Rotate only after ARAV section has scrolled away
    const afterArav = Math.max(0, scrollY.current - window.innerHeight)
    const targetRot = (afterArav / 1200) * Math.PI * 2
    group.current.rotation.y += (targetRot - group.current.rotation.y) * 0.06
  })

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload('/models/presenter.glb')
