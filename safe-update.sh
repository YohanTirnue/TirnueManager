#!/bin/bash

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  MCSManager Safe Update Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Configuration
PRODUCTION_BASE="/home/mc"
BUILD_DIR="$(pwd)/production-code"

# Validate directories exist
if [ ! -d "$BUILD_DIR" ]; then
    echo -e "${RED}Error: production-code directory not found!${NC}"
    echo -e "${YELLOW}Please run ./build.sh first to build the project.${NC}"
    exit 1
fi

if [ ! -d "$PRODUCTION_BASE/daemon" ] || [ ! -d "$PRODUCTION_BASE/web" ]; then
    echo -e "${RED}Error: Production directories not found at $PRODUCTION_BASE${NC}"
    echo -e "${YELLOW}Please ensure MCSManager is installed at $PRODUCTION_BASE${NC}"
    exit 1
fi

# Function to safely update a directory
safe_update() {
    local source=$1
    local target=$2
    local component=$3

    echo -e "${YELLOW}Updating $component...${NC}"

    # Use rsync to copy files while excluding sensitive directories
    rsync -av \
        --exclude='data/' \
        --exclude='logs/' \
        --exclude='node_modules/' \
        --exclude='.git/' \
        --exclude='.env' \
        --delete-after \
        "$source/" "$target/"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $component updated successfully${NC}"
    else
        echo -e "${RED}✗ Failed to update $component${NC}"
        exit 1
    fi
}

# Backup function
create_backup() {
    local target=$1
    local component=$2
    local backup_dir="${PRODUCTION_BASE}/backups/$(date +%Y%m%d_%H%M%S)"

    echo -e "${YELLOW}Creating backup of $component config...${NC}"
    mkdir -p "$backup_dir"

    if [ -d "$target/data" ]; then
        cp -r "$target/data" "$backup_dir/${component}-data"
        echo -e "${GREEN}✓ Backup created at $backup_dir/${component}-data${NC}"
    fi
}

# Confirm update
echo -e "${YELLOW}This will update MCSManager with the following safety measures:${NC}"
echo -e "  • Excludes data/ directories (configs, instances, users)"
echo -e "  • Excludes logs/ directories"
echo -e "  • Excludes .env files"
echo -e "  • Creates backup of existing data/"
echo ""
echo -e "${YELLOW}Source: $BUILD_DIR${NC}"
echo -e "${YELLOW}Target: $PRODUCTION_BASE${NC}"
echo ""
read -p "Continue with update? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}Update cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}Starting safe update...${NC}"
echo ""

# Create backups
create_backup "$PRODUCTION_BASE/daemon" "daemon"
create_backup "$PRODUCTION_BASE/web" "web"

echo ""

# Update daemon
safe_update "$BUILD_DIR/daemon" "$PRODUCTION_BASE/daemon" "Daemon"

echo ""

# Update web panel
safe_update "$BUILD_DIR/web" "$PRODUCTION_BASE/web" "Web Panel"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Update completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Restart daemon: cd /home/mc/daemon && pkill -f 'node app.js' && nohup node app.js > /home/mc/daemon.log 2>&1 &"
echo -e "  2. Restart web:    cd /home/mc/web && pkill -f 'node app.js' && nohup node app.js > /home/mc/web.log 2>&1 &"
echo -e "  3. Check logs:     tail -f /home/mc/daemon.log /home/mc/web.log"
echo ""
echo -e "${GREEN}Your production configs and data are preserved!${NC}"
echo ""
