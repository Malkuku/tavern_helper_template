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
import JsonNode from './JsonNode.vue'

/* ---------- props / emit ---------- */
const props = defineProps<{ data: any }>()
const emit  = defineEmits<{
  toggle: [node: JsonNode]
  sendPath: [path: string]
}>()

/* ---------- 树节点类型 ---------- */
export interface JsonNode {
  key: string
  value: any
  depth: number
  path: string
  isLeaf: boolean
  expanded: boolean
  children?: JsonNode[]
}

/* ---------- 递归建树 ---------- */
function buildTree(
  obj: any,
  depth = 0,
  path = '',
  expanded = false
): JsonNode[] {
  if (obj === null || typeof obj !== 'object') return []
  return Object.keys(obj).map(k => {
    const curPath = path ? `${path}.${k}` : k
    const val = obj[k]
    const isLeaf = val === null || typeof val !== 'object'
    const node: JsonNode = { key: k, value: val, depth, path: curPath, isLeaf, expanded }
    if (!isLeaf) node.children = buildTree(val, depth + 1, curPath, expanded)
    return node
  })
}

/* ---------- 响应式树根 ---------- */
const roots = ref<JsonNode[]>([])
watch(() => props.data, val => (roots.value = buildTree(val)), { immediate: true })

/* ---------- 事件透传 ---------- */
function onToggle(n: JsonNode) {
  n.expanded = !n.expanded
  emit('toggle', n)
}
</script>

<style scoped>
.json-tree {
  font-family: monospace;
  font-size: 12px;
}
</style>
