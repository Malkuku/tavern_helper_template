<template>
  <CharacterPanel
    name="橘瑠奈"
    :theme="theme"
    :character="character"
    :dev-level="devLevel"
    :sex-data="sexData"
    :training-data="trainingData"
  />
</template>
<script setup lang="ts">
import CharacterPanel from '../components/CharacterPanel.vue';
import { useStatStore } from '../store/StatStore';
const statStore = useStatStore();
const theme = computed(() => statStore.stat_data?.theme || 'light');
const character = computed(() => statStore.stat_data?.角色?.橘瑠奈);
const devLevel = computed(() => statStore.stat_data?.身体开发等级?.橘瑠奈 || {});
const sexData = computed(() => statStore.stat_data?.数据总览?.橘瑠奈.性交次数 || {});
const trainingData = computed(() => statStore.stat_data?.数据总览?.橘瑠奈.调教回忆 || {});
</script>
