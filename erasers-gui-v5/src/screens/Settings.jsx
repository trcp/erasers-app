import { useState } from 'react'
import I from '../icons.jsx'
import { MODES_BY_ROBOT, ROBOT_TYPE_LABELS } from '../constants/robotModes.js'
import { useRos } from '../context/RosContext'

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


function SettingsSlider({ label, value, min, max, step, unit, onChange }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "var(--ink-2)" }}>{label}</span>
        <span className="mono" style={{ color: "var(--ink)" }}>{(+value).toFixed(step < 1 ? 2 : 0)} <span style={{ color: "var(--ink-3)" }}>{unit}</span></span>
      </div>
      <input type="range" className="slider" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} />
    </div>
  )
}

export function Settings({ controls, setControls, rosbridge, setRosbridge, pcs, setPcs, activePc, setActivePc, robotType, setRobotType }) {
  const [host, setHost] = useState(rosbridge.host)
  const [port, setPort] = useState(rosbridge.port)
  const [ssl, setSsl]   = useState(rosbridge.ssl)
  const { status, connect } = useRos()

  const save = () => {
    const newConfig = { host, port, ssl }
    setRosbridge(newConfig)
    connect(newConfig)
  }
  const url = `${ssl ? "wss" : "ws"}://${host}:${port}`

  const statusLabel = {
    connected:    { text: "接続中", cls: "ok" },
    connecting:   { text: "接続中...", cls: "warn" },
    disconnected: { text: "未接続", cls: "danger" },
    error:        { text: "エラー", cls: "danger" },
  }[status] || { text: status, cls: "" }

  const [newPc, setNewPc] = useState({ name: "", host: "" })
  const addPc = () => {
    if (!newPc.name || !newPc.host) return
    const id = "pc-" + Date.now()
    setPcs(prev => {
      const next = [...prev, { ...newPc, id, online: true }]
      if (!activePc) setActivePc(id)
      return next
    })
    setNewPc({ name: "", host: "" })
  }
  const removePc = (id) => {
    setPcs(prev => prev.filter(p => p.id !== id))
    if (activePc === id) setActivePc(pcs.find(p => p.id !== id)?.id ?? null)
  }
  const togglePc = (id) => setPcs(prev => prev.map(p => p.id === id ? { ...p, online: !p.online } : p))

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="page-head">
        <div>
          <h2 className="page-title">設定</h2>
          <div className="page-sub">GLOBAL_CONFIG</div>
        </div>
        <div className="page-tools">
          <button className="btn primary" onClick={save}><I.check size={14} /> 保存 & 接続</button>
        </div>
      </div>

      <Section title="ロボットの種類" sub="ROBOT_PROFILE">
        <div className="robot-type-grid">
          {Object.entries(ROBOT_TYPE_LABELS).map(([key, label]) => {
            const icons = { AMR: I.rocket, ARM: I.joystick, DRONE: I.rocket, QUAD: I.rocket, FLEET: I.map }
            const Icon = icons[key] || I.power
            return (
              <button key={key} onClick={() => setRobotType(key)}
                className={`robot-type-card ${robotType === key ? "active" : ""}`}>
                <Icon size={22} />
                <div className="robot-type-label">{label}</div>
                <div className="robot-type-modes mono">{(MODES_BY_ROBOT[key] || []).flatMap(g => g.modes).length} モード</div>
              </button>
            )
          })}
        </div>
        <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--surface-2)", borderRadius: 6, border: "1px solid var(--border)", fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>
          ※ ロボットの種類によって、遠隔操作の「操作モード」タブで選べるモードが切り替わります
        </div>
      </Section>

      <Section title="rosbridge 接続" sub="WEBSOCKET ENDPOINT">
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 10, alignItems: "end" }} className="rosbridge-form">
          <label style={{ display: "grid", gap: 4 }}>
            <span className="form-label">ホスト / IPアドレス</span>
            <input className="input mono" value={host} onChange={e => setHost(e.target.value)} placeholder="192.168.1.10" />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span className="form-label">ポート</span>
            <input className="input mono" value={port} onChange={e => setPort(e.target.value)} placeholder="9090" />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 8, fontSize: 12, whiteSpace: "nowrap" }}>
            <input type="checkbox" checked={ssl} onChange={e => setSsl(e.target.checked)} /> SSL (wss)
          </label>
        </div>
        <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--surface-2)", borderRadius: 6, border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span className="mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>
            URL: <span style={{ color: "var(--ink)" }}>{url}</span>
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span className={`chip ${statusLabel.cls}`}>
              <span className="dot" /> {statusLabel.text}
            </span>
            <button className="btn primary sm" onClick={save}>接続</button>
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>
          ※ サーバ側で <code>ros2 launch rosbridge_server rosbridge_websocket_launch.xml</code> を起動してください
        </div>
      </Section>

      <Section title="遠隔PC管理" sub={`${pcs.length} 台登録`}>
        <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
          {pcs.map(pc => (
            <div key={pc.id} className="pc-list-row">
              <span className={`pc-led ${pc.online ? "online" : "offline"}`} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{pc.name}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{pc.host}</div>
              </div>
              {activePc === pc.id ? (
                <span className="chip" style={{ background: "var(--accent-2)", color: "var(--accent)", borderColor: "transparent" }}>使用中</span>
              ) : (
                <button className="btn sm" onClick={() => setActivePc(pc.id)}>選択</button>
              )}
              <button className="btn sm" onClick={() => togglePc(pc.id)}>
                {pc.online ? "オフライン" : "オンライン"}
              </button>
              <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => removePc(pc.id)}><I.trash size={12} /></button>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
          <div className="form-label" style={{ marginBottom: 8 }}>新規PC追加</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8 }} className="pc-add-form">
            <input className="input" placeholder="名前 (例: robot-pc-01)" value={newPc.name} onChange={e => setNewPc(p => ({ ...p, name: e.target.value }))} />
            <input className="input mono" placeholder="192.168.1.20" value={newPc.host} onChange={e => setNewPc(p => ({ ...p, host: e.target.value }))} />
            <button className="btn primary" onClick={addPc}><I.plus size={14} /> 追加</button>
          </div>
        </div>
      </Section>

    </div>
  )
}
