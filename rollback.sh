#!/usr/bin/env bash
# SVT Survey Tool – Version Rollback Script
# Rolls back to any previously released version by re-running the upgrade
# pipeline against a specific git tag fetched from GitHub.
#
# Usage:
#   sudo bash rollback.sh              # interactive – lists versions and prompts
#   sudo bash rollback.sh v2.2.1       # non-interactive – rollback to specific tag
#
set -euo pipefail

REPO_URL="https://github.com/HoaVanVN/svt-survey-tool.git"
APP_DIR="/opt/svt-survey"
DATA_DIR="/var/lib/svt-survey"
BACKEND_PORT=8000
TMP_DIR="/tmp/svt-survey-rollback-$$"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${GREEN}[SVT-ROLLBACK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; exit 1; }
sep()  { echo -e "${BLUE}────────────────────────────────────────────────${NC}"; }

# ── Root check ────────────────────────────────────────────────────────────────
[ "$(id -u)" -eq 0 ] || err "Please run as root: sudo bash rollback.sh"

# ── Dependency check ──────────────────────────────────────────────────────────
for cmd in git curl node npm python3; do
  command -v "$cmd" &>/dev/null || err "Required command not found: $cmd (run install.sh first)"
done

# ── App installation check ────────────────────────────────────────────────────
[ -d "$APP_DIR" ]      || err "App not installed at $APP_DIR. Run install.sh first."
[ -d "$APP_DIR/venv" ] || err "Python venv not found at $APP_DIR/venv. Run install.sh first."

# ── Print header ──────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║      SVT Survey Tool – Version Rollback          ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ── Detect current version ────────────────────────────────────────────────────
CURRENT_VERSION=$(curl -s "http://127.0.0.1:${BACKEND_PORT}/api/health" 2>/dev/null \
  | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
log "Current running version : ${BOLD}${CURRENT_VERSION}${NC}"

# ── Fetch available tags from GitHub ─────────────────────────────────────────
log "Fetching available versions from GitHub..."
TAGS=$(git ls-remote --tags "$REPO_URL" 2>/dev/null \
  | grep -o 'refs/tags/v[^{}]*$' \
  | sed 's|refs/tags/||' \
  | grep -v '{}' \
  | sort -t. -k1,1V -k2,2n -k3,3n -k4,4n \
  | tac) \
  || err "Could not reach GitHub. Check internet connectivity."

if [ -z "$TAGS" ]; then
  err "No version tags found in repository."
fi

# ── Display available versions ────────────────────────────────────────────────
sep
echo -e "${BLUE}Available versions (most recent first):${NC}"
echo ""
i=1
while IFS= read -r tag; do
  if [ "$tag" = "v${CURRENT_VERSION}" ] || [ "$tag" = "${CURRENT_VERSION}" ]; then
    printf "  %2d)  %-14s  ${GREEN}← current${NC}\n" "$i" "$tag"
  else
    printf "  %2d)  %s\n" "$i" "$tag"
  fi
  i=$((i+1))
done <<< "$TAGS"
echo ""
sep

# ── Determine target version ──────────────────────────────────────────────────
if [ -n "${1:-}" ]; then
  # Version passed as argument (non-interactive)
  TARGET_VERSION="$1"
  log "Target version (from argument): ${BOLD}${TARGET_VERSION}${NC}"
else
  # Interactive selection
  read -rp "Enter version to rollback to (e.g. v2.2.1) or number from list: " INPUT
  if [[ "$INPUT" =~ ^[0-9]+$ ]]; then
    # Numeric selection
    TARGET_VERSION=$(echo "$TAGS" | sed -n "${INPUT}p")
    [ -n "$TARGET_VERSION" ] || err "Invalid selection: $INPUT"
  else
    TARGET_VERSION="$INPUT"
  fi
fi

# Normalise: ensure leading 'v'
[[ "$TARGET_VERSION" == v* ]] || TARGET_VERSION="v${TARGET_VERSION}"

# ── Validate tag exists ───────────────────────────────────────────────────────
echo "$TAGS" | grep -qx "$TARGET_VERSION" \
  || err "Version '${TARGET_VERSION}' not found. Run script again to see available versions."

# ── Confirm ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}⚠️  Rollback summary:${NC}"
echo -e "   FROM : ${BOLD}v${CURRENT_VERSION}${NC}"
echo -e "   TO   : ${BOLD}${TARGET_VERSION}${NC}"
echo ""
echo -e "   This will:"
echo -e "     • Back up the current database"
echo -e "     • Replace backend code with ${TARGET_VERSION}"
echo -e "     • Rebuild and redeploy the frontend"
echo -e "     • Restart the svt-survey service"
echo ""
read -rp "Confirm rollback? [y/N] " CONFIRM
[[ "$CONFIRM" =~ ^[Yy]$ ]] || { log "Rollback cancelled."; exit 0; }

# ── Cleanup trap ──────────────────────────────────────────────────────────────
cleanup() { [ -d "$TMP_DIR" ] && rm -rf "$TMP_DIR" && log "Cleaned up temp files."; }
trap cleanup EXIT

# ── Clone the target version ──────────────────────────────────────────────────
log "Cloning ${TARGET_VERSION} from GitHub..."
git clone --depth 1 --branch "$TARGET_VERSION" "$REPO_URL" "$TMP_DIR" \
  || err "Failed to clone ${TARGET_VERSION}. Check connectivity and that the tag exists."

# ── Verify upgrade.sh exists in the target version ───────────────────────────
[ -f "$TMP_DIR/upgrade.sh" ] \
  || err "upgrade.sh not found in ${TARGET_VERSION} — this version may be too old to self-upgrade."

# ── Backup database ───────────────────────────────────────────────────────────
if [ -f "$DATA_DIR/svt_survey.db" ]; then
  BACKUP="$DATA_DIR/rollback_pre_${TARGET_VERSION}_$(date +%Y%m%d_%H%M%S).db"
  cp "$DATA_DIR/svt_survey.db" "$BACKUP"
  log "Database backed up → $BACKUP"
else
  warn "No database found at $DATA_DIR/svt_survey.db – skipping backup"
fi

# ── Run upgrade.sh from the target version ────────────────────────────────────
log "Running upgrade.sh from ${TARGET_VERSION}..."
bash "$TMP_DIR/upgrade.sh"

# ── Summary ───────────────────────────────────────────────────────────────────
NEW_VERSION=$(curl -s "http://127.0.0.1:${BACKEND_PORT}/api/health" 2>/dev/null \
  | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "?")
IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Rollback Complete ✓                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Active version : ${BOLD}v${NEW_VERSION}${NC}"
echo -e "  Web UI         : ${GREEN}http://${IP}${NC}"
echo -e "  DB backup      : ${DATA_DIR}/rollback_pre_${TARGET_VERSION}_*.db"
echo ""
echo -e "  To upgrade back to the latest version at any time:"
echo -e "    ${BOLD}sudo bash update.sh${NC}"
echo ""
