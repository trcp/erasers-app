#!/bin/bash
set -e

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { echo "[ERROR] $*" >&2; exit 1; }

# Docker build
log "Building Docker image erasers:gui..."
docker build -t erasers:gui . || die "Docker build failed"
log "Docker image built successfully"

# systemd service
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_SRC="$SCRIPT_DIR/erasers.gui.service"
SERVICE_DST="/etc/systemd/system/erasers.gui.service"

[ -f "$SERVICE_SRC" ] || die "Service file not found: $SERVICE_SRC"

log "Installing systemd service..."
sudo cp "$SERVICE_SRC" "$SERVICE_DST" || die "Failed to copy service file"
sudo systemctl enable erasers.gui.service || die "Failed to enable service"
log "systemd service enabled"

# Autostart

read -p "ログイン時に Chromium を自動起動しますか？ [y/N]: " autostart_answer
case "$autostart_answer" in
  [yY] | [yY][eE][sS])
    AUTOSTART_DIR="$HOME/.config/autostart"
    AUTOSTART_FILE="$AUTOSTART_DIR/erasers-gui.desktop"

    log "Configuring autostart..."
    mkdir -p "$AUTOSTART_DIR"
    cat > "$AUTOSTART_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=Erasers GUI
Exec=/usr/bin/chromium-browser --password-store=basic --kiosk --disable-features=Translate -disk-cache-size=1 -media-cache-size=1 http://localhost:3000
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF
    log "Autostart configured: $AUTOSTART_FILE"
    ;;
  *)
    log "Autostart skipped"
    ;;
esac

log "Installation complete"
