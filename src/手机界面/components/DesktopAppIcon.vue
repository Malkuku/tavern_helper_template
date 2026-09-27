<template>
  <span
    class="app-icon"
    :class="{ 'wechat-icon': name === '微信', 'calendar-icon': name === '日历' }"
    :style="{ background: app?.color }"
    aria-hidden="true"
  >
    <DataAppIcon v-if="isDataApp(name)" :kind="name" />
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
    <span v-else-if="name === '日历'" class="calendar-date">{{ today }}</span>
    <template v-else-if="name !== '微信'">{{ app?.icon }}</template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { apps, dockApps, isDataApp } from '../desktopApps';
import DataAppIcon from './DataAppIcon.vue';

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
</style>
