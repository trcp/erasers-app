# erasers-app

ロボット管理・データ可視化・タスク実行のための Web アプリケーション。

## 構成

```
erasers-app/
├── erasers-gui/      # Web フロントエンド（React Router v7）
└── erasers-server/   # タスクコントローラーサーバー（FastAPI, port 3001）
```

---

## erasers-gui

ロボットの **HSR** 上で動作する Web GUI。
Docker コンテナとして port 3000 で提供される。

### インストール（HSR 側）

```bash
ssh administrator@hsrb.local
git clone https://github.com/trcp/erasers-app.git
cd ~/erasers-app/erasers-gui && ./install.sh
```

`install.sh` は以下を行う：

1. Docker イメージ `erasers:gui` をビルド
2. `erasers.gui.service` を systemd に登録・有効化
3. ログイン時に Chromium がキオスクモードで自動起動するよう autostart を設定

### アクセス

ロボットと同一ネットワーク上のブラウザから：

```
http://<robot_ip>:3000
```

### ページ一覧

| URL | 説明 |
|-----|------|
| `/taskstarter` | タスク起動・管理（erasers-server と連携） |
| `/data` | ロボットのトピックデータ表示 |
| `/controller` | ブラウザからのデータ送信 |
| `/mapcreator` | マップ位置データの作成 |

---

## erasers-server

タスクを**実際に走らせる PC**（クライアント PC）にインストールして使用する。
タブレットやスマートフォンにはインストール不要。

### インストール（クライアント PC 側）

```bash
git clone https://github.com/trcp/erasers-app.git
cd erasers-app/erasers-server && ./install.sh
```

`install.sh` は以下を行う：

1. Python パッケージのインストール（`fastapi`, `uvicorn`, `pydantic`, `lupa`）
2. スクリプトへの実行権限付与
3. `erasers://` カスタム URL スキームの登録

### 仕組み

```
GUI の "起動" ボタンクリック
  → window.location.href = "erasers://start?config=/path/to/config"
  → Chrome: 「外部アプリを開きますか？」ダイアログ
  → xdg-open → erasers-server.desktop → start_erasers.sh
  → python3 erasers_task_controller_server.py --config /path/to/config &
```

### 使い方

1. ブラウザで erasers-gui の **Task Starter** ページを開く
2. **サーバーに接続 / Connect** の「サーバーIP」欄にサーバー PC の IP アドレスを入力（同一 PC の場合は `localhost`）
3. 同一 PC の場合：**サーバー起動 / Server** の Config 欄にタスク設定ディレクトリのパスを入力し「起動」をクリック
4. ステータスが **Running** に変わったら接続完了

### 手動起動

```bash
python3 erasers_task_controller_server.py --config /path/to/config
```

### ログ確認

```bash
tail -f /tmp/erasers_server.log
```
