<template>
  <span
    class="app-icon"
    :class="{ 'wechat-icon': name === '微信' }"
    :style="{ background: app?.color }"
    aria-hidden="true"
  >
    <DataAppIcon v-if="isDataApp(name)" :kind="name" />
    <template v-else-if="name !== '微信'">{{ name === '日历' ? today : app?.icon }}</template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { apps, dockApps, isDataApp } from '../desktopApps';
import DataAppIcon from './DataAppIcon.vue';

const props = defineProps<{ name: string; today: number }>();
const app = computed(() => [...apps, ...dockApps].find(item => item.name === props.name));
</script>
