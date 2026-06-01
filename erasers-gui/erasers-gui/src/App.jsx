import { useState, useEffect, useRef, useCallback } from 'react'
import { AppProvider, useAppContext } from './context/AppContext'
import { RosProvider, useRos } from './context/RosContext'
import { useRosTopic } from './hooks/useRosTopic'
import { TweaksPanel, TweakSection, TweakColor, TweakRadio, TweakSelect } from './components/TweaksPanel'
import { Speech, UtteranceOverlay } from './screens/Speech'
import { Remote } from './screens/Remote'
import { MapScreen } from './screens/MapScreen'
import { Tasks } from './screens/Tasks'
import { Settings } from './screens/Settings'
import { ROBOT_TYPES, ACCENTS, applyTokens } from './constants/theme'
import I from './icons.jsx'

const NAV = [
  { id: "speech",   label: "発話モニター", icon: I.speech,   group: "main" },
  { id: "remote",   label: "遠隔操作",     icon: I.joystick, group: "main" },
  { id: "map",      label: "マップ",       icon: I.map,      group: "main" },
  { id: "tasks",    label: "タスク",       icon: I.tasks,    group: "main" },
  { id: "settings", label: "設定",         icon: I.settings, group: "system" },
]

function TopBar({ onMenu }) {
  const { tweaks, telemetry, rosbridge, activePreset } = useAppContext()
  const { status, connect } = useRos()
  const robotLabel = activePreset?.label ?? tweaks.robotType
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
          <div className="brand-sub">v5.0 · {robotLabel}</div>
        </div>
      </div>

      <div className="top-spacer" />

      <div className="top-stat">
        <span><span className="k">BAT</span><span className="v" style={{ color: telemetry.battery < 35 ? "var(--warn)" : null }}>{telemetry.battery.toFixed(0)}%</span></span>
        <span><span className="k">LAT</span><span className="v">28ms</span></span>
        <span><span className="v">{time.toLocaleTimeString("ja-JP", { hour12: false })}</span></span>
      </div>

      <button
        className={`bridge-pill ${bridgeCls}`}
        title={`${rosbridge.ssl ? "wss" : "ws"}://${rosbridge.host}:${rosbridge.port} · ${status}`}
        onClick={() => connect(rosbridge)}
        style={{ cursor: 'pointer' }}
      >
        <span className="bridge-led" />
        <span className="bridge-text">rosbridge</span>
        <span className="bridge-host mono">{rosbridge.host}</span>
      </button>
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
            <div>ESC でメニューを閉じる</div>
          </div>
        </div>
      </aside>
    </>
  )
}

function TweaksContent() {
  const { tweaks, setTweak, robotPresets } = useAppContext()
  const robotOptions = Object.keys(robotPresets).map(key => ({
    value: key,
    label: robotPresets[key]?.label ?? key,
  }))
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
          options={robotOptions} />
      </TweakSection>
    </>
  )
}

const GAMEPAD_DEADZONE = 0.08
function applyDeadzone(v) {
  return Math.abs(v) < GAMEPAD_DEADZONE ? 0 : (v - Math.sign(v) * GAMEPAD_DEADZONE) / (1 - GAMEPAD_DEADZONE)
}

function GlobalGamepad() {
  const { activePreset, controls, setGamepadName, setGamepadJoy, setGamepadLbPressed } = useAppContext()
  const cmdVelTopic   = activePreset?.cmdVel?.topic   ?? '/cmd_vel'
  const cmdVelMsgType = activePreset?.cmdVel?.msgType ?? 'geometry_msgs/Twist'
  const { publish } = useRosTopic(cmdVelTopic, cmdVelMsgType, 'publish')

  const gamepadIndexRef = useRef(null)
  const gamepadNameRef  = useRef(null)
  const rafRef          = useRef(null)
  const linRef          = useRef({ x: 0, y: 0 })
  const rotRef          = useRef({ x: 0, y: 0 })
  const controlsRef     = useRef(controls)
  const publishRef      = useRef(publish)
  useEffect(() => { controlsRef.current = controls }, [controls])
  useEffect(() => { publishRef.current = publish }, [publish])

  const publishCurrent = useCallback(() => {
    publishRef.current({
      linear:  { x: linRef.current.y * controlsRef.current.maxSpeed, y: -linRef.current.x * controlsRef.current.maxSpeed, z: 0 },
      angular: { x: 0, y: 0, z: -rotRef.current.x * controlsRef.current.maxRot * Math.PI / 180 },
    })
  }, [])

  useEffect(() => {
    const onConnect = (e) => {
      gamepadIndexRef.current = e.gamepad.index
      gamepadNameRef.current  = e.gamepad.id || 'Gamepad'
      setGamepadName(gamepadNameRef.current)
    }
    const onDisconnect = (e) => {
      if (gamepadIndexRef.current === e.gamepad.index) {
        gamepadIndexRef.current = null
        gamepadNameRef.current  = null
        linRef.current = { x: 0, y: 0 }
        rotRef.current = { x: 0, y: 0 }
        setGamepadName(null)
        setGamepadJoy({ lin: { x: 0, y: 0 }, rot: { x: 0, y: 0 } })
        setGamepadLbPressed(false)
        publishRef.current({ linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } })
      }
    }
    window.addEventListener('gamepadconnected', onConnect)
    window.addEventListener('gamepaddisconnected', onDisconnect)
    const existing = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null
    if (existing) {
      gamepadIndexRef.current = existing.index
      gamepadNameRef.current  = existing.id || 'Gamepad'
      setGamepadName(gamepadNameRef.current)
    }
    return () => {
      window.removeEventListener('gamepadconnected', onConnect)
      window.removeEventListener('gamepaddisconnected', onDisconnect)
    }
  }, [setGamepadName, setGamepadJoy, setGamepadLbPressed])

  useEffect(() => {
    const startPoll = () => {
      let prev = [0, 0, 0]
      let prevLb = false
      const poll = () => {
        if (gamepadIndexRef.current == null) { rafRef.current = null; return }
        const gp = (navigator.getGamepads?.() ?? [])[gamepadIndexRef.current]
        if (gp) {
          const lb = gp.buttons[4]?.pressed ?? false
          if (lb !== prevLb) setGamepadLbPressed(lb)

          if (lb) {
            const rightXIdx = gp.mapping === 'standard' ? 2 : 3
            const ax0 = applyDeadzone(gp.axes[0] ?? 0)
            const ax1 = applyDeadzone(gp.axes[1] ?? 0)
            const ax2 = applyDeadzone(gp.axes[rightXIdx] ?? 0)
            if (ax0 !== prev[0] || ax1 !== prev[1]) {
              linRef.current = { x: ax0, y: -ax1 }
              setGamepadJoy(j => ({ ...j, lin: { x: ax0, y: -ax1 } }))
            }
            if (ax2 !== prev[2]) {
              rotRef.current = { x: ax2, y: 0 }
              setGamepadJoy(j => ({ ...j, rot: { x: ax2, y: 0 } }))
            }
            if (ax0 !== prev[0] || ax1 !== prev[1] || ax2 !== prev[2]) publishCurrent()
            prev = [ax0, ax1, ax2]
          } else {
            // LB を離したらロボットを停止
            if (prevLb || linRef.current.x !== 0 || linRef.current.y !== 0 || rotRef.current.x !== 0) {
              linRef.current = { x: 0, y: 0 }
              rotRef.current = { x: 0, y: 0 }
              setGamepadJoy({ lin: { x: 0, y: 0 }, rot: { x: 0, y: 0 } })
              publishRef.current({ linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } })
            }
            prev = [0, 0, 0]
          }
          prevLb = lb
        }
        rafRef.current = requestAnimationFrame(poll)
      }
      rafRef.current = requestAnimationFrame(poll)
    }

    const onConnect = () => { if (!rafRef.current) startPoll() }
    window.addEventListener('gamepadconnected', onConnect)
    if (gamepadIndexRef.current != null && !rafRef.current) startPoll()
    return () => {
      window.removeEventListener('gamepadconnected', onConnect)
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    }
  }, [publishCurrent, setGamepadJoy, setGamepadLbPressed])

  // 非ゼロの間は 20Hz でパブリッシュし続ける
  useEffect(() => {
    const id = setInterval(() => {
      const { x: lx, y: ly } = linRef.current
      const { x: rx }        = rotRef.current
      if (lx !== 0 || ly !== 0 || rx !== 0) publishCurrent()
    }, 50)
    return () => clearInterval(id)
  }, [publishCurrent])

  return null
}

function RosSync() {
  const { setTelemetry, setUtterances, setOverlayUtterance, screen, activePreset } = useAppContext()
  const screenRef = useRef(screen)
  useEffect(() => { screenRef.current = screen }, [screen])

  const speechTopic   = activePreset?.speech?.topic   ?? '/robot/speech'
  const speechMsgType = activePreset?.speech?.msgType ?? 'std_msgs/String'
  const batteryTopic   = activePreset?.battery?.topic   ?? '/battery_state'
  const batteryMsgType = activePreset?.battery?.msgType ?? 'sensor_msgs/BatteryState'

  const { message: battMsg }   = useRosTopic(batteryTopic, batteryMsgType)
  const { message: odomMsg }   = useRosTopic('/odom', 'nav_msgs/Odometry', 'subscribe', 100)
  const { message: tempMsg }   = useRosTopic('/temperature', 'sensor_msgs/Temperature')
  const { message: cpuMsg }    = useRosTopic('/cpu_usage', 'std_msgs/Float64')
  const { message: wifiMsg }   = useRosTopic('/wifi_signal', 'std_msgs/Int32')
  const { message: speechMsg } = useRosTopic(speechTopic, speechMsgType)

  useEffect(() => {
    if (battMsg == null) return
    // sensor_msgs/BatteryState: percentage は 0-1
    // std_msgs/Float32, Float64 など: data は 0-100 想定
    const pct = battMsg.percentage != null
      ? battMsg.percentage * 100
      : battMsg.data != null
      ? battMsg.data
      : null
    if (pct != null) setTelemetry(prev => ({ ...prev, battery: pct }))
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
    if (!speechMsg?.data) return
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

  const activePcName = pcs.find(p => p.id === activePc)?.name || "—"

  let body
  if (screen === "speech")        body = <Speech utterances={utterances} pcName={activePcName} onReplay={setOverlayUtterance} />
  else if (screen === "remote")   body = <Remote telemetry={telemetry} controls={controls} setControls={setControls} topics={topics} setTopics={setTopics} rosbridgeUrl={`${rosbridge.ssl ? "wss" : "ws"}://${rosbridge.host}:${rosbridge.port}`} pcName={activePcName} robotType={tweaks.robotType} mode={mode} setMode={setMode} />
  else if (screen === "map")      body = <MapScreen />
  else if (screen === "tasks")    body = <Tasks runningTasks={runningTasks} setRunningTasks={setRunningTasks} pcs={pcs} activePc={activePc} setActivePc={setActivePc} />
  else if (screen === "settings") body = <Settings controls={controls} setControls={setControls} rosbridge={rosbridge} setRosbridge={setRosbridge} pcs={pcs} setPcs={setPcs} activePc={activePc} setActivePc={setActivePc} robotType={tweaks.robotType} setRobotType={v => setTweak("robotType", v)} />

  return (
    <>
      <RosSync />
      <GlobalGamepad />
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
