import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import ROSLIB from 'roslib'
import I from '../icons.jsx'
import { defaultPresets } from '../constants/defaultPresets.js'
import { useRos } from '../context/RosContext'
import { useAppContext } from '../context/AppContext'
import { getServerUrl, fetchNetworkInterfaces, fetchExecutionConfig, saveExecutionConfig } from '../services/erasersApi.js'

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

const AVAILABLE_ICONS = [
  'dashboard','joystick','map','tasks','logs','settings','bell','user','wifi','power',
  'play','pause','stop','plus','trash','refresh','download','search','arrowUp','arrowDown',
  'cam','zap','thermo','cpu','signal','pin','drag','check','x','menu',
  'speech','mic','volume','terminal','pc','arrow','chevDown','chevRight','rocket','wave',
]

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

function RosConfigModal({ pc, onClose }) {
  const [networkIfs, setNetworkIfs] = useState([])
  const [rosConfig, setRosConfig]   = useState({ network_if: "", ros_master_uri: "localhost" })
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  useEffect(() => {
    if (!pc.online) { setLoading(false); return }
    const base = getServerUrl(pc)
    Promise.all([fetchNetworkInterfaces(base), fetchExecutionConfig(base)])
      .then(([nifs, cfg]) => {
        setNetworkIfs(nifs.interfaces)
        setRosConfig({ network_if: cfg.network_if, ros_master_uri: cfg.ros_master_uri })
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleClose = async () => {
    if (pc.online) {
      try {
        await saveExecutionConfig(getServerUrl(pc), rosConfig)
      } catch { /* 閉じる操作は止めない */ }
    }
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">ROS1 実行設定 — {pc.name}</div>
          <button className="icon-btn" onClick={handleClose}><I.x size={16} /></button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div style={{ fontSize: 13, color: "var(--ink-3)", padding: "12px 0" }}>取得中...</div>
          ) : !pc.online ? (
            <div style={{ fontSize: 13, color: "var(--ink-3)", padding: "12px 0" }}>PCがオフラインのため設定できません</div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              <label style={{ display: "grid", gap: 4 }}>
                <span className="form-label">ネットワークインターフェース（ROS_IP の取得元）</span>
                <select className="input mono" value={rosConfig.network_if}
                  onChange={e => setRosConfig(p => ({ ...p, network_if: e.target.value }))}>
                  {networkIfs.map(n => (
                    <option key={n.name} value={n.name}>{n.name} — {n.ip}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span className="form-label">ROS_MASTER_URI</span>
                <input className="input mono" value={rosConfig.ros_master_uri}
                  placeholder="例: localhost, hsrb80, 192.168.11.80"
                  onChange={e => setRosConfig(p => ({ ...p, ros_master_uri: e.target.value }))} />
                <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                  エイリアス（hsrb80, hsrb33, localhost）または IP アドレスを直接入力
                </span>
              </label>
              {error && <div style={{ fontSize: 12, color: "var(--danger)" }}>{error}</div>}
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn primary sm" onClick={handleClose}><I.check size={12} /> 保存して閉じる</button>
        </div>
      </div>
    </div>
  )
}

function ModeEditModal({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    id:             initial?.id             ?? '',
    label:          initial?.label          ?? '',
    sub:            initial?.sub            ?? '',
    icon:           initial?.icon           ?? 'rocket',
    tone:           initial?.tone           ?? '',
    actionType:     initial?.action?.type   ?? 'none',
    serviceName:    initial?.action?.name        ?? '',
    serviceType:    initial?.action?.serviceType ?? '',
    serviceRequest: initial?.action?.request ? JSON.stringify(initial.action.request, null, 2) : '{}',
    publishTopic:   initial?.action?.topic   ?? '',
    publishMsgType: initial?.action?.msgType ?? '',
    publishMsg:     initial?.action?.msg ? JSON.stringify(initial.action.msg, null, 2) : '{}',
    actionlibServer: initial?.action?.server     ?? '',
    actionlibType:   initial?.action?.actionType ?? '',
    actionlibGoal:   initial?.action?.goal ? JSON.stringify(initial.action.goal, null, 2) : '{}',
  })
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const { ros, status } = useRos()
  const connected = status === 'connected'

  const [rosTopics, setRosTopics] = useState([])
  const [rosServices, setRosServices] = useState([])
  const [fetchingTpl, setFetchingTpl] = useState(false)

  const callRosapi = useCallback((name, serviceType, request) => new Promise((resolve, reject) => {
    if (!ros.current) { reject(new Error('not connected')); return }
    const svc = new ROSLIB.Service({ ros: ros.current, name, serviceType })
    svc.callService(new ROSLIB.ServiceRequest(request), resolve, reject)
  }), [ros])

  useEffect(() => {
    if (!connected) return
    callRosapi('/rosapi/topics', 'rosapi/Topics', {})
      .then(r => { if (r?.topics) setRosTopics(r.topics.map((n, i) => ({ name: n, type: r.types[i] }))) })
      .catch(() => {})
    callRosapi('/rosapi/services', 'rosapi/Services', {})
      .then(r => { if (r?.services) setRosServices(r.services) })
      .catch(() => {})
  }, [connected])

  const actionServers = useMemo(() =>
    [...new Set(rosTopics.filter(t => t.name.endsWith('/goal')).map(t => t.name.slice(0, -5)))]
  , [rosTopics])

  const handleServiceNameChange = (name) => {
    set('serviceName', name)
    if (!connected) return
    callRosapi('/rosapi/service_type', 'rosapi/ServiceType', { service: name })
      .then(r => { if (r?.type) set('serviceType', r.type) })
      .catch(() => {})
  }

  const handlePublishTopicChange = (name) => {
    set('publishTopic', name)
    const found = rosTopics.find(t => t.name === name)
    if (found) set('publishMsgType', found.type)
  }

  const handleActionServerChange = (name) => {
    set('actionlibServer', name)
    const goalTopic = rosTopics.find(t => t.name === name + '/goal')
    if (goalTopic) set('actionlibType', goalTopic.type.replace(/ActionGoal$/, 'Action'))
  }

  const fetchTemplate = (msgType, field) => {
    if (!msgType || !connected) return
    setFetchingTpl(true)
    callRosapi('/rosapi/message_details', 'rosapi/MessageDetails', { type: msgType })
      .then(r => { if (r?.typedefs?.length > 0) set(field, buildTemplate(msgType, r.typedefs)) })
      .catch(() => {})
      .finally(() => setFetchingTpl(false))
  }

  const fetchServiceRequestTemplate = (serviceType) => {
    if (!serviceType || !connected) return
    setFetchingTpl(true)
    callRosapi('/rosapi/service_request_details', 'rosapi/ServiceRequestDetails', { type: serviceType })
      .then(r => { if (r?.typedefs?.length > 0) set('serviceRequest', buildTemplate(r.typedefs[0].type, r.typedefs)) })
      .catch(() => {})
      .finally(() => setFetchingTpl(false))
  }

  const save = () => {
    if (!form.id.trim() || !form.label.trim()) { alert('ID とラベルは必須です'); return }
    let action = null
    if (form.actionType === 'service') {
      try { action = { type: 'service', name: form.serviceName, serviceType: form.serviceType, request: JSON.parse(form.serviceRequest) } }
      catch { alert('request JSON が不正です'); return }
    } else if (form.actionType === 'publish') {
      try { action = { type: 'publish', topic: form.publishTopic, msgType: form.publishMsgType, msg: JSON.parse(form.publishMsg) } }
      catch { alert('msg JSON が不正です'); return }
    } else if (form.actionType === 'actionlib') {
      try { action = { type: 'actionlib', server: form.actionlibServer, actionType: form.actionlibType, goal: JSON.parse(form.actionlibGoal) } }
      catch { alert('goal JSON が不正です'); return }
    }
    onSave({ id: form.id.trim(), label: form.label.trim(), sub: form.sub.trim(), icon: form.icon, tone: form.tone || null, action })
  }

  const PreviewIcon = I[form.icon] || I.power
  const TplBtn = ({ msgType, field, onFetch }) => (
    <button type="button" className="btn sm" style={{ marginTop: 4, width: 'fit-content' }}
      onClick={() => onFetch ? onFetch() : fetchTemplate(msgType, field)}
      disabled={fetchingTpl || !connected || !msgType}
      title={!connected ? 'rosbridge に接続してください' : !msgType ? '型を入力してください' : 'ROS からテンプレートを取得'}>
      <I.download size={11} /> {fetchingTpl ? '取得中...' : 'テンプレート取得'}
    </button>
  )

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-head">
          <div className="modal-title">{initial ? 'モードを編集' : 'モードを追加'}</div>
          <button className="icon-btn" onClick={onCancel}><I.x size={14} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', display: 'grid', gap: 12 }}>

          {/* Basic */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ display: 'grid', gap: 4 }}>
              <span className="form-label">ID <span style={{ color: 'var(--warn)' }}>*</span></span>
              <input className="input mono" value={form.id} onChange={e => set('id', e.target.value)} placeholder="auto" />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span className="form-label">ラベル <span style={{ color: 'var(--warn)' }}>*</span></span>
              <input className="input" value={form.label} onChange={e => set('label', e.target.value)} placeholder="自律走行" />
            </label>
          </div>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="form-label">説明</span>
            <input className="input" value={form.sub} onChange={e => set('sub', e.target.value)} placeholder="モードの概要説明" />
          </label>

          {/* Icon + Tone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ display: 'grid', gap: 4 }}>
              <span className="form-label">アイコン</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--surface-2)', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <PreviewIcon size={16} />
                </div>
                <select className="input" value={form.icon} onChange={e => set('icon', e.target.value)} style={{ flex: 1 }}>
                  {AVAILABLE_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                </select>
              </div>
            </label>
            <div style={{ display: 'grid', gap: 4 }}>
              <span className="form-label">トーン</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {[['', 'なし'], ['primary', 'primary'], ['danger', 'danger']].map(([v, l]) => (
                  <button key={v} onClick={() => set('tone', v)} style={{ flex: 1, justifyContent: 'center' }}
                    className={`btn sm ${form.tone === v ? (v === 'danger' ? 'danger' : 'primary') : ''}`}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Action type */}
          <div style={{ display: 'grid', gap: 6 }}>
            <span className="form-label">切替アクション</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['none', 'なし'], ['service', 'サービス'], ['publish', 'パブリッシュ'], ['actionlib', 'アクション']].map(([v, l]) => (
                <button key={v} onClick={() => set('actionType', v)} style={{ flex: 1, justifyContent: 'center' }}
                  className={`btn sm ${form.actionType === v ? 'primary' : ''}`}>{l}</button>
              ))}
            </div>
          </div>

          {/* Service fields */}
          {form.actionType === 'service' && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, display: 'grid', gap: 10, background: 'var(--surface-2)' }}>
              <label style={{ display: 'grid', gap: 4 }}>
                <span className="form-label">サービス名</span>
                <input className="input mono" value={form.serviceName} list="modal-service-names"
                  onChange={e => handleServiceNameChange(e.target.value)} placeholder="/change_mode" />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span className="form-label">サービス型</span>
                <input className="input mono" value={form.serviceType}
                  onChange={e => set('serviceType', e.target.value)} placeholder="std_srvs/Trigger" />
              </label>
              <div style={{ display: 'grid', gap: 4 }}>
                <span className="form-label">リクエスト (JSON)</span>
                <textarea className="input mono" rows={3} value={form.serviceRequest}
                  onChange={e => set('serviceRequest', e.target.value)} spellCheck={false}
                  style={{ fontFamily: 'var(--mono)', fontSize: 12, resize: 'vertical' }} />
                <TplBtn msgType={form.serviceType} field="serviceRequest"
                  onFetch={() => fetchServiceRequestTemplate(form.serviceType)} />
              </div>
            </div>
          )}

          {/* Publish fields */}
          {form.actionType === 'publish' && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, display: 'grid', gap: 10, background: 'var(--surface-2)' }}>
              <label style={{ display: 'grid', gap: 4 }}>
                <span className="form-label">トピック名</span>
                <input className="input mono" value={form.publishTopic} list="modal-topic-names"
                  onChange={e => handlePublishTopicChange(e.target.value)} placeholder="/mode_cmd" />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span className="form-label">メッセージ型</span>
                <input className="input mono" value={form.publishMsgType}
                  onChange={e => set('publishMsgType', e.target.value)} placeholder="std_msgs/String" />
              </label>
              <div style={{ display: 'grid', gap: 4 }}>
                <span className="form-label">メッセージ (JSON)</span>
                <textarea className="input mono" rows={3} value={form.publishMsg}
                  onChange={e => set('publishMsg', e.target.value)} spellCheck={false}
                  style={{ fontFamily: 'var(--mono)', fontSize: 12, resize: 'vertical' }} />
                <TplBtn msgType={form.publishMsgType} field="publishMsg" />
              </div>
            </div>
          )}

          {/* Actionlib fields */}
          {form.actionType === 'actionlib' && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, display: 'grid', gap: 10, background: 'var(--surface-2)' }}>
              <label style={{ display: 'grid', gap: 4 }}>
                <span className="form-label">アクションサーバー名</span>
                <input className="input mono" value={form.actionlibServer} list="modal-action-servers"
                  onChange={e => handleActionServerChange(e.target.value)} placeholder="/move_base" />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span className="form-label">アクション型</span>
                <input className="input mono" value={form.actionlibType}
                  onChange={e => set('actionlibType', e.target.value)} placeholder="move_base_msgs/MoveBaseAction" />
              </label>
              <div style={{ display: 'grid', gap: 4 }}>
                <span className="form-label">ゴール (JSON)</span>
                <textarea className="input mono" rows={4} value={form.actionlibGoal}
                  onChange={e => set('actionlibGoal', e.target.value)} spellCheck={false}
                  style={{ fontFamily: 'var(--mono)', fontSize: 12, resize: 'vertical' }} />
                <TplBtn msgType={form.actionlibType ? form.actionlibType.replace(/\/(\w+)Action$/, '/$1Goal') : ''} field="actionlibGoal" />
              </div>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onCancel}>キャンセル</button>
          <button className="btn primary" onClick={save}><I.check size={14} /> {initial ? '更新' : '追加'}</button>
        </div>

        {/* Datalists (rosbridge 接続時のみ有効) */}
        <datalist id="modal-topic-names">
          {rosTopics.map(t => <option key={t.name} value={t.name}>{t.type}</option>)}
        </datalist>
        <datalist id="modal-service-names">
          {rosServices.map(s => <option key={s} value={s} />)}
        </datalist>
        <datalist id="modal-action-servers">
          {actionServers.map(s => <option key={s} value={s} />)}
        </datalist>
      </div>
    </div>
  )
}

function isValidHost(v) {
  if (!v) return false
  const ipv4 = v.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4) return ipv4.slice(1).every(n => +n <= 255)
  return /^[a-zA-Z0-9]([a-zA-Z0-9\-.]*[a-zA-Z0-9])?$/.test(v)
}

function isValidPort(v) {
  const n = parseInt(v, 10)
  return !isNaN(n) && n >= 1 && n <= 65535 && String(n) === v.trim()
}

export function Settings({ controls, setControls, rosbridge, setRosbridge, pcs, setPcs, activePc, setActivePc, robotType, setRobotType }) {
  const [host, setHost] = useState(rosbridge.host)
  const [port, setPort] = useState(rosbridge.port)

  // ロボット種切り替えでコンテキストの rosbridge が更新されたらフォームも追従する
  useEffect(() => { setHost(rosbridge.host) }, [rosbridge.host])
  useEffect(() => { setPort(rosbridge.port) }, [rosbridge.port])

  const { ros, status } = useRos()
  const { checkPcStatus, robotPresets, setRobotPresets, activePreset, rosConfigs, loadRosConfig } = useAppContext()
  const connected = status === 'connected'

  const [rosTopics, setRosTopics] = useState([])
  const callRosapi = useCallback((name, serviceType, request) => new Promise((resolve, reject) => {
    if (!ros.current) { reject(new Error('not connected')); return }
    const svc = new ROSLIB.Service({ ros: ros.current, name, serviceType })
    svc.callService(new ROSLIB.ServiceRequest(request), resolve, reject)
  }), [ros])
  useEffect(() => {
    if (!connected) { setRosTopics([]); return }
    callRosapi('/rosapi/topics', 'rosapi/Topics', {})
      .then(r => { if (r?.topics) setRosTopics(r.topics.map((n, i) => ({ name: n, type: r.types[i] }))) })
      .catch(() => {})
  }, [connected])

  const hostInvalid   = host !== '' && !isValidHost(host)
  const portInvalid   = port !== '' && !isValidPort(port)

  const save = () => {
    if (!isValidHost(host) || !isValidPort(port)) return
    setRosbridge({ host, port, ssl: false })
    // 現在のロボット種のプリセットにも保存して、種別切り替え時に復元できるようにする
    updatePreset(p => ({ ...p, rosbridge: { host, port } }))
  }
  const url = `ws://${host}:${port}`

  const statusLabel = {
    connected:    { text: "接続中", cls: "ok" },
    connecting:   { text: "接続中...", cls: "warn" },
    disconnected: { text: "未接続", cls: "danger" },
    error:        { text: "エラー", cls: "danger" },
  }[status] || { text: status, cls: "" }

  const [newPc, setNewPc] = useState({ name: "", host: "" })
  const newPcHostInvalid = newPc.host !== '' && !isValidHost(newPc.host)

  const addPc = () => {
    if (!newPc.name || !newPc.host || !isValidHost(newPc.host)) return
    const id = "pc-" + Date.now()
    const h = newPc.host
    setPcs(prev => {
      const next = [...prev, { ...newPc, id, online: false }]
      if (!activePc) setActivePc(id)
      return next
    })
    setNewPc({ name: "", host: "" })
    checkPcStatus(id, h)
  }
  const removePc = (id) => {
    setPcs(prev => prev.filter(p => p.id !== id))
    if (activePc === id) setActivePc(pcs.find(p => p.id !== id)?.id ?? null)
  }

  const [rosModalPc, setRosModalPc] = useState(null)

  // --- Robot type management ---
  const [addingRobot, setAddingRobot] = useState(false)
  const [newRobotName, setNewRobotName] = useState('')
  const [renamingKey, setRenamingKey] = useState(null)
  const [renameValue, setRenameValue] = useState('')

  const addRobotType = () => {
    const name = newRobotName.trim()
    if (!name) return
    const key = 'robot_' + Date.now()
    setRobotPresets(prev => ({
      ...prev,
      [key]: {
        label: name,
        speech:  { topic: '/robot/speech',  msgType: 'std_msgs/String' },
        battery: { topic: '/battery_state', msgType: 'sensor_msgs/BatteryState' },
        cmdVel:  { topic: '/cmd_vel',       msgType: 'geometry_msgs/Twist' },
        modeGroups: [],
      },
    }))
    setRobotType(key)
    setNewRobotName('')
    setAddingRobot(false)
  }

  const removeRobotType = (key) => {
    const keys = Object.keys(robotPresets)
    if (keys.length <= 1) return
    setRobotPresets(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    if (robotType === key) setRobotType(keys.find(k => k !== key))
  }

  const startRename = (key, currentLabel) => {
    setRenamingKey(key)
    setRenameValue(currentLabel)
  }

  const commitRename = (key) => {
    const label = renameValue.trim()
    if (label) setRobotPresets(prev => ({ ...prev, [key]: { ...prev[key], label } }))
    setRenamingKey(null)
  }

  // --- Preset editor state ---
  const [editModal, setEditModal]     = useState(null) // { groupIdx, modeIdx } or null
  const [addingGroup, setAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const importFileRef = useRef(null)

  // Helper: update the preset for the current robot type
  const updatePreset = (updater) => {
    setRobotPresets(prev => ({
      ...prev,
      [robotType]: updater(prev[robotType] ?? defaultPresets[robotType]),
    }))
  }

  const updateSpeech = (field, value) => {
    updatePreset(p => ({ ...p, speech: { ...p.speech, [field]: value } }))
  }

  const updateBattery = (field, value) => {
    updatePreset(p => ({ ...p, battery: { ...p.battery, [field]: value } }))
  }

  const updateCmdVel = (field, value) => {
    updatePreset(p => ({ ...p, cmdVel: { ...p.cmdVel, [field]: value } }))
  }

  const handleTopicChange = (updater, value) => {
    updater('topic', value)
    const found = rosTopics.find(t => t.name === value)
    if (found) updater('msgType', found.type)
  }

  const addGroup = (name) => {
    if (!name.trim()) return
    updatePreset(p => ({ ...p, modeGroups: [...(p.modeGroups ?? []), { group: name.trim(), modes: [] }] }))
    setNewGroupName('')
    setAddingGroup(false)
  }

  const deleteGroup = (gi) => {
    updatePreset(p => ({ ...p, modeGroups: p.modeGroups.filter((_, i) => i !== gi) }))
  }

  const addMode = (gi, mode) => {
    updatePreset(p => ({
      ...p,
      modeGroups: p.modeGroups.map((g, i) => i === gi ? { ...g, modes: [...g.modes, mode] } : g),
    }))
  }

  const updateMode = (gi, mi, mode) => {
    updatePreset(p => ({
      ...p,
      modeGroups: p.modeGroups.map((g, i) =>
        i === gi ? { ...g, modes: g.modes.map((m, j) => j === mi ? mode : m) } : g),
    }))
  }

  const deleteMode = (gi, mi) => {
    updatePreset(p => ({
      ...p,
      modeGroups: p.modeGroups.map((g, i) =>
        i === gi ? { ...g, modes: g.modes.filter((_, j) => j !== mi) } : g),
    }))
  }

  const resetToDefault = async () => {
    try {
      const res = await fetch('/robot-presets.json')
      const data = await res.json()
      setRobotPresets(prev => ({ ...prev, [robotType]: data[robotType] ?? defaultPresets[robotType] }))
    } catch {
      setRobotPresets(prev => ({ ...prev, [robotType]: defaultPresets[robotType] }))
    }
  }

  const exportPresets = () => {
    const blob = new Blob([JSON.stringify(robotPresets, null, 2)], { type: 'application/json' })
    const url2 = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url2; a.download = 'robot-presets.json'; a.click()
    URL.revokeObjectURL(url2)
  }

  const importPresets = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const inputEl = e.target
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (data && typeof data === 'object') {
          setRobotPresets(data)
        } else {
          alert('不正な JSON フォーマットです')
        }
      } catch {
        alert('JSON の解析に失敗しました')
      } finally {
        inputEl.value = ''
      }
    }
    reader.readAsText(file)
  }

  const modeGroups = activePreset?.modeGroups ?? []
  const totalModes = modeGroups.flatMap(g => g.modes).length

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="page-head">
        <div>
          <h2 className="page-title">設定</h2>
          <div className="page-sub">GLOBAL_CONFIG</div>
        </div>
      </div>

      <Section title="ロボットの種類" sub="ROBOT_PROFILE" tools={
        <button className="btn primary sm" onClick={() => { setAddingRobot(true); setNewRobotName('') }}>
          <I.plus size={12} /> 追加
        </button>
      }>
        <div className="robot-type-grid">
          {Object.entries(robotPresets).map(([key, preset]) => {
            const count = preset?.modeGroups?.flatMap(g => g.modes).length ?? 0
            const label = preset?.label ?? key
            const isLast = Object.keys(robotPresets).length === 1
            return (
              <div key={key}>
                {renamingKey === key ? (
                  <div className="robot-type-card" style={{ alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>名前を変更</span>
                    <input className="input" autoFocus value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') commitRename(key); if (e.key === 'Escape') setRenamingKey(null) }}
                      style={{ textAlign: 'center', padding: '4px 8px', fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => commitRename(key)}><I.check size={12} /></button>
                      <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => setRenamingKey(null)}><I.x size={12} /></button>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => setRobotType(key)}
                    className={`robot-type-card ${robotType === key ? "active" : ""}`}
                    style={{ width: '100%', cursor: 'pointer', position: 'relative' }}>
                    <I.joystick size={22} />
                    <div className="robot-type-label">{label}</div>
                    <div className="robot-type-modes mono">{count} モード</div>
                    <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 2 }}>
                      <button className="icon-btn" style={{ width: 22, height: 22 }} title="名前を変更"
                        onClick={e => { e.stopPropagation(); startRename(key, label) }}>
                        <I.settings size={10} />
                      </button>
                      {!isLast && (
                        <button className="icon-btn" style={{ width: 22, height: 22 }} title="削除"
                          onClick={e => { e.stopPropagation(); removeRobotType(key) }}>
                          <I.trash size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {addingRobot && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input className="input" autoFocus placeholder="ロボット名 (例: HSR)" value={newRobotName}
              onChange={e => setNewRobotName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addRobotType(); if (e.key === 'Escape') { setAddingRobot(false); setNewRobotName('') } }} />
            <button className="btn primary" onClick={addRobotType}><I.plus size={14} /> 追加</button>
            <button className="btn" onClick={() => { setAddingRobot(false); setNewRobotName('') }}><I.x size={14} /></button>
          </div>
        )}

        <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--surface-2)", borderRadius: 6, border: "1px solid var(--border)", fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>
          ※ ロボットの種類によって、発話モニターの受信トピックと遠隔操作の操作モードが切り替わります
        </div>
      </Section>

      <Section title="rosbridge 接続" sub="WEBSOCKET ENDPOINT" tools={
        <button className="btn primary sm" onClick={save} disabled={!host || hostInvalid || !port || portInvalid}>
          <I.check size={12} /> 設定
        </button>
      }>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, alignItems: "start" }} className="rosbridge-form">
          <label style={{ display: "grid", gap: 4 }}>
            <span className="form-label">ホスト / IPアドレス</span>
            <input className="input mono" value={host} onChange={e => setHost(e.target.value)} placeholder="192.168.1.10"
              style={hostInvalid ? { borderColor: "var(--danger, #e53e3e)" } : undefined} />
            {hostInvalid && <span style={{ fontSize: 11, color: "var(--danger, #e53e3e)", fontFamily: "var(--mono)" }}>無効なホスト / IPアドレスです</span>}
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span className="form-label">ポート</span>
            <input className="input mono" value={port} onChange={e => setPort(e.target.value)} placeholder="9090"
              style={portInvalid ? { borderColor: "var(--danger, #e53e3e)" } : undefined} />
            {portInvalid && <span style={{ fontSize: 11, color: "var(--danger, #e53e3e)", fontFamily: "var(--mono)" }}>1–65535</span>}
          </label>
        </div>
        <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--surface-2)", borderRadius: 6, border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span className="mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>
            URL: <span style={{ color: "var(--ink)" }}>{url}</span>
          </span>
          <span className={`chip ${statusLabel.cls}`}>
            <span className="dot" /> {statusLabel.text}
          </span>
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>
          ※ 「設定」を押すと現在のロボット種に紐づけて保存されます。ロボットの種類を切り替えると自動的に接続先が更新されます
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
                {rosConfigs[pc.id] && (
                  <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>
                    {rosConfigs[pc.id].network_if} {rosConfigs[pc.id].ip ? `(${rosConfigs[pc.id].ip})` : ""} · {rosConfigs[pc.id].ros_master_uri}
                  </div>
                )}
              </div>
              {activePc === pc.id ? (
                <span className="chip" style={{ background: "var(--accent-2)", color: "var(--accent)", borderColor: "transparent" }}>使用中</span>
              ) : (
                <button className="btn sm" onClick={() => setActivePc(pc.id)}>選択</button>
              )}
              <button className="btn sm" onClick={() => setRosModalPc(pc)}><I.settings size={12} /> ROS1</button>
              <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => removePc(pc.id)}><I.trash size={12} /></button>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
          <div className="form-label" style={{ marginBottom: 8 }}>新規PC追加</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "start" }} className="pc-add-form">
            <input className="input" placeholder="名前 (例: robot-pc-01)" value={newPc.name} onChange={e => setNewPc(p => ({ ...p, name: e.target.value }))} />
            <div style={{ display: "grid", gap: 4 }}>
              <input className="input mono" placeholder="192.168.1.20" value={newPc.host}
                onChange={e => setNewPc(p => ({ ...p, host: e.target.value }))}
                style={newPcHostInvalid ? { borderColor: "var(--danger, #e53e3e)" } : undefined} />
              {newPcHostInvalid && <span style={{ fontSize: 11, color: "var(--danger, #e53e3e)", fontFamily: "var(--mono)" }}>無効なホスト / IPアドレスです</span>}
            </div>
            <button className="btn primary" onClick={addPc} disabled={!newPc.name || !newPc.host || newPcHostInvalid}>
              <I.plus size={14} /> 追加
            </button>
          </div>
        </div>
      </Section>

      {rosModalPc && <RosConfigModal pc={rosModalPc} onClose={() => { loadRosConfig(rosModalPc); setRosModalPc(null) }} />}

      {/* Preset editor — ロボットタイプが選択されているときのみ表示 */}
      {robotPresets[robotType] && <Section
        title="ロボットプリセット設定"
        sub={`${robotPresets[robotType]?.label ?? robotType} · ${totalModes} モード`}
        tools={
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn sm" onClick={exportPresets}><I.download size={12} /> エクスポート</button>
            <label className="btn sm" style={{ cursor: 'pointer' }}>
              <I.refresh size={12} /> インポート
              <input type="file" accept=".json" style={{ display: 'none' }} ref={importFileRef} onChange={importPresets} />
            </label>
          </div>
        }
      >
        {/* Speech config */}
        <div style={{ marginBottom: 16 }}>
          <div className="form-label" style={{ marginBottom: 8 }}>発話モニター · 受信トピック</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }} className="rosbridge-form">
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>トピック</span>
              <input className="input mono" list="preset-topic-names" value={activePreset?.speech?.topic ?? ''} onChange={e => handleTopicChange(updateSpeech, e.target.value)} placeholder="/robot/speech" />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>メッセージ型</span>
              <input className="input mono" value={activePreset?.speech?.msgType ?? ''} onChange={e => updateSpeech('msgType', e.target.value)} placeholder="std_msgs/String" />
            </label>
            <button className="btn sm" onClick={resetToDefault} title="公開プリセットファイルからリセット">
              <I.refresh size={12} /> デフォルト
            </button>
          </div>
        </div>

        {/* Battery config */}
        <div style={{ marginBottom: 16 }}>
          <div className="form-label" style={{ marginBottom: 8 }}>バッテリー · 受信トピック</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'end' }} className="rosbridge-form">
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>トピック</span>
              <input className="input mono" list="preset-topic-names" value={activePreset?.battery?.topic ?? ''} onChange={e => handleTopicChange(updateBattery, e.target.value)} placeholder="/battery_state" />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>メッセージ型</span>
              <input className="input mono" value={activePreset?.battery?.msgType ?? ''} onChange={e => updateBattery('msgType', e.target.value)} placeholder="sensor_msgs/BatteryState" />
            </label>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>
            BatteryState: percentage (0–1) · Float32/64: data (0–100)
          </div>
        </div>

        {/* CmdVel config */}
        <div style={{ marginBottom: 16 }}>
          <div className="form-label" style={{ marginBottom: 8 }}>速度指令 · トピック</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'end' }} className="rosbridge-form">
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>トピック</span>
              <input className="input mono" list="preset-topic-names" value={activePreset?.cmdVel?.topic ?? ''} onChange={e => handleTopicChange(updateCmdVel, e.target.value)} placeholder="/cmd_vel" />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>メッセージ型</span>
              <input className="input mono" value={activePreset?.cmdVel?.msgType ?? ''} onChange={e => updateCmdVel('msgType', e.target.value)} placeholder="geometry_msgs/Twist" />
            </label>
          </div>
        </div>

        {/* Mode groups */}
        <div className="form-label" style={{ marginBottom: 8 }}>操作モードプリセット</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {modeGroups.map((g, gi) => (
            <div key={gi} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {/* Group header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', flex: 1 }}>{g.group}</span>
                <span className="chip mono" style={{ fontSize: 9 }}>{g.modes.length}</span>
                <button className="btn sm" onClick={() => setEditModal({ groupIdx: gi, modeIdx: null })}><I.plus size={11} /> モード</button>
                <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => deleteGroup(gi)} title="グループを削除"><I.trash size={11} /></button>
              </div>
              {/* Mode rows */}
              {g.modes.length === 0 && (
                <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>モードなし</div>
              )}
              {g.modes.map((m, mi) => {
                const Icon = I[m.icon] || I.power
                const hasAction = !!m.action
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderBottom: mi < g.modes.length - 1 ? '1px solid var(--border)' : undefined }}>
                    <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--surface-2)', borderRadius: 5, border: '1px solid var(--border)', flexShrink: 0 }}>
                      <Icon size={13} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{m.label}</span>
                        {m.tone && <span className={`chip ${m.tone}`} style={{ fontSize: 9 }}>{m.tone}</span>}
                      </div>
                      <div className="mono" style={{ fontSize: 10, color: hasAction ? 'var(--accent)' : 'var(--ink-3)' }}>
                        {hasAction
                          ? m.action.type === 'service'
                            ? `svc · ${m.action.name}`
                            : `pub · ${m.action.topic}`
                          : 'アクションなし'}
                      </div>
                    </div>
                    <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => setEditModal({ groupIdx: gi, modeIdx: mi })}><I.settings size={11} /></button>
                    <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => deleteMode(gi, mi)}><I.trash size={11} /></button>
                  </div>
                )
              })}
            </div>
          ))}

          {/* Add group */}
          {addingGroup ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="input" placeholder="グループ名 (例: 自律動作)" value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addGroup(newGroupName); if (e.key === 'Escape') setAddingGroup(false) }}
                autoFocus />
              <button className="btn primary" onClick={() => addGroup(newGroupName)}><I.plus size={14} /> 追加</button>
              <button className="btn" onClick={() => { setAddingGroup(false); setNewGroupName('') }}><I.x size={14} /></button>
            </div>
          ) : (
            <button className="btn sm" onClick={() => setAddingGroup(true)} style={{ justifyContent: 'center' }}>
              <I.plus size={12} /> グループを追加
            </button>
          )}
        </div>
      </Section>}

      <datalist id="preset-topic-names">
        {rosTopics.map(t => <option key={t.name} value={t.name}>{t.type}</option>)}
      </datalist>

      {/* Mode edit modal */}
      {editModal && (
        <ModeEditModal
          initial={editModal.modeIdx !== null ? modeGroups[editModal.groupIdx]?.modes[editModal.modeIdx] : null}
          onSave={mode => {
            editModal.modeIdx !== null
              ? updateMode(editModal.groupIdx, editModal.modeIdx, mode)
              : addMode(editModal.groupIdx, mode)
            setEditModal(null)
          }}
          onCancel={() => setEditModal(null)}
        />
      )}
    </div>
  )
}
