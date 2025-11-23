<script setup lang="ts">
import { router } from "@/config/router";
import {
  CloudServerOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  GlobalOutlined,
  RocketOutlined,
  CustomerServiceOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  TeamOutlined
} from "@ant-design/icons-vue";
import { message } from "ant-design-vue";
import { onMounted, ref } from "vue";

const showContent = ref(false);
const showFeatures = ref(false);
const showServices = ref(false);
const showCTA = ref(false);

const goToLogin = () => {
  router.push("/login");
};

const goToRegister = () => {
  router.push("/register");
};

const showUnderDevelopment = () => {
  message.info("This feature is under development. Check back soon!");
};

onMounted(() => {
  // Stagger animations
  setTimeout(() => showContent.value = true, 100);
  setTimeout(() => showFeatures.value = true, 400);
  setTimeout(() => showServices.value = true, 700);
  setTimeout(() => showCTA.value = true, 1000);
});
</script>

<template>
  <div class="landing-page">
    <!-- Background Image with Blur -->
    <div class="background-image"></div>

    <!-- Animated Background -->
    <div class="background-effects">
      <div class="grid-overlay"></div>
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
    </div>

    <!-- Navigation -->
    <nav class="landing-nav">
      <div class="nav-brand">
        <img src="/favicon.png" alt="Tirnue" class="nav-logo" />
        <span class="nav-title">Tirnue</span>
      </div>
      <div class="nav-actions">
        <a-button class="nav-signin-secondary" @click="goToLogin">
          Sign In
        </a-button>
        <a-button type="primary" class="nav-register" @click="goToRegister">
          Register Now
          <ArrowRightOutlined />
        </a-button>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero-section" :class="{ show: showContent }">
      <div class="hero-content">
        <div class="hero-badge">
          <span class="badge-dot"></span>
          Powered by MCS Manager
        </div>
        <h1 class="hero-title">
          Your
          <span class="highlight">Game Server</span>
          Hosting
        </h1>
        <p class="hero-subtitle">
          We're a small startup focused on providing honest, reliable game server hosting.
          No gimmicks, just straightforward service you can trust.
        </p>
        <div class="hero-actions">
          <a-button type="primary" size="large" class="cta-primary" @click="goToRegister">
            Register Now
            <ArrowRightOutlined />
          </a-button>
          <a-button size="large" class="cta-secondary" @click="goToLogin">
            Sign In
          </a-button>
        </div>
        <div class="hero-stats">
          <div class="stat-item">
            <span class="stat-value">Honest</span>
            <span class="stat-label">Pricing</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">Real</span>
            <span class="stat-label">Support</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">Growing</span>
            <span class="stat-label">Together</span>
          </div>
        </div>
      </div>
      <div class="hero-visual">
        <div class="server-illustration">
          <img src="/favicon.png" alt="Tirnue Server" class="hero-logo" />
          <div class="orbit orbit-1">
            <div class="orbit-dot"></div>
          </div>
          <div class="orbit orbit-2">
            <div class="orbit-dot"></div>
          </div>
          <div class="orbit orbit-3">
            <div class="orbit-dot"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features-section" :class="{ show: showFeatures }">
      <h2 class="section-title">What We Offer</h2>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">
            <SafetyCertificateOutlined />
          </div>
          <h3>DDoS Protection</h3>
          <p>Basic DDoS protection included with your server to help keep things running.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <GlobalOutlined />
          </div>
          <h3>Dedicated IPs</h3>
          <p>Your own IP address included. No extra charges for the basics.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <ThunderboltOutlined />
          </div>
          <h3>Solid Hardware</h3>
          <p>We use reliable hardware that gets the job done. Nothing fancy, just works.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <CloudServerOutlined />
          </div>
          <h3>Easy Setup</h3>
          <p>Simple server deployment through our panel. We try to make it painless.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <RocketOutlined />
          </div>
          <h3>Fair Pricing</h3>
          <p>Transparent pricing with no hidden fees. What you see is what you pay.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <CustomerServiceOutlined />
          </div>
          <h3>We Actually Reply</h3>
          <p>Real humans answering your questions. We're small, so we actually care.</p>
        </div>
      </div>
    </section>

    <!-- Services Section -->
    <section class="services-section" :class="{ show: showServices }">
      <h2 class="section-title">Our Services</h2>
      <div class="services-grid">
        <div class="service-card premium">
          <div class="service-badge">Main</div>
          <h3>Managed Hosting</h3>
          <p class="service-desc">We host and manage your game servers</p>
          <ul class="service-features">
            <li><CheckCircleOutlined /> Server setup included</li>
            <li><CheckCircleOutlined /> Basic mod support</li>
            <li><CheckCircleOutlined /> Easy file manager</li>
            <li><CheckCircleOutlined /> Direct support</li>
          </ul>
          <a-button type="primary" block class="service-btn" @click="goToRegister">
            Register Now
          </a-button>
        </div>
        <div class="service-card">
          <h3>Bring Your Own</h3>
          <p class="service-desc">Connect your existing servers to our panel</p>
          <ul class="service-features">
            <li><CheckCircleOutlined /> Remote management</li>
            <li><CheckCircleOutlined /> Single dashboard</li>
            <li><CheckCircleOutlined /> Works with most setups</li>
            <li><CheckCircleOutlined /> API access</li>
          </ul>
          <a-button block class="service-btn-secondary" @click="showUnderDevelopment">
            Learn More
          </a-button>
        </div>
        <div class="service-card">
          <h3>Need Something Else?</h3>
          <p class="service-desc">We're flexible - just ask</p>
          <ul class="service-features">
            <li><CheckCircleOutlined /> Custom setups</li>
            <li><CheckCircleOutlined /> Special requirements</li>
            <li><CheckCircleOutlined /> We'll figure it out</li>
            <li><CheckCircleOutlined /> Honest pricing</li>
          </ul>
          <a-button block class="service-btn-secondary" @click="showUnderDevelopment">
            Contact Us
          </a-button>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section" :class="{ show: showCTA }">
      <div class="cta-content">
        <h2>Want to Give Us a Try?</h2>
        <p>We're a small team building something we believe in. Come check it out.</p>
        <a-button type="primary" size="large" class="cta-final" @click="goToRegister">
          <img src="/favicon.png" alt="" class="btn-icon" />
          Create Your Account
          <ArrowRightOutlined />
        </a-button>
      </div>
    </section>

    <!-- Join Team Section -->
    <section class="join-team-section" :class="{ show: showCTA }">
      <div class="join-team-content">
        <div class="join-team-icon">
          <TeamOutlined />
        </div>
        <h2>Join Our Team</h2>
        <p>We're always looking for passionate people to help us grow. Whether you're into development, support, or community management - we'd love to hear from you.</p>
        <div class="join-team-roles">
          <span class="role-tag">Developers</span>
          <span class="role-tag">Support Staff</span>
          <span class="role-tag">Community Mods</span>
        </div>
        <a-button size="large" class="join-team-btn" @click="showUnderDevelopment">
          <TeamOutlined />
          Get in Touch
        </a-button>
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="footer-content">
        <div class="footer-brand">
          <img src="/favicon.png" alt="Tirnue" class="footer-logo" />
          <span>Tirnue</span>
        </div>
        <p class="footer-notice">Links and buttons under construction for future services</p>
        <p class="footer-powered">Powered by MCS Manager</p>
        <p class="footer-copy">&copy; 2025 Tirnue. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<style lang="scss" scoped>
.landing-page {
  position: fixed;
  inset: 0;
  min-height: 100vh;
  background: #050505;
  color: white;
  overflow-x: hidden;
  overflow-y: auto;
  z-index: 9999;
}

// Blurred Background Image
.background-image {
  position: fixed;
  inset: 0;
  z-index: 0;
  background-image: url('/landing-bg.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  filter: blur(8px);
  transform: scale(1.1); // Prevent blur edge artifacts
  opacity: 0.3;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      rgba(5, 5, 5, 0.9) 0%,
      rgba(255, 140, 66, 0.1) 50%,
      rgba(5, 5, 5, 0.95) 100%
    );
  }
}

// Background Effects
.background-effects {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 140, 66, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 140, 66, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.15;

  &.orb-1 {
    width: 600px;
    height: 600px;
    background: #FF8C42;
    top: -200px;
    right: -200px;
  }

  &.orb-2 {
    width: 500px;
    height: 500px;
    background: #D4AF37;
    bottom: 20%;
    left: -200px;
  }

  &.orb-3 {
    width: 400px;
    height: 400px;
    background: #FF6B35;
    bottom: -100px;
    right: 20%;
  }
}

// Navigation
.landing-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 60px;
  background: rgba(5, 5, 5, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 140, 66, 0.1);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-logo {
  width: 40px;
  height: 40px;
}

.nav-title {
  font-size: 24px;
  font-weight: 800;
  background: linear-gradient(135deg, #FF8C42, #D4AF37);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-signin-secondary {
  height: 44px;
  padding: 0 24px;
  font-weight: 600;
  border-radius: 8px;
  background: transparent;
  border: 2px solid rgba(255, 140, 66, 0.3);
  color: white;

  &:hover {
    border-color: #FF8C42;
    color: #FF8C42;
    background: rgba(255, 140, 66, 0.05);
  }
}

.nav-register {
  height: 44px;
  padding: 0 24px;
  font-weight: 600;
  border-radius: 8px;
  background: linear-gradient(135deg, #FF8C42, #FF6B35);
  border: none;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: linear-gradient(135deg, #FF6B35, #FF5A24);
  }
}

// Hero Section
.hero-section {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 60px;
  padding: 120px 60px 60px;
  position: relative;
  z-index: 1;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s ease;

  &.show {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero-content {
  max-width: 600px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 140, 66, 0.1);
  border: 1px solid rgba(255, 140, 66, 0.3);
  border-radius: 20px;
  font-size: 14px;
  color: #FF8C42;
  margin-bottom: 24px;
}

.badge-dot {
  width: 8px;
  height: 8px;
  background: #FF8C42;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.hero-title {
  font-size: 56px;
  font-weight: 800;
  line-height: 1.1;
  margin: 0 0 24px;

  .highlight {
    display: block;
    background: linear-gradient(135deg, #FF8C42, #D4AF37);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

.hero-subtitle {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  margin-bottom: 32px;
}

.hero-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 48px;
}

.cta-primary {
  height: 52px;
  padding: 0 32px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 10px;
  background: linear-gradient(135deg, #FF8C42, #FF6B35);
  border: none;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 20px rgba(255, 140, 66, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 30px rgba(255, 140, 66, 0.4);
  }
}

.cta-secondary {
  height: 52px;
  padding: 0 32px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 10px;
  border: 2px solid rgba(255, 140, 66, 0.3);
  background: transparent;
  color: white;

  &:hover {
    border-color: #FF8C42;
    color: #FF8C42;
  }
}

.hero-stats {
  display: flex;
  align-items: center;
  gap: 24px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(135deg, #FF8C42, #D4AF37);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: rgba(255, 140, 66, 0.3);
}

// Hero Visual
.hero-visual {
  display: flex;
  justify-content: center;
  align-items: center;
}

.server-illustration {
  position: relative;
  width: 400px;
  height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.hero-logo {
  width: 150px;
  height: 150px;
  filter: drop-shadow(0 20px 40px rgba(255, 140, 66, 0.3));
  z-index: 2;
}

.orbit {
  position: absolute;
  border: 1px solid rgba(255, 140, 66, 0.2);
  border-radius: 50%;

  &.orbit-1 {
    width: 250px;
    height: 250px;
    animation: spin 20s linear infinite;
  }

  &.orbit-2 {
    width: 320px;
    height: 320px;
    animation: spin 30s linear infinite reverse;
  }

  &.orbit-3 {
    width: 390px;
    height: 390px;
    animation: spin 40s linear infinite;
  }
}

.orbit-dot {
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 8px;
  height: 8px;
  background: #FF8C42;
  border-radius: 50%;
  box-shadow: 0 0 10px #FF8C42;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// Features Section
.features-section {
  padding: 100px 60px;
  position: relative;
  z-index: 1;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s ease;

  &.show {
    opacity: 1;
    transform: translateY(0);
  }
}

.section-title {
  text-align: center;
  font-size: 40px;
  font-weight: 800;
  margin-bottom: 60px;
  background: linear-gradient(135deg, #FF8C42, #D4AF37);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.feature-card {
  padding: 32px;
  background: rgba(10, 10, 10, 0.8);
  border: 1px solid rgba(255, 140, 66, 0.15);
  border-radius: 16px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(255, 140, 66, 0.4);
    background: rgba(15, 15, 15, 0.9);
  }

  h3 {
    font-size: 20px;
    font-weight: 700;
    margin: 16px 0 12px;
  }

  p {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.6;
    margin: 0;
  }
}

.feature-icon {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, rgba(255, 140, 66, 0.2), rgba(212, 175, 55, 0.2));
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #FF8C42;
}

// Services Section
.services-section {
  padding: 100px 60px;
  position: relative;
  z-index: 1;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s ease;

  &.show {
    opacity: 1;
    transform: translateY(0);
  }
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.service-card {
  padding: 32px;
  background: rgba(10, 10, 10, 0.8);
  border: 1px solid rgba(255, 140, 66, 0.15);
  border-radius: 16px;
  position: relative;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(255, 140, 66, 0.4);
  }

  &.premium {
    border-color: rgba(255, 140, 66, 0.5);
    background: linear-gradient(135deg, rgba(255, 140, 66, 0.1), rgba(10, 10, 10, 0.9));
  }

  h3 {
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 8px;
  }
}

.service-badge {
  position: absolute;
  top: -12px;
  right: 24px;
  padding: 6px 16px;
  background: linear-gradient(135deg, #FF8C42, #FF6B35);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
}

.service-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 24px;
}

.service-features {
  list-style: none;
  padding: 0;
  margin: 0 0 24px;

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);

    :deep(.anticon) {
      color: #FF8C42;
    }
  }
}

.service-btn {
  height: 44px;
  font-weight: 600;
  border-radius: 8px;
  background: linear-gradient(135deg, #FF8C42, #FF6B35);
  border: none;
}

.service-btn-secondary {
  height: 44px;
  font-weight: 600;
  border-radius: 8px;
  border: 2px solid rgba(255, 140, 66, 0.3);
  background: transparent;
  color: white;

  &:hover {
    border-color: #FF8C42;
    color: #FF8C42;
  }
}

// CTA Section
.cta-section {
  padding: 100px 60px;
  position: relative;
  z-index: 1;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s ease;

  &.show {
    opacity: 1;
    transform: translateY(0);
  }
}

.cta-content {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
  padding: 60px;
  background: linear-gradient(135deg, rgba(255, 140, 66, 0.1), rgba(10, 10, 10, 0.9));
  border: 1px solid rgba(255, 140, 66, 0.3);
  border-radius: 24px;

  h2 {
    font-size: 36px;
    font-weight: 800;
    margin: 0 0 16px;
  }

  p {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 32px;
  }
}

.cta-final {
  height: 56px;
  padding: 0 32px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  background: linear-gradient(135deg, #FF8C42, #FF6B35);
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 20px rgba(255, 140, 66, 0.4);
}

.btn-icon {
  width: 24px;
  height: 24px;
}

// Join Team Section
.join-team-section {
  padding: 80px 60px;
  position: relative;
  z-index: 1;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s ease;
  transition-delay: 0.2s;

  &.show {
    opacity: 1;
    transform: translateY(0);
  }
}

.join-team-content {
  max-width: 700px;
  margin: 0 auto;
  text-align: center;
  padding: 48px;
  background: linear-gradient(135deg, rgba(212, 175, 55, 0.08), rgba(10, 10, 10, 0.9));
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 24px;

  h2 {
    font-size: 32px;
    font-weight: 800;
    margin: 0 0 16px;
    background: linear-gradient(135deg, #D4AF37, #FF8C42);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  p {
    font-size: 15px;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 24px;
    line-height: 1.7;
  }
}

.join-team-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(255, 140, 66, 0.2));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #D4AF37;
}

.join-team-roles {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-bottom: 28px;
}

.role-tag {
  padding: 8px 16px;
  background: rgba(212, 175, 55, 0.1);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 20px;
  font-size: 13px;
  color: #D4AF37;
  font-weight: 500;
}

.join-team-btn {
  height: 48px;
  padding: 0 28px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 12px;
  background: transparent;
  border: 2px solid #D4AF37;
  color: #D4AF37;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(212, 175, 55, 0.15);
    border-color: #FF8C42;
    color: #FF8C42;
  }
}

// Footer
.landing-footer {
  padding: 40px 60px;
  border-top: 1px solid rgba(255, 140, 66, 0.1);
  position: relative;
  z-index: 1;
}

.footer-content {
  text-align: center;
}

.footer-brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;

  span {
    font-size: 18px;
    font-weight: 700;
    background: linear-gradient(135deg, #FF8C42, #D4AF37);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

.footer-logo {
  width: 28px;
  height: 28px;
}

.footer-notice {
  font-size: 13px;
  color: rgba(255, 140, 66, 0.7);
  margin: 0 0 12px;
  font-style: italic;
}

.footer-powered {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 8px;
}

.footer-copy {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  margin: 0;
}

// Responsive
@media (max-width: 1200px) {
  .hero-section {
    grid-template-columns: 1fr;
    text-align: center;
    padding-top: 140px;
  }

  .hero-content {
    max-width: 100%;
  }

  .hero-actions {
    justify-content: center;
  }

  .hero-stats {
    justify-content: center;
  }

  .hero-visual {
    display: none;
  }

  .features-grid,
  .services-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .landing-nav {
    padding: 12px 16px;
  }

  .nav-logo {
    width: 32px;
    height: 32px;
  }

  .nav-title {
    font-size: 18px;
  }

  .nav-actions {
    gap: 8px;
  }

  .nav-signin-secondary {
    height: 36px;
    padding: 0 12px;
    font-size: 13px;
  }

  .nav-register {
    height: 36px;
    padding: 0 12px;
    font-size: 13px;
  }

  .hero-section {
    padding: 100px 16px 60px;
    min-height: auto;
  }

  .hero-badge {
    font-size: 12px;
    padding: 6px 12px;
  }

  .hero-title {
    font-size: 28px;
  }

  .hero-subtitle {
    font-size: 14px;
    margin-bottom: 24px;
  }

  .hero-actions {
    flex-direction: column;
    gap: 12px;
  }

  .cta-primary,
  .cta-secondary {
    width: 100%;
    height: 48px;
  }

  .hero-stats {
    flex-direction: column;
    gap: 16px;
  }

  .stat-divider {
    display: none;
  }

  .stat-value {
    font-size: 22px;
  }

  .features-section,
  .services-section,
  .cta-section,
  .join-team-section {
    padding: 60px 16px;
  }

  .join-team-content {
    padding: 32px 20px;

    h2 {
      font-size: 24px;
    }

    p {
      font-size: 14px;
    }
  }

  .join-team-icon {
    width: 56px;
    height: 56px;
    font-size: 24px;
  }

  .role-tag {
    padding: 6px 12px;
    font-size: 12px;
  }

  .join-team-btn {
    height: 44px;
    font-size: 14px;
    width: 100%;
  }

  .features-grid,
  .services-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .feature-card {
    padding: 24px;
  }

  .section-title {
    font-size: 24px;
    margin-bottom: 32px;
  }

  .service-card {
    padding: 24px;
  }

  .cta-content {
    padding: 32px 20px;

    h2 {
      font-size: 24px;
    }

    p {
      font-size: 14px;
    }
  }

  .cta-final {
    height: 48px;
    padding: 0 20px;
    font-size: 14px;
  }

  .landing-footer {
    padding: 32px 16px;
  }

  .footer-notice {
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 24px;
  }

  .feature-icon {
    width: 48px;
    height: 48px;
    font-size: 24px;
  }

  .feature-card h3 {
    font-size: 16px;
  }

  .feature-card p {
    font-size: 13px;
  }

  .service-card h3 {
    font-size: 18px;
  }
}
</style>
