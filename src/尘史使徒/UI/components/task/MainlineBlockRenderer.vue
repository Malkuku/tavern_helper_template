<template>
  <component :is="tag" class="mainline-block" :class="[`block-${block.type}`, `variant-${block.variant}`]">
    <template v-if="block.type === 'container'">
      <small v-if="block.label" class="block-label">{{ block.label }}</small>
      <MainlineBlockRenderer
        v-for="child in block.children"
        :key="child.id"
        :block="child"
        :data="data"
        :title="title"
      />
    </template>
    <template v-else-if="block.type === 'divider'"><span v-if="block.variant === 'glyph'">◆</span></template>
    <template v-else-if="block.type === 'title'">{{ textValue }}</template>
    <template v-else-if="block.type === 'text'"
      ><small v-if="block.label" class="block-label">{{ block.label }}</small
      ><span>{{ textValue }}</span></template
    >
    <template v-else-if="block.type === 'metric'"
      ><small>{{ block.label || '数值' }}</small
      ><strong>{{ textValue }}</strong
      ><i v-if="block.variant === 'gauge'"><b :style="{ width: gaugeWidth }"></b></i
    ></template>
    <template v-else-if="block.type === 'list'"
      ><small v-if="block.label" class="block-label">{{ block.label }}</small>
      <ol>
        <li v-for="(item, index) in listValue" :key="index">{{ display(item) }}</li>
      </ol></template
    >
    <template v-else-if="block.type === 'tags'"
      ><small v-if="block.label" class="block-label">{{ block.label }}</small
      ><span class="tag-list"
        ><b v-for="(item, index) in listValue" :key="index">{{ display(item) }}</b></span
      ></template
    >
  </component>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import type { MainlineBlock } from '../../../../创意工坊/scenario/mainlineLayout';
import { resolveMainlineSource } from '../../../../创意工坊/scenario/mainlineLayout';
defineOptions({ name: 'MainlineBlockRenderer' });
const props = defineProps<{ block: MainlineBlock; data: unknown; title: string }>();
const value = computed(() => resolveMainlineSource(props.data, props.title, props.block.source));
const display = (item: unknown) =>
  typeof item === 'string'
    ? item
    : typeof item === 'number' || typeof item === 'boolean'
      ? String(item)
      : JSON.stringify(item);
const textValue = computed(() => display(value.value ?? ''));
const listValue = computed(() =>
  Array.isArray(value.value) ? value.value : value.value === undefined ? [] : [value.value],
);
const gaugeWidth = computed(() => `${Math.max(0, Math.min(100, Number(value.value) || 0))}%`);
const tag = computed(() =>
  props.block.type === 'title'
    ? 'h2'
    : props.block.type === 'text'
      ? 'p'
      : props.block.type === 'container'
        ? 'section'
        : 'div',
);
</script>
<style scoped>
.mainline-block {
  min-width: 0;
  overflow-wrap: anywhere;
}
.block-label {
  display: block;
  margin-bottom: 5px;
  color: #8f8b80;
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.block-title {
  margin: 0;
  color: #eee;
  font-family: serif;
}
.block-title.variant-display {
  font-size: 2rem;
}
.block-title.variant-section {
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(197, 160, 89, 0.35);
  font-size: 1.45rem;
}
.block-title.variant-eyebrow {
  color: #c5a059;
  font-size: 0.82rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.block-text {
  margin: 0;
  color: #bbb;
  line-height: 1.65;
  white-space: pre-wrap;
}
.block-text.variant-quote {
  padding-left: 14px;
  color: #d2c8b3;
  border-left: 3px solid #c5a059;
  font-family: serif;
  font-style: italic;
}
.block-text.variant-callout {
  padding: 12px;
  background: rgba(197, 160, 89, 0.08);
  border: 1px solid rgba(197, 160, 89, 0.2);
}
.block-metric {
  display: grid;
  gap: 3px;
  padding: 11px;
  background: rgba(255, 255, 255, 0.035);
}
.block-metric small {
  color: #8d8d8d;
}
.block-metric strong {
  color: #e4d19e;
  font-size: 1.35rem;
}
.block-metric.variant-badge {
  display: inline-grid;
  border: 1px solid rgba(197, 160, 89, 0.35);
}
.block-metric i {
  height: 4px;
  overflow: hidden;
  background: #292929;
}
.block-metric i b {
  display: block;
  height: 100%;
  background: #c5a059;
}
.block-list ol {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 20px;
  color: #bbb;
}
.block-list.variant-cards ol {
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  padding: 0;
  list-style: none;
}
.block-list.variant-cards li {
  padding: 9px;
  background: rgba(255, 255, 255, 0.035);
}
.block-list.variant-steps li::marker {
  color: #c5a059;
  font-weight: bold;
}
.tag-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.tag-list b {
  padding: 3px 8px;
  color: #cdbb91;
  border: 1px solid rgba(197, 160, 89, 0.3);
  font-size: 0.75rem;
}
.variant-seals .tag-list b {
  border-radius: 50%;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
}
.variant-plain .tag-list b {
  padding: 0;
  border: 0;
}
.block-divider {
  height: 18px;
  display: grid;
  place-items: center;
  color: #887449;
}
.block-divider.variant-line {
  height: 1px;
  background: linear-gradient(90deg, transparent, #806d45, transparent);
}
.block-divider.variant-space {
  height: 28px;
}
.block-container {
  display: grid;
  gap: 11px;
}
.block-container.variant-panel {
  padding: 14px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.block-container.variant-grid {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}
.block-container.variant-stack {
  padding-left: 13px;
  border-left: 2px solid rgba(197, 160, 89, 0.28);
}
</style>
