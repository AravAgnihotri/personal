import { useRef, useLayoutEffect } from 'react'
import { useFrame, invalidate } from '@react-three/fiber'
import { Cloud, Clouds } from '@react-three/drei'

/**
 * After drei's Clouds useFrame writes per-instance opacity, multiply by scroll fade
 * so we never thrash React props / useLayoutEffect on the Clouds.
 */
function SteamScrollFade({ cloudsGroupRef, scrollY, fadeEndRef }) {
  const meshRef = useRef(null)
  const smooth = useRef(1)

  useLayoutEffect(() => {
    meshRef.current = null
    const root = cloudsGroupRef.current
    if (!root) return
    root.traverse((o) => {
      if (o.isInstancedMesh && o.geometry?.attributes?.cloudOpacity) {
        meshRef.current = o
      }
    })
  }, [cloudsGroupRef])

  useFrame((_, delta) => {
    const end = fadeEndRef.current
    const y = scrollY.current
    const t =
      !Number.isFinite(end) || end <= 0
        ? 1
        : Math.min(1, Math.max(0, y / end))
    const target = Number.isFinite(t) ? 1 - t * t * (3 - 2 * t) : 1

    const k = 14
    const next =
      smooth.current + (target - smooth.current) * (1 - Math.exp(-k * delta))
    smooth.current = Number.isFinite(next) ? Math.max(0, Math.min(1, next)) : 1

    const attr = meshRef.current?.geometry?.attributes?.cloudOpacity
    if (attr) {
      const arr = attr.array
      const m = smooth.current
      for (let i = 0; i < arr.length; i++) arr[i] *= m
      attr.needsUpdate = true
    }

    if (Math.abs(target - smooth.current) > 0.002) invalidate()
  })

  return null
}

/**
 * Soft steam behind the presenter — in-scene so it’s visible.
 * Fade is applied in a post–useFrame pass (see SteamScrollFade).
 */
export default function SteamField({ scrollY, fadeEndRef }) {
  const cloudsGroupRef = useRef(null)

  return (
    <group position={[0, -0.2, -0.65]}>
      <Clouds ref={cloudsGroupRef} limit={80}>
        <Cloud
          position={[-1.35, 0.35, -0.95]}
          bounds={[3.2, 2.2, 1.6]}
          volume={6.2}
          opacity={0.5}
          speed={0.55}
          segments={16}
          color="#8a8680"
          fade={42}
          growth={6}
        />
        <Cloud
          position={[1.25, 0.1, -0.75]}
          bounds={[2.9, 1.9, 1.45]}
          volume={5.6}
          opacity={0.46}
          speed={0.48}
          segments={14}
          color="#7f7b75"
          fade={40}
          growth={5.5}
        />
        <Cloud
          position={[0, 0.85, -1.35]}
          bounds={[4.2, 1.55, 2]}
          volume={5.2}
          opacity={0.44}
          speed={0.38}
          segments={20}
          color="#959089"
          fade={48}
          growth={6.2}
        />
        <Cloud
          position={[0.2, -0.45, -0.55]}
          bounds={[3.4, 1.7, 1.25]}
          volume={4.8}
          opacity={0.42}
          speed={0.52}
          segments={14}
          color="#848078"
          fade={38}
          growth={5.8}
        />
        <Cloud
          position={[-0.1, 0.15, -1.1]}
          bounds={[2.5, 1.85, 1.35]}
          volume={4.4}
          opacity={0.4}
          speed={0.42}
          segments={12}
          color="#908b84"
          fade={44}
          growth={5.2}
        />
      </Clouds>
      <SteamScrollFade cloudsGroupRef={cloudsGroupRef} scrollY={scrollY} fadeEndRef={fadeEndRef} />
    </group>
  )
}
