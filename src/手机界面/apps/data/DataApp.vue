<template>
  <div class="data-app">
    <header class="data-header">
      <button type="button" class="data-back" aria-label="返回桌面" @click="emit('back')">‹ <span>桌面</span></button>
      <strong>{{ app }}</strong>
      <span class="data-header-space"></span>
    </header>
    <div class="data-scroll">
      <div v-if="!statStore.statData" class="data-empty">
        <span class="data-empty-mark">✧</span>
        <strong>暂无角色变量</strong>
        <p>当前消息楼层还没有可展示的数据。</p>
      </div>
      <MainCharacters v-else-if="app === '主要角色'" :data="statStore.statData" />
      <MinorCharacters v-else-if="app === '次要角色'" :data="statStore.statData" />
      <Profile v-else-if="app === '我的档案'" :data="statStore.statData" />
      <Skills v-else-if="app === '技能'" :data="statStore.statData" />
      <Items v-else-if="app === '随身物品' || app === '仓库'" :app="app" :data="statStore.statData" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMagicGirlStatStore } from '../../store/StatStore';
import type { DataAppName } from '../../desktopApps';
import MainCharacters from './MainCharacters.vue';
import MinorCharacters from './MinorCharacters.vue';
import Profile from './Profile.vue';
import Skills from './Skills.vue';
import Items from './Items.vue';

defineProps<{ app: DataAppName }>();
const emit = defineEmits<{ back: [] }>();
const statStore = useMagicGirlStatStore();
</script>

<style src="../../styles/data.css"></style>
