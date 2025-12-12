<template>
  <div class="stat-data-editor">
    <!-- 顶部工具栏 -->
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

        <!-- 使用 FileImportExport 组件替换原来的导入/导出按钮 -->
        <FileImportExport
          ref="fileImportExportRef"
          import-text="导入JSON"
          export-text="导出草稿"
          :require-confirm="true"
          @file-loaded="handleFileLoaded"
          @export-data="exportDraft"
        />
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

    <!-- 搜索框 -->
    <PathSearch v-model="searchQuery" />

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
        <!-- 工具按钮区 -->
        <div class="edit-tools">
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
              class="tool-btn"
              :disabled="editMode !== 'tree'"
              @click="openAddFieldModal"
            >
              <svg class="tool-icon" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a1 1 0 0 1 1 1v6h6a1 1 0 0 1 0 2H9v6a1 1 0 0 1-2 0V9H1a1 1 0 0 1 0-2h6V1a1 1 0 0 1 1-1z"/>
              </svg>
              添加字段
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
        </div>
      </div>

        <!-- 树形编辑视图 -->
        <div v-if="editMode === 'tree'" class="tree-editor">
          <div class="json-tree">
            <JsonNodeEdit
              v-for="node in filteredTreeData"
              :key="node.path"
              :node="node"
              :edit-mode="true"
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
            <span class="editor-info">编辑原始JSON数据</span>
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

    <EraConfirmModal
      v-model:visible="showConfirmModal"
      :title="confirmTitle"
      :content="confirmContent"
      :type="confirmType"
      @confirm="handleConfirmAction"
      @cancel="handleCancelAction"
    />

    <!-- 添加字段模态框 -->
    <div v-if="showAddFieldModal" class="modal-overlay">
      <div class="modal">
        <h3>添加新字段</h3>

        <div class="modal-body">
          <div class="form-group">
            <label>字段路径：</label>
            <input
              v-model="newField.path"
              type="text"
              placeholder="例如：user.info.name"
              class="form-input"
            >
            <div class="form-hint">
              支持多层路径，用点分隔。如果父路径不存在会自动创建对象。
            </div>
          </div>

          <div class="form-group">
            <label>值类型：</label>
            <select v-model="newField.type" class="form-select" @change="onTypeChange">
              <option value="string">字符串</option>
              <option value="number">数字</option>
              <option value="boolean">布尔值</option>
              <option value="null">空值 (null)</option>
              <option value="object">对象 (JSON)</option>
              <option value="array">数组 (JSON)</option>
            </select>
          </div>

          <!-- 字符串输入 -->
          <div v-if="newField.type === 'string'" class="form-group">
            <label>字符串值：</label>
            <input
              v-model="newField.value"
              type="text"
              placeholder="输入字符串值"
              class="form-input"
            >
          </div>

          <!-- 数字输入 -->
          <div v-else-if="newField.type === 'number'" class="form-group">
            <label>数字值：</label>
            <input
              v-model.number="newField.value"
              type="number"
              placeholder="输入数字值"
              class="form-input"
              step="any"
            >
          </div>

          <!-- 布尔值选择 -->
          <div v-else-if="newField.type === 'boolean'" class="form-group">
            <label>布尔值：</label>
            <div class="boolean-options">
              <label class="boolean-option">
                <input
                  v-model="newField.value"
                  type="radio"
                  :value="true"
                >
                <span>true</span>
              </label>
              <label class="boolean-option">
                <input
                  v-model="newField.value"
                  type="radio"
                  :value="false"
                >
                <span>false</span>
              </label>
            </div>
          </div>

          <!-- 空值显示 -->
          <div v-else-if="newField.type === 'null'" class="form-group">
            <div class="null-info">
              <svg class="null-icon" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0z"/>
              </svg>
              <span>该字段将被设置为 null</span>
            </div>
          </div>

          <!-- JSON对象/数组编辑器 -->
          <div v-else-if="newField.type === 'object' || newField.type === 'array'" class="form-group">
            <label>{{ newField.type === 'object' ? '对象值 (JSON)' : '数组值 (JSON)' }}：</label>
            <div class="json-editor-container">
              <div class="json-editor-header">
                <span>JSON编辑器</span>
                <button
                  v-if="isValidJson"
                  class="btn-small"
                  title="格式化JSON"
                  @click="formatJsonValue"
                >
                  <svg class="format-icon" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M5 1h6v2H5V1zm0 12h6v2H5v-2zM1 5h2v6H1V5zm12 0h2v6h-2V5z"/>
                  </svg>
                </button>
              </div>
              <textarea
                v-model="newField.jsonValue"
                class="json-editor-input"
                :placeholder="getJsonPlaceholder()"
                rows="6"
                @input="validateJson"
              ></textarea>
              <div v-if="jsonError" class="json-error">
                <svg class="error-icon" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM7 3h2v7H7V3zm0 9h2v2H7v-2z"/>
                </svg>
                <span>JSON错误：{{ jsonError }}</span>
              </div>
              <div v-else-if="newField.jsonValue.trim()" class="json-success">
                <svg class="success-icon" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.3536 2.64645C13.5488 2.84171 13.5488 3.15829 13.3536 3.35355L6.35355 10.3536C6.15829 10.5488 5.84171 10.5488 5.64645 10.3536L3.64645 8.35355C3.45118 8.15829 3.45118 7.84171 3.64645 7.64645C3.84171 7.45118 4.15829 7.45118 4.35355 7.64645L6 9.29289L12.6464 2.64645C12.8417 2.45118 13.1583 2.45118 13.3536 2.64645Z"/>
                </svg>
                <span>有效的JSON格式</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn primary" :disabled="!isValidInput" @click="confirmAddField">
            添加
          </button>
          <button class="btn" @click="cancelAddField">
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useEraEditStore } from '../../stores/EraEditStore'
import type { JsonNodeType } from '../types/JsonNode'
import JsonNodeEdit from '../components/JsonNode/JsonNodeEdit.vue';
import EraConfirmModal from '../components/Dialog/EraConfirmModal.vue';
import FileImportExport from '../components/File/FileImportExport.vue';
import PathSearch from '../components/Search/PathSearch.vue';
import { eraLogger } from '../../utils/EraHelperLogger';

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

// 组件引用
const fileImportExportRef = ref<InstanceType<typeof FileImportExport> | null>(null)

// 原始JSON编辑
const rawJsonValue = ref('')
const jsonParseError = ref('')

// 状态消息
const statusMessage = ref('就绪')

// 树形数据
const treeData = ref<JsonNodeType[]>([])

// 确认弹窗相关
const showConfirmModal = ref(false)
const confirmTitle = ref('')
const confirmContent = ref('')
const confirmType = ref<'confirm' | 'alert'>('confirm')
const pendingAction = ref<() => void>(() => {})

// 打开确认弹窗
function openConfirmModal(
  title: string,
  content: string,
  type: 'confirm' | 'alert' = 'confirm',
  onConfirm?: () => void,
  onCancel?: () => void
) {
  confirmTitle.value = title
  confirmContent.value = content
  confirmType.value = type
  showConfirmModal.value = true

  if (onConfirm) {
    pendingAction.value = onConfirm
  }
}

// 处理确认
function handleConfirmAction() {
  if (pendingAction.value) {
    pendingAction.value()
  }
  pendingAction.value = () => {}
}

// 处理取消
function handleCancelAction() {
  pendingAction.value = () => {}
}

// 处理导入的文件
function handleFileLoaded(content: string) {
  try {
    const jsonData = JSON.parse(content)

    // 更新当前数据
    currentData.value = jsonData
    originalData.value = JSON.parse(JSON.stringify(jsonData))
    rawJsonValue.value = JSON.stringify(jsonData, null, 2)

    // 转换为树形结构
    treeData.value = convertToTree(jsonData)

    statusMessage.value = `成功导入数据，共 ${countNodes(treeData.value)} 个节点`
  } catch (error) {
    eraLogger.error('导入数据失败:', error)
    statusMessage.value = '导入失败，请检查文件格式'
    alert(`导入失败：${error instanceof Error ? error.message : '未知错误'}`)
  }
}

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

// 导出草稿数据
function exportDraft() {
  if (!currentData.value) return

  try {
    // 创建带时间戳的文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, -5)
    const filename = `era-stat-data-${timestamp}.json`

    // 将当前数据转换为JSON字符串
    const dataStr = JSON.stringify(currentData.value, null, 2)

    // 创建并下载文件
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    statusMessage.value = '草稿导出成功'
  } catch (error) {
    eraLogger.error('导出草稿失败:', error)
    statusMessage.value = '导出草稿失败'
  } finally {
    setTimeout(() => {
      if (statusMessage.value === '草稿导出成功' || statusMessage.value === '导出草稿失败') {
        statusMessage.value = '就绪'
      }
    }, 3000)
  }
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
    eraLogger.error('加载数据失败:', error)
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
  // 如果有未保存的更改，可以添加确认提示
  if (hasChanges.value) {
    openConfirmModal(
      '保存确认',
      '是否保存所有更改？',
      'confirm',
      async () => {
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
          eraLogger.error('保存失败:', error)
          statusMessage.value = '保存失败'
        } finally {
          saving.value = false
        }
      }
    )
  } else {
    // 如果没有更改，直接显示提示
    openConfirmModal(
      '提示',
      '没有需要保存的更改',
      'alert'
    )
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
  // 打开模态框，预填父路径
  newField.value.path = nodePath ? `${nodePath}.newField` : 'newField'
  showAddFieldModal.value = true
}

function removeNode(nodePath: string) {
  if (!nodePath) return

  openConfirmModal(
    '删除确认',
    '确定要删除此项吗？',
    'confirm',
    () => {
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
  )
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

// 添加字段模态框
const showAddFieldModal = ref(false)
const jsonError = ref('')
const isValidJson = ref(false)

interface NewField {
  path: string
  type: 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array'
  value: string | number | boolean | null
  jsonValue: string
}

const newField = ref<NewField>({
  path: '',
  type: 'string',
  value: '', // 初始化为字符串
  jsonValue: ''
})

// 计算属性：检查输入是否有效
const isValidInput = computed(() => {
  const { path, type } = newField.value

  if (!path.trim()) return false

  switch (type) {
    case 'string':
      // 对于字符串类型，确保值存在且非空
      return typeof newField.value.value === 'string' && newField.value.value.trim() !== ''

    case 'number':
      // 对于数字类型，确保是数字且非空
      return typeof newField.value.value === 'number' ||
        (typeof newField.value.value === 'string' && newField.value.value.trim() !== '')

    case 'boolean':
      // 对于布尔类型，确保值存在（可能是 true/false）
      return newField.value.value !== undefined && newField.value.value !== null

    case 'null':
      // null 类型总是有效的
      return true

    case 'object':
    case 'array':
      // 对于对象/数组类型，检查 JSON 是否有效
      return isValidJson.value && newField.value.jsonValue.trim() !== ''

    default:
      return false
  }
})

function cancelAddField() {
  showAddFieldModal.value = false
}

// 方法
function onTypeChange() {
  const type = newField.value.type

  // 根据类型设置默认值
  switch (type) {
    case 'string':
      newField.value.value = ''
      break
    case 'number':
      newField.value.value = 0
      break
    case 'boolean':
      newField.value.value = true
      break
    case 'null':
      newField.value.value = null
      break
    case 'object':
      newField.value.jsonValue = '{}'
      break
    case 'array':
      newField.value.jsonValue = '[]'
      break
  }
}

function getJsonPlaceholder() {
  if (newField.value.type === 'object') {
    return '{\n  "key1": "value1",\n  "key2": 123\n}'
  } else {
    return '[\n  "item1",\n  "item2",\n  123\n]'
  }
}

function validateJson() {
  const jsonStr = newField.value.jsonValue.trim()

  if (!jsonStr) {
    jsonError.value = ''
    isValidJson.value = false
    return
  }

  try {
    const parsed = JSON.parse(jsonStr)

    // 检查类型匹配
    if (newField.value.type === 'object' && !(parsed && typeof parsed === 'object' && !Array.isArray(parsed))) {
      jsonError.value = '必须是有效的JSON对象（不是数组）'
      isValidJson.value = false
    } else if (newField.value.type === 'array' && !Array.isArray(parsed)) {
      jsonError.value = '必须是有效的JSON数组'
      isValidJson.value = false
    } else {
      jsonError.value = ''
      isValidJson.value = true
    }
  } catch (error) {
    jsonError.value = error instanceof Error ? error.message : '无效的JSON格式'
    isValidJson.value = false
  }
}

function formatJsonValue() {
  if (!isValidJson.value) return

  try {
    const parsed = JSON.parse(newField.value.jsonValue)
    newField.value.jsonValue = JSON.stringify(parsed, null, 2)
  } catch (error) {
    // 忽略错误
  }
}

function openAddFieldModal() {
  newField.value = {
    path: '',
    type: 'string',
    value: '',
    jsonValue: ''
  }
  jsonError.value = ''
  isValidJson.value = false
  showAddFieldModal.value = true
}
function confirmAddField() {
  const { path, type } = newField.value

  if (!path.trim()) {
    alert('请输入字段路径')
    return
  }

  if (!isValidInput.value) {
    alert('请输入有效的字段值')
    return
  }

  try {
    let finalValue: any

    switch (type) {
      case 'string':
        finalValue = newField.value.value
        break
      case 'number':
        finalValue = parseFloat(String(newField.value.value))
        if (isNaN(finalValue)) {
          alert('请输入有效的数字')
          return
        }
        break
      case 'boolean':
        finalValue = newField.value.value
        break
      case 'null':
        finalValue = null
        break
      case 'object':
      case 'array':
        if (!isValidJson.value || !newField.value.jsonValue.trim()) {
          alert('请输入有效的JSON数据')
          return
        }
        finalValue = JSON.parse(newField.value.jsonValue)
        break
      default:
        finalValue = newField.value.value
    }

    setValueByPath(currentData.value, path, finalValue)

    // 更新原始JSON视图
    rawJsonValue.value = JSON.stringify(currentData.value, null, 2)

    // 重新生成树数据
    treeData.value = convertToTree(currentData.value)

    // 开始编辑新字段
    editingNode.value = path
    statusMessage.value = '已添加新字段'

    showAddFieldModal.value = false

  } catch (error) {
    eraLogger.error('添加字段失败:', error)
    alert(`添加字段失败：${error instanceof Error ? error.message : '未知错误'}`)
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

// 强制所有表单元素使用浅色主题
/* 强制浅色输入框和选择框 */
input,
select,
textarea,
option {
  background: #f8fafc !important;
  color: #1e293b !important;
  border-color: #e2e8f0 !important;
}

/* 选择框选项强制浅色 */
select option {
  background: #f8fafc !important;
  color: #1e293b !important;
}

/* 输入框聚焦状态 */
input:focus,
select:focus,
textarea:focus {
  border-color: #6366f1 !important;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;
}

/* 只读和禁用状态 */
input:disabled,
select:disabled,
textarea:disabled {
  background: #f1f5f9 !important;
  color: #94a3b8 !important;
  cursor: not-allowed;
}

/* 占位符颜色 */
input::placeholder,
textarea::placeholder {
  color: #94a3b8 !important;
  opacity: 1;
}

// 工具栏
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
  gap: 4px;
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  background: white;
  color: #475569;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

  &:hover:not(:disabled) {
    background: #f1f5f9;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .icon {
    width: 12px;
    height: 12px;
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
  // 添加横向滚动支持
  overflow-x: auto;
}

.json-tree {
  padding: 16px;
  // 确保内容宽度适应其子元素
  min-width: 100%;
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
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  font-size: 11px;
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
    width: 14px;
    height: 14px;
  }
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  font-size: 11px;
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
    width: 12px;
    height: 12px;
  }
}

.edit-tools {
  display: flex;
  margin-top: 5px;
  margin-bottom: 5px;
  gap: 6px;
}

// 树形编辑器
.tree-editor {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  width: 100%;
  // 确保有足够的空间显示节点上方的按钮
  padding-top: 10px;

  // 添加滚动条样式
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
  }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
}

.json-tree {
  padding: 16px;
  width: 100%;
  // 添加最小宽度以支持横向滚动
  min-width: fit-content;
}

// 原始JSON编辑器
.raw-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f8fafc !important;
  color: #1e293b !important;
  min-height: 350px;
}

.editor-header {
  padding: 12px 16px;
  background: #f1f5f9 !important;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #1e293b !important;
}

.editor-info {
  font-size: 14px;
  color: #64748b !important;
}

.editor-size {
  font-size: 13px;
  color: #94a3b8 !important;
  font-family: monospace;
}

.json-editor {
  flex: 1;
  padding: 16px;
  outline: none;
  resize: none;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 14px;
  line-height: 1.5;
  background: #ffffff !important;
  color: #1e293b !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 6px;
  margin: 16px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: auto; // 添加滚动
  white-space: pre; // 保持空白字符
  min-width: min-content; // 确保内容不会被压缩

  &:focus {
    border-color: #6366f1 !important;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;
  }

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

  &::placeholder {
    color: #94a3b8 !important;
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

// 添加字段模态框样式
.modal-overlay {
  position: absolute;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 450px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal h3 {
  margin: 0;
  padding: 24px 24px 16px;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  border-bottom: 1px solid #e2e8f0;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #475569;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #1e293b !important;
  background: #f8fafc !important;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: #94a3b8 !important;
  }
}

/* 强制选择框选项使用浅色 */
.form-select option {
  background: #f8fafc !important;
  color: #1e293b !important;
}

// 布尔值选项
.boolean-options {
  display: flex;
  gap: 16px;
}

.boolean-option {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #f8fafc !important;
  color: #1e293b !important;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9 !important;
    border-color: #cbd5e1;
  }

  input {
    margin: 0;
  }

  span {
    font-size: 14px;
    color: #1e293b !important;
  }
}

// 空值显示
.null-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px dashed #cbd5e1;

  .null-icon {
    width: 16px;
    height: 16px;
    color: #64748b;
  }

  span {
    font-size: 14px;
    color: #64748b;
  }
}

// JSON编辑器容器
.json-editor-container {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: #f8fafc !important;
}

.json-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f1f5f9 !important;
  border-bottom: 1px solid #e2e8f0;

  span {
    font-size: 12px;
    font-weight: 500;
    color: #1e293b !important;
  }
}

.btn-small {
  padding: 4px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  .format-icon {
    width: 12px;
    height: 12px;
    color: #64748b;
  }
}

.json-editor-input {
  width: 100%;
  padding: 12px;
  border: none;
  outline: none;
  resize: vertical;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 13px;
  line-height: 1.5;
  background: white !important;
  color: #1e293b !important;
  min-height: 120px;

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: #94a3b8 !important;
  }
}

.json-error,
.json-success {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 12px;
  border-top: 1px solid #fecaca;
}

.json-error {
  background: #fef2f2;
  color: #dc2626;

  .error-icon {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }
}

.json-success {
  background: #f0fdf4;
  color: #16a34a;
  border-color: #bbf7d0;

  .success-icon {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }
}

.modal-actions {
  padding: 16px 24px 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 10px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
  color: #475569;

  &:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn.primary {
  background: #6366f1;
  border-color: #6366f1;
  color: white;

  &:hover:not(:disabled) {
    background: #4f46e5;
    border-color: #4f46e5;
  }
}

/* 深色模式强制覆盖 */
@media (prefers-color-scheme: dark) {
  /* 强制整个编辑器使用浅色主题 */
  .stat-data-editor,
  .stat-data-editor * {
    background: #f8fafc !important;
    color: #1e293b !important;
  }

  /* 强制所有输入框和选择框使用浅色 */
  input,
  select,
  textarea,
  option,
  .form-input,
  .form-select,
  .form-textarea,
  .boolean-option {
    background: #f8fafc !important;
    color: #1e293b !important;
    border-color: #e2e8f0 !important;
  }

  /* 强制选择框选项使用浅色 */
  select option,
  .form-select option {
    background: #f8fafc !important;
    color: #1e293b !important;
  }

  /* 强制模态框使用浅色 */
  .modal {
    background: white !important;
    color: #1e293b !important;
  }

  /* 强制编辑器区域使用浅色 */
  .json-editor,
  .json-editor-input,
  .raw-editor,
  .tree-editor {
    background: #ffffff !important;
    color: #1e293b !important;
  }

  /* 强制按钮使用浅色样式 */
  .btn,
  .toolbar-btn,
  .mode-btn,
  .tool-btn {
    background: white !important;
    color: #1e293b !important;
    border-color: #e2e8f0 !important;
  }

  .btn.primary {
    background: #6366f1 !important;
    color: white !important;
    border-color: #6366f1 !important;
  }

  .mode-btn.active {
    background: #6366f1 !important;
    color: white !important;
  }
}

/* 使用 :deep 选择器穿透子组件样式（如果需要的话） */
:deep(.json-node-editor) {
  input,
  select,
  textarea,
  option {
    background: #f8fafc !important;
    color: #1e293b !important;
    border-color: #e2e8f0 !important;
  }

  select option {
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

  .modal {
    width: 95%;
    margin: 10px;
  }

  .modal-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>