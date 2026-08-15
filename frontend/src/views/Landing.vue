<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { router } from "@/config/router";
import {
  CloudServerOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  GlobalOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  DollarOutlined,
  CustomerServiceOutlined,
  BulbOutlined,
  BulbFilled
} from "@ant-design/icons-vue";
import { useAppConfigStore, THEME } from "@/stores/useAppConfigStore";

const goToLogin = () => {
  router.push("/login");
};

const goToRegister = () => {
  router.push("/register");
};

const openDiscord = () => {
  window.open("https://discord.gg/SA6e7ZHHfn", "_blank");
};

const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// Theme toggle
const { getTheme, setTheme } = useAppConfigStore();
const currentTheme = computed(() => getTheme());
const isLightMode = computed(() => currentTheme.value === THEME.LIGHT);

const toggleTheme = () => {
  setTheme(isLightMode.value ? THEME.DARK : THEME.LIGHT);
};

// Activity log data for continuous scroll
const logLines = [
  { time: "14:32:15", user: "dev1", action: "uploaded plugin.jar" },
  { time: "14:31:42", user: "dev2", action: "viewed server console" },
  { time: "14:30:18", user: "dev1", action: "downloaded config.yml" },
  { time: "14:29:05", user: "dev2", action: "stopped server" },
  { time: "14:28:33", user: "dev1", action: "edited permissions.yml" },
  { time: "14:27:11", user: "admin", action: "uploaded world files" },
  { time: "14:26:05", user: "dev3", action: "viewed player logs" },
  { time: "14:25:42", user: "dev2", action: "started server" },
  { time: "14:24:18", user: "dev1", action: "deleted old logs" },
  { time: "14:23:05", user: "admin", action: "changed server settings" }
];
</script>

<template>
  <div class="landing-page">
    <!-- Fixed Navigation -->
    <nav class="navbar">
      <div class="nav-container">
        <div class="nav-brand">
          <img src="/favicon.png" alt="Tirnue" class="brand-logo-wide" />
        </div>
        <div class="nav-links">
          <a @click="scrollToSection('features')" class="nav-link">Features</a>
          <a @click="scrollToSection('pricing')" class="nav-link">Pricing</a>
          <a @click="openDiscord" class="nav-link">Support</a>
          <button class="theme-toggle" @click="toggleTheme" :title="isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'">
            <BulbFilled v-if="isLightMode" />
            <BulbOutlined v-else />
          </button>
          <a-button class="btn-login" @click="goToLogin">Sign In</a-button>
          <a-button type="primary" class="btn-register" @click="goToRegister">Get Started</a-button>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero" id="hero">
      <div class="hero-container">
        <div class="hero-badge">
          <span class="badge-dot"></span>
          Now Open for Players
        </div>
        <h1 class="hero-title">Your Server.<br/>Your Rules.</h1>
        <p class="hero-subtitle">
          Power up your Minecraft world with lightning-fast PH hosting. Full control panel,<br/>
          instant deployment, and a team management system that actually works.
        </p>
        <div class="hero-cta">
          <a-button type="primary" size="large" class="cta-primary" @click="goToRegister">
            Get Started Now
            <ArrowRightOutlined />
          </a-button>
          <a-button size="large" class="cta-secondary" @click="openDiscord">
            Join Discord
          </a-button>
        </div>
        <div class="hero-features">
          <div class="feature-pill">
            <CheckCircleOutlined />
            <span>Instant Deploy</span>
          </div>
          <div class="feature-pill">
            <CheckCircleOutlined />
            <span>24/7 Support</span>
          </div>
          <div class="feature-pill">
            <CheckCircleOutlined />
            <span>Total Control</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features" id="features">
      <div class="section-container">
        <div class="section-header">
          <h2 class="section-title">Built Different.</h2>
          <p class="section-subtitle">Everything you need to dominate. Nothing you don't.</p>
        </div>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">
              <TeamOutlined />
            </div>
            <h3>Complete Team Management</h3>
            <p>Track every action your developers take. Full audit logs, granular permissions, and real-time monitoring included.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <DollarOutlined />
            </div>
            <h3>Startup Pricing</h3>
            <p>Take advantage of our cheap startup prices. No hidden fees, no overselling, just honest pricing.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <SafetyCertificateOutlined />
            </div>
            <h3>DDoS Protection</h3>
            <p>Basic DDoS protection included to keep your server online and protected from attacks.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <GlobalOutlined />
            </div>
            <h3>Dedicated IPs</h3>
            <p>Your own dedicated IP address for your server. No sharing, no extra charges.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <ThunderboltOutlined />
            </div>
            <h3>Reliable Hardware</h3>
            <p>Solid server hardware that works. We don't make crazy speed claims, just reliable hosting.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <CustomerServiceOutlined />
            </div>
            <h3>24/7 Real Support</h3>
            <p>Real people answering questions around the clock. Small team, direct help via Discord.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Team Control Section -->
    <section class="team-control">
      <div class="section-container">
        <div class="team-control-content">
          <div class="team-control-text">
            <h2>Stop Wondering What Happened</h2>
            <p class="lead">Complete transparency into your team's actions</p>
            <ul class="benefits-list">
              <li>
                <CheckCircleOutlined class="check-icon" />
                <div>
                  <strong>Full Audit Logs</strong>
                  <p>See every action your developers take in real-time</p>
                </div>
              </li>
              <li>
                <CheckCircleOutlined class="check-icon" />
                <div>
                  <strong>Granular Permissions</strong>
                  <p>Control exactly what each team member can access</p>
                </div>
              </li>
              <li>
                <CheckCircleOutlined class="check-icon" />
                <div>
                  <strong>File Tracking</strong>
                  <p>Know who uploaded, edited, or deleted what</p>
                </div>
              </li>
              <li>
                <CheckCircleOutlined class="check-icon" />
                <div>
                  <strong>Peace of Mind</strong>
                  <p>Run your server with your team without worrying</p>
                </div>
              </li>
            </ul>
          </div>
          <div class="team-control-visual">
            <div class="log-window">
              <div class="log-header">
                <div class="log-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span class="log-title">Live Activity Monitor</span>
              </div>
              <div class="log-content">
                <div class="log-columns">
                  <div class="log-column">
                    <div class="log-track track-up">
                      <div v-for="(line, index) in logLines" :key="`up1-${index}`" class="log-line">
                        <span class="log-time">{{ line.time }}</span>
                        <span class="log-user">{{ line.user }}</span>
                        <span class="log-action">{{ line.action }}</span>
                      </div>
                      <!-- Duplicate for seamless loop -->
                      <div v-for="(line, index) in logLines" :key="`up2-${index}`" class="log-line">
                        <span class="log-time">{{ line.time }}</span>
                        <span class="log-user">{{ line.user }}</span>
                        <span class="log-action">{{ line.action }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="log-column">
                    <div class="log-track track-down">
                      <div v-for="(line, index) in logLines" :key="`down1-${index}`" class="log-line">
                        <span class="log-time">{{ line.time }}</span>
                        <span class="log-user">{{ line.user }}</span>
                        <span class="log-action">{{ line.action }}</span>
                      </div>
                      <!-- Duplicate for seamless loop -->
                      <div v-for="(line, index) in logLines" :key="`down2-${index}`" class="log-line">
                        <span class="log-time">{{ line.time }}</span>
                        <span class="log-user">{{ line.user }}</span>
                        <span class="log-action">{{ line.action }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section class="pricing" id="pricing">
      <div class="section-container">
        <div class="section-header">
          <h2 class="section-title">Plans That Don't Suck</h2>
          <p class="section-subtitle">No contracts. No BS. Just pick a plan and go.</p>
        </div>
        <div class="pricing-grid">
          <div class="pricing-card">
            <div class="pricing-header">
              <h3>Minecraft Hosting</h3>
              <div class="pricing-badge">Most Popular</div>
            </div>
            <div class="pricing-features">
              <div class="pricing-feature">
                <CheckCircleOutlined />
                <span>Cheap startup pricing</span>
              </div>
              <div class="pricing-feature">
                <CheckCircleOutlined />
                <span>Full team management</span>
              </div>
              <div class="pricing-feature">
                <CheckCircleOutlined />
                <span>Dedicated IP included</span>
              </div>
              <div class="pricing-feature">
                <CheckCircleOutlined />
                <span>24/7 Discord support</span>
              </div>
              <div class="pricing-feature">
                <CheckCircleOutlined />
                <span>Mod & plugin support</span>
              </div>
              <div class="pricing-feature">
                <CheckCircleOutlined />
                <span>Web control panel</span>
              </div>
            </div>
            <a-button type="primary" block size="large" @click="goToRegister">
              Get Started
            </a-button>
          </div>
          <div class="pricing-card">
            <div class="pricing-header">
              <h3>Other Games</h3>
            </div>
            <div class="pricing-features">
              <div class="pricing-feature">
                <CheckCircleOutlined />
                <span>Terraria, Rust, ARK</span>
              </div>
              <div class="pricing-feature">
                <CheckCircleOutlined />
                <span>Same cheap pricing</span>
              </div>
              <div class="pricing-feature">
                <CheckCircleOutlined />
                <span>Same control panel</span>
              </div>
              <div class="pricing-feature">
                <CheckCircleOutlined />
                <span>24/7 support</span>
              </div>
              <div class="pricing-feature">
                <CheckCircleOutlined />
                <span>Dedicated IPs</span>
              </div>
              <div class="pricing-feature">
                <CheckCircleOutlined />
                <span>Full team control</span>
              </div>
            </div>
            <a-button block size="large" @click="openDiscord">
              Contact Us
            </a-button>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="cta-container">
        <h2>Ready to Get Started?</h2>
        <p>Join our growing community of Minecraft server owners</p>
        <a-button type="primary" size="large" @click="goToRegister">
          Create Your Account
          <ArrowRightOutlined />
        </a-button>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-container">
        <div class="footer-brand">
          <img src="/favicon.png" alt="Tirnue" class="brand-logo-wide" />
        </div>
        <p>&copy; 2025 Tirnue. Powered by MCS Manager</p>
        <a href="https://discord.gg/SA6e7ZHHfn" target="_blank" class="footer-link">
          Join our Discord for support
        </a>
      </div>
    </footer>
  </div>
</template>

<style lang="scss" scoped>
.landing-page {
  width: 100%;
  min-height: 100vh;
  background: #0a0a0a;
  scroll-behavior: smooth;
  overflow-x: hidden;
}

// Navigation
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(10, 10, 10, 0.98);
  backdrop-filter: none; /* Optimized */
  border-bottom: 1px solid var(--theme-shadow-hover);
  z-index: 1000;
  padding: 16px 0;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.brand-logo-wide {
  height: 40px;
  width: auto;
  max-width: 100%;
  object-fit: contain;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 32px;
}

.nav-link {
  color: #cccccc;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: var(--theme-primary-color);
  }
}

.theme-toggle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #333;
  background: transparent;
  color: #cccccc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    border-color: var(--theme-primary-color);
    color: var(--theme-primary-color);
    background: var(--theme-shadow-hover);
  }
}

.btn-login {
  border: 1px solid #333;
  color: #cccccc;
  background: transparent;

  &:hover {
    border-color: var(--theme-primary-color);
    color: var(--theme-primary-color);
  }
}

.btn-register {
  background: var(--theme-primary-gradient);
  border: none;

  &:hover {
    background: var(--theme-primary-gradient);
  }
}

// Hero Section
.hero {
  padding: 140px 32px 100px;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1200 100%);
  border-bottom: 1px solid var(--theme-shadow-hover);
}

.hero-container {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--theme-shadow-hover);
  border: 1px solid var(--theme-shadow-hover);
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  color: var(--theme-primary-color);
  margin-bottom: 24px;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--theme-primary-color);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.hero-title {
  font-size: 56px;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.2;
  margin: 0 0 24px 0;
  text-shadow: 0 0 40px var(--theme-shadow-hover);
}

.hero-subtitle {
  font-size: 18px;
  color: #aaaaaa;
  line-height: 1.6;
  margin: 0 0 40px 0;
}

.hero-cta {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 48px;
}

.cta-primary {
  height: 48px;
  padding: 0 32px;
  font-size: 16px;
  font-weight: 600;
  background: var(--theme-primary-gradient);
  border: none;

  &:hover {
    background: var(--theme-primary-gradient);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px var(--theme-shadow-hover);
  }
}

.cta-secondary {
  height: 48px;
  padding: 0 32px;
  font-size: 16px;
  font-weight: 600;
  border: 2px solid #333;
  color: #cccccc;
  background: transparent;

  &:hover {
    border-color: var(--theme-primary-color);
    color: var(--theme-primary-color);
  }
}

.hero-features {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}

.feature-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 100px;
  font-size: 14px;
  font-weight: 600;
  color: #cccccc;

  :deep(.anticon) {
    color: var(--theme-primary-color);
    font-size: 16px;
  }
}

// Sections
.features,
.team-control,
.pricing {
  padding: 100px 32px;
}

.section-container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 64px;
}

.section-title {
  font-size: 42px;
  font-weight: 800;
  color: #ffffff;
  margin: 0 0 16px 0;
}

.section-subtitle {
  font-size: 18px;
  color: #aaaaaa;
  margin: 0;
}

// Features Grid
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}

.feature-card {
  padding: 40px 32px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 16px;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px var(--theme-shadow-hover);
    border-color: var(--theme-primary-color);
  }

  h3 {
    font-size: 20px;
    font-weight: 700;
    color: #ffffff;
    margin: 0 0 12px 0;
  }

  p {
    font-size: 15px;
    color: #aaaaaa;
    line-height: 1.6;
    margin: 0;
  }
}

.feature-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: var(--theme-shadow-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;

  :deep(.anticon) {
    font-size: 28px;
    color: var(--theme-primary-color);
  }
}

// Team Control
.team-control {
  background: #0f0f0f;
  border-top: 1px solid var(--theme-shadow-hover);
  border-bottom: 1px solid var(--theme-shadow-hover);
}

.team-control-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
}

.team-control-text {
  h2 {
    font-size: 40px;
    font-weight: 800;
    color: #ffffff;
    margin: 0 0 16px 0;
  }

  .lead {
    font-size: 18px;
    color: #aaaaaa;
    margin: 0 0 40px 0;
  }
}

.benefits-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;

  li {
    display: flex;
    gap: 16px;
  }

  .check-icon {
    color: var(--theme-primary-color);
    font-size: 20px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  strong {
    display: block;
    font-size: 16px;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 4px;
  }

  p {
    font-size: 14px;
    color: #aaaaaa;
    margin: 0;
  }
}

// Log Window
.log-window {
  background: #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.log-header {
  padding: 12px 16px;
  background: #2a2a2a;
  border-bottom: 1px solid #3a3a3a;
  display: flex;
  align-items: center;
  gap: 12px;
}

.log-dots {
  display: flex;
  gap: 6px;

  span {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #4a4a4a;

    &:nth-child(1) {
      background: #ff5f56;
    }

    &:nth-child(2) {
      background: #ffbd2e;
    }

    &:nth-child(3) {
      background: #27c93f;
    }
  }
}

.log-title {
  font-size: 13px;
  color: #8a8a8a;
  font-weight: 500;
}

.log-content {
  padding: 20px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  overflow: hidden;
  height: 300px;
}

.log-columns {
  display: flex;
  gap: 16px;
  height: 100%;
}

.log-column {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.log-track {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.track-up {
  animation: scrollUp 20s linear infinite;
}

.track-down {
  animation: scrollDown 20s linear infinite;
}

@keyframes scrollUp {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-50%);
  }
}

@keyframes scrollDown {
  0% {
    transform: translateY(-50%);
  }
  100% {
    transform: translateY(0);
  }
}

.log-line {
  display: flex;
  gap: 16px;
  padding: 12px;
  color: #8a8a8a;
  background: var(--theme-shadow-hover);
  border-radius: 8px;
  margin-bottom: 8px;
  min-height: 40px;
  align-items: center;

  .log-time {
    color: #6a6a6a;
    min-width: 65px;
  }

  .log-user {
    color: var(--theme-primary-color);
    font-weight: 600;
    min-width: 55px;
  }

  .log-action {
    color: #aaa;
    flex: 1;
  }
}

// Pricing
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
  max-width: 900px;
  margin: 0 auto;
}

.pricing-card {
  padding: 40px;
  background: #1a1a1a;
  border: 2px solid #333;
  border-radius: 16px;
  transition: all 0.3s;

  &:hover {
    border-color: var(--theme-primary-color);
    transform: translateY(-4px);
    box-shadow: 0 12px 32px var(--theme-shadow-hover);
  }
}

.pricing-header {
  margin-bottom: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    font-size: 24px;
    font-weight: 700;
    color: #ffffff;
    margin: 0;
  }
}

.pricing-badge {
  padding: 6px 12px;
  background: var(--theme-shadow-hover);
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  color: var(--theme-primary-color);
}

.pricing-features {
  margin-bottom: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pricing-feature {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  color: #cccccc;

  :deep(.anticon) {
    color: var(--theme-primary-color);
    font-size: 18px;
  }
}

// CTA Section
.cta-section {
  padding: 100px 32px;
  background: var(--theme-primary-gradient);
}

.cta-container {
  max-width: 700px;
  margin: 0 auto;
  text-align: center;

  h2 {
    font-size: 42px;
    font-weight: 800;
    color: #0a0a0a;
    margin: 0 0 16px 0;
  }

  p {
    font-size: 18px;
    color: rgba(10, 10, 10, 0.8);
    margin: 0 0 40px 0;
  }

  .ant-btn-primary {
    height: 56px;
    padding: 0 40px;
    font-size: 18px;
    font-weight: 600;
    background: #0a0a0a;
    color: var(--theme-primary-color);
    border: none;

    &:hover {
      background: #1a1a1a;
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
    }
  }
}

// Footer
.footer {
  padding: 48px 32px;
  background: #0a0a0a;
  border-top: 1px solid var(--theme-shadow-hover);
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
}

.footer-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;

  img {
    width: 32px;
    height: 32px;
  }

  span {
    font-size: 20px;
    font-weight: 700;
    color: var(--theme-primary-color);
  }
}

.footer-container p {
  color: #666666;
  margin: 0 0 8px 0;
}

.footer-link {
  color: var(--theme-primary-color);
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
}

// Responsive
@media (max-width: 1024px) {
  .nav-links {
    gap: 16px;
  }

  .features-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }

  .team-control-content {
    grid-template-columns: 1fr;
    gap: 48px;
  }

  .pricing-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  // Navigation
  .navbar {
    padding: 12px 0;
  }

  .nav-container {
    padding: 0 20px;
  }

  .brand-logo-wide {
    height: 32px;
  }

  .nav-links {
    display: none;
  }

  // Hero
  .hero {
    padding: 100px 20px 60px;
  }

  .hero-title {
    font-size: 32px;
    line-height: 1.3;
    margin-bottom: 16px;
    br {
      display: none;
    }
  }

  .hero-subtitle {
    font-size: 16px;
    margin-bottom: 32px;
    br {
      display: none;
    }
  }

  .hero-badge {
    font-size: 12px;
    padding: 6px 12px;
    margin-bottom: 20px;
  }

  .hero-cta {
    flex-direction: column;
    gap: 12px;
    margin-bottom: 32px;
  }

  .cta-primary,
  .cta-secondary {
    width: 100%;
    height: 44px;
    font-size: 15px;
  }

  .hero-features {
    gap: 12px;
  }

  .feature-pill {
    font-size: 13px;
    padding: 8px 14px;
  }

  // Sections
  .features,
  .team-control,
  .pricing {
    padding: 60px 20px;
  }

  .section-header {
    margin-bottom: 40px;
  }

  .section-title {
    font-size: 28px;
    margin-bottom: 12px;
  }

  .section-subtitle {
    font-size: 16px;
  }

  // Features Grid
  .features-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .feature-card {
    padding: 28px 20px;

    h3 {
      font-size: 18px;
      margin-bottom: 8px;
    }

    p {
      font-size: 14px;
    }
  }

  .feature-icon {
    width: 48px;
    height: 48px;
    margin-bottom: 16px;

    :deep(.anticon) {
      font-size: 24px;
    }
  }

  // Team Control
  .team-control-content {
    gap: 32px;
  }

  .team-control-text {
    h2 {
      font-size: 28px;
      margin-bottom: 12px;
    }

    .lead {
      font-size: 16px;
      margin-bottom: 28px;
    }
  }

  .benefits-list {
    gap: 16px;

    strong {
      font-size: 15px;
    }

    p {
      font-size: 13px;
    }
  }

  .log-window {
    margin-top: 20px;
  }

  .log-content {
    padding: 16px;
    height: 250px;
  }

  .log-line {
    padding: 8px;
    font-size: 11px;
    margin-bottom: 6px;

    .log-time {
      min-width: 55px;
      font-size: 10px;
    }

    .log-user {
      min-width: 45px;
      font-size: 11px;
    }

    .log-action {
      font-size: 11px;
    }
  }

  // Pricing
  .pricing-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .pricing-card {
    padding: 28px 20px;
  }

  .pricing-header {
    margin-bottom: 24px;

    h3 {
      font-size: 20px;
    }
  }

  .pricing-badge {
    font-size: 11px;
    padding: 4px 10px;
  }

  .pricing-features {
    margin-bottom: 24px;
    gap: 12px;
  }

  .pricing-feature {
    font-size: 14px;
  }

  // CTA
  .cta-section {
    padding: 60px 20px;
  }

  .cta-container {
    h2 {
      font-size: 32px;
      margin-bottom: 12px;
    }

    p {
      font-size: 16px;
      margin-bottom: 28px;
    }

    .ant-btn-primary {
      height: 48px;
      padding: 0 32px;
      font-size: 16px;
    }
  }

  // Footer
  .footer {
    padding: 32px 20px;
  }

  .footer-brand {
    margin-bottom: 12px;

    img {
      height: 32px;
      width: auto;
      max-width: 100%;
      object-fit: contain;
    }
  }

  .footer-container p {
    font-size: 13px;
    margin-bottom: 6px;
  }

  .footer-link {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 28px;
  }

  .section-title {
    font-size: 24px;
  }

  .team-control-text h2 {
    font-size: 24px;
  }

  .cta-container h2 {
    font-size: 28px;
  }
}
</style>

<style lang="scss">
// Global Light Mode Styles for Landing Page
.app-light-theme {
  .landing-page {
    background: #f5f5f5;
  }

  // Navigation
  .navbar {
    background: rgba(255, 255, 255, 0.98);
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }

  .brand-name {
    color: var(--theme-primary-color);
  }

  .nav-link {
    color: #4a4a4a;

    &:hover {
      color: var(--theme-primary-color);
    }
  }

  .theme-toggle {
    border: 1px solid #ddd;
    color: #4a4a4a;

    &:hover {
      border-color: var(--theme-primary-color);
      color: var(--theme-primary-color);
      background: var(--theme-shadow-hover);
    }
  }

  .btn-login {
    border: 1px solid #ddd;
    color: #4a4a4a;
    background: white;

    &:hover {
      border-color: var(--theme-primary-color);
      color: var(--theme-primary-color);
    }
  }

  .btn-register {
    background: var(--theme-primary-gradient);
    border: none;

    &:hover {
      background: var(--theme-primary-gradient);
    }
  }

  // Hero Section
  .hero {
    background: linear-gradient(135deg, #ffffff 0%, #fff5f0 100%);
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }

  .hero-badge {
    background: var(--theme-shadow-hover);
    border: 1px solid var(--theme-shadow-hover);
    color: var(--theme-primary-color);
  }

  .badge-dot {
    background: var(--theme-primary-color);
  }

  .hero-title {
    color: #1a1a1a;
    text-shadow: none;
  }

  .hero-subtitle {
    color: #666;
  }

  .cta-primary {
    background: var(--theme-primary-gradient);

    &:hover {
      background: var(--theme-primary-gradient);
      box-shadow: 0 8px 24px var(--theme-shadow-hover);
    }
  }

  .cta-secondary {
    border: 2px solid #ddd;
    color: #4a4a4a;
    background: white;

    &:hover {
      border-color: var(--theme-primary-color);
      color: var(--theme-primary-color);
    }
  }

  .feature-pill {
    background: white;
    border: 2px solid #333;
    color: #4a4a4a;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  // Sections
  .features,
  .team-control,
  .pricing {
    background: #f5f5f5;
  }

  .section-title {
    color: #1a1a1a;
  }

  .section-subtitle {
    color: #666;
  }

  // Feature Cards with Darker Edges
  .feature-card {
    background: white;
    border: 2px solid #333;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

    &:hover {
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
      border-color: var(--theme-primary-color);
    }

    h3 {
      color: #1a1a1a;
    }

    p {
      color: #666;
    }
  }

  .feature-icon {
    background: var(--theme-shadow-hover);

    .anticon {
      color: var(--theme-primary-color);
    }
  }

  // Team Control
  .team-control {
    background: #ececec;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }

  .team-control-text {
    h2 {
      color: #1a1a1a;
    }

    .lead {
      color: #666;
    }
  }

  .benefits-list {
    .check-icon {
      color: var(--theme-primary-color);
    }

    strong {
      color: #1a1a1a;
    }

    p {
      color: #666;
    }
  }

  // Log Window with Darker Edge
  .log-window {
    background: #1a1a1a;
    border: 2px solid #000;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }

  // Pricing Cards with Darker Edges
  .pricing-card {
    background: white;
    border: 2px solid #333;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

    &:hover {
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
      border-color: var(--theme-primary-color);
    }
  }

  .pricing-header {
    h3 {
      color: #1a1a1a;
    }
  }

  .pricing-badge {
    background: var(--theme-shadow-hover);
    color: var(--theme-primary-color);
  }

  .pricing-feature {
    color: #4a4a4a;

    .anticon {
      color: var(--theme-primary-color);
    }
  }

  // CTA Section
  .cta-section {
    background: var(--theme-primary-gradient);
  }

  .cta-container {
    h2 {
      color: #fff;
    }

    p {
      color: rgba(255, 255, 255, 0.9);
    }

    .ant-btn-primary {
      background: white;
      color: var(--theme-primary-color);

      &:hover {
        background: #f5f5f5;
      }
    }
  }

  // Footer
  .footer {
    background: #1a1a1a;
    border-top: 1px solid #333;
  }
}
</style>
