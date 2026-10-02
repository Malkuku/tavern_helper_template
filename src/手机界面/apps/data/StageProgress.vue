<template>
  <div
    v-if="progress.direction !== 'none'"
    class="observation-stage-progress"
    :class="{ backward: progress.direction === 'backward' }"
    role="img"
    :aria-label="progress.direction === 'backward' ? '当前阶段正在回退' : '当前阶段经验进度'"
  >
    <span v-if="progress.direction === 'backward'" class="observation-stage-progress-caption">回退</span>
    <div class="observation-stage-progress-track" aria-hidden="true">
      <span :style="{ width: `${progress.percent}%` }" />
    </div>
  </div>
  <p v-if="adjacent" class="observation-stage-adjacent">
    <span>{{ adjacent.direction }}方向 · {{ adjacent.level }} 级</span>
    {{ adjacent.description }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { 阶段状态 } from '../../types';
import { stageExperienceProgress, type StageKind } from '../../store/stageProgression';
import { adjacentLevelDescription } from './entries';

const props = defineProps<{ stage: 阶段状态; kind: StageKind; rating?: string }>();
const progress = computed(() => stageExperienceProgress(props.stage, props.kind, props.rating));
const adjacent = computed(() => adjacentLevelDescription(props.stage, props.kind));
</script>
