<template>
  <div class="status-container">
    <h2 class="page-title">人物状态</h2>
    <div class="status-content">
      <div class="status-item progress-item">
        <div class="status-label">压抑值
          <span v-if="depressionReason" class="reason-text">({{ depressionReason }})</span>
        </div>
        <div class="progress-container">
          <div class="progress-bar">
            <div
              class="progress-fill depression"
              :class="getDepressionStage(depressionValue).className"
              :style="{ width: depressionValue + '%' }"
            ></div>
          </div>
          <div class="progress-text">
            {{ depressionValue }}
          </div>
        </div>
        <div class="stage-indicator">{{ getDepressionStage(depressionValue).name }}</div>
      </div>
      <div class="status-item progress-item">
        <div class="status-label">恶堕值
          <span v-if="corruptionReason" class="reason-text">({{ corruptionReason }})</span>
        </div>
        <div class="progress-container">
          <div class="progress-bar">
            <div
              class="progress-fill corruption"
              :class="getCorruptionStage(corruptionValue).className"
              :style="{ width: corruptionValue + '%' }"
            ></div>
          </div>
          <div class="progress-text">
            {{ corruptionValue }}

          </div>
        </div>
        <div class="stage-indicator">{{ getCorruptionStage(corruptionValue).name }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, ref } from 'vue'
import { useStatStore } from '../store/StatStore'

const statStore = useStatStore()

const depressionValue = ref(0);
const corruptionValue = ref(0);
const depressionReason = ref('');
const corruptionReason = ref('');

// 压抑值阶段定义
const depressionStages = [
  { min: 0, max: 20, name: '心如止水', className: 'stage-calm' },
  { min: 21, max: 50, name: '焦躁不安', className: 'stage-anxious' },
  { min: 51, max: 80, name: '欲火焚身', className: 'stage-craving' },
  { min: 81, max: 99, name: '煎熬难忍', className: 'stage-critical' },
  { min: 100, max: 100, name: '崩溃决堤', className: 'stage-breakdown' }
];

// 恶堕值阶段定义
const corruptionStages = [
  { min: 0, max: 0, name: '忠贞的爱', className: 'stage-calm' },
  { min: 1, max: 20, name: '愧疚与挣扎', className: 'stage-guilt' },
  { min: 21, max: 60, name: '沉沦与合理化', className: 'stage-rationalization' },
  { min: 61, max: 90, name: '背叛与重塑', className: 'stage-betrayal' },
  { min: 91, max: 100, name: '新的平衡', className: 'stage-new-balance' }
];

// 获取压抑值阶段
const getDepressionStage = (value: number) => {
  const stage = depressionStages.find(stage => value >= stage.min && value <= stage.max);
  return stage || depressionStages[0];
};

// 获取恶堕值阶段
const getCorruptionStage = (value: number) => {
  const stage = corruptionStages.find(stage => value >= stage.min && value <= stage.max);
  return stage || corruptionStages[0];
};

// 监听 statStore 中的值变化
watch(
  [
    () => statStore.stat_data?.角色.user.特殊状态.性压抑值,
    () => statStore.stat_data?.角色.user.特殊状态.恶堕值,
    () => statStore.stat_data?.角色.user.特殊状态.性压抑值变化原因,
    () => statStore.stat_data?.角色.user.特殊状态.恶堕值变化原因
  ],
  ([newDepression, newCorruption, newDepressionReason, newCorruptionReason]) => {
    depressionValue.value = newDepression!
    corruptionValue.value = newCorruption!
    depressionReason.value = newDepressionReason!
    corruptionReason.value = newCorruptionReason!
  },
  { immediate: true } // 立即执行一次
)
</script>

<style lang="scss" scoped>
.status-container {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.2));
  border-radius: 18px;
  border: 1px solid rgba(147, 197, 253, 0.4);
  box-shadow:
    0 12px 40px rgba(59, 130, 246, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset,
    0 4px 12px rgba(37, 99, 235, 0.15);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 24px;
  min-width: 400px;
  max-width: 600px;
  width: 100%;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .status-container {
    min-width: 300px;
    max-width: 100%;
    padding: 16px;
    margin: 0 12px;
  }
}

.page-title {
  color: #ffffff;
  font-size: 20px;
  font-weight: 700;
  text-align: center;
  margin: 0 0 20px 0;
  text-shadow: 0px 2px 4px rgba(0, 0, 0, 0.3);
}

.status-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-item {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(147, 197, 253, 0.25);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    transform: translateY(-2px);
    border-color: rgba(147, 197, 253, 0.4);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.2);
  }
}

.status-label {
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0px 1px 3px rgba(0, 0, 0, 0.3);
  min-width: 45px;
  margin-bottom: 8px;
}

.progress-item {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.progress-bar {
  flex: 1;
  height: 12px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(147, 197, 253, 0.3);
  position: relative;
}

.progress-fill {
  height: 100%;
  border-radius: 5px;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;

  // 压抑值颜色阶段
  &.stage-calm {
    background: linear-gradient(90deg, #10b981, #34d399);
    box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
  }

  &.stage-anxious {
    background: linear-gradient(90deg, #f59e0b, #fbbf24);
    box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
  }

  &.stage-craving {
    background: linear-gradient(90deg, #f97316, #fb923c);
    box-shadow: 0 0 12px rgba(249, 115, 22, 0.4);
  }

  &.stage-critical {
    background: linear-gradient(90deg, #dc2626, #ef4444);
    box-shadow: 0 0 12px rgba(220, 38, 38, 0.4);
  }

  &.stage-breakdown {
    background: linear-gradient(90deg, #7c2d12, #dc2626);
    box-shadow: 0 0 16px rgba(220, 38, 38, 0.6);
    animation: pulse-danger 2s infinite;
  }

  // 恶堕值颜色阶段
  &.stage-guilt {
    background: linear-gradient(90deg, #6366f1, #818cf8);
    box-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
  }

  &.stage-rationalization {
    background: linear-gradient(90deg, #8b5cf6, #a78bfa);
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.4);
  }

  &.stage-betrayal {
    background: linear-gradient(90deg, #c026d3, #d946ef);
    box-shadow: 0 0 12px rgba(192, 38, 211, 0.4);
  }

  &.stage-new-balance {
    background: linear-gradient(90deg, #86198f, #c026d3);
    box-shadow: 0 0 16px rgba(192, 38, 211, 0.6);
    animation: pulse-corruption 2s infinite;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    animation: shimmer 2s infinite;
    border-radius: 5px;
  }
}

.progress-text {
  font-size: 11px;
  font-weight: 700;
  color: #ffffff;
  min-width: 32px;
  text-align: center;
  background: rgba(0, 0, 0, 0.4);
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}

.reason-text {
  font-size: 0.8em;
  font-weight: 500;
  color: #fbbf24;
  opacity: 0.9;
  text-shadow: 0px 1px 1px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all 0.3s ease;
  position: relative;
  max-width: 200px;
  padding: 4px 8px;
  border-radius: 4px;
  z-index: 10;
  white-space: normal;
  word-break: break-word;
}


.stage-indicator {
  font-size: 11px;
  font-weight: 600;
  color: #f8fafc;
  text-align: center;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 4px;
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.3);
}

// 动画定义
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@keyframes pulse-danger {
  0%, 100% {
    box-shadow: 0 0 12px rgba(220, 38, 38, 0.4);
  }
  50% {
    box-shadow: 0 0 20px rgba(220, 38, 38, 0.8);
  }
}

@keyframes pulse-corruption {
  0%, 100% {
    box-shadow: 0 0 12px rgba(192, 38, 211, 0.4);
  }
  50% {
    box-shadow: 0 0 20px rgba(192, 38, 211, 0.8);
  }
}

// 移动端适配
@media (max-width: 768px) {
  .status-label {
    font-size: 12px;
  }

  .progress-bar {
    height: 10px;
  }

  .progress-text {
    font-size: 10px;
    min-width: 28px;
    padding: 4px 8px;
    flex-direction: column;
    gap: 2px;
  }

  .reason-text {
    font-size: 10px;
    max-width: 60px; /* 移动端更小的最大宽度 */
    font-size: 0.8em;
  }

  .stage-indicator {
    font-size: 10px;
    padding: 3px 6px;
  }
}

// 超小屏幕适配
@media (max-width: 480px) {
  .progress-text {
    flex-direction: column;
    gap: 1px;
  }


  .reason-text {
    max-width: 50px;
    font-size: 0.8em;
    line-height: 1;
  }

  .reason-text:hover {
    max-width: 120px;
  }
}
</style>
