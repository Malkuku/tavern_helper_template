<template>
  <article class="canvas-node" :class="{ selected }" @click.stop="$emit('select', block.id)">
    <div class="node-tools">
      <span>{{ label }}</span
      ><button :disabled="first" @click.stop="$emit('move', block.id, -1)">↑</button
      ><button :disabled="last" @click.stop="$emit('move', block.id, 1)">↓</button
      ><button @click.stop="$emit('copy', block.id)">复制</button
      ><button class="danger" @click.stop="$emit('remove', block.id)">×</button>
    </div>
    <MainlineBlockRenderer v-if="block.type !== 'container'" :block="block" :data="data" :title="title" />
    <div v-else class="container-preview" :class="`variant-${block.variant}`">
      <small v-if="block.label">{{ block.label }}</small>
      <MainlineCanvasNode
        v-for="(child, index) in block.children"
        :key="child.id"
        :block="child"
        :data="data"
        :title="title"
        :selected-id="selectedId"
        :first="index === 0"
        :last="index === block.children.length - 1"
        @select="$emit('select', $event)"
        @move="(id, delta) => $emit('move', id, delta)"
        @copy="$emit('copy', $event)"
        @remove="$emit('remove', $event)"
      />
      <p v-if="!block.children?.length" class="container-empty">选择容器后，从左侧添加子组件</p>
    </div>
  </article>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import type { MainlineBlock } from '../scenario/mainlineLayout';
import { mainlineBlockCatalog } from '../scenario/mainlineLayout';
import MainlineBlockRenderer from '../../尘史使徒/UI/components/task/MainlineBlockRenderer.vue';
defineOptions({ name: 'MainlineCanvasNode' });
const props = defineProps<{
  block: MainlineBlock;
  data: unknown;
  title: string;
  selectedId: string;
  first: boolean;
  last: boolean;
}>();
defineEmits<{ select: [string]; move: [string, number]; copy: [string]; remove: [string] }>();
const selected = computed(() => props.selectedId === props.block.id),
  label = computed(() => mainlineBlockCatalog[props.block.type].label);
</script>
<style scoped>
.canvas-node {
  position: relative;
  min-width: 0;
  padding: 12px;
  border: 1px solid transparent;
  transition: 0.15s;
}
.canvas-node:hover {
  border-color: rgba(197, 160, 89, 0.25);
}
.canvas-node.selected {
  border-color: #c5a059;
  background: rgba(197, 160, 89, 0.045);
}
.node-tools {
  display: none;
  position: absolute;
  z-index: 2;
  right: 5px;
  top: 5px;
  gap: 4px;
  align-items: center;
  padding: 3px;
  background: #111;
  border: 1px solid #51462f;
}
.selected > .node-tools {
  display: flex;
}
.node-tools span {
  color: #bca978;
  font-size: 0.7rem;
}
.node-tools button {
  padding: 2px 5px;
  font-size: 0.7rem;
}
.danger {
  color: #dc8e83;
}
.container-preview {
  display: grid;
  gap: 7px;
  min-height: 55px;
  padding: 10px;
  border: 1px dashed rgba(197, 160, 89, 0.3);
}
.container-preview.variant-grid {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}
.container-preview.variant-stack {
  border-left: 3px solid rgba(197, 160, 89, 0.35);
}
.container-preview.variant-panel {
  background: rgba(0, 0, 0, 0.2);
}
.container-empty {
  margin: auto;
  color: #6f706f;
  font-size: 0.8rem;
}
</style>
