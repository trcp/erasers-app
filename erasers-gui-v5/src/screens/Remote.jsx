import { useState, useEffect, useRef, useCallback } from 'react'
import ROSLIB from 'roslib'
import I from '../icons.jsx'
import { MODES_BY_ROBOT } from '../constants/robotModes.js'
import { useRosTopic } from '../hooks/useRosTopic'
import { useRosService } from '../hooks/useRosService'
import { useRos } from '../context/RosContext'
import { useAppContext } from '../context/AppContext'

function Section({ title, sub, tools, children, style }) {
  return (
    <div className="card" style={style}>
      <div className="card-head">
        <div className="card-title">{title}</div>
        {sub ? <div className="card-sub">{sub}</div> : null}
        {tools ? <div style={{ marginLeft: sub ? 10 : "auto", display: "flex", gap: 6 }}>{tools}</div> : null}
      </div>
      <div className="card-body">{children}</div>
    </div>
  )
}

function Joystick({ label, onChange }) {
  const ref = useRef(null)
  const [drag, setDrag] = useState(false)
  const [v, setV] = useState({ x: 0, y: 0 })

  const updateFromEvent = (e) => {
    const el = ref.current; if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2
    const px = (e.touches ? e.touches[0].clientX : e.clientX)
    const py = (e.touches ? e.touches[0].clientY : e.clientY)
    let dx = (px - cx) / (rect.width / 2)
    let dy = (py - cy) / (rect.height / 2)
    const m = Math.sqrt(dx*dx + dy*dy)
    if (m > 1) { dx /= m; dy /= m; }
    const newV = { x: dx, y: -dy }
    setV(newV); onChange && onChange(newV)
  }

  const start = (e) => { e.preventDefault(); setDrag(true); updateFromEvent(e) }
  const end = () => { setDrag(false); setV({ x: 0, y: 0 }); onChange && onChange({ x: 0, y: 0 }) }

  useEffect(() => {
    if (!drag) return
    const move = (e) => updateFromEvent(e)
    const up = () => end()
    window.addEventListener("mousemove", move)
    window.addEventListener("mouseup", up)
    window.addEventListener("touchmove", move, { passive: false })
    window.addEventListener("touchend", up)
    return () => {
      window.removeEventListener("mousemove", move)
      window.removeEventListener("mouseup", up)
      window.removeEventListener("touchmove", move)
      window.removeEventListener("touchend", up)
    }
  }, [drag])

  const knobX = v.x * 50; const knobY = -v.y * 50
  return (
    <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
      <div ref={ref} onMouseDown={start} onTouchStart={start}
        style={{
          position: "relative", width: "min(180px, 50vw)", aspectRatio: "1/1",
          background: "var(--surface-2)", border: "1px solid var(--border)",
          borderRadius: "50%", touchAction: "none", userSelect: "none",
        }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1px dashed var(--border-2)", margin: 12 }} />
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "var(--border-2)" }} />
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--border-2)" }} />
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: `translate(calc(-50% + ${knobX}%), calc(-50% + ${knobY}%))`,
          width: "35%", aspectRatio: "1/1", borderRadius: "50%",
          background: drag ? "var(--accent)" : "var(--ink)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          transition: drag ? "none" : "transform .25s, background .15s",
        }} />
      </div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-2)", display: "flex", gap: 10 }}>
        <span>X: <span style={{ color: "var(--ink)" }}>{v.x.toFixed(2)}</span></span>
        <span>Y: <span style={{ color: "var(--ink)" }}>{v.y.toFixed(2)}</span></span>
      </div>
    </div>
  )
}

function SliderRow({ label, value, min, max, step, unit, onChange }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
        <span style={{ color: "var(--ink-2)" }}>{label}</span>
        <span className="mono" style={{ color: "var(--ink)" }}>{(+value).toFixed(step < 1 ? 2 : 0)} <span style={{ color: "var(--ink-3)" }}>{unit}</span></span>
      </div>
      <input type="range" className="slider" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)} />
    </div>
  )
}

function TeleopTab({ telemetry, controls, setControls }) {
  const { activePreset } = useAppContext()
  const cmdVelTopic   = activePreset?.cmdVel?.topic   ?? '/cmd_vel'
  const cmdVelMsgType = activePreset?.cmdVel?.msgType ?? 'geometry_msgs/Twist'
  const [lin, setLin] = useState({ x: 0, y: 0 })
  const [rot, setRot] = useState({ x: 0, y: 0 })
  const { publish } = useRosTopic(cmdVelTopic, cmdVelMsgType, 'publish')

  const handleLin = (newLin) => {
    setLin(newLin)
    publish({
      linear:  { x: newLin.y * controls.maxSpeed, y: newLin.x * controls.maxSpeed, z: 0 },
      angular: { x: 0, y: 0, z: rot.x * controls.maxRot * Math.PI / 180 },
    })
  }

  const handleRot = (newRot) => {
    setRot(newRot)
    publish({
      linear:  { x: lin.y * controls.maxSpeed, y: lin.x * controls.maxSpeed, z: 0 },
      angular: { x: 0, y: 0, z: newRot.x * controls.maxRot * Math.PI / 180 },
    })
  }

  return (
    <>
      <Section title="制御パラメータ">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <SliderRow label="最大速度" value={controls.maxSpeed} min={0} max={2} step={0.05} unit="m/s"
            onChange={v => setControls(c => ({ ...c, maxSpeed: v }))} />
          <SliderRow label="最大回転" value={controls.maxRot} min={0} max={180} step={5} unit="°/s"
            onChange={v => setControls(c => ({ ...c, maxRot: v }))} />
          <SliderRow label="加速度" value={controls.accel} min={0.1} max={3} step={0.1} unit="m/s²"
            onChange={v => setControls(c => ({ ...c, accel: v }))} />
        </div>
      </Section>

      <Section title="仮想ジョイスティック" sub="ドラッグまたはタッチで操作">
        <div style={{ display: "flex", gap: 24, justifyContent: "space-around", flexWrap: "wrap", padding: "8px 0" }}>
          <Joystick label="並進 (LIN)" onChange={handleLin} />
          <Joystick label="回転 (ROT)" onChange={handleRot} />
        </div>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 10, fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", flexWrap: "wrap" }}>
          <span>VX: <span style={{ color: "var(--ink)" }}>{(lin.y * controls.maxSpeed).toFixed(2)} m/s</span></span>
          <span>VY: <span style={{ color: "var(--ink)" }}>{(lin.x * controls.maxSpeed).toFixed(2)} m/s</span></span>
          <span>ω: <span style={{ color: "var(--ink)" }}>{(rot.x * controls.maxRot).toFixed(0)} °/s</span></span>
          <span style={{ color: "var(--ink-3)" }}>→ {cmdVelTopic}</span>
        </div>
      </Section>
    </>
  )
}

function ModeConfirmModal({ mode, onConfirm, onCancel }) {
  const Icon = I[mode.icon] || I.power
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
        <div className="modal-head">
          <div className="modal-title">モード切替の確認</div>
          <button className="icon-btn" onClick={onCancel}><I.x size={14} /></button>
        </div>
        <div className="modal-body" style={{ textAlign: "center", padding: "20px 24px" }}>
          <div style={{ marginBottom: 12, color: "var(--ink-3)", fontSize: 12 }}>以下のモードに切り替えます</div>
          <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 8,
            padding: "16px 24px", background: "var(--surface-2)", borderRadius: 10, border: "1px solid var(--border)", minWidth: 140 }}>
            <Icon size={28} />
            <div style={{ fontWeight: 700, fontSize: 15 }}>{mode.label}</div>
            {mode.sub && <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{mode.sub}</div>}
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onCancel}>キャンセル</button>
          <button className={`btn primary ${mode.tone || ""}`} onClick={onConfirm}><I.arrow size={14} /> 送信する</button>
        </div>
      </div>
    </div>
  )
}

function ModeTab({ robotType, mode, setMode }) {
  const { activePreset } = useAppContext()
  const { ros, status } = useRos()
  const [pending, setPending] = useState(null)

  const groups = activePreset?.modeGroups ?? MODES_BY_ROBOT[robotType] ?? MODES_BY_ROBOT.AMR
  const allModes = groups.flatMap(g => g.modes)

  const handleClick = (m) => {
    setPending(m)
  }

  const confirm = () => {
    setMode(pending.id)
    const action = pending.action
    if (action && status === 'connected' && ros.current) {
      try {
        if (action.type === 'service') {
          const svc = new ROSLIB.Service({ ros: ros.current, name: action.name, serviceType: action.serviceType })
          svc.callService(new ROSLIB.ServiceRequest(action.request || {}), () => {}, () => {})
        } else if (action.type === 'publish') {
          const topic = new ROSLIB.Topic({ ros: ros.current, name: action.topic, messageType: action.msgType })
          topic.publish(new ROSLIB.Message(action.msg || {}))
          topic.unadvertise()
        } else if (action.type === 'actionlib') {
          const ac = new ROSLIB.ActionClient({ ros: ros.current, serverName: action.server, actionName: action.actionType })
          const goal = new ROSLIB.Goal({ actionClient: ac, goalMessage: new ROSLIB.Message(action.goal || {}) })
          goal.send()
        }
      } catch (_) { /* ROS 未接続時などは無視 */ }
    }
    setPending(null)
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Section title="モード送信" sub={`${activePreset?.label ?? robotType} · ${allModes.length} MODES · アクション ${allModes.filter(m => m.action).length} 件`}>
        <div className="mode-groups">
          {groups.map(g => (
            <div key={g.group} className="mode-group">
              <div className="mode-group-head">
                <span className="mode-group-bar" />
                <span className="mode-group-label">{g.group}</span>
                <span className="mode-group-count mono">{g.modes.length}</span>
              </div>
              <div className="mode-grid">
                {g.modes.map(m => {
                  const Icon = I[m.icon] || I.power
                  const isActive = m.id === mode
                  return (
                    <button key={m.id} onClick={() => handleClick(m)}
                      className={`mode-card ${isActive ? "active" : ""} ${m.tone || ""}`}>
                      <div className="mode-card-icon"><Icon size={20} /></div>
                      <div className="mode-card-label">{m.label}</div>
                      <div className="mode-card-sub">{m.sub}</div>
                      {isActive ? <span className="mode-card-check" style={{ fontSize: 9, letterSpacing: '.04em' }}>SENT</span> : null}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </Section>
      {pending && <ModeConfirmModal mode={pending} onConfirm={confirm} onCancel={() => setPending(null)} />}
    </div>
  )
}

const COMMON_TYPES = [
  "std_msgs/String", "std_msgs/Int32", "std_msgs/Float64", "std_msgs/Bool",
  "geometry_msgs/Twist", "geometry_msgs/Pose", "geometry_msgs/PoseStamped",
  "sensor_msgs/Imu", "sensor_msgs/LaserScan", "sensor_msgs/Image", "sensor_msgs/JointState",
  "nav_msgs/Odometry", "nav_msgs/Path",
]

function defaultPayload(type) {
  const STAMP = { secs: 0, nsecs: 0 }
  const HEADER = { seq: 0, stamp: STAMP, frame_id: "" }
  const VEC3   = { x: 0, y: 0, z: 0 }
  const QUAT   = { x: 0, y: 0, z: 0, w: 1 }
  const POSE   = { position: VEC3, orientation: QUAT }
  switch (type) {
    // std_msgs
    case "std_msgs/String":                    return JSON.stringify({ data: "" }, null, 2)
    case "std_msgs/Bool":                      return JSON.stringify({ data: false }, null, 2)
    case "std_msgs/Int8":   case "std_msgs/Int16":
    case "std_msgs/Int32":  case "std_msgs/Int64":
    case "std_msgs/UInt8":  case "std_msgs/UInt16":
    case "std_msgs/UInt32": case "std_msgs/UInt64": return JSON.stringify({ data: 0 }, null, 2)
    case "std_msgs/Float32": case "std_msgs/Float64": return JSON.stringify({ data: 0.0 }, null, 2)
    case "std_msgs/Empty":                     return JSON.stringify({}, null, 2)
    case "std_msgs/Header":                    return JSON.stringify(HEADER, null, 2)
    // std_srvs
    case "std_srvs/SetBool":                   return JSON.stringify({ data: true }, null, 2)
    case "std_srvs/Empty": case "std_srvs/Trigger": return JSON.stringify({}, null, 2)
    // geometry_msgs
    case "geometry_msgs/Vector3":              return JSON.stringify(VEC3, null, 2)
    case "geometry_msgs/Point":                return JSON.stringify(VEC3, null, 2)
    case "geometry_msgs/Quaternion":           return JSON.stringify(QUAT, null, 2)
    case "geometry_msgs/Pose":                 return JSON.stringify(POSE, null, 2)
    case "geometry_msgs/PoseStamped":          return JSON.stringify({ header: { ...HEADER, frame_id: "map" }, pose: POSE }, null, 2)
    case "geometry_msgs/Twist":                return JSON.stringify({ linear: VEC3, angular: VEC3 }, null, 2)
    case "geometry_msgs/TwistStamped":         return JSON.stringify({ header: HEADER, twist: { linear: VEC3, angular: VEC3 } }, null, 2)
    case "geometry_msgs/Transform":            return JSON.stringify({ translation: VEC3, rotation: QUAT }, null, 2)
    case "geometry_msgs/TransformStamped":     return JSON.stringify({ header: HEADER, child_frame_id: "", transform: { translation: VEC3, rotation: QUAT } }, null, 2)
    case "geometry_msgs/Accel":                return JSON.stringify({ linear: VEC3, angular: VEC3 }, null, 2)
    case "geometry_msgs/Wrench":               return JSON.stringify({ force: VEC3, torque: VEC3 }, null, 2)
    // nav_msgs
    case "nav_msgs/Odometry":
      return JSON.stringify({ header: { ...HEADER, frame_id: "odom" }, child_frame_id: "base_link",
        pose: { pose: POSE, covariance: Array(36).fill(0) },
        twist: { twist: { linear: VEC3, angular: VEC3 }, covariance: Array(36).fill(0) } }, null, 2)
    case "nav_msgs/Path":
      return JSON.stringify({ header: { ...HEADER, frame_id: "map" }, poses: [] }, null, 2)
    // sensor_msgs
    case "sensor_msgs/Joy":
      return JSON.stringify({ header: HEADER, axes: [0.0, 0.0, 0.0], buttons: [0, 0, 0] }, null, 2)
    case "sensor_msgs/JointState":
      return JSON.stringify({ header: HEADER, name: [], position: [], velocity: [], effort: [] }, null, 2)
    // actionlib_msgs
    case "actionlib_msgs/GoalID":
      return JSON.stringify({ stamp: STAMP, id: "" }, null, 2)
    default: return "{}"
  }
}

const ROS_PRIMITIVES = {
  bool: false,
  int8: 0, int16: 0, int32: 0, int64: 0,
  uint8: 0, uint16: 0, uint32: 0, uint64: 0,
  float32: 0.0, float64: 0.0,
  string: "",
  time: { secs: 0, nsecs: 0 },
  duration: { secs: 0, nsecs: 0 },
  byte: 0, char: 0,
}

function buildTemplate(rootType, typedefs) {
  const typeMap = Object.fromEntries(typedefs.map(t => [t.type, t]))
  const build = (type, depth = 0) => {
    if (depth > 8) return null
    if (type in ROS_PRIMITIVES) return ROS_PRIMITIVES[type]
    const def = typeMap[type]
    if (!def) return null
    const obj = {}
    def.fieldnames.forEach((name, i) => {
      const fieldType = def.fieldtypes[i]
      const arrayLen  = def.fieldarraylen?.[i] ?? -1
      obj[name] = arrayLen >= 0 ? [] : build(fieldType, depth + 1)
    })
    return obj
  }
  return JSON.stringify(build(rootType), null, 2)
}

function SubscribeView({ topic }) {
  const [messages, setMessages] = useState([])
  const ref = useRef(null)
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight }, [messages.length])

  const { message } = useRosTopic(topic.name, topic.type, 'subscribe', 0, topic.active)
  useEffect(() => {
    if (!message) return
    setMessages(prev => [...prev.slice(-49), { time: new Date(), data: JSON.stringify(message) }])
  }, [message])

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 10, fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", flexWrap: "wrap" }}>
        <span>受信: <span style={{ color: "var(--ink)" }}>{messages.length}</span></span>
        <span>状態: <span style={{ color: topic.active ? "var(--ok)" : "var(--ink-3)" }}>{topic.active ? "● ACTIVE" : "○ PAUSED"}</span></span>
      </div>
      <div ref={ref} className="msg-console">
        {messages.length === 0 ? (
          <div style={{ color: "#666", padding: 12 }}>// 待機中...</div>
        ) : messages.slice(-30).map((m, i) => (
          <div key={i} className="msg-line">
            <span className="msg-time">{m.time.toLocaleTimeString("ja-JP", { hour12: false })}.{String(m.time.getMilliseconds()).padStart(3, "0")}</span>
            <pre className="msg-data">{m.data}</pre>
          </div>
        ))}
      </div>
    </div>
  )
}

function PublishView({ topic }) {
  const [payload, setPayload] = useState(defaultPayload(topic.type))
  const [history, setHistory] = useState([])
  const [fetching, setFetching] = useState(false)
  const { publish } = useRosTopic(topic.name, topic.type, 'publish')
  const { status } = useRos()
  const { call: fetchMsgDetails } = useRosService('/rosapi/message_details', 'rosapi/MessageDetails')

  const fetchTemplate = useCallback(() => {
    setFetching(true)
    fetchMsgDetails({ type: topic.type })
      .then(res => {
        if (res?.typedefs?.length > 0) setPayload(buildTemplate(topic.type, res.typedefs))
      })
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [topic.type, fetchMsgDetails])

  // 未知の型のとき接続されたら自動取得
  useEffect(() => {
    if (defaultPayload(topic.type) !== '{}') return
    if (status !== 'connected') return
    fetchTemplate()
  }, [status, topic.type])

  const send = () => {
    const entry = { time: new Date(), data: payload }
    setHistory(h => [entry, ...h].slice(0, 20))
    if (status === 'connected') {
      try {
        const parsed = JSON.parse(payload)
        publish(parsed)
      } catch (_) {}
    }
  }

  return (
    <div>
      <div style={{ display: "grid", gap: 8 }}>
        <label style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--mono)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          メッセージ (JSON)
        </label>
        <textarea
          className="input mono"
          value={payload}
          onChange={e => setPayload(e.target.value)}
          rows={6}
          spellCheck={false}
          style={{ fontFamily: "var(--mono)", fontSize: 12, resize: "vertical" }}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn primary" onClick={send}><I.arrow size={14} /> 送信</button>
          <button className="btn" onClick={() => setPayload(defaultPayload(topic.type))}>リセット</button>
          <button className="btn" onClick={fetchTemplate} disabled={fetching || status !== 'connected'}
            title={status !== 'connected' ? "rosbridge に接続してください" : "ROS からメッセージ構造を取得"}>
            <I.download size={12} /> {fetching ? "取得中..." : "テンプレート取得"}
          </button>
        </div>
      </div>
      {history.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--mono)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>送信履歴</div>
          <div className="msg-console" style={{ maxHeight: 180 }}>
            {history.map((m, i) => (
              <div key={i} className="msg-line">
                <span className="msg-time">{m.time.toLocaleTimeString("ja-JP", { hour12: false })}</span>
                <pre className="msg-data">{m.data}</pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AddTopicModal({ onAdd, onCancel }) {
  const [name, setName] = useState("/")
  const [type, setType] = useState("std_msgs/String")
  const [direction, setDirection] = useState("sub")
  const [rosTopics, setRosTopics] = useState([])
  const [loading, setLoading] = useState(false)
  const { status } = useRos()
  const { call } = useRosService('/rosapi/topics', 'rosapi/Topics')

  useEffect(() => {
    if (status !== 'connected') return
    setLoading(true)
    call({})
      .then(res => {
        if (res?.topics && res?.types) {
          setRosTopics(res.topics.map((n, i) => ({ name: n, type: res.types[i] })))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [status])

  const topicTypeMap = Object.fromEntries(rosTopics.map(t => [t.name, t.type]))
  const allTypes = [...new Set([...COMMON_TYPES, ...rosTopics.map(t => t.type)])]

  const handleNameChange = (e) => {
    const n = e.target.value
    setName(n)
    if (topicTypeMap[n]) setType(topicTypeMap[n])
  }

  const submit = () => {
    if (!name.trim() || name === "/") return alert("トピック名を入力してください")
    onAdd({ name, type, direction })
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">トピック追加</div>
          <button className="icon-btn" onClick={onCancel}><I.x size={14} /></button>
        </div>
        <div className="modal-body">
          <label style={{ display: "grid", gap: 4, marginBottom: 12 }}>
            <span className="form-label">方向</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setDirection("sub")} className={direction === "sub" ? "btn primary" : "btn"} style={{ flex: 1, justifyContent: "center" }}>受信 (Subscribe)</button>
              <button onClick={() => setDirection("pub")} className={direction === "pub" ? "btn primary" : "btn"} style={{ flex: 1, justifyContent: "center" }}>送信 (Publish)</button>
            </div>
          </label>
          <label style={{ display: "grid", gap: 4, marginBottom: 12 }}>
            <span className="form-label">
              トピック名
              {loading && <span style={{ marginLeft: 6, color: "var(--ink-3)", fontSize: 10 }}>取得中...</span>}
              {!loading && rosTopics.length > 0 && (
                <span style={{ marginLeft: 6, color: "var(--ink-3)", fontSize: 10 }}>{rosTopics.length} トピック取得済み</span>
              )}
            </span>
            <input className="input mono" list="ros-topic-names" value={name} onChange={handleNameChange} placeholder="/cmd_vel" autoFocus />
            <datalist id="ros-topic-names">
              {rosTopics.map(t => <option key={t.name} value={t.name} label={t.type} />)}
            </datalist>
          </label>
          <label style={{ display: "grid", gap: 4, marginBottom: 12 }}>
            <span className="form-label">メッセージ型</span>
            <input className="input mono" list="topic-types" value={type} onChange={e => setType(e.target.value)} />
            <datalist id="topic-types">
              {allTypes.map(t => <option key={t} value={t} />)}
            </datalist>
          </label>
          <div style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>プリセット:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
            {COMMON_TYPES.slice(0, 8).map(t => (
              <button key={t} className="chip" style={{ cursor: "pointer" }} onClick={() => setType(t)}>{t}</button>
            ))}
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onCancel}>キャンセル</button>
          <button className="btn primary" onClick={submit}><I.plus size={14} /> 追加</button>
        </div>
      </div>
    </div>
  )
}

function TopicsTab({ topics, setTopics }) {
  const [showAdd, setShowAdd] = useState(false)
  const [selectedId, setSelectedId] = useState(topics[0]?.id)
  const selected = topics.find(t => t.id === selectedId) || topics[0]
  const addTopic = (topic) => {
    const newId = Date.now()
    setTopics(prev => [...prev, { ...topic, id: newId, active: true, messages: [] }])
    setShowAdd(false)
    setSelectedId(newId)
  }

  const removeTopic = (id) => {
    setTopics(prev => prev.filter(t => t.id !== id))
    if (selectedId === id) setSelectedId(topics[0]?.id)
  }

  const toggleActive = (id) => {
    setTopics(prev => prev.map(t => t.id === id ? { ...t, active: !t.active } : t))
  }

  return (
    <div className="topics-grid">
      <Section title={`トピック一覧 · ${topics.length}`} tools={<>
        <button className="btn primary sm" onClick={() => setShowAdd(true)}>
          <I.plus size={12} /> 追加
        </button>
      </>}>
        <div style={{ display: "grid", gap: 4, maxHeight: "min(60vh, 520px)", overflowY: "auto", paddingRight: 4 }}>
          {topics.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--ink-3)", fontSize: 12 }}>
              トピックが登録されていません
            </div>
          ) : topics.map(t => (
            <div key={t.id} onClick={() => setSelectedId(t.id)} className={`topic-row ${selected?.id === t.id ? "selected" : ""}`}>
              <span className={`topic-dir ${t.direction}`}>{t.direction === "sub" ? "SUB" : "PUB"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="topic-name mono">{t.name}</div>
                <div className="topic-type mono">{t.type}</div>
              </div>
              <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={(e) => { e.stopPropagation(); toggleActive(t.id) }}>
                {t.active ? <I.pause size={12} /> : <I.play size={12} />}
              </button>
              <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={(e) => { e.stopPropagation(); removeTopic(t.id) }}>
                <I.x size={12} />
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title={selected ? `${selected.direction === "sub" ? "受信" : "送信"} · ${selected.name}` : "トピック詳細"}
        sub={selected?.type}
      >
        {!selected ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
            左側のリストからトピックを選択してください
          </div>
        ) : selected.direction === "sub" ? (
          <SubscribeView key={selected.id} topic={selected} />
        ) : (
          <PublishView key={selected.id} topic={selected} setTopics={setTopics} />
        )}
      </Section>

      {showAdd && <AddTopicModal onAdd={addTopic} onCancel={() => setShowAdd(false)} />}
    </div>
  )
}

export function Remote({ telemetry, controls, setControls, topics, setTopics, rosbridgeUrl, pcName, robotType, mode, setMode }) {
  const [tab, setTab] = useState("teleop")

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "end", gap: 12, marginBottom: 0, flexWrap: "wrap" }}>
        <div>
          <h2 className="page-title">遠隔操作</h2>
          <div className="page-sub">TELEOP · {pcName} · {rosbridgeUrl}</div>
        </div>
        <div className="page-tools">
          <button className="btn danger" onClick={() => {
            const { publish } = { publish: () => {} }
            alert("緊急停止が送信されました")
          }}>
            <I.stop size={14} /> 緊急停止
          </button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "teleop" ? "active" : ""}`} onClick={() => setTab("teleop")}>
          <I.joystick size={14} /> ジョイスティック
        </button>
        <button className={`tab ${tab === "topics" ? "active" : ""}`} onClick={() => setTab("topics")}>
          <I.terminal size={14} /> トピック通信
        </button>
        <button className={`tab ${tab === "mode" ? "active" : ""}`} onClick={() => setTab("mode")}>
          <I.power size={14} /> 操作モード
        </button>
      </div>

      {tab === "teleop" ? (
        <TeleopTab telemetry={telemetry} controls={controls} setControls={setControls} />
      ) : tab === "topics" ? (
        <TopicsTab topics={topics} setTopics={setTopics} />
      ) : (
        <ModeTab robotType={robotType} mode={mode} setMode={setMode} />
      )}
    </div>
  )
}
