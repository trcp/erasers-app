import { useEffect, useRef, useState } from 'react'
import ROSLIB from 'roslib'
import { useRos } from '../context/RosContext.jsx'
import { useAppContext } from '../context/AppContext.jsx'

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

export function MapScreen() {
  const { ros, status } = useRos()
  const { activePreset } = useAppContext()
  const containerRef = useRef(null)
  const instanceRef  = useRef(null)
  const fittedRef    = useRef(false)
  const [mapStatus, setMapStatus] = useState('waiting')

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

      // arrow — robot direction indicator
      const arrow = new ROS3D.Arrow({
        material:  ROS3D.makeColorMaterial(0.2, 0.6, 1.0, 1.0),
        origin:    new Vec3(0, 0, 0),
        direction: new Vec3(1, 0, 0),
      })
      viewer.scene.add(arrow)

      // disc — robot body circle, built from bundled THREE.js internals
      const THREEMesh     = Object.getPrototypeOf(ROS3D.Arrow)
      const THREEGeometry = Object.getPrototypeOf(Object.getPrototypeOf(arrow.geometry)).constructor
      const THREEFace3    = arrow.geometry.faces[0].constructor
      const DISC_R = 0.5, DISC_N = 32
      const discGeom = new THREEGeometry()
      discGeom.vertices.push(new Vec3(0, 0, 0))
      for (let i = 0; i <= DISC_N; i++) {
        const a = (i / DISC_N) * Math.PI * 2
        discGeom.vertices.push(new Vec3(DISC_R * Math.cos(a), DISC_R * Math.sin(a), 0))
      }
      for (let i = 0; i < DISC_N; i++) {
        discGeom.faces.push(new THREEFace3(0, i + 1, i + 2))
      }
      discGeom.computeFaceNormals()
      const disc = new THREEMesh(discGeom, ROS3D.makeColorMaterial(0.2, 0.6, 1.0, 1.0))
      viewer.scene.add(disc)

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
        disc.position.set(x, y, 0.05)
        arrow.position.set(x, y, 0.1)
        arrow.setDirection(new Vec3(Math.cos(yaw), Math.sin(yaw), 0))
      })

      instanceRef.current = { viewer, gridClient, ro, poseSub, arrow, disc }
    })

    return () => {
      cancelled = true
      if (instanceRef.current) {
        const { viewer, gridClient, ro, poseSub, arrow, disc } = instanceRef.current
        ro.disconnect()
        gridClient.unsubscribe()
        poseSub.unsubscribe()
        viewer.scene.remove(arrow)
        viewer.scene.remove(disc)
        viewer.stop()
        instanceRef.current = null
      }
    }
  }, [status])

  const mapTopic = activePreset?.map?.topic || '/map'

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="page-head">
        <div>
          <h2 className="page-title">マップ</h2>
          <div className="page-sub">
            {mapTopic}
            <span style={{
              marginLeft: 10,
              color: mapStatus === 'received' ? 'var(--accent)' : 'var(--ink-3)',
              fontFamily: 'var(--mono)',
            }}>
              {mapStatus === 'received' ? '● 受信済み' : '○ 受信待ち'}
            </span>
          </div>
        </div>
      </div>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: 'calc(100vh - 140px)',
          borderRadius: 8,
          overflow: 'hidden',
          background: '#f5f5f5',
        }}
      />
    </div>
  )
}
