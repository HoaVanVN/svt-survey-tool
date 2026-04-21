#!/usr/bin/env bash
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "Run as root"; exit 1; }

read -p "This will REMOVE SVT Survey Tool and ALL data. Continue? [y/N] " -n 1 -r
echo
[[ $REPLY =~ ^[Yy]$ ]] || exit 0

systemctl stop svt-survey 2>/dev/null || true
systemctl disable svt-survey 2>/dev/null || true
rm -f /etc/systemd/system/svt-survey.service
systemctl daemon-reload

rm -f /etc/nginx/sites-enabled/svt-survey /etc/nginx/sites-available/svt-survey
nginx -t && systemctl reload nginx 2>/dev/null || true

read -p "Also delete data directory /var/lib/svt-survey? [y/N] " -n 1 -r
echo
[[ $REPLY =~ ^[Yy]$ ]] && rm -rf /var/lib/svt-survey && echo "Data deleted."

rm -rf /opt/svt-survey
userdel svtsurvey 2>/dev/null || true

echo "SVT Survey Tool uninstalled."
