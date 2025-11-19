# Docker Container Resource Optimizations

This document explains the Docker resource limits implemented in TirnueManager and their limitations.

## Implemented Optimizations

### 1. **IO Bandwidth Limiting** ✅ IMPLEMENTED

**Config field:** `docker.io` (number, default: 0)

**How it works:**
- Uses Docker's `BlkioWeight` parameter for relative IO priority
- Value range: 0-100 (mapped to Docker's 10-1000 weight scale)
- Higher values = more disk read/write bandwidth allocated
- 0 = unlimited (no restriction)

**Example:**
```json
{
  "docker": {
    "io": 50
  }
}
```
This sets BlkioWeight to 500 (medium priority).

**Benefits:**
- Prevents one container from monopolizing disk IO
- Fair distribution of disk bandwidth across multiple containers
- No performance impact when only one container is doing IO

**Limitations:**
- This is a **relative weight**, not an absolute MB/s limit
- Actual bandwidth depends on:
  - Other containers running on the same host
  - Total disk performance
  - Host IO scheduler settings

**Advanced Configuration:**
For absolute MB/s limits, you need device-specific settings:
```typescript
// In future, could add:
BlkioDeviceReadBps: [{ Path: "/dev/sda", Rate: 50 * 1024 * 1024 }],  // 50 MB/s read
BlkioDeviceWriteBps: [{ Path: "/dev/sda", Rate: 50 * 1024 * 1024 }]  // 50 MB/s write
```
This requires knowing the device path, which varies by system (/dev/sda, /dev/vda, /dev/nvme0n1, etc.)

---

### 2. **Network Bandwidth Limiting** ⚠️ NOT IMPLEMENTED (Technical Limitation)

**Config field:** `docker.network` (number, default: 0)

**Why not implemented:**
Docker **does not support network bandwidth limiting** in the standard container creation API. This is a known Docker limitation.

**Workarounds (requires manual setup):**

#### Option A: Traffic Control (tc)
Requires running `tc` commands after container starts:
```bash
# Example: Limit container to 10 Mbit/s
tc qdisc add dev eth0 root tbf rate 10mbit burst 32kbit latency 400ms
```

**Challenges:**
- Requires root access on host
- Must be applied after container starts
- Complex to maintain
- Varies by network interface name

#### Option B: Docker Network Plugins
Use third-party network plugins like:
- Calico (supports bandwidth policy)
- Cilium (supports bandwidth manager)
- Custom CNI plugins

**Challenges:**
- Requires complete Docker network reconfiguration
- Overkill for simple use cases
- May conflict with existing setup

#### Option C: External Proxy/Limiter
Route traffic through a proxy with bandwidth limiting:
- Nginx with limit_rate
- Traefik with rate limiting
- External tools like wondershaper

**Challenges:**
- Only works for HTTP/S traffic
- Adds complexity
- Additional point of failure

**Recommendation:**
For most use cases, network bandwidth limiting is **not necessary** because:
1. Game servers rarely saturate network bandwidth (typically < 10 Mbps even with many players)
2. Memory and CPU limits are far more important
3. Host-level firewall rules can handle abuse

If you absolutely need network limiting:
- Use external rate limiting at the router/firewall level
- Consider using a dedicated network namespace with tc rules
- Use a VPN with bandwidth limiting

---

## Other Implemented Resource Limits

### Memory Limiting ✅
```json
{
  "docker": {
    "memory": 2048,        // 2 GB RAM limit
    "memorySwap": 512,     // +512 MB swap (total 2.5 GB)
    "memorySwappiness": 60 // Swap aggressiveness (0-100)
  }
}
```

### CPU Limiting ✅
```json
{
  "docker": {
    "cpuUsage": 50,        // 50% of one CPU core
    "cpusetCpus": "0,1"    // Pin to specific cores 0 and 1
  }
}
```

### Port Mapping ✅
```json
{
  "docker": {
    "ports": ["25565:25565/tcp", "25575:25575/tcp"]
  }
}
```

### Volume Mounts ✅
```json
{
  "docker": {
    "extraVolumes": ["/host/path|/container/path"]
  }
}
```

---

## Performance Impact Summary

| Resource Limit | Performance Impact | Recommended |
|---------------|-------------------|-------------|
| Memory | ~0% (no overhead) | ✅ Always use |
| CPU Quota | ~1-2% (scheduler overhead) | ✅ Always use |
| CPU Pinning | ~0% (can improve performance) | ✅ For production |
| IO Weight | ~1-2% (block layer overhead) | ✅ If multiple containers |
| Network Limit | N/A (not implemented) | ❌ Not available |

---

## Testing IO Limits

To verify IO limits are working:

### 1. Check container was created with limits:
```bash
docker inspect <container_name> | grep -i blkio
```

Should show:
```json
"BlkioWeight": 500
```

### 2. Stress test disk IO:
```bash
# Inside container
dd if=/dev/zero of=/tmp/test bs=1M count=1000
```

Containers with lower `io` values should have slower write speeds.

### 3. Monitor IO usage:
```bash
# On host
docker stats <container_name>
```

Shows real-time CPU, memory, network, and block IO.

---

## Troubleshooting

### IO limits not working?

**Check 1:** Ensure host uses a compatible IO scheduler:
```bash
cat /sys/block/sda/queue/scheduler
```

Should show: `[cfq]` or `[bfq]` (blk-io aware schedulers).
If it shows `[none]` or `[noop]`, IO weights won't work.

**Fix:**
```bash
echo cfq > /sys/block/sda/queue/scheduler
```

**Check 2:** Ensure cgroups v1 blkio controller is enabled:
```bash
cat /proc/cgroups | grep blkio
```

Should show: `blkio 1 X 1`

If using cgroups v2, IO limiting works differently (uses io.weight instead of blkio.weight).

---

## Future Enhancements

Potential improvements:

1. **Absolute IO Limits:**
   - Auto-detect root device path
   - Add UI for device-specific IO limits
   - Support both read and write limits separately

2. **Network Limiting:**
   - Integrate tc (traffic control) commands
   - Add post-start hook for tc setup
   - Provide simple UI for bandwidth caps

3. **Disk Space Quotas:**
   - Currently `maxSpace` is defined but not enforced
   - Could use Docker storage driver quotas
   - Add automatic cleanup when approaching limit

4. **Priority Classes:**
   - Presets like "low", "normal", "high" priority
   - Automatically set CPU, memory, and IO based on class
   - Easier for admins than configuring individual limits

---

## References

- [Docker Resource Constraints](https://docs.docker.com/config/containers/resource_constraints/)
- [Docker Block IO](https://docs.docker.com/engine/reference/run/#block-io-bandwidth-blkio-constraint)
- [Linux cgroups blkio controller](https://www.kernel.org/doc/Documentation/cgroup-v1/blkio-controller.txt)
- [Why Docker doesn't support network bandwidth limiting](https://github.com/moby/moby/issues/20080)
