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
# 1. uv の確認
# ------------------------------------------------------------
echo "--- [1/3] uv を確認します ---"
if ! command -v uv &> /dev/null; then
  echo "uv が見つかりません。先にインストールしてください。"
  echo "  https://docs.astral.sh/uv/getting-started/installation/"
  exit 1
fi
echo "uv: $(uv --version)"
echo ""

# ------------------------------------------------------------
# 2. スクリプトに実行権限を付与
# ------------------------------------------------------------
echo "--- [2/3] 実行権限を設定します ---"
chmod +x "$SCRIPT_DIR/start_erasers_task_controller_server.sh"
chmod +x "$SCRIPT_DIR/erasers_task_controller_server.py"
echo "完了"
echo ""

# ------------------------------------------------------------
# 3. systemd ユーザーサービスをインストール
# ------------------------------------------------------------
echo "--- [3/3] systemd ユーザーサービスをインストールしますか？ ---"
read -p "  Task Controller Server をサービス化しますか？ [y/N]: " svc_answer
case "$svc_answer" in
  [yY] | [yY][eE][sS])
    read -p "  タスク設定ディレクトリのパスを入力してください: " config_path
    if [ -z "$config_path" ]; then
      echo "パスが入力されていません。スキップしました。"
      break
    fi

    SERVICE_SRC="$SCRIPT_DIR/erasers-task-controller-server.service"
    SERVICE_DIR="$HOME/.config/systemd/user"
    SERVICE_DST="$SERVICE_DIR/erasers-task-controller-server.service"

    mkdir -p "$SERVICE_DIR"

    UV_PATH="$(command -v uv)"
    sed \
      -e "s|ExecStart=.*erasers_task_controller_server\.py.*|ExecStart=$UV_PATH run $SCRIPT_DIR/erasers_task_controller_server.py --config $config_path|" \
      "$SERVICE_SRC" > "$SERVICE_DST"

    # systemctl --user daemon-reload
    # systemctl --user enable erasers-task-controller-server
    echo "完了 (サービス名: erasers-task-controller-server)"
    echo "  起動: systemctl --user start erasers-task-controller-server"
    echo "  ログ: journalctl --user -u erasers-task-controller-server -f"

    AUTOSTART_DIR="$HOME/.config/autostart"
    mkdir -p "$AUTOSTART_DIR"
    cp "$SCRIPT_DIR/erasers-task-controller-server-autostart.desktop" \
       "$AUTOSTART_DIR/erasers-task-controller-server.desktop"
    echo "完了 (自動起動: $AUTOSTART_DIR/erasers-task-controller-server.desktop)"
    ;;
  *)
    echo "スキップしました。"
    ;;
esac
echo ""

# ------------------------------------------------------------
# 完了
# ------------------------------------------------------------
echo -e "${GREEN}============================================================"
echo "  インストール完了！"
echo "============================================================${NC}"
echo ""
echo "  手動起動:"
echo "    uv run $SCRIPT_DIR/erasers_task_controller_server.py --config /path/to/config"
echo ""
