<template>
  <div class="stage-experience">
    <div class="stage-experience-label">
      <span>{{ label }}</span>
      <strong>{{ value }}</strong>
    </div>
    <div
      v-if="cost !== null"
      class="stage-experience-track"
      role="progressbar"
      :aria-label="`${kind}${label}`"
      :aria-valuenow="progress"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <span :style="{ width: `${progress}%` }"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { 阶段状态 } from '../../types';
import { computed } from 'vue';
import { stageExperienceCost } from '../../store/stageProgression';

type StageKind = '恶堕度' | '好感度' | '创伤稳定度';
const props = defineProps<{ stage: 阶段状态; kind: StageKind }>();

const levels = computed(() =>
  Object.keys(props.stage.描述)
    .map(Number)
    .sort((a, b) => a - b),
);
const min = computed(() => levels.value[0]);
const max = computed(() => levels.value[levels.value.length - 1]);
const isRegression = computed(
  () => props.stage.累计经验 < 0 && props.kind !== '恶堕度' && props.stage.当前等级 > min.value,
);
const isDebt = computed(() => props.stage.累计经验 < 0 && !isRegression.value);
const cost = computed(() => {
  const level = props.stage.当前等级;
  if (isRegression.value) return stageExperienceCost(props.kind, level - 1, min.value, max.value);
  if (level < max.value) return stageExperienceCost(props.kind, level, min.value, max.value);
  return null;
});
const progress = computed(() => {
  if (cost.value === null) return 0;
  const experience = isRegression.value ? -props.stage.累计经验 : Math.max(0, props.stage.累计经验);
  return Math.min(100, Math.round((experience / cost.value) * 100));
});
const label = computed(() => {
  if (isRegression.value) return `向等级 ${props.stage.当前等级 - 1}`;
  if (isDebt.value && cost.value !== null) return '经验欠账';
  if (cost.value !== null) return `向等级 ${props.stage.当前等级 + 1}`;
  return props.stage.当前等级 === max.value ? '已达最高等级' : '已达最低等级';
});
const value = computed(() => {
  const experience = props.stage.累计经验;
  if (cost.value === null) return `经验余额 ${experience >= 0 ? '+' : ''}${experience}`;
  if (isDebt.value) return `欠 ${-experience} · 升级需 ${cost.value}`;
  return `${Math.abs(experience)} / ${cost.value}`;
});
</script>
