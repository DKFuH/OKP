import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { RoomPayload } from '../../api/rooms.js'
import styles from './Preview3D.module.css'

type VertexLike = { id: string; x_mm: number; y_mm: number }
type WallLike = { id: string; start_vertex_id?: string; end_vertex_id?: string }
type OpeningLike = { wall_id: string; offset_mm: number; width_mm: number }
type PlacementLike = {
  id: string
  wall_id: string
  offset_mm: number
  width_mm: number
  depth_mm: number
  height_mm: number
}

type WallSegmentResolved = {
  id: string
  start: { x_mm: number; y_mm: number }
  end: { x_mm: number; y_mm: number }
}

interface Props {
  room: RoomPayload | null
}

const MM_TO_M = 0.001
const WALL_THICKNESS_MM = 120

function resolveWalls(vertices: VertexLike[], walls: WallLike[]): WallSegmentResolved[] {
  const byId = new Map(vertices.map((vertex) => [vertex.id, vertex]))

  if (walls.length > 0 && walls.every((wall) => wall.start_vertex_id && wall.end_vertex_id)) {
    return walls
      .map((wall) => {
        const start = byId.get(wall.start_vertex_id as string)
        const end = byId.get(wall.end_vertex_id as string)
        if (!start || !end) {
          return null
        }
        return {
          id: wall.id,
          start: { x_mm: start.x_mm, y_mm: start.y_mm },
          end: { x_mm: end.x_mm, y_mm: end.y_mm },
        }
      })
      .filter((wall): wall is WallSegmentResolved => wall !== null)
  }

  return vertices.map((start, index) => {
    const end = vertices[(index + 1) % vertices.length]
    return {
      id: `wall-${index}`,
      start: { x_mm: start.x_mm, y_mm: start.y_mm },
      end: { x_mm: end.x_mm, y_mm: end.y_mm },
    }
  })
}

export function Preview3D({ room }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [showReference, setShowReference] = useState(true)

  const geometryInput = useMemo(() => {
    if (!room) {
      return null
    }

    const boundary = room.boundary as { vertices?: unknown[]; wall_segments?: unknown[] }
    const vertices = (boundary.vertices ?? []) as VertexLike[]
    const walls = (boundary.wall_segments ?? []) as WallLike[]
    const openings = (room.openings ?? []) as OpeningLike[]
    const placements = (room.placements ?? []) as PlacementLike[]

    if (vertices.length < 3) {
      return null
    }

    return {
      vertices,
      walls: resolveWalls(vertices, walls),
      openings,
      placements,
      ceilingHeightMm: room.ceiling_height_mm,
    }
  }, [room])

  useEffect(() => {
    const mount = rootRef.current
    if (!mount || !geometryInput) {
      return
    }

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0f172a)

    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / Math.max(1, mount.clientHeight), 0.1, 200)
    camera.position.set(3.5, 2.8, 3.5)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, Math.max(1, mount.clientHeight))
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.target.set(0, 0.7, 0)

    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambient)
    const directional = new THREE.DirectionalLight(0xffffff, 1)
    directional.position.set(3, 6, 3)
    scene.add(directional)

    const group = new THREE.Group()
    scene.add(group)

    const grid = new THREE.GridHelper(20, 40, 0x334155, 0x1e293b)
    grid.position.y = -0.001
    group.add(grid)

    const floorShape = new THREE.Shape(
      geometryInput.vertices.map((vertex) => new THREE.Vector2(vertex.x_mm * MM_TO_M, vertex.y_mm * MM_TO_M)),
    )
    const floorGeometry = new THREE.ShapeGeometry(floorShape)
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x334155, side: THREE.DoubleSide })
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial)
    floorMesh.rotation.x = -Math.PI / 2
    group.add(floorMesh)

    const center = new THREE.Box3().setFromObject(floorMesh).getCenter(new THREE.Vector3())
    group.position.set(-center.x, 0, -center.z)

    const wallById = new Map<string, WallSegmentResolved>()

    for (const wall of geometryInput.walls) {
      wallById.set(wall.id, wall)
      const dx = wall.end.x_mm - wall.start.x_mm
      const dy = wall.end.y_mm - wall.start.y_mm
      const lengthMm = Math.hypot(dx, dy)
      if (lengthMm <= 0) continue

      const lengthM = lengthMm * MM_TO_M
      const wallHeightM = geometryInput.ceilingHeightMm * MM_TO_M
      const wallThicknessM = WALL_THICKNESS_MM * MM_TO_M

      const wallGeometry = new THREE.BoxGeometry(lengthM, wallHeightM, wallThicknessM)
      const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x64748b })
      const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial)

      const angle = Math.atan2(dy, dx)
      wallMesh.rotation.y = -angle
      wallMesh.position.set(
        ((wall.start.x_mm + wall.end.x_mm) * 0.5) * MM_TO_M,
        wallHeightM * 0.5,
        ((wall.start.y_mm + wall.end.y_mm) * 0.5) * MM_TO_M,
      )

      group.add(wallMesh)

      if (showReference) {
        const lineGeom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(wall.start.x_mm * MM_TO_M, 0.002, wall.start.y_mm * MM_TO_M),
          new THREE.Vector3(wall.end.x_mm * MM_TO_M, 0.002, wall.end.y_mm * MM_TO_M),
        ])
        const line = new THREE.Line(lineGeom, new THREE.LineBasicMaterial({ color: 0x38bdf8 }))
        group.add(line)
      }
    }

    for (const opening of geometryInput.openings) {
      const wall = wallById.get(opening.wall_id)
      if (!wall) continue

      const dx = wall.end.x_mm - wall.start.x_mm
      const dy = wall.end.y_mm - wall.start.y_mm
      const wallLength = Math.hypot(dx, dy)
      if (wallLength <= 0) continue

      const ux = dx / wallLength
      const uy = dy / wallLength
      const cx = wall.start.x_mm + ux * (opening.offset_mm + opening.width_mm * 0.5)
      const cy = wall.start.y_mm + uy * (opening.offset_mm + opening.width_mm * 0.5)

      const openingMesh = new THREE.Mesh(
        new THREE.BoxGeometry(opening.width_mm * MM_TO_M, 2.0, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x0ea5e9 }),
      )
      openingMesh.position.set(cx * MM_TO_M, 1.0, cy * MM_TO_M)
      openingMesh.rotation.y = -Math.atan2(dy, dx)
      openingMesh.visible = showReference
      group.add(openingMesh)
    }

    for (const placement of geometryInput.placements) {
      const wall = wallById.get(placement.wall_id)
      if (!wall) continue

      const dx = wall.end.x_mm - wall.start.x_mm
      const dy = wall.end.y_mm - wall.start.y_mm
      const wallLength = Math.hypot(dx, dy)
      if (wallLength <= 0) continue

      const ux = dx / wallLength
      const uy = dy / wallLength
      const nx = uy
      const ny = -ux

      const centerOffset = placement.offset_mm + placement.width_mm * 0.5
      const px = wall.start.x_mm + ux * centerOffset + nx * (placement.depth_mm * 0.5)
      const py = wall.start.y_mm + uy * centerOffset + ny * (placement.depth_mm * 0.5)

      const furnitureMesh = new THREE.Mesh(
        new THREE.BoxGeometry(
          Math.max(0.2, placement.width_mm * MM_TO_M),
          Math.max(0.2, placement.height_mm * MM_TO_M),
          Math.max(0.2, placement.depth_mm * MM_TO_M),
        ),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b }),
      )
      furnitureMesh.position.set(
        px * MM_TO_M,
        Math.max(0.2, placement.height_mm * MM_TO_M) * 0.5,
        py * MM_TO_M,
      )
      furnitureMesh.rotation.y = -Math.atan2(dy, dx)
      group.add(furnitureMesh)
    }

    let disposed = false
    const onResize = () => {
      if (disposed) return
      const width = Math.max(1, mount.clientWidth)
      const height = Math.max(1, mount.clientHeight)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(mount)

    const animate = () => {
      if (disposed) return
      controls.update()
      renderer.render(scene, camera)
      requestAnimationFrame(animate)
    }
    animate()

    return () => {
      disposed = true
      resizeObserver.disconnect()
      controls.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [geometryInput, showReference])

  if (!geometryInput) {
    return (
      <div className={styles.wrap}>
        <div className={styles.toolbar}>
          <span className={styles.meta}>3D-Preview</span>
        </div>
        <div className={styles.empty}>Kein geschlossener Raum für 3D-Preview verfügbar.</div>
      </div>
    )
  }

  return (
    <section className={styles.wrap}>
      <header className={styles.toolbar}>
        <span className={styles.meta}>
          3D-Preview · Orbit/Zoom/Pan
        </span>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setShowReference((prev) => !prev)}
        >
          Referenz {showReference ? 'ausblenden' : 'einblenden'}
        </button>
      </header>
      <div ref={rootRef} className={styles.canvas} />
    </section>
  )
}
