#!/bin/bash

# Load export lines from .bashrc (bypasses interactive-only guard)
if [ -f "$HOME/.bashrc" ]; then
    eval "$(grep -E '^export ' "$HOME/.bashrc" | grep -v '#')"
fi

# 引数: erasers://start?config=/path/to/config
URL="$1"

# config パスを URL デコードして取り出す
CONFIG=$(python3 -c "
import sys, urllib.parse
url = sys.argv[1]
qs = url.split('?', 1)[1] if '?' in url else ''
params = dict(p.split('=', 1) for p in qs.split('&') if '=' in p)
print(urllib.parse.unquote(params.get('config', '')))
" "$URL")

if [ -z "$CONFIG" ]; then
  echo "config not specified" >&2
  exit 1
fi

# 既に起動中なら何もしない（port 3001 チェック）
if lsof -i :3001 > /dev/null 2>&1; then
  exit 0
fi

# サーバーをバックグラウンドで起動
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
nohup python3 "$SCRIPT_DIR/erasers_task_controller_server.py" \
  --config "$CONFIG" > /tmp/erasers_server.log 2>&1 &
