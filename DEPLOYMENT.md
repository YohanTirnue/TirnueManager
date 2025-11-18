# Safe Deployment Guide for MCSManager

## ⚠️ CRITICAL: Never Use `cp -r` for Updates!

Using `cp -r production-code/daemon/* /home/mc/daemon/` **WILL OVERWRITE** your production configurations and potentially destroy data!

### What Gets Destroyed:
- `/data/Config/global.json` - Daemon IP, port, API keys
- `/data/SystemConfig/config.json` - httpIp, reverseProxyMode, gzip settings
- `/data/RemoteServiceConfig/*.json` - Remote daemon connections
- `/data/User/*.json` - User accounts and permissions
- `/data/InstanceData/*/` - All instance configurations and data

## ✅ Safe Update Process

### Step 1: Build on Development Server
```bash
cd /home/user/TirnueManager
git pull origin claude/work-in-progress-01SJEbhyP4sbZS8BPbPrdFGL
./build.sh
```

### Step 2: Deploy Using Safe Update Script
```bash
./safe-update.sh
```

The safe update script will:
- ✅ **Exclude** `data/` directories (configs + instance data)
- ✅ **Exclude** `logs/` directories
- ✅ **Exclude** `.env` files
- ✅ **Create backups** of existing data before updating
- ✅ **Only update** code files (app.js, package.json, public/)
- ✅ **Preserve** all production configurations

### Step 3: Restart Services
```bash
# Restart daemon
cd /home/mc/daemon && pkill -f 'node app.js' && nohup node app.js > /home/mc/daemon.log 2>&1 &

# Restart web panel
cd /home/mc/web && pkill -f 'node app.js' && nohup node app.js > /home/mc/web.log 2>&1 &

# Monitor logs
tail -f /home/mc/daemon.log /home/mc/web.log
```

## 🚨 Troubleshooting

### "My settings got reset after update!"
Restore from backup:
```bash
# Find latest backup
ls -la /home/mc/backups/

# Restore configs
cp -r /home/mc/backups/TIMESTAMP/daemon-data /home/mc/daemon/data
cp -r /home/mc/backups/TIMESTAMP/web-data /home/mc/web/data
```
