import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useTweaks } from '../components/TweaksPanel'

const AppContext = createContext(null)

const TWEAK_DEFAULTS = {
  accent:    "#2871d9",
  density:   "comfortable",
  robotType: "AMR",
}

function useTelemetry() {
  const [t, setT] = useState(() => ({
    battery: 78, temp: 42.3, speed: 0.85, signal: -58, uptime: "12.4", cpu: 34,
    pose: { x: 0.5, y: 0.5, t: 0 },
    path: [[0.5, 0.5], [0.6, 0.4], [0.7, 0.3], [0.78, 0.5], [0.8, 0.7], [0.65, 0.75], [0.5, 0.5]],
  }))
  useEffect(() => {
    const id = setInterval(() => {
      setT(prev => {
        const np = { ...prev }
        np.battery = Math.max(5, prev.battery - 0.02)
        np.temp    = 40 + Math.sin(Date.now() / 8000) * 6 + Math.random() * 0.5
        np.speed   = Math.max(0, 0.85 + Math.sin(Date.now() / 3000) * 0.4)
        np.signal  = -58 + Math.floor(Math.random() * 5)
        np.cpu     = Math.round(Math.max(20, Math.min(95, 34 + Math.sin(Date.now() / 5000) * 15 + (Math.random() - 0.5) * 6)))
        const tt = (Date.now() / 18000) % 1
        const i  = Math.floor(tt * (prev.path.length - 1))
        const f  = tt * (prev.path.length - 1) - i
        const p0 = prev.path[i], p1 = prev.path[Math.min(i + 1, prev.path.length - 1)]
        np.pose = {
          x: p0[0] + (p1[0] - p0[0]) * f,
          y: p0[1] + (p1[1] - p0[1]) * f,
          t: Math.atan2(p1[1] - p0[1], p1[0] - p0[0]),
        }
        return np
      })
    }, 600)
    return () => clearInterval(id)
  }, [])
  return [t, setT]
}

export function AppProvider({ children }) {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS)
  const [screen, setScreen]   = useState("speech")
  const screenRef = useRef(screen)
  useEffect(() => { screenRef.current = screen }, [screen])

  const [menuOpen, setMenuOpen] = useState(false)
  const [telemetry]             = useTelemetry()
  const [controls, setControls] = useState({ maxSpeed: 1.2, maxRot: 90, accel: 1.0 })
  const [mode, setMode]         = useState("auto")
  useEffect(() => { setMode("auto") }, [tweaks.robotType])

  const [waypoints, setWaypoints] = useState([
    { x: 0.30, y: 0.30, label: "WP-1" },
    { x: 0.70, y: 0.30, label: "WP-2" },
    { x: 0.70, y: 0.70, label: "WP-3" },
  ])

  const [utterances, setUtterances] = useState([
    { id: 1, text: "こんにちは、本日はどのようなご用件でしょうか？", time: new Date(Date.now() - 32000), source: "auto" },
    { id: 2, text: "目的地のB棟へ向かいます。", time: new Date(Date.now() - 120000), source: "auto" },
    { id: 3, text: "バッテリー残量が35%を下回りました。", time: new Date(Date.now() - 280000), source: "auto" },
  ])
  const [overlayUtterance, setOverlayUtterance] = useState(null)

  useEffect(() => {
    const phrases = [
      "目的地のB棟へ向かいます。",
      "障害物を検出しました。回避動作を開始します。",
      "充電ステーションに到着しました。",
      "本日のタスクを開始します。",
      "バッテリー残量が30%を下回りました。充電を推奨します。",
      "ウェイポイントWP-3に到達しました。",
      "人を検知しました。一時停止します。",
      "ジョブ JB-104 を完了しました。",
      "起動診断を完了しました。すべてのサブシステムは正常です。",
      "ご用件をうかがいます。",
    ]
    let timer
    const tick = () => {
      const text = phrases[Math.floor(Math.random() * phrases.length)]
      const u = { id: Date.now() + Math.random(), text, time: new Date(), source: "auto" }
      setUtterances(prev => [u, ...prev].slice(0, 50))
      if (screenRef.current === "speech") setOverlayUtterance(u)
      timer = setTimeout(tick, 20000 + Math.random() * 22000)
    }
    timer = setTimeout(tick, 5500)
    return () => clearTimeout(timer)
  }, [])

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
    telemetry,
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
