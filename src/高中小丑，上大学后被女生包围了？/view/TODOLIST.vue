<template>
  <div class="character-status" :class="theme">
    <!-- TODOLIST 模块 -->
    <div class="todo-section">
      <div class="section-header">
        <h3 class="section-title">// TODO LIST</h3>
        <div class="section-actions">
          <button class="clear-btn" @click="clearCompletedTasks">
            ()=>{清空已完成 / 已失效}
          </button>
        </div>
      </div>

      <div class="todo-content">
        <!-- 任务列表 -->
        <div class="task-list">
          <div
            v-for="(task, taskName, index) in paginatedTasks"
            :key="currentPage * pageSize + index"
            class="task-item"
            :class="{
              'task-completed': task.已完成,
              'task-expired': task.已失效,
              'task-active': !task.已完成 && !task.已失效
            }"
          >
            <!-- 任务状态指示器 -->
            <div class="task-status">
              <span class="status-icon">
                {{
                  task.已完成 ? '✅' :
                    task.已失效 ? '💀' :
                      '📌'
                }}
              </span>
            </div>

            <!-- 任务内容 -->
            <div class="task-content">
              <div class="task-header">
                <span class="task-brief">// {{ taskName }}</span>
                <span class="task-deadline" v-if="task.截止时间">
                  [截止: {{ task.截止时间 }}]
                </span>
              </div>

              <div class="task-details">
                <div class="task-objective">
                  <span class="code-comment">// 目标:</span>
                  <span class="objective-text">{{ task.目标 }}</span>
                </div>

                <div class="task-reward">
                  <span class="code-comment">// 奖励:</span>
                  <span class="reward-text">{{ task.完成奖励 || '暂无' }}</span>
                </div>

                <!-- 进度条 -->
                <div class="task-progress" v-if="!task.已失效">
                  <div class="progress-info">
                    <span class="code-comment">// 进度:</span>
                    <span class="progress-text">
                      {{ task.进度 }}/{{ task.完成所需进度 }}
                      ({{ Math.min(100, Math.round((task.进度 / task.完成所需进度) * 100)) }}%)
                    </span>
                  </div>
                  <div class="progress-bar">
                    <div
                      class="progress-fill"
                      :style="{ width: Math.min(100, (task.进度 / task.完成所需进度) * 100) + '%' }"
                    ></div>
                  </div>
                </div>

                <!-- 失效状态显示 -->
                <div v-if="task.已失效" class="task-expired-info">
                  <span class="code-comment expired-text">// 任务已失效</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="Object.keys(filteredTasks).length === 0" class="empty-tasks">
          <div class="empty-icon">💤</div>
          <div class="empty-text">// 暂无任务，享受悠闲时光~</div>
        </div>

        <!-- 分页控件 -->
        <div v-if="totalPages > 1" class="pagination">
          <button
            class="page-btn"
            :disabled="currentPage === 0"
            @click="currentPage--"
          >
            ◀ 上一页
          </button>

          <span class="page-info">
            {{ currentPage + 1 }} / {{ totalPages }}
          </span>

          <button
            class="page-btn"
            :disabled="currentPage === totalPages - 1"
            @click="currentPage++"
          >
            下一页 ▶
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useStatStore } from '../store/StatStore'

/* ---------- 类型定义 ---------- */
interface Task {
  已完成: boolean
  已失效: boolean
  目标: string
  完成奖励?: string
  进度: number
  完成所需进度: number
  截止时间?: string
}

/* ---------- 分页状态 ---------- */
const currentPage = ref(0)
const pageSize = 3

/* ---------- Store ---------- */
const statStore = useStatStore()

const theme = computed(() => (statStore.stat_data?.theme ? statStore.stat_data.theme : 'autumn'));

/* ---------- 数据 ---------- */
const tasks = computed<Record<string, Task>>(() =>
  (statStore.stat_data?.任务 as Record<string, Task>) || {}
)

/* ---------- 过滤 & 排序 ---------- */
const filteredTasks = computed<Record<string, Task>>(() => {
  const entries = Object.entries(tasks.value)
    .filter(([name]) => !name.endsWith('$template'))
    .sort(([, a], [, b]) => {
    if (!a.已完成 && !a.已失效) return -1
    if (!b.已完成 && !b.已失效) return 1
    if (a.已完成 && !b.已完成) return -1
    if (!a.已完成 && b.已完成) return 1
    return 0
  })
  return Object.fromEntries(entries) as Record<string, Task>
})

/* ---------- 分页 ---------- */
const paginatedTasks = computed<Record<string, Task>>(() => {
  const start = currentPage.value * pageSize
  const end = start + pageSize
  const slice = Object.entries(filteredTasks.value).slice(start, end)
  return Object.fromEntries(slice) as Record<string, Task>
})

const totalPages = computed(() =>
  Math.ceil(Object.keys(filteredTasks.value).length / pageSize)
)

/* ---------- 清空已完成 & 已失效 ---------- */
const clearCompletedTasks = () => {
  const cleaned = Object.fromEntries(
    Object.entries(tasks.value).filter(
      ([, t]) => !t.已完成 && !t.已失效
    )
  ) as Record<string, Task>
  //TODO
  console.log( cleaned);
  currentPage.value = 0
}

/* ---------- 初始化 ---------- */
onMounted(() => {
  statStore.initData()
  statStore.registerListener()
})
</script>

<style lang="scss" scoped>
.todo-section {
  margin-bottom: 2rem;
  background: rgba(255, 250, 240, 0.9);
  border-radius: 12px;
  border: 1px solid #e8d5b7;
  overflow: hidden;
  font-family: 'Courier New', monospace;

  .starry & {
    background: linear-gradient(135deg, rgba(26, 35, 50, 0.95) 0%, rgba(35, 45, 63, 0.95) 100%);
    border: 1px solid #4a6572;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px dashed #e8d5b7;

  .starry & {
    border-bottom-color: #4a6572;
  }
}

.section-title {
  font-size: 1.4rem;
  margin: 0;
  color: #8b4513;
  font-family: 'Courier New', monospace;
  font-weight: bold;

  .starry & {
    color: #5d8aa8;
    text-shadow: 0 0 8px rgba(93, 138, 168, 0.3);
  }
}

.section-actions {
  display: flex;
  gap: 1rem;
}

.clear-btn {
  padding: 0.5rem 1rem;
  background: rgba(139, 69, 19, 0.1);
  color: #8b4513;
  border: 1px solid #d4b78c;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(139, 69, 19, 0.2);
    transform: translateY(-1px);
  }

  .starry & {
    background: rgba(93, 138, 168, 0.1);
    color: #5d8aa8;
    border-color: #4a6572;

    &:hover {
      background: rgba(93, 138, 168, 0.2);
    }
  }
}

.todo-content {
  padding: 1.5rem;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  min-height: 200px;
}

.task-item {
  display: flex;
  gap: 1rem;
  padding: 1.2rem;
  background: rgba(255, 253, 248, 0.8);
  border-radius: 8px;
  border-left: 4px solid #d4b78c;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &.task-active {
    border-left-color: #8b4513;
    background: rgba(139, 69, 19, 0.05);
  }

  &.task-completed {
    border-left-color: #27ae60;
    background: rgba(39, 174, 96, 0.05);

    .task-brief {
      text-decoration: line-through;
      opacity: 0.7;
    }
  }

  &.task-expired {
    border-left-color: #7f8c8d;
    background: rgba(127, 140, 141, 0.05);

    .task-brief {
      opacity: 0.6;
    }

    .task-deadline {
      color: #7f8c8d;
    }
  }

  .starry & {
    background: rgba(35, 45, 63, 0.8);

    &.task-active {
      border-left-color: #5d8aa8;
      background: rgba(93, 138, 168, 0.1);
    }

    &.task-completed {
      border-left-color: #27ae60;
      background: rgba(39, 174, 96, 0.1);
    }

    &.task-expired {
      border-left-color: #95a5a6;
      background: rgba(149, 165, 166, 0.1);
    }
  }
}

.task-status {
  display: flex;
  align-items: flex-start;
  padding-top: 0.2rem;
}

.status-icon {
  font-size: 1.2rem;
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.8rem;
  gap: 1rem;
}

.task-brief {
  font-size: 1.1rem;
  font-weight: bold;
  color: #5c4b37;
  line-height: 1.4;

  .starry & {
    color: #e3f2fd;
  }
}

.task-deadline {
  font-size: 0.85rem;
  color: #8b4513;
  white-space: nowrap;

  .starry & {
    color: #bbdefb;
  }
}

.task-details {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.code-comment {
  color: #8b4513;
  font-weight: bold;
  margin-right: 0.5rem;

  .starry & {
    color: #5d8aa8;
  }

  &.expired-text {
    color: #7f8c8d;

    .starry & {
      color: #95a5a6;
    }
  }
}

.task-objective,
.task-reward {
  font-size: 0.95rem;
  line-height: 1.4;
}

.objective-text,
.reward-text {
  color: #5c4b37;

  .starry & {
    color: #bbdefb;
  }
}

.task-progress {
  margin-top: 0.5rem;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.4rem;
}

.progress-text {
  font-size: 0.9rem;
  color: #8b4513;
  font-weight: bold;

  .starry & {
    color: #5d8aa8;
  }
}

.progress-bar {
  height: 6px;
  background: #f5e8c8;
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid #d4b78c;

  .starry & {
    background: rgba(26, 35, 50, 0.8);
    border-color: #4a6572;
  }
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #8b4513 0%, #d2691e 100%);
  border-radius: 2px;
  transition: width 0.5s ease;

  .task-completed & {
    background: linear-gradient(90deg, #27ae60 0%, #2ecc71 100%);
  }

  .starry & {
    background: linear-gradient(90deg, #5d8aa8 0%, #7bb4c4 100%);

    .task-completed & {
      background: linear-gradient(90deg, #27ae60 0%, #2ecc71 100%);
    }
  }
}

.task-expired-info {
  margin-top: 0.5rem;
}

.empty-tasks {
  text-align: center;
  padding: 3rem 2rem;
  color: #8b4513;

  .starry & {
    color: #5d8aa8;
  }
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-text {
  font-size: 1.1rem;
  font-style: italic;
  font-family: 'Courier New', monospace;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px dashed #e8d5b7;

  .starry & {
    border-top-color: #4a6572;
  }
}

.page-btn {
  padding: 0.5rem 1rem;
  background: rgba(139, 69, 19, 0.1);
  color: #8b4513;
  border: 1px solid #d4b78c;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background: rgba(139, 69, 19, 0.2);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  .starry & {
    background: rgba(93, 138, 168, 0.1);
    color: #5d8aa8;
    border-color: #4a6572;

    &:hover:not(:disabled) {
      background: rgba(93, 138, 168, 0.2);
    }
  }
}

.page-info {
  font-size: 0.9rem;
  color: #8b4513;
  font-weight: bold;
  font-family: 'Courier New', monospace;

  .starry & {
    color: #5d8aa8;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .task-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .pagination {
    flex-direction: column;
    gap: 1rem;
  }

  .page-btn {
    width: 100%;
  }
}
</style>
