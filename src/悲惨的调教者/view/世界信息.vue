<template>
  <div class="world-info" :class="theme">
    <div class="info-card">
      <div class="card-header">
        <h2 class="card-title">世界信息</h2>
      </div>

      <div class="info-grid">
        <!-- 日期 + 时间 -->
        <div class="info-item date-time">
          <div class="info-label">
            <span class="icon">📅</span>
            <span>日期/时间</span>
          </div>
          <div class="info-value">
            <span class="date">{{ date || '--' }}</span>
            <span v-if="date && time" class="separator" />
            <span class="time">{{ time || '--' }}</span>
          </div>
        </div>

        <div class="info-item">
          <div class="info-label">
            <span class="icon">📍</span>
            <span>地点</span>
          </div>
          <div class="info-value">{{ location || '--' }}</div>
        </div>

        <div class="info-item">
          <div class="info-label">
            <span class="icon">👤</span>
            <span>当前人物</span>
          </div>
          <div class="info-value">{{ currentCharacter || '--' }}</div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="!statData" class="loading-state">
        <div class="loading-spinner"></div>
        <p>正在加载世界信息...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useStatStore } from '../store/StatStore';

const statStore = useStatStore();

// 主题
const theme = computed(() => (statStore.stat_data?.theme === 'dark' ? 'dark' : 'light'));

// 数据
const statData = computed(() => statStore.stat_data);

// 世界信息
const date = computed(() => statData.value?.世界?.日期);
const location = computed(() => statData.value?.世界?.地点);
const time = computed(() => statData.value?.世界?.时间);
const currentCharacter = computed(() => statData.value?.世界?.当前人物);
</script>

<style lang="scss" scoped>
.world-info {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f7fa;
  --bg-tertiary: #fafbfc;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --text-tertiary: #999999;
  --border-color: #e4e7ed;
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  --accent: #409eff;
  --radius: 12px;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.world-info.dark {
  --bg-primary: #141414;
  --bg-secondary: #1f1f1f;
  --bg-tertiary: #262626;
  --text-primary: #ffffff;
  --text-secondary: #a6a6a6;
  --text-tertiary: #737373;
  --border-color: #303030;
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  --accent: #1890ff;
}

.world-info {
  padding: 24px;
  min-height: 100%;
  background: var(--bg-secondary);
  transition: var(--transition);
}

.info-card {
  background: var(--bg-primary);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
  max-width: 800px;
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

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  padding: 24px;
}

.info-item {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 20px;
  transition: var(--transition);
  border: 1px solid var(--border-color);
}

.info-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
  border-color: var(--accent);
}

/* 日期时间合并项 */
.date-time .info-value {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.date {
  color: var(--text-primary);
}

.time {
  color: var(--text-secondary);
  font-weight: 500;
}

.separator {
  color: var(--text-tertiary);
}

.info-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
  font-weight: 500;
}

.icon {
  font-size: 16px;
}

.info-value {
  font-size: 18px;
  color: var(--text-primary);
  font-weight: 600;
  line-height: 1.4;
}

/* 加载状态 */
.loading-state {
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

/* 空状态 */
.empty-state {
  padding: 48px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .world-info {
    padding: 16px;
  }

  .card-header {
    padding: 20px;
  }

  .card-title {
    font-size: 20px;
  }

  .info-grid {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 20px;
  }

  .info-item {
    padding: 16px;
  }

  .info-value {
    font-size: 16px;
  }
}

/* 深色模式下的滚动条 */
.world-info.dark ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.world-info.dark ::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

.world-info.dark ::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.world-info.dark ::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}
</style>
