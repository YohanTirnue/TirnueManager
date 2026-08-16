<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

const props = withDefaults(
  defineProps<{
    size?: "sm" | "md" | "lg" | number;
  }>(),
  {
    size: "md"
  }
);

const pixelSize = computed(() => {
  if (typeof props.size === "number") return props.size;
  if (props.size === "sm") return 120;
  if (props.size === "lg") return 280;
  return 200; // default 'md' - BIG, BOLD AND PROMINENT!
});

// Binary streams & face binary loop (00 -> 01 -> 10 -> 11)
const bitStream1 = ref("01101001");
const bitStream2 = ref("10010110");
const hexCode = ref("0xFA");

const binaryLoop = ["00", "01", "10", "11"];
const faceDigit = ref("00");
let stepCount = 0;

let interval: any = null;

onMounted(() => {
  interval = setInterval(() => {
    let b1 = "", b2 = "";
    for (let i = 0; i < 8; i++) {
      b1 += Math.random() > 0.5 ? "1" : "0";
      b2 += Math.random() > 0.5 ? "1" : "0";
    }
    bitStream1.value = b1;
    bitStream2.value = b2;
    hexCode.value = "0x" + Math.floor(Math.random() * 255).toString(16).toUpperCase().padStart(2, "0");

    stepCount++;
    if (stepCount % 3 === 0) {
      const idx = Math.floor(stepCount / 3) % binaryLoop.length;
      faceDigit.value = binaryLoop[idx];
    }
  }, 85);
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
});
</script>

<template>
  <div class="cyber-glitch-loader" :style="{ width: `${pixelSize}px`, height: `${pixelSize}px` }">
    <!-- Outer Cyber Brackets Frame -->
    <div class="corner-bracket top-left"></div>
    <div class="corner-bracket top-right"></div>
    <div class="corner-bracket bottom-left"></div>
    <div class="corner-bracket bottom-right"></div>

    <!-- Scanning Light Line -->
    <div class="scanline"></div>

    <!-- Top Running Bit Stream -->
    <div class="bit-row bit-top-glitch">{{ bitStream1 }}</div>

    <!-- Central Glitch Box with Logo & 00/01/10/11 Face -->
    <div class="glitch-center">
      <div class="glitch-mark">
        <svg viewBox="0 0 100 100" :width="pixelSize * 0.68" :height="pixelSize * 0.68" class="center-svg">
          <!-- Cyber ring -->
          <circle cx="50" cy="50" r="46" class="cyber-ring ring-outer" />
          <circle cx="50" cy="50" r="38" class="cyber-ring ring-inner" />

          <g class="mark">
            <!-- horns -->
            <path d="M36 28 C28 36 26 48 34 56 C31 47 33 38 40 32 Z" />
            <path d="M64 28 C72 36 74 48 66 56 C69 47 67 38 60 32 Z" />
            <!-- inner ears -->
            <path d="M43 38 C39 44 39 52 44 56 C46 52 46 44 45 40 Z" />
            <path d="M57 38 C61 44 61 52 56 56 C54 52 54 44 55 40 Z" />
            <!-- shield face -->
            <path class="outline" d="M50 40 L63 48 L63 64 L50 72 L37 64 L37 48 Z" />
            <!-- 00 -> 01 -> 10 -> 11 LOOP INSIDE THE FACE -->
            <text x="50" y="60" font-size="11" font-weight="900" font-family="Courier New, monospace" fill="#ffffff" text-anchor="middle" letter-spacing="1" class="face-digits">{{ faceDigit }}</text>
          </g>
        </svg>
      </div>

      <!-- Side Bit Data Particles -->
      <span class="particle particle-1">{{ bitStream1.slice(0, 4) }}</span>
      <span class="particle particle-2">{{ bitStream2.slice(0, 4) }}</span>
    </div>

    <!-- Bottom Hex Code Stream -->
    <div class="bit-row bit-bottom-glitch">{{ bitStream2 }} <span class="hex-tag">[{{ hexCode }}]</span></div>
  </div>
</template>

<style lang="scss" scoped>
.cyber-glitch-loader {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  user-select: none;
  font-family: "Courier New", Courier, monospace;
  padding: 12px;
}

/* Cyber Corner Brackets */
.corner-bracket {
  position: absolute;
  width: 14px;
  height: 14px;
  border-color: rgba(255, 255, 255, 0.6);
  border-style: solid;
  pointer-events: none;

  &.top-left {
    top: -2px;
    left: -2px;
    border-width: 2px 0 0 2px;
  }
  &.top-right {
    top: -2px;
    right: -2px;
    border-width: 2px 2px 0 0;
  }
  &.bottom-left {
    bottom: -2px;
    left: -2px;
    border-width: 0 0 2px 2px;
  }
  &.bottom-right {
    bottom: -2px;
    right: -2px;
    border-width: 0 2px 2px 0;
  }
}

/* Scanning Light Line */
.scanline {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.95), transparent);
  box-shadow: 0 0 12px #ffffff;
  animation: scan 2s linear infinite;
  pointer-events: none;
  z-index: 2;
}

@keyframes scan {
  0% {
    top: 0;
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  85% {
    opacity: 1;
  }
  100% {
    top: 100%;
    opacity: 0;
  }
}

.bit-row {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 4px;
  color: #ffffff;
  opacity: 0.9;
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.8);
  animation: glitch-text 0.8s steps(2, start) infinite;

  .hex-tag {
    font-size: 12px;
    opacity: 0.75;
    margin-left: 4px;
  }
}

.glitch-center {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 10px 0;
}

.cyber-ring {
  fill: none;
  stroke: #ffffff;
  stroke-linecap: round;
  transform-origin: center;

  &.ring-outer {
    stroke-width: 1.8;
    stroke-dasharray: 24 180;
    animation: rotate-ring 2.2s linear infinite;
  }

  &.ring-inner {
    stroke-width: 1.4;
    stroke-dasharray: 14 120;
    opacity: 0.4;
    animation: rotate-ring 1.6s linear infinite reverse;
  }
}

@keyframes rotate-ring {
  to {
    transform: rotate(360deg);
  }
}

.glitch-mark {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse-glitch 1.2s ease-in-out infinite;

  .center-svg {
    filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.95));

    .mark path,
    .mark polygon {
      fill: #ffffff;
    }
    .mark .outline {
      fill: none;
      stroke: #ffffff;
      stroke-width: 2;
    }
    .face-digits {
      filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.95));
      animation: digit-glitch 1s steps(1) infinite;
    }
  }
}

.particle {
  position: absolute;
  font-size: 13px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: 2px;
  pointer-events: none;

  &.particle-1 {
    top: 50%;
    left: -54px;
    transform: translateY(-50%);
    animation: float-left 1.5s ease-in-out infinite alternate;
  }

  &.particle-2 {
    top: 50%;
    right: -54px;
    transform: translateY(-50%);
    animation: float-right 1.5s ease-in-out infinite alternate;
  }
}

@keyframes digit-glitch {
  0%,
  100% {
    opacity: 1;
    transform: translate(0);
  }
  33% {
    opacity: 0.7;
    transform: translate(-1px, 0.5px);
  }
  66% {
    opacity: 0.9;
    transform: translate(1px, -0.5px);
  }
}

@keyframes glitch-text {
  0% {
    transform: translate(0);
    opacity: 0.85;
  }
  20% {
    transform: translate(-2px, 1px);
    opacity: 1;
  }
  40% {
    transform: translate(1px, -1px);
    opacity: 0.65;
  }
  60% {
    transform: translate(-1px, -1px);
    opacity: 0.9;
  }
  80% {
    transform: translate(2px, 1px);
    opacity: 0.75;
  }
  100% {
    transform: translate(0);
    opacity: 0.85;
  }
}

@keyframes pulse-glitch {
  0%,
  100% {
    transform: scale(1);
    filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.6));
  }
  50% {
    transform: scale(0.96) skewX(-2deg);
    filter: drop-shadow(0 0 16px rgba(255, 255, 255, 0.98));
  }
}

@keyframes float-left {
  0% {
    transform: translateY(-50%) translateX(0);
    opacity: 0.4;
  }
  100% {
    transform: translateY(-50%) translateX(-6px);
    opacity: 1;
  }
}

@keyframes float-right {
  0% {
    transform: translateY(-50%) translateX(0);
    opacity: 0.4;
  }
  100% {
    transform: translateY(-50%) translateX(6px);
    opacity: 1;
  }
}
</style>
