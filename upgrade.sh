#!/usr/bin/env bash
# SVT Survey Tool – Upgrade script
# Usage: sudo bash upgrade.sh [version]
# Example: sudo bash upgrade.sh v1.0.2
#          sudo bash upgrade.sh          <- upgrades from current directory
set -euo pipefail

APP_DIR="/opt/svt-survey"
DATA_DIR="/var/lib/svt-survey"
SERVICE_USER="svtsurvey"
BACKEND_PORT=8000

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[SVT-UPGRADE]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; exit 1; }

[ "$(id -u)" -eq 0 ] || err "Please run as root: sudo bash upgrade.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Backup database trước khi upgrade ────────────────────────────────────────
backup_data() {
  BACKUP_FILE="$DATA_DIR/backup_$(date +%Y%m%d_%H%M%S).db"
  if [ -f "$DATA_DIR/svt_survey.db" ]; then
    cp "$DATA_DIR/svt_survey.db" "$BACKUP_FILE"
    log "Database backed up → $BACKUP_FILE"
  fi
}

# ── Upgrade backend ───────────────────────────────────────────────────────────
upgrade_backend() {
  log "Upgrading backend..."
  cp -r "$SCRIPT_DIR/backend/"* "$APP_DIR/backend/"
  "$APP_DIR/venv/bin/pip" install --quiet --upgrade pip
  "$APP_DIR/venv/bin/pip" install --quiet -r "$APP_DIR/backend/requirements.txt"
  log "Backend upgraded ✓"
}

# ── Rebuild & deploy frontend ─────────────────────────────────────────────────
upgrade_frontend() {
  log "Building frontend..."
  cd "$SCRIPT_DIR/frontend"

  npm install
  npm run build

  if [ ! -f "dist/index.html" ]; then
    err "Frontend build failed: dist/index.html not found"
  fi

  mkdir -p "$APP_DIR/frontend"
  rm -rf "$APP_DIR/frontend/dist"
  cp -r dist "$APP_DIR/frontend/"
  chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR/frontend"
  log "Frontend deployed ✓"
}

# ── Restart services ──────────────────────────────────────────────────────────
restart_services() {
  log "Restarting services..."
  systemctl restart svt-survey
  sleep 2
  if systemctl is-active --quiet svt-survey; then
    log "svt-survey service restarted ✓"
  else
    err "svt-survey failed to start. Check: journalctl -u svt-survey -n 30"
  fi
  nginx -t && systemctl reload nginx
  log "Nginx reloaded ✓"
}

verify() {
  sleep 1
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$BACKEND_PORT/api/health)
  if [ "$HTTP" = "200" ]; then
    VERSION=$(curl -s http://127.0.0.1:$BACKEND_PORT/api/health | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    log "API health check OK (version: $VERSION) ✓"
  else
    warn "API health check returned HTTP $HTTP"
  fi
}

print_summary() {
  IP=$(hostname -I | awk '{print $1}')
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║        SVT Survey Tool – Upgrade Complete      ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  🌐 Web UI:   ${GREEN}http://${IP}${NC}"
  echo -e "  💾 Backup:   $DATA_DIR/backup_*.db"
  echo ""
}

log "Starting SVT Survey Tool upgrade from $SCRIPT_DIR..."
backup_data
upgrade_backend
upgrade_frontend
restart_services
verify
print_summary
