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

function surfaceColor(s: Surface, selected: boolean, hovered: boolean): string {
  if (selected) return '#6f96ea'
  if (hovered) return '#8fb0ee'
  if (s.source.type === 'element') return '#9fa6b2'
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
  const selection = useStore((s) => s.selection)
  const hover = useStore((s) => s.hover)
  const select = useStore((s) => s.select)
  const setHover = useStore((s) => s.setHover)
  const surfaces = useMemo(() => deriveSurfaces(project), [project])
  const room = project.room

  const selectedElementId = selection?.kind === 'element' ? selection.id : null

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
      {surfaces.map((s) => {
        const elementId = s.source.elementId
        return (
          <SurfaceMesh
            key={s.id}
            surface={s}
            color={surfaceColor(
              s,
              elementId !== undefined && elementId === selectedElementId,
              elementId !== undefined && elementId === hover,
            )}
            onClick={
              elementId
                ? (e) => {
                    e.stopPropagation()
                    select({ kind: 'element', id: elementId })
                  }
                : undefined
            }
            onPointerOver={
              elementId
                ? (e) => {
                    e.stopPropagation()
                    setHover(elementId)
                  }
                : undefined
            }
            onPointerOut={elementId ? () => setHover(null) : undefined}
          />
        )
      })}
      <RoomOutline room={room} />
      <OrbitControls makeDefault target={target} />
    </Canvas>
  )
}
