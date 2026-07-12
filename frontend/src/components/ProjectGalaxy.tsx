import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import './ProjectGalaxy.css'
import './ProjectGalaxy3D.css'

type Kind = 'core' | 'service' | 'data' | 'interface'
type Node = {
  id: string
  kind: Kind
  pos: [number, number, number]
  files: number
  language: string
  description: string
}
const nodes: Node[] = [
  {
    id: 'core',
    kind: 'core',
    pos: [0, 0, 0],
    files: 52,
    language: 'TypeScript',
    description: 'Shared domain logic and application orchestration.',
  },
  {
    id: 'web',
    kind: 'interface',
    pos: [4.4, 2.2, -1.2],
    files: 38,
    language: 'React',
    description: 'Customer-facing web application and UI routes.',
  },
  {
    id: 'auth',
    kind: 'service',
    pos: [-2.4, 3.2, 0.7],
    files: 19,
    language: 'TypeScript',
    description: 'Identity, sessions, and permission enforcement.',
  },
  {
    id: 'api',
    kind: 'service',
    pos: [3.8, -0.7, 1.2],
    files: 31,
    language: 'TypeScript',
    description: 'Public API gateway and request orchestration.',
  },
  {
    id: 'database',
    kind: 'data',
    pos: [0.2, -3.7, -0.3],
    files: 16,
    language: 'SQL',
    description: 'Persistence models, migrations, and query adapters.',
  },
  {
    id: 'shared',
    kind: 'core',
    pos: [-4.4, 1, -1.4],
    files: 27,
    language: 'TypeScript',
    description: 'Types, utilities, and reusable project primitives.',
  },
  {
    id: 'workers',
    kind: 'service',
    pos: [4.8, -3, 0],
    files: 14,
    language: 'Node.js',
    description: 'Asynchronous tasks and event processing.',
  },
  {
    id: 'cli',
    kind: 'interface',
    pos: [-4, -2.6, 0.8],
    files: 11,
    language: 'TypeScript',
    description: 'Developer commands and local automation tools.',
  },
  {
    id: 'cache',
    kind: 'data',
    pos: [6, 0.4, -1.8],
    files: 8,
    language: 'Redis',
    description: 'Fast session and application data caching.',
  },
]
const edges = [
  ['core', 'web'],
  ['core', 'auth'],
  ['core', 'api'],
  ['core', 'database'],
  ['core', 'shared'],
  ['core', 'cli'],
  ['api', 'web'],
  ['api', 'cache'],
  ['api', 'workers'],
  ['auth', 'web'],
  ['auth', 'database'],
  ['workers', 'database'],
  ['shared', 'auth'],
  ['shared', 'cli'],
]
const colors: Record<Kind, number> = {
  core: 0xb7ff2a,
  service: 0xffb84d,
  data: 0xff6b6b,
  interface: 0x2dd4bf,
}

function label(text: string, color: number) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 64
  const x = c.getContext('2d')!
  x.font = '600 22px Inter'
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  x.fillStyle = 'rgba(5,5,5,.82)'
  x.roundRect(4, 4, 248, 56, 14)
  x.fill()
  x.strokeStyle = `#${color.toString(16).padStart(6, '0')}`
  x.globalAlpha = 0.55
  x.stroke()
  x.globalAlpha = 1
  x.fillStyle = '#f3f5f0'
  x.fillText(text.toUpperCase(), 128, 32)
  const texture = new THREE.CanvasTexture(c)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export default function ProjectGalaxy() {
  const mount = useRef<HTMLDivElement>(null),
    cameraRef = useRef<THREE.PerspectiveCamera | null>(null),
    controlsRef = useRef<OrbitControls | null>(null),
    objects = useRef(new Map<string, THREE.Group>()),
    links = useRef<Array<{ mesh: THREE.Mesh; from: string; to: string }>>([])
  const [selected, setSelected] = useState('core'),
    [hovered, setHovered] = useState(''),
    [filter, setFilter] = useState<Kind | 'all'>('all'),
    [zoom, setZoom] = useState(100)
  const detail = nodes.find((n) => n.id === selected) ?? nodes[0]
  useEffect(() => {
    const host = mount.current
    if (!host) return
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x050705, 0.034)
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100)
    camera.position.set(0, 2.8, 15)
    cameraRef.current = camera
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6))
    renderer.setClearColor(0x050705)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    host.appendChild(renderer.domElement)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.055
    controls.enableZoom = false
    controls.minDistance = 7
    controls.maxDistance = 24
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.32
    controlsRef.current = controls
    controls.addEventListener('change', () =>
      setZoom(Math.round(1500 / camera.position.distanceTo(controls.target))),
    )
    scene.add(new THREE.AmbientLight(0xffffff, 0.3))
    const light = new THREE.PointLight(0xb7ff2a, 25, 20)
    light.position.set(0, 1, 3)
    scene.add(light)
    const starsGeo = new THREE.BufferGeometry(),
      starPos = new Float32Array(1800)
    for (let i = 0; i < starPos.length; i++) starPos[i] = (Math.random() - 0.5) * 28
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const stars = new THREE.Points(
      starsGeo,
      new THREE.PointsMaterial({ color: 0x829078, size: 0.026, transparent: true, opacity: 0.6 }),
    )
    scene.add(stars)
    ;[3.6, 5.8, 7.4].forEach((r, i) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r, r + 0.013, 128),
        new THREE.MeshBasicMaterial({
          color: 0x6e8b57,
          transparent: true,
          opacity: 0.16,
          side: THREE.DoubleSide,
        }),
      )
      ring.rotation.set(Math.PI / 2.2, i * 0.36, i * 0.18)
      scene.add(ring)
    })
    const map = new Map<string, THREE.Group>()
    objects.current = map
    nodes.forEach((n) => {
      const group = new THREE.Group()
      group.position.set(...n.pos)
      group.userData = { id: n.id }
      const radius = n.id === 'core' ? 0.64 : 0.36 + Math.min(n.files, 50) * 0.004
      const planet = new THREE.Mesh(
        n.id === 'core'
          ? new THREE.IcosahedronGeometry(radius, 2)
          : new THREE.SphereGeometry(radius, 24, 24),
        new THREE.MeshStandardMaterial({
          color: 0x090c08,
          emissive: colors[n.kind],
          emissiveIntensity: n.id === 'core' ? 0.85 : 0.45,
          roughness: 0.25,
          metalness: 0.4,
        }),
      )
      planet.userData = { id: n.id }
      group.add(planet)
      group.add(
        new THREE.Mesh(
          new THREE.IcosahedronGeometry(radius * 1.28, 1),
          new THREE.MeshBasicMaterial({
            color: colors[n.kind],
            wireframe: true,
            transparent: true,
            opacity: n.id === 'core' ? 0.48 : 0.22,
          }),
        ),
      )
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 1.55, 0.012, 8, 64),
        new THREE.MeshBasicMaterial({ color: colors[n.kind], transparent: true, opacity: 0.4 }),
      )
      halo.rotation.x = Math.PI / 2
      group.add(halo)
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: label(n.id, colors[n.kind]),
          transparent: true,
          depthTest: false,
        }),
      )
      sprite.position.y = radius + 0.58
      sprite.scale.set(1.75, 0.44, 1)
      group.add(sprite)
      scene.add(group)
      map.set(n.id, group)
    })
    const flow: Array<{ dot: THREE.Mesh; curve: THREE.QuadraticBezierCurve3; offset: number }> = [],
      lineList: Array<{ mesh: THREE.Mesh; from: string; to: string }> = []
    links.current = lineList
    edges.forEach(([from, to], i) => {
      const a = nodes.find((n) => n.id === from)!,
        b = nodes.find((n) => n.id === to)!,
        start = new THREE.Vector3(...a.pos),
        end = new THREE.Vector3(...b.pos),
        mid = start
          .clone()
          .lerp(end, 0.5)
          .add(new THREE.Vector3(0, 0.45 + (i % 3) * 0.16, (i % 2 ? 1 : -1) * 0.35)),
        curve = new THREE.QuadraticBezierCurve3(start, mid, end)
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 32, 0.012, 5),
        new THREE.MeshBasicMaterial({ color: colors[a.kind], transparent: true, opacity: 0.24 }),
      )
      scene.add(tube)
      lineList.push({ mesh: tube, from, to })
      for (let p = 0; p < 2; p++) {
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.038, 8, 8),
          new THREE.MeshBasicMaterial({ color: colors[b.kind] }),
        )
        scene.add(dot)
        flow.push({ dot, curve, offset: (p * 0.5 + i * 0.071) % 1 })
      }
    })
    const ray = new THREE.Raycaster(),
      pointer = new THREE.Vector2()
    let down = [0, 0]
    const pick = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -(((e.clientY - rect.top) / rect.height) * 2 - 1),
      )
      ray.setFromCamera(pointer, camera)
      let hit = ray.intersectObjects([...map.values()], true)[0]?.object
      while (hit && !hit.userData.id) hit = hit.parent!
      return hit?.userData.id as string | undefined
    }
    const move = (e: PointerEvent) => {
        const id = pick(e) ?? ''
        setHovered(id)
        renderer.domElement.style.cursor = id ? 'pointer' : 'grab'
      },
      downFn = (e: PointerEvent) => {
        down = [e.clientX, e.clientY]
        controls.autoRotate = false
      },
      up = (e: PointerEvent) => {
        if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) {
          const id = pick(e)
          if (id) setSelected(id)
        }
      }
    renderer.domElement.addEventListener('pointermove', move)
    renderer.domElement.addEventListener('pointerdown', downFn)
    renderer.domElement.addEventListener('pointerup', up)
    const resize = () => {
        const r = host.getBoundingClientRect()
        camera.aspect = r.width / r.height
        camera.updateProjectionMatrix()
        renderer.setSize(r.width, r.height)
      },
      observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()
    const clock = new THREE.Clock()
    let frame = 0
    const animate = () => {
      frame = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()
      controls.update()
      stars.rotation.y = t * 0.008
      map.forEach((g, id) => {
        g.rotation.y += id === 'core' ? 0.006 : 0.002
        g.children[1].rotation.x += 0.003
      })
      flow.forEach((f) => f.dot.position.copy(f.curve.getPoint((t * 0.12 + f.offset) % 1)))
      renderer.render(scene, camera)
    }
    animate()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      renderer.domElement.removeEventListener('pointermove', move)
      renderer.domElement.removeEventListener('pointerdown', downFn)
      renderer.domElement.removeEventListener('pointerup', up)
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Sprite) {
          o.geometry?.dispose?.()
          const m = o.material as THREE.Material | THREE.Material[]
          ;(Array.isArray(m) ? m : [m]).forEach((v) => {
            if (v instanceof THREE.SpriteMaterial) v.map?.dispose()
            v.dispose()
          })
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])
  useEffect(() => {
    objects.current.forEach((g, id) => {
      const n = nodes.find((v) => v.id === id)!
      g.visible = filter === 'all' || n.kind === filter || id === selected
      g.scale.setScalar(id === selected ? 1.27 : id === hovered ? 1.13 : 1)
    })
    links.current.forEach((l) => {
      l.mesh.visible =
        (filter === 'all' ||
          nodes.find((n) => n.id === l.from)?.kind === filter ||
          l.from === selected) &&
        (filter === 'all' || nodes.find((n) => n.id === l.to)?.kind === filter || l.to === selected)
      ;(l.mesh.material as THREE.MeshBasicMaterial).opacity =
        l.from === selected || l.to === selected ? 0.68 : 0.16
    })
  }, [filter, hovered, selected])
  const zoomBy = (factor: number) => {
      const c = cameraRef.current,
        o = controlsRef.current
      if (!c || !o) return
      c.position.sub(o.target).multiplyScalar(factor).add(o.target)
      o.update()
    },
    reset = () => {
      const c = cameraRef.current,
        o = controlsRef.current
      if (!c || !o) return
      c.position.set(0, 2.8, 15)
      o.target.set(0, 0, 0)
      o.autoRotate = true
      o.update()
    }
  return (
    <div className="project-galaxy galaxy-3d">
      <div className="galaxy-toolbar">
        <div>
          <span className="galaxy-live">
            <i />
            3D LIVE MAP
          </span>
          <b>commerce-platform</b>
        </div>
        <div className="galaxy-filters">
          {(['all', 'core', 'service', 'data', 'interface'] as const).map((k) => (
            <button className={filter === k ? 'active' : ''} onClick={() => setFilter(k)} key={k}>
              {k}
            </button>
          ))}
        </div>
        <div className="galaxy-tools">
          <button onClick={() => zoomBy(1.15)}>−</button>
          <span>{zoom}%</span>
          <button onClick={() => zoomBy(0.86)}>+</button>
          <button onClick={reset}>Reset</button>
        </div>
      </div>
      <div className="galaxy-workspace">
        <div className="galaxy-three-viewport" ref={mount}>
          <div className="galaxy-scanline" />
          <div className="galaxy-mode">
            <i />
            ORBIT MODE
          </div>
          <div className="galaxy-telemetry">
            <small>ARCHITECTURE SIGNAL</small>
            <b>
              <i />
              Mapping dependencies
            </b>
            <div>
              <span>
                <strong>{nodes.length}</strong> modules
              </span>
              <span>
                <strong>{edges.length}</strong> connections
              </span>
              <span>
                <strong>100%</strong> local
              </span>
            </div>
          </div>
          <div className="galaxy-legend">
            <span>
              <i className="core" />
              Core
            </span>
            <span>
              <i className="service" />
              Service
            </span>
            <span>
              <i className="data" />
              Data
            </span>
            <span>
              <i className="interface" />
              Interface
            </span>
          </div>
          <div className="galaxy-instruction">
            Drag to orbit · Right-drag to pan · Use +/− to zoom · Scroll to continue
          </div>
        </div>
        <aside className="galaxy-details">
          <div className={`detail-mark ${detail.kind}`}>{detail.id.slice(0, 2)}</div>
          <small>{detail.kind} module</small>
          <h3>{detail.id}</h3>
          <p>{detail.description}</p>
          <dl>
            <dt>Files</dt>
            <dd>{detail.files}</dd>
            <dt>Language</dt>
            <dd>{detail.language}</dd>
            <dt>Dependencies</dt>
            <dd>{edges.filter((e) => e.includes(detail.id)).length}</dd>
            <dt>Health</dt>
            <dd className="healthy">Healthy</dd>
          </dl>
          <div className="detail-deps">
            <span>CONNECTED TO</span>
            {edges
              .filter((e) => e.includes(detail.id))
              .map((e) => (e[0] === detail.id ? e[1] : e[0]))
              .map((id) => (
                <button onClick={() => setSelected(id)} key={id}>
                  {id}
                  <i>→</i>
                </button>
              ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
