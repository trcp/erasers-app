import { useState, useEffect, useRef } from 'react'
import I from '../icons.jsx'
import { useRosTopic } from '../hooks/useRosTopic'

const ROSOUT_LEVEL = { 10: 'debug', 20: 'info', 30: 'warn', 40: 'err', 50: 'err' }

const logSeed = [
  ["info",  "/nav",     "Path computed: 247 waypoints, 18.4m"],
  ["info",  "/teleop",  "Gamepad connected: Xbox Wireless"],
  ["warn",  "/battery", "Battery level below 35% — charging recommended"],
  ["info",  "/motor",   "PID gains updated: Kp=1.20 Ki=0.04 Kd=0.18"],
  ["debug", "/lidar",   "Scan rate: 10.02 Hz / 1080 pts"],
  ["info",  "/task",    "Job JB-104 started (transport A→B)"],
  ["err",   "/imu",     "Calibration drift: yaw 0.42 rad/h"],
  ["info",  "/comm",    "Heartbeat OK · 28ms RTT"],
  ["debug", "/slam",    "Loop closure detected at node 142"],
  ["info",  "/safety",  "Emergency stop armed — virtual fence ENABLED"],
  ["warn",  "/temp",    "Motor 2 temperature 58.4°C (threshold 65°C)"],
  ["info",  "/system",  "Watchdog: all subsystems alive"],
]

export function Logs() {
  const [level, setLevel] = useState("all")
  const [query, setQuery] = useState("")
  const [auto, setAuto]   = useState(true)
  const [lines, setLines] = useState(() => {
    const now = new Date()
    return logSeed.map((l, i) => {
      const t = new Date(now.getTime() - (logSeed.length - i) * 7400)
      return { time: t, level: l[0], src: l[1], msg: l[2] }
    })
  })

  const autoRef = useRef(auto)
  useEffect(() => { autoRef.current = auto }, [auto])

  const { message: rosoutMsg } = useRosTopic('/rosout', 'rcl_interfaces/msg/Log')
  useEffect(() => {
    if (!rosoutMsg || !autoRef.current) return
    const level = ROSOUT_LEVEL[rosoutMsg.level] ?? 'info'
    const src   = rosoutMsg.name?.split('/').filter(Boolean).pop() ?? rosoutMsg.name ?? '?'
    const time  = rosoutMsg.stamp
      ? new Date(rosoutMsg.stamp.sec * 1000 + Math.floor(rosoutMsg.stamp.nanosec / 1e6))
      : new Date()
    setLines(prev => [...prev.slice(-80), { time, level, src, msg: rosoutMsg.msg }])
  }, [rosoutMsg])

  const filtered = lines.filter(l =>
    (level === "all" || l.level === level) &&
    (!query || l.msg.toLowerCase().includes(query.toLowerCase()) || l.src.includes(query))
  )
  const levelColor = (lv) => ({ info: "var(--ink-2)", debug: "var(--ink-3)", warn: "var(--warn)", err: "var(--danger)" }[lv])
  const ref = useRef(null)
  useEffect(() => { if (auto && ref.current) ref.current.scrollTop = ref.current.scrollHeight }, [filtered.length, auto])

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="page-head">
        <div>
          <h2 className="page-title">ログ & デバッグ</h2>
          <div className="page-sub">SYSTEM_LOGS · {lines.length} ENTRIES</div>
        </div>
        <div className="page-tools">
          <button className={`btn ${auto ? "primary" : ""}`} onClick={() => setAuto(a => !a)}>
            {auto ? <I.pause size={14} /> : <I.play size={14} />} {auto ? "自動更新中" : "停止中"}
          </button>
          <button className="btn"><I.download size={14} /> エクスポート</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {[["all","ALL"],["info","INFO"],["debug","DEBUG"],["warn","WARN"],["err","ERROR"]].map(([k,l]) => (
            <button key={k} onClick={() => setLevel(k)} className="chip" style={{
              cursor: "pointer",
              ...(level === k ? { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" } : {}),
            }}>{l}</button>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
          <input className="input" placeholder="検索" value={query} onChange={e => setQuery(e.target.value)} style={{ paddingLeft: 30 }} />
          <I.search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }} />
        </div>
      </div>

      <div ref={ref} className="log-console">
        {filtered.map((l, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "78px 64px 90px 1fr", gap: 10, padding: "1px 0" }}>
            <span style={{ color: "#666" }}>{l.time.toLocaleTimeString("ja-JP", { hour12: false })}</span>
            <span style={{ color: levelColor(l.level), fontWeight: 600 }}>{l.level.toUpperCase()}</span>
            <span style={{ color: "#7aa2c9" }}>{l.src}</span>
            <span style={{ color: l.level === "err" ? "#f3a0a0" : l.level === "warn" ? "#e3c98a" : "#d4d4d4" }}>{l.msg}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
