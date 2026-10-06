<template>
  <section class="data-card monitor-card body-observation-card">
    <button
      v-if="part?.特征 || part?.开发程度"
      type="button"
      class="monitor-card-head body-card-toggle"
      :aria-expanded="expanded"
      @click="$emit('toggle')"
    >
      <strong>{{ name }}</strong
      ><span aria-hidden="true">{{ expanded ? '⌃' : '⌄' }}</span>
    </button>
    <div v-else class="monitor-card-head">
      <strong>{{ name }}</strong>
    </div>
    <div class="body-current">
      <span>当前状态</span>
      <p>{{ part?.当前状态 || '暂无记录' }}</p>
    </div>
    <div v-if="expanded && part?.特征" class="body-detail">
      <span>特征</span>
      <p>{{ part.特征 }}</p>
    </div>
    <div v-if="expanded && part?.开发程度" class="body-detail">
      <span>开发程度</span>
      <p>{{ part.开发程度 }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { 身体部位开发状态 } from '../../types';
defineProps<{ name: string; part?: 身体部位开发状态; expanded: boolean }>();
defineEmits<{ toggle: [] }>();
</script>
