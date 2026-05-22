import { createContext, useContext, useState, useEffect } from 'react'
import { useTweaks } from '../components/TweaksPanel'

const AppContext = createContext(null)

const TWEAK_DEFAULTS = {
  accent:    "#2871d9",
  density:   "comfortable",
  robotType: "AMR",
}

export function AppProvider({ children }) {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS)
  const [screen, setScreen]   = useState("speech")

  const [menuOpen, setMenuOpen] = useState(false)
  const [telemetry, setTelemetry] = useState({
    battery: 0, temp: 0, speed: 0, signal: 0, uptime: "—", cpu: 0,
    pose: { x: 0, y: 0, t: 0 },
    path: [],
  })
  const [controls, setControls] = useState({ maxSpeed: 1.2, maxRot: 90, accel: 1.0 })
  const [mode, setMode]         = useState("auto")
  useEffect(() => { setMode("auto") }, [tweaks.robotType])

  const [waypoints, setWaypoints] = useState([
    { x: 0.30, y: 0.30, label: "WP-1" },
    { x: 0.70, y: 0.30, label: "WP-2" },
    { x: 0.70, y: 0.70, label: "WP-3" },
  ])

  const [utterances, setUtterances] = useState([])
  const [overlayUtterance, setOverlayUtterance] = useState(null)

  useEffect(() => {
    if (!overlayUtterance) return
    const k = (e) => e.key === "Escape" && setOverlayUtterance(null)
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [overlayUtterance])

  const [pcs, setPcs] = useState([
    { id: "pc-1", name: "robot-pc-01",  host: "192.168.1.20", os: "Ubuntu 22.04", rosVersion: "ROS2 Humble", online: true },
    { id: "pc-2", name: "robot-pc-02",  host: "192.168.1.21", os: "Ubuntu 22.04", rosVersion: "ROS2 Humble", online: true },
    { id: "pc-3", name: "operator-mac", host: "192.168.1.30", os: "macOS 14",     rosVersion: "ROS2 Iron",   online: false },
  ])
  const [activePc, setActivePc]   = useState("pc-1")
  const [rosbridge, setRosbridge] = useState({ host: "192.168.1.10", port: "9090", ssl: false })

  const [runningTasks, setRunningTasks] = useState({
    "pc-1": [
      { id: "p4", pkg: "rosbridge_server", file: "rosbridge_websocket.launch", startedAt: new Date(Date.now() - 1200000), pid: 12453 },
      { id: "p6", pkg: "robot_state_pub",  file: "rsp.launch.py",              startedAt: new Date(Date.now() - 1100000), pid: 12891 },
    ],
    "pc-2": [],
    "pc-3": [],
  })

  const [topics, setTopics] = useState([
    { id: 101, name: "/cmd_vel",      type: "geometry_msgs/Twist",   direction: "pub", active: true, messages: [] },
    { id: 102, name: "/odom",         type: "nav_msgs/Odometry",     direction: "sub", active: true, messages: [] },
    { id: 103, name: "/scan",         type: "sensor_msgs/LaserScan", direction: "sub", active: true, messages: [] },
    { id: 104, name: "/robot/speech", type: "std_msgs/String",       direction: "sub", active: true, messages: [] },
  ])

  const value = {
    tweaks, setTweak,
    screen, setScreen,
    menuOpen, setMenuOpen,
    telemetry, setTelemetry,
    controls, setControls,
    mode, setMode,
    waypoints, setWaypoints,
    utterances, setUtterances,
    overlayUtterance, setOverlayUtterance,
    pcs, setPcs,
    activePc, setActivePc,
    rosbridge, setRosbridge,
    runningTasks, setRunningTasks,
    topics, setTopics,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext() {
  return useContext(AppContext)
}
