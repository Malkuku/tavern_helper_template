<template>
  <div class="json-tree">
    <json-node
      v-for="(n, i) in roots"
      :key="i"
      :node="n"
      :editing-node="editingNode"
      @toggle="onToggle"
      @edit-start="onEditStart"
      @edit-cancel="onEditCancel"
      @edit-save="onEditSave"
      @add-child="onAddChild"
      @remove="onRemove"
    />
  </div>
</template>

<script setup lang="ts">
import { watch, ref } from 'vue'
import { JsonNodeType } from '../types/JsonNode';
import JsonNode from './JsonNode.vue';

/* ---------- props / emit ---------- */
const props = defineProps<{
  data: any
  editingNode: string | null
}>()

const emit = defineEmits<{
  toggle: [node: JsonNodeType]
  'edit-start': [path: string]
  'edit-cancel': []
  'edit-save': [payload: { path: string; value: any }]
  'add-child': [path: string]
  remove: [path: string]
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
    const node: JsonNodeType = {
      key: k,
      value: val,
      depth,
      path: curPath,
      isLeaf,
      expanded
    }
    if (!isLeaf) node.children = buildTree(val, depth + 1, curPath, expanded)
    return node
  })
}

/* ---------- 响应式树根 ---------- */
const roots = ref<JsonNodeType[]>([])
watch(() => props.data, val => (roots.value = buildTree(val)), { immediate: true })

/* ---------- 事件处理 ---------- */
function onToggle(n: JsonNodeType) {
  n.expanded = !n.expanded
  emit('toggle', n)
}

function onEditStart(path: string) {
  emit('edit-start', path)
}

function onEditCancel() {
  emit('edit-cancel')
}

function onEditSave(payload: { path: string; value: any }) {
  emit('edit-save', payload)
}

function onAddChild(path: string) {
  emit('add-child', path)
}

function onRemove(path: string) {
  emit('remove', path)
}
</script>

<style scoped>
.json-tree {
  font-family: monospace;
  font-size: 12px;
}
</style>
