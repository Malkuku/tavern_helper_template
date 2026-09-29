<template>
  <section
    class="owned-asset-card"
    :class="[skill ? 'owned-asset-skill' : 'owned-asset-item', skill && ratingVisualClass(skill.适用评级)]"
  >
    <button type="button" class="owned-asset-heading" :aria-expanded="expanded" @click="$emit('toggle')">
      <InventoryIcon :svg="entry.图标" :kind="kind" />
      <strong class="owned-asset-name">{{ name }}</strong>
      <span v-if="skill" class="owned-asset-badge owned-asset-grade">{{ skill.适用评级 }}</span>
      <span v-else-if="item" class="owned-asset-badge">× {{ item.数量 }}</span>
      <span class="owned-asset-chevron" aria-hidden="true">{{ expanded ? '⌃' : '⌄' }}</span>
    </button>
    <div v-if="expanded" class="owned-asset-detail">
      <p v-if="entry.描述" class="owned-asset-description">{{ entry.描述 }}</p>
      <div v-if="entry.作用" class="owned-asset-effect">
        <span>作用</span>
        <p>{{ entry.作用 }}</p>
      </div>
      <p v-if="item" class="owned-asset-meta">
        {{ item.评级 }} 级 · 单件基准价 {{ item.价格 }} 积分 · 当前耐久 {{ item.耐久 }}
      </p>
      <div v-if="$slots.actions" class="owned-asset-actions"><slot name="actions" /></div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { 技能, 物品 } from '../../types';
import { ratingVisualClass } from '../witch/ratingVisual';
import InventoryIcon from './InventoryIcon.vue';

const props = defineProps<{ name: string; entry: 技能 | 物品; kind: '技能' | '道具'; expanded: boolean }>();
defineEmits<{ toggle: [] }>();
const skill = computed(() => (props.kind === '技能' ? (props.entry as 技能) : null));
const item = computed(() => (props.kind === '道具' ? (props.entry as 物品) : null));
</script>

<style scoped>
.owned-asset-card {
  position: relative;
  min-width: 0;
  padding: 16px;
  border: 1px solid #513249;
  border-radius: 17px;
  background: linear-gradient(155deg, #27182a, #1b1321);
  color: #f8eef4;
  box-shadow: 0 8px 22px #08050b35;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', sans-serif;
}
.owned-asset-card.witch-grade-d {
  --grade-color: #aab5c6;
  --grade-glow: #aab5c630;
}
.owned-asset-card.witch-grade-c {
  --grade-color: #75cbb2;
  --grade-glow: #55b99b42;
}
.owned-asset-card.witch-grade-b {
  --grade-color: #79bfff;
  --grade-glow: #4b9df254;
}
.owned-asset-card.witch-grade-a {
  --grade-color: #f2c878;
  --grade-glow: #e6ae5266;
}
.owned-asset-card.witch-grade-s {
  --grade-color: #f6a4ed;
  --grade-glow: #db6ddb80;
}
.owned-asset-card[class*='witch-grade-'] {
  border-color: var(--grade-color);
  box-shadow:
    0 8px 22px #08050b45,
    0 0 17px var(--grade-glow),
    inset 0 0 0 1px var(--grade-glow);
}
.owned-asset-card:is(.witch-grade-a, .witch-grade-s)::before {
  position: absolute;
  inset: 0;
  border: 1px solid var(--grade-color);
  border-radius: inherit;
  box-shadow:
    inset 0 0 14px var(--grade-glow),
    0 0 15px var(--grade-glow);
  content: '';
  pointer-events: none;
  animation: owned-grade-glow 3.6s ease-in-out infinite;
}
.owned-asset-card.witch-grade-s::before {
  animation-duration: 2.5s;
}
@keyframes owned-grade-glow {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}
.owned-asset-heading {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent !important;
  color: #f8eef4 !important;
  text-align: left;
  cursor: pointer;
}
.owned-asset-heading:focus-visible {
  outline: 2px solid #ffc0da;
  outline-offset: 2px;
}
.owned-asset-skill .owned-asset-heading {
  padding-top: 5px;
}
.owned-asset-name {
  flex: 1;
  min-width: 0;
  color: #f9eaf1;
  font-size: 14px;
  overflow-wrap: anywhere;
}
.owned-asset-item .owned-asset-name {
  font-size: 16px;
}
.owned-asset-badge {
  flex: none;
  display: inline-block;
  padding: 4px 8px;
  border: 1px solid #bf6b9182;
  border-radius: 8px;
  background: #8d426971;
  color: #ffe0ee;
  font-size: 10px;
  font-weight: 750;
}
.owned-asset-grade {
  border-color: var(--grade-color, #bf6b91);
  background: var(--grade-glow, #8d426971);
  color: var(--grade-color, #e7a0bf);
}
.owned-asset-chevron {
  flex: none;
  color: #e8a4c0;
  font-size: 18px;
}
.owned-asset-detail {
  display: grid;
  gap: 10px;
  min-width: 0;
  margin-top: 13px;
  padding-top: 13px;
  border-top: 1px solid #614059;
}
.owned-asset-skill .owned-asset-detail {
  margin-top: 0;
  padding-top: 11px;
  border-top-color: #ffffff1c;
}
.owned-asset-description {
  margin: 0;
  color: #e0cfda;
  font-size: 12px;
  line-height: 1.6;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.owned-asset-effect {
  padding: 10px 11px;
  border: 1px solid #5e3b55;
  border-radius: 10px;
  background: #190f1e;
  color: #e7c2d4;
}
.owned-asset-effect span {
  display: block;
  margin-bottom: 4px;
  color: #ee9dbe;
  font-size: 10px;
  font-weight: 750;
}
.owned-asset-effect p {
  margin: 0;
  color: #e0cfda;
  font-size: 11px;
  line-height: 1.55;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.owned-asset-meta {
  margin: 0;
  color: #bf9db2;
  font-size: 10px;
}
.owned-asset-actions {
  display: grid;
  gap: 9px;
}
.owned-asset-actions :deep(.asset-use-button) {
  padding: 9px;
  border: 1px solid #77506b !important;
  border-radius: 9px;
  background: #382033 !important;
  color: #ffe0ee !important;
  cursor: pointer;
  font-size: 11px;
}
</style>
