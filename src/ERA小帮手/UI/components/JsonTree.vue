<template>
  <div class="json-tree">
    <json-node
      v-for="(n, i) in roots"
      :key="i"
      :node="n"
      @toggle="onToggle"
      @send-path="(p:string) => $emit('sendPath', p)"
    />
  </div>
</template>

<script setup lang="ts">
import {  watch, ref } from 'vue'
import { JsonNodeType } from '../types/JsonNode';
import JsonNode from './JsonNode.vue';

/* ---------- props / emit ---------- */
const props = defineProps<{ data: any }>()
const emit  = defineEmits<{
  toggle: [node: JsonNodeType]
  sendPath: [path: string]
}>()



/* ---------- 递归建树 ---------- */
function buildTree(
  obj: any,
  depth = 0,
  path = '',
  expanded = false
): JsonNodeType[] {
  if (obj === null || typeof obj !== 'object') return []
  return Object.keys(obj).map(k => {
    const curPath = path ? `${path}.${k}` : k
    const val = obj[k]
    const isLeaf = val === null || typeof val !== 'object'
    const node: JsonNodeType = { key: k, value: val, depth, path: curPath, isLeaf, expanded }
    if (!isLeaf) node.children = buildTree(val, depth + 1, curPath, expanded)
    return node
  })
}

/* ---------- 响应式树根 ---------- */
const roots = ref<JsonNodeType[]>([])
watch(() => props.data, val => (roots.value = buildTree(val)), { immediate: true })

/* ---------- 事件透传 ---------- */
function onToggle(n: JsonNodeType) {
  n.expanded = !n.expanded
  emit('toggle', n)
}
</script>

<style scoped>
.json-tree {
  font-family: monospace;
  font-size: 11px;
}
</style>
