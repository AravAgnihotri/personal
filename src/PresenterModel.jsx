import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { publicUrl } from './publicUrl'

const MODEL_URL = publicUrl('models/presenter.glb')

export default function PresenterModel({ scrollY, phraseCount = 3 }) {
  const group     = useRef()
  const { scene } = useGLTF(MODEL_URL)
  const { camera } = useThree()
  // Store centering offsets and model height so useFrame can reference them
  const originRef = useRef({ x: 0, y: 0, z: 0, sizeY: 1 })

  useEffect(() => {
    if (!group.current) return

    const box    = new THREE.Box3().setFromObject(group.current)
    const size   = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    originRef.current = { x: center.x, y: center.y, z: center.z, sizeY: size.y }

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

  useFrame((_, delta) => {
    if (!group.current) return
    const vh = window.innerHeight
    const { x, y, z, sizeY } = originRef.current

    // Exit window: starts halfway through the last phrase, finishes at phraseEnd
    const phraseEnd = (phraseCount + 1) * vh
    const exitStart = phraseEnd - vh * 0.5
    const exitProgress = Math.max(0, Math.min(1, (scrollY.current - exitStart) / (vh * 0.5)))

    if (exitProgress >= 1) {
      group.current.visible = false
      return
    }

    group.current.visible = true

    // Ease-in curve so it accelerates as it leaves
    const eased = exitProgress * exitProgress
    const exitOffset = eased * sizeY * 1.6

    group.current.position.set(-x, -y + exitOffset, -z)

    // Spin starts from the very first scroll pixel
    const rotationSpan = vh * Math.max(3.25, phraseCount + 0.85)
    const u = Math.min(1, scrollY.current / rotationSpan)
    const smooth = u * u * (3 - 2 * u)
    const targetY = smooth * Math.PI * 2

    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      targetY,
      2.8,
      delta
    )
  })

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload(MODEL_URL)
