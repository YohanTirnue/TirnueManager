# MCSManager Template Version Monitor

Automatically monitors Minecraft server APIs and archives old versions when new builds are released.

## 🎯 What It Does

1. **Monitors** Paper, Velocity, Purpur, Waterfall, and Folia APIs every 6 hours
2. **Detects** when new builds are released
3. **Archives** the previous build as a separate template (e.g., "Paper 1.21.10 Build 52")
4. **Updates** the "Latest" template to point to the new build
5. **Preserves** download links for all historical versions

## 📋 Features

- ✅ **Auto-archiving**: Never lose access to older stable builds
- ✅ **Zero downtime**: Players can choose stable archived builds
- ✅ **Smart detection**: Only creates archives when builds actually change
- ✅ **Multi-server support**: Paper, Velocity, Purpur, Waterfall, Folia
- ✅ **Configurable**: Easy to add more servers or change check intervals

## 🚀 Quick Start

### Option 1: Run Once (Manual Check)
```bash
node template-version-monitor.js
```

### Option 2: Keep Running (Recommended)
```bash
# Windows
start-template-monitor.bat

# Linux/Mac
node template-version-monitor.js &
```

### Option 3: Run as Background Service (PM2)
```bash
npm install -g pm2
pm2 start template-version-monitor.js --name mcsm-template-monitor
pm2 save
pm2 startup
```

## 📁 Files Generated

### `expanded-templates.json`
The main templates file with all server versions (latest + archived)

### `template-version-history.json`
Tracks build numbers and timestamps for version detection

Example:
```json
{
  "versions": {
    "paper-1.21.10": {
      "project": "paper",
      "version": "1.21.10",
      "build": 52,
      "downloadUrl": "https://...",
      "timestamp": "2025-01-15T10:30:00.000Z"
    }
  }
}
```

## 🔧 How It Works

### Example Scenario:

**Initial State:**
- Paper 1.21.10 Build 52 is latest
- History file: `{"paper-1.21.10": {"build": 52}}`

**6 hours later, API check:**
- Paper API now shows Build 53 is available
- Monitor detects: `52 !== 53`

**Actions Taken:**
1. ✅ Create archived template: "Paper 1.21.10 (Build 52)"
2. ✅ Update latest template: "Paper 1.21.10 (Latest)" → Build 53
3. ✅ Update history: `{"build": 53}`
4. ✅ Save both files

**Result:**
Users now have 2 choices:
- "Paper 1.21.10 (Latest)" - Always newest (Build 53)
- "Paper 1.21.10 (Build 52)" - Stable archived version

## 📊 Supported Servers

| Server | Versions Monitored | API Source |
|--------|-------------------|------------|
| **Paper** | 1.21.10, 1.21.9, 1.21.8, 1.20.1, 1.19.4, 1.12.2, 1.8.8 | PaperMC API |
| **Velocity** | 3.4.0, 3.3.0 | PaperMC API |
| **Purpur** | 1.21.1, 1.20.1 | Purpur API |
| **Waterfall** | 1.21, 1.20 | PaperMC API |
| **Folia** | 1.21.1, 1.20.1 | PaperMC API |

## ⚙️ Configuration

Edit `template-version-monitor.js`:

```javascript
const CONFIG = {
  templatesFile: path.join(__dirname, 'expanded-templates.json'),
  checkInterval: 6 * 60 * 60 * 1000, // 6 hours (change as needed)
  versionHistoryFile: path.join(__dirname, 'template-version-history.json')
};
```

### Add More Versions to Monitor:

```javascript
const APIs = {
  paper: {
    baseUrl: 'api.papermc.io',
    path: '/v2/projects/paper',
    versions: ['1.21.10', '1.21.9', 'YOUR_NEW_VERSION'] // Add here
  }
};
```

## 📝 Logs Example

```
========================================
🔍 MCSManager Template Version Monitor
========================================

⏰ Started at: 1/15/2025, 10:30:00 AM

📦 Checking Paper versions...
   ✓ Paper 1.21.10 Build 52 (No change)
   ✓ Paper 1.20.1 Build 196 (No change)

🚀 Checking Velocity versions...
🆕 Velocity 3.4.0: Build 456 → 457
   📁 Archived: Velocity 3.4.0 Build 456

💜 Checking Purpur versions...
   ✓ Purpur 1.21.1 Build 2345 (No change)

💾 Saving updates...
✅ Templates saved
✅ Version history saved

🎉 Templates updated successfully!

📊 Total templates: 47
⏰ Next check in 6 hours

========================================
```

## 🛠️ Advanced Usage

### Run Check Immediately Then Exit
```bash
node -e "require('./template-version-monitor.js'); setTimeout(() => process.exit(0), 30000)"
```

### View Current Version History
```bash
cat template-version-history.json
```

### Check Template Count
```bash
node -e "console.log(require('./expanded-templates.json').templates.length + ' templates')"
```

## 🐛 Troubleshooting

### "Error checking Paper 1.21.10"
- Check internet connection
- Verify API is not down: https://api.papermc.io/v2/projects/paper
- Check firewall isn't blocking HTTPS requests

### Templates not updating
- Check file permissions
- Verify `expanded-templates.json` is writable
- Look for error messages in console

### Want to force re-check all versions
1. Delete `template-version-history.json`
2. Restart the monitor
3. All versions will be treated as "new"

## 📚 API Documentation

- **Paper/Velocity/Waterfall/Folia**: https://docs.papermc.io/misc/downloads-service/
- **Purpur**: https://purpurmc.org/docs/

## 🔄 Integration with MCSManager

To use these templates in MCSManager:

1. Copy `expanded-templates.json` to your web server
2. Update MCSManager config to point to your template URL
3. Or manually import templates via the admin panel

## 📅 Maintenance

- Monitor runs indefinitely (until stopped)
- No database required - just 2 JSON files
- Minimal resource usage (~5MB RAM)
- Can run alongside MCSManager or separately

## ⏹️ Stopping the Monitor

### If running in terminal:
Press `Ctrl+C`

### If running with PM2:
```bash
pm2 stop mcsm-template-monitor
```

### If running as background process:
```bash
# Find process ID
ps aux | grep template-version-monitor

# Kill process
kill <PID>
```

---

**Created**: November 18, 2025
**Version**: 1.0.0
**Author**: MCSManager Enhancement Project
