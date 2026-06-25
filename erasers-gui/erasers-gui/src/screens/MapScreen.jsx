import { useEffect, useRef, useState } from 'react'
import ROSLIB from 'roslib'
import { useRos } from '../context/RosContext.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { LocationsEditor } from './LocationsEditor.jsx'
import I from '../icons.jsx'

// ros3d.js は window.ROSLIB に依存するグローバルスクリプト。
// 初回マウント時に window.ROSLIB を設定してから /ros3d.js を動的ロードする。
let ros3dLoadPromise = null

function ensureRos3d() {
  if (window.ROS3D) return Promise.resolve()
  if (ros3dLoadPromise) return ros3dLoadPromise
  window.ROSLIB = ROSLIB
  ros3dLoadPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = '/ros3d.js'
    s.onload = () => {
      // RViz 配色: free(0)→白, occupied(100)→黒, unknown(-1)→グレー
      window.ROS3D.OccupancyGrid.prototype.getColor = function(index, row, col, value) {
        if (value === -1) return [128, 128, 128, 255]
        const v = Math.round((100 - value) / 100 * 255)
        return [v, v, v, 255]
      }
      resolve()
    }
    s.onerror = reject
    document.head.appendChild(s)
  })
  return ros3dLoadPromise
}

function fitCameraToGrid(grid, viewer) {
  const geom = grid.geometry
  const worldW = geom.parameters.width  * grid.scale.x
  const worldH = geom.parameters.height * grid.scale.y
  const cx = grid.position.x
  const cy = grid.position.y
  const maxDim  = Math.max(worldW, worldH)
  const fovRad  = (40 * Math.PI) / 180
  const cameraZ = Math.max(5, (maxDim / 2) / Math.tan(fovRad / 2)) * 1.3
  viewer.camera.position.x = cx
  viewer.camera.position.y = cy
  viewer.camera.position.z = cameraZ
  viewer.cameraControls.center.set(cx, cy, 0)
}

export function MapScreen({ pcs, activePc, setActivePc }) {
  const { ros, status } = useRos()
  const { activePreset, locRooms } = useAppContext()
  const containerRef    = useRef(null)
  const labelOverlayRef = useRef(null)
  const instanceRef     = useRef(null)
  const fittedRef       = useRef(false)
  const [mapStatus, setMapStatus] = useState('waiting')
  const [mapTab, setMapTab]       = useState('map')
  const [viewerReady, setViewerReady] = useState(false)
  const [showLocations, setShowLocations] = useState(true)

  const [poseMode, setPoseMode]   = useState(false)
  const poseModeRef     = useRef(false)
  const poseDragRef     = useRef(null)
  const poseHandlersRef = useRef(null)

  const [robotPos, setRobotPos] = useState(null)
  const [paused, setPaused]     = useState(false)
  const pausedRef               = useRef(false)

  useEffect(() => { poseModeRef.current = poseMode }, [poseMode])
  useEffect(() => { pausedRef.current = paused }, [paused])

  useEffect(() => {
    if (!poseMode) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setPoseMode(false)
      poseModeRef.current = false
      poseDragRef.current = null
      if (instanceRef.current) {
        instanceRef.current.previewArrow.visible = false
        containerRef.current.style.cursor = ''
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [poseMode])

  useEffect(() => {
    setMapStatus('waiting')
    fittedRef.current = false
    const container = containerRef.current
    if (!container || !ros.current || status !== 'connected') return

    const w = container.clientWidth
    const h = container.clientHeight
    if (w === 0 || h === 0) return

    let cancelled = false

    ensureRos3d().then(() => {
      if (cancelled || !containerRef.current) return

      const mapTopic = activePreset?.map?.topic || '/map'
      const ROS3D = window.ROS3D

      const viewer = new ROS3D.Viewer({
        elem: containerRef.current,
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
        antialias: true,
        background: '#f5f5f5',
        cameraPose: { x: 0, y: 0, z: 30 },
      })

      const gridClient = new ROS3D.OccupancyGridClient({
        ros: ros.current,
        rootObject: viewer.scene,
        topic: mapTopic,
        compression: 'none',
        continuous: true,
      })

      gridClient.on('change', () => {
        setMapStatus('received')
        if (!fittedRef.current && gridClient.currentGrid) {
          fittedRef.current = true
          fitCameraToGrid(gridClient.currentGrid, viewer)
        }
      })

      const ro = new ResizeObserver(() => {
        viewer.resize(containerRef.current.clientWidth, containerRef.current.clientHeight)
      })
      ro.observe(containerRef.current)

      const poseTopic = activePreset?.robotPose?.topic || '/amcl_pose'
      const poseMsg   = activePreset?.robotPose?.msgType || 'geometry_msgs/PoseWithCovarianceStamped'

      const Vec3 = viewer.cameraControls.center.clone().constructor

      const THREEMesh = Object.getPrototypeOf(ROS3D.Arrow)
      const _tmpArrow = new ROS3D.Arrow({ material: ROS3D.makeColorMaterial(0,0,0,0), origin: new Vec3(0,0,0), direction: new Vec3(1,0,0) })
      const THREEGeometry = Object.getPrototypeOf(Object.getPrototypeOf(_tmpArrow.geometry)).constructor
      const THREEFace3    = _tmpArrow.geometry.faces[0].constructor

      const TRI_L = 1.0, TRI_W = 0.7
      const triGeom = new THREEGeometry()
      triGeom.vertices.push(
        new Vec3( TRI_L * 0.65,  0,          0),
        new Vec3(-TRI_L * 0.35,  TRI_W / 2,  0),
        new Vec3(-TRI_L * 0.35, -TRI_W / 2,  0),
      )
      triGeom.faces.push(new THREEFace3(0, 1, 2))
      triGeom.computeFaceNormals()
      const triMat = ROS3D.makeColorMaterial(1.0, 0.0, 0.0, 1.0)
      if (triMat.emissive) triMat.emissive.setRGB(1.0, 0.0, 0.0)
      const triangle = new THREEMesh(triGeom, triMat)
      viewer.scene.add(triangle)

      const poseSub = new ROSLIB.Topic({
        ros:         ros.current,
        name:        poseTopic,
        messageType: poseMsg,
      })
      poseSub.subscribe(msg => {
        const pose = msg.pose?.pose ?? msg.pose
        const { x, y } = pose.position
        const q = pose.orientation
        const yaw = 2 * Math.atan2(q.z, q.w)
        triangle.position.set(x, y, 0.05)
        triangle.rotation.z = yaw
        if (!pausedRef.current) setRobotPos({ x, y, angle: yaw })
      })

      const previewArrow = new ROS3D.Arrow({
        material:  ROS3D.makeColorMaterial(1.0, 0.55, 0.0, 0.85),
        origin:    new Vec3(0, 0, 0),
        direction: new Vec3(1, 0, 0),
      })
      previewArrow.visible = false
      viewer.scene.add(previewArrow)

      const initialPosePub = new ROSLIB.Topic({
        ros:         ros.current,
        name:        activePreset?.initialPose?.topic || '/initialpose',
        messageType: 'geometry_msgs/PoseWithCovarianceStamped',
      })
      initialPosePub.advertise()

      const poseEl = containerRef.current

      const screenToWorld = (clientX, clientY) => {
        const rect = poseEl.getBoundingClientRect()
        const ndcX =  (clientX - rect.left) / rect.width  * 2 - 1
        const ndcY = -((clientY - rect.top)  / rect.height * 2 - 1)
        const v = new Vec3(ndcX, ndcY, 0.5)
        v.unproject(viewer.camera)
        const dir = v.clone().sub(viewer.camera.position).normalize()
        const t   = -viewer.camera.position.z / dir.z
        return { x: viewer.camera.position.x + t * dir.x,
                 y: viewer.camera.position.y + t * dir.y }
      }

      const poseStart = (clientX, clientY) => {
        const { x, y } = screenToWorld(clientX, clientY)
        poseDragRef.current = { startX: x, startY: y }
        previewArrow.position.set(x, y, 0.15)
        previewArrow.visible = true
      }

      const poseMove = (clientX, clientY) => {
        if (!poseDragRef.current) return
        const { x, y } = screenToWorld(clientX, clientY)
        const dx = x - poseDragRef.current.startX
        const dy = y - poseDragRef.current.startY
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len > 0.01) previewArrow.setDirection(new Vec3(dx / len, dy / len, 0))
      }

      const poseEnd = (clientX, clientY) => {
        if (!poseDragRef.current) return
        const { startX, startY } = poseDragRef.current
        const end = screenToWorld(clientX, clientY)
        const dx  = end.x - startX
        const dy  = end.y - startY
        const len = Math.sqrt(dx * dx + dy * dy)
        previewArrow.visible = false
        poseDragRef.current = null
        if (len <= 0.01) return
        const yaw = Math.atan2(dy, dx)
        initialPosePub.publish(new ROSLIB.Message({
          header: { frame_id: 'map', stamp: { sec: 0, nanosec: 0 } },
          pose: {
            pose: {
              position:    { x: startX, y: startY, z: 0 },
              orientation: { x: 0, y: 0, z: Math.sin(yaw / 2), w: Math.cos(yaw / 2) },
            },
            covariance: [
              0.25, 0, 0, 0, 0, 0,
              0, 0.25, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0.06853891945200942,
            ],
          },
        }))
        setPoseMode(false)
        poseModeRef.current = false
        poseEl.style.cursor = ''
      }

      const onPoseMouseDown = (e) => {
        if (!poseModeRef.current || e.button !== 0) return
        e.stopPropagation()
        e.preventDefault()
        poseStart(e.clientX, e.clientY)
      }

      const onPoseMouseMove = (e) => {
        if (!poseModeRef.current || !poseDragRef.current) return
        e.stopPropagation()
        poseMove(e.clientX, e.clientY)
      }

      const onPoseMouseUp = (e) => {
        if (!poseModeRef.current || !poseDragRef.current || e.button !== 0) return
        e.stopPropagation()
        poseEnd(e.clientX, e.clientY)
      }

      const onPoseTouchStart = (e) => {
        if (!poseModeRef.current || e.touches.length !== 1) return
        e.stopPropagation()
        e.preventDefault()
        poseStart(e.touches[0].clientX, e.touches[0].clientY)
      }

      const onPoseTouchMove = (e) => {
        if (!poseModeRef.current || !poseDragRef.current || e.touches.length !== 1) return
        e.stopPropagation()
        e.preventDefault()
        poseMove(e.touches[0].clientX, e.touches[0].clientY)
      }

      const onPoseTouchEnd = (e) => {
        if (!poseModeRef.current || !poseDragRef.current) return
        e.stopPropagation()
        const t = e.changedTouches[0]
        if (t) poseEnd(t.clientX, t.clientY)
      }

      poseEl.addEventListener('mousedown',  onPoseMouseDown,  true)
      poseEl.addEventListener('mousemove',  onPoseMouseMove,  true)
      poseEl.addEventListener('mouseup',    onPoseMouseUp,    true)
      poseEl.addEventListener('touchstart', onPoseTouchStart, { capture: true, passive: false })
      poseEl.addEventListener('touchmove',  onPoseTouchMove,  { capture: true, passive: false })
      poseEl.addEventListener('touchend',   onPoseTouchEnd,   true)
      poseHandlersRef.current = {
        el: poseEl,
        onPoseMouseDown, onPoseMouseMove, onPoseMouseUp,
        onPoseTouchStart, onPoseTouchMove, onPoseTouchEnd,
      }

      instanceRef.current = {
        viewer, gridClient, ro, poseSub, triangle, previewArrow, initialPosePub,
        Vec3, THREEMesh, THREEGeometry, THREEFace3,
      }
      setViewerReady(true)
    })

    return () => {
      cancelled = true
      if (instanceRef.current) {
        const { viewer, gridClient, ro, poseSub, triangle, previewArrow, initialPosePub } = instanceRef.current
        if (poseHandlersRef.current) {
          const { el, onPoseMouseDown, onPoseMouseMove, onPoseMouseUp,
                  onPoseTouchStart, onPoseTouchMove, onPoseTouchEnd } = poseHandlersRef.current
          el.removeEventListener('mousedown',  onPoseMouseDown,  true)
          el.removeEventListener('mousemove',  onPoseMouseMove,  true)
          el.removeEventListener('mouseup',    onPoseMouseUp,    true)
          el.removeEventListener('touchstart', onPoseTouchStart, true)
          el.removeEventListener('touchmove',  onPoseTouchMove,  true)
          el.removeEventListener('touchend',   onPoseTouchEnd,   true)
          poseHandlersRef.current = null
        }
        ro.disconnect()
        gridClient.unsubscribe()
        poseSub.unsubscribe()
        viewer.scene.remove(triangle)
        viewer.scene.remove(previewArrow)
        initialPosePub.unadvertise()
        viewer.stop()
        instanceRef.current = null
      }
      setViewerReady(false)
      poseDragRef.current  = null
      poseModeRef.current  = false
    }
  }, [status])

  // ── ロケーション地点をマップ上にプロットする ──
  // global_position は "x y height yaw" 形式。x, y, yaw を使って向き付きの
  // 三角マーカーをシーンに追加し、名前は画面投影した HTML ラベルで表示する。
  useEffect(() => {
    if (!viewerReady) return
    const inst = instanceRef.current
    const overlay = labelOverlayRef.current
    if (!inst || !overlay) return
    if (!showLocations) return

    const { viewer, Vec3, THREEMesh, THREEGeometry, THREEFace3 } = inst
    const ROS3D = window.ROS3D

    // "x y height yaw" 形式の座標をパースする。x,y が不正なら null
    const parsePos = (str) => {
      const p = String(str).trim().split(/\s+/).map(Number)
      if (!Number.isFinite(p[0]) || !Number.isFinite(p[1])) return null
      return { x: p[0], y: p[1], yaw: Number.isFinite(p[3]) ? p[3] : 0 }
    }

    // room position と location global_position を平坦化する
    const points = []
    ;(locRooms ?? []).forEach(room => {
      const rp = parsePos(room.position)
      if (rp) points.push({ name: room.name || '(無名の部屋)', ...rp, kind: 'room' })
      ;(room.locations ?? []).forEach(loc => {
        const lp = parsePos(loc.global_position)
        if (lp) points.push({ name: loc.name || '(無名)', ...lp, kind: loc.isDoor ? 'door' : 'location' })
      })
    })

    // 種別ごとの見た目（色 / マーカーサイズ / ラベル背景）
    const STYLE = {
      room:     { rgb: [0.18, 0.70, 0.35], triL: 0.95, triW: 0.66, z: 0.03, bg: 'rgba(20,90,45,0.88)' },
      door:     { rgb: [0.95, 0.60, 0.10], triL: 0.60, triW: 0.42, z: 0.04, bg: 'rgba(150,90,10,0.85)' },
      location: { rgb: [0.16, 0.44, 0.85], triL: 0.60, triW: 0.42, z: 0.04, bg: 'rgba(20,50,110,0.85)' },
    }

    const meshes = []
    const labels = []

    points.forEach(pt => {
      const st = STYLE[pt.kind]
      const geom = new THREEGeometry()
      geom.vertices.push(
        new Vec3( st.triL * 0.65,  0,            0),
        new Vec3(-st.triL * 0.35,  st.triW / 2,  0),
        new Vec3(-st.triL * 0.35, -st.triW / 2,  0),
      )
      geom.faces.push(new THREEFace3(0, 1, 2))
      geom.computeFaceNormals()

      const [r, g, b] = st.rgb
      const mat = ROS3D.makeColorMaterial(r, g, b, 1.0)
      if (mat.emissive) mat.emissive.setRGB(r, g, b)
      const mesh = new THREEMesh(geom, mat)
      mesh.position.set(pt.x, pt.y, st.z)
      mesh.rotation.z = pt.yaw
      viewer.scene.add(mesh)
      meshes.push(mesh)

      const el = document.createElement('div')
      el.textContent = pt.kind === 'room' ? `[${pt.name}]` : pt.name
      el.style.cssText =
        'position:absolute;left:0;top:0;padding:1px 5px;white-space:nowrap;' +
        'font-family:var(--mono);border-radius:4px;color:#fff;' +
        'pointer-events:none;will-change:transform;' +
        `font-size:${pt.kind === 'room' ? 12 : 11}px;` +
        `font-weight:${pt.kind === 'room' ? 700 : 400};` +
        `background:${st.bg};`
      overlay.appendChild(el)
      labels.push({ el, x: pt.x, y: pt.y, z: st.z })
    })

    // 毎フレーム world→screen 投影してラベル位置を更新する（カメラ操作に追従）
    let raf
    const tick = () => {
      const cam = viewer.camera
      const w = overlay.clientWidth, h = overlay.clientHeight
      labels.forEach(({ el, x, y, z }) => {
        const v = new Vec3(x, y, z ?? 0.04)
        v.project(cam)
        if (v.z > 1 || v.x < -1.2 || v.x > 1.2 || v.y < -1.2 || v.y > 1.2) {
          el.style.display = 'none'
          return
        }
        const sx = (v.x * 0.5 + 0.5) * w
        const sy = (-v.y * 0.5 + 0.5) * h
        el.style.display = ''
        el.style.transform = `translate(-50%,-150%) translate(${sx}px,${sy}px)`
      })
      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      meshes.forEach(m => viewer.scene.remove(m))
      labels.forEach(({ el }) => el.remove())
    }
  }, [viewerReady, locRooms, showLocations])

  const mapTopic = activePreset?.map?.topic || '/map'

  const robotPosReadout = robotPos && (
    <span style={{
      fontFamily: 'var(--mono)',
      fontSize: 13,
      color: paused ? 'var(--ink-3)' : 'var(--ink-1)',
    }}>
      <span style={{ opacity: 0.6, marginRight: 3 }}>X</span>{robotPos.x.toFixed(3)}
      <span style={{ opacity: 0.6, margin: '0 3px 0 10px' }}>Y</span>{robotPos.y.toFixed(3)}
      <span style={{ opacity: 0.6, margin: '0 3px 0 10px' }}>θ</span>{robotPos.angle.toFixed(3)} rad
    </span>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>
      <div className="page-head">
        <div>
          <h2 className="page-title">マップ</h2>
          <div className="page-sub">
            {mapTab === 'map' ? (
              <>
                {mapTopic}
                <span style={{
                  marginLeft: 10,
                  color: mapStatus === 'received' ? 'var(--accent)' : 'var(--ink-3)',
                  fontFamily: 'var(--mono)',
                }}>
                  {mapStatus === 'received' ? '● 受信済み' : '○ 受信待ち'}
                </span>
              </>
            ) : 'LOCATIONS_XML_EDITOR'}
          </div>
        </div>
        <div className="page-tools">
          {mapTab === 'locations' && robotPosReadout}
          {mapTab === 'map' && (
            <>
              {robotPosReadout}
              <button
                className={`btn${paused ? ' accent' : ''}`}
                disabled={status !== 'connected'}
                onClick={() => setPaused(p => !p)}
              >
                {paused ? '▶ 再開' : '■ 停止'}
              </button>
              <button
                className={`btn${showLocations ? ' accent' : ''}`}
                disabled={!locRooms || locRooms.length === 0}
                title={!locRooms || locRooms.length === 0 ? 'ロケーションタブで XML を読み込むと表示できます' : undefined}
                onClick={() => setShowLocations(s => !s)}
              >
                <I.pin size={12} /> {showLocations ? '地点表示中' : '地点を表示'}
              </button>
              <button
                className={`btn${poseMode ? ' accent' : ''}`}
                disabled={status !== 'connected' || !instanceRef.current}
                onClick={() => {
                  const next = !poseMode
                  setPoseMode(next)
                  poseModeRef.current = next
                  if (instanceRef.current) {
                    containerRef.current.style.cursor = next ? 'crosshair' : ''
                    if (!next) {
                      instanceRef.current.previewArrow.visible = false
                      poseDragRef.current = null
                    }
                  }
                }}
              >
                {poseMode ? '● 位置設定中...' : '初期位置設定'}
              </button>
            </>
          )}
          <div style={{ display: 'flex', gap: 2, border: '1px solid var(--border)', borderRadius: 6, padding: 2 }}>
            <button
              className={`btn sm${mapTab === 'map' ? ' accent' : ''}`}
              onClick={() => setMapTab('map')}
            >
              <I.map size={11} /> マップ
            </button>
            <button
              className={`btn sm${mapTab === 'locations' ? ' accent' : ''}`}
              onClick={() => setMapTab('locations')}
            >
              <I.pin size={11} /> ロケーション
            </button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, position: 'relative', display: mapTab === 'map' ? 'block' : 'none' }}>
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 8,
            overflow: 'hidden',
            background: '#f5f5f5',
          }}
        />
        <div
          ref={labelOverlayRef}
          style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}
        />
      </div>

      {mapTab === 'locations' && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <LocationsEditor pcs={pcs} activePc={activePc} setActivePc={setActivePc} robotPos={robotPos} embedded />
        </div>
      )}
    </div>
  )
}
