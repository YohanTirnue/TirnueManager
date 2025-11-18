# TirnueManager Server Deployment Instructions

## Problem Identified

Your systemd services are pointing to the wrong paths. TirnueManager needs to be **built** first, and the actual entry points are in the `production-code` directory.

### Current (Wrong) Paths:
- Daemon: `/home/mc/TirnueManager/daemon/app.js` ❌
- Panel: `/home/mc/TirnueManager/panel/app.js` ❌

### Correct Paths After Build:
- Daemon: `/home/mc/daemon/app.js` ✅
- Panel: `/home/mc/web/app.js` ✅

## Deployment Steps

### 1. On Your Server, Run the Deployment Script:

```bash
cd /home/mc/TirnueManager
./deploy-production.sh
```

This script will:
- ✅ Pull latest changes from the correct branch
- ✅ Build the project (creates production-code directory)
- ✅ Backup existing data
- ✅ Deploy to /home/mc/daemon and /home/mc/web
- ✅ Preserve all your configs and instance data
- ✅ Start the services

### 2. Verify Services Are Running:

```bash
# Check if processes are running
ps aux | grep "node app.js"

# Monitor logs
tail -f /home/mc/daemon.log /home/mc/web.log
```

### 3. Test the Panel:

Visit: https://brockpnl.chiz.site

## If Using Systemd Services

If you want to use systemd instead of nohup, update your service files:

### Daemon Service (/etc/systemd/system/mcsm-daemon.service):
```ini
[Service]
WorkingDirectory=/home/mc/daemon
ExecStart=/usr/bin/node /home/mc/daemon/app.js
```

### Panel Service (/etc/systemd/system/mcsm-web.service):
```ini
[Service]
WorkingDirectory=/home/mc/web
ExecStart=/usr/bin/node /home/mc/web/app.js
```

Then reload and restart:
```bash
sudo systemctl daemon-reload
sudo systemctl restart mcsm-daemon
sudo systemctl restart mcsm-web
sudo systemctl status mcsm-daemon mcsm-web
```

## Build Process Explained

The `build.sh` script:
1. Builds daemon (TypeScript → JavaScript)
2. Builds panel (TypeScript → JavaScript)
3. Builds frontend (Vue → Static files)
4. Creates `production-code/` directory with:
   - `production-code/daemon/app.js` (daemon entry)
   - `production-code/web/app.js` (panel entry)
   - `production-code/web/public/` (frontend files)

The deploy script then copies these to `/home/mc/daemon/` and `/home/mc/web/`.

## Monitoring

After deployment, monitor the logs to ensure everything is working:

```bash
# Watch both logs
tail -f /home/mc/daemon.log /home/mc/web.log

# Check for errors
grep -i error /home/mc/daemon.log /home/mc/web.log

# Check process status
ps aux | grep node
```

## Features Deployed

This deployment includes all the latest updates:
- ✅ Fixed vite.config.ts (removed terser causing initialization errors)
- ✅ Modern login page with full-page design
- ✅ Updated Statistics page with readable colors
- ✅ Sidebar logout with custom modal
- ✅ Redesigned Users page with card layout
