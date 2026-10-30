#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/Users/meghajain/Projects/Meal-prep"
TARGET="$HOME/Library/LaunchAgents"

mkdir -p "$TARGET"
for plist in "$PROJECT_DIR/launchd/"com.megha.mealprep.*.plist; do
  base=$(basename "$plist")
  cp "$plist" "$TARGET/$base"
  # Reload if already loaded
  launchctl bootout "gui/$UID/${base%.plist}" 2>/dev/null || true
  launchctl bootstrap "gui/$UID" "$TARGET/$base"
  echo "loaded: $base"
done

echo
echo "Status:"
launchctl list | grep "com.megha.mealprep" || echo "(none listed — check logs)"
