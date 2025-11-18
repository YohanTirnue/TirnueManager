#!/bin/bash
set -e

echo "======================================================================"
echo "TirnueManager Deployment Script"
echo "Deploying modernized UI to /home/mc/"
echo "======================================================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_DIR="/home/mc"
REPO_URL="https://github.com/YohanTirnue/TirnueManager.git"
BRANCH="claude/work-in-progress-01SJEbhyP4sbZS8BPbPrdFGL"

echo -e "${YELLOW}Step 1: Stopping current services...${NC}"
pkill -f 'node.*daemon' 2>/dev/null || echo "No daemon process found"
pkill -f 'node.*web' 2>/dev/null || echo "No web process found"
sleep 2

echo -e "${YELLOW}Step 2: Backing up existing data...${NC}"
mkdir -p /tmp/tirnue-backup
cp -r ${DEPLOY_DIR}/daemon/data /tmp/tirnue-backup/daemon-data 2>/dev/null || echo "No daemon data to backup"
cp -r ${DEPLOY_DIR}/web/data /tmp/tirnue-backup/web-data 2>/dev/null || echo "No web data to backup"
echo -e "${GREEN}✓ Backup created at /tmp/tirnue-backup/${NC}"

echo -e "${YELLOW}Step 3: Cloning repository...${NC}"
cd ${DEPLOY_DIR}
if [ -d "TirnueManager" ]; then
    echo "Removing existing TirnueManager directory..."
    rm -rf TirnueManager
fi
git clone ${REPO_URL}
cd TirnueManager

echo -e "${YELLOW}Step 4: Checking out claude branch...${NC}"
git checkout ${BRANCH}
git pull origin ${BRANCH}
echo -e "${GREEN}✓ Branch: ${BRANCH}${NC}"

echo -e "${YELLOW}Step 5: Installing dependencies...${NC}"
chmod +x install-dependents.sh build.sh
./install-dependents.sh

echo -e "${YELLOW}Step 6: Building application...${NC}"
./build.sh

if [ ! -d "production-code" ]; then
    echo -e "${RED}✗ Build failed - production-code directory not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build completed${NC}"

echo -e "${YELLOW}Step 7: Deploying to ${DEPLOY_DIR}...${NC}"
rm -rf ${DEPLOY_DIR}/daemon/* 2>/dev/null || true
rm -rf ${DEPLOY_DIR}/web/* 2>/dev/null || true
cp -r production-code/daemon/* ${DEPLOY_DIR}/daemon/
cp -r production-code/web/* ${DEPLOY_DIR}/web/
echo -e "${GREEN}✓ Files deployed${NC}"

echo -e "${YELLOW}Step 8: Restoring data and configs...${NC}"
cp -r /tmp/tirnue-backup/daemon-data ${DEPLOY_DIR}/daemon/data 2>/dev/null || echo "No daemon data to restore"
cp -r /tmp/tirnue-backup/web-data ${DEPLOY_DIR}/web/data 2>/dev/null || echo "No web data to restore"
echo -e "${GREEN}✓ Data restored${NC}"

echo -e "${YELLOW}Step 9: Verifying configurations...${NC}"
if [ -f "${DEPLOY_DIR}/daemon/data/Config/global.json" ]; then
    DAEMON_IP=$(grep -o '"ip"[[:space:]]*:[[:space:]]*"[^"]*"' ${DEPLOY_DIR}/daemon/data/Config/global.json | cut -d'"' -f4)
    DAEMON_PORT=$(grep -o '"port"[[:space:]]*:[[:space:]]*[0-9]*' ${DEPLOY_DIR}/daemon/data/Config/global.json | grep -o '[0-9]*')
    echo "  Daemon: ${DAEMON_IP}:${DAEMON_PORT}"
fi

if [ -f "${DEPLOY_DIR}/web/data/SystemConfig/config.json" ]; then
    WEB_IP=$(grep -o '"httpIp"[[:space:]]*:[[:space:]]*"[^"]*"' ${DEPLOY_DIR}/web/data/SystemConfig/config.json | cut -d'"' -f4)
    WEB_PORT=$(grep -o '"httpPort"[[:space:]]*:[[:space:]]*[0-9]*' ${DEPLOY_DIR}/web/data/SystemConfig/config.json | grep -o '[0-9]*')
    REVERSE_PROXY=$(grep -o '"reverseProxyMode"[[:space:]]*:[[:space:]]*[^,]*' ${DEPLOY_DIR}/web/data/SystemConfig/config.json | grep -o 'true\|false')
    echo "  Web Panel: ${WEB_IP}:${WEB_PORT} (reverseProxyMode: ${REVERSE_PROXY})"
fi

echo -e "${YELLOW}Step 10: Starting services...${NC}"
cd ${DEPLOY_DIR}/daemon
nohup node app.js > ${DEPLOY_DIR}/daemon.log 2>&1 &
DAEMON_PID=$!

cd ${DEPLOY_DIR}/web
nohup node app.js > ${DEPLOY_DIR}/web.log 2>&1 &
WEB_PID=$!

sleep 3

echo -e "${YELLOW}Step 11: Verifying services...${NC}"
if ps -p $DAEMON_PID > /dev/null; then
    echo -e "${GREEN}✓ Daemon running (PID: $DAEMON_PID)${NC}"
else
    echo -e "${RED}✗ Daemon failed to start${NC}"
    echo "Check logs: tail -50 ${DEPLOY_DIR}/daemon.log"
fi

if ps -p $WEB_PID > /dev/null; then
    echo -e "${GREEN}✓ Web panel running (PID: $WEB_PID)${NC}"
else
    echo -e "${RED}✗ Web panel failed to start${NC}"
    echo "Check logs: tail -50 ${DEPLOY_DIR}/web.log"
fi

echo ""
echo -e "${YELLOW}Port bindings:${NC}"
ss -tlnp | grep -E "23333|24445" || echo "No listening ports found"

echo ""
echo "======================================================================"
echo -e "${GREEN}Deployment Complete!${NC}"
echo "======================================================================"
echo "Access your panel at: https://brockpnl.chiz.site"
echo ""
echo "Useful commands:"
echo "  View daemon logs:  tail -f ${DEPLOY_DIR}/daemon.log"
echo "  View web logs:     tail -f ${DEPLOY_DIR}/web.log"
echo "  Check processes:   ps aux | grep 'node app.js'"
echo "  Check ports:       ss -tlnp | grep -E '23333|24445'"
echo "======================================================================"
