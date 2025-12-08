<template>
  <div class="json-node" :style="{ marginLeft: `${node.depth * 20}px` }">
    <div class="line" :class="{ 'line-leaf': node.isLeaf, 'line-parent': !node.isLeaf }">
      <!-- 折叠箭头 / 占位 -->
      <span
        v-if="!node.isLeaf"
        class="arrow"
        :class="{ expanded: node.expanded }"
        @click="$emit('toggle', node)"
      >
        <svg v-if="node.expanded" class="arrow-icon" viewBox="0 0 16 16" fill="currentColor">
          <path d="M12 10L8 6L4 10H12Z"/>
        </svg>
        <svg v-else class="arrow-icon" viewBox="0 0 16 16" fill="currentColor">
          <path d="M6 4L10 8L6 12V4Z"/>
        </svg>
      </span>
      <span v-else class="space" />

      <!-- 键值 -->
      <span class="key" @dblclick="onDoubleClick">{{ node.key }}:</span>

      <!-- 编辑模式 -->
      <div v-if="isEditing && editModeEnabled" class="node-editor">
        <select v-model="editType" class="edit-type-select">
          <option value="string">字符串</option>
          <option value="number">数字</option>
          <option value="boolean">布尔值</option>
          <option value="null">Null</option>
        </select>

        <input
          v-if="editType === 'string'"
          v-model="editValue"
          type="text"
          class="edit-input"
          @keyup.enter="save"
          @keyup.esc="cancel"
        />

        <input
          v-else-if="editType === 'number'"
          v-model.number="editValue"
          type="number"
          class="edit-input"
          @keyup.enter="save"
          @keyup.esc="cancel"
        />

        <select
          v-else-if="editType === 'boolean'"
          v-model="editValue"
          class="edit-input"
          @keyup.enter="save"
          @keyup.esc="cancel"
        >
          <option :value="true">true</option>
          <option :value="false">false</option>
        </select>

        <span v-else class="null-value">null</span>

        <button class="edit-btn save" @click="save">✓</button>
        <button class="edit-btn cancel" @click="cancel">✗</button>
      </div>

      <!-- 显示模式 -->
      <template v-else>
        <div v-if="node.isLeaf" class="value-area">
          <span
            class="val"
            :class="getValueTypeClass(node.value)"
            @dblclick="onDoubleClick"
          >{{ formatValue(node.value) }}</span>
        </div>

        <div v-else-if="!node.expanded" class="collapse-preview">
          <span class="ellipsis">{{ getCollapsePreview(node) }}</span>
        </div>
      </template>

      <!-- 操作按钮（编辑模式启用时显示，且不在编辑状态） -->
      <div v-if="editModeEnabled && !isEditing" class="node-actions">
        <button
          class="action-btn"
          title="添加子节点"
          @click="$emit('add-child', node.path)"
        >
          +
        </button>
        <button
          class="action-btn danger"
          title="删除节点"
          @click="$emit('remove', node.path)"
        >
          ×
        </button>
        <button
          class="action-btn edit"
          title="编辑节点"
          @click="startEdit"
        >
          编辑
        </button>
      </div>
    </div>

    <!-- 子节点 -->
    <div v-if="node.expanded && node.children" class="node-children">
      <JsonNodeEdit
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :editing-node="editingNode"
        :edit-mode="editMode"
        @toggle="$emit('toggle', $event)"
        @edit-start="$emit('edit-start', $event)"
        @edit-cancel="$emit('edit-cancel')"
        @edit-save="handleEditSave($event)"
        @add-child="$emit('add-child', $event)"
        @remove="$emit('remove', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { JsonNodeType } from '../types/JsonNode'

const props = defineProps<{
  node: JsonNodeType
  editingNode: string | null
  editMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle', node: JsonNodeType): void
  (e: 'edit-start', path: string): void
  (e: 'edit-cancel'): void
  (e: 'edit-save', payload: { path: string; value: any }): void
  (e: 'add-child', path: string): void
  (e: 'remove', path: string): void
}>()

// 计算属性：是否启用编辑模式
const editModeEnabled = computed(() => props.editMode !== false) // 默认启用

// 计算属性：是否正在编辑当前节点
const isEditing = computed(() => props.editingNode === props.node.path)

const editType = ref('string')
const editValue = ref<any>('')

// 格式化显示值
function formatValue(value: any): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'string') return `"${value}"`
  if (typeof value === 'number') return `${value}`
  if (Array.isArray(value)) return `[${value.length} items]`
  if (typeof value === 'object') return `{${Object.keys(value).length} keys}`
  return String(value)
}

// 获取值的类型类名
function getValueTypeClass(value: any): string {
  const type = typeof value

  switch (type) {
    case 'string':
      return 'type-string'
    case 'number':
      return 'type-number'
    case 'boolean':
      return 'type-boolean'
    case 'object':
      if (value === null) return 'type-null'
      if (Array.isArray(value)) return 'type-array'
      return 'type-object'
    default:
      return 'type-other'
  }
}

// 获取折叠预览文本
function getCollapsePreview(node: JsonNodeType): string {
  if (node.children) {
    const childCount = node.children.length
    const sampleKeys = node.children.slice(0, 2).map(c => c.key).join(', ')
    return `{ ${sampleKeys}${childCount > 2 ? `, ... +${childCount - 2}` : ''} }`
  }
  return '{ ... }'
}

function onDoubleClick() {
  if (editModeEnabled.value && !isEditing.value) {
    startEdit()
  }
}

function startEdit() {
  if (!editModeEnabled.value) return

  editType.value = getValueType(props.node.value)
  editValue.value = props.node.value
  emit('edit-start', props.node.path)
}

function getValueType(value: any): string {
  if (value === null) return 'null'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  return 'string'
}

function save() {
  let finalValue = editValue.value

  // 类型转换
  if (editType.value === 'number') {
    finalValue = Number(editValue.value)
    if (isNaN(finalValue)) {
      alert('请输入有效的数字')
      return
    }
  } else if (editType.value === 'boolean') {
    finalValue = editValue.value === 'true' || editValue.value === true
  } else if (editType.value === 'null') {
    finalValue = null
  }

  emit('edit-save', {
    path: props.node.path,
    value: finalValue
  })
}

function cancel() {
  emit('edit-cancel')
}

function handleEditSave(payload: { path: string; value: any }) {
  emit('edit-save', payload)
}

// 监听编辑状态变化
watch(isEditing, (editing) => {
  if (editing) {
    // 编辑开始时设置值
    editType.value = getValueType(props.node.value)
    editValue.value = props.node.value
  }
})
</script>

<style scoped lang="scss">
.json-node {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'JetBrains Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  position: relative;

  // 添加连接线
  &::before {
    content: '';
    position: absolute;
    left: 12px;
    top: 0;
    bottom: 0;
    width: 1px;
    background: linear-gradient(to bottom,
      transparent 0%,
      #e5e7eb 10%,
      #e5e7eb 90%,
      transparent 100%
    );
    z-index: 0;
  }

  .line {
    display: flex;
    align-items: center;
    min-height: 28px;
    padding: 4px 8px;
    position: relative;
    z-index: 1;
    transition: background-color 0.15s ease;
    gap: 4px;

    &:hover {
      background-color: rgba(99, 102, 241, 0.05);
      border-radius: 4px;

      .arrow {
        opacity: 1;
      }

      .node-actions {
        opacity: 1;
      }
    }

    &.line-leaf {
      .key {
        color: #111827;
      }
    }

    &.line-parent {
      .key {
        font-weight: 600;
        color: #111827;
      }
    }
  }

  .arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    cursor: pointer;
    opacity: 0.6;
    transition: all 0.2s ease;
    border-radius: 3px;
    flex-shrink: 0;

    &:hover {
      opacity: 1;
      background-color: rgba(99, 102, 241, 0.1);
      transform: scale(1.1);
    }

    .arrow-icon {
      width: 12px;
      height: 12px;
      color: #6b7280;
      transition: transform 0.2s ease;
    }

    &.expanded {
      .arrow-icon {
        color: #6366f1;
      }
    }
  }

  .space {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .key {
    color: #4b5563;
    margin-right: 8px;
    font-weight: 500;
    user-select: none;
    flex-shrink: 0;
    cursor: pointer;
  }

  .value-area {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
  }

  .val {
    color: #111827;
    font-weight: 400;
    padding: 2px 6px;
    background-color: #f9fafb;
    border-radius: 4px;
    border: 1px solid #f3f4f6;
    line-height: 1.3;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;

    // 不同类型值的颜色
    &.type-string {
      color: #059669;
      background-color: #f0fdf4;
      border-color: #bbf7d0;
    }

    &.type-number {
      color: #dc2626;
      background-color: #fef2f2;
      border-color: #fecaca;
    }

    &.type-boolean {
      color: #7c3aed;
      background-color: #f5f3ff;
      border-color: #ddd6fe;
    }

    &.type-null {
      color: #6b7280;
      background-color: #f9fafb;
      border-color: #e5e7eb;
      font-style: italic;
    }

    &.type-object {
      color: #0ea5e9;
      background-color: #f0f9ff;
      border-color: #bae6fd;
    }

    &.type-array {
      color: #f59e0b;
      background-color: #fffbeb;
      border-color: #fde68a;
    }

    &:hover {
      opacity: 0.9;
    }
  }

  .collapse-preview {
    color: #6b7280;
    font-size: 12px;
    font-style: italic;
    padding: 2px 6px;
    background-color: #f9fafb;
    border-radius: 4px;
    border: 1px dashed #e5e7eb;
    line-height: 1.3;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    .ellipsis {
      display: inline-block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  // 编辑相关样式
  .node-editor {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .edit-type-select,
  .edit-input {
    padding: 4px 8px;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    font-size: 13px;
    background: #f8fafc;
    color: #1e293b;
  }

  .edit-input {
    min-width: 150px;
    flex: 1;
  }

  .null-value {
    color: #94a3b8;
    font-style: italic;
    padding: 4px 8px;
  }

  .edit-btn {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    flex-shrink: 0;

    &.save {
      background: #10b981;
      color: white;

      &:hover {
        background: #059669;
      }
    }

    &.cancel {
      background: #ef4444;
      color: white;

      &:hover {
        background: #dc2626;
      }
    }
  }

  .node-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s ease;
    margin-left: auto;
    flex-shrink: 0;
  }

  .action-btn {
    padding: 2px 8px;
    border: 1px solid #cbd5e1;
    background: white;
    border-radius: 4px;
    font-size: 12px;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;

    &:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }

    &.danger {
      color: #ef4444;
      border-color: #fecaca;

      &:hover {
        background: #fef2f2;
      }
    }

    &.edit {
      color: #3b82f6;
      border-color: #bfdbfe;

      &:hover {
        background: #eff6ff;
      }
    }
  }

  .node-children {
    border-left: 1px dashed #e2e8f0;
    margin-left: 10px;
    padding-left: 10px;
  }

  // 最后一个节点的连接线调整
  &:last-child::before {
    bottom: 50%;
  }

  // 第一个节点的连接线调整
  &:first-child::before {
    top: 50%;
  }
}

// 深色模式支持
@media (prefers-color-scheme: dark) {
  .json-node {
    &::before {
      background: linear-gradient(to bottom,
        transparent 0%,
        #374151 10%,
        #374151 90%,
        transparent 100%
      );
    }

    .line {
      &:hover {
        background-color: rgba(99, 102, 241, 0.1);
      }
    }

    .key {
      color: #9ca3af;
    }

    .val {
      color: #f3f4f6;
      background-color: #1f2937;
      border-color: #374151;

      &.type-string {
        color: #34d399;
        background-color: #064e3b;
        border-color: #047857;
      }

      &.type-number {
        color: #f87171;
        background-color: #7f1d1d;
        border-color: #991b1b;
      }

      &.type-boolean {
        color: #a78bfa;
        background-color: #4c1d95;
        border-color: #5b21b6;
      }

      &.type-null {
        color: #9ca3af;
        background-color: #374151;
        border-color: #4b5563;
      }

      &.type-object {
        color: #38bdf8;
        background-color: #0c4a6e;
        border-color: #0369a1;
      }

      &.type-array {
        color: #fbbf24;
        background-color: #78350f;
        border-color: #d97706;
      }
    }

    .collapse-preview {
      color: #9ca3af;
      background-color: #1f2937;
      border-color: #374151;
    }

    .arrow {
      .arrow-icon {
        color: #9ca3af;
      }

      &:hover {
        background-color: rgba(99, 102, 241, 0.2);
      }
    }

    .node-editor {
      .edit-type-select,
      .edit-input {
        background: #374151;
        border-color: #4b5563;
        color: #f3f4f6;
      }
    }

    .null-value {
      color: #9ca3af;
    }

    .action-btn {
      background: #374151;
      border-color: #4b5563;
      color: #d1d5db;

      &:hover {
        background: #4b5563;
      }

      &.danger {
        color: #f87171;
        border-color: #7f1d1d;

        &:hover {
          background: #7f1d1d;
        }
      }

      &.edit {
        color: #60a5fa;
        border-color: #1e3a8a;

        &:hover {
          background: #1e3a8a;
        }
      }
    }
  }
}
</style>
