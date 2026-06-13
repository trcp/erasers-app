> This project is created with generative AI and serves as a benchmark to experience the capabilities of generative AI.

# erasers-app

ロボット管理・データ可視化・タスク実行のための Web アプリケーション。

## 構成

```
erasers-app/
├── erasers-gui/      # Web フロントエンド（React 18 + Vite, port 3000）
└── erasers-server/   # タスクコントローラーサーバー（FastAPI, port 3001）
```

---

## erasers-gui

ロボット上で動作する Web GUI（v5.0.0）。  
Docker コンテナとして port 3000 で提供される。

### インストール（ロボット側）

```bash
ssh <robot_user>@<robot_ip>
git clone https://github.com/trcp/erasers-app.git
cd ~/erasers-app/erasers-gui && ./install.sh
```

`install.sh` は以下を対話形式で行う：

1. Docker イメージ `erasers:gui` をビルド
2. `erasers.gui.service` を systemd に登録・有効化
3. ログイン時に Chromium をキオスクモードで自動起動するよう autostart を設定（任意）

### アクセス

ロボットと同一ネットワーク上のブラウザから：

```
http://<robot_ip>:3000
```

### 画面一覧

URL ルーティングは使用せず、画面内のナビゲーションで切り替える SPA 構成。

| 画面 | 説明 |
|------|------|
| 発話モニター | ロボットの発話トピックを受信して表示。発話履歴と発話オーバーレイ |
| 遠隔操作 | タッチ / マウスジョイスティックおよびゲームパッドで `/cmd_vel` をパブリッシュ。操作モード切替 |
| マップ | ros3d で `/map` トピックの 2D 占有格子地図を表示。ロボット自己位置を重ねて描画 |
| タスク管理 | erasers-server と連携してタスクの起動・停止・ログ確認を行う |
| 設定 | rosbridge 接続先・ロボット種別プリセット・遠隔 PC の管理 |

### rosbridge 接続

rosbridge_server（デフォルト port 9090）への WebSocket 接続でトピックの購読・パブリッシュを行う。  
設定画面でホストとポートを変更できる。

### ロボット種別プリセット

各ロボット種別ごとに以下のトピックを設定・保存できる：

| 項目 | デフォルトトピック / 型 |
|------|------------------------|
| 発話モニター | `/robot/speech` · `std_msgs/String` |
| 緊急停止 | `/emergency_stop` · `std_msgs/Bool` |
| バッテリー | `/battery_state` · `sensor_msgs/BatteryState` |
| 速度指令 | `/cmd_vel` · `geometry_msgs/Twist` |
| マップ | `/map` · `nav_msgs/OccupancyGrid` |
| ロボット自己位置 | `/amcl_pose` · `geometry_msgs/PoseWithCovarianceStamped` |
| 初期自己位置 | `/initialpose` · `geometry_msgs/PoseWithCovarianceStamped` |

プリセットは JSON ファイルとしてエクスポート / インポートできる。

### ゲームパッド操作

Web Gamepad API を利用。**LB ボタンを押しながらスティックを操作**することで `/cmd_vel` をパブリッシュする。  
LB を離すとロボットは即時停止する。

### 緊急停止

`/emergency_stop` トピックで `data: true` を受信すると、画面全体に緊急停止オーバーレイを表示する。

---

## erasers-server

タスクを**実際に走らせる PC**（クライアント PC）にインストールして使用する。  

### インストール（クライアント PC 側）

```bash
git clone https://github.com/trcp/erasers-app.git
cd erasers-app/erasers-server && ./install.sh
```

`install.sh` は以下を対話形式で行う：

1. `uv` のインストール確認（未インストールの場合はエラーで終了）
2. スクリプトへの実行権限付与
3. `erasers-task-controller-server` を systemd サービスとして登録（任意・タスク設定ディレクトリのパスを入力）

`uv` が未インストールの場合は以下を参照してインストールしてください：  
https://docs.astral.sh/uv/getting-started/installation/

### タスク設定ファイル

タスクは**ディレクトリ内の Lua ファイル**（`.lua`）として定義する。  
サーバー起動時に `--config` で指定したディレクトリ内の全 Lua ファイルを読み込む。

### API エンドポイント（port 3001）

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/get_task` | 全タスク一覧を取得 |
| POST | `/run_task/{task}/{node}` | タスクを起動 |
| POST | `/kill_task/{task}/{node}` | タスクを停止 |
| GET | `/task_running/{task}/{node}` | タスクの実行状態を確認 |
| WS | `/ws/{task}/{node}` | タスクのログをリアルタイムストリーム |
| POST | `/set_time/{task}/{node}` | 開始時刻変数を設定 |
| GET | `/get_xml` | XML ファイルの取得 |
| POST | `/save_xml` | XML ファイルの保存 |
| GET | `/get_network_interfaces` | ネットワークインターフェース一覧を取得 |
| GET | `/get_execution_config` | ROS 実行設定（network_if・ROS_MASTER_URI）を取得 |
| POST | `/set_execution_config` | ROS 実行設定を更新 |

### 使い方

1. ブラウザで erasers-gui の **設定** 画面を開く
2. **遠隔 PC 管理** に PC の名前と IP アドレスを登録
3. **タスク管理** 画面で対象 PC を選択し、タスク一覧を取得
4. 起動したいプログラムの「起動」ボタンをクリック
5. ログは「ログ」ボタンで WebSocket 経由にリアルタイム表示

### ROS1 実行設定

GUI の設定画面から各 PC の以下を設定できる：

- **ネットワークインターフェース**: `ROS_IP` の取得元（例: `wlo1`, `eth0`）
- **ROS_MASTER_URI**: ロボット側のホスト名または IP（例: `localhost`, `hsrb80`, `192.168.11.80`）

### 手動起動

```bash
uv run erasers_task_controller_server.py --config /path/to/config
```

### ログ確認

```bash
tail -f /tmp/erasers_server.log
# または systemd サービスを使用している場合
journalctl -u erasers-task-controller-server -f
```
