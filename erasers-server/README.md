# erasers-server

タスクを**実際に走らせる PC**（クライアント PC）にインストールする FastAPI サーバー。  
erasers-gui の**タスク**画面から HTTP / WebSocket で操作する。

---

## 構成ファイル

| ファイル | 説明 |
|---------|------|
| `erasers_task_controller_server.py` | タスクコントローラーサーバー本体（port 3001） |
| `parser.py` | Lua タスク設定ファイルのパーサーとプロセス管理 |
| `install.sh` | セットアップスクリプト |
| `erasers-task-controller-server.service` | systemd ユーザーサービスのテンプレート |
| `erasers-task-controller-server-autostart.desktop` | ログイン時にサービスを自動起動する autostart 設定 |
| `start_erasers_task_controller_server.sh` | `erasers://` URL スキーム経由で起動するシェルスクリプト |
| `erasers-task-controller-server-mime.desktop` | `erasers://` カスタム URL スキームの登録ファイル |
| `wezterm/` | WezTerm でタスクを起動するための設定のサンプル，タスクの一覧はwezterm(lua)のフォーマットで定義する |

---

## インストール

```bash
git clone https://github.com/trcp/erasers-app.git
cd erasers-app/erasers-server && ./install.sh
```

`install.sh` は以下を対話形式で行う：

1. `uv` のインストール確認（未インストールの場合はエラーで終了）
2. スクリプトへの実行権限付与
3. systemd ユーザーサービスをインストール（任意）
   - タスク設定ディレクトリのパスを入力
   - `~/.config/systemd/user/erasers-task-controller-server.service` を生成・有効化
   - `~/.config/autostart/erasers-task-controller-server.desktop` を配置（ログイン時に自動起動）

`uv` が未インストールの場合は先にインストールしてください：  
https://docs.astral.sh/uv/getting-started/installation/

---

## 使い方

サービスを登録済みの場合は、ログイン時に自動的に起動する。

1. erasers-gui の **設定** 画面を開き、**遠隔PC管理** にこの PC の名前と IP アドレスを登録
2. **タスク** 画面で対象 PC を選択してタスク一覧を取得
3. 起動したいプログラムの「起動」ボタンをクリック
4. ログは「ログ」ボタンで WebSocket 経由にリアルタイム表示

---

## 手動起動

```bash
uv run erasers_task_controller_server.py --config /path/to/config
```

サービスを手動で操作する場合：

```bash
# 起動
systemctl --user start erasers-task-controller-server

# 停止
systemctl --user stop erasers-task-controller-server

# 状態確認
systemctl --user status erasers-task-controller-server
```

---

## タスク設定ファイル（Lua）

タスクは**ディレクトリ内の Lua ファイル**（`.lua`）として定義する。  
サーバー起動時に `--config` で指定したディレクトリ内の全 Lua ファイルを読み込む。

```lua
return {
  task = {
    task_name    = "my_task",
    display_name = "My Task",
    description  = "タスクの説明",
  },
  programs = {
    my_node = {
      display_name    = "My Node",
      description     = "ノードの説明",
      default_command = "default",
      commands = {
        default = {
          template  = "ros2 run my_pkg my_node",
          kill      = "",
          variables = {},
        },
      },
    },
  },
}
```

`template` に `${variable_name}` を記述すると、GUI から値を渡して実行できる。  
`terminal: true` を起動リクエストに含めると WezTerm ウィンドウで実行する。

---

## ログ確認

```bash
# サーバーログ（URL スキーム経由起動時）
tail -f /tmp/erasers_server.log

# systemd ユーザーサービス使用時
journalctl --user -u erasers-task-controller-server -f

# タスクプロセスのログ（~/.erasers_log/ に保存）
ls ~/.erasers_log/
```

---

## URL スキーム（erasers://）

`erasers-task-controller-server-mime.desktop` を登録すると、`erasers://start?config=/path/to/config` という URL でブラウザからサーバーを起動できる。

```bash
# .desktop ファイルを登録
cp erasers-task-controller-server-mime.desktop ~/.local/share/applications/
xdg-mime default erasers-task-controller-server-mime.desktop x-scheme-handler/erasers
update-desktop-database ~/.local/share/applications/

# テスト
xdg-open "erasers://start?config=/path/to/config"
```
