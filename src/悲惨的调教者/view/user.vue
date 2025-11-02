<template>
  <div class="character-a" :class="theme">
    <div class="info-card">
      <div class="card-header">
        <h2 class="card-title">{{username}}</h2>
      </div>

      <div v-if="!statData" class="loading-state">
        <div class="loading-spinner"></div>
        <p>正在加载角色信息...</p>
      </div>

      <div v-else class="content-wrapper">
        <!-- 特殊状态 -->
        <section class="section">
          <h3 class="section-title">特殊状态</h3>
          <div class="status-grid">
            <!-- 好感度 -->
            <div class="status-card">
              <div class="status-label">
                <span class="icon">❤️</span>
                <span>好感度</span>
              </div>
              <div class="status-value">{{ affection }}</div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: affectionPercent }"></div>
              </div>
              <div class="progress-label">{{ affectionPercent }}</div>
              <div v-if="affectionReason" class="status-reason">{{ affectionReason }}</div>
            </div>

            <!-- 暴露度 -->
            <div class="status-card">
              <div class="status-label">
                <span class="icon">👁️</span>
                <span>暴露度</span>
              </div>
              <div class="status-value">{{ exposure }}</div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: exposurePercent }"></div>
              </div>
              <div class="progress-label">{{ exposurePercent }}</div>
              <div v-if="exposureReason" class="status-reason">{{ exposureReason }}</div>
            </div>

            <!-- 调教经验值 + 等级 -->
            <div class="status-card level-card">
              <div class="status-label">
                <span class="icon">📈</span>
                <span>调教等级</span>
              </div>
              <div class="level-circle">
                <svg viewBox="0 0 36 36" class="level-svg">
                  <path
                    class="level-bg"
                    d="M18 2.084
                       a 15.916 15.916 0 0 1 0 31.832
                       a 15.916 15.916 0 0 1 0 -31.832"
                  />
                  <path
                    class="level-fg"
                    :stroke-dasharray="levelCircleDash"
                    stroke-dashoffset="0"
                    d="M18 2.084
                       a 15.916 15.916 0 0 1 0 31.832
                       a 15.916 15.916 0 0 1 0 -31.832"
                  />
                </svg>
                <div class="level-text">
                  <span class="level-num">{{ level }}</span>
                  <span class="level-small">Lv.</span>
                </div>
              </div>
              <div class="progress-label">
                {{ experience }} / {{ nextLevelNeed }}
              </div>
            </div>
          </div>
        </section>

        <!-- 当前想法 -->
        <section class="section">
          <h3 class="section-title">当前想法</h3>
          <div class="thought-box">
            <p class="thought-content">{{ currentThought || '...' }}</p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStatStore } from '../store/StatStore'

const statStore = useStatStore()

// 主题
const theme = computed(() => statStore.stat_data?.theme === 'dark' ? 'dark' : 'light')

// 数据
const statData = computed(() => statStore.stat_data)

const username = computed(() => {
  return substitudeMacros('{{user}}');
});

// 角色信息
const affection = computed(() => statData.value?.角色?.user?.特殊状态?.好感度 ?? 0)
const affectionReason = computed(() => statData.value?.角色?.user?.特殊状态?.好感度变化原因)
const exposure = computed(() => statData.value?.角色?.user?.特殊状态?.暴露度 ?? 0)
const exposureReason = computed(() => statData.value?.角色?.user?.特殊状态?.暴露度变化原因)
const experience = computed(() => statData.value?.角色?.user?.特殊状态?.调教经验值 ?? 0)
const currentThought = computed(() => statData.value?.角色?.user?.当前想法)

// 阶段配置
const affectionStages = computed<Record<string, number>>(() => statData.value?.好感度阶段?.user ?? {})
const exposureStages = computed<Record<string, number>>(() => statData.value?.暴露度阶段?.user ?? {})
const levelStages = computed<Record<string, number>>(() => statData.value?.调教等级阶段?.user ?? {})
const level = computed(() => statData.value?.调教等级 ?? 0)

// 计算最大阶段值
const maxAffection = computed(() => Math.max(...Object.values(affectionStages.value)))
const maxExposure = computed(() => Math.max(...Object.values(exposureStages.value)))

// 百分比
const affectionPercent = computed(() => {
  const p = Math.min(100, Math.round((affection.value / maxAffection.value) * 100))
  return `${p}%`
})
const exposurePercent = computed(() => {
  const p = Math.min(100, Math.round((exposure.value / maxExposure.value) * 100))
  return `${p}%`
})

// 下一级所需经验
const nextLevelNeed = computed(() => (level.value+1) * 4)

// 圆形进度条
const levelPercent = computed(() => Math.min(100, (experience.value / nextLevelNeed.value) * 100))
const levelCircleDash = computed(() => `${levelPercent.value}, 100`)
</script>

<style lang="scss" scoped>
.character-a {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f7fa;
  --bg-tertiary: #fafbfc;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --text-tertiary: #999999;
  --border-color: #e4e7ed;
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  --accent: #e91e63;
  --accent-hover: #ff4081;
  --radius: 12px;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.character-a.dark {
  --bg-primary: #141414;
  --bg-secondary: #1f1f1f;
  --bg-tertiary: #262626;
  --text-primary: #ffffff;
  --text-secondary: #a6a6a6;
  --text-tertiary: #737373;
  --border-color: #303030;
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  --accent: #ff4081;
  --accent-light: #311b1f;
}

.character-a {
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
  background: linear-gradient(135deg, var(--accent) 0%, #c2185b 100%);
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

.section {
  margin-bottom: 32px;
}

.section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--border-color);
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.status-card {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  border: 1px solid var(--border-color);
  transition: var(--transition);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.status-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
  border-color: var(--accent);
}

.status-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
  font-weight: 500;
}

.icon {
  font-size: 16px;
}

.status-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 8px;
}

/* 进度条 */
.progress-bar {
  width: 80%;
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  margin: 8px 0 4px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-hover));
  transition: width 0.4s ease;
}

.progress-label {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

.status-reason {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.4;
  margin-top: 6px;
}

/* 等级圆形进度条 */
.level-card {
  gap: 8px;
}

.level-circle {
  position: relative;
  width: 80px;
  height: 80px;
}

.level-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.level-bg {
  fill: none;
  stroke: var(--border-color);
  stroke-width: 3.8;
}

.level-fg {
  fill: none;
  stroke: var(--accent);
  stroke-width: 3.8;
  stroke-linecap: round;
  transition: stroke-dasharray 0.4s ease;
}

.level-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  line-height: 1;
}

.level-num {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}

.level-small {
  font-size: 10px;
  color: var(--text-secondary);
}

/* 当前想法 */
.thought-box {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid var(--border-color);
  position: relative;
}

.thought-box::before {
  content: '"';
  position: absolute;
  top: -10px;
  left: 16px;
  font-size: 48px;
  color: var(--accent);
  opacity: 0.3;
}

.thought-content {
  margin: 0;
  font-size: 16px;
  line-height: 1.6;
  color: var(--text-secondary);
  font-style: italic;
  padding-left: 20px;
}

/* 加载状态 */
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
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .character-a {
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

  .status-grid {
    grid-template-columns: 1fr;
  }

  .status-value {
    font-size: 24px;
  }

  .thought-box {
    padding: 16px;
  }

  .thought-content {
    font-size: 15px;
  }
}

/* 深色模式下的滚动条 */
.character-a.dark ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.character-a.dark ::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

.character-a.dark ::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.character-a.dark ::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}
</style>
