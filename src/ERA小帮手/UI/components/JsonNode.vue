<template>
  <div class="json-node">
    <div class="line" :style="{ paddingLeft: node.depth * 16 + 'px' }">
      <!-- 折叠箭头 / 占位 -->
      <span v-if="!node.isLeaf" class="arrow" @click="$emit('toggle', node)">
        {{ node.expanded ? '▶' : '▼' }}
      </span>
      <span v-else class="space" />

      <!-- 键值 -->
      <span class="key">{{ node.key }}:</span>
      <span v-if="node.isLeaf" class="val">{{ JSON.stringify(node.value) }}</span>
      <span v-else-if="!node.expanded" class="ellipsis">{ … }</span>

      <!-- 只有叶子节点出现“＋”按钮 -->
      <button
        v-if="node.isLeaf"
        class="add-btn"
        title="添加一条规则"
        @click="$emit('sendPath', node.path)"
      >＋</button>
    </div>

    <!-- 子节点 -->
    <template v-if="node.children && node.expanded">
      <JsonNode
        v-for="c in node.children"
        :key="c.path"
        :node="c"
        @toggle="$emit('toggle', $event)"
        @send-path="$emit('sendPath', $event)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { JsonNode } from './JsonTree.vue'
defineProps<{ node: JsonNode }>()
defineEmits<{
  toggle: [node: JsonNode]
  sendPath: [path: string]
}>()
</script>

<style scoped>
.add-btn {
  margin-left: 8px;
  width: 10px;
  height: 10px;
  padding: 0;
  font-size: 12px;
  line-height: 1;
  color: #0969da;
  border-radius: 3px;
  cursor: pointer;
}
.add-btn:hover {
  background: #0948da;
  color: #fff;
}
.json-node { font-family: monospace; font-size: 14px; }
.line { display: flex; align-items: center; height: 22px; }
.arrow { cursor: pointer; width: 14px; color: #666; }
.space { width: 14px; }
.key { color: #0969da; margin-right: 4px; }
.val { color: #032f62; }
.ellipsis { color: #777; }
</style>
