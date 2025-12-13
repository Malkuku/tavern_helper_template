<template>
  <div class="json-node" :style="{ marginLeft: `${node.depth * 20}px` }">
    <div class="line" :class="{ 'is-editing': isEditing }">
      <!-- 折叠/展开箭头 -->
      <span v-if="!node.isLeaf" class="arrow" :class="{ expanded: node.expanded }" @click="emit('toggleExpand', node)">
        ▶
      </span>
      <span v-else class="space" />

      <!-- Key -->
      <span class="key" @dblclick="onDoubleClick">{{ node.key }}:</span>

      <!-- 编辑器 -->
      <div v-if="isEditing" class="editor-container">
        <select v-model="editType" class="edit-select">
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
          <option value="null">Null</option>
        </select>

        <input
          v-if="editType === 'string'"
          ref="inputRef"
          v-model="editValue"
          type="text"
          class="edit-input"
          @keydown.enter="save"
          @keydown.esc="cancel"
        />
        <input
          v-else-if="editType === 'number'"
          ref="inputRef"
          v-model.number="editValue"
          type="number"
          class="edit-input"
          @keydown.enter="save"
          @keydown.esc="cancel"
        />
        <select
          v-else-if="editType === 'boolean'"
          ref="inputRef"
          v-model="editValue"
          class="edit-input"
          @keydown.enter="save"
          @keydown.esc="cancel"
        >
          <option :value="true">true</option>
          <option :value="false">false</option>
        </select>
        <span v-else class="null-value">null</span>

        <button class="btn-action save" title="保存" @click="save">✓</button>
        <button class="btn-action cancel" title="取消" @click="cancel">✗</button>
      </div>

      <!-- 值 / 折叠预览 -->
      <template v-else>
        <span v-if="node.isLeaf" class="value" :class="valueClass" @dblclick="onDoubleClick">
          {{ formattedValue }}
        </span>
        <span v-else-if="!node.expanded" class="preview">
          {{ Array.isArray(node.value) ? `[...]` : `{...}` }}
        </span>
      </template>

      <!-- 操作按钮 (Flexbox布局) -->
      <div v-if="!isEditing" class="actions">
        <button v-if="!node.isLeaf" class="btn-action" title="添加子节点" @click="emit('addChild', { path: node.path, isObject: !Array.isArray(node.value) })">+</button>
        <button class="btn-action" title="编辑值" @click="startEdit">✎</button>
        <button class="btn-action danger" title="删除节点" @click="emit('removeNode', node.path)">🗑</button>
      </div>
    </div>

    <!-- 子节点 -->
    <div v-if="node.expanded && node.children" class="children-container">
      <JsonNodeEdit
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :editing-node-path="editingNodePath"
        @toggle-expand="emit('toggleExpand', $event)"
        @start-edit="emit('startEdit', $event)"
        @cancel-edit="emit('cancelEdit')"
        @save-edit="emit('saveEdit', $event)"
        @add-child="emit('addChild', $event)"
        @remove-node="emit('removeNode', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import type { JsonNodeType } from '../../types/JsonNode';

const props = defineProps<{
  node: JsonNodeType;
  editingNodePath: string | null;
}>();

const emit = defineEmits<{
  (e: 'toggleExpand', node: JsonNodeType): void;
  (e: 'startEdit', path: string): void;
  (e: 'cancelEdit'): void;
  (e: 'saveEdit', payload: { path: string; value: any }): void;
  (e: 'addChild', payload: { path: string; isObject: boolean }): void;
  (e: 'removeNode', path: string): void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const isEditing = computed(() => props.node.path === props.editingNodePath);

const editType = ref('string');
const editValue = ref<any>('');

/* ---------- 值格式化与样式 ---------- */
const formattedValue = computed(() => {
  const val = props.node.value;
  if (typeof val === 'string') return `"${val}"`;
  return String(val);
});

const valueClass = computed(() => {
  const val = props.node.value;
  if (val === null) return 'type-null';
  return `type-${typeof val}`;
});

/* ---------- 编辑逻辑 ---------- */
function getValueType(value: any): string {
  if (value === null) return 'null';
  const type = typeof value;
  if (['string', 'number', 'boolean'].includes(type)) {
    return type;
  }
  return 'string'; // 默认为字符串
}

function startEdit() {
  if (!props.node.isLeaf) return; // 只允许编辑叶子节点
  editType.value = getValueType(props.node.value);
  editValue.value = props.node.value;
  emit('startEdit', props.node.path);
}

function onDoubleClick() {
  startEdit();
}

function cancel() {
  emit('cancelEdit');
}

function save() {
  let finalValue = editValue.value;
  if (editType.value === 'boolean') {
    finalValue = Boolean(editValue.value);
  } else if (editType.value === 'null') {
    finalValue = null;
  }
  // number 类型由 v-model.number 自动转换

  emit('saveEdit', { path: props.node.path, value: finalValue });
}

watch(isEditing, (isNowEditing) => {
  if (isNowEditing) {
    nextTick(() => {
      inputRef.value?.focus();
      inputRef.value?.select();
    });
  }
});
</script>

<style scoped lang="scss">
.json-node {
  position: relative;
}

.line {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f1f5f9;
    .actions {
      opacity: 1;
    }
  }
}

.arrow {
  cursor: pointer;
  width: 16px;
  text-align: center;
  font-size: 10px;
  color: #94a3b8;
  transition: transform 0.2s;
  &.expanded {
    transform: rotate(90deg);
  }
}

.space {
  width: 16px;
}

.key {
  color: #475569;
  font-weight: 500;
}

.value {
  cursor: pointer;
  &.type-string { color: #059669; }
  &.type-number { color: #dc2626; }
  &.type-boolean { color: #7c3aed; }
  &.type-null { color: #64748b; font-style: italic; }
}

.preview {
  color: #94a3b8;
  font-style: italic;
}

.editor-container {
  display: flex;
  gap: 6px;
  align-items: center;
}

.edit-select, .edit-input {
  padding: 2px 6px;
  font-size: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background-color: #fff;
  font-family: monospace;
}

// 操作按钮区域 (Flexbox 布局)
.actions {
  margin-left: auto; // 关键：将按钮推到最右边
  display: flex;
  gap: 4px;
  opacity: 0; // 默认隐藏
  transition: opacity 0.2s;
}

.btn-action {
  border: none;
  background: transparent;
  cursor: pointer;
  color: #64748b;
  font-size: 14px;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background-color: #e2e8f0;
    color: #1e293b;
  }
  &.danger:hover {
    background-color: #fee2e2;
    color: #ef4444;
  }
  &.save { color: #10b981; }
  &.cancel { color: #ef4444; }
}

.children-container {
  padding-left: 10px;
  border-left: 1px dashed #e2e8f0;
}
</style>
