import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
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

  const [pcs, setPcs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('erasers.pcs')) || [] } catch { return [] }
  })
  const [activePc, setActivePc] = useState(() => localStorage.getItem('erasers.activePc') || null)
  const [rosbridge, setRosbridge] = useState(() => {
    try { return JSON.parse(localStorage.getItem('erasers.rosbridge')) || { host: "192.168.1.10", port: "9090", ssl: false } } catch { return { host: "192.168.1.10", port: "9090", ssl: false } }
  })

  const pcsRef = useRef(pcs)
  useEffect(() => { pcsRef.current = pcs }, [pcs])

  // pcId と省略可能な host を受け取る。新規追加直後など pcsRef 未反映時は host を直渡しできる
  const checkPcStatus = useCallback(async (pcId, hostOverride) => {
    const host = hostOverride ?? pcsRef.current.find(p => p.id === pcId)?.host
    if (!host) return
    const controller = new AbortController()
    const timerId = setTimeout(() => controller.abort(), 3000)
    let online = false
    try {
      const res = await fetch(`http://${host}:3001/get_execution_config`, { signal: controller.signal })
      online = res.ok
    } catch { /* 到達不可 = offline */ }
    clearTimeout(timerId)
    setPcs(prev => prev.map(p => p.id === pcId ? { ...p, online } : p))
  }, [])

  // 10秒ごとに全PCの接続状態を自動確認
  useEffect(() => {
    const checkAll = () => pcsRef.current.forEach(pc => checkPcStatus(pc.id))
    checkAll()
    const timerId = setInterval(checkAll, 10000)
    return () => clearInterval(timerId)
  }, [checkPcStatus])

  useEffect(() => { localStorage.setItem('erasers.pcs', JSON.stringify(pcs)) }, [pcs])
  useEffect(() => { localStorage.setItem('erasers.rosbridge', JSON.stringify(rosbridge)) }, [rosbridge])
  useEffect(() => {
    if (activePc) localStorage.setItem('erasers.activePc', activePc)
  }, [activePc])

  const [runningTasks, setRunningTasks] = useState({})

  const [topics, setTopics] = useState(() => {
    try { return JSON.parse(localStorage.getItem('erasers.topics')) || [] } catch { return [] }
  })
  useEffect(() => {
    localStorage.setItem('erasers.topics', JSON.stringify(topics.map(t => ({ ...t, messages: [] }))))
  }, [topics])

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
    checkPcStatus,
    runningTasks, setRunningTasks,
    topics, setTopics,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext() {
  return useContext(AppContext)
}
