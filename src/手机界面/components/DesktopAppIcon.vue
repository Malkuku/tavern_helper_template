<template>
  <span
    class="app-icon"
    :class="{
      'calendar-icon': name === '日历',
      'map-icon': name === '地图',
      'witch-app-icon': name === '魔女恶堕计划',
      'first-target-pending': name === '魔女恶堕计划' && statStore.statData?.系统?.已发现目标?.length === 0,
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
    <svg v-else-if="name === '微信'" class="desktop-symbol-icon weline-mark" viewBox="0 0 58 58" aria-hidden="true">
      <rect x="10" y="12" width="38" height="32" rx="11" fill="#fff" fill-opacity=".96" />
      <path d="m20 44-3 6 11-6" fill="#fff" fill-opacity=".96" />
      <path d="M18 27h14m-14 7h20" fill="none" stroke="#6477bd" stroke-width="3.4" stroke-linecap="round" />
      <circle cx="40" cy="25" r="3.2" fill="#eea8b5" />
    </svg>
    <svg v-else-if="name === '信息'" class="desktop-symbol-icon" viewBox="0 0 58 58" aria-hidden="true">
      <path
        d="M29 8C16 8 5.5 16.6 5.5 27.2c0 5.1 2.4 9.7 6.4 13.2L9.7 49l9.1-4.7c3.1 1.4 6.6 2.2 10.2 2.2 13 0 23.5-8.6 23.5-19.3S42 8 29 8Z"
        fill="#fff"
      />
      <circle cx="19" cy="27" r="2.3" fill="#28bd4f" />
      <circle cx="29" cy="27" r="2.3" fill="#28bd4f" />
      <circle cx="39" cy="27" r="2.3" fill="#28bd4f" />
    </svg>
    <svg v-else-if="name === '浏览器'" class="desktop-symbol-icon" viewBox="0 0 58 58" aria-hidden="true">
      <circle cx="29" cy="29" r="22" fill="#fff" />
      <circle cx="29" cy="29" r="18.5" fill="#eaf7ff" stroke="#6dc0f2" stroke-width="1.5" />
      <path d="M29 13v3M29 42v3M13 29h3M42 29h3" stroke="#57a8df" stroke-width="1.8" stroke-linecap="round" />
      <path d="m37 21-6 10-10 6 8-8 8-8Z" fill="#f05c5b" />
      <path d="m37 21-8 8-8 8 6-10 10-6Z" fill="#2375c5" />
      <circle cx="29" cy="29" r="2" fill="#fff" />
    </svg>
    <svg v-else-if="name === '文件'" class="desktop-symbol-icon" viewBox="0 0 58 58" aria-hidden="true">
      <path
        d="M6 15.5a4 4 0 0 1 4-4h13l4.5 5H48a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4v-29Z"
        fill="#fff"
        opacity=".72"
      />
      <path d="M6 24a4 4 0 0 1 4-4h38a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V24Z" fill="#fff" />
      <path d="M17 29h24M17 35h20" stroke="#4c9bed" stroke-width="2.5" stroke-linecap="round" />
    </svg>
    <span v-else-if="name === '日历'" class="calendar-date">{{ today }}</span>
    <template v-else>{{ app?.icon }}</template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { apps, dockApps } from '../desktopApps';
import WitchMark from '../apps/witch/WitchMark.vue';
import { useMagicGirlStatStore } from '../store/StatStore';

const props = defineProps<{ name: string; today: number }>();
const app = computed(() => [...apps, ...dockApps].find(item => item.name === props.name));
const statStore = useMagicGirlStatStore();
</script>

<style scoped>
.photos-icon {
  width: 43px;
  height: 43px;
}

.desktop-symbol-icon {
  display: block;
  width: 52px;
  height: 52px;
}

.weline-mark {
  width: 56px;
  height: 56px;
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
.witch-app-icon.first-target-pending {
  overflow: visible;
  animation: witch-icon-shiver 1.8s ease-in-out infinite;
}
.witch-app-icon.first-target-pending::before {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #ffd7ed;
  box-shadow:
    -19px -24px #f08bb7,
    18px -27px #ffd7ed,
    27px 4px #c77ce8,
    20px 22px #f08bb7,
    -8px 30px #ffd7ed,
    -28px 10px #c77ce8;
  content: '';
  pointer-events: none;
  animation: witch-icon-particles 1.8s ease-out infinite;
}
@keyframes witch-icon-shiver {
  0%,
  30%,
  55%,
  100% {
    transform: rotate(0);
  }
  35%,
  45% {
    transform: rotate(-4deg);
  }
  40%,
  50% {
    transform: rotate(4deg);
  }
}
@keyframes witch-icon-particles {
  0% {
    transform: translate(-50%, -50%) scale(0.35);
    opacity: 0;
  }
  35% {
    opacity: 0.9;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.9);
    opacity: 0;
  }
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
  .witch-app-icon.first-target-pending,
  .witch-app-icon.first-target-pending::before,
  .witch-app-icon::after {
    animation: none;
  }
}
</style>
