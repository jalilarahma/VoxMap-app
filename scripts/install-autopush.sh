#!/bin/bash
# One-time installer for the VoxMap auto-push background helper.
# After running this once, any commits made to the local repo (including
# from agents) will be pushed to origin/main automatically every 60s.
#
# Run from the project root:
#   bash scripts/install-autopush.sh
#
# To remove later:
#   launchctl unload ~/Library/LaunchAgents/com.voxmap.autopush.plist
#   rm ~/Library/LaunchAgents/com.voxmap.autopush.plist

set -e

PLIST_SRC="$(cd "$(dirname "$0")" && pwd)/autopush.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.voxmap.autopush.plist"

if [ ! -f "$PLIST_SRC" ]; then
  echo "ERROR: source plist not found at $PLIST_SRC" >&2
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents"
mkdir -p "$HOME/Library/Logs"

# If already loaded, unload first so we pick up any updates.
launchctl unload "$PLIST_DST" 2>/dev/null || true

cp "$PLIST_SRC" "$PLIST_DST"
launchctl load "$PLIST_DST"

echo "✓ VoxMap auto-push installed."
echo "  - Plist:  $PLIST_DST"
echo "  - Logs:   $HOME/Library/Logs/voxmap-autopush.log"
echo "  - Runs:   every 60s while you're logged in."
echo ""
echo "Test it now:  launchctl start com.voxmap.autopush"
echo "Tail logs:    tail -f \"$HOME/Library/Logs/voxmap-autopush.log\""
