<template>
  <article class="quest-card" :class="ratingVisualClass(task.评级)">
    <div class="quest-card-heading">
      <strong>{{ name }}</strong
      ><span>{{ task.评级 }} 级</span>
    </div>
    <p class="quest-card-description">{{ task.描述 }}</p>
    <div class="quest-card-detail">目标：{{ task.目标 }}</div>
    <div v-if="accepted" class="quest-card-detail">{{ task.已完成 ? '已完成 · 待领奖' : task.当前进度 }}</div>
    <small>奖励 {{ task.奖励 }} 恶堕积分</small>
    <slot name="actions" />
  </article>
</template>

<script setup lang="ts">
import type { 任务 } from '../../types';
import { ratingVisualClass } from '../witch/ratingVisual';

defineProps<{ name: string; task: 任务; accepted: boolean }>();
</script>

<style scoped>
.quest-card {
  display: grid;
  gap: 10px;
  min-width: 0;
  padding: 16px;
  border: 1px solid #513249;
  border-radius: 17px;
  background: linear-gradient(155deg, #27182a, #1b1321);
  color: #f8eef4;
  box-shadow: 0 8px 22px #08050b35;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', sans-serif;
  animation: quest-card-enter 0.34s ease-out both;
}
@keyframes quest-card-enter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.quest-card.witch-grade-d {
  --grade-color: #aab5c6;
  --grade-glow: #aab5c630;
}
.quest-card.witch-grade-c {
  --grade-color: #75cbb2;
  --grade-glow: #55b99b42;
}
.quest-card.witch-grade-b {
  --grade-color: #79bfff;
  --grade-glow: #4b9df254;
}
.quest-card.witch-grade-a {
  --grade-color: #f2c878;
  --grade-glow: #e6ae5266;
}
.quest-card.witch-grade-s {
  --grade-color: #f6a4ed;
  --grade-glow: #db6ddb80;
}
.quest-card[class*='witch-grade-'] {
  position: relative;
  border-color: var(--grade-color);
  box-shadow:
    0 8px 22px #08050b45,
    0 0 17px var(--grade-glow),
    inset 0 0 0 1px var(--grade-glow);
}
.quest-card:is(.witch-grade-a, .witch-grade-s)::before {
  position: absolute;
  inset: 0;
  border: 1px solid var(--grade-color);
  border-radius: inherit;
  box-shadow:
    inset 0 0 14px var(--grade-glow),
    0 0 15px var(--grade-glow);
  content: '';
  pointer-events: none;
  animation: quest-grade-glow 3.6s ease-in-out infinite;
}
.quest-card.witch-grade-s::before {
  animation-duration: 2.5s;
}
@keyframes quest-grade-glow {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}
.quest-card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
  min-width: 0;
}
.quest-card-heading strong {
  font-size: 14px;
  overflow-wrap: anywhere;
}
.quest-card-heading span {
  flex: none;
  color: var(--grade-color, #e7a0bf);
  font-size: 11px;
}
.quest-card-description {
  margin: 0;
  color: #e0cfda;
  font-size: 12px;
  line-height: 1.6;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.quest-card-detail {
  padding: 10px 11px;
  border: 1px solid #5e3b55;
  border-radius: 10px;
  background: #190f1e;
  color: #e7c2d4;
  font-size: 11px;
  line-height: 1.55;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.quest-card small {
  color: #e298b8;
  font-size: 11px;
}
.quest-card :deep(.quest-card-action) {
  min-height: 36px;
  padding: 8px 11px;
  border: 1px solid #ee87b0 !important;
  border-radius: 10px;
  background: linear-gradient(115deg, #cb467f, #9f2e66) !important;
  color: #fff2f8 !important;
  cursor: pointer;
  font-size: 11px;
  font-weight: 750;
}
.quest-card :deep(.quest-card-action.secondary) {
  border-color: #6e4963 !important;
  background: #352238 !important;
}
.quest-card :deep(.quest-card-action.danger) {
  border-color: #b64c6f !important;
  background: #7b2845 !important;
}
.quest-card :deep(.quest-card-action.text-button) {
  border-color: transparent !important;
  background: transparent !important;
  color: #f39bc2 !important;
}
.quest-card :deep(.quest-card-action:disabled) {
  cursor: not-allowed;
  opacity: 0.46;
}
@media (prefers-reduced-motion: reduce) {
  .quest-card,
  .quest-card::before {
    animation-duration: 0.01ms !important;
  }
}
</style>
