import { useEffect } from 'react'
import I from '../icons.jsx'
import { useAppContext } from '../context/AppContext'

const uttFontSize = (len, scale = 1) => {
  if (len <= 20) return `clamp(${32*scale}px, ${4.2*scale}vw, ${56*scale}px)`
  if (len <= 40) return `clamp(${24*scale}px, ${3.2*scale}vw, ${44*scale}px)`
  if (len <= 80) return `clamp(${18*scale}px, ${2.4*scale}vw, ${32*scale}px)`
  return `clamp(${14*scale}px, ${1.8*scale}vw, ${24*scale}px)`
}

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

export function Speech({ utterances, pcName, onReplay }) {
  const { activePreset, imageViewerTopic } = useAppContext()
  const speechTopic = activePreset?.speech?.topic ?? '/robot/speech'

  const latest = utterances[0]

  return (
    <div className="speech-screen">
      <div className="utterance-modal">
        <div className="utt-head">
          <div className="utt-avatar">
            <I.wave size={22} />
          </div>
          <div className="utt-meta">
            <div className="utt-status">
              <span className="utt-led" /> 最新の発話
            </div>
            <div className="utt-source">{speechTopic} · 受信モニター</div>
          </div>
          <div className="utt-time mono">
            {latest ? latest.time.toLocaleTimeString("ja-JP", { hour12: false }) : "--:--:--"}
          </div>
        </div>
        <div className="utt-body">
          {latest ? (
            <div className="utt-text" style={{ fontSize: uttFontSize(latest.text.length) }}>
              <span className="utt-quote">"</span>
              {latest.text}
              <span className="utt-quote">"</span>
            </div>
          ) : (
            <div className="utt-empty">ロボットからの発話を待機中です...</div>
          )}
        </div>
        <div className="utt-hint">
          <I.speech size={12} />
          新しい発話が到着すると、画面全体に 10秒間 表示されます
        </div>
        {imageViewerTopic ? (
          <div className="utt-hint">
            <span className="utt-led speaking" />
            画像サブスクライブ中: <span className="mono">{imageViewerTopic}</span>
          </div>
        ) : null}
      </div>

      <Section title="発話履歴" sub={`${utterances.length} ENTRIES`}>
        {utterances.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
            まだ発話はありません
          </div>
        ) : (
          <div className="utt-history">
            {utterances.map(u => (
              <div key={u.id} className="utt-row">
                <div className="utt-row-time mono">{u.time.toLocaleTimeString("ja-JP", { hour12: false })}</div>
                <div className="utt-row-src chip">{u.source === "manual" ? "手動" : u.source === "ros" ? "ROS" : "AUTO"}</div>
                <div className="utt-row-text">{u.text}</div>
                {onReplay ? (
                  <button className="icon-btn" style={{ width: 28, height: 28 }} title="もう一度表示" onClick={() => onReplay(u)}>
                    <I.refresh size={12} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

export function ImageOverlay({ image, onClose }) {
  return (
    <div className="utt-overlay" onClick={onClose}>
      <div className="img-overlay-card" onClick={e => e.stopPropagation()}>
        <div className="utt-overlay-head">
          <div className="utt-overlay-avatar">
            <I.map size={28} />
          </div>
          <div className="utt-overlay-meta">
            <div className="utt-overlay-label"><span className="utt-led speaking" /> 画像表示</div>
            <div className="utt-overlay-time mono">{image.time.toLocaleTimeString("ja-JP", { hour12: false })}</div>
          </div>
          <button className="icon-btn bordered" onClick={onClose}><I.x size={16} /></button>
        </div>
        <div className="img-overlay-body">
          <img src={image.dataUrl} alt="display" className="img-overlay-img" />
        </div>
        <div className="utt-overlay-hint">クリック / ESC で閉じる</div>
      </div>
    </div>
  )
}

export function UtteranceOverlay({ utterance, onClose }) {
  useEffect(() => {
    const id = setTimeout(onClose, 10000)
    return () => clearTimeout(id)
  }, [utterance.id])

  return (
    <div className="utt-overlay" onClick={onClose}>
      <div className="utt-overlay-card" onClick={e => e.stopPropagation()}>
        <div className="utt-overlay-head">
          <div className="utt-overlay-avatar">
            <I.wave size={28} />
            <span className="utt-pulse" />
          </div>
          <div className="utt-overlay-meta">
            <div className="utt-overlay-label"><span className="utt-led speaking" /> ロボットからの発話</div>
            <div className="utt-overlay-time mono">{utterance.time.toLocaleTimeString("ja-JP", { hour12: false })}</div>
          </div>
          <button className="icon-btn bordered" onClick={onClose}><I.x size={16} /></button>
        </div>
        <div className="utt-overlay-text" style={{ fontSize: uttFontSize(utterance.text.length, 1.27) }}>
          <span className="utt-quote">"</span>
          {utterance.text}
          <span className="utt-quote">"</span>
        </div>
        <div className="utt-overlay-wave">
          {Array.from({ length: 48 }).map((_, i) => (
            <span key={i} style={{ animationDelay: `${i * 45}ms` }} />
          ))}
        </div>
        <div className="utt-overlay-progress">
          <div className="utt-overlay-progress-bar" key={utterance.id} />
        </div>
        <div className="utt-overlay-hint">クリック / ESC で閉じる · 10 秒で自動閉</div>
      </div>
    </div>
  )
}
