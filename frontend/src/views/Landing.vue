<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
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
  CustomerServiceOutlined
} from "@ant-design/icons-vue";

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
          <img src="/favicon.png" alt="Tirnue" class="brand-logo" />
          <span class="brand-name">Tirnue</span>
        </div>
        <div class="nav-links">
          <a @click="scrollToSection('features')" class="nav-link">Features</a>
          <a @click="scrollToSection('pricing')" class="nav-link">Pricing</a>
          <a @click="openDiscord" class="nav-link">Support</a>
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
          Cheap Startup Hosting
        </div>
        <h1 class="hero-title">Minecraft Server Hosting<br/>Built for Transparency</h1>
        <p class="hero-subtitle">
          Affordable panel hosting with complete team control. Track every action,<br/>
          control permissions, and manage your developers with full transparency.
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
            <span>Cheap Pricing</span>
          </div>
          <div class="feature-pill">
            <CheckCircleOutlined />
            <span>24/7 Support</span>
          </div>
          <div class="feature-pill">
            <CheckCircleOutlined />
            <span>Full Team Control</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features" id="features">
      <div class="section-container">
        <div class="section-header">
          <h2 class="section-title">Why Choose Tirnue?</h2>
          <p class="section-subtitle">Honest hosting with features that matter</p>
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
          <h2 class="section-title">Simple, Honest Pricing</h2>
          <p class="section-subtitle">New startup, cheap prices - take advantage now</p>
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
          <img src="/favicon.png" alt="Tirnue" />
          <span>Tirnue</span>
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
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 140, 0, 0.2);
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

.brand-logo {
  width: 32px;
  height: 32px;
}

.brand-name {
  font-size: 20px;
  font-weight: 700;
  color: #ff8c00;
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
    color: #ff8c00;
  }
}

.btn-login {
  border: 1px solid #333;
  color: #cccccc;
  background: transparent;

  &:hover {
    border-color: #ff8c00;
    color: #ff8c00;
  }
}

.btn-register {
  background: linear-gradient(135deg, #ff8c00 0%, #ff6500 100%);
  border: none;

  &:hover {
    background: linear-gradient(135deg, #ffa500 0%, #ff8c00 100%);
  }
}

// Hero Section
.hero {
  padding: 140px 32px 100px;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1200 100%);
  border-bottom: 1px solid rgba(255, 140, 0, 0.2);
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
  background: rgba(255, 140, 0, 0.15);
  border: 1px solid rgba(255, 140, 0, 0.3);
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  color: #ffa500;
  margin-bottom: 24px;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ff8c00;
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
  text-shadow: 0 0 40px rgba(255, 140, 0, 0.3);
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
  background: linear-gradient(135deg, #ff8c00 0%, #ff6500 100%);
  border: none;

  &:hover {
    background: linear-gradient(135deg, #ffa500 0%, #ff8c00 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(255, 140, 0, 0.4);
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
    border-color: #ff8c00;
    color: #ff8c00;
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
    color: #ffa500;
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
    box-shadow: 0 12px 32px rgba(255, 140, 0, 0.2);
    border-color: #ff8c00;
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
  background: rgba(255, 140, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;

  :deep(.anticon) {
    font-size: 28px;
    color: #ff8c00;
  }
}

// Team Control
.team-control {
  background: #0f0f0f;
  border-top: 1px solid rgba(255, 140, 0, 0.2);
  border-bottom: 1px solid rgba(255, 140, 0, 0.2);
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
    color: #ffa500;
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
  background: rgba(255, 140, 0, 0.05);
  border-radius: 8px;
  margin-bottom: 8px;
  min-height: 40px;
  align-items: center;

  .log-time {
    color: #6a6a6a;
    min-width: 65px;
  }

  .log-user {
    color: #ff8c00;
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
    border-color: #ff8c00;
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(255, 140, 0, 0.2);
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
  background: rgba(255, 140, 0, 0.15);
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  color: #ffa500;
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
    color: #ffa500;
    font-size: 18px;
  }
}

// CTA Section
.cta-section {
  padding: 100px 32px;
  background: linear-gradient(135deg, #ff8c00 0%, #ff6500 100%);
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
    color: #ff8c00;
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
  border-top: 1px solid rgba(255, 140, 0, 0.2);
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
    color: #ff8c00;
  }
}

.footer-container p {
  color: #666666;
  margin: 0 0 8px 0;
}

.footer-link {
  color: #ff8c00;
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
  .hero-title {
    font-size: 36px;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .nav-links {
    display: none;
  }

  .section-title {
    font-size: 32px;
  }
}
</style>
