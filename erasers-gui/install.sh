#!/bin/bash
set -e

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { echo "[ERROR] $*" >&2; exit 1; }

# Docker build
log "Building Docker image erasers:gui..."
docker build -t erasers:gui . || die "Docker build failed"
log "Docker image built successfully"

# systemd service
SERVICE_SRC="$HOME/erasers-app/erasers-gui/erasers.gui.service"
SERVICE_DST="/etc/systemd/system/erasers.gui.service"

[ -f "$SERVICE_SRC" ] || die "Service file not found: $SERVICE_SRC"

log "Installing systemd service..."
sudo cp "$SERVICE_SRC" "$SERVICE_DST" || die "Failed to copy service file"
sudo systemctl enable erasers.gui.service || die "Failed to enable service"
log "systemd service enabled"

# Autostart
AUTOSTART_DIR="$HOME/.config/autostart"
AUTOSTART_FILE="$AUTOSTART_DIR/erasers-gui.desktop"

log "Configuring autostart..."
mkdir -p "$AUTOSTART_DIR"
cat > "$AUTOSTART_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=Erasers GUI
Exec=/usr/bin/chromium-browser --password-store=basic --kiosk --incognito --disable-features=Translate -disk-cache-size=1 -media-cache-size=1 http://localhost:3000
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF
log "Autostart configured: $AUTOSTART_FILE"

log "Installation complete"
