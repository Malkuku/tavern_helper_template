<template>
  <div class="data-table">
    <!-- 列表 -->
    <div v-if="rows.length" class="table-list">
      <div v-for="(row, idx) in pageRows" :key="idx" class="table-row">
        <span class="row-key">{{ row.k }}</span>
        <span class="row-val">{{ row.v }}</span>
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

const props = withDefaults(defineProps<{
  data: Record<string, any>
  pageSize?: number
  emptyText?: string
}>(), {
  pageSize: 15,
  emptyText: '暂无数据'
})

const rows = computed(() =>
  Object.entries(props.data).map(([k, v]) => ({ k, v }))
)

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
  let right = Math.min(total, left + 6)
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
