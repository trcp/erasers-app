import { useState, useEffect, useRef } from 'react'
import { AppProvider, useAppContext } from './context/AppContext'
import { RosProvider, useRos } from './context/RosContext'
import { useRosTopic } from './hooks/useRosTopic'
import { TweaksPanel, TweakSection, TweakColor, TweakRadio, TweakSelect } from './components/TweaksPanel'
import { Speech, UtteranceOverlay } from './screens/Speech'
import { Remote } from './screens/Remote'
import { MapScreen } from './screens/MapScreen'
import { Tasks } from './screens/Tasks'
import { Logs } from './screens/Logs'
import { Settings } from './screens/Settings'
import { ROBOT_TYPES, ACCENTS, applyTokens } from './constants/theme'
import I from './icons.jsx'

const NAV = [
  { id: "speech",   label: "発話モニター", icon: I.speech,   group: "main" },
  { id: "remote",   label: "遠隔操作",     icon: I.joystick, group: "main" },
  { id: "map",      label: "マップ",       icon: I.map,      group: "main" },
  { id: "tasks",    label: "タスク",       icon: I.tasks,    group: "main" },
  { id: "logs",     label: "ログ",         icon: I.logs,     group: "system" },
  { id: "settings", label: "設定",         icon: I.settings, group: "system" },
]

function TopBar({ onMenu }) {
  const { tweaks, telemetry, rosbridge } = useAppContext()
  const { status } = useRos()
  const r = ROBOT_TYPES[tweaks.robotType] || ROBOT_TYPES["AMR"]
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const bridgeCls = status === 'connected' ? 'ok' : status === 'connecting' ? 'connecting' : 'off'

  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" onClick={onMenu} aria-label="メニュー">
        <I.menu size={18} />
      </button>
      <div className="brand">
        <div className="brand-mark">R</div>
        <div className="brand-text">
          <div className="brand-name">ROBOT//OPS</div>
          <div className="brand-sub">v5.0 · {r.series}</div>
        </div>
      </div>

      <div className="top-spacer" />

      <div className="top-stat">
        <span><span className="k">BAT</span><span className="v" style={{ color: telemetry.battery < 35 ? "var(--warn)" : null }}>{telemetry.battery.toFixed(0)}%</span></span>
        <span><span className="k">LAT</span><span className="v">28ms</span></span>
        <span><span className="v">{time.toLocaleTimeString("ja-JP", { hour12: false })}</span></span>
      </div>

      <div
        className={`bridge-pill ${bridgeCls}`}
        title={`${rosbridge.ssl ? "wss" : "ws"}://${rosbridge.host}:${rosbridge.port} · ${status}`}
      >
        <span className="bridge-led" />
        <span className="bridge-text">rosbridge</span>
        <span className="bridge-host mono">{rosbridge.host}</span>
      </div>
    </header>
  )
}

function Drawer({ open, onClose }) {
  const { screen, setScreen } = useAppContext()

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [open])

  useEffect(() => {
    if (!open) return
    const k = (e) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [open, onClose])

  return (
    <>
      <div className={`drawer-backdrop ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`drawer ${open ? "open" : ""}`}>
        <div className="drawer-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="brand-mark">R</div>
            <span style={{ fontFamily: "var(--mono)", fontWeight: 600, fontSize: 13 }}>ROBOT//OPS</span>
          </div>
          <button className="icon-btn" onClick={onClose}><I.x size={14} /></button>
        </div>
        <div className="drawer-body">
          <div className="nav-label">操作</div>
          {NAV.filter(n => n.group === "main").map(n => (
            <button key={n.id} onClick={() => { setScreen(n.id); onClose() }}
              className={`nav-item ${screen === n.id ? "active" : ""}`}>
              <n.icon size={18} /> {n.label}
              {screen === n.id ? <I.chevRight size={12} style={{ marginLeft: "auto", opacity: 0.6 }} /> : null}
            </button>
          ))}
          <div className="nav-label">システム</div>
          {NAV.filter(n => n.group === "system").map(n => (
            <button key={n.id} onClick={() => { setScreen(n.id); onClose() }}
              className={`nav-item ${screen === n.id ? "active" : ""}`}>
              <n.icon size={18} /> {n.label}
              {screen === n.id ? <I.chevRight size={12} style={{ marginLeft: "auto", opacity: 0.6 }} /> : null}
            </button>
          ))}
        </div>
        <div className="drawer-foot">
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", display: "grid", gap: 4 }}>
            <div>ROS2 / Humble · DDS</div>
            <div>ESC でメニューを閉じる</div>
          </div>
        </div>
      </aside>
    </>
  )
}

function TweaksContent() {
  const { tweaks, setTweak } = useAppContext()
  return (
    <>
      <TweakSection label="外観">
        <TweakColor label="アクセント色" value={tweaks.accent}
          onChange={v => setTweak("accent", v)} options={Object.keys(ACCENTS)} />
        <TweakRadio label="UI密度" value={tweaks.density} onChange={v => setTweak("density", v)}
          options={[
            { value: "compact",     label: "密" },
            { value: "comfortable", label: "標準" },
            { value: "spacious",    label: "疎" },
          ]} />
      </TweakSection>
      <TweakSection label="ロボットタイプ">
        <TweakSelect label="種別" value={tweaks.robotType} onChange={v => setTweak("robotType", v)}
          options={[
            { value: "AMR",   label: "移動ロボット (AMR)" },
            { value: "ARM",   label: "ロボットアーム" },
            { value: "DRONE", label: "ドローン" },
            { value: "QUAD",  label: "四足歩行" },
            { value: "FLEET", label: "フリート (複数台)" },
          ]} />
      </TweakSection>
    </>
  )
}

function RosSync() {
  const { setTelemetry, setUtterances, setOverlayUtterance, screen } = useAppContext()
  const screenRef = useRef(screen)
  useEffect(() => { screenRef.current = screen }, [screen])

  const { message: battMsg }   = useRosTopic('/battery_state', 'sensor_msgs/BatteryState')
  const { message: odomMsg }   = useRosTopic('/odom', 'nav_msgs/Odometry', 'subscribe', 100)
  const { message: tempMsg }   = useRosTopic('/temperature', 'sensor_msgs/Temperature')
  const { message: cpuMsg }    = useRosTopic('/cpu_usage', 'std_msgs/Float64')
  const { message: wifiMsg }   = useRosTopic('/wifi_signal', 'std_msgs/Int32')
  const { message: speechMsg } = useRosTopic('/robot/speech', 'std_msgs/String')

  useEffect(() => {
    if (battMsg == null) return
    setTelemetry(prev => ({ ...prev, battery: battMsg.percentage * 100 }))
  }, [battMsg])

  useEffect(() => {
    if (!odomMsg) return
    const { x, y, z, w } = odomMsg.pose.pose.orientation
    const yaw = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z))
    setTelemetry(prev => ({
      ...prev,
      speed: Math.abs(odomMsg.twist.twist.linear.x),
      pose: { x: odomMsg.pose.pose.position.x, y: odomMsg.pose.pose.position.y, t: yaw },
    }))
  }, [odomMsg])

  useEffect(() => {
    if (!tempMsg) return
    setTelemetry(prev => ({ ...prev, temp: tempMsg.temperature }))
  }, [tempMsg])

  useEffect(() => {
    if (cpuMsg == null) return
    setTelemetry(prev => ({ ...prev, cpu: cpuMsg.data }))
  }, [cpuMsg])

  useEffect(() => {
    if (wifiMsg == null) return
    setTelemetry(prev => ({ ...prev, signal: wifiMsg.data }))
  }, [wifiMsg])

  useEffect(() => {
    if (!speechMsg) return
    const u = { id: Date.now() + Math.random(), text: speechMsg.data, time: new Date(), source: 'auto' }
    setUtterances(prev => [u, ...prev].slice(0, 50))
    if (screenRef.current === 'speech') setOverlayUtterance(u)
  }, [speechMsg])

  return null
}

function AppShell() {
  const {
    tweaks, setTweak, screen, setScreen,
    telemetry, controls, setControls,
    mode, setMode, waypoints, setWaypoints,
    utterances, setUtterances, overlayUtterance, setOverlayUtterance,
    pcs, setPcs, activePc, setActivePc,
    rosbridge, setRosbridge,
    runningTasks, setRunningTasks,
    topics, setTopics,
  } = useAppContext()

  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { applyTokens(tweaks) }, [tweaks.accent, tweaks.density])

  const connected = pcs.find(p => p.id === activePc)?.online ?? false
  const activePcName = pcs.find(p => p.id === activePc)?.name || "—"

  let body
  if (screen === "speech")        body = <Speech utterances={utterances} pcName={activePcName} onReplay={setOverlayUtterance} />
  else if (screen === "remote")   body = <Remote telemetry={telemetry} controls={controls} setControls={setControls} topics={topics} setTopics={setTopics} rosbridgeUrl={`${rosbridge.ssl ? "wss" : "ws"}://${rosbridge.host}:${rosbridge.port}`} pcName={activePcName} connected={connected} robotType={tweaks.robotType} mode={mode} setMode={setMode} />
  else if (screen === "map")      body = <MapScreen telemetry={telemetry} waypoints={waypoints} setWaypoints={setWaypoints} />
  else if (screen === "tasks")    body = <Tasks runningTasks={runningTasks} setRunningTasks={setRunningTasks} pcs={pcs} activePc={activePc} setActivePc={setActivePc} />
  else if (screen === "logs")     body = <Logs />
  else if (screen === "settings") body = <Settings controls={controls} setControls={setControls} rosbridge={rosbridge} setRosbridge={setRosbridge} pcs={pcs} setPcs={setPcs} activePc={activePc} setActivePc={setActivePc} robotType={tweaks.robotType} setRobotType={v => setTweak("robotType", v)} />

  return (
    <>
      <RosSync />
      <div className="shell" data-screen={screen}>
        <TopBar onMenu={() => setMenuOpen(true)} />
        <main className="main" data-screen={screen}>{body}</main>
      </div>
      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      {overlayUtterance && screen === "speech" && (
        <UtteranceOverlay utterance={overlayUtterance} onClose={() => setOverlayUtterance(null)} />
      )}
      <TweaksPanel title="Tweaks">
        <TweaksContent />
      </TweaksPanel>
    </>
  )
}

function RosProviderBridge() {
  const { rosbridge } = useAppContext()
  return (
    <RosProvider config={rosbridge}>
      <AppShell />
    </RosProvider>
  )
}

export default function App() {
  return (
    <AppProvider>
      <RosProviderBridge />
    </AppProvider>
  )
}
