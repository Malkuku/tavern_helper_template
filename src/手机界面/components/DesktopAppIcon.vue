<template>
  <span
    class="app-icon"
    :class="{
      'wechat-icon': name === '微信',
      'calendar-icon': name === '日历',
      'map-icon': name === '地图',
      'witch-app-icon': name === '魔女恶堕计划',
    }"
    :style="{ background: app?.color }"
    aria-hidden="true"
  >
    <WitchMark v-if="name === '魔女恶堕计划'" class="witch-desktop-mark" />
    <svg v-else-if="name === '照片'" class="photos-icon" viewBox="0 0 48 48" aria-hidden="true">
      <ellipse cx="24" cy="14" rx="7" ry="11" fill="#f9c44e" />
      <ellipse cx="31" cy="17" rx="7" ry="11" fill="#f28c62" transform="rotate(45 31 17)" />
      <ellipse cx="34" cy="24" rx="7" ry="11" fill="#e96a9d" transform="rotate(90 34 24)" />
      <ellipse cx="31" cy="31" rx="7" ry="11" fill="#ad83d1" transform="rotate(135 31 31)" />
      <ellipse cx="24" cy="34" rx="7" ry="11" fill="#6999d8" />
      <ellipse cx="17" cy="31" rx="7" ry="11" fill="#66b9b1" transform="rotate(45 17 31)" />
      <ellipse cx="14" cy="24" rx="7" ry="11" fill="#8fc078" transform="rotate(90 14 24)" />
      <ellipse cx="17" cy="17" rx="7" ry="11" fill="#d3c36a" transform="rotate(135 17 17)" />
      <circle cx="24" cy="24" r="7" fill="#fff" />
    </svg>
    <svg v-else-if="name === '地图'" class="desktop-map-icon" viewBox="0 0 58 58" aria-hidden="true">
      <path d="M0 0h58v58H0z" fill="#e8f5fc" />
      <path d="M0 0h25v22H0z" fill="#d5edcf" />
      <path d="M35 0h23v25H35z" fill="#cceaf4" />
      <path d="M0 34h21v24H0z" fill="#e0f1da" />
      <path d="M32 36h26v22H32z" fill="#cae9d4" />
      <path d="M27 0v58M0 27h58M0 44h18M40 27v31" fill="none" stroke="#fff" stroke-width="5" />
      <path d="m11 35 36-24-13 37-8-14-15 1Z" fill="#1769d4" />
      <path d="m11 35 36-24-21 23Z" fill="#3e95f4" />
      <path d="m26 34 21-23-13 37Z" fill="#0b55b8" />
    </svg>
    <span v-else-if="name === '日历'" class="calendar-date">{{ today }}</span>
    <template v-else-if="name !== '微信'">{{ app?.icon }}</template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { apps, dockApps } from '../desktopApps';
import WitchMark from '../apps/witch/WitchMark.vue';

const props = defineProps<{ name: string; today: number }>();
const app = computed(() => [...apps, ...dockApps].find(item => item.name === props.name));
</script>

<style scoped>
.photos-icon {
  width: 43px;
  height: 43px;
}

.calendar-icon {
  position: relative;
  overflow: hidden;
}

.calendar-icon::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 14px;
  background: #e65555;
}

.calendar-date {
  padding-top: 11px;
  color: #27313d;
  font-size: 30px;
  font-weight: 600;
  line-height: 1;
}

.map-icon {
  overflow: hidden;
}

.desktop-map-icon {
  display: block;
  width: 100%;
  height: 100%;
}
.witch-desktop-mark {
  width: 45px;
  height: 45px;
  filter: drop-shadow(0 0 6px #fa87c088);
}
.witch-app-icon {
  position: relative;
  overflow: hidden;
  border: 1px solid #b26490;
  box-shadow:
    inset 0 1px #ffffff33,
    0 4px 14px #12051f8c;
}
.witch-app-icon::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 45%, #f387b51f 50%, transparent 54%);
  content: '';
  pointer-events: none;
  animation: witch-icon-scan 9s steps(1, end) infinite;
}
@keyframes witch-icon-scan {
  0%,
  94%,
  100% {
    transform: translateY(-70%);
    opacity: 0;
  }
  95% {
    transform: translateY(0);
    opacity: 1;
  }
  96% {
    transform: translateY(60%);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .witch-app-icon::after {
    animation: none;
  }
}
</style>
