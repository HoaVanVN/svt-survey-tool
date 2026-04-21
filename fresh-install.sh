#!/usr/bin/env bash
# SVT Survey Tool – Fresh Install
# Xóa TOÀN BỘ bản cũ (app + data) và cài lại từ đầu hoàn toàn
# Usage: sudo bash fresh-install.sh
set -euo pipefail

APP_DIR="/opt/svt-survey"
DATA_DIR="/var/lib/svt-survey"
SERVICE_USER="svtsurvey"
BACKEND_PORT=8000

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[FRESH-INSTALL]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; exit 1; }

[ "$(id -u)" -eq 0 ] || err "Please run as root: sudo bash fresh-install.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Cảnh báo ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${RED}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║              ⚠️  CẢNH BÁO / WARNING                  ║${NC}"
echo -e "${RED}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${RED}║  Script này sẽ XÓA HOÀN TOÀN:                       ║${NC}"
echo -e "${RED}║    • Ứng dụng:  ${APP_DIR}               ║${NC}"
echo -e "${RED}║    • Dữ liệu:   ${DATA_DIR}          ║${NC}"
echo -e "${RED}║    • Service:   svt-survey (systemd)                 ║${NC}"
echo -e "${RED}║    • Nginx:     site config svt-survey               ║${NC}"
echo -e "${RED}║    • User:      svtsurvey                            ║${NC}"
echo -e "${RED}║                                                      ║${NC}"
echo -e "${RED}║  Toàn bộ dữ liệu khảo sát sẽ MẤT VĨNH VIỄN!        ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Yêu cầu gõ xác nhận
read -p "Gõ  YES  để xác nhận xóa toàn bộ: " CONFIRM
[ "$CONFIRM" = "YES" ] || { log "Hủy. Không có gì thay đổi."; exit 0; }

echo ""

# ── Tuỳ chọn backup trước khi xóa ────────────────────────────────────────────
if [ -f "$DATA_DIR/svt_survey.db" ]; then
  read -p "Tạo backup database trước khi xóa? [Y/n] " -n 1 -r BACKUP_REPLY; echo
  if [[ ! $BACKUP_REPLY =~ ^[Nn]$ ]]; then
    BACKUP_PATH="$HOME/svt_survey_backup_$(date +%Y%m%d_%H%M%S).db"
    cp "$DATA_DIR/svt_survey.db" "$BACKUP_PATH"
    log "Database backed up → $BACKUP_PATH"
  fi
fi

# ── Dừng và xóa service ───────────────────────────────────────────────────────
purge_service() {
  log "Stopping svt-survey service..."
  systemctl stop svt-survey 2>/dev/null || true
  systemctl disable svt-survey 2>/dev/null || true
  rm -f /etc/systemd/system/svt-survey.service
  systemctl daemon-reload
  log "Service removed ✓"
}

# ── Xóa nginx config ──────────────────────────────────────────────────────────
purge_nginx() {
  log "Removing nginx config..."
  rm -f /etc/nginx/sites-enabled/svt-survey
  rm -f /etc/nginx/sites-available/svt-survey

  # Khôi phục default site nếu chưa có site nào enabled
  if [ -z "$(ls /etc/nginx/sites-enabled/ 2>/dev/null)" ]; then
    if [ -f /etc/nginx/sites-available/default ]; then
      ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
      warn "Restored nginx default site"
    fi
  fi
  nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null || true
  log "Nginx config removed ✓"
}

# ── Xóa thư mục app và data ───────────────────────────────────────────────────
purge_files() {
  log "Removing app directory: $APP_DIR"
  rm -rf "$APP_DIR"

  log "Removing data directory: $DATA_DIR"
  rm -rf "$DATA_DIR"

  log "Files removed ✓"
}

# ── Xóa user ──────────────────────────────────────────────────────────────────
purge_user() {
  if id "$SERVICE_USER" &>/dev/null; then
    userdel "$SERVICE_USER" 2>/dev/null || true
    log "User $SERVICE_USER removed ✓"
  fi
}

# ── Cài lại từ đầu ───────────────────────────────────────────────────────────
run_install() {
  log "Starting fresh installation from $SCRIPT_DIR..."
  echo ""
  bash "$SCRIPT_DIR/install.sh"
}

# ── Main ──────────────────────────────────────────────────────────────────────
log "Purging old installation..."
purge_service
purge_nginx
purge_files
purge_user

echo ""
log "Old version removed completely ✓"
echo ""

read -p "Cài đặt phiên bản mới ngay bây giờ? [Y/n] " -n 1 -r INSTALL_REPLY; echo
if [[ ! $INSTALL_REPLY =~ ^[Nn]$ ]]; then
  run_install
else
  echo ""
  log "Purge hoàn tất. Cài lại thủ công bằng lệnh:"
  echo -e "  ${GREEN}sudo bash $SCRIPT_DIR/install.sh${NC}"
  echo ""
fi
