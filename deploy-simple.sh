#!/bin/bash
set -e

echo "=== Stopping services ==="
pkill -f 'node app.js' || true
sleep 2

echo "=== Backing up configs ==="
mkdir -p /home/mc/backups/quick
cp -r /home/mc/daemon/data /home/mc/backups/quick/daemon-data-$(date +%s) 2>/dev/null || true
cp -r /home/mc/web/data /home/mc/backups/quick/web-data-$(date +%s) 2>/dev/null || true

echo "=== Copying new code (preserving data/) ==="
rsync -a --exclude='data/' --exclude='logs/' --exclude='node_modules/' --delete production-code/daemon/ /home/mc/daemon/
rsync -a --exclude='data/' --exclude='logs/' --exclude='node_modules/' --delete production-code/web/ /home/mc/web/

echo "=== Installing dependencies (this may take a minute) ==="
cd /home/mc/daemon && npm install --production --silent
cd /home/mc/web && npm install --production --silent

echo "=== Starting services ==="
cd /home/mc/daemon && nohup node app.js > /home/mc/daemon.log 2>&1 &
sleep 3
cd /home/mc/web && nohup node app.js > /home/mc/web.log 2>&1 &

echo "=== DONE ==="
echo "Check logs: tail -f /home/mc/daemon.log /home/mc/web.log"
