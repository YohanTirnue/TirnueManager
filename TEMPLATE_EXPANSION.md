# MCSManager Template Expansion Guide

## Overview
This document outlines the expansion of MCSManager's server template marketplace to include comprehensive support for all major Minecraft server platforms and versions.

## New Server Templates to Add

### 1. Velocity Proxy Servers
**Platform**: Velocity
**Official Source**: https://papermc.io/downloads/velocity
**Latest Version**: 3.4.0 (March 2025)
**Supported MC Versions**: 1.7 - 1.21.8+

**Templates to Add**:
- Velocity Latest (3.4.0)
- Velocity 3.3.0
- Velocity 3.2.0

**Download URLs**:
```
Latest: https://api.papermc.io/v2/projects/velocity/versions/latest/builds/latest/downloads/velocity-{version}-{build}.jar
```

---

### 2. Bedrock Dedicated Server (BDS)
**Platform**: Bedrock
**Official Source**: https://www.minecraft.net/en-us/download/server/bedrock
**Supported Versions**: All current Bedrock releases

**Templates to Add**:
- Bedrock Dedicated Server Latest
- Bedrock Dedicated Server 1.21.x
- Bedrock Dedicated Server 1.20.x

**Download URLs**:
```
Windows: https://minecraft.azureedge.net/bin-win/bedrock-server-{version}.zip
Linux: https://minecraft.azureedge.net/bin-linux/bedrock-server-{version}.zip
```

---

### 3. Fabric Server
**Platform**: Fabric
**Official Source**: https://fabricmc.net/use/server/
**Supported MC Versions**: 1.14+ to latest

**Templates to Add**:
- Fabric 1.21.10 (Latest)
- Fabric 1.21.9
- Fabric 1.21.5
- Fabric 1.21.4
- Fabric 1.20.1

**Requirements**:
- Java 21 (for MC 1.20.5+)
- Java 17 (for MC 1.17-1.20.4)
- Fabric API (mod requirement)

**Download URLs**:
```
Fabric Installer: https://maven.fabricmc.net/net/fabricmc/fabric-installer/{version}/fabric-installer-{version}.jar
Server Launcher: https://meta.fabricmc.net/v2/versions/loader/{mc-version}/{loader-version}/{installer-version}/server/jar
```

---

### 4. Geyser + Floodgate (Cross-play support)
**Platform**: Hybrid (Bedrock + Java)
**Official Source**: https://geysermc.org/download/

**Templates to Add**:
- Paper + Geyser + Floodgate
- Velocity + Geyser
- Fabric + Geyser + Floodgate
- Standalone Geyser Proxy

**Supported Versions**:
- Bedrock: 1.21.90 - 1.21.120
- Java: 1.21.9 - 1.21.10

**Download URLs**:
```
Geyser-Spigot: https://download.geysermc.org/v2/projects/geyser/versions/latest/builds/latest/downloads/spigot
Geyser-Velocity: https://download.geysermc.org/v2/projects/geyser/versions/latest/builds/latest/downloads/velocity
Geyser-Fabric: https://download.geysermc.org/v2/projects/geyser/versions/latest/builds/latest/downloads/fabric
Floodgate-Spigot: https://download.geysermc.org/v2/projects/floodgate/versions/latest/builds/latest/downloads/spigot
```

---

### 5. Expanded Paper Templates
**Platform**: Paper
**Official Source**: https://papermc.io/downloads/paper

**Additional Templates to Add**:
- Paper 1.21.10 (Latest)
- Paper 1.21.9
- Paper 1.21.8
- Paper 1.21.5
- Paper 1.21.4
- Paper 1.20.6
- Paper 1.20.4
- Paper 1.20.1
- Paper 1.19.4
- Paper 1.18.2
- Paper 1.16.5
- Paper 1.12.2
- Paper 1.8.8

**API Endpoint**:
```
https://api.papermc.io/v2/projects/paper/versions/{version}/builds/latest/downloads/paper-{version}-{build}.jar
```

---

### 6. Purpur Server
**Platform**: Purpur (Paper fork)
**Official Source**: https://purpurmc.org/downloads

**Templates to Add**:
- Purpur Latest
- Purpur 1.21.x
- Purpur 1.20.x

**Download URLs**:
```
https://api.purpurmc.org/v2/purpur/{version}/latest/download
```

---

### 7. Forge Server
**Platform**: Forge
**Official Source**: https://files.minecraftforge.net/

**Templates to Add**:
- Forge 1.21.x
- Forge 1.20.1
- Forge 1.19.2
- Forge 1.18.2
- Forge 1.16.5
- Forge 1.12.2

---

### 8. NeoForge Server
**Platform**: NeoForge (Forge successor)
**Official Source**: https://neoforged.net/

**Templates to Add**:
- NeoForge 1.21.x
- NeoForge 1.20.x

---

### 9. Waterfall Proxy
**Platform**: Waterfall (BungeeCord fork)
**Official Source**: https://papermc.io/downloads/waterfall

**Templates to Add**:
- Waterfall Latest
- Waterfall 1.20
- Waterfall 1.19

**Download URLs**:
```
https://api.papermc.io/v2/projects/waterfall/versions/{version}/builds/latest/downloads/waterfall-{version}-{build}.jar
```

---

### 10. Folia Server
**Platform**: Folia (Paper fork - multithreaded)
**Official Source**: https://papermc.io/downloads/folia

**Templates to Add**:
- Folia Latest (1.21.x)
- Folia 1.20.x

**Download URLs**:
```
https://api.papermc.io/v2/projects/folia/versions/{version}/builds/latest/downloads/folia-{version}-{build}.jar
```

---

## Template JSON Structure Example

```json
{
  "title": "Velocity Proxy Latest",
  "description": "Modern, high-performance Minecraft proxy. Supports 1.7-1.21.8+",
  "gameType": "Minecraft",
  "category": "Proxy",
  "platform": "All",
  "language": "en_us",
  "targetLink": "https://api.papermc.io/v2/projects/velocity/versions/3.4.0/builds/latest/downloads/velocity-3.4.0.jar",
  "image": "/assets/velocity-logo.png",
  "tags": ["Proxy", "High-Performance", "Latest"],
  "runtime": "Java 17+",
  "hardware": "512MB+ RAM",
  "size": "~10MB",
  "author": "PaperMC Team",
  "setupInfo": {
    "docker": false,
    "installCommand": "java -Xms512M -Xmx512M -XX:+UseG1GC -XX:G1HeapRegionSize=4M -XX:+UnlockExperimentalVMOptions -XX:+ParallelRefProcEnabled -XX:+AlwaysPreTouch -jar velocity.jar",
    "ports": [25577],
    "requiredFiles": ["velocity.toml"]
  }
}
```

---

## UI Improvements Completed

### Modern Gold/Orange Theme Applied
✅ Updated `AppPackages.vue` with:
- Modern card styling with rounded corners (12px)
- Gold/orange gradient accents (#FF8C42, #D4AF37)
- Improved shadows and hover effects
- Larger image heights (200px → 240px for categories)
- Gold gradient text for titles
- Modern filter dropdowns with gold focus states
- Pulsing gold glow animation on download buttons

✅ Updated `Market.vue` with:
- Gold/orange themed installation cards
- Gradient text for card titles
- Enhanced hover states with gold borders
- Larger background icons with gold tint on hover
- Smooth transitions and animations

### Key Visual Improvements
- **Card Heights**: Increased from 160px to 200px (templates), 240px (categories)
- **Border Radius**: Modernized to 12px from 8px
- **Color Scheme**: Blue theme replaced with gold/orange gradients
- **Typography**: Gradient text effects on titles
- **Shadows**: Layered shadows with gold tint
- **Animations**: Smooth cubic-bezier transitions
- **Buttons**: Gold gradient backgrounds with glow effects

---

## Next Steps for Full Implementation

1. **Create Template Images**
   - Design server type logos/banners
   - Optimal size: 800x450px
   - Save in `/frontend/public/assets/`

2. **Update Templates JSON**
   - Add all new server types to MCSManager/Script repository
   - Test download URLs
   - Verify platform compatibility

3. **Create Setup Scripts**
   - Add installation scripts for each platform
   - Include auto-configuration options
   - Add dependency checks (Java versions, etc.)

4. **Testing**
   - Test each template download and installation
   - Verify cross-platform compatibility
   - Test Geyser/Floodgate cross-play functionality

5. **Documentation**
   - Update user guides for new server types
   - Add troubleshooting sections
   - Create video tutorials

---

## References
- Paper API Docs: https://docs.papermc.io/misc/downloads-service/
- Velocity Docs: https://docs.papermc.io/velocity
- Fabric Wiki: https://fabricmc.net/wiki/
- GeyserMC Docs: https://geysermc.org/wiki/
- Bedrock Server: https://www.minecraft.net/en-us/download/server/bedrock
- Purpur Docs: https://purpurmc.org/docs/
- Folia Docs: https://docs.papermc.io/folia

---

*Last Updated: November 18, 2025*
