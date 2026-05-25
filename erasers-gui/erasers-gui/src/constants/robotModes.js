export const MODES_BY_ROBOT = {
  AMR: [
    { group: "自律動作", modes: [
      { id: "auto",    label: "自律走行",   sub: "タスクを自動で実行",        icon: "rocket",   tone: "primary" },
      { id: "patrol",  label: "巡回モード", sub: "ルートを繰り返し巡回",       icon: "refresh" },
      { id: "follow",  label: "追従モード", sub: "人・ターゲットを追尾",       icon: "user" },
    ]},
    { group: "手動・調整", modes: [
      { id: "manual",  label: "手動操作",   sub: "ジョイスティックで遠隔操作", icon: "joystick" },
      { id: "jog",     label: "ジョグ送り", sub: "微動作で位置調整",           icon: "pin" },
    ]},
    { group: "状態", modes: [
      { id: "dock",    label: "充電復帰",   sub: "ドッキングステーションへ",   icon: "zap" },
      { id: "standby", label: "待機",       sub: "エネルギー節約モード",       icon: "pause" },
    ]},
  ],
  ARM: [
    { group: "自動動作", modes: [
      { id: "auto",      label: "自動プログラム", sub: "プログラムに従って実行",    icon: "play",     tone: "primary" },
      { id: "loop",      label: "ループ実行",     sub: "同じ動作を繰り返し実行",    icon: "refresh" },
    ]},
    { group: "ティーチング", modes: [
      { id: "teach",     label: "ティーチング",   sub: "手で動かしてポーズを記録",  icon: "pin" },
      { id: "freedrive", label: "フリードライブ", sub: "トルクを押された方向に追従", icon: "wave" },
      { id: "jog",       label: "ジョグ送り",     sub: "関節・デカルトごとに手動",  icon: "joystick" },
    ]},
    { group: "状態・安全", modes: [
      { id: "home",      label: "ホーム姿勢",     sub: "初期位置へ移動",            icon: "pin" },
      { id: "halt",      label: "停止",           sub: "サーボをオフ",             icon: "stop",    tone: "danger" },
    ]},
  ],
  DRONE: [
    { group: "自律飛行", modes: [
      { id: "auto",    label: "自律飛行",   sub: "ウェイポイントを追従",        icon: "rocket",    tone: "primary" },
      { id: "orbit",   label: "オービット", sub: "対象を中心に旋回",            icon: "refresh" },
    ]},
    { group: "手動・ホバリング", modes: [
      { id: "manual",  label: "手動操作",   sub: "ジョイスティックで遠隔操作",  icon: "joystick" },
      { id: "hover",   label: "ホバリング", sub: "現在位置を保持",              icon: "pause" },
    ]},
    { group: "離着陸", modes: [
      { id: "takeoff", label: "離陸",       sub: "規定高度まで上昇",            icon: "arrowUp" },
      { id: "land",    label: "着陸",       sub: "現在位置で着陸",              icon: "arrowDown" },
      { id: "rtl",     label: "自動帰還",   sub: "Return to Launch",           icon: "refresh",  tone: "danger" },
    ]},
  ],
  QUAD: [
    { group: "歩容", modes: [
      { id: "walk",   label: "歩行",       sub: "通常歩行モード",              icon: "rocket",   tone: "primary" },
      { id: "trot",   label: "走行",       sub: "高速トロット歩容",            icon: "play" },
      { id: "climb",  label: "階段モード", sub: "階段・段差踏破",              icon: "arrowUp" },
    ]},
    { group: "姿勢", modes: [
      { id: "stand",  label: "立ち",       sub: "直立姿勢で待機",             icon: "pin" },
      { id: "sit",    label: "伏せ",       sub: "低姿勢で休止",               icon: "pause" },
    ]},
    { group: "手動", modes: [
      { id: "manual", label: "手動操作",   sub: "ジョイスティックで遠隔操作",  icon: "joystick" },
    ]},
  ],
  FLEET: [
    { group: "協調動作", modes: [
      { id: "auto",      label: "自律協調", sub: "フリート全体でタスク分配",  icon: "rocket",   tone: "primary" },
      { id: "formation", label: "隊列走行", sub: "隊形を維持して移動",        icon: "map" },
    ]},
    { group: "個別操作", modes: [
      { id: "manual",    label: "個別操作", sub: "選択中のロボットを手動操作", icon: "joystick" },
    ]},
    { group: "集結", modes: [
      { id: "recall",    label: "全員集合", sub: "デポへ集合させる",           icon: "pin" },
      { id: "standby",   label: "全員待機", sub: "すべての動作を一時停止",     icon: "pause" },
    ]},
  ],
};

export const ROBOT_TYPE_LABELS = {
  AMR:   "移動ロボット (AMR)",
  ARM:   "ロボットアーム",
  DRONE: "ドローン",
  QUAD:  "四足歩行ロボット",
  FLEET: "フリート (複数台)",
};
