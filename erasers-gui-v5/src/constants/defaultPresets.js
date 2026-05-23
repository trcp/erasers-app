// バンドル時のフォールバック用デフォルトプリセット
// public/robot-presets.json と同じ構造を持ち、fetch 失敗時に使用される
export const defaultPresets = {
  AMR: {
    label: "移動ロボット (AMR)",
    speech:  { topic: "/robot/speech",  msgType: "std_msgs/String" },
    battery: { topic: "/battery_state", msgType: "sensor_msgs/BatteryState" },
    cmdVel:  { topic: "/cmd_vel",        msgType: "geometry_msgs/Twist" },
    modeGroups: [
      { group: "自律動作", modes: [
        { id: "auto",    label: "自律走行",   sub: "タスクを自動で実行",        icon: "rocket",   tone: "primary", action: null },
        { id: "patrol",  label: "巡回モード", sub: "ルートを繰り返し巡回",       icon: "refresh",  tone: null,      action: null },
        { id: "follow",  label: "追従モード", sub: "人・ターゲットを追尾",       icon: "user",     tone: null,      action: null },
      ]},
      { group: "手動・調整", modes: [
        { id: "manual",  label: "手動操作",   sub: "ジョイスティックで遠隔操作", icon: "joystick", tone: null, action: null },
        { id: "jog",     label: "ジョグ送り", sub: "微動作で位置調整",           icon: "pin",      tone: null, action: null },
      ]},
      { group: "状態", modes: [
        { id: "dock",    label: "充電復帰",   sub: "ドッキングステーションへ",   icon: "zap",   tone: null, action: null },
        { id: "standby", label: "待機",       sub: "エネルギー節約モード",       icon: "pause", tone: null, action: null },
      ]},
    ],
  },
  ARM: {
    label: "ロボットアーム",
    speech:  { topic: "/robot/speech",  msgType: "std_msgs/String" },
    battery: { topic: "/battery_state", msgType: "sensor_msgs/BatteryState" },
    cmdVel:  { topic: "/cmd_vel",        msgType: "geometry_msgs/Twist" },
    modeGroups: [
      { group: "自動動作", modes: [
        { id: "auto",      label: "自動プログラム", sub: "プログラムに従って実行",    icon: "play",     tone: "primary", action: null },
        { id: "loop",      label: "ループ実行",     sub: "同じ動作を繰り返し実行",    icon: "refresh",  tone: null,      action: null },
      ]},
      { group: "ティーチング", modes: [
        { id: "teach",     label: "ティーチング",   sub: "手で動かしてポーズを記録",  icon: "pin",      tone: null, action: null },
        { id: "freedrive", label: "フリードライブ", sub: "トルクを押された方向に追従", icon: "wave",     tone: null, action: null },
        { id: "jog",       label: "ジョグ送り",     sub: "関節・デカルトごとに手動",  icon: "joystick", tone: null, action: null },
      ]},
      { group: "状態・安全", modes: [
        { id: "home", label: "ホーム姿勢", sub: "初期位置へ移動", icon: "pin",  tone: null,     action: null },
        { id: "halt", label: "停止",       sub: "サーボをオフ",   icon: "stop", tone: "danger", action: null },
      ]},
    ],
  },
  DRONE: {
    label: "ドローン",
    speech:  { topic: "/robot/speech",  msgType: "std_msgs/String" },
    battery: { topic: "/battery_state", msgType: "sensor_msgs/BatteryState" },
    cmdVel:  { topic: "/cmd_vel",        msgType: "geometry_msgs/Twist" },
    modeGroups: [
      { group: "自律飛行", modes: [
        { id: "auto",  label: "自律飛行",   sub: "ウェイポイントを追従",        icon: "rocket",  tone: "primary", action: null },
        { id: "orbit", label: "オービット", sub: "対象を中心に旋回",            icon: "refresh", tone: null,      action: null },
      ]},
      { group: "手動・ホバリング", modes: [
        { id: "manual", label: "手動操作",   sub: "ジョイスティックで遠隔操作", icon: "joystick", tone: null, action: null },
        { id: "hover",  label: "ホバリング", sub: "現在位置を保持",             icon: "pause",    tone: null, action: null },
      ]},
      { group: "離着陸", modes: [
        { id: "takeoff", label: "離陸",     sub: "規定高度まで上昇",   icon: "arrowUp",   tone: null,     action: null },
        { id: "land",    label: "着陸",     sub: "現在位置で着陸",     icon: "arrowDown", tone: null,     action: null },
        { id: "rtl",     label: "自動帰還", sub: "Return to Launch",  icon: "refresh",   tone: "danger", action: null },
      ]},
    ],
  },
  QUAD: {
    label: "四足歩行",
    speech:  { topic: "/robot/speech",  msgType: "std_msgs/String" },
    battery: { topic: "/battery_state", msgType: "sensor_msgs/BatteryState" },
    cmdVel:  { topic: "/cmd_vel",        msgType: "geometry_msgs/Twist" },
    modeGroups: [
      { group: "歩容", modes: [
        { id: "walk",  label: "歩行",       sub: "通常歩行モード",   icon: "rocket",  tone: "primary", action: null },
        { id: "trot",  label: "走行",       sub: "高速トロット歩容", icon: "play",    tone: null,      action: null },
        { id: "climb", label: "階段モード", sub: "階段・段差踏破",   icon: "arrowUp", tone: null,      action: null },
      ]},
      { group: "姿勢", modes: [
        { id: "stand", label: "立ち", sub: "直立姿勢で待機", icon: "pin",   tone: null, action: null },
        { id: "sit",   label: "伏せ", sub: "低姿勢で休止",   icon: "pause", tone: null, action: null },
      ]},
      { group: "手動", modes: [
        { id: "manual", label: "手動操作", sub: "ジョイスティックで遠隔操作", icon: "joystick", tone: null, action: null },
      ]},
    ],
  },
  FLEET: {
    label: "フリート (複数台)",
    speech:  { topic: "/robot/speech",  msgType: "std_msgs/String" },
    battery: { topic: "/battery_state", msgType: "sensor_msgs/BatteryState" },
    cmdVel:  { topic: "/cmd_vel",        msgType: "geometry_msgs/Twist" },
    modeGroups: [
      { group: "協調動作", modes: [
        { id: "auto",      label: "自律協調", sub: "フリート全体でタスク分配", icon: "rocket",   tone: "primary", action: null },
        { id: "formation", label: "隊列走行", sub: "隊形を維持して移動",       icon: "map",      tone: null,      action: null },
      ]},
      { group: "個別操作", modes: [
        { id: "manual", label: "個別操作", sub: "選択中のロボットを手動操作", icon: "joystick", tone: null, action: null },
      ]},
      { group: "集結", modes: [
        { id: "recall",  label: "全員集合", sub: "デポへ集合させる",       icon: "pin",   tone: null, action: null },
        { id: "standby", label: "全員待機", sub: "すべての動作を一時停止", icon: "pause", tone: null, action: null },
      ]},
    ],
  },
}
