#!/usr/bin/env bash
# SVT Survey Tool – Ubuntu Installer
# Supports: Ubuntu 20.04, 22.04, 24.04
set -euo pipefail

APP_NAME="svt-survey-tool"
APP_DIR="/opt/svt-survey"
DATA_DIR="/var/lib/svt-survey"
SERVICE_USER="svtsurvey"
BACKEND_PORT=8000
FRONTEND_PORT=3000

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log() { echo -e "${GREEN}[SVT]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err() { echo -e "${RED}[ERR]${NC} $1"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

check_ubuntu() {
  if ! command -v apt-get &>/dev/null; then
    err "This installer requires Ubuntu/Debian (apt-get not found)"
  fi
  log "Ubuntu/Debian detected ✓"
}

install_deps() {
  log "Updating package list..."
  apt-get update -qq

  log "Installing system dependencies..."
  apt-get install -y -qq \
    python3 python3-pip python3-venv \
    curl wget git build-essential \
    nginx 2>/dev/null || true

  # Node.js 20 LTS
  if ! command -v node &>/dev/null || [ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 18 ]; then
    log "Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi
  log "Node.js $(node -v) ✓"
  log "Python $(python3 --version) ✓"
}

create_user() {
  if ! id "$SERVICE_USER" &>/dev/null; then
    useradd --system --shell /bin/false --home "$APP_DIR" --create-home "$SERVICE_USER"
    log "Created user: $SERVICE_USER"
  fi
}

install_backend() {
  log "Setting up backend..."
  mkdir -p "$APP_DIR/backend" "$DATA_DIR"

  cp -r "$SCRIPT_DIR/backend/"* "$APP_DIR/backend/"

  python3 -m venv "$APP_DIR/venv"
  "$APP_DIR/venv/bin/pip" install --quiet --upgrade pip
  "$APP_DIR/venv/bin/pip" install --quiet -r "$APP_DIR/backend/requirements.txt"
  log "Backend dependencies installed ✓"
}

build_frontend() {
  log "Building frontend..."
  mkdir -p "$APP_DIR/frontend"
  cd "$SCRIPT_DIR/frontend"

  log "Installing npm packages..."
  npm install

  log "Compiling React app (this may take a minute)..."
  npm run build

  if [ ! -f "dist/index.html" ]; then
    err "Frontend build failed: dist/index.html not found. Check npm output above."
  fi

  rm -rf "$APP_DIR/frontend/dist"
  cp -r dist "$APP_DIR/frontend/"
  log "Frontend built and deployed ✓"
}

configure_nginx() {
  log "Configuring nginx..."
  cat > /etc/nginx/sites-available/svt-survey << NGINX
server {
    listen 80;
    server_name _;

    location /api {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 300s;
        client_max_body_size 50m;
    }

    location / {
        root ${APP_DIR}/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    }
}
NGINX

  if [ -f /etc/nginx/sites-enabled/default ]; then
    rm -f /etc/nginx/sites-enabled/default
  fi
  ln -sf /etc/nginx/sites-available/svt-survey /etc/nginx/sites-enabled/
  nginx -t && systemctl reload nginx
  log "Nginx configured ✓"
}

create_systemd_service() {
  log "Creating systemd service..."
  cat > /etc/systemd/system/svt-survey.service << SERVICE
[Unit]
Description=SVT Survey Tool – Infrastructure Sizing Platform
After=network.target

[Service]
Type=simple
User=${SERVICE_USER}
WorkingDirectory=${APP_DIR}/backend
Environment="SVT_DATA_DIR=${DATA_DIR}"
ExecStart=${APP_DIR}/venv/bin/uvicorn main:app --host 127.0.0.1 --port ${BACKEND_PORT} --workers 2
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE

  systemctl daemon-reload
  systemctl enable svt-survey
  systemctl start svt-survey
  log "Systemd service created and started ✓"
}

set_permissions() {
  chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR" "$DATA_DIR"
  chmod -R 750 "$APP_DIR"
  chmod -R 770 "$DATA_DIR"
}

verify_install() {
  log "Verifying installation..."

  # Check dist
  if [ ! -f "$APP_DIR/frontend/dist/index.html" ]; then
    err "Verification failed: $APP_DIR/frontend/dist/index.html not found"
  fi
  log "Frontend dist ✓"

  # Check backend health
  sleep 3
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${BACKEND_PORT}/api/health || echo "000")
  if [ "$HTTP" = "200" ]; then
    log "Backend API health check ✓"
  else
    err "Verification failed: backend returned HTTP $HTTP. Check: journalctl -u svt-survey -n 30"
  fi

  # Check nginx
  if ! nginx -t 2>/dev/null; then
    err "Verification failed: nginx config invalid"
  fi
  log "Nginx config ✓"
}

print_summary() {
  IP=$(hostname -I | awk '{print $1}')
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║      SVT Survey Tool – Installation Complete   ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  🌐 Web UI:       ${GREEN}http://${IP}${NC}"
  echo -e "  📖 API Docs:     ${GREEN}http://${IP}/api/docs${NC}"
  echo -e "  📂 App dir:      ${APP_DIR}"
  echo -e "  💾 Data dir:     ${DATA_DIR}"
  echo ""
  echo -e "  Manage service:"
  echo -e "    sudo systemctl status svt-survey"
  echo -e "    sudo systemctl restart svt-survey"
  echo -e "    sudo journalctl -u svt-survey -f"
  echo ""
  echo -e "  Upgrade / Reinstall:"
  echo -e "    sudo bash upgrade.sh"
  echo -e "    sudo bash reinstall.sh"
  echo ""
}

# ── Main ────────────────────────────────────────────────────────────────────
[ "$(id -u)" -eq 0 ] || err "Please run as root: sudo bash install.sh"

log "Starting SVT Survey Tool installation..."
check_ubuntu
install_deps
create_user
install_backend
build_frontend
configure_nginx
set_permissions
create_systemd_service
verify_install
print_summary
