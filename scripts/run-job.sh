#!/usr/bin/env bash
# Resolve nvm's node and run a jobs/ script. Called from launchd plists.
set -euo pipefail

PROJECT_DIR="/Users/meghajain/Projects/Meal-prep"
JOB_NAME="${1:?usage: run-job.sh <job-name>}"
LOG_DIR="$PROJECT_DIR/jobs/logs"

mkdir -p "$LOG_DIR"

export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
fi

cd "$PROJECT_DIR/jobs"
exec node run.mjs "$JOB_NAME" >> "$LOG_DIR/$JOB_NAME.log" 2>&1
