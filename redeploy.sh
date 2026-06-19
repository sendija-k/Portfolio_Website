#!/usr/bin/env bash
# One-command deploy to the Lightsail server (run locally in Git Bash).
# Pushes your code over SSH/IPv6 and restarts the app. No GitHub needed on the server.
#
# Usage:  ./redeploy.sh
set -euo pipefail

SRC="/c/Users/sendi/Documents/GitHub/Portfolio_Website"
HOST="lightsail"                              # SSH alias from ~/.ssh/config
DEST="/home/ubuntu/Portfolio_Website-main"   # where the app runs on the server

echo "==> Sending code to $HOST (excluding node_modules, .git, .env, data, screenshots)..."
tar czf - -C "$SRC" \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=.env \
  --exclude=data \
  --exclude=screenshots \
  . | ssh "$HOST" "mkdir -p $DEST && tar xzf - -C $DEST"

echo "==> Installing deps & restarting app on the server..."
ssh "$HOST" "cd $DEST && npm install --omit=dev && pm2 restart sendija-portfolio && pm2 status sendija-portfolio"

echo "==> Done. Live at https://www.sendija.com"
