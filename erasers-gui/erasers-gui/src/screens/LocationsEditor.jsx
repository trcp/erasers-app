import { useState } from 'react'
import I from '../icons.jsx'
import { useAppContext } from '../context/AppContext'
import { getServerUrl, getXml, saveXml } from '../services/erasersApi.js'
import { parseLocationsXml, serializeLocationsXml } from '../utils/locationsXml.js'

// 実運用ではロボット上の実ファイルパスに合わせて調整する（入力欄で随時変更可）
const DEFAULT_XML_PATH = '/home/roboworks/erasers-app/erasers-gui/map_xml_sample/locations_robocup2024.xml'

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

const emptyLocation = () => ({ name: "", global_position: "0 0 0 0", put_position: "0 0 0", isDoor: false })
const emptyRoom = () => ({ name: "", position: "0.0 0.0 0.0 0.0", locations: [] })

export function LocationsEditor({ pcs, activePc, setActivePc }) {
  const [path, setPath]       = useState(DEFAULT_XML_PATH)
  const [rooms, setRooms]     = useState(null)   // null = 未読込
  const [rawText, setRawText] = useState("")     // パース失敗時の確認用
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)
  const [notice, setNotice]   = useState(null)
  const [collapsed, setCollapsed] = useState({}) // roomIndex -> bool

  const activePc_ = pcs.find(p => p.id === activePc)

  const load = async () => {
    if (!activePc_) { setError("接続先 PC を選択してください"); return }
    setLoading(true); setError(null); setNotice(null)
    try {
      const baseUrl = getServerUrl(activePc_)
      const text = await getXml(baseUrl, path)
      setRawText(text)
      const { rooms } = parseLocationsXml(text)
      setRooms(rooms)
      setCollapsed({})
      setNotice(`読込成功: ${rooms.length} 部屋 / ${rooms.reduce((n, r) => n + r.locations.length, 0)} 地点`)
    } catch (err) {
      setRooms(null)
      setError(`読込失敗: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const save = async () => {
    if (!activePc_) { setError("接続先 PC を選択してください"); return }
    if (!rooms) return
    setSaving(true); setError(null); setNotice(null)
    try {
      const baseUrl = getServerUrl(activePc_)
      const content = serializeLocationsXml({ rooms })
      const res = await saveXml(baseUrl, path, content)
      setRawText(content)
      setNotice(`保存しました: ${res.path ?? path}`)
    } catch (err) {
      setError(`保存失敗: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // --- rooms 配列のイミュータブル更新ヘルパー ---
  const updateRoom = (ri, patch) =>
    setRooms(rs => rs.map((r, i) => i === ri ? { ...r, ...patch } : r))
  const updateLoc = (ri, li, patch) =>
    setRooms(rs => rs.map((r, i) => i !== ri ? r : {
      ...r, locations: r.locations.map((l, j) => j === li ? { ...l, ...patch } : l),
    }))
  const addRoom = () => setRooms(rs => [...(rs ?? []), emptyRoom()])
  const removeRoom = (ri) => setRooms(rs => rs.filter((_, i) => i !== ri))
  const addLoc = (ri) =>
    setRooms(rs => rs.map((r, i) => i !== ri ? r : { ...r, locations: [...r.locations, emptyLocation()] }))
  const removeLoc = (ri, li) =>
    setRooms(rs => rs.map((r, i) => i !== ri ? r : { ...r, locations: r.locations.filter((_, j) => j !== li) }))

  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "5px 8px",
    fontSize: 12, fontFamily: "var(--mono)",
    border: "1px solid var(--border)", borderRadius: 5,
    background: "var(--surface)", color: "var(--ink)", outline: "none",
  }

  if (pcs.length === 0) {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        <div className="page-head">
          <div>
            <h2 className="page-title">ロケーション編集</h2>
            <div className="page-sub">LOCATIONS_XML_EDITOR</div>
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

  const totalLocs = rooms ? rooms.reduce((n, r) => n + r.locations.length, 0) : 0

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="page-head">
        <div>
          <h2 className="page-title">ロケーション編集</h2>
          <div className="page-sub">
            LOCATIONS_XML_EDITOR{rooms ? ` · ${rooms.length} 部屋 · ${totalLocs} 地点` : ""}
          </div>
        </div>
      </div>

      <Section title="接続先 PC" sub="ファイルを読み書きする遠隔PCを選択">
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
            </button>
          ))}
        </div>
      </Section>

      <Section title="ファイル" sub="ロボット上の絶対パス（.xml）" tools={
        <>
          <button className="btn sm" disabled={loading} onClick={load}>
            <I.refresh size={11} /> {loading ? "読込中..." : "読込"}
          </button>
          <button className="btn primary sm" disabled={saving || !rooms} onClick={save}>
            <I.download size={11} /> {saving ? "保存中..." : "保存"}
          </button>
        </>
      }>
        <input
          style={inputStyle}
          value={path}
          onChange={e => setPath(e.target.value)}
          placeholder="/path/to/locations.xml"
          spellCheck={false}
        />
      </Section>

      {error && (
        <div className="card" style={{ border: "1px solid var(--danger, #e53e3e)" }}>
          <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", fontSize: 13, color: "var(--danger, #e53e3e)" }}>
            <I.stop size={14} />
            <span style={{ flex: 1, wordBreak: "break-all" }}>{error}</span>
            <button className="btn sm" onClick={() => setError(null)}>閉じる</button>
          </div>
        </div>
      )}

      {notice && !error && (
        <div className="card" style={{ border: "1px solid var(--accent)" }}>
          <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", fontSize: 13, color: "var(--accent)" }}>
            <I.check size={14} />
            <span style={{ flex: 1, wordBreak: "break-all" }}>{notice}</span>
            <button className="btn sm" onClick={() => setNotice(null)}>閉じる</button>
          </div>
        </div>
      )}

      {rooms === null ? (
        <div className="card">
          <div className="card-body" style={{ padding: "48px 24px", textAlign: "center", display: "grid", gap: 12, justifyItems: "center" }}>
            <I.map size={32} style={{ color: "var(--ink-3)" }} />
            <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
              {error
                ? "読込に失敗しました。パスと PC を確認してください"
                : "「読込」でファイルを読み込んでください"}
            </div>
            {error && rawText && (
              <pre className="mono" style={{ textAlign: "left", maxHeight: 200, overflow: "auto", width: "100%", fontSize: 11, background: "var(--surface-2)", padding: 12, borderRadius: 6, whiteSpace: "pre-wrap" }}>
                {rawText.slice(0, 2000)}
              </pre>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {rooms.map((room, ri) => (
            <Section
              key={ri}
              title={
                <button
                  onClick={() => setCollapsed(c => ({ ...c, [ri]: !c[ri] }))}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "inherit", font: "inherit", cursor: "pointer", padding: 0 }}
                >
                  {collapsed[ri] ? <I.chevRight size={14} /> : <I.chevDown size={14} />}
                  <I.pin size={14} /> {room.name || "(無名の部屋)"}
                </button>
              }
              sub={`${room.locations.length} 地点`}
              tools={
                <>
                  <button className="btn sm" onClick={() => addLoc(ri)}>
                    <I.plus size={11} /> 地点追加
                  </button>
                  <button className="btn danger sm" onClick={() => removeRoom(ri)}>
                    <I.trash size={11} /> 部屋削除
                  </button>
                </>
              }
            >
              {!collapsed[ri] && (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto 1fr", gap: 8, alignItems: "center" }}>
                    <span className="detail-label" style={{ margin: 0 }}>name</span>
                    <input style={inputStyle} value={room.name} spellCheck={false}
                      onChange={e => updateRoom(ri, { name: e.target.value })} />
                    <span className="detail-label" style={{ margin: 0 }}>position</span>
                    <input style={inputStyle} value={room.position} spellCheck={false}
                      onChange={e => updateRoom(ri, { position: e.target.value })} />
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ textAlign: "left", color: "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 11 }}>
                          <th style={{ padding: "4px 6px", minWidth: 160 }}>name</th>
                          <th style={{ padding: "4px 6px", minWidth: 200 }}>global_position</th>
                          <th style={{ padding: "4px 6px", minWidth: 120 }}>put_position</th>
                          <th style={{ padding: "4px 6px", width: 50, textAlign: "center" }}>isDoor</th>
                          <th style={{ padding: "4px 6px", width: 36 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {room.locations.length === 0 ? (
                          <tr><td colSpan={5} style={{ padding: "16px 6px", color: "var(--ink-3)", textAlign: "center" }}>地点がありません</td></tr>
                        ) : room.locations.map((loc, li) => (
                          <tr key={li} style={{ borderTop: "1px solid var(--border)" }}>
                            <td style={{ padding: "4px 6px" }}>
                              <input style={inputStyle} value={loc.name} spellCheck={false}
                                onChange={e => updateLoc(ri, li, { name: e.target.value })} />
                            </td>
                            <td style={{ padding: "4px 6px" }}>
                              <input style={inputStyle} value={loc.global_position} spellCheck={false}
                                onChange={e => updateLoc(ri, li, { global_position: e.target.value })} />
                            </td>
                            <td style={{ padding: "4px 6px" }}>
                              <input style={inputStyle} value={loc.put_position} spellCheck={false}
                                onChange={e => updateLoc(ri, li, { put_position: e.target.value })} />
                            </td>
                            <td style={{ padding: "4px 6px", textAlign: "center" }}>
                              <input type="checkbox" checked={loc.isDoor}
                                onChange={e => updateLoc(ri, li, { isDoor: e.target.checked })} />
                            </td>
                            <td style={{ padding: "4px 6px", textAlign: "center" }}>
                              <button className="icon-btn" title="この地点を削除" onClick={() => removeLoc(ri, li)}>
                                <I.trash size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Section>
          ))}

          <button className="btn" onClick={addRoom} style={{ justifySelf: "start" }}>
            <I.plus size={14} /> 部屋を追加
          </button>
        </div>
      )}
    </div>
  )
}
