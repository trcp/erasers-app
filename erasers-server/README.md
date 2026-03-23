# erasers-server

`erasers_task_controller_server.py` のサーバーと、Chrome から起動するための URL スキームハンドラー。

---

## 構成ファイル

| ファイル | 説明 |
|---------|------|
| `erasers_task_controller_server.py` | タスクコントローラーサーバー本体（port 3001） |
| `start_erasers.sh` | `erasers://` URL を受け取りサーバーをバックグラウンド起動するシェルスクリプト |
| `erasers-server.desktop` | `erasers://` カスタム URL スキームの登録ファイル |

---

## 仕組み

```
GUI の "Start Server" ボタンクリック
  → window.location.href = "erasers://start?config=/path/to/config"
  → Chrome: 「外部アプリを開きますか？」ダイアログ
  → xdg-open → erasers-server.desktop → start_erasers.sh %u
  → python3 erasers_task_controller_server.py --config /path/to/config &
```

ログは `/tmp/erasers_server.log` に出力される。

---

## セットアップ（初回のみ）

### 1. 実行権限の付与

```bash
chmod +x /home/roboworks/erasers-app/erasers-server/start_erasers.sh
```

### 2. `.desktop` ファイルの登録

```bash
cp /home/roboworks/erasers-app/erasers-server/erasers-server.desktop ~/.local/share/applications/
xdg-mime default erasers-server.desktop x-scheme-handler/erasers
update-desktop-database ~/.local/share/applications/
```

### 3. 登録確認

```bash
xdg-mime query default x-scheme-handler/erasers
# 出力: erasers-server.desktop
```

---

## 使い方

1. ブラウザで erasers-gui の **Task Starter** ページを開く
2. **Task Controller Server** カードの Config 欄に設定ディレクトリのパスを入力
3. **Start Server** をクリック
4. Chrome のダイアログが表示されたら「開く」を選択
5. 数秒後にステータスが **Running** に変わることを確認

Config パスは `localStorage` に保存されるため、次回以降は入力不要。

---

## 手動起動

Chrome を介さずに直接起動する場合:

```bash
python3 erasers_task_controller_server.py --config /path/to/config
```

または URL スキーム経由でテスト:

```bash
xdg-open "erasers://start?config=/path/to/config"
```

---

## ログ確認

```bash
tail -f /tmp/erasers_server.log
```
