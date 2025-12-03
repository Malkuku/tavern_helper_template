<template>
  <div class="data-table">
    <!-- 顶部操作栏 -->
    <div class="toolbar">
      <button class="del-toggle" @click="toggleDeleteMode">
        {{ deleteMode ? '取消' : '删除条目' }}
      </button>
    </div>

    <!-- 列表 -->
    <div v-if="rows.length" class="table-list">
      <!-- 表头：只在删除模式下出现 -->
      <div v-if="deleteMode" class="table-header">
        <label class="check-all">
          <input type="checkbox" :checked="isAllChecked" @change="toggleCheckAll" />
          <span>全选</span>
        </label>
      </div>

      <!-- 数据行 -->
      <div v-for="(row) in pageRows" :key="row.k" class="table-row">
        <!-- 勾选框：只在删除模式下出现 -->
        <input
          v-if="deleteMode"
          v-model="checkedKeys"
          type="checkbox"
          :value="row.k"
          class="row-check"
        />
        <span class="row-key">{{ row.k }}</span>
        <span class="row-val">{{ row.v }}</span>
      </div>

      <!-- 底部删除栏：只在删除模式下出现 -->
      <div v-if="deleteMode && checkedKeys.length" class="batch-bar">
        <span>已选 {{ checkedKeys.length }} 项</span>
        <button class="del-btn" @click="deleteSelected">确认删除</button>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <span>{{ emptyText }}</span>
    </div>

    <!-- 分页器 -->
    <div v-if="totalPage > 1" class="pagination">
      <button
        :disabled="current === 1"
        @click="current--"
      >‹</button>

      <button
        v-for="p in displayPages"
        :key="p"
        :class="{active: p === current}"
        @click="current = p"
      >{{ p }}</button>

      <button
        :disabled="current === totalPage"
        @click="current++"
      >›</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStatStore } from '../store/StatStore';

const props = withDefaults(defineProps<{
  data: Record<string, any>
  roleName?: string
  tableMode?: string
  pageSize?: number
  emptyText?: string
}>(), {
  pageSize: 10,
  emptyText: '暂无数据',
  roleName: '',
  tableMode: ''
})

const rows = computed(() =>
  Object.entries(props.data).map(([k, v]) => ({ k, v })).reverse()
)

/* --------- 删除模式开关 --------- */
const deleteMode = ref(false)                 // 是否处于“可删除”状态
const checkedKeys = ref<string[]>([])         // 已勾选的 key

const toggleDeleteMode = () => {
  deleteMode.value = !deleteMode.value
  if (!deleteMode.value) checkedKeys.value = [] // 退出时清空勾选
}

/* --------- 全选逻辑 --------- */
const isAllChecked = computed(() => {
  const pageKeys = pageRows.value.map(r => r.k)
  return pageKeys.length > 0 && pageKeys.every(k => checkedKeys.value.includes(k))
})
const toggleCheckAll = () => {
  const pageKeys = pageRows.value.map(r => r.k)
  if (isAllChecked.value) {
    checkedKeys.value = checkedKeys.value.filter(k => !pageKeys.includes(k))
  } else {
    checkedKeys.value = Array.from(new Set([...checkedKeys.value, ...pageKeys]))
  }
}

const statStore = useStatStore();

/* --------- 删除逻辑 --------- */
const deleteSelected = async () => {
  if (!checkedKeys.value.length || !statStore.stat_data) return

  /* 1. 只读对照树 */
  const total = statStore.stat_data.数据总览
  if (!total) return

  const roleName  = props.roleName
  const moduleKey = props.tableMode

  /* 2. 构建最小删除对象 */
  const deletePayload: any = {}

  /* 3. 只处理当前角色-当前模块里被勾选的 key */
  const targetMod = total[roleName]?.[moduleKey]
  if (!targetMod) {
    toastr.error('找不到对应模块')
    return
  }

  /* 4. 把要删的 key 在 deletePayload 里标记为 {} */
  checkedKeys.value.forEach(k => {
    // 防御：如果后端已经没有这个 key，就跳过
    if (!(k in targetMod)) return

    // 逐层确保父级存在
    if (!deletePayload[roleName]) deletePayload[roleName] = {}
    if (!deletePayload[roleName][moduleKey]) deletePayload[roleName][moduleKey] = {}

    // 只放“待删”标记
    deletePayload[roleName][moduleKey][k] = {}
  })

  /* 5. 若没有任何有效待删键，直接返回 */
  if (Object.keys(deletePayload).length === 0) return

  /* 6. 发出去——里面只有要删的路径，其余字段不会出现 */
  await eventEmit('era:deleteByObject', {
    数据总览: deletePayload
  })

  toastr.success('删除成功')

  deleteMode.value = false
}

/* 分页逻辑 */
const current = ref(1)
const totalPage = computed(() => Math.ceil(rows.value.length / props.pageSize))
const pageRows = computed(() => {
  const start = (current.value - 1) * props.pageSize
  return rows.value.slice(start, start + props.pageSize)
})

/* 显示页码（最多 7 个） */
const displayPages = computed(() => {
  const total = totalPage.value
  const cur = current.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  let left = Math.max(1, cur - 3)
  const right = Math.min(total, left + 6)
  if (right - left < 6) left = Math.max(1, right - 6)
  return Array.from({ length: right - left + 1 }, (_, i) => left + i)
})
</script>

<style lang="scss" scoped>
.data-table {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.table-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.table-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 14px;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}
.del-toggle {
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all .2s;
}
.del-toggle:hover { border-color: var(--accent); color: var(--accent); }

/* 表头 */
.table-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  font-size: 13px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}
.check-all { display: flex; align-items: center; gap: 6px; }

/* 行内 checkbox */
.row-check { margin-right: 10px; }

/* 底部操作栏 */
.batch-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 14px;
}
.del-btn {
  border: 1px solid #e88080;
  background: #fff;
  color: #e88080;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all .2s;
}
.del-btn:hover { background: #e88080; color: #fff; }

.row-key {
  margin-right: 8px;
  color: var(--text-secondary);
}

.row-val {
  font-weight: 500;
  color: var(--text-primary);
}

.empty-state {
  text-align: center;
  padding: 32px;
  color: var(--text-tertiary);
  font-size: 14px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
}

.pagination button {
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.pagination button:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.pagination button.active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
