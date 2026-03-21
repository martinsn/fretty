#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ ! -f "$SCRIPT_DIR/.env" ]]; then
    echo "Error: deploy/.env not found."
    exit 1
fi
source "$SCRIPT_DIR/.env"

echo "==> Setting up HTTPS certificate for $DOMAIN on $SERVER..."

ssh "$SERVER" bash -s "$DOMAIN" << 'REMOTE'
set -euo pipefail
DOMAIN="$1"

echo "==> Verifying nginx config..."
nginx -t
systemctl reload nginx

echo "==> Requesting Let's Encrypt certificate..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email

echo "==> Done! Certificate installed for $DOMAIN"
REMOTE
