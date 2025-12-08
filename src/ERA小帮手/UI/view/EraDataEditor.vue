<template>
  <div class="stat-data-editor">
    <!-- 顶部工具栏（保持不变） -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <button class="toolbar-btn" :disabled="loading" @click="loadData">
          <svg class="icon" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.5 8C13.5 11.0376 11.0376 13.5 8 13.5C4.96243 13.5 2.5 11.0376 2.5 8C2.5 4.96243 4.96243 2.5 8 2.5C9.37676 2.5 10.6396 3.01285 11.596 3.85652L12.5 2.5H14V6H10.5V4.5H11.7906C11.0431 3.53528 9.8382 3 8.5 3C6.01472 3 4 5.01472 4 7.5C4 9.98528 6.01472 12 8.5 12C10.9853 12 13 9.98528 13 7.5H14.5C14.5 11.0376 11.0376 14.5 8 14.5C4.96243 14.5 2.5 12.0376 2.5 9C2.5 5.96243 4.96243 3.5 8 3.5C9.4619 3.5 10.7872 4.11611 11.7227 5.12644L12.5 6H14V2.5H12.5L11.596 3.85652Z"/>
          </svg>
          刷新数据
        </button>
        <button class="toolbar-btn" :disabled="saving || !hasChanges" @click="saveData">
          <svg class="icon" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.3536 2.64645C13.5488 2.84171 13.5488 3.15829 13.3536 3.35355L6.35355 10.3536C6.15829 10.5488 5.84171 10.5488 5.64645 10.3536L3.64645 8.35355C3.45118 8.15829 3.45118 7.84171 3.64645 7.64645C3.84171 7.45118 4.15829 7.45118 4.35355 7.64645L6 9.29289L12.6464 2.64645C12.8417 2.45118 13.1583 2.45118 13.3536 2.64645Z"/>
          </svg>
          保存更改
        </button>
      </div>
      <div class="toolbar-right">
        <div v-if="hasChanges" class="change-indicator">
          <span class="dot"></span>
          有未保存的更改
        </div>
        <div class="status-text" :class="{ 'status-loading': loading }">
          {{ statusMessage }}
        </div>
      </div>
    </div>

    <!-- 搜索框（保持不变） -->
    <div class="search-box">
      <svg class="search-icon" viewBox="0 0 16 16" fill="currentColor">
        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索路径或值..."
        class="search-input"
      />
      <button
        v-if="searchQuery"
        class="search-clear"
        @click="searchQuery = ''"
      >
        &times;
      </button>
    </div>

    <!-- 数据展示区域 -->
    <div class="data-container">
      <div v-if="loading" class="loading-container">
        <div class="spinner"></div>
        <div>正在加载数据...</div>
      </div>

      <div v-else-if="!currentData || Object.keys(currentData).length === 0" class="empty-container">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
          <path d="M7 7h10v2H7zm0 4h10v2H7zm0 4h7v2H7z"/>
        </svg>
        <div class="empty-text">暂无数据</div>
        <button class="empty-btn" @click="loadData">
          点击加载数据
        </button>
      </div>

      <div v-else class="json-editor-wrapper">
        <!-- 编辑模式切换 -->
        <div class="edit-mode-selector">
          <div class="mode-buttons">
            <button
              class="mode-btn"
              :class="{ active: editMode === 'tree' }"
              @click="editMode = 'tree'"
            >
              <svg class="mode-icon" viewBox="0 0 16 16" fill="currentColor">
                <path d="M14 2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2zm0 5a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7zm0 5a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2z"/>
              </svg>
              树形视图
            </button>
            <button
              class="mode-btn"
              :class="{ active: editMode === 'raw' }"
              @click="editMode = 'raw'"
            >
              <svg class="mode-icon" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.5 2h-11C1.67 2 1 2.67 1 3.5v9c0 .83.67 1.5 1.5 1.5h11c.83 0 1.5-.67 1.5-1.5v-9c0-.83-.67-1.5-1.5-1.5zM4 4h8v1H4V4zm0 3h8v1H4V7zm0 3h8v1H4v-1z"/>
              </svg>
              原始JSON
            </button>
          </div>

          <div class="edit-tools">
            <button
              class="tool-btn"
              :class="{ danger: editMode === 'raw' }"
              :disabled="editMode !== 'raw'"
              @click="formatJson"
            >
              <svg class="tool-icon" viewBox="0 0 16 16" fill="currentColor">
                <path d="M5 1h6v2H5V1zm0 12h6v2H5v-2zM1 5h2v6H1V5zm12 0h2v6h-2V5z"/>
              </svg>
              格式化
            </button>
            <button
              class="tool-btn"
              @click="addNewField"
            >
              <svg class="tool-icon" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a1 1 0 0 1 1 1v6h6a1 1 0 0 1 0 2H9v6a1 1 0 0 1-2 0V9H1a1 1 0 0 1 0-2h6V1a1 1 0 0 1 1-1z"/>
              </svg>
              添加字段
            </button>
          </div>
        </div>

        <!-- 树形编辑视图 -->
        <div v-if="editMode === 'tree'" class="tree-editor">
          <div class="json-tree">
            <JsonNodeEdit
              v-for="node in filteredTreeData"
              :key="node.path"
              :node="node"
              :editing-node="editingNode"
              @toggle="toggleNode"
              @edit-start="startEdit"
              @edit-cancel="cancelEdit"
              @edit-save="saveEdit"
              @add-child="addChildToNode"
              @remove="removeNode"
            />
          </div>
        </div>

        <!-- 原始JSON编辑视图 -->
        <div v-else class="raw-editor">
          <div class="editor-header">
            <span class="editor-info">编辑原始JSON数据（支持语法高亮和验证）</span>
            <span class="editor-size">字符数：{{ rawJsonValue.length }}</span>
          </div>
          <textarea
            v-model="rawJsonValue"
            class="json-editor"
            placeholder="在此输入或编辑JSON数据..."
            @input="onRawJsonChange"
          ></textarea>
          <div v-if="jsonParseError" class="json-error">
            <svg class="error-icon" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM7 3h2v7H7V3zm0 9h2v2H7v-2z"/>
            </svg>
            JSON语法错误：{{ jsonParseError }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useEraEditStore } from '../../stores/EraEditStore'
import type { JsonNodeType } from '../types/JsonNode'
import JsonNodeEdit from '../components/JsonNodeEdit.vue';

// Store
const eraEditStore = useEraEditStore()

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const currentData = ref<any>(null)
const originalData = ref<any>(null)
const searchQuery = ref('')
const editMode = ref<'tree' | 'raw'>('tree')
const editingNode = ref<string | null>(null)

// 原始JSON编辑
const rawJsonValue = ref('')
const jsonParseError = ref('')

// 状态消息
const statusMessage = ref('就绪')

// 树形数据
const treeData = ref<JsonNodeType[]>([])

// 计算属性
const hasChanges = computed(() => {
  if (!currentData.value || !originalData.value) return false

  if (editMode.value === 'raw') {
    try {
      const parsed = JSON.parse(rawJsonValue.value)
      return JSON.stringify(parsed) !== JSON.stringify(originalData.value)
    } catch {
      return true // 如果有语法错误，认为有更改
    }
  }

  return JSON.stringify(currentData.value) !== JSON.stringify(originalData.value)
})

const filteredTreeData = computed(() => {
  if (!searchQuery.value.trim()) return treeData.value

  const query = searchQuery.value.toLowerCase()
  return filterTreeNodes(treeData.value, query)
})

// 方法
function filterTreeNodes(nodes: JsonNodeType[], query: string): JsonNodeType[] {
  const result: JsonNodeType[] = []

  for (const node of nodes) {
    const matches = node.key.toLowerCase().includes(query) ||
      (node.isLeaf && String(node.value).toLowerCase().includes(query))

    if (matches) {
      result.push(node)
    } else if (node.children && node.children.length > 0) {
      const filteredChildren = filterTreeNodes(node.children, query)
      if (filteredChildren.length > 0) {
        const clonedNode = { ...node, children: filteredChildren, expanded: true }
        result.push(clonedNode)
      }
    }
  }

  return result
}

async function loadData() {
  try {
    loading.value = true
    statusMessage.value = '正在加载数据...'

    const data = await eraEditStore.getStatData()
    currentData.value = data
    originalData.value = JSON.parse(JSON.stringify(data))
    rawJsonValue.value = JSON.stringify(data, null, 2)

    // 转换为树形结构
    treeData.value = convertToTree(data)

    statusMessage.value = `已加载数据，共 ${countNodes(treeData.value)} 个节点`
  } catch (error) {
    console.error('加载数据失败:', error)
    statusMessage.value = '加载失败'
    currentData.value = null
    treeData.value = []
    rawJsonValue.value = ''
  } finally {
    loading.value = false
  }
}

function convertToTree(data: any, parentPath = '', depth = 0): JsonNodeType[] {
  if (!data || typeof data !== 'object') return []

  const nodes: JsonNodeType[] = []
  const isArray = Array.isArray(data)
  const entries = isArray ? data.entries() : Object.entries(data)

  for (const [key, value] of entries) {
    const path = (parentPath ? `${parentPath}.${key}` : key ) as string
    const isLeaf = !value || typeof value !== 'object' || Array.isArray(value)

    const node: JsonNodeType = {
      key: isArray ? `[${key}]` : key as string,
      value,
      depth,
      path,
      isLeaf,
      expanded: false,
      children: isLeaf ? undefined : convertToTree(value, path, depth + 1)
    }

    nodes.push(node)
  }

  return nodes
}

function countNodes(nodes: JsonNodeType[]): number {
  let count = 0
  for (const node of nodes) {
    count++
    if (node.children) {
      count += countNodes(node.children)
    }
  }
  return count
}

function toggleNode(node: JsonNodeType) {
  node.expanded = !node.expanded
}

async function saveData() {
  try {
    saving.value = true
    statusMessage.value = '正在保存...'

    // 如果是在原始JSON编辑模式，先解析
    if (editMode.value === 'raw') {
      try {
        currentData.value = JSON.parse(rawJsonValue.value)
      } catch (error) {
        statusMessage.value = 'JSON格式错误，无法保存'
        return
      }
    }

    await eraEditStore.saveEraEdit(currentData.value)

    // 更新原始数据副本和原始JSON
    originalData.value = JSON.parse(JSON.stringify(currentData.value))
    rawJsonValue.value = JSON.stringify(currentData.value, null, 2)

    // 重新生成树数据
    treeData.value = convertToTree(currentData.value)

    statusMessage.value = '保存成功'

    // 3秒后恢复状态
    setTimeout(() => {
      if (statusMessage.value === '保存成功') {
        statusMessage.value = '就绪'
      }
    }, 3000)
  } catch (error) {
    console.error('保存失败:', error)
    statusMessage.value = '保存失败'
  } finally {
    saving.value = false
  }
}

// 内联编辑方法
function startEdit(nodePath: string) {
  editingNode.value = nodePath
}

function cancelEdit() {
  editingNode.value = null
}

function saveEdit(payload: {path: string, value: any}) {
  setValueByPath(currentData.value, payload.path, payload.value)

  // 更新原始JSON视图
  rawJsonValue.value = JSON.stringify(currentData.value, null, 2)

  // 重新生成树数据
  treeData.value = convertToTree(currentData.value)

  editingNode.value = null
  statusMessage.value = '已更新值'
}

function addChildToNode(nodePath: string) {
  const parent = getValueByPath(currentData.value, nodePath)

  if (typeof parent === 'object' && parent !== null) {
    const newKey = `newField${Object.keys(parent).length + 1}`
    const newPath = nodePath ? `${nodePath}.${newKey}` : newKey

    setValueByPath(currentData.value, newPath, '')

    // 更新原始JSON视图
    rawJsonValue.value = JSON.stringify(currentData.value, null, 2)

    // 重新生成树数据
    treeData.value = convertToTree(currentData.value)

    // 开始编辑新字段
    editingNode.value = newPath
    statusMessage.value = '已添加新字段'
  }
}

function removeNode(nodePath: string) {
  if (!nodePath) return

  if (confirm('确定要删除此项吗？')) {
    const pathParts = nodePath.split('.')
    const lastKey = pathParts.pop()!

    let parent = currentData.value
    if (pathParts.length > 0) {
      parent = getValueByPath(currentData.value, pathParts.join('.'))
    }

    if (parent && lastKey in parent) {
      // 处理数组索引
      if (Array.isArray(parent) && /^\d+$/.test(lastKey)) {
        parent.splice(parseInt(lastKey), 1)
      } else {
        delete parent[lastKey]
      }

      // 更新原始JSON视图
      rawJsonValue.value = JSON.stringify(currentData.value, null, 2)

      // 重新生成树数据
      treeData.value = convertToTree(currentData.value)

      editingNode.value = null
      statusMessage.value = '已删除项'
    }
  }
}

function getValueByPath(obj: any, path: string): any {
  const parts = path.split('.')
  let current = obj

  for (const part of parts) {
    if (current === undefined || current === null) return undefined

    // 处理数组索引
    if (Array.isArray(current) && /^\d+$/.test(part)) {
      current = current[parseInt(part)]
    } else {
      current = current[part]
    }
  }

  return current
}

function setValueByPath(obj: any, path: string, value: any) {
  const parts = path.split('.')
  const lastKey = parts.pop()!
  let current = obj

  for (const part of parts) {
    if (current[part] === undefined || typeof current[part] !== 'object') {
      current[part] = {}
    }

    // 处理数组索引
    if (Array.isArray(current) && /^\d+$/.test(part)) {
      current = current[parseInt(part)]
    } else {
      current = current[part]
    }
  }

  // 处理数组索引赋值
  if (Array.isArray(current) && /^\d+$/.test(lastKey)) {
    current[parseInt(lastKey)] = value
  } else {
    current[lastKey] = value
  }
}

// 原始JSON编辑方法
function onRawJsonChange() {
  try {
    JSON.parse(rawJsonValue.value)
    jsonParseError.value = ''
  } catch (error) {
    jsonParseError.value = error instanceof Error ? error.message : '未知错误'
  }
}

function formatJson() {
  try {
    const parsed = JSON.parse(rawJsonValue.value)
    rawJsonValue.value = JSON.stringify(parsed, null, 2)
    jsonParseError.value = ''
  } catch (error) {
    // 保持原样
  }
}

function addNewField() {
  if (editMode.value === 'tree') {
    // 在根层级添加新字段
    const newKey = `newField${Object.keys(currentData.value).length + 1}`
    currentData.value[newKey] = ''

    // 更新原始JSON视图
    rawJsonValue.value = JSON.stringify(currentData.value, null, 2)

    // 重新生成树数据
    treeData.value = convertToTree(currentData.value)

    // 开始编辑新字段
    editingNode.value = newKey
    statusMessage.value = '已添加新字段'
  } else {
    // 在原始JSON模式下的处理
    try {
      const data = JSON.parse(rawJsonValue.value)
      const newKey = `newField${Object.keys(data).length + 1}`
      data[newKey] = ''
      rawJsonValue.value = JSON.stringify(data, null, 2)
      jsonParseError.value = ''
    } catch (error) {
      // 如果JSON无效，创建一个新的
      rawJsonValue.value = JSON.stringify({ newField1: '' }, null, 2)
    }
  }
}

// 监听搜索
watch(searchQuery, (newValue) => {
  if (newValue.trim()) {
    // 展开所有匹配的节点
    expandMatchingNodes(treeData.value)
  }
})

function expandMatchingNodes(nodes: JsonNodeType[]) {
  for (const node of nodes) {
    const matches = node.key.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (node.isLeaf && String(node.value).toLowerCase().includes(searchQuery.value.toLowerCase()))

    if (matches && !node.isLeaf) {
      node.expanded = true
    }

    if (node.children) {
      expandMatchingNodes(node.children)
    }
  }
}

// 生命周期
onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.stat-data-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

// 工具栏（保持不变）
.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
}

.toolbar-left {
  display: flex;
  gap: 8px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: white;
  color: #475569;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  &:hover:not(:disabled) {
    background: #f1f5f9;
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .icon {
    width: 14px;
    height: 14px;
  }
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.change-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  font-size: 12px;
  color: #92400e;

  .dot {
    width: 6px;
    height: 6px;
    background: #f59e0b;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  font-size: 12px;
  color: #64748b;

  &.status-loading {
    color: #6366f1;
  }
}

// 搜索框（保持不变）
.search-box {
  position: relative;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.search-icon {
  position: absolute;
  left: 28px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: #94a3b8;
}

.search-input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
}

.search-clear {
  position: absolute;
  right: 28px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 20px;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #64748b;
  }
}

// 数据容器
.data-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.loading-container,
.empty-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #64748b;
}

.loading-container .spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-container .empty-icon {
  width: 64px;
  height: 64px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
}

.empty-btn {
  padding: 8px 16px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #4f46e5;
    transform: translateY(-1px);
  }
}

.json-editor-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}

// 编辑模式选择器
.edit-mode-selector {
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.mode-buttons {
  display: flex;
  gap: 8px;
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 8px;
  font-size: 14px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  &.active {
    background: #6366f1;
    border-color: #6366f1;
    color: white;
  }

  .mode-icon {
    width: 16px;
    height: 16px;
  }
}

.edit-tools {
  display: flex;
  gap: 8px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.danger {
    color: #dc2626;
    border-color: #fecaca;

    &:hover {
      background: #fef2f2;
      border-color: #fca5a5;
    }
  }

  .tool-icon {
    width: 14px;
    height: 14px;
  }
}

// 树形编辑器
.tree-editor {
  flex: 1;
  overflow-y: auto;
}

.json-tree {
  padding: 16px;
}

// 原始JSON编辑器
.raw-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-header {
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-info {
  font-size: 14px;
  color: #64748b;
}

.editor-size {
  font-size: 13px;
  color: #94a3b8;
  font-family: monospace;
}

.json-editor {
  flex: 1;
  padding: 16px;
  border: none;
  outline: none;
  resize: none;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 14px;
  line-height: 1.5;
  background: #f8fafc;
  color: #1e293b;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;

    &:hover {
      background: #94a3b8;
    }
  }
}

.json-error {
  padding: 12px 16px;
  background: #fef2f2;
  border-top: 1px solid #fecaca;
  color: #dc2626;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;

  .error-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
}

/* 强制浅色下拉框样式 */
:deep(.json-node-editor) {
  /* 确保下拉框在JSON节点中也是浅色 */
  select,
  select option {
    background: #f8fafc !important;
    color: #1e293b !important;
  }
}

/* 全局强制浅色下拉框 */
select,
select option {
  background: #f8fafc !important;
  color: #1e293b !important;
}

/* 强制浅色背景覆盖 */
.stat-data-editor * {
  select,
  select option {
    background: #f8fafc !important;
    color: #1e293b !important;
  }
}

/* 为深色模式提供回退 */
@media (prefers-color-scheme: dark) {
  .stat-data-editor {
    /* 确保整个编辑器在深色模式下保持浅色 */
    background: white;
    color: #1e293b;
  }

  /* 强制所有下拉框保持浅色 */
  select,
  select option {
    background: #f8fafc !important;
    color: #1e293b !important;
  }

  /* 确保编辑器内容区域保持浅色 */
  .json-editor,
  .tree-editor,
  .raw-editor {
    background: #f8fafc;
    color: #1e293b;
  }

  /* 覆盖可能继承的深色样式 */
  .json-node-editor :deep(select),
  .json-node-editor :deep(select option) {
    background: #f8fafc !important;
    color: #1e293b !important;
  }
}

// 响应式
@media (max-width: 640px) {
  .editor-toolbar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .toolbar-right {
    justify-content: space-between;
  }

  .edit-mode-selector {
    flex-direction: column;
    align-items: stretch;
  }

  .mode-buttons,
  .edit-tools {
    flex-wrap: wrap;
  }

  .editor-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
}
</style>
