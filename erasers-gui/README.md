# erasers-gui

ロボット上で動作する Web GUI（v5.0.0）。  
React 18 + Vite で構築され、Docker コンテナとして port 3000 で提供される。

---

## インストール（ロボット側）

```bash
ssh <robot_user>@<robot_ip>
git clone https://github.com/trcp/erasers-app.git
cd ~/erasers-app/erasers-gui && ./install.sh
```

`install.sh` は以下を行う：

1. Docker イメージ `erasers:gui` をビルド
2. `erasers.gui.service` を systemd（system）に登録・有効化
3. ログイン時に Chromium をキオスクモードで自動起動するよう autostart を設定（任意）

---

## アクセス

ロボットと同一ネットワーク上のブラウザから：

```
http://<robot_ip>:3000
```

---

## 画面一覧

URL ルーティングは使用せず、左上のメニューボタンでドロワーを開いて画面を切り替える SPA 構成。

| 画面 | 説明 |
|------|------|
| 発話モニター | ロボットの発話トピックを受信して表示。発話履歴一覧と発話オーバーレイ |
| 遠隔操作 | タッチ / マウスジョイスティックおよびゲームパッドで `/cmd_vel` をパブリッシュ。操作モードボタンで ROS サービス / トピック / アクションゴールを送信 |
| マップ | ros3d で `/map` トピックの 2D 占有格子地図を表示。ロボット自己位置を重ねて描画。クリックで初期自己位置（`/initialpose`）をパブリッシュ |
| タスク | erasers-server と連携してタスクの起動・停止・ログ確認を行う |
| 設定 | rosbridge 接続先・ロボット種別プリセット・遠隔 PC の管理 |

---

## rosbridge 接続

rosbridge_server（デフォルト port 9090）への WebSocket 接続でトピックの購読・パブリッシュを行う。  
設定画面でホストとポートを変更できる。接続先はロボット種別プリセットに紐づけて保存されるため、種別を切り替えると自動的に接続先が更新される。

---

## ロボット種別プリセット

ロボット種別は設定画面で自由に追加・削除・リネームできる。各種別ごとに以下を設定・保存できる：

| 項目 | デフォルトトピック / 型 |
|------|------------------------|
| 発話モニター | `/robot/speech` · `std_msgs/String` |
| 緊急停止 | `/emergency_stop` · `std_msgs/Bool` |
| バッテリー | `/battery_state` · `sensor_msgs/BatteryState` |
| 速度指令 | `/cmd_vel` · `geometry_msgs/Twist` |
| マップ | `/map` · `nav_msgs/OccupancyGrid` |
| ロボット自己位置 | `/amcl_pose` · `geometry_msgs/PoseWithCovarianceStamped` |
| 初期自己位置 | `/initialpose` · `geometry_msgs/PoseWithCovarianceStamped` |

設定はすべて `localStorage` に永続化され、JSON ファイルとしてエクスポート / インポートできる。

---

## 操作モードプリセット

各ロボット種別の設定画面でモードグループ・モードボタンを追加・編集できる。  
モードボタンには以下のいずれかのアクションを割り当て、遠隔操作画面に表示する：

| アクション種別 | 説明 |
|----------------|------|
| なし | アクションなし（状態表示のみ） |
| サービス | 指定した ROS サービスを呼び出す |
| パブリッシュ | 指定したトピックにメッセージをパブリッシュ |
| アクション | 指定した actionlib サーバーにゴールを送信 |

rosbridge に接続中であれば、トピック名・サービス名の候補補完とメッセージテンプレートの自動取得が使用できる。

---

## ゲームパッド操作

Web Gamepad API を利用。**LB ボタンを押しながらスティックを操作**することで `/cmd_vel` をパブリッシュする。  
LB を離すとロボットは即時停止する。非ゼロ入力が続く間は 20 Hz でパブリッシュし続ける。

---

## 緊急停止

プリセットで設定した緊急停止トピックで `data: true` を受信すると、画面全体に緊急停止オーバーレイを表示する。  
`data: false` を受信するか、次の `true` を受信するまでオーバーレイは再表示されない。

---

## テレメトリ（トップバー）

以下のトピックを購読してトップバーに常時表示する：

| 項目 | トピック / 型 |
|------|--------------|
| バッテリー残量 | プリセット設定（`sensor_msgs/BatteryState` または `std_msgs/Float64`） |
| 速度 | `/odom` · `nav_msgs/Odometry` |
| CPU 使用率 | `/cpu_usage` · `std_msgs/Float64` |
| 温度 | `/temperature` · `sensor_msgs/Temperature` |
| Wi-Fi 信号強度 | `/wifi_signal` · `std_msgs/Int32` |
