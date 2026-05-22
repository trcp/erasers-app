# API一覧 — ErasersTaskControlServer

ベースURL: `http://0.0.0.0:3001`

## タスク管理

| メソッド | パス | 説明 |
|--------|------|------|
| `GET` | `/get_task` | 全タスクの定義情報（プログラム、変数、docker設定など）を返す |
| `POST` | `/run_task/{task_name}/{node_name}` | 指定タスク／ノードを起動する（ボディ: 実行パラメータ） |
| `POST` | `/kill_task/{task_name}/{node_name}` | 指定タスク／ノードを強制停止する |
| `GET` | `/task_running/{task_name}/{node_name}` | 指定タスク／ノードの実行状態と終了コードを返す |
| `POST` | `/set_time/{task_name}/{node_name}` | 指定タスク／ノードの `start_time` 変数を更新する（ボディ: 整数値） |

## XMLファイル操作

| メソッド | パス | 説明 |
|--------|------|------|
| `GET` | `/get_xml?path={file_path}` | 指定パスの `.xml` ファイルを取得する |
| `POST` | `/save_xml?path={file_path}` | 指定パスに `.xml` ファイルを保存する（ボディ: `{ "content": "..." }`） |

## 設定管理

| メソッド | パス | 説明 |
|--------|------|------|
| `GET` | `/get_network_interfaces` | 利用可能なネットワークインターフェース一覧とIPアドレスを返す |
| `GET` | `/get_execution_config` | 現在の実行設定（`network_if`, `ros_master_uri`）を返す |
| `POST` | `/set_execution_config` | 実行設定を更新する（ボディ: `{ "network_if": "...", "ros_master_uri": "..." }`） |
| `POST` | `/set_node_config/{task_name}/{node_name}` | ノード単位の設定（`docker_mode`, `compose_path`）を更新する |

## その他

| メソッド | パス | 説明 |
|--------|------|------|
| `POST` | `/run_wezterm/{task_name}` | 指定タスクのWezTermターミナルをDockerコンテナ経由で起動する |
| `WS` | `/ws/{task_name}/{node_name}` | 実行中ノードのログをリアルタイムにストリーミングするWebSocket |
