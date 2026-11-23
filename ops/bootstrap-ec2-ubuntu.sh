#!/usr/bin/env bash
set -Eeuo pipefail
if [[ "$(id -u)" -ne 0 ]]; then echo "Run with sudo." >&2; exit 1; fi
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl unzip jq awscli nginx snapd
if ! command -v node >/dev/null 2>&1 || ! node --version | grep -q '^v22\.'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
if ! snap list amazon-ssm-agent >/dev/null 2>&1; then snap install amazon-ssm-agent --classic; fi
snap start amazon-ssm-agent || true
systemctl enable snap.amazon-ssm-agent.amazon-ssm-agent.service
systemctl restart snap.amazon-ssm-agent.amazon-ssm-agent.service
id studyapp >/dev/null 2>&1 || useradd --system --create-home --home-dir /opt/study-platform --shell /usr/sbin/nologin studyapp
install -d -o studyapp -g studyapp /opt/study-platform/releases
cat >/etc/systemd/system/study-platform.service <<'UNIT'
[Unit]
Description=Searchable Study Platform
After=network.target
[Service]
User=studyapp
Group=studyapp
WorkingDirectory=/opt/study-platform/current
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=3000
ExecStart=/usr/bin/node /opt/study-platform/current/server.js
Restart=on-failure
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=/opt/study-platform
[Install]
WantedBy=multi-user.target
UNIT
cat >/etc/nginx/sites-available/study-platform <<'NGINX'
server {
 listen 80 default_server;
 listen [::]:80 default_server;
 server_name _;
 location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
 }
}
NGINX
rm -f /etc/nginx/sites-enabled/default
ln -sfn /etc/nginx/sites-available/study-platform /etc/nginx/sites-enabled/study-platform
systemctl daemon-reload
systemctl enable nginx
nginx -t
systemctl restart nginx
echo "Bootstrap complete. Confirm this EC2 instance is Online in Systems Manager."
