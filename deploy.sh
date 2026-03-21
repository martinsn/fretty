#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ ! -f "$SCRIPT_DIR/deploy/.env" ]]; then
    echo "Error: deploy/.env not found. Copy deploy/.env.example and fill in values."
    exit 1
fi
source "$SCRIPT_DIR/deploy/.env"

echo "==> Building frontend..."
cd "$SCRIPT_DIR"
npm install --silent
npm run build

echo "==> Syncing backend to server..."
rsync -az --delete \
    "$SCRIPT_DIR/backend/" \
    "$SERVER:/opt/fretty/backend/" \
    --exclude='venv/' \
    --exclude='__pycache__/' \
    --exclude='*.pyc' \
    --exclude='*.db'

echo "==> Syncing frontend dist to server..."
rsync -az --delete \
    "$SCRIPT_DIR/dist/" \
    "$SERVER:/opt/fretty/frontend/dist/"

echo "==> Fixing ownership, installing deps & restarting..."
ssh "$SERVER" bash -s << 'REMOTE'
set -euo pipefail
chown -R fretty:fretty /opt/fretty

# Create venv if not exists
if [ ! -d /opt/fretty/backend/venv ]; then
    python3 -m venv /opt/fretty/backend/venv
fi

cd /opt/fretty/backend
sudo -u fretty venv/bin/pip install -q -r requirements.txt
systemctl restart fretty
sleep 2

if systemctl is-active --quiet fretty; then
    echo "==> Fretty is running!"
else
    echo "==> ERROR: Fretty failed to start."
    echo "    Check logs: journalctl -u fretty -n 30"
    exit 1
fi
REMOTE

echo "==> Deploy complete!"
echo "    https://$DOMAIN"
