import { useState, useEffect } from 'react'
import I from '../icons.jsx'
import { PROGRAMS_BY_PC, CATEGORY_LABELS } from '../constants/programs.js'

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

export function Tasks({ runningTasks, setRunningTasks, pcs, activePc, setActivePc }) {
  const [filter, setFilter] = useState("all")
  const programsForPc = PROGRAMS_BY_PC[activePc] || []
  const [selectedId, setSelectedId] = useState(programsForPc[0]?.id)

  useEffect(() => {
    if (!programsForPc.find(p => p.id === selectedId)) {
      setSelectedId(programsForPc[0]?.id)
    }
    setFilter("all")
  }, [activePc])

  const categories = ["all", ...new Set(programsForPc.map(p => p.category))]
  const filtered = filter === "all" ? programsForPc : programsForPc.filter(p => p.category === filter)
  const selected = programsForPc.find(p => p.id === selectedId)
  const runningOnPc = runningTasks[activePc] || []
  const isRunning = (pid) => runningOnPc.some(r => r.id === pid)

  const launch = (program) => {
    setRunningTasks(prev => ({
      ...prev,
      [activePc]: [...(prev[activePc] || []), {
        id: program.id, pkg: program.pkg, file: program.file,
        startedAt: new Date(), pid: 10000 + Math.floor(Math.random() * 9000),
      }],
    }))
  }
  const stop = (pid) => {
    setRunningTasks(prev => ({
      ...prev,
      [activePc]: (prev[activePc] || []).filter(r => r.id !== pid),
    }))
  }

  if (pcs.length === 0) {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        <div className="page-head">
          <div>
            <h2 className="page-title">タスク管理</h2>
            <div className="page-sub">PROGRAM_LAUNCHER</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ padding: "48px 24px", textAlign: "center", display: "grid", gap: 12, justifyItems: "center" }}>
            <I.pc size={32} style={{ color: "var(--ink-3)" }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-2)" }}>PCが登録されていません</div>
            <div style={{ fontSize: 13, color: "var(--ink-3)" }}>設定画面からPCを追加してください</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="page-head">
        <div>
          <h2 className="page-title">タスク管理</h2>
          <div className="page-sub">PROGRAM_LAUNCHER · {programsForPc.length} 件のプログラム · {runningOnPc.length} 件実行中</div>
        </div>
      </div>

      <Section title="起動先 PC" sub="実行する遠隔PCを選択">
        <div className="pc-switcher">
          {pcs.map(pc => (
            <button key={pc.id} onClick={() => setActivePc(pc.id)}
              className={`pc-card ${activePc === pc.id ? "active" : ""}`}>
              <div className="pc-card-head">
                <I.pc size={16} />
                <span className="pc-name">{pc.name}</span>
                <span className={`pc-led ${pc.online ? "online" : "offline"}`} />
              </div>
              <div className="pc-card-meta mono">
                <span>{pc.host}</span>
                <span>{pc.os}</span>
              </div>
              <div className="pc-card-stats mono">
                <span>プログラム: {(PROGRAMS_BY_PC[pc.id] || []).length}</span>
                <span>実行中: {(runningTasks[pc.id] || []).length}</span>
              </div>
            </button>
          ))}
        </div>
      </Section>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 360px)", gap: 14 }} className="task-grid">
        <Section
          title="起動可能プログラム"
          sub={`${filtered.length} OF ${programsForPc.length}`}
          tools={<>
            <select className="input" style={{ width: "auto", padding: "4px 8px", fontSize: 11 }} value={filter} onChange={e => setFilter(e.target.value)}>
              {categories.map(c => <option key={c} value={c}>{c === "all" ? "全カテゴリ" : CATEGORY_LABELS[c]}</option>)}
            </select>
          </>}
        >
          <div style={{ display: "grid", gap: 6 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "32px 0", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
                {pcs.find(p => p.id === activePc)?.name} で利用可能なプログラムはありません
              </div>
            ) : filtered.map(p => {
              const running = isRunning(p.id)
              return (
                <div key={p.id}
                  className={`program-row ${selectedId === p.id ? "selected" : ""} ${running ? "running" : ""}`}
                  onClick={() => setSelectedId(p.id)}>
                  <div className="program-icon">
                    {running ? <span className="dot-pulse" /> : <I.rocket size={14} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="program-name">
                      <span className="mono">{p.pkg}</span>
                      <span className="program-file mono"> · {p.file}</span>
                    </div>
                    <div className="program-desc">{p.desc}</div>
                  </div>
                  <span className="chip" style={{ minWidth: 60, justifyContent: "center" }}>
                    {CATEGORY_LABELS[p.category]}
                  </span>
                  {running ? (
                    <button className="btn danger sm" onClick={(e) => { e.stopPropagation(); stop(p.id) }}>
                      <I.stop size={11} /> 停止
                    </button>
                  ) : (
                    <button className="btn primary sm" onClick={(e) => { e.stopPropagation(); launch(p) }}>
                      <I.play size={11} /> 起動
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </Section>

        <Section title="プログラム詳細" sub={selected ? selected.pkg : null}>
          {!selected ? null : (
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div className="detail-label">説明</div>
                <div style={{ fontSize: 13 }}>{selected.desc}</div>
              </div>
              <div>
                <div className="detail-label">起動コマンド</div>
                <div className="cmd-block mono">
                  ros2 launch {selected.pkg} {selected.file}
                </div>
              </div>
              <div>
                <div className="detail-label">引数</div>
                <div style={{ display: "grid", gap: 4 }}>
                  {Object.entries(selected.args).map(([k, v]) => (
                    <div key={k} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 8, fontSize: 11, fontFamily: "var(--mono)" }}>
                      <span style={{ color: "var(--ink-3)" }}>{k}:</span>
                      <span style={{ color: "var(--ink)" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="detail-label">対象 PC</div>
                <div className="mono" style={{ fontSize: 12 }}>
                  {pcs.find(p => p.id === activePc)?.name} ({pcs.find(p => p.id === activePc)?.host})
                </div>
              </div>
              {isRunning(selected.id) ? (
                <button className="btn danger" onClick={() => stop(selected.id)}>
                  <I.stop size={14} /> このプログラムを停止
                </button>
              ) : (
                <button className="btn primary" onClick={() => launch(selected)}>
                  <I.rocket size={14} /> このプログラムを起動
                </button>
              )}
            </div>
          )}
        </Section>
      </div>

      {runningOnPc.length > 0 && (
        <Section title={`実行中プロセス · ${pcs.find(p => p.id === activePc)?.name}`} sub={`${runningOnPc.length} ACTIVE`}>
          <div style={{ display: "grid", gap: 4 }}>
            {runningOnPc.map(r => (
              <div key={r.id} style={{
                display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", alignItems: "center", gap: 10,
                padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface-2)",
              }}>
                <span className="dot-pulse" />
                <span className="mono" style={{ fontSize: 12 }}>{r.pkg} / {r.file}</span>
                <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>PID {r.pid}</span>
                <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{Math.floor((Date.now() - r.startedAt) / 1000)}s</span>
                <button className="btn danger sm" onClick={() => stop(r.id)}><I.stop size={11} /> 停止</button>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
