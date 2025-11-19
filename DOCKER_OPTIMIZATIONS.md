# Docker Container Optimizations & Resource Limits

This document explains what Docker optimizations ARE and ARE NOT possible in TirnueManager.

## Actually Implemented Optimizations

### 1. **Init Process (tini)** ✅ ENABLED

**What it does:**
- Enables Docker's built-in init process (`--init`)
- Properly handles signals (SIGTERM, SIGINT, etc.)
- Reaps zombie processes

**Why it matters:**
- Java/Minecraft servers sometimes spawn child processes (plugins, scripts)
- Without init, zombie processes can accumulate and waste PIDs
- Improves signal handling: SIGTERM properly stops the server
- Very low overhead (~1-3% CPU improvement from cleaner process management)

**Technical details:**
- Uses `tini` (tiny init) as PID 1 inside container
- Forwards signals to your application
- Prevents PID exhaustion from zombies

**Verdict:** ✅ Actually useful, no downsides

---

### 2. **IO Bandwidth Control (BlkioWeight)** ✅ IMPLEMENTED

**Config field:** `docker.io` (number, default: 0)

**What it does:**
- Sets relative IO priority for disk operations
- Value 0-100 maps to Docker BlkioWeight 10-1000
- Higher value = more disk bandwidth when competing with other containers

**Example:**
```json
{
  "docker": {
    "io": 50  // Weight = 500 (medium priority)
  }
}
```

**Why it matters:**
- Prevents one container from hogging all disk IO
- Fair distribution when multiple containers write simultaneously
- No impact when only one container is active

**Limitations:**
- Relative weight, NOT absolute MB/s limit
- Requires IO-aware scheduler (cfq/bfq) on host
- Only matters if you run multiple containers

**Verdict:** ✅ Useful for multi-container setups

---

## Why Other "Optimizations" DON'T Work

### ❌ Delegated Volume Mounts (NOT IMPLEMENTED)

**Why it was removed:**
- Only works on Docker Desktop (Mac/Windows)
- **Completely ignored on Linux** (where servers run)
- Mac/Windows need it because Docker runs in a VM
- Linux uses native bind mounts already (no VM overhead)

**The lie:** "10-30% faster file writes"
**The truth:** Does absolutely nothing on Linux

---

### ❌ tmpfs /tmp (NOT IMPLEMENTED)

**Why it was removed:**
- Minecraft servers with Forge/plugins can write **20+ GB** to /tmp
- Limiting /tmp to 256MB = server crashes: "No space left on device"
- Some plugins write schematic files, temp worlds, etc. to /tmp

**The lie:** "100x faster temp file operations"
**The truth:** Breaks servers that write large temp files

**Could it work?**
Maybe with a MUCH larger limit (like 4-8 GB), but then you're wasting that much RAM per container whether it's used or not.

---

### ❌ Increased Shared Memory (NOT IMPLEMENTED)

**Why it was removed:**
- Minecraft/Java servers **don't use /dev/shm**
- Java uses heap memory (-Xmx), not shared memory
- Would waste 512 MB RAM per container for no benefit

**The lie:** "5-15% faster shared memory operations"
**The truth:** Minecraft doesn't use shared memory, so this does nothing

**Could it work?**
Only if you manually configure Minecraft to use ramdisk in /dev/shm, but that requires rsync backups and is complex.

---

### ❌ Log Size Limiting (NOT IMPLEMENTED)

**Why it was removed:**
- TirnueManager already sets `AutoRemove: true`
- Container logs are deleted when container stops
- Adding LogConfig is redundant

**The lie:** "Prevents log bloat"
**The truth:** Logs already auto-delete with AutoRemove

---

### ❌ Network Bandwidth Limiting (IMPOSSIBLE)

**Why it doesn't exist:**
- Docker API **does not support network bandwidth limiting**
- Requires manual `tc` (traffic control) commands after container starts
- Or complete Docker networking reconfiguration with plugins

**Workarounds are complex:**
- Traffic control (tc): Must run after each container start
- Network plugins (Calico, Cilium): Overkill, may break existing setup
- External proxy: Only works for HTTP traffic

**Why you don't need it:**
- Game servers rarely exceed 10 Mbps even with many players
- CPU and memory limits are far more important
- Use host-level firewall/QoS if needed

---

## Actual Performance Impact

### Docker Container Protection Cost

| Configuration | Performance | Notes |
|--------------|------------|-------|
| **Native (no Docker)** | 100% | Vulnerable to plugin attacks |
| **Docker (default)** | 97-99% | Protected, minimal overhead |
| **Docker (TirnueManager)** | 97-99% | Protected + Init process |

**Key takeaway:** Docker overhead is **1-3%** regardless of "optimizations" because:
- Linux uses native container primitives (cgroups, namespaces)
- No VM layer like Mac/Windows
- Most overhead is from isolation (which you want for security)

### What Init Process Actually Does

- Slightly better signal handling
- Prevents zombie process accumulation
- Very minor CPU improvement (1-3%)
- **Does NOT** speed up file IO, networking, or gameplay

---

## Resource Limits (Control Usage)

These prevent containers from using too many resources:

### Memory Limiting ✅
```json
{
  "docker": {
    "memory": 2048,         // 2 GB RAM limit
    "memorySwap": 512,      // +512 MB swap
    "memorySwappiness": 60  // Swap aggressiveness
  }
}
```

### CPU Limiting ✅
```json
{
  "docker": {
    "cpuUsage": 50,         // 50% of one CPU core
    "cpusetCpus": "0,1"     // Pin to cores 0 and 1
  }
}
```

### IO Priority ✅
```json
{
  "docker": {
    "io": 50  // Medium priority (weight 500)
  }
}
```

---

## Summary

| Feature | Status | Benefit | Reason |
|---------|--------|---------|--------|
| Init Process | ✅ Enabled | Better signal handling | Actually works on Linux |
| IO Weight | ✅ Enabled | Fair disk bandwidth | Useful for multi-container |
| Delegated Mounts | ❌ Not implemented | None | Only works on Mac/Windows |
| tmpfs /tmp | ❌ Not implemented | Would break servers | Minecraft writes huge temp files |
| Shared Memory | ❌ Not implemented | None | Java doesn't use /dev/shm |
| Log Limiting | ❌ Not implemented | Redundant | AutoRemove already deletes logs |
| Network Bandwidth | ❌ Impossible | N/A | Docker API limitation |

**Bottom line:**
- Docker container protection costs ~1-3% performance
- Init process helps slightly with zombie processes
- IO weight helps if running multiple containers
- Everything else either doesn't work on Linux or breaks Minecraft servers

The original developers were **smart**. They didn't add fake optimizations that don't work.

---

## Testing

To verify Init is enabled:
```bash
docker inspect <container_name> | grep -i init
# Should show: "Init": true
```

To verify IO weight (if configured):
```bash
docker inspect <container_name> | grep -i blkio
# Should show: "BlkioWeight": 500
```

---

## References

- [Docker Init Process](https://docs.docker.com/engine/reference/run/#specify-an-init-process)
- [Docker Block IO](https://docs.docker.com/config/containers/resource_constraints/#block-io-bandwidth-blkio-constraint)
- [Why delegated doesn't work on Linux](https://docs.docker.com/docker-for-mac/osxfs-caching/)
- [Docker network bandwidth limitations](https://github.com/moby/moby/issues/20080)
