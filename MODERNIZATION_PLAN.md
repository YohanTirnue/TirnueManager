# MCSManager UI Modernization Plan

**Date:** November 18, 2025
**Objective:** Comprehensive UI modernization with improved statistics, better space utilization, modern daemon management, and enhanced marketplace functionality

---

## 📋 Table of Contents

1. [Sidebar Navigation Updates](#1-sidebar-navigation-updates)
2. [Stats Page Modernization](#2-stats-page-modernization)
3. [Daemon Page UI Improvements](#3-daemon-page-ui-improvements)
4. [Marketplace Search Function](#4-marketplace-search-function)
5. [Space Utilization Improvements](#5-space-utilization-improvements)
6. [Performance Optimizations](#6-performance-optimizations)
7. [Implementation Order](#7-implementation-order)
8. [Build & Deployment Commands](#8-build--deployment-commands)

---

## 1. Sidebar Navigation Updates

### Current State
- Menu item: "Overview" with DashboardOutlined icon
- Location: `AppSidebar.vue:274`

### Changes Required

#### 1.1 Rename "Overview" → "Stats"
**File:** `/frontend/src/components/AppSidebar.vue`

**Change:**
```typescript
// OLD
{
  title: "Overview",
  icon: DashboardOutlined,
  path: "/overview"
}

// NEW
{
  title: "Stats",
  icon: LineChartOutlined, // More appropriate for statistics
  path: "/stats"  // Consider keeping /overview for backward compat OR redirect
}
```

#### 1.2 Update Router Configuration
**File:** `/frontend/src/config/router.ts`

```typescript
{
  path: "/stats",  // New path
  name: "Stats",
  component: () => import("@/views/LayoutContainer.vue"),
  meta: {
    permission: 10, // ADMIN
    mainMenu: true,
    breadcrumbs: [{ name: "Stats", path: "/stats" }]
  }
}

// Add redirect for backward compatibility
{
  path: "/overview",
  redirect: "/stats"
}
```

#### 1.3 Update i18n Translations
Add translation keys for "Stats" across all supported languages

**Impact:** Low risk, simple rename with redirect fallback

---

## 2. Stats Page Modernization

### Current State
**File:** `/frontend/src/widgets/PanelOverview.vue`

**Current Metrics Displayed:**
- Node version
- MCSManager version
- Daemon version
- Username
- Server time
- Client time
- Banned IPs
- Illegal access count
- Memory usage
- Load average
- Process memory
- Hostname
- OS version
- Platform/architecture

**Issues:**
- Static data cards only
- No visual charts/graphs
- No real-time updates
- Limited actionable insights
- Poor use of space (4-column grid)

### Modernization Plan

#### 2.1 New Stats Dashboard Layout

**Grid Structure:** 3-column responsive layout
```
┌─────────────────────────────────────────────────────┐
│  Quick Stats Row (4 cards)                         │
│  [Instances] [Nodes] [CPU Usage] [Memory]          │
├─────────────────────────────────────────────────────┤
│  Real-time Charts (2 charts)                       │
│  [CPU/Memory Timeline─────] [Network I/O────]      │
├─────────────────────────────────────────────────────┤
│  System Health (3 metrics)                         │
│  [Disk Usage] [Uptime] [Load Avg]                  │
├─────────────────────────────────────────────────────┤
│  Recent Activity (1 widget)                        │
│  [Activity Log with filters and search]            │
└─────────────────────────────────────────────────────┘
```

#### 2.2 New Statistics to Add

**Real-time Metrics:**
1. **Total Instances** (running/stopped/total)
2. **Total Nodes** (online/offline)
3. **Total Users** (active today/total)
4. **System Resources**:
   - CPU usage % (real-time graph)
   - Memory usage % (real-time graph)
   - Disk I/O (read/write MB/s)
   - Network I/O (in/out MB/s)

**System Health:**
5. **Disk Space** (used/total per partition)
6. **System Uptime** (formatted duration)
7. **Process Count** (total running processes)
8. **Swap Usage** (if applicable)

**Performance Metrics:**
9. **API Response Time** (average last hour)
10. **WebSocket Connections** (active)
11. **Database Queries/sec** (if applicable)
12. **Cache Hit Rate** (if using cache)

**Activity Metrics:**
13. **Recent Instance Actions** (start/stop/restart counts last 24h)
14. **User Login History** (last 10 logins)
15. **Bandwidth Usage** (last 7 days chart)
16. **Error Rate** (errors/hour)

#### 2.3 Component Structure

**New Files to Create:**
```
/frontend/src/widgets/stats/
├── StatsOverview.vue          # Main stats page (replaces PanelOverview)
├── QuickStatsCard.vue         # Compact stat card with icon
├── RealtimeChart.vue          # Line chart with live updates
├── SystemHealthCard.vue       # Health indicator cards
├── ActivityTimeline.vue       # Recent activity log
├── ResourceGauge.vue          # Circular progress gauge
└── StatsTrendCard.vue         # Card showing trend (↑/↓)
```

**Libraries to Use:**
- **Charts:** Apache ECharts (already available) or Chart.js
- **Animations:** CSS transitions + `will-change`
- **Updates:** WebSocket for real-time data OR polling every 5s

#### 2.4 Implementation Details

**StatsOverview.vue** (Main Component):
```vue
<template>
  <div class="stats-dashboard">
    <!-- Quick Stats Row -->
    <a-row :gutter="[16, 16]" class="quick-stats">
      <a-col :xs="24" :sm="12" :md="6">
        <QuickStatsCard
          title="Total Instances"
          :value="stats.instances.total"
          :trend="stats.instances.trend"
          :subtitle="`${stats.instances.running} running`"
          icon="AppstoreOutlined"
          color="#FF8C42"
        />
      </a-col>
      <!-- ... 3 more QuickStatsCards ... -->
    </a-row>

    <!-- Real-time Charts -->
    <a-row :gutter="[16, 16]" class="charts-row">
      <a-col :xs="24" :lg="12">
        <RealtimeChart
          title="CPU & Memory Usage"
          :data="cpuMemoryData"
          :refresh-interval="5000"
        />
      </a-col>
      <a-col :xs="24" :lg="12">
        <RealtimeChart
          title="Network I/O"
          :data="networkData"
          :refresh-interval="5000"
        />
      </a-col>
    </a-row>

    <!-- System Health -->
    <a-row :gutter="[16, 16]" class="health-row">
      <a-col :xs="24" :sm="8">
        <ResourceGauge
          title="Disk Usage"
          :value="stats.disk.used"
          :max="stats.disk.total"
          unit="GB"
        />
      </a-col>
      <!-- ... 2 more gauges ... -->
    </a-row>

    <!-- Activity Timeline -->
    <a-row :gutter="[16, 16]">
      <a-col :span="24">
        <ActivityTimeline
          :activities="recentActivities"
          :max-items="20"
        />
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useStatsData } from '@/hooks/useStatsData';

const { stats, cpuMemoryData, networkData, recentActivities, startPolling, stopPolling } = useStatsData();

onMounted(() => {
  startPolling(5000); // Poll every 5 seconds
});

onUnmounted(() => {
  stopPolling();
});
</script>
```

**QuickStatsCard.vue:**
```vue
<template>
  <CardPanel class="quick-stat-card">
    <div class="stat-content">
      <div class="stat-icon" :style="{ color: color }">
        <component :is="icon" />
      </div>
      <div class="stat-details">
        <div class="stat-title">{{ title }}</div>
        <div class="stat-value">
          {{ value }}
          <span v-if="trend" class="stat-trend" :class="trend > 0 ? 'up' : 'down'">
            <ArrowUpOutlined v-if="trend > 0" />
            <ArrowDownOutlined v-else />
            {{ Math.abs(trend) }}%
          </span>
        </div>
        <div class="stat-subtitle">{{ subtitle }}</div>
      </div>
    </div>
  </CardPanel>
</template>

<style lang="scss" scoped>
.quick-stat-card {
  background: linear-gradient(135deg, rgba(255, 140, 66, 0.03), rgba(212, 175, 55, 0.03));
  border: 2px solid rgba(255, 140, 66, 0.15);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(255, 140, 66, 0.4);
    box-shadow: 0 8px 20px rgba(255, 140, 66, 0.2);
  }
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  font-size: 48px;
  opacity: 0.8;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, #FF8C42, #D4AF37);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.stat-trend {
  font-size: 14px;
  margin-left: 8px;

  &.up { color: #52c41a; }
  &.down { color: #ff4d4f; }
}
</style>
```

#### 2.5 API Endpoints Needed

**New Backend Endpoints:**
```
GET /api/stats/realtime
Response: {
  cpu: { usage: 45.2, history: [42, 43, 45, ...] },
  memory: { used: 8.2, total: 16, history: [...] },
  disk: { used: 120, total: 500 },
  network: { in: 12.5, out: 8.3, history: [...] },
  instances: { running: 45, stopped: 12, total: 57, trend: 8 },
  nodes: { online: 3, offline: 1 },
  uptime: 345600,
  loadAvg: [1.2, 1.5, 1.3]
}

GET /api/stats/activity
Response: [
  { time: "2025-11-18T10:30:00Z", user: "admin", action: "start_instance", target: "minecraft-server-1" },
  ...
]
```

**Performance Optimization:**
- Cache stats data server-side (5-second cache)
- Use WebSocket for push updates instead of polling
- Lazy load chart data (only fetch when visible)

---

## 3. Daemon Page UI Improvements

### Current State
**File:** `/frontend/src/widgets/NodeList.vue`

**Current Features:**
- Basic list/card view of daemons
- Search by name
- Add daemon button
- Node status indicator

**Issues:**
- Plain design, no modern styling
- Limited information displayed
- No quick actions on cards
- No resource visualization
- Poor spacing

### Modernization Plan

#### 3.1 New Daemon Card Design

**Visual Mockup:**
```
┌─────────────────────────────────────────┐
│ 🟢 Node Name              [⚙️ ⋮]        │
│ 192.168.1.100:24444                     │
├─────────────────────────────────────────┤
│ CPU    ████████░░ 80%                   │
│ Memory ██████░░░░ 60%                   │
│ Disk   ███░░░░░░░ 30%                   │
├─────────────────────────────────────────┤
│ 12 Instances · 256ms Ping · v3.8.0      │
│ [View] [Instances] [Terminal] [Remove]  │
└─────────────────────────────────────────┘
```

#### 3.2 Enhanced Features

**Add to Each Daemon Card:**
1. **Real-time Status Indicator**
   - Green dot (Online, <500ms ping)
   - Yellow dot (Slow, 500-2000ms)
   - Red dot (Offline/Error)

2. **Resource Progress Bars**
   - CPU usage with gradient color (green→yellow→red)
   - Memory usage
   - Disk usage

3. **Quick Stats**
   - Instance count (running/total)
   - Ping latency
   - Daemon version
   - Last seen timestamp

4. **Quick Actions Menu**
   - View Details
   - View Instances
   - Open Terminal
   - Restart Daemon
   - Remove Node
   - Edit Config

5. **Hover Effects**
   - Lift animation
   - Glow border (gold theme)
   - Show more details on hover

#### 3.3 Component Structure

**Files to Modify:**
```
/frontend/src/widgets/NodeList.vue        # Update to use new NodeCard
/frontend/src/widgets/node/NodeItem.vue   # Modernize card component
/frontend/src/widgets/node/NodeDetailDialog.vue  # Enhanced details modal
```

**New Components:**
```
/frontend/src/components/ResourceProgressBar.vue  # Reusable progress bar
/frontend/src/components/StatusDot.vue           # Status indicator
```

#### 3.4 Implementation

**NodeItem.vue (Modernized):**
```vue
<template>
  <CardPanel class="daemon-card" @click="handleCardClick">
    <!-- Header -->
    <template #title>
      <div class="daemon-header">
        <StatusDot :status="nodeStatus" />
        <span class="daemon-name">{{ node.name || node.ip }}</span>
        <a-dropdown :trigger="['click']">
          <MoreOutlined class="actions-menu" @click.stop />
          <template #overlay>
            <a-menu>
              <a-menu-item @click="viewDetails">View Details</a-menu-item>
              <a-menu-item @click="viewInstances">View Instances</a-menu-item>
              <a-menu-item @click="openTerminal">Open Terminal</a-menu-item>
              <a-menu-divider />
              <a-menu-item danger @click="removeNode">Remove</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
      <div class="daemon-address">{{ node.ip }}:{{ node.port }}</div>
    </template>

    <!-- Body -->
    <template #body>
      <div class="daemon-resources">
        <ResourceProgressBar
          label="CPU"
          :value="node.systemInfo?.cpuUsage || 0"
          :max="100"
          unit="%"
          color="#FF8C42"
        />
        <ResourceProgressBar
          label="Memory"
          :value="memoryUsedGB"
          :max="memoryTotalGB"
          unit="GB"
          color="#D4AF37"
        />
        <ResourceProgressBar
          label="Disk"
          :value="diskUsedGB"
          :max="diskTotalGB"
          unit="GB"
          color="#52c41a"
        />
      </div>

      <div class="daemon-footer">
        <span class="daemon-stat">
          <AppstoreOutlined /> {{ instanceCount }} Instances
        </span>
        <span class="daemon-stat">
          <ClockCircleOutlined /> {{ ping }}ms
        </span>
        <span class="daemon-stat">
          <CodeOutlined /> v{{ node.version }}
        </span>
      </div>

      <div class="daemon-actions">
        <a-button size="small" @click.stop="viewDetails">
          <EyeOutlined /> View
        </a-button>
        <a-button size="small" @click.stop="viewInstances">
          <AppstoreOutlined /> Instances
        </a-button>
        <a-button size="small" @click.stop="openTerminal">
          <CodeOutlined /> Terminal
        </a-button>
      </div>
    </template>
  </CardPanel>
</template>

<style lang="scss" scoped>
.daemon-card {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid transparent;

  &:hover {
    transform: translateY(-6px);
    border-color: rgba(255, 140, 66, 0.4);
    box-shadow: 0 12px 28px rgba(255, 140, 66, 0.25);
  }
}

.daemon-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.daemon-name {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  background: linear-gradient(135deg, #FF8C42, #D4AF37);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.daemon-address {
  color: var(--color-gray-8);
  font-size: 13px;
  margin-top: 4px;
}

.daemon-resources {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 16px 0;
}

.daemon-footer {
  display: flex;
  gap: 16px;
  margin: 12px 0;
  padding-top: 12px;
  border-top: 1px solid var(--card-border-color);
}

.daemon-stat {
  font-size: 12px;
  color: var(--color-gray-8);
  display: flex;
  align-items: center;
  gap: 4px;
}

.daemon-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;

  .ant-btn {
    flex: 1;
    border-radius: 8px;
    border: 2px solid rgba(255, 140, 66, 0.3);
    color: #FF8C42;

    &:hover {
      background: rgba(255, 140, 66, 0.1);
      border-color: #FF8C42;
    }
  }
}
</style>
```

**ResourceProgressBar.vue:**
```vue
<template>
  <div class="resource-bar">
    <div class="resource-label">
      <span>{{ label }}</span>
      <span class="resource-value">{{ displayValue }}</span>
    </div>
    <div class="progress-track">
      <div
        class="progress-fill"
        :style="{ width: percentage + '%', background: gradientColor }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
}>();

const percentage = computed(() => Math.min((props.value / props.max) * 100, 100));
const displayValue = computed(() => `${props.value.toFixed(1)}${props.unit} / ${props.max}${props.unit}`);

const gradientColor = computed(() => {
  const pct = percentage.value;
  if (pct < 50) return `linear-gradient(90deg, #52c41a, ${props.color})`;
  if (pct < 80) return `linear-gradient(90deg, ${props.color}, #faad14)`;
  return `linear-gradient(90deg, #faad14, #ff4d4f)`;
});
</script>

<style lang="scss" scoped>
.resource-bar {
  width: 100%;
}

.resource-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 6px;
}

.resource-value {
  font-weight: 600;
  color: var(--color-gray-10);
}

.progress-track {
  width: 100%;
  height: 8px;
  background: var(--color-gray-3);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease, background 0.3s ease;
}
</style>
```

#### 3.5 Node List Page Improvements

**NodeList.vue Updates:**

1. **Add View Toggle**
   - Grid view (cards) - Default
   - List view (table)
   - Compact view (mini cards)

2. **Add Filters**
   - Status filter (Online/Offline/All)
   - Version filter
   - Resource usage filter (High CPU/Memory)

3. **Add Sorting**
   - By name
   - By instance count
   - By resource usage
   - By ping latency

4. **Add Batch Operations**
   - Select multiple nodes
   - Batch restart
   - Batch update
   - Export node config

5. **Improve Layout**
   - Better use of horizontal space
   - Responsive grid (4 cols desktop, 2 tablet, 1 mobile)
   - Sticky header with filters

---

## 4. Marketplace Search Function

### Current State
**File:** `/frontend/src/widgets/setupApp/AppPackages.vue`

**Current Features:**
- Filter by language
- Filter by game type
- Filter by platform
- Filter by category
- Reset filters button
- Pagination (24 per page) ✅ Already optimized

**Missing:**
- No keyword search
- No tag search
- No sorting options

### Implementation Plan

#### 4.1 Search Bar Component

**Add to AppPackages.vue:**
```vue
<!-- Search Section (before filters) -->
<a-row :gutter="[16, 16]">
  <a-col :span="24">
    <a-input-search
      v-model:value="searchQuery"
      size="large"
      placeholder="Search templates by name, description, or tags..."
      :allow-clear="true"
      @search="handleSearch"
      @change="handleSearchChange"
    >
      <template #prefix>
        <SearchOutlined style="color: #FF8C42" />
      </template>
      <template #enterButton>
        <a-button type="primary" style="background: linear-gradient(135deg, #FF8C42, #FF6B35)">
          Search
        </a-button>
      </template>
    </a-input-search>
  </a-col>
</a-row>

<!-- Sort Options (next to filters) -->
<a-col :span="24" :md="6">
  <a-select
    v-model:value="sortBy"
    style="width: 100%"
    placeholder="Sort by..."
    @change="handleSortChange"
  >
    <a-select-option value="relevance">Relevance</a-select-option>
    <a-select-option value="name-asc">Name (A-Z)</a-select-option>
    <a-select-option value="name-desc">Name (Z-A)</a-select-option>
    <a-select-option value="popular">Most Popular</a-select-option>
    <a-select-option value="newest">Newest First</a-select-option>
  </a-select>
</a-col>
```

#### 4.2 Search Logic

**Add to AppPackages.vue `<script>`:**
```typescript
const searchQuery = ref('');
const sortBy = ref('relevance');

// Enhanced filter function with search
const getFilteredPackages = (): QuickStartPackages[] => {
  if (!presetList.value?.packages) return [];

  let filtered = presetList.value.packages.filter((item) => {
    // Existing filters...
    if (props.onlyDockerTemplate && !item.setupInfo?.docker) return false;
    if (!matchesLanguageFilter(item)) return false;
    if (!matchesGameTypeFilter(item)) return false;
    if (!matchesCategoryFilter(item)) return false;
    if (!matchesPlatformFilter(item)) return false;

    // NEW: Search filter
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase();
      const matchesTitle = item.title.toLowerCase().includes(query);
      const matchesDescription = item.description?.toLowerCase().includes(query);
      const matchesTags = item.tags?.some(tag => tag.toLowerCase().includes(query));

      if (!matchesTitle && !matchesDescription && !matchesTags) {
        return false;
      }
    }

    return true;
  });

  // NEW: Sorting
  filtered = sortPackages(filtered, sortBy.value);

  return filtered;
};

// Sort function
const sortPackages = (packages: QuickStartPackages[], sortType: string): QuickStartPackages[] => {
  const sorted = [...packages];

  switch (sortType) {
    case 'name-asc':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'name-desc':
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
    case 'popular':
      // Sort by popularity (if available in data)
      return sorted.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    case 'newest':
      // Sort by date (if available)
      return sorted.sort((a, b) => {
        const dateA = new Date(a.created || 0).getTime();
        const dateB = new Date(b.created || 0).getTime();
        return dateB - dateA;
      });
    case 'relevance':
    default:
      // If searching, sort by relevance score
      if (searchQuery.value.trim()) {
        return sortByRelevance(sorted, searchQuery.value);
      }
      return sorted;
  }
};

// Relevance scoring for search
const sortByRelevance = (packages: QuickStartPackages[], query: string): QuickStartPackages[] => {
  const q = query.toLowerCase();

  return packages.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    // Title exact match = 100 points
    if (a.title.toLowerCase() === q) scoreA += 100;
    if (b.title.toLowerCase() === q) scoreB += 100;

    // Title starts with = 50 points
    if (a.title.toLowerCase().startsWith(q)) scoreA += 50;
    if (b.title.toLowerCase().startsWith(q)) scoreB += 50;

    // Title contains = 25 points
    if (a.title.toLowerCase().includes(q)) scoreA += 25;
    if (b.title.toLowerCase().includes(q)) scoreB += 25;

    // Tag exact match = 75 points
    if (a.tags?.some(t => t.toLowerCase() === q)) scoreA += 75;
    if (b.tags?.some(t => t.toLowerCase() === q)) scoreB += 75;

    // Description contains = 10 points
    if (a.description?.toLowerCase().includes(q)) scoreA += 10;
    if (b.description?.toLowerCase().includes(q)) scoreB += 10;

    return scoreB - scoreA;
  });
};

const handleSearch = () => {
  currentPage.value = 1; // Reset to first page
  // Filtering happens automatically via computed property
};

const handleSearchChange = (e: Event) => {
  // Debounce search for performance
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    handleSearch();
  }, 300);
};

const handleSortChange = () => {
  currentPage.value = 1;
};
```

#### 4.3 Search Highlights

**Highlight matching text in results:**
```vue
<template>
  <a-typography-title :level="5">
    <span v-html="highlightText(item.title, searchQuery)"></span>
  </a-typography-title>
  <p v-html="highlightText(item.description, searchQuery)"></p>
</template>

<script>
const highlightText = (text: string, query: string): string => {
  if (!query.trim() || !text) return text;

  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark style="background: #FFF3CD; padding: 0 2px;">$1</mark>');
};
</script>
```

#### 4.4 Search Analytics (Optional)

**Track popular searches:**
```typescript
const trackSearch = (query: string, resultsCount: number) => {
  // Send to analytics endpoint
  fetch('/api/analytics/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, resultsCount, timestamp: Date.now() })
  });
};
```

---

## 5. Space Utilization Improvements

### Current Issues
- Cards have excessive padding/margins
- Sidebar takes fixed 260px (collapsed 70px)
- Content area doesn't expand to fill available space
- Large gaps between elements
- Wasted vertical space

### Improvements

#### 5.1 Sidebar Optimization

**File:** `/frontend/src/components/AppSidebar.vue`

**Changes:**
```scss
// Current
.sidebar {
  width: 260px; // Expanded
  width: 70px;  // Collapsed
}

// New
.sidebar {
  width: 240px;     // Expanded (save 20px)
  width: 60px;      // Collapsed (save 10px)
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

// Auto-collapse on medium screens
@media (max-width: 1200px) {
  .sidebar {
    width: 60px; // Auto-collapse for more content space
  }
}
```

#### 5.2 Card Padding Optimization

**File:** `/frontend/src/components/CardPanel.vue`

```scss
// Current
.card-panel {
  padding: 24px;
  margin-bottom: 24px;
}

// New
.card-panel {
  padding: 16px;           // Reduced from 24px
  margin-bottom: 16px;     // Reduced from 24px

  @media (min-width: 1400px) {
    padding: 20px;         // Slightly more on larger screens
  }
}
```

#### 5.3 Content Area Expansion

**File:** `/frontend/src/App.vue`

```scss
.main-content-wrapper {
  // Current
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;

  // New
  width: 100%;
  max-width: none;         // Remove max-width restriction
  padding: 16px;
  margin: 0;

  @media (min-width: 1920px) {
    max-width: 1800px;     // Limit on very large screens
    margin: 0 auto;        // Center on ultra-wide
  }
}
```

#### 5.4 Grid Gutter Optimization

**All grid layouts:**
```vue
<!-- Old -->
<a-row :gutter="[24, 24]">

<!-- New -->
<a-row :gutter="[12, 12]">  <!-- Tighter spacing -->
```

#### 5.5 Full-Height Layouts

**Stats/Dashboard pages:**
```scss
.stats-dashboard {
  height: calc(100vh - 140px); // Full viewport height minus header/footer
  overflow-y: auto;
  padding: 16px;

  .quick-stats,
  .charts-row,
  .health-row {
    margin-bottom: 16px; // Consistent spacing
  }
}
```

#### 5.6 Responsive Breakpoints

**Optimize for all screen sizes:**
```scss
// Extra small (mobile)
@media (max-width: 576px) {
  .card-panel { padding: 12px; }
  .ant-row { gutter: [8, 8]; }
}

// Small (tablet)
@media (min-width: 577px) and (max-width: 992px) {
  .sidebar { width: 60px; } // Auto-collapse
  .card-panel { padding: 14px; }
}

// Medium (laptop)
@media (min-width: 993px) and (max-width: 1400px) {
  .main-content-wrapper { padding: 16px; }
}

// Large (desktop)
@media (min-width: 1401px) {
  .main-content-wrapper { padding: 20px; max-width: 1600px; }
}

// Extra large (4K)
@media (min-width: 1920px) {
  .main-content-wrapper { padding: 24px; max-width: 1800px; }
}
```

---

## 6. Performance Optimizations

### 6.1 Component Lazy Loading

**Update router.ts:**
```typescript
// Use dynamic imports for all routes
{
  path: "/stats",
  component: () => import("@/widgets/stats/StatsOverview.vue"), // Lazy load
  meta: { ... }
}
```

### 6.2 Virtual Scrolling for Lists

**For node list and instance list:**
```bash
npm install vue-virtual-scroller
```

```vue
<template>
  <RecycleScroller
    :items="nodeList"
    :item-size="180"
    key-field="id"
    v-slot="{ item }"
  >
    <NodeItem :node="item" />
  </RecycleScroller>
</template>
```

### 6.3 Debounced Search

**Already included in marketplace search implementation**

### 6.4 Image Optimization

**Use lazy loading for all template images:**
```vue
<img :src="item.image" loading="lazy" decoding="async" />
```

**Add loading placeholder:**
```vue
<img
  :src="item.image"
  loading="lazy"
  @error="handleImageError"
  @load="handleImageLoad"
/>

<script>
const handleImageError = (e) => {
  e.target.src = '/assets/placeholder.png'; // Fallback
};
</script>
```

### 6.5 API Response Caching

**Implement client-side caching:**
```typescript
// Cache stats for 5 seconds
const statsCache = {
  data: null,
  timestamp: 0,
  ttl: 5000 // 5 seconds
};

const fetchStats = async () => {
  const now = Date.now();
  if (statsCache.data && (now - statsCache.timestamp) < statsCache.ttl) {
    return statsCache.data; // Return cached
  }

  const data = await api.getStats();
  statsCache.data = data;
  statsCache.timestamp = now;
  return data;
};
```

### 6.6 Code Splitting

**Split large components:**
```typescript
// Instead of importing all icons
import { AppstoreOutlined } from '@ant-design/icons-vue';

// Use dynamic imports
const AppstoreOutlined = defineAsyncComponent(() =>
  import('@ant-design/icons-vue/AppstoreOutlined')
);
```

---

## 7. Implementation Order

### Phase 1: Foundation (Week 1)
1. ✅ Marketplace optimizations (already done)
2. Update sidebar navigation (Overview → Stats)
3. Create new Stats page structure
4. Implement space utilization improvements

### Phase 2: Stats Page (Week 2)
1. Create QuickStatsCard component
2. Create RealtimeChart component
3. Create ResourceGauge component
4. Create ActivityTimeline component
5. Implement StatsOverview page
6. Add backend API endpoints for stats data
7. Implement real-time updates (polling/WebSocket)

### Phase 3: Daemon Page (Week 3)
1. Create ResourceProgressBar component
2. Create StatusDot component
3. Update NodeItem component
4. Update NodeList component with filters/sorting
5. Add batch operations
6. Add view toggle (grid/list/compact)

### Phase 4: Marketplace Search (Week 4)
1. Add search bar to AppPackages
2. Implement search filtering logic
3. Implement sorting options
4. Add search result highlighting
5. Add "no results" state
6. Add search analytics (optional)

### Phase 5: Testing & Polish (Week 5)
1. Cross-browser testing
2. Mobile responsiveness testing
3. Performance testing
4. Accessibility improvements (ARIA labels)
5. Animation polish
6. Documentation updates

---

## 8. Build & Deployment Commands

### 8.1 Clone Repository

```bash
# Clone the repository
git clone https://github.com/YohanTirnue/TirnueManager.git

# Navigate to project directory
cd TirnueManager
```

### 8.2 Install Dependencies

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies (if needed)
cd ../backend
npm install

# Or install daemon dependencies
cd ../daemon
npm install
```

### 8.3 Development Mode

```bash
# Run frontend dev server (with hot reload)
cd frontend
npm run dev
# Access at: http://localhost:5173

# Run backend/daemon (separate terminal)
cd daemon
npm run dev
# Daemon runs on: http://localhost:23333

# Run panel (separate terminal)
cd panel
npm run dev
# Panel runs on: http://localhost:23334
```

### 8.4 Build for Production

```bash
# Build frontend
cd frontend
npm run build
# Output: frontend/dist/

# Build daemon
cd daemon
npm run build
# Output: daemon/production/

# Build panel
cd panel
npm run build
# Output: panel/production/
```

### 8.5 Windows Build Script

**Create `build-all.bat` in project root:**
```bat
@echo off
echo ========================================
echo Building MCSManager (All Components)
echo ========================================

echo [1/3] Building Frontend...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed!
    pause
    exit /b 1
)
cd ..

echo [2/3] Building Daemon...
cd daemon
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Daemon build failed!
    pause
    exit /b 1
)
cd ..

echo [3/3] Building Panel...
cd panel
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Panel build failed!
    pause
    exit /b 1
)
cd ..

echo ========================================
echo Build Complete!
echo ========================================
echo Frontend: frontend/dist/
echo Daemon:   daemon/production/
echo Panel:    panel/production/
echo.
pause
```

**Run:**
```bash
./build-all.bat
```

### 8.6 Linux/Mac Build Script

**Create `build-all.sh`:**
```bash
#!/bin/bash

echo "========================================"
echo "Building MCSManager (All Components)"
echo "========================================"

echo "[1/3] Building Frontend..."
cd frontend
npm run build || { echo "Frontend build failed"; exit 1; }
cd ..

echo "[2/3] Building Daemon..."
cd daemon
npm run build || { echo "Daemon build failed"; exit 1; }
cd ..

echo "[3/3] Building Panel..."
cd panel
npm run build || { echo "Panel build failed"; exit 1; }
cd ..

echo "========================================"
echo "Build Complete!"
echo "========================================"
echo "Frontend: frontend/dist/"
echo "Daemon:   daemon/production/"
echo "Panel:    panel/production/"
```

**Make executable and run:**
```bash
chmod +x build-all.sh
./build-all.sh
```

### 8.7 Production Deployment

#### Option 1: Manual Deployment
```bash
# Copy built files to production server
scp -r frontend/dist/* user@server:/var/www/mcsmanager/
scp -r daemon/production/* user@server:/opt/mcsmanager/daemon/
scp -r panel/production/* user@server:/opt/mcsmanager/panel/

# SSH into server and restart services
ssh user@server
cd /opt/mcsmanager
pm2 restart daemon
pm2 restart panel
```

#### Option 2: Docker Deployment
```bash
# Build Docker images
docker build -t mcsmanager-frontend:latest -f frontend/Dockerfile .
docker build -t mcsmanager-daemon:latest -f daemon/Dockerfile .
docker build -t mcsmanager-panel:latest -f panel/Dockerfile .

# Run containers
docker-compose up -d
```

### 8.8 Quick Local Test

**Run production build locally:**
```bash
# Build everything
npm run build

# Serve frontend with static server
cd frontend/dist
npx http-server -p 8080

# Run daemon
cd ../../daemon/production
node app.js

# Run panel
cd ../../panel/production
node app.js
```

**Access:**
- Frontend: http://localhost:8080
- Daemon: http://localhost:23333
- Panel: http://localhost:23334

### 8.9 Environment Variables

**Create `.env` files:**

**Frontend `.env`:**
```env
VITE_API_URL=http://localhost:23334
VITE_WS_URL=ws://localhost:23334
```

**Daemon `.env`:**
```env
PORT=23333
NODE_ENV=production
```

**Panel `.env`:**
```env
PORT=23334
DAEMON_URL=http://localhost:23333
```

### 8.10 PM2 Process Management

**Install PM2:**
```bash
npm install -g pm2
```

**Create `ecosystem.config.js`:**
```javascript
module.exports = {
  apps: [
    {
      name: 'mcsm-daemon',
      script: './daemon/production/app.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 23333
      }
    },
    {
      name: 'mcsm-panel',
      script: './panel/production/app.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 23334
      }
    }
  ]
};
```

**Start with PM2:**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Auto-start on reboot
```

**Monitor:**
```bash
pm2 status
pm2 logs
pm2 monit
```

---

## 📊 Expected Improvements

### Performance Metrics
- **Page Load Time:** -40% (lazy loading, code splitting)
- **Time to Interactive:** -35% (optimized bundle size)
- **Memory Usage:** -25% (virtual scrolling, pagination)
- **Smooth Animations:** 60fps (GPU acceleration)

### User Experience
- **Space Efficiency:** +30% more content visible
- **Information Density:** +50% more stats shown
- **Search Speed:** <100ms response time
- **Mobile Usability:** +60% improvement

### Visual Appeal
- **Modern Design:** Gold/orange theme consistency
- **Micro-interactions:** Smooth hover effects
- **Data Visualization:** Real-time charts
- **Professional Look:** Enterprise-grade UI

---

## ✅ Success Criteria

1. **Sidebar renamed** to "Stats" with new icon
2. **Stats page** shows 15+ real-time metrics with charts
3. **Daemon cards** display resource usage with progress bars
4. **Marketplace search** works with keyword + tag filtering
5. **Space utilization** improved by 30%+ (measured by visible content area)
6. **Performance** meets targets (load time, FPS)
7. **All features** work on mobile/tablet/desktop
8. **No regressions** in existing functionality

---

**End of Plan**
