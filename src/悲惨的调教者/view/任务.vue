<template>
  <div class="task-panel" :class="theme">
    <div class="info-card">
      <div class="card-header">
        <h2 class="card-title">任务</h2>
      </div>

      <!-- 加载 / 空状态 -->
      <div v-if="!statData" class="loading-state">
        <div class="loading-spinner"></div>
        <p>正在加载任务列表...</p>
      </div>
      <div v-else-if="taskList.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <p>尊贵的【卡特琳娜·索菲娅】小姐打算让你喘一口气</p>
      </div>

      <!-- 任务列表 -->
      <div v-else class="content-wrapper">
        <section class="section">
          <h3 class="section-title">
            当前任务
            <span class="task-count">{{ taskList.length }}</span>
          </h3>

          <div class="task-list">
            <div
              v-for="(task, key) in taskList"
              :key="key"
              class="task-card"
              :class="{
                completed: task.已完成,
                failed: task.已失败,
              }"
            >
              <div class="task-header">
                <div class="task-title-row">
                  <h4 class="task-title">{{ task.目标 }}</h4>
                  <div class="task-badges">
                    <span v-if="task.已完成" class="badge badge-success">已完成</span>
                    <span v-else-if="task.已失败" class="badge badge-danger">已失败</span>
                  </div>
                </div>
                <div class="task-deadline">
                  <span class="icon">⏱️</span>
                  <span>{{ formatDeadline(task.截止时间) }}</span>
                </div>
              </div>

              <div class="task-footer">
                <div class="task-id">ID: {{ key }}</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useStatStore } from '../store/StatStore';

interface Task {
  目标: string;
  截止时间: string;
  已完成: boolean;
  已失败: boolean;
}

const statStore = useStatStore();

/* 主题 */
const theme = computed(() => (statStore.stat_data?.theme === 'dark' ? 'dark' : 'light'));

/* 原始数据 */
const statData = computed(() => statStore.stat_data);

/* 任务列表 */
const taskList = computed<Task[]>(() => {
  const raw = statData.value?.任务 || {};
  const arr: Task[] = [];
  for (const key in raw) {
    if (key === '$template' || key === '$meta') continue;
    arr.push(raw[key] as Task);
  }
  return arr;
});

/* 格式化截止时间 */
function formatDeadline(dl: string): string {
  return dl === '未知' || !dl ? '暂无截止时间' : dl;
}
</script>

<style lang="scss" scoped>
.task-panel {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f7fa;
  --bg-tertiary: #fafbfc;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --text-tertiary: #999999;
  --border-color: #e4e7ed;
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  --accent: #409eff;
  --success: #67c23a;
  --danger: #f56c6c;
  --warning: #e6a23c;
  --radius: 12px;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.task-panel.dark {
  --bg-primary: #141414;
  --bg-secondary: #1f1f1f;
  --bg-tertiary: #262626;
  --text-primary: #ffffff;
  --text-secondary: #a6a6a6;
  --text-tertiary: #737373;
  --border-color: #303030;
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  --accent: #1890ff;
  --success: #52c41a;
  --danger: #ff4d4f;
  --warning: #faad14;
}

.task-panel {
  padding: 24px;
  background: var(--bg-secondary);
  transition: var(--transition);
}

.info-card {
  background: var(--bg-primary);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
  max-width: 900px;
  margin: 0 auto;
}

.card-header {
  padding: 24px;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
  color: white;
}

.card-title {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.5px;
}

.card-subtitle {
  font-size: 14px;
  opacity: 0.9;
  font-weight: 400;
}

.content-wrapper {
  padding: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-count {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: normal;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-card {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid var(--border-color);
  transition: var(--transition);
  position: relative;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
  border-color: var(--accent);
}

.task-card.completed {
  opacity: 0.75;
  border-color: var(--success);
}

.task-card.failed {
  opacity: 0.75;
  border-color: var(--danger);
}

.task-card.urgent {
  border-color: var(--warning);
}

.task-header {
  margin-bottom: 12px;
}

.task-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.task-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.task-badges {
  display: flex;
  gap: 6px;
}

.badge {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.badge-success {
  background: var(--success);
  color: white;
}

.badge-danger {
  background: var(--danger);
  color: white;
}

.badge-warning {
  background: var(--warning);
  color: white;
}

.task-deadline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-secondary);
}

.icon {
  font-size: 14px;
}

.task-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}

.task-id {
  font-size: 12px;
  color: var(--text-tertiary);
  font-family: monospace;
}

.btn-complete {
  border: none;
  background: var(--accent);
  color: white;
  font-size: 14px;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: var(--transition);
}

.btn-complete:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.loading-state,
.empty-state {
  padding: 48px;
  text-align: center;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent);
  border-radius: 50%;
  margin: 0 auto 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

@media (max-width: 768px) {
  .task-panel {
    padding: 16px;
  }

  .card-header {
    padding: 20px;
  }

  .card-title {
    font-size: 20px;
  }

  .content-wrapper {
    padding: 20px;
  }

  .task-card {
    padding: 16px;
  }

  .task-title-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .task-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}

.task-panel.dark ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.task-panel.dark ::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

.task-panel.dark ::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.task-panel.dark ::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}
</style>
