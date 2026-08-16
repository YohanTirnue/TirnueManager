<script setup lang="ts">
import { ref, onMounted } from "vue";
import { router } from "@/config/router";
import {
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  ConsoleSqlOutlined,
  CodeOutlined,
  DatabaseOutlined
} from "@ant-design/icons-vue";

const goToLogin = () => router.push("/login");
const goToRegister = () => router.push("/register");
const openDiscord = () => window.open("https://discord.gg/SA6e7ZHHfn", "_blank");

const scrollToSection = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const scrolled = ref(false);
onMounted(() => {
  window.addEventListener('scroll', () => {
    scrolled.value = window.scrollY > 50;
  });
});

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
    <nav class="navbar" :class="{ 'navbar-scrolled': scrolled }">
      <div class="nav-container">
        <div class="nav-brand" @click="scrollToSection('hero')">
          <img src="/logo.png" alt="Tirnue" class="brand-logo" />
        </div>
        <div class="nav-links">
          <a @click="scrollToSection('features')" class="nav-link">Features</a>
          <a @click="scrollToSection('pricing')" class="nav-link">Pricing</a>
          <a @click="openDiscord" class="nav-link">Community</a>
        </div>
        <div class="nav-actions">
          <button class="btn-ghost" @click="goToLogin">Log in</button>
          <button class="btn-primary" @click="goToRegister">Sign Up <ArrowRightOutlined/></button>
        </div>
      </div>
    </nav>

    <main>
      <section class="hero" id="hero">
        <div class="hero-bg-glow"></div>
        <div class="hero-content">
          <div class="hero-badge">
            <span class="badge-dot"></span>
            Tirnue Early Access
          </div>
          <h1 class="hero-title">Hosting, <br/><span class="text-gradient">Redefined.</span></h1>
          <p class="hero-subtitle">
            Experience the next generation of server management. Lightning-fast infrastructure, intuitive control panel, and team collaboration built from the ground up.
          </p>
          <div class="hero-cta">
            <button class="btn-primary-large" @click="goToRegister">Get Started <ArrowRightOutlined/></button>
            <button class="btn-outline-large" @click="scrollToSection('features')">Explore Features</button>
          </div>
        </div>
      </section>

      <section class="features" id="features">
        <div class="section-header">
          <h2>High Performance, Low Effort</h2>
          <p>Everything you need to run your servers flawlessly.</p>
        </div>
        
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon"><ThunderboltOutlined /></div>
            <h3>Blazing Fast</h3>
            <p>Powered by top-tier hardware ensuring your servers run with minimal latency and maximum uptime.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon"><TeamOutlined /></div>
            <h3>Team Management</h3>
            <p>Granular permissions and sub-user support. Give your developers exactly the access they need.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon"><SafetyCertificateOutlined /></div>
            <h3>Enterprise Security</h3>
            <p>Advanced DDoS mitigation and automated backups keep your data safe around the clock.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon"><CodeOutlined /></div>
            <h3>Advanced API</h3>
            <p>Automate your workflow with our comprehensive REST API. Full control at your fingertips.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon"><ConsoleSqlOutlined /></div>
            <h3>Modern Console</h3>
            <p>A sleek, responsive terminal with rich formatting, history, and real-time output streaming.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon"><DatabaseOutlined /></div>
            <h3>Database Included</h3>
            <p>Free MySQL databases with every server instance, easily managed from your control panel.</p>
          </div>
        </div>
      </section>

      <section class="team-control">
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
            </ul>
          </div>
          <div class="team-control-visual">
            <div class="log-window">
              <div class="log-header">
                <div class="log-dots">
                  <span></span><span></span><span></span>
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
      </section>

      <section class="pricing" id="pricing">
        <div class="section-header">
          <h2>Simple, Transparent Pricing</h2>
          <p>No hidden fees. Scale as you grow.</p>
        </div>
        <div class="pricing-grid">
          <div class="pricing-card">
            <div class="pricing-header">
              <h3>Starter</h3>
              <div class="price"><span>$</span>5<span class="period">/mo</span></div>
            </div>
            <ul class="pricing-features">
              <li><CheckCircleOutlined /> 4GB DDR4 RAM</li>
              <li><CheckCircleOutlined /> 2 vCores</li>
              <li><CheckCircleOutlined /> 50GB NVMe SSD</li>
              <li><CheckCircleOutlined /> Standard Support</li>
            </ul>
            <button class="btn-outline-large full-width" @click="goToRegister">Deploy Now</button>
          </div>
          
          <div class="pricing-card premium">
            <div class="popular-badge">Most Popular</div>
            <div class="pricing-header">
              <h3>Professional</h3>
              <div class="price"><span>$</span>15<span class="period">/mo</span></div>
            </div>
            <ul class="pricing-features">
              <li><CheckCircleOutlined /> 16GB DDR5 RAM</li>
              <li><CheckCircleOutlined /> 4 vCores (Dedicated)</li>
              <li><CheckCircleOutlined /> 150GB NVMe SSD</li>
              <li><CheckCircleOutlined /> Priority Support</li>
              <li><CheckCircleOutlined /> Free Backups</li>
            </ul>
            <button class="btn-primary-large full-width" @click="goToRegister">Deploy Now</button>
          </div>

          <div class="pricing-card">
            <div class="pricing-header">
              <h3>Extreme</h3>
              <div class="price"><span>$</span>30<span class="period">/mo</span></div>
            </div>
            <ul class="pricing-features">
              <li><CheckCircleOutlined /> 32GB DDR5 RAM</li>
              <li><CheckCircleOutlined /> 8 vCores (Dedicated)</li>
              <li><CheckCircleOutlined /> 300GB NVMe SSD</li>
              <li><CheckCircleOutlined /> 24/7 Priority Support</li>
              <li><CheckCircleOutlined /> Dedicated IP</li>
            </ul>
            <button class="btn-outline-large full-width" @click="goToRegister">Deploy Now</button>
          </div>
        </div>
      </section>
    </main>

    <footer class="footer">
      <div class="footer-content">
        <div class="footer-brand">
          <img src="/logo.png" alt="Tirnue" class="brand-logo-small" />
          <p>Next-generation game server hosting.</p>
        </div>
        <div class="footer-links">
          <div class="link-group">
            <h4>Product</h4>
            <a @click="scrollToSection('features')">Features</a>
            <a @click="scrollToSection('pricing')">Pricing</a>
          </div>
          <div class="link-group">
            <h4>Resources</h4>
            <a @click="openDiscord">Discord</a>
            <a href="#">Documentation</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2026 Tirnue. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing-page {
  background-color: #050505;
  color: #fff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
}

/* Navbar */
.navbar {
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 100;
  transition: all 0.3s ease;
  padding: 20px 0;
  background: transparent;
}

.navbar-scrolled {
  background: rgba(10, 10, 10, 0.95);
  backdrop-filter: none; /* Optimized */
  padding: 15px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand-logo {
  height: 70px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.brand-logo:hover {
  opacity: 0.8;
}

.nav-links {
  display: flex;
  gap: 32px;
}

.nav-link {
  color: #a0a0a0;
  font-weight: 500;
  font-size: 21px;
  cursor: pointer;
  transition: color 0.2s;
}
.nav-link:hover {
  color: #fff;
}

.nav-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

/* Buttons */
.btn-ghost {
  background: transparent;
  border: none;
  color: #a0a0a0;
  font-weight: 500;
  font-size: 21px;
  cursor: pointer;
  transition: color 0.2s;
}
.btn-ghost:hover {
  color: #fff;
}

.btn-primary, .btn-primary-large {
  background: #fff;
  color: #000;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.btn-primary {
  padding: 12px 24px;
  font-size: 21px;
}
.btn-primary-large {
  padding: 14px 28px;
  font-size: 16px;
  border-radius: 12px;
}
.btn-primary:hover, .btn-primary-large:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(255, 255, 255, 0.2);
}

.btn-outline-large {
  background: transparent;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 14px 28px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-outline-large:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.4);
}

.full-width {
  width: 100%;
  justify-content: center;
}

/* Hero Section */
.hero {
  position: relative;
  padding: 200px 24px 120px;
  text-align: center;
  overflow: hidden;
}

.hero-bg-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 800px;
  height: 800px;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0) 70%);
  z-index: 0;
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 800px;
  margin: 0 auto;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  color: #d0d0d0;
  margin-bottom: 24px;
}
.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.hero-title {
  font-size: 72px;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  margin: 0 0 24px;
}

.text-gradient {
  background: linear-gradient(135deg, #fff 0%, #666 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 20px;
  color: #888;
  line-height: 1.6;
  margin: 0 auto 48px;
  max-width: 600px;
}

.hero-cta {
  display: flex;
  gap: 16px;
  justify-content: center;
}

/* Sections */
section {
  padding: 100px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 64px;
}
.section-header h2 {
  font-size: 40px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 16px;
}
.section-header p {
  font-size: 18px;
  color: #888;
  margin: 0;
}

/* Features */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
}

.feature-card {
  background: #0d0d0d;
  border: 1px solid #1f1f1f;
  border-radius: 16px;
  padding: 40px 32px;
  transition: transform 0.2s, border-color 0.2s;
}
.feature-card:hover {
  transform: translateY(-4px);
  border-color: #333;
}

.feature-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #fff;
  margin-bottom: 24px;
}

.feature-card h3 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 12px;
}
.feature-card p {
  color: #888;
  line-height: 1.6;
  margin: 0;
}

/* Team Control Animated Logs */
.team-control {
  padding: 100px 24px;
}
.team-control-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
}
.team-control-text h2 {
  font-size: 40px;
  font-weight: 800;
  margin: 0 0 16px;
  letter-spacing: -0.02em;
}
.team-control-text .lead {
  font-size: 18px;
  color: #888;
  margin: 0 0 40px;
}
.benefits-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.benefits-list li {
  display: flex;
  gap: 16px;
}
.benefits-list .check-icon {
  color: #fff;
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}
.benefits-list strong {
  display: block;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}
.benefits-list p {
  color: #888;
  margin: 0;
  font-size: 14px;
}
.log-window {
  background: #0d0d0d;
  border-radius: 12px;
  border: 1px solid #333;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}
.log-header {
  padding: 12px 16px;
  background: #111;
  border-bottom: 1px solid #222;
  display: flex;
  align-items: center;
  gap: 12px;
}
.log-dots {
  display: flex;
  gap: 6px;
}
.log-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.log-dots span:nth-child(1) { background: #ff5f56; }
.log-dots span:nth-child(2) { background: #ffbd2e; }
.log-dots span:nth-child(3) { background: #27c93f; }
.log-title {
  font-size: 13px;
  color: #666;
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
  will-change: transform;
  transform: translateZ(0);
}
.track-up {
  animation: scrollUp 20s linear infinite;
}
.track-down {
  animation: scrollDown 20s linear infinite;
}
@keyframes scrollUp {
  0% { transform: translateY(0); }
  100% { transform: translateY(-50%); }
}
@keyframes scrollDown {
  0% { transform: translateY(-50%); }
  100% { transform: translateY(0); }
}
.log-line {
  display: flex;
  gap: 16px;
  padding: 12px;
  color: #888;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 8px;
  min-height: 40px;
  align-items: center;
}
.log-time {
  color: #555;
  min-width: 65px;
}
.log-user {
  color: #a0a0a0;
  font-weight: 600;
  min-width: 55px;
}
.log-action {
  color: #888;
  flex: 1;
}

/* Pricing */
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 32px;
  align-items: center;
}

.pricing-card {
  background: #0d0d0d;
  border: 1px solid #1f1f1f;
  border-radius: 24px;
  padding: 40px;
  position: relative;
}

.pricing-card.premium {
  background: #111;
  border-color: #333;
  transform: scale(1.05);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
}

.popular-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: #fff;
  color: #000;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 16px;
  border-radius: 100px;
  text-transform: uppercase;
}

.pricing-header {
  margin-bottom: 32px;
}
.pricing-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #a0a0a0;
  margin: 0 0 12px;
}
.price {
  font-size: 48px;
  font-weight: 800;
  color: #fff;
}
.price span:first-child {
  font-size: 24px;
  vertical-align: super;
  margin-right: 4px;
}
.period {
  font-size: 16px;
  color: #666;
  font-weight: 500;
}

.pricing-features {
  list-style: none;
  padding: 0;
  margin: 0 0 40px;
}
.pricing-features li {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #d0d0d0;
  margin-bottom: 16px;
  font-size: 15px;
}
.pricing-features li .anticon {
  color: #fff;
}

/* Footer */
.footer {
  border-top: 1px solid #1f1f1f;
  padding: 80px 24px 40px;
  background: #080808;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 64px;
  margin-bottom: 64px;
}

.brand-logo-small {
  height: 56px;
  margin-bottom: 16px;
}
.footer-brand p {
  color: #666;
  max-width: 200px;
  line-height: 1.6;
}

.footer-links {
  display: flex;
  gap: 64px;
}
.link-group h4 {
  color: #fff;
  font-weight: 600;
  margin: 0 0 24px;
}
.link-group a {
  display: block;
  color: #666;
  margin-bottom: 12px;
  text-decoration: none;
  transition: color 0.2s;
  cursor: pointer;
}
.link-group a:hover {
  color: #fff;
}

.footer-bottom {
  max-width: 1200px;
  margin: 0 auto;
  border-top: 1px solid #1f1f1f;
  padding-top: 24px;
  color: #555;
  font-size: 14px;
  text-align: center;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 48px;
  }
  .hero-cta {
    flex-direction: column;
  }
  .nav-links {
    display: none;
  }
  .pricing-card.premium {
    transform: scale(1);
  }
  .team-control-content {
    grid-template-columns: 1fr;
    gap: 40px;
  }
}
</style>
