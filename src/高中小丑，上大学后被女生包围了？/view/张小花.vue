<template>
  <CharacterStatus
    v-if="statData"
    :stat-data="statData"
    character-name="张小花"
    character-avatar="🐨"
    character-identity="懒虫学姐"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'; // 使用 computed 更简洁
import CharacterStatus from './人物状态.vue';
import { useStatStore } from '../store/StatStore';
import type { StatData } from '../types/StatData';

const statStore = useStatStore();

// 使用 computed 自动响应 store 变化
const statData = computed<StatData | null>(() => {
  return statStore.stat_data || null;
});
</script>
