import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { Surface } from '../geometry/surfaces'
import type { RoomDimensions } from '../model/types'
import { getSurfaces } from '../state/selectors'
import { useStore } from '../state/store'
import { GroutGrid } from './GroutGrid'
import { RegionMesh } from './RegionMesh'
import { SCALE } from './shapeFromOutline'
import { SurfaceMesh } from './SurfaceMesh'

const SURFACE_COLORS: Record<string, string> = {
  floor: '#8f959e',
  ceiling: '#c9cdd4',
}

function surfaceColor(s: Surface, selected: boolean, hovered: boolean): string {
  if (selected) return '#6f96ea'
  if (hovered) return '#a9bde4'
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
  const surfaces = getSurfaces(project)
  const surfaceById = useMemo(() => new Map(surfaces.map((s) => [s.id, s])), [surfaces])
  const tileTypeById = useMemo(
    () => new Map(project.tileTypes.map((tt) => [tt.id, tt])),
    [project.tileTypes],
  )
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
      {surfaces.map((s) => {
        const interactive = s.tileableByDefault
        return (
          <SurfaceMesh
            key={s.id}
            surface={s}
            color={surfaceColor(
              s,
              selection?.kind === 'surface' && selection.id === s.id,
              hover === s.id,
            )}
            onClick={
              interactive
                ? (e) => {
                    e.stopPropagation()
                    select({ kind: 'surface', id: s.id })
                  }
                : undefined
            }
            onPointerOver={
              interactive
                ? (e) => {
                    e.stopPropagation()
                    setHover(s.id)
                  }
                : undefined
            }
            onPointerOut={interactive ? () => setHover(null) : undefined}
          />
        )
      })}
      {project.regions.map((r) => {
        const surface = surfaceById.get(r.surfaceId)
        const tileType = tileTypeById.get(r.tileTypeId)
        // Defensywny filtr sierot: region bez powierzchni/typu nie renderuje się.
        if (!surface || !tileType) return null
        return (
          <group key={r.id}>
            <RegionMesh
              region={r}
              surface={surface}
              tileType={tileType}
              selected={selection?.kind === 'region' && selection.id === r.id}
              hovered={hover === r.id}
              onClick={(e) => {
                e.stopPropagation()
                select({ kind: 'region', id: r.id })
              }}
              onPointerOver={(e) => {
                e.stopPropagation()
                setHover(r.id)
              }}
              onPointerOut={() => setHover(null)}
            />
            <GroutGrid
              region={r}
              surface={surface}
              tileType={tileType}
              grout={project.settings.groutWidth}
            />
          </group>
        )
      })}
      <RoomOutline room={room} />
      <OrbitControls makeDefault target={target} />
    </Canvas>
  )
}
