/**
 * MCSManager Template Version Monitor
 * Automatically monitors server APIs and archives old versions when new ones are released
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const CONFIG = {
  templatesFile: path.join(__dirname, 'expanded-templates.json'),
  checkInterval: 6 * 60 * 60 * 1000, // 6 hours
  versionHistoryFile: path.join(__dirname, 'template-version-history.json')
};

// API Endpoints
const APIs = {
  paper: {
    baseUrl: 'api.papermc.io',
    path: '/v2/projects/paper',
    versions: ['1.21.10', '1.21.9', '1.21.8', '1.20.1', '1.19.4', '1.12.2', '1.8.8']
  },
  velocity: {
    baseUrl: 'api.papermc.io',
    path: '/v2/projects/velocity',
    versions: ['3.4.0', '3.3.0']
  },
  purpur: {
    baseUrl: 'api.purpurmc.org',
    path: '/v2/purpur',
    versions: ['1.21.1', '1.20.1']
  },
  waterfall: {
    baseUrl: 'api.papermc.io',
    path: '/v2/projects/waterfall',
    versions: ['1.21', '1.20']
  },
  folia: {
    baseUrl: 'api.papermc.io',
    path: '/v2/projects/folia',
    versions: ['1.21.1', '1.20.1']
  }
};

// Helper function to make HTTPS requests
function httpsGet(hostname, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: hostname,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'MCSManager-Template-Monitor/1.0'
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Check Paper API for latest build
async function checkPaperVersion(mcVersion) {
  try {
    const buildsData = await httpsGet(
      APIs.paper.baseUrl,
      `${APIs.paper.path}/versions/${mcVersion}/builds`
    );

    if (!buildsData.builds || buildsData.builds.length === 0) {
      console.log(`⚠️  No builds found for Paper ${mcVersion}`);
      return null;
    }

    const latestBuild = buildsData.builds[buildsData.builds.length - 1];
    return {
      project: 'paper',
      version: mcVersion,
      build: latestBuild.build,
      downloadUrl: `https://api.papermc.io/v2/projects/paper/versions/${mcVersion}/builds/${latestBuild.build}/downloads/paper-${mcVersion}-${latestBuild.build}.jar`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`❌ Error checking Paper ${mcVersion}:`, error.message);
    return null;
  }
}

// Check Velocity API
async function checkVelocityVersion(version) {
  try {
    const buildsData = await httpsGet(
      APIs.velocity.baseUrl,
      `${APIs.velocity.path}/versions/${version}/builds`
    );

    if (!buildsData.builds || buildsData.builds.length === 0) {
      console.log(`⚠️  No builds found for Velocity ${version}`);
      return null;
    }

    const latestBuild = buildsData.builds[buildsData.builds.length - 1];
    return {
      project: 'velocity',
      version: version,
      build: latestBuild.build,
      downloadUrl: `https://api.papermc.io/v2/projects/velocity/versions/${version}/builds/${latestBuild.build}/downloads/velocity-${version}-${latestBuild.build}.jar`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`❌ Error checking Velocity ${version}:`, error.message);
    return null;
  }
}

// Check Purpur API
async function checkPurpurVersion(version) {
  try {
    const versionData = await httpsGet(
      APIs.purpur.baseUrl,
      `${APIs.purpur.path}/${version}`
    );

    if (!versionData.builds || !versionData.builds.latest) {
      console.log(`⚠️  No builds found for Purpur ${version}`);
      return null;
    }

    const latestBuild = versionData.builds.latest;
    return {
      project: 'purpur',
      version: version,
      build: latestBuild,
      downloadUrl: `https://api.purpurmc.org/v2/purpur/${version}/${latestBuild}/download`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`❌ Error checking Purpur ${version}:`, error.message);
    return null;
  }
}

// Check Waterfall API
async function checkWaterfallVersion(version) {
  try {
    const buildsData = await httpsGet(
      APIs.waterfall.baseUrl,
      `${APIs.waterfall.path}/versions/${version}/builds`
    );

    if (!buildsData.builds || buildsData.builds.length === 0) {
      console.log(`⚠️  No builds found for Waterfall ${version}`);
      return null;
    }

    const latestBuild = buildsData.builds[buildsData.builds.length - 1];
    return {
      project: 'waterfall',
      version: version,
      build: latestBuild.build,
      downloadUrl: `https://api.papermc.io/v2/projects/waterfall/versions/${version}/builds/${latestBuild.build}/downloads/waterfall-${version}-${latestBuild.build}.jar`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`❌ Error checking Waterfall ${version}:`, error.message);
    return null;
  }
}

// Check Folia API
async function checkFoliaVersion(version) {
  try {
    const buildsData = await httpsGet(
      APIs.folia.baseUrl,
      `${APIs.folia.path}/versions/${version}/builds`
    );

    if (!buildsData.builds || buildsData.builds.length === 0) {
      console.log(`⚠️  No builds found for Folia ${version}`);
      return null;
    }

    const latestBuild = buildsData.builds[buildsData.builds.length - 1];
    return {
      project: 'folia',
      version: version,
      build: latestBuild.build,
      downloadUrl: `https://api.papermc.io/v2/projects/folia/versions/${version}/builds/${latestBuild.build}/downloads/folia-${version}-${latestBuild.build}.jar`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`❌ Error checking Folia ${version}:`, error.message);
    return null;
  }
}

// Load version history
function loadVersionHistory() {
  try {
    if (fs.existsSync(CONFIG.versionHistoryFile)) {
      return JSON.parse(fs.readFileSync(CONFIG.versionHistoryFile, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading version history:', error.message);
  }
  return { versions: {} };
}

// Save version history
function saveVersionHistory(history) {
  try {
    fs.writeFileSync(CONFIG.versionHistoryFile, JSON.stringify(history, null, 2));
    console.log('✅ Version history saved');
  } catch (error) {
    console.error('❌ Error saving version history:', error.message);
  }
}

// Load templates
function loadTemplates() {
  try {
    if (fs.existsSync(CONFIG.templatesFile)) {
      return JSON.parse(fs.readFileSync(CONFIG.templatesFile, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading templates:', error.message);
  }
  return { version: "1.0.0", templates: [] };
}

// Save templates
function saveTemplates(templates) {
  try {
    fs.writeFileSync(CONFIG.templatesFile, JSON.stringify(templates, null, 2));
    console.log('✅ Templates saved');
  } catch (error) {
    console.error('❌ Error saving templates:', error.message);
  }
}

// Create template object
function createTemplate(versionInfo, isLatest = true) {
  const { project, version, build, downloadUrl } = versionInfo;

  const templateMap = {
    paper: {
      title: isLatest ? `Paper ${version} (Latest)` : `Paper ${version} (Build ${build})`,
      description: isLatest
        ? `High-performance Minecraft ${version} server (Auto-updating)`
        : `High-performance Minecraft ${version} server (Build ${build})`,
      gameType: "Minecraft",
      category: "Performance",
      runtime: version.startsWith('1.12') || version.startsWith('1.8') ? "Java 8+" :
               version.startsWith('1.20.5') || version.startsWith('1.21') ? "Java 21+" : "Java 17+",
      hardware: "2GB+ RAM",
      author: "PaperMC"
    },
    velocity: {
      title: isLatest ? `Velocity ${version} (Latest)` : `Velocity ${version} (Build ${build})`,
      description: isLatest
        ? `Modern, high-performance Minecraft proxy (Auto-updating)`
        : `Modern, high-performance Minecraft proxy (Build ${build})`,
      gameType: "Minecraft",
      category: "Proxy",
      runtime: "Java 17+",
      hardware: "512MB+ RAM",
      author: "PaperMC"
    },
    purpur: {
      title: isLatest ? `Purpur ${version} (Latest)` : `Purpur ${version} (Build ${build})`,
      description: isLatest
        ? `Feature-rich Paper fork (Auto-updating)`
        : `Feature-rich Paper fork (Build ${build})`,
      gameType: "Minecraft",
      category: "Performance",
      runtime: "Java 21+",
      hardware: "2GB+ RAM",
      author: "PurpurMC"
    },
    waterfall: {
      title: isLatest ? `Waterfall ${version} (Latest)` : `Waterfall ${version} (Build ${build})`,
      description: isLatest
        ? `BungeeCord fork with improved performance (Auto-updating)`
        : `BungeeCord fork with improved performance (Build ${build})`,
      gameType: "Minecraft",
      category: "Proxy",
      runtime: "Java 17+",
      hardware: "512MB+ RAM",
      author: "PaperMC"
    },
    folia: {
      title: isLatest ? `Folia ${version} (Latest)` : `Folia ${version} (Build ${build})`,
      description: isLatest
        ? `Multithreaded Paper fork (Auto-updating)`
        : `Multithreaded Paper fork (Build ${build})`,
      gameType: "Minecraft",
      category: "Performance",
      runtime: "Java 21+",
      hardware: "4GB+ RAM",
      author: "PaperMC"
    }
  };

  const baseTemplate = templateMap[project];
  return {
    id: `${project}-${version}${isLatest ? '-latest' : `-build-${build}`}`,
    ...baseTemplate,
    platform: "All",
    language: "en_us",
    targetLink: downloadUrl,
    image: `https://avatars.githubusercontent.com/u/7608950`,
    tags: isLatest
      ? [project.charAt(0).toUpperCase() + project.slice(1), "Auto-Update", "Latest"]
      : [project.charAt(0).toUpperCase() + project.slice(1), `Build ${build}`, "Stable"],
    size: "~50MB",
    setupInfo: {
      docker: false,
      installCommand: project.includes('velocity') || project.includes('waterfall')
        ? `java -Xmx512M -jar ${project}.jar`
        : `java -Xmx2G -jar ${project}.jar nogui`
    }
  };
}

// Main monitoring function
async function monitorVersions() {
  console.log('\n========================================');
  console.log('🔍 MCSManager Template Version Monitor');
  console.log('========================================\n');
  console.log(`⏰ Started at: ${new Date().toLocaleString()}\n`);

  const history = loadVersionHistory();
  const templates = loadTemplates();
  let hasUpdates = false;

  // Check all Paper versions
  console.log('📦 Checking Paper versions...');
  for (const version of APIs.paper.versions) {
    const versionInfo = await checkPaperVersion(version);
    if (!versionInfo) continue;

    const historyKey = `paper-${version}`;
    const previousBuild = history.versions[historyKey]?.build;

    if (previousBuild && previousBuild !== versionInfo.build) {
      console.log(`🆕 Paper ${version}: Build ${previousBuild} → ${versionInfo.build}`);

      // Archive old version
      const oldTemplate = createTemplate(
        { ...versionInfo, build: previousBuild },
        false
      );
      templates.templates.push(oldTemplate);
      console.log(`   📁 Archived: Paper ${version} Build ${previousBuild}`);
      hasUpdates = true;
    } else if (!previousBuild) {
      console.log(`   ✅ Paper ${version} Build ${versionInfo.build} (New)`);
    } else {
      console.log(`   ✓ Paper ${version} Build ${versionInfo.build} (No change)`);
    }

    // Update latest version template
    const latestIndex = templates.templates.findIndex(t => t.id === `paper-${version}-latest`);
    const latestTemplate = createTemplate(versionInfo, true);

    if (latestIndex >= 0) {
      templates.templates[latestIndex] = latestTemplate;
    } else {
      templates.templates.push(latestTemplate);
      hasUpdates = true;
    }

    history.versions[historyKey] = versionInfo;
  }

  // Check Velocity versions
  console.log('\n🚀 Checking Velocity versions...');
  for (const version of APIs.velocity.versions) {
    const versionInfo = await checkVelocityVersion(version);
    if (!versionInfo) continue;

    const historyKey = `velocity-${version}`;
    const previousBuild = history.versions[historyKey]?.build;

    if (previousBuild && previousBuild !== versionInfo.build) {
      console.log(`🆕 Velocity ${version}: Build ${previousBuild} → ${versionInfo.build}`);

      const oldTemplate = createTemplate(
        { ...versionInfo, build: previousBuild },
        false
      );
      templates.templates.push(oldTemplate);
      console.log(`   📁 Archived: Velocity ${version} Build ${previousBuild}`);
      hasUpdates = true;
    } else if (!previousBuild) {
      console.log(`   ✅ Velocity ${version} Build ${versionInfo.build} (New)`);
    } else {
      console.log(`   ✓ Velocity ${version} Build ${versionInfo.build} (No change)`);
    }

    const latestIndex = templates.templates.findIndex(t => t.id === `velocity-${version}-latest`);
    const latestTemplate = createTemplate(versionInfo, true);

    if (latestIndex >= 0) {
      templates.templates[latestIndex] = latestTemplate;
    } else {
      templates.templates.push(latestTemplate);
      hasUpdates = true;
    }

    history.versions[historyKey] = versionInfo;
  }

  // Check Purpur versions
  console.log('\n💜 Checking Purpur versions...');
  for (const version of APIs.purpur.versions) {
    const versionInfo = await checkPurpurVersion(version);
    if (!versionInfo) continue;

    const historyKey = `purpur-${version}`;
    const previousBuild = history.versions[historyKey]?.build;

    if (previousBuild && previousBuild !== versionInfo.build) {
      console.log(`🆕 Purpur ${version}: Build ${previousBuild} → ${versionInfo.build}`);

      const oldTemplate = createTemplate(
        { ...versionInfo, build: previousBuild },
        false
      );
      templates.templates.push(oldTemplate);
      console.log(`   📁 Archived: Purpur ${version} Build ${previousBuild}`);
      hasUpdates = true;
    } else if (!previousBuild) {
      console.log(`   ✅ Purpur ${version} Build ${versionInfo.build} (New)`);
    } else {
      console.log(`   ✓ Purpur ${version} Build ${versionInfo.build} (No change)`);
    }

    const latestIndex = templates.templates.findIndex(t => t.id === `purpur-${version}-latest`);
    const latestTemplate = createTemplate(versionInfo, true);

    if (latestIndex >= 0) {
      templates.templates[latestIndex] = latestTemplate;
    } else {
      templates.templates.push(latestTemplate);
      hasUpdates = true;
    }

    history.versions[historyKey] = versionInfo;
  }

  // Save updates
  if (hasUpdates) {
    console.log('\n💾 Saving updates...');
    saveTemplates(templates);
    saveVersionHistory(history);
    console.log('\n🎉 Templates updated successfully!');
  } else {
    console.log('\n✅ All versions up to date, no changes needed');
    saveVersionHistory(history); // Still save to update timestamps
  }

  console.log(`\n📊 Total templates: ${templates.templates.length}`);
  console.log(`⏰ Next check in 6 hours\n`);
  console.log('========================================\n');
}

// Run immediately on start
monitorVersions();

// Schedule periodic checks (every 6 hours)
setInterval(monitorVersions, CONFIG.checkInterval);

console.log('🚀 Template Version Monitor is running...');
console.log(`📁 Templates file: ${CONFIG.templatesFile}`);
console.log(`📜 History file: ${CONFIG.versionHistoryFile}`);
console.log(`⏱️  Check interval: 6 hours\n`);
