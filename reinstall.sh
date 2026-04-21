#!/usr/bin/env bash
# SVT Survey Tool – Reinstall script
# Xóa toàn bộ app, GIỮ NGUYÊN data, cài lại từ đầu
# Usage: sudo bash reinstall.sh
set -euo pipefail

APP_DIR="/opt/svt-survey"
DATA_DIR="/var/lib/svt-survey"
SERVICE_USER="svtsurvey"
BACKEND_PORT=8000

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[SVT-REINSTALL]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; exit 1; }

[ "$(id -u)" -eq 0 ] || err "Please run as root: sudo bash reinstall.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo -e "${YELLOW}⚠️  REINSTALL sẽ xóa toàn bộ /opt/svt-survey và cài lại.${NC}"
echo -e "${GREEN}✅ Dữ liệu tại $DATA_DIR sẽ được GIỮ NGUYÊN.${NC}"
echo ""
read -p "Tiếp tục? [y/N] " -n 1 -r; echo
[[ $REPLY =~ ^[Yy]$ ]] || { log "Hủy."; exit 0; }

# ── Stop & remove current install ────────────────────────────────────────────
cleanup() {
  log "Stopping services..."
  systemctl stop svt-survey 2>/dev/null || true
  systemctl disable svt-survey 2>/dev/null || true
  rm -f /etc/systemd/system/svt-survey.service
  systemctl daemon-reload

  log "Removing app directory..."
  rm -rf "$APP_DIR"

  # Remove nginx site but keep nginx running
  rm -f /etc/nginx/sites-enabled/svt-survey /etc/nginx/sites-available/svt-survey
  nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null || true

  log "Cleanup done ✓"
}

# ── Re-run full install ───────────────────────────────────────────────────────
reinstall() {
  log "Running full install..."
  bash "$SCRIPT_DIR/install.sh"
}

cleanup
reinstall
