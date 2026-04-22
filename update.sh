#!/usr/bin/env bash
# SVT Survey Tool – One-command updater
# Downloads the latest version from GitHub and runs upgrade.sh
#
# Usage (from anywhere on the server):
#   curl -fsSL https://raw.githubusercontent.com/HoaVanVN/svt-survey-tool/master/update.sh | sudo bash
#
# Or if you already have the repo cloned:
#   sudo bash update.sh
#
set -euo pipefail

REPO_URL="https://github.com/HoaVanVN/svt-survey-tool.git"
BRANCH="master"
TMP_DIR="/tmp/svt-survey-update-$$"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[SVT-UPDATE]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; exit 1; }

[ "$(id -u)" -eq 0 ] || err "Please run as root: sudo bash update.sh"

# ── Check dependencies ────────────────────────────────────────────────────────
for cmd in git curl node npm python3; do
  command -v "$cmd" &>/dev/null || err "Required command not found: $cmd (run install.sh first)"
done

# ── Fetch latest code ─────────────────────────────────────────────────────────
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

log "Fetching latest version from GitHub..."
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$TMP_DIR" \
  || err "Failed to clone repo. Check internet connectivity and that $REPO_URL is accessible."

# Show what version is incoming
NEW_VERSION=$(grep -o '"version": *"[^"]*"' "$TMP_DIR/backend/main.py" 2>/dev/null \
              | head -1 | grep -o '"[^"]*"$' | tr -d '"' || echo "unknown")
CURRENT_VERSION=$(curl -s http://127.0.0.1:8000/api/health 2>/dev/null \
                  | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

log "Current version : ${CURRENT_VERSION}"
log "Available version: ${NEW_VERSION}"

if [ "$CURRENT_VERSION" = "$NEW_VERSION" ] && [ "$NEW_VERSION" != "unknown" ]; then
  warn "Already running the latest version ($NEW_VERSION)."
  echo ""
  read -p "Force re-upgrade anyway? [y/N] " -n 1 -r; echo
  [[ $REPLY =~ ^[Yy]$ ]] || { log "Nothing to do. Exiting."; exit 0; }
fi

# ── Run upgrade from the freshly cloned directory ────────────────────────────
log "Starting upgrade to v${NEW_VERSION}..."
bash "$TMP_DIR/upgrade.sh"
