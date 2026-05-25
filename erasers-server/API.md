# API一覧 — ErasersTaskControlServer

ベースURL: `http://0.0.0.0:3001`

---

## タスク管理

### `GET /get_task`

全タスクの定義情報を返す。

**レスポンス例**
```json
{
  "tidyup": {
    "task": {
      "task_name": "tidyup",
      "display_name": "Tidy Up",
      "description": "..."
    },
    "programs": {
      "yolo": {
        "display_name": "YOLO",
        "description": "...",
        "command": {
          "template": "...",
          "kill": "",
          "variables": {}
        }
      }
    }
  }
}
```

---

### `POST /run_task/{task_name}/{node_name}`

指定タスク／ノードを起動する。

**リクエストボディ**: 実行パラメータ（変数名をキーとするオブジェクト）
```json
{ "start_time": 10, "terminal": false }
```

**レスポンス**
```json
{ "run": true }
```

---

### `POST /kill_task/{task_name}/{node_name}`

指定タスク／ノードを停止する。

**レスポンス**
```json
{ "killed": true }
```

---

### `GET /task_running/{task_name}/{node_name}`

指定タスク／ノードの実行状態を返す。

**レスポンス**
```json
{ "is_running": true, "exit_code": null }
```

`exit_code` は未終了時 `null`、終了後は終了コード（整数）。

---

### `POST /set_time/{task_name}/{node_name}`

指定タスク／ノードの `start_time` 変数を更新する。

**リクエストボディ**: 整数値
```
10
```

**レスポンス**
```json
{ "set": true }
```

---

## XMLファイル操作

### `GET /get_xml?path={file_path}`

指定パスの `.xml` ファイルを返す。`.xml` 以外は `400`、ファイルが存在しない場合は `404`。

**レスポンス**: `application/xml`

---

### `POST /save_xml?path={file_path}`

指定パスに `.xml` ファイルを保存する。`.xml` 以外は `400`、親ディレクトリが存在しない場合は `400`。

**リクエストボディ**
```json
{ "content": "<xml>...</xml>" }
```

**レスポンス**
```json
{ "saved": true, "path": "/absolute/path/to/file.xml" }
```

---

## 設定管理

### `GET /get_network_interfaces`

利用可能なネットワークインターフェース一覧とIPアドレスを返す（`lo` を除く）。

**レスポンス**
```json
{
  "interfaces": [
    { "name": "wlo1", "ip": "192.168.1.10" }
  ]
}
```

---

### `GET /get_execution_config`

現在の実行設定を返す。

**レスポンス**
```json
{ "network_if": "wlo1", "ros_master_uri": "localhost" }
```

---

### `POST /set_execution_config`

実行設定を更新する。更新後、全ノードの `network_if` に反映される。

**リクエストボディ**（いずれか一方または両方）
```json
{ "network_if": "eth0", "ros_master_uri": "hsrb80" }
```

`ros_master_uri` に指定できる値: `"hsrb80"` / `"hsrb33"` / `"localhost"` またはホスト名・IPアドレス直指定。

**レスポンス**
```json
{ "ok": true }
```

---

## WebSocket

### `WS /ws/{task_name}/{node_name}`

実行中ノードのログをリアルタイムにストリーミングする。ノードが実行中でない場合は接続後すぐに閉じる。各メッセージはログの1行に対応する。
