#!/bin/bash
set -e

# ============================================================
#  erasers-server インストールスクリプト
# ============================================================

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo ""
echo -e "${YELLOW}============================================================"
echo "  erasers-server インストーラー"
echo -e "============================================================${NC}"
echo ""
echo -e "${RED}【注意事項】${NC}"
echo "  このインストールは、ロボットのタスクを実際に走らせる"
echo "  パソコンに対して行います。"
echo ""
echo "  タブレットやスマートフォンなど、接続するだけの端末には"
echo "  インストールは不要です。"
echo ""
read -p "このPCにインストールしますか？ [y/N]: " answer
case "$answer" in
  [yY] | [yY][eE][sS]) ;;
  *)
    echo "インストールをキャンセルしました。"
    exit 0
    ;;
esac

echo ""
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "インストール先: $SCRIPT_DIR"
echo ""

# ------------------------------------------------------------
# 1. Python依存パッケージ
# ------------------------------------------------------------
echo "--- [1/4] Python パッケージをインストールします ---"
pip3 install --user fastapi uvicorn pydantic lupa
echo ""

# ------------------------------------------------------------
# 2. スクリプトに実行権限を付与
# ------------------------------------------------------------
echo "--- [2/4] 実行権限を設定します ---"
chmod +x "$SCRIPT_DIR/start_erasers_task_controller_server.sh"
chmod +x "$SCRIPT_DIR/erasers_task_controller_server.py"
echo "完了"
echo ""

# ------------------------------------------------------------
# 3. systemd ユーザーサービスをインストール
# ------------------------------------------------------------
echo "--- [3/4] systemd サービスをインストールしますか？ ---"
read -p "  Task Controller Server をサービス化しますか？ [y/N]: " svc_answer
case "$svc_answer" in
  [yY] | [yY][eE][sS])
    SERVICE_SRC="$SCRIPT_DIR/erasers-task-controller-server.service"
    SERVICE_DST_DIR="$HOME/.config/systemd/user"
    SERVICE_DST="$SERVICE_DST_DIR/erasers-task-controller-server.service"

    mkdir -p "$SERVICE_DST_DIR"

    # WorkingDirectory と ExecStart のパスをこのPCの実際のパスに書き換えて配置
    sed \
      -e "s|ExecStart=\(/usr/bin/python3\) [^ ]*erasers_task_controller_server\.py|ExecStart=\1 $SCRIPT_DIR/erasers_task_controller_server.py|" \
      "$SERVICE_SRC" > "$SERVICE_DST"

    systemctl --user daemon-reload
    systemctl --user enable erasers-task-controller-server
    echo "完了 (サービス名: erasers-task-controller-server)"
    echo "  起動: systemctl --user start erasers-task-controller-server"
    echo "  ログ: journalctl --user -u erasers-task-controller-server -f"
    ;;
  *)
    echo "スキップしました。"
    ;;
esac
echo ""

# ------------------------------------------------------------
# 4. erasers:// カスタムURLスキームを登録
# ------------------------------------------------------------
echo "--- [4/4] erasers:// カスタムURLスキームを登録します ---"

DESKTOP_SRC="$SCRIPT_DIR/erasers-task-controller-server-server.desktop"
DESKTOP_DST="$HOME/.local/share/applications/erasers-task-controller-server-server.desktop"

mkdir -p "$HOME/.local/share/applications"

# Exec パスをこのPCの実際のパスに書き換えて配置
sed "s|Exec=.*start_erasers_task_controller_server.sh|Exec=$SCRIPT_DIR/start_erasers_task_controller_server.sh|" \
  "$DESKTOP_SRC" > "$DESKTOP_DST"

update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
xdg-mime default erasers-task-controller-server-server.desktop x-scheme-handler/erasers

echo "完了"
echo ""

# ------------------------------------------------------------
# 完了
# ------------------------------------------------------------
echo -e "${GREEN}============================================================"
echo "  インストール完了！"
echo "============================================================${NC}"
echo ""
echo "  ブラウザで erasers://start?config=... を開くと"
echo "  Task Controller Server が起動します。"
echo ""
