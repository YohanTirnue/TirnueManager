#!/bin/bash
set -e

echo "Stopping services..."
pkill -f 'node app.js' || true
sleep 2

echo "Copying daemon code (keeping data/ and lib/)..."
cp -r production-code/daemon/* /home/mc/daemon/ 2>/dev/null || true

echo "Copying web code (keeping data/)..."
cp -r production-code/web/* /home/mc/web/ 2>/dev/null || true

echo "Installing dependencies..."
cd /home/mc/daemon && npm install --production --silent
cd /home/mc/web && npm install --production --silent

echo "Starting daemon..."
cd /home/mc/daemon && nohup node app.js > /home/mc/daemon.log 2>&1 &
sleep 3

echo "Starting web..."
cd /home/mc/web && nohup node app.js > /home/mc/web.log 2>&1 &

echo "Done. Check: tail -f /home/mc/daemon.log /home/mc/web.log"
