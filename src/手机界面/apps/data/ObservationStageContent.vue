<template>
  <div class="observation-stage-head">
    <span class="observation-stage-icon" aria-hidden="true">{{ meta.icon }}</span>
    <div v-if="titled" class="observation-stage-title">
      <StageHelp :kind="kind" />
      <small>{{ meta.meaning }}</small>
    </div>
    <span v-else class="observation-stage-meaning">{{ meta.meaning }}</span>
    <div class="observation-stage-level">
      <small>等级</small><strong>{{ stage.当前等级 }}</strong>
    </div>
  </div>
  <p class="observation-stage-description">{{ currentLevelDescription(stage) || '暂无当前阶段描述' }}</p>
  <StageProgress :stage="stage" :kind="kind" :rating="rating" />
  <CorruptionNextReward v-if="kind === '恶堕度'" :level="stage.当前等级" :rating="rating" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { 阶段状态 } from '../../types';
import type { StageKind } from '../../store/stageProgression';
import { currentLevelDescription } from './entries';
import StageHelp from './StageHelp.vue';
import StageProgress from './StageProgress.vue';
import CorruptionNextReward from './CorruptionNextReward.vue';

const props = defineProps<{ stage: 阶段状态; kind: StageKind; rating?: string; titled?: boolean }>();
const meta = computed(
  () =>
    ({
      创伤稳定度: { icon: '◇', meaning: '心理应对模式' },
      好感度: { icon: '♡', meaning: '关系亲近程度' },
      恶堕度: { icon: '✦', meaning: '恶堕进程' },
    })[props.kind],
);
</script>
