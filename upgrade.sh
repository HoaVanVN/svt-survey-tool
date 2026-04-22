#!/usr/bin/env bash
# SVT Survey Tool – Upgrade script
# Usage: sudo bash upgrade.sh
# Called automatically by update.sh (one-command updater)
set -euo pipefail

APP_DIR="/opt/svt-survey"
DATA_DIR="/var/lib/svt-survey"
SERVICE_USER="svtsurvey"
BACKEND_PORT=8000
SERVICE_FILE="/etc/systemd/system/svt-survey.service"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[SVT-UPGRADE]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; exit 1; }

[ "$(id -u)" -eq 0 ] || err "Please run as root: sudo bash upgrade.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Sanity check ──────────────────────────────────────────────────────────────
[ -d "$APP_DIR" ]       || err "App not installed at $APP_DIR. Run install.sh first."
[ -d "$APP_DIR/venv" ]  || err "Python venv not found. Run install.sh first."

# ── Backup database ───────────────────────────────────────────────────────────
backup_data() {
  if [ -f "$DATA_DIR/svt_survey.db" ]; then
    BACKUP_FILE="$DATA_DIR/backup_$(date +%Y%m%d_%H%M%S).db"
    cp "$DATA_DIR/svt_survey.db" "$BACKUP_FILE"
    log "Database backed up → $BACKUP_FILE"
  else
    warn "No database found at $DATA_DIR/svt_survey.db – skipping backup"
  fi
}

# ── Upgrade backend ───────────────────────────────────────────────────────────
upgrade_backend() {
  log "Upgrading backend files..."
  cp -r "$SCRIPT_DIR/backend/"* "$APP_DIR/backend/"

  log "Upgrading Python dependencies..."
  "$APP_DIR/venv/bin/pip" install --quiet --upgrade pip
  "$APP_DIR/venv/bin/pip" install --quiet -r "$APP_DIR/backend/requirements.txt"

  chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR/backend" "$APP_DIR/venv"
  chmod -R 750 "$APP_DIR/backend" "$APP_DIR/venv"
  log "Backend upgraded ✓"
}

# ── Rebuild & deploy frontend ─────────────────────────────────────────────────
upgrade_frontend() {
  log "Building frontend (this may take a minute)..."
  cd "$SCRIPT_DIR/frontend"

  npm install --prefer-offline
  npm run build

  [ -f "dist/index.html" ] || err "Frontend build failed: dist/index.html not found"

  mkdir -p "$APP_DIR/frontend"
  rm -rf "$APP_DIR/frontend/dist"
  cp -r dist "$APP_DIR/frontend/"

  chown -R "$SERVICE_USER:www-data" "$APP_DIR/frontend"
  find "$APP_DIR/frontend/dist" -type d -exec chmod 755 {} \;
  find "$APP_DIR/frontend/dist" -type f -exec chmod 644 {} \;
  log "Frontend deployed ✓"
}

# ── Patch systemd service (ensures correct flags survive upgrades) ────────────
patch_systemd() {
  if [ ! -f "$SERVICE_FILE" ]; then
    warn "Systemd service not found at $SERVICE_FILE – skipping patch"
    return
  fi

  DESIRED_EXEC="${APP_DIR}/venv/bin/uvicorn main:app \
--host 0.0.0.0 \
--port ${BACKEND_PORT} \
--workers 2 \
--proxy-headers \
--forwarded-allow-ips \"*\""

  CURRENT_EXEC=$(grep "^ExecStart=" "$SERVICE_FILE" || true)

  # Check whether the service already has all required flags
  if echo "$CURRENT_EXEC" | grep -q "\-\-host 0\.0\.0\.0" && \
     echo "$CURRENT_EXEC" | grep -q "\-\-proxy-headers"; then
    log "Systemd service flags already correct ✓"
    return
  fi

  log "Patching systemd service (host + proxy-headers flags)..."
  sed -i "s|^ExecStart=.*|ExecStart=${APP_DIR}/venv/bin/uvicorn main:app --host 0.0.0.0 --port ${BACKEND_PORT} --workers 2 --proxy-headers --forwarded-allow-ips \"*\"|" "$SERVICE_FILE"
  systemctl daemon-reload
  log "Systemd service patched ✓"
}

# ── Restart services ──────────────────────────────────────────────────────────
restart_services() {
  log "Restarting svt-survey service..."
  systemctl restart svt-survey
  sleep 2
  if systemctl is-active --quiet svt-survey; then
    log "svt-survey restarted ✓"
  else
    err "svt-survey failed to start. Check: journalctl -u svt-survey -n 30"
  fi

  if command -v nginx &>/dev/null && systemctl is-active --quiet nginx; then
    nginx -t && systemctl reload nginx
    log "Nginx reloaded ✓"
  fi
}

# ── Health check ──────────────────────────────────────────────────────────────
verify() {
  sleep 1
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$BACKEND_PORT/api/health || echo "000")
  if [ "$HTTP" = "200" ]; then
    VERSION=$(curl -s http://127.0.0.1:$BACKEND_PORT/api/health | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    log "Health check OK — version: ${VERSION} ✓"
  else
    warn "Health check returned HTTP $HTTP"
    warn "Check logs: journalctl -u svt-survey -n 30"
  fi
}

# ── Prune old DB backups (keep last 10) ───────────────────────────────────────
prune_backups() {
  BACKUP_COUNT=$(ls -1 "$DATA_DIR"/backup_*.db 2>/dev/null | wc -l || echo 0)
  if [ "$BACKUP_COUNT" -gt 10 ]; then
    ls -1t "$DATA_DIR"/backup_*.db | tail -n +11 | xargs rm -f
    log "Pruned old backups (keeping 10 most recent)"
  fi
}

print_summary() {
  IP=$(hostname -I | awk '{print $1}')
  VERSION=$(curl -s http://127.0.0.1:$BACKEND_PORT/api/health 2>/dev/null \
            | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "?")
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║     SVT Survey Tool v${VERSION} – Upgrade Complete    ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  🌐 Web UI:    ${GREEN}http://${IP}${NC}"
  echo -e "  💾 Backups:   $DATA_DIR/backup_*.db"
  echo ""
  echo -e "  Service commands:"
  echo -e "    sudo systemctl status svt-survey"
  echo -e "    sudo journalctl -u svt-survey -f"
  echo ""
}

# ── Main ──────────────────────────────────────────────────────────────────────
log "Starting SVT Survey Tool upgrade from: $SCRIPT_DIR"
backup_data
upgrade_backend
upgrade_frontend
patch_systemd
restart_services
verify
prune_backups
print_summary
