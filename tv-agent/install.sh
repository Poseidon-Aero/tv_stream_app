#!/bin/bash
set -e

# TV Agent installer for Mac Mini
# Usage: ./install.sh tv-1   (or tv-2, tv-3)

TV_ID="${1:-tv-1}"
INSTALL_DIR="/Users/Shared/tv-agent"
VIDEO_DIR="/Users/Shared/tv-videos"
PLIST_NAME="com.tvagent"

echo "=============================="
echo "TV Agent Installer"
echo "TV ID: $TV_ID"
echo "Install dir: $INSTALL_DIR"
echo "Video dir: $VIDEO_DIR"
echo "=============================="

# 1. Check dependencies
echo ""
echo "Checking dependencies..."

check_dep() {
    if ! command -v "$1" &>/dev/null; then
        echo "  MISSING: $1 — $2"
        return 1
    else
        echo "  OK: $1 ($(command -v "$1"))"
        return 0
    fi
}

MISSING=0
check_dep node "Install via: brew install node" || MISSING=1
check_dep mpv "Install via: brew install mpv" || MISSING=1
check_dep rclone "Install via: brew install rclone" || MISSING=1
check_dep ffmpeg "Install via: brew install ffmpeg" || MISSING=1
check_dep ffprobe "Included with ffmpeg" || MISSING=1

if [ "$MISSING" -eq 1 ]; then
    echo ""
    echo "Install missing dependencies first:"
    echo "  brew install node mpv rclone ffmpeg"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]] || exit 1
fi

# 2. Check rclone is configured
if ! rclone listremotes 2>/dev/null | grep -q "gdrive:"; then
    echo ""
    echo "WARNING: rclone remote 'gdrive' not found."
    echo "Run: rclone config"
    echo "  - Create a new remote named 'gdrive'"
    echo "  - Type: Google Drive"
    echo "  - Follow the auth flow"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]] || exit 1
fi

# 3. Create directories
echo ""
echo "Creating directories..."
sudo mkdir -p "$INSTALL_DIR/logs"
sudo mkdir -p "$VIDEO_DIR"
sudo chown -R "$(whoami)" "$INSTALL_DIR" "$VIDEO_DIR"

# 4. Copy agent files
echo "Copying agent files..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cp "$SCRIPT_DIR/index.js" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/mpv-controller.js" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/command-poller.js" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/heartbeat.js" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/drive-sync.js" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/thumbnail-gen.js" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/package.json" "$INSTALL_DIR/"

# 5. Write config with correct TV ID
echo "Writing config for $TV_ID..."
cat > "$INSTALL_DIR/config.json" << EOF
{
  "tvId": "$TV_ID",
  "apiUrl": "https://tvstream.vercel.app",
  "mpvSocket": "/tmp/mpv-socket",
  "videoDir": "$VIDEO_DIR",
  "driveFolder": "TV Videos/Videos",
  "rcloneRemote": "gdrive",
  "heartbeatIntervalMs": 2000,
  "commandPollIntervalMs": 1000,
  "driveSyncIntervalMs": 300000,
  "thumbnailWidth": 320
}
EOF

# 6. Install node dependencies
echo "Installing dependencies..."
cd "$INSTALL_DIR"
npm install --production 2>/dev/null || echo "  (no dependencies to install)"

# 7. Install launchd service
echo "Installing launchd service..."
PLIST_SRC="$SCRIPT_DIR/com.tvagent.plist"
PLIST_DST="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"

# Unload existing if present
launchctl unload "$PLIST_DST" 2>/dev/null || true

cp "$PLIST_SRC" "$PLIST_DST"

# Update node path to actual location
NODE_PATH="$(which node)"
sed -i '' "s|/usr/local/bin/node|$NODE_PATH|g" "$PLIST_DST"

# Load the service
launchctl load "$PLIST_DST"

echo ""
echo "=============================="
echo "Installation complete!"
echo ""
echo "  Agent installed at: $INSTALL_DIR"
echo "  Videos stored at:   $VIDEO_DIR"
echo "  Config:             $INSTALL_DIR/config.json"
echo "  Logs:               $INSTALL_DIR/logs/"
echo "  Service:            $PLIST_DST"
echo ""
echo "Commands:"
echo "  View logs:     tail -f $INSTALL_DIR/logs/stdout.log"
echo "  Stop agent:    launchctl unload $PLIST_DST"
echo "  Start agent:   launchctl load $PLIST_DST"
echo "  Restart:       launchctl unload $PLIST_DST && launchctl load $PLIST_DST"
echo "=============================="
