#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ ! -f "$SCRIPT_DIR/.env" ]]; then
    echo "Error: deploy/.env not found. Copy deploy/.env.example and fill in values."
    exit 1
fi
source "$SCRIPT_DIR/.env"

echo "==> Setting up Fretty on $SERVER..."

scp "$SCRIPT_DIR/fretty.service" "$SERVER:/tmp/fretty.service"
scp "$SCRIPT_DIR/nginx.conf"    "$SERVER:/tmp/fretty-nginx.conf"

ssh "$SERVER" bash -s "$DOMAIN" "$SECRET_KEY" << 'REMOTE_SCRIPT'
set -euo pipefail

DOMAIN="$1"
SECRET_KEY="$2"

echo "==> Installing packages..."
apt-get update -qq
apt-get install -y -qq python3 python3-venv python3-pip nginx certbot python3-certbot-nginx

echo "==> Creating fretty system user..."
if ! id -u fretty &>/dev/null; then
    useradd --system --no-create-home --shell /usr/sbin/nologin fretty
    echo "    Created user 'fretty'"
else
    echo "    User 'fretty' already exists"
fi

echo "==> Creating directories..."
mkdir -p /opt/fretty/{backend,frontend,data}
chown -R fretty:fretty /opt/fretty

echo "==> Creating Python venv..."
python3 -m venv /opt/fretty/backend/venv
chown -R fretty:fretty /opt/fretty/backend/venv

echo "==> Writing production .env..."
cat > /opt/fretty/.env << EOF
SECRET_KEY=$SECRET_KEY
DATABASE_URL=sqlite+aiosqlite:///./fretty.db
CORS_ORIGINS=https://$DOMAIN
EOF
chown fretty:fretty /opt/fretty/.env
chmod 600 /opt/fretty/.env

echo "==> Installing systemd service..."
cp /tmp/fretty.service /etc/systemd/system/fretty.service
systemctl daemon-reload
systemctl enable fretty

echo "==> Configuring nginx..."
sed "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /tmp/fretty-nginx.conf > /etc/nginx/sites-available/fretty
ln -sf /etc/nginx/sites-available/fretty /etc/nginx/sites-enabled/fretty
nginx -t
systemctl reload nginx

echo "==> Setting up HTTPS with Let's Encrypt..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email

echo ""
echo "==> Setup complete!"
echo "    Run ./deploy.sh to deploy the app."
REMOTE_SCRIPT
