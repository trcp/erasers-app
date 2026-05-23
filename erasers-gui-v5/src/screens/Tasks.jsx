import { useState, useEffect } from 'react'
import I from '../icons.jsx'
import { useAppContext } from '../context/AppContext'
import { getServerUrl, fetchTasks, runTask, killTask, getTaskStatus } from '../services/erasersApi.js'

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
  const { screen, rosConfigs } = useAppContext()
  const [serverTasks, setServerTasks] = useState([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [filter, setFilter]           = useState("all")
  const [selectedId, setSelectedId]   = useState(null)
  const [launching, setLaunching]     = useState(false)
  const [editedTemplates, setEditedTemplates] = useState({})
  const [editingTemplate, setEditingTemplate] = useState(false)

  useEffect(() => { setEditingTemplate(false) }, [selectedId])

  // タスク画面に切り替えたとき、または activePc 変更時にサーバからタスクを取得
  useEffect(() => {
    if (screen !== 'tasks') return
    if (!activePc) return
    const pc = pcs.find(p => p.id === activePc)
    if (!pc) return
    setLoading(true)
    setError(null)
    setServerTasks([])
    fetchTasks(getServerUrl(pc))
      .then(tasks => {
        setServerTasks(tasks)
        setSelectedId(tasks[0]?.id ?? null)
        setFilter(tasks[0]?.taskName ?? "")
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [screen, activePc])

  // 実行中タスクのステータスをポーリング（2秒間隔）
  useEffect(() => {
    const running = runningTasks[activePc] || []
    if (running.length === 0) return
    const pc = pcs.find(p => p.id === activePc)
    if (!pc) return
    const baseUrl = getServerUrl(pc)
    const timerId = setInterval(async () => {
      for (const r of running) {
        try {
          const { is_running } = await getTaskStatus(baseUrl, r.taskName, r.nodeName)
          if (!is_running) {
            setRunningTasks(prev => ({
              ...prev,
              [activePc]: (prev[activePc] || []).filter(x => x.id !== r.id),
            }))
          }
        } catch { /* サーバ通信エラーは無視 */ }
      }
    }, 2000)
    return () => clearInterval(timerId)
  }, [activePc, runningTasks])

  const taskNames = [...new Set(serverTasks.map(p => p.taskName))]
  const filtered  = serverTasks.filter(p => !filter || p.taskName === filter)
  const selected  = serverTasks.find(p => p.id === selectedId)
  const runningOnPc = runningTasks[activePc] || []
  const isRunning = (id) => runningOnPc.some(r => r.id === id)

  const launch = async (program) => {
    const pc = pcs.find(p => p.id === activePc)
    if (!pc) return
    const editedTemplate = editedTemplates[program.id]
    const templateOverride = editedTemplate !== undefined && editedTemplate !== program.commandTemplate
      ? editedTemplate
      : undefined
    try {
      await runTask(getServerUrl(pc), program.taskName, program.nodeName, program.variables, templateOverride)
      setRunningTasks(prev => ({
        ...prev,
        [activePc]: [...(prev[activePc] || []), {
          id: program.id,
          taskName: program.taskName,
          nodeName: program.nodeName,
          displayName: program.displayName,
          taskDisplayName: program.taskDisplayName,
          startedAt: new Date(),
        }],
      }))
    } catch (err) {
      setError(`起動失敗: ${err.message}`)
    }
  }

  const launchAll = async () => {
    const notRunning = filtered.filter(p => !isRunning(p.id))
    if (notRunning.length === 0) return
    setLaunching(true)
    for (const p of notRunning) {
      await launch(p).catch(() => {})
    }
    setLaunching(false)
  }

  const stop = async (runningItem) => {
    const pc = pcs.find(p => p.id === activePc)
    if (!pc) return
    try {
      await killTask(getServerUrl(pc), runningItem.taskName, runningItem.nodeName)
    } catch { /* サーバエラーでもUI側は除去する */ }
    setRunningTasks(prev => ({
      ...prev,
      [activePc]: (prev[activePc] || []).filter(r => r.id !== runningItem.id),
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
          <div className="page-sub">PROGRAM_LAUNCHER · {serverTasks.length} 件のプログラム · {runningOnPc.length} 件実行中</div>
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
                <span>:{3001}</span>
              </div>
              <div className="pc-card-stats mono">
                <span>実行中: {(runningTasks[pc.id] || []).length}</span>
              </div>
              {rosConfigs[pc.id] && (
                <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", paddingTop: 4, borderTop: "1px dashed var(--border)", display: "grid", gap: 1 }}>
                  <span>{rosConfigs[pc.id].network_if}{rosConfigs[pc.id].ip ? ` (${rosConfigs[pc.id].ip})` : ""}</span>
                  <span>{rosConfigs[pc.id].ros_master_uri}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </Section>

      {error && (
        <div className="card" style={{ border: "1px solid var(--danger, #e53e3e)" }}>
          <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", fontSize: 13, color: "var(--danger, #e53e3e)" }}>
            <I.stop size={14} />
            <span>{error}</span>
            <button className="btn sm" style={{ marginLeft: "auto" }} onClick={() => setError(null)}>閉じる</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 360px)", gap: 14 }} className="task-grid">
        <Section title="起動可能プログラム" tools={
          <button
            className="btn primary sm"
            disabled={launching || filtered.length === 0 || filtered.every(p => isRunning(p.id))}
            onClick={launchAll}
          >
            <I.rocket size={11} />
            {launching ? "起動中..." : `一括起動 (${filtered.filter(p => !isRunning(p.id)).length}件)`}
          </button>
        }>
          {taskNames.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
              {taskNames.map(t => {
                const label = serverTasks.find(p => p.taskName === t)?.taskDisplayName || t
                const count = serverTasks.filter(p => p.taskName === t).length
                const active = filter === t
                return (
                  <button key={t} onClick={() => setFilter(t)} style={{
                    padding: "7px 14px", fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    borderRadius: 6,
                    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    background: active ? "var(--accent-2, color-mix(in srgb, var(--accent) 15%, transparent))" : "var(--surface-2)",
                    color: active ? "var(--accent)" : "var(--ink-2)",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                  }}>
                    {label}
                    <span style={{
                      fontSize: 10, fontFamily: "var(--mono)", padding: "1px 6px", borderRadius: 4,
                      background: active ? "var(--accent)" : "var(--border)",
                      color: active ? "#fff" : "var(--ink-3)",
                    }}>{count}</span>
                  </button>
                )
              })}
            </div>
          )}
          {loading ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
              サーバからタスクを取得中...
            </div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {filtered.length === 0 ? (
                <div style={{ padding: "32px 0", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
                  {error ? "タスクの取得に失敗しました" : `${pcs.find(p => p.id === activePc)?.name} で利用可能なプログラムはありません`}
                </div>
              ) : filtered.map(p => {
                const running = isRunning(p.id)
                const runItem = runningOnPc.find(r => r.id === p.id)
                return (
                  <div key={p.id}
                    className={`program-row ${selectedId === p.id ? "selected" : ""} ${running ? "running" : ""}`}
                    onClick={() => setSelectedId(p.id)}>
                    <div className="program-icon">
                      {running ? <span className="dot-pulse" /> : <I.rocket size={14} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="program-name">
                        <span className="mono">{p.displayName}</span>
                      </div>
                      <div className="program-desc">{p.description}</div>
                    </div>
                    {running ? (
                      <button className="btn danger sm" onClick={(e) => { e.stopPropagation(); stop(runItem) }}>
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
          )}
        </Section>

        <Section title="プログラム詳細" sub={selected ? selected.taskDisplayName : null}>
          {!selected ? null : (
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div className="detail-label">説明</div>
                <div style={{ fontSize: 13 }}>{selected.description || "—"}</div>
              </div>
              <div>
                <div className="detail-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  コマンドテンプレート
                  <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                    {editedTemplates[selected.id] !== undefined && editedTemplates[selected.id] !== selected.commandTemplate && (
                      <button
                        className="btn sm"
                        style={{ fontSize: 10, padding: "2px 8px" }}
                        onClick={() => setEditedTemplates(prev => { const n = { ...prev }; delete n[selected.id]; return n })}
                      >
                        リセット
                      </button>
                    )}
                    {editingTemplate ? (
                      <button
                        className="btn primary sm"
                        style={{ fontSize: 10, padding: "2px 8px" }}
                        onClick={() => setEditingTemplate(false)}
                      >
                        確定
                      </button>
                    ) : (
                      <button
                        className="btn sm"
                        style={{ fontSize: 10, padding: "2px 8px" }}
                        onClick={() => setEditingTemplate(true)}
                      >
                        編集
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  className="cmd-block mono"
                  style={{ width: "100%", resize: editingTemplate ? "vertical" : "none", minHeight: 60, boxSizing: "border-box", border: "none", outline: "none", background: "transparent", color: "var(--ink)", cursor: editingTemplate ? "text" : "default" }}
                  value={editedTemplates[selected.id] ?? selected.commandTemplate ?? ""}
                  readOnly={!editingTemplate}
                  onChange={e => setEditedTemplates(prev => ({ ...prev, [selected.id]: e.target.value }))}
                  spellCheck={false}
                />
              </div>
              {Object.keys(selected.variables).length > 0 && (
                <div>
                  <div className="detail-label">変数</div>
                  <div style={{ display: "grid", gap: 4 }}>
                    {Object.entries(selected.variables).map(([k, v]) => (
                      <div key={k} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 8, fontSize: 11, fontFamily: "var(--mono)" }}>
                        <span style={{ color: "var(--ink-3)" }}>{k}:</span>
                        <span style={{ color: "var(--ink)" }}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="detail-label">対象 PC</div>
                <div className="mono" style={{ fontSize: 12 }}>
                  {pcs.find(p => p.id === activePc)?.name} ({pcs.find(p => p.id === activePc)?.host})
                </div>
              </div>
              {isRunning(selected.id) ? (
                <button className="btn danger" onClick={() => stop(runningOnPc.find(r => r.id === selected.id))}>
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
                display: "grid", gridTemplateColumns: "auto 1fr auto auto", alignItems: "center", gap: 10,
                padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface-2)",
              }}>
                <span className="dot-pulse" />
                <span className="mono" style={{ fontSize: 12 }}>{r.taskDisplayName} / {r.displayName}</span>
                <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{Math.floor((Date.now() - new Date(r.startedAt)) / 1000)}s</span>
                <button className="btn danger sm" onClick={() => stop(r)}><I.stop size={11} /> 停止</button>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
