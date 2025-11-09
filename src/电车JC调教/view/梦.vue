<template>
  <CharacterPanel
    name="夜月梦"
    :theme="theme"
    :character="character"
    :dev-level="devLevel"
    :sex-data="sexData"
    :training-data="trainingData"
    :affection-stages="stageMap"
  />
</template>
<script setup lang="ts">
import CharacterPanel from '../components/CharacterPanel.vue';
import { useStatStore } from '../store/StatStore';
const statStore = useStatStore();
const theme = computed(() => statStore.stat_data?.theme || 'light');
const character = computed(() => statStore.stat_data?.角色?.夜月梦);
const devLevel = computed(() => statStore.stat_data?.身体开发等级?.夜月梦 || {});
const sexData = computed(() => statStore.stat_data?.数据总览?.夜月梦.性交次数 || {});
const trainingData = computed(() => statStore.stat_data?.数据总览?.夜月梦.调教回忆 || {});
const stageMap = computed(() => {
  const stages = statStore.stat_data?.好感度阶段 || {}
  const events = statStore.stat_data?.好感度事件 || {}
  return [
    {
      阶段数值: stages['夜月梦']?.阶段三 ?? 0,
      事件: events['梦的真相'] ??
      {
        "事件描述": "未知",
        "已解决": false
      }
    }
  ]
})
</script>
