<template>
  <div class="json-node">
    <div
      class="line"
      :style="{ paddingLeft: node.depth * 20 + 'px' }"
      :class="{ 'line-leaf': node.isLeaf, 'line-parent': !node.isLeaf }"
    >
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
      <span class="key">{{ node.key }}:</span>

      <!-- 值显示区域 -->
      <div v-if="node.isLeaf" class="value-area">
        <span
          class="val"
          :class="getValueTypeClass(node.value)"
        >{{ formatValue(node.value) }}</span>
        <!-- 只有叶子节点出现添加规则按钮 -->
        <button
          class="add-btn"
          title="将此路径添加到规则"
          @click="$emit('sendPath', node.path)"
        >
          <svg class="add-icon" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3V13M3 8H13"/>
          </svg>
        </button>
      </div>
      <div v-else-if="!node.expanded" class="collapse-preview">
        <span class="ellipsis">{{ getCollapsePreview(node) }}</span>
      </div>
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
import { JsonNodeType } from '../types/JsonNode';

defineProps<{ node: JsonNodeType }>()
defineEmits<{
  toggle: [node: JsonNodeType]
  sendPath: [path: string]
}>()

// 格式化显示值
function formatValue(value: any): string {
  const type = typeof value

  switch (type) {
    case 'string':
      return `"${value}"`
    case 'number':
      return `<number>${value}`
    case 'boolean':
      return `<boolean>${value}`
    case 'object':
      if (value === null) return 'null'
      if (Array.isArray(value)) return `[${value.length} items]`
      return `{${Object.keys(value).length} keys}`
    default:
      return String(value)
  }
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
    padding: 4px 0;
    position: relative;
    z-index: 1;
    transition: background-color 0.15s ease;

    &:hover {
      background-color: rgba(99, 102, 241, 0.05);
      border-radius: 4px;

      .arrow {
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
    margin-right: 4px;
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
  }

  .value-area {
    display: flex;
    align-items: center;
    gap: 8px;
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

    &:empty {
      display: none;
    }
  }

  .add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    color: white;
    cursor: pointer;
    opacity: 0;
    transition: all 0.2s ease;
    flex-shrink: 0;
    box-shadow: 0 1px 2px rgba(99, 102, 241, 0.2);

    // 修正选择器：从 .line:hover & 改为直接父元素选择器
    &:not(:hover) {
      opacity: 0.8;
    }

    &:hover {
      opacity: 1;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    }

    &:active {
      transform: translateY(0);
    }

    .add-icon {
      width: 14px;
      height: 14px;
      stroke-width: 2;
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
  }
}
</style>
