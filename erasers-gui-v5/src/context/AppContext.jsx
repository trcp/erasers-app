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

  const [pcs, setPcs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('erasers.pcs')) || [] } catch { return [] }
  })
  const [activePc, setActivePc] = useState(() => localStorage.getItem('erasers.activePc') || null)
  const [rosbridge, setRosbridge] = useState({ host: "192.168.1.10", port: "9090", ssl: false })

  useEffect(() => { localStorage.setItem('erasers.pcs', JSON.stringify(pcs)) }, [pcs])
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
    runningTasks, setRunningTasks,
    topics, setTopics,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext() {
  return useContext(AppContext)
}
