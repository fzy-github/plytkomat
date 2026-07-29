import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { deriveSurfaces, type Surface } from '../geometry/surfaces'
import type { RoomDimensions } from '../model/types'
import { useStore } from '../state/store'
import { SCALE } from './shapeFromOutline'
import { SurfaceMesh } from './SurfaceMesh'

const SURFACE_COLORS: Record<string, string> = {
  floor: '#8f959e',
  ceiling: '#c9cdd4',
}

function surfaceColor(s: Surface): string {
  return SURFACE_COLORS[s.id] ?? '#b7bdc7'
}

/** Krawędzie bryły pokoju — dają orientację także tam, gdzie ściany są culled. */
function RoomOutline({ room }: { room: RoomDimensions }) {
  const geometry = useMemo(
    () =>
      new THREE.EdgesGeometry(
        new THREE.BoxGeometry(room.width * SCALE, room.height * SCALE, room.length * SCALE),
      ),
    [room],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <lineSegments
      geometry={geometry}
      position={[
        (room.width / 2) * SCALE,
        (room.height / 2) * SCALE,
        (room.length / 2) * SCALE,
      ]}
    >
      <lineBasicMaterial color="#5c6370" />
    </lineSegments>
  )
}

export function SceneRoot() {
  const project = useStore((s) => s.project)
  const surfaces = useMemo(() => deriveSurfaces(project), [project])
  const room = project.room

  const target: [number, number, number] = [
    (room.width / 2) * SCALE,
    (room.height / 2) * SCALE,
    (room.length / 2) * SCALE,
  ]

  return (
    <Canvas camera={{ position: [-3.5, 4, 6], fov: 50 }}>
      <color attach="background" args={['#dde2e9']} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[6, 10, 4]} intensity={1.1} />
      <directionalLight position={[-6, 6, -4]} intensity={0.4} />
      {surfaces.map((s) => (
        <SurfaceMesh key={s.id} surface={s} color={surfaceColor(s)} />
      ))}
      <RoomOutline room={room} />
      <OrbitControls makeDefault target={target} />
    </Canvas>
  )
}
