import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useTweaks } from '../components/TweaksPanel'
import { defaultPresets } from '../constants/defaultPresets'
import { getServerUrl, fetchNetworkInterfaces, fetchExecutionConfig, saveExecutionConfig } from '../services/erasersApi'

const AppContext = createContext(null)

const TWEAK_DEFAULTS = {
  accent:    "#2871d9",
  density:   "comfortable",
  robotType: localStorage.getItem('erasers.robotType') || "AMR",
}

const DEFAULT_CONTROLS = { maxSpeed: 1.2, maxRot: 90, accel: 1.0 }

// ロケーション編集の永続化データ（erasers.locations）から 1 フィールドを読み出す
function readLoc(key, fallback) {
  try {
    const stored = JSON.parse(localStorage.getItem('erasers.locations'))
    if (stored && typeof stored === 'object' && key in stored) return stored[key]
  } catch { /* ignore */ }
  return fallback
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
  const [allControls, setAllControls] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('erasers.controls'))
      if (stored && typeof stored === 'object' && !Array.isArray(stored)) return stored
    } catch { /* ignore */ }
    return {}
  })
  const controls = allControls[tweaks.robotType] ?? DEFAULT_CONTROLS
  const setControls = useCallback((updater) => {
    setAllControls(prev => {
      const current = prev[tweaks.robotType] ?? DEFAULT_CONTROLS
      const next = typeof updater === 'function' ? updater(current) : updater
      return { ...prev, [tweaks.robotType]: next }
    })
  }, [tweaks.robotType])
  const [mode, setMode]         = useState("auto")
  useEffect(() => { setMode("auto") }, [tweaks.robotType])

  const [waypoints, setWaypoints] = useState([
    { x: 0.30, y: 0.30, label: "WP-1" },
    { x: 0.70, y: 0.30, label: "WP-2" },
    { x: 0.70, y: 0.70, label: "WP-3" },
  ])

  const [utterances, setUtterances] = useState([])
  const [overlayUtterance, setOverlayUtterance] = useState(null)
  const [speechTextOnly, setSpeechTextOnly] = useState(() => localStorage.getItem('erasers.speechTextOnly') === 'true')
  const [overlayImage, setOverlayImage] = useState(null)
  const [imageViewerTopic, setImageViewerTopic] = useState('')
  const [emergencyStop, setEmergencyStop] = useState(null)

  useEffect(() => {
    localStorage.setItem('erasers.speechTextOnly', speechTextOnly ? 'true' : 'false')
  }, [speechTextOnly])

  useEffect(() => {
    if (!overlayUtterance) return
    const k = (e) => e.key === "Escape" && setOverlayUtterance(null)
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [overlayUtterance])

  useEffect(() => {
    if (!overlayImage) return
    const k = (e) => e.key === "Escape" && setOverlayImage(null)
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [overlayImage])

  useEffect(() => {
    if (!emergencyStop || emergencyStop.dismissed) return
    const k = (e) => {
      if (e.key === "Escape") setEmergencyStop(prev => prev ? { ...prev, dismissed: true } : null)
    }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [emergencyStop])

  const [pcs, setPcs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('erasers.pcs')) || [] } catch { return [] }
  })
  const [activePc, setActivePc] = useState(() => localStorage.getItem('erasers.activePc') || null)
  const [rosbridge, setRosbridge] = useState(() => {
    try { return JSON.parse(localStorage.getItem('erasers.rosbridge')) || { host: "192.168.1.10", port: "9090", ssl: false } } catch { return { host: "192.168.1.10", port: "9090", ssl: false } }
  })

  const [robotPresets, setRobotPresets] = useState(() => {
    try {
      const stored = localStorage.getItem('erasers.robotPresets')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed && typeof parsed === 'object') return parsed
      }
    } catch { /* ignore */ }
    return defaultPresets
  })

  // localStorage に保存済みのプリセットがない場合のみ public/robot-presets.json を取得する
  useEffect(() => {
    if (localStorage.getItem('erasers.robotPresets')) return
    fetch('/robot-presets.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setRobotPresets(data) })
      .catch(() => {})
  }, [])

  const pcsRef = useRef(pcs)
  useEffect(() => { pcsRef.current = pcs }, [pcs])

  const robotPresetsRef = useRef(robotPresets)
  useEffect(() => { robotPresetsRef.current = robotPresets }, [robotPresets])

  // ロボットの種類を切り替えたとき、プリセットに rosbridge が設定されていれば自動更新
  useEffect(() => {
    const preset = robotPresetsRef.current[tweaks.robotType]
    if (preset?.rosbridge?.host) {
      setRosbridge(prev => ({
        ...prev,
        host: preset.rosbridge.host,
        port: preset.rosbridge.port ?? prev.port,
      }))
    }
  }, [tweaks.robotType])


  const [rosConfigs, setRosConfigs] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('erasers.rosConfigs'))
      if (stored && typeof stored === 'object') return stored
    } catch { /* ignore */ }
    return {}
  })
  const rosConfigsRef = useRef(rosConfigs)
  useEffect(() => { rosConfigsRef.current = rosConfigs }, [rosConfigs])
  const prevOnlineRef = useRef({})

  const loadRosConfig = useCallback(async (pc, applyStored = false) => {
    try {
      const base = getServerUrl(pc)
      if (applyStored) {
        const stored = rosConfigsRef.current[pc.id]
        if (stored) {
          await saveExecutionConfig(base, { network_if: stored.network_if, ros_master_uri: stored.ros_master_uri })
        }
      }
      const [nifs, cfg] = await Promise.all([fetchNetworkInterfaces(base), fetchExecutionConfig(base)])
      const selectedIf = nifs.interfaces.find(n => n.name === cfg.network_if)
      setRosConfigs(prev => ({
        ...prev,
        [pc.id]: { network_if: cfg.network_if, ros_master_uri: cfg.ros_master_uri, ip: selectedIf?.ip ?? "" },
      }))
    } catch { /* 通信エラーは無視 */ }
  }, [])

  useEffect(() => {
    pcs.forEach(pc => {
      const wasOnline = prevOnlineRef.current[pc.id]
      if (pc.online && !wasOnline) loadRosConfig(pc, true)
      prevOnlineRef.current[pc.id] = pc.online
    })
  }, [pcs, loadRosConfig])

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

  // PCが存在するのに選択がない（または選択済みIDが削除済み）場合は先頭を自動選択
  useEffect(() => {
    if (pcs.length === 0) return
    if (!activePc || !pcs.find(p => p.id === activePc)) {
      setActivePc(pcs[0].id)
    }
  }, [pcs, activePc])

  useEffect(() => { localStorage.setItem('erasers.rosbridge', JSON.stringify(rosbridge)) }, [rosbridge])
  useEffect(() => { localStorage.setItem('erasers.robotPresets', JSON.stringify(robotPresets)) }, [robotPresets])
  useEffect(() => { localStorage.setItem('erasers.controls', JSON.stringify(allControls)) }, [allControls])
  useEffect(() => { localStorage.setItem('erasers.rosConfigs', JSON.stringify(rosConfigs)) }, [rosConfigs])
  useEffect(() => { localStorage.setItem('erasers.robotType', tweaks.robotType) }, [tweaks.robotType])
  useEffect(() => {
    const keys = Object.keys(robotPresets)
    if (keys.length > 0 && !robotPresets[tweaks.robotType]) {
      setTweak('robotType', keys[0])
    }
  }, [robotPresets, tweaks.robotType])
  useEffect(() => {
    if (activePc) localStorage.setItem('erasers.activePc', activePc)
  }, [activePc])

  const [runningTasks, setRunningTasks] = useState({})

  const [gamepadName, setGamepadName] = useState(null)
  const [gamepadJoy, setGamepadJoy] = useState({ lin: { x: 0, y: 0 }, rot: { x: 0, y: 0 } })
  const [gamepadLbPressed, setGamepadLbPressed] = useState(false)

  const [allTopics, setAllTopics] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('erasers.topics'))
      if (stored && typeof stored === 'object' && !Array.isArray(stored)) return stored
    } catch { /* ignore */ }
    return {}
  })
  const topics = allTopics[tweaks.robotType] ?? []
  const setTopics = useCallback((updater) => {
    setAllTopics(prev => {
      const current = prev[tweaks.robotType] ?? []
      const next = typeof updater === 'function' ? updater(current) : updater
      return { ...prev, [tweaks.robotType]: next }
    })
  }, [tweaks.robotType])
  useEffect(() => {
    localStorage.setItem('erasers.topics', JSON.stringify(
      Object.fromEntries(
        Object.entries(allTopics).map(([k, v]) => [k, v.map(t => ({ ...t, messages: [] }))])
      )
    ))
  }, [allTopics])

  const activePreset = robotPresets[tweaks.robotType] ?? defaultPresets[tweaks.robotType]

  // ── ロケーション編集の状態 ──
  // ページ移動だけでなくリロードもまたいで保持するため localStorage に永続化する
  const [locRooms, setLocRooms]               = useState(() => readLoc('rooms', null))
  const [locRawText, setLocRawText]           = useState(() => readLoc('rawText', ""))
  const [locSourceMode, setLocSourceMode]     = useState(() => readLoc('sourceMode', null)) // null=未初期化（初回マウント時にPC有無で決定）
  const [locPath, setLocPath]                 = useState(() => readLoc('path', ""))
  const [locFileName, setLocFileName]         = useState(() => readLoc('fileName', ""))
  const [locCollapsed, setLocCollapsed]       = useState(() => readLoc('collapsed', {}))

  useEffect(() => {
    localStorage.setItem('erasers.locations', JSON.stringify({
      rooms: locRooms, rawText: locRawText, sourceMode: locSourceMode,
      path: locPath, fileName: locFileName, collapsed: locCollapsed,
    }))
  }, [locRooms, locRawText, locSourceMode, locPath, locFileName, locCollapsed])

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
    speechTextOnly, setSpeechTextOnly,
    overlayImage, setOverlayImage,
    imageViewerTopic, setImageViewerTopic,
    emergencyStop, setEmergencyStop,
    pcs, setPcs,
    activePc, setActivePc,
    rosbridge, setRosbridge,
    checkPcStatus,
    rosConfigs, loadRosConfig,
    runningTasks, setRunningTasks,
    topics, setTopics,
    robotPresets, setRobotPresets,
    activePreset,
    gamepadName, setGamepadName,
    gamepadJoy, setGamepadJoy,
    gamepadLbPressed, setGamepadLbPressed,
    locRooms, setLocRooms,
    locRawText, setLocRawText,
    locSourceMode, setLocSourceMode,
    locPath, setLocPath,
    locFileName, setLocFileName,
    locCollapsed, setLocCollapsed,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext() {
  return useContext(AppContext)
}
