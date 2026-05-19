import { useState, useEffect, useRef } from 'react'
import I from '../icons.jsx'

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

function MapCanvas({ pose, waypoints, path, interactive, onTap, hideGrid }) {
  const ref = useRef(null)
  const [size, setSize] = useState({ w: 400, h: 300 })

  useEffect(() => {
    const el = ref.current; if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const r = e.contentRect
      setSize({ w: Math.max(120, r.width), h: Math.max(120, r.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const c = ref.current; if (!c) return
    const dpr = window.devicePixelRatio || 1
    c.width = size.w * dpr; c.height = size.h * dpr
    const ctx = c.getContext("2d")
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, size.w, size.h)

    ctx.fillStyle = "#fcfcfd"
    ctx.fillRect(0, 0, size.w, size.h)

    if (!hideGrid) {
      ctx.strokeStyle = "oklch(0.92 0.005 240)"
      ctx.lineWidth = 1
      const step = 20
      for (let x = 0; x < size.w; x += step) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, size.h); ctx.stroke() }
      for (let y = 0; y < size.h; y += step) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(size.w, y + 0.5); ctx.stroke() }
    }

    ctx.fillStyle = "oklch(0.85 0.008 240)"
    const walls = [
      [0.1, 0.1, 0.35, 0.04], [0.55, 0.1, 0.35, 0.04],
      [0.1, 0.1, 0.04, 0.35], [0.86, 0.1, 0.04, 0.35],
      [0.1, 0.55, 0.04, 0.35], [0.86, 0.55, 0.04, 0.35],
      [0.1, 0.86, 0.35, 0.04], [0.55, 0.86, 0.35, 0.04],
      [0.35, 0.35, 0.06, 0.20], [0.55, 0.45, 0.20, 0.06],
    ]
    walls.forEach(([x, y, w, h]) => ctx.fillRect(x * size.w, y * size.h, w * size.w, h * size.h))

    if (path && path.length > 1) {
      ctx.strokeStyle = "var(--accent)"
      ctx.lineWidth = 2; ctx.setLineDash([4, 4])
      ctx.beginPath()
      path.forEach(([px, py], i) => {
        const x = px * size.w, y = py * size.h
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      })
      ctx.stroke(); ctx.setLineDash([])
    }

    ;(waypoints || []).forEach((w, i) => {
      const x = w.x * size.w, y = w.y * size.h
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "var(--accent)"; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = "var(--accent)"
      ctx.font = "600 10px 'IBM Plex Mono'"
      ctx.textAlign = "center"; ctx.textBaseline = "middle"
      ctx.fillText(String(i + 1), x, y)
    })

    if (pose) {
      const x = pose.x * size.w, y = pose.y * size.h
      ctx.fillStyle = "color-mix(in oklch, var(--accent) 18%, transparent)"
      ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = "oklch(0.22 0.015 250)"
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2
      const hx = x + Math.cos(pose.t) * 5, hy = y + Math.sin(pose.t) * 5
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(hx, hy); ctx.stroke()
    }
  }, [size, pose, waypoints, path, hideGrid])

  const handleClick = (e) => {
    if (!interactive || !onTap) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    onTap({ x, y })
  }

  return <canvas ref={ref} onClick={handleClick} style={{
    width: "100%", height: "100%", display: "block",
    cursor: interactive ? "crosshair" : "default", borderRadius: 6,
  }} />
}

export function MapScreen({ telemetry, waypoints, setWaypoints }) {
  const addWp = (p) => setWaypoints(w => [...w, { ...p, label: `WP-${w.length + 1}` }])
  const removeWp = (i) => setWaypoints(w => w.filter((_, j) => j !== i))

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="page-head">
        <div>
          <h2 className="page-title">マップ & 経路計画</h2>
          <div className="page-sub">SLAM_MAP · WAREHOUSE_A · 0.05m/px · 24.3 × 18.1m</div>
        </div>
        <div className="page-tools">
          <button className="btn"><I.refresh size={14} /> リロード</button>
          <button className="btn primary" onClick={() => setWaypoints([])}><I.trash size={14} /> クリア</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(240px, 300px)", gap: 14 }} className="map-grid">
        <Section title="占有格子マップ" sub="クリックでウェイポイント追加">
          <div style={{ aspectRatio: "4/3", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
            <MapCanvas
              pose={telemetry.pose}
              waypoints={waypoints}
              path={waypoints.length > 0 ? [[telemetry.pose.x, telemetry.pose.y], ...waypoints.map(w => [w.x, w.y])] : null}
              interactive onTap={addWp}
            />
          </div>
        </Section>
        <Section title="ウェイポイント" sub={`${waypoints.length} POINTS`}>
          {waypoints.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>
              マップをタップして追加
            </div>
          ) : (
            <div style={{ display: "grid", gap: 4 }}>
              {waypoints.map((w, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6,
                  background: "var(--surface-2)",
                }}>
                  <I.drag size={14} />
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", background: "var(--surface)",
                    border: "2px solid var(--accent)", color: "var(--accent)",
                    display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600,
                  }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{w.label}</div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
                      ({(w.x * 24.3).toFixed(2)}, {(w.y * 18.1).toFixed(2)})m
                    </div>
                  </div>
                  <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => removeWp(i)}>
                    <I.x size={14} />
                  </button>
                </div>
              ))}
              <button className="btn accent" style={{ marginTop: 6, justifyContent: "center" }}>
                <I.play size={12} /> 経路実行
              </button>
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
