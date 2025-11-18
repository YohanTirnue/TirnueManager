#!/bin/bash

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Production Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"

# Navigate to build directory
cd /home/mc/TirnueManager

echo -e "${YELLOW}Step 1: Pulling latest changes...${NC}"
git stash
git pull origin claude/fix-vite-config-terser-012wxuxGtpsUgSumB3SP2vSn

echo -e "${YELLOW}Step 2: Building application...${NC}"
./build.sh

echo -e "${YELLOW}Step 3: Stopping running services...${NC}"
pkill -f 'node app.js' || true
sleep 2

echo -e "${YELLOW}Step 4: Creating backup of current configs...${NC}"
BACKUP_DIR="/home/mc/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ -d "/home/mc/daemon/data" ]; then
    cp -r /home/mc/daemon/data "$BACKUP_DIR/daemon-data"
    echo -e "${GREEN}✓ Daemon data backed up${NC}"
fi

if [ -d "/home/mc/web/data" ]; then
    cp -r /home/mc/web/data "$BACKUP_DIR/web-data"
    echo -e "${GREEN}✓ Web data backed up${NC}"
fi

echo -e "${YELLOW}Step 5: Deploying with safe copy (excluding data/)...${NC}"

# Remove layout.json to load new layout config
rm -f /home/mc/web/data/layout.json

# Safe copy for daemon - EXCLUDES data/ and logs/
rsync -av \
    --exclude='data/' \
    --exclude='logs/' \
    --exclude='node_modules/' \
    --delete-after \
    production-code/daemon/ /home/mc/daemon/

echo -e "${GREEN}✓ Daemon code updated (data/ preserved)${NC}"

# Safe copy for web - EXCLUDES data/ and logs/
rsync -av \
    --exclude='data/' \
    --exclude='logs/' \
    --exclude='node_modules/' \
    --delete-after \
    production-code/web/ /home/mc/web/

echo -e "${GREEN}✓ Web panel code updated (data/ preserved)${NC}"

echo -e "${YELLOW}Step 6: Installing production dependencies...${NC}"
cd /home/mc/daemon && npm install --production --no-fund --no-audit
cd /home/mc/web && npm install --production --no-fund --no-audit

echo -e "${YELLOW}Step 7: Starting services...${NC}"
cd /home/mc/daemon && nohup node app.js > /home/mc/daemon.log 2>&1 &
echo -e "${GREEN}✓ Daemon started${NC}"

sleep 3

cd /home/mc/web && nohup node app.js > /home/mc/web.log 2>&1 &
echo -e "${GREEN}✓ Web panel started${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Production configs preserved:${NC}"
echo -e "  ✓ Daemon data/ directory intact"
echo -e "  ✓ Web panel data/ directory intact"
echo -e "  ✓ User accounts preserved"
echo -e "  ✓ Instance data preserved"
echo -e "  ✓ Remote daemon configs preserved"
echo ""
echo -e "${YELLOW}Backup created at:${NC} $BACKUP_DIR"
echo ""
echo -e "${YELLOW}Monitor logs:${NC}"
echo -e "  tail -f /home/mc/daemon.log /home/mc/web.log"
echo ""
