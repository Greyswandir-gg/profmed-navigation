#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

docker compose build profmed
docker compose up -d profmed

mkdir -p /root/n8n-install/caddy-addon
cp "$ROOT/deploy/site-profmed.conf" /root/n8n-install/caddy-addon/site-profmed.conf
docker exec caddy caddy reload --config /etc/caddy/Caddyfile >/dev/null

echo "profmed-navigation deployed: https://profmed.crimsonblomhost.ru"
