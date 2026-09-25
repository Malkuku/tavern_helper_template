<template>
  <main class="home-screen">
    <div class="home-heading">
      <span>今天</span>
      <strong>{{ dateLabel }}</strong>
    </div>
    <div class="app-grid">
      <button v-for="app in apps" :key="app.name" class="app-tile" type="button" @click="emit('open', app.name)">
        <span
          class="app-icon"
          :class="{ 'wechat-icon': app.name === '微信' }"
          :style="{ background: app.color }"
          aria-hidden="true"
          ><DataAppIcon v-if="isDataApp(app.name)" :kind="app.name" />{{
            isDataApp(app.name) || app.name === '微信' ? '' : app.name === '日历' ? today : app.icon
          }}</span
        >
        <span>{{ app.name }}</span>
      </button>
    </div>
    <div class="home-spacer"></div>
    <div class="page-dots" aria-hidden="true"><span></span><span></span></div>
    <div class="dock">
      <button
        v-for="app in dockApps"
        :key="app.name"
        class="dock-tile"
        type="button"
        :aria-label="app.name"
        @click="emit('open', app.name)"
      >
        <span class="app-icon" :style="{ background: app.color }" aria-hidden="true">{{ app.icon }}</span>
      </button>
    </div>
  </main>
</template>

<script setup lang="ts">
import { apps, dockApps, isDataApp } from '../desktopApps';
import DataAppIcon from './DataAppIcon.vue';

defineProps<{ dateLabel: string; today: number }>();
const emit = defineEmits<{ open: [name: string] }>();
</script>
