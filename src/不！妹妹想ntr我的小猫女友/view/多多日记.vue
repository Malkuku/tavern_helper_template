<template>
  <div class="diary-container">
    <h2 class="page-title">多多日记</h2>

    <!-- 心情值显示 -->
    <div class="mood-section">
      <div class="mood-header">
        <span class="mood-label">当前心情</span>
        <span class="mood-value">{{ moodValue }}</span>
      </div>
      <div class="mood-bar">
        <div
          class="mood-fill"
          :style="{ width: moodPercentage + '%' }"
          :class="moodClass"
        ></div>
      </div>
      <div class="mood-info">
        <span class="mood-reason">{{ moodReason || '暂无心情变化记录' }}</span>
        <span class="mood-form">{{ currentForm }}</span>
      </div>
    </div>

    <div class="diary-content">
      <div v-if="diaryContent" class="diary-entry">
        <h3 class="entry-date">{{ currentDateTime }}</h3>
        <p class="entry-text">{{ diaryContent }}</p>
      </div>
      <div v-else class="no-diary">
        <p>暂无日记内容</p>
      </div>
    </div>

    <!-- 落叶特效 - 使用 key 强制重新创建 -->
    <div :key="leavesKey" class="falling-leaves">
      <div class="leaf leaf-1">🍂</div>
      <div class="leaf leaf-2">🍁</div>
      <div class="leaf leaf-3">🍂</div>
      <div class="leaf leaf-4">🍁</div>
      <div class="leaf leaf-5">🍂</div>
      <div class="leaf leaf-6">🍁</div>
      <div class="leaf leaf-7">🍂</div>
      <div class="leaf leaf-8">🍁</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onActivated, onMounted, onUnmounted, ref, computed, watch } from 'vue';
import { useStatStore } from '../store/StatStore';
import { useMessageStore } from '../store/MessageStore';

const statStore = useStatStore();
const massageStore = useMessageStore();
const diaryContent = ref('');
const currentDateTime = ref('');
const leavesKey = ref(0);

// 心情值相关数据
const moodValue = ref(60);
const moodReason = ref('无');
const currentForm = ref('猫');

// 计算心情百分比和样式类
const moodPercentage = computed(() => {
  return Math.max(0, Math.min(300, (moodValue.value * 100 / 300)));
});

const moodClass = computed(() => {
  if (moodValue.value > 260) return 'mood-excellent';
  if (moodValue.value > 160) return 'mood-good';
  if (moodValue.value > 90) return 'mood-normal';
  if (moodValue.value > 10) return 'mood-poor';
  return 'mood-bad';
});

function updateDiary() {
  try {
    // 匹配最后一个 <duoduo> 标签对，且内容中不包含 <duoduo> 的
    const regex = /<duoduo>((?:(?!<duoduo>)[\s\S])*?)<\/duoduo>(?![\s\S]*<duoduo>[\s\S]*<\/duoduo>)/;
    const match = massageStore.message.match(regex);

    if (match && match[1]) {
      diaryContent.value = match[1].trim();
    } else {
      diaryContent.value = '';
    }
    updateDateTime();
  } catch (error) {
    console.error('获取日记内容失败:', error);
    diaryContent.value = '';
  }
}

// 更新心情值数据
function updateMoodData() {
  try {
    const specialStatus = statStore.stat_data?.角色?.多多?.特殊状态;
    if (specialStatus) {
      moodValue.value = specialStatus.心情值;
      moodReason.value = specialStatus.心情值变化原因 || '无';
      currentForm.value = specialStatus.当前形态 || '猫';
    }
  } catch (error) {
    console.error('获取心情值数据失败:', error);
  }
}

// 从MVU变量获取日期时间信息
function updateDateTime() {
  try {
    const date = statStore.stat_data?.世界.日期;
    const time = statStore.stat_data?.世界.时间;

    if (date && time) {
      currentDateTime.value = `${date} ${time}`;
    } else if (date) {
      currentDateTime.value = date;
    } else if (time) {
      currentDateTime.value = time;
    } else {
      currentDateTime.value = '未知时间';
    }
  } catch (error) {
    console.error('获取MVU日期时间失败:', error);
    currentDateTime.value = '未知时间';
  }
}

watch(
  () => statStore.stat_data,
  () => {
    updateDiary();
    updateMoodData();
  },
  { immediate: true, deep: true },
);

// 重置落叶动画
function resetLeaves() {
  leavesKey.value++;
}

// 组件激活时重置动画
onActivated(() => {
  resetLeaves();
});

// 组件挂载时
onMounted(() => {
  resetLeaves();
});

// 组件卸载时
onUnmounted(() => {
  // 强制重置 key，确保下次创建时是新的实例
  leavesKey.value = 0;
});
</script>

<style lang="scss" scoped>
.diary-container {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.2), rgba(180, 83, 9, 0.25), rgba(146, 64, 14, 0.2));
  border-radius: 18px;
  border: 1px solid rgba(180, 83, 9, 0.5);
  box-shadow:
    0 12px 40px rgba(180, 83, 9, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset,
    0 4px 12px rgba(146, 64, 14, 0.15);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 24px;
  min-width: 400px;
  max-width: 600px;
  width: 100%;
  box-sizing: border-box;
  font-family: 'Microsoft YaHei', Arial, sans-serif;
  position: relative;
  z-index: 2;
  overflow: hidden;
}

.page-title {
  color: #ffffff;
  font-size: 20px;
  font-weight: 700;
  text-align: center;
  margin: 0 0 20px 0;
  text-shadow: 0px 2px 4px rgba(146, 64, 14, 0.4);
}

/* 心情值样式 */
.mood-section {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  border: 1px solid rgba(180, 83, 9, 0.3);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.mood-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.mood-label {
  color: #fbbf24;
  font-size: 14px;
  font-weight: 600;
  text-shadow: 0px 1px 2px rgba(146, 64, 14, 0.3);
}

.mood-value {
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
  text-shadow: 0px 1px 3px rgba(0, 0, 0, 0.3);
}

.mood-bar {
  width: 100%;
  height: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
  border: 1px solid rgba(180, 83, 9, 0.2);
}

.mood-fill {
  height: 100%;
  border-radius: 4px;
  transition: all 0.5s ease-in-out;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
    animation: shimmer 2s infinite;
  }

  &.mood-excellent {
    background: linear-gradient(90deg, #10b981, #34d399);
  }

  &.mood-good {
    background: linear-gradient(90deg, #059669, #10b981);
  }

  &.mood-normal {
    background: linear-gradient(90deg, #d97706, #f59e0b);
  }

  &.mood-poor {
    background: linear-gradient(90deg, #ea580c, #f97316);
  }

  &.mood-bad {
    background: linear-gradient(90deg, #dc2626, #ef4444);
  }
}

.mood-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.mood-reason {
  color: #f8fafc;
  opacity: 0.8;
  max-width: 70%;
  line-height: 1.4;
  word-break: break-word;
  white-space: normal;
}

.mood-form {
  color: #fbbf24;
  font-weight: 600;
  background: rgba(180, 83, 9, 0.3);
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid rgba(251, 191, 36, 0.5);
}

.diary-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  z-index: 3;
}

.diary-entry {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(180, 83, 9, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    transform: translateY(-2px);
    border-color: rgba(180, 83, 9, 0.5);
    box-shadow: 0 6px 20px rgba(180, 83, 9, 0.25);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(180, 83, 9, 0.1), transparent);
    border-radius: 12px;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover::before {
    opacity: 1;
  }
}

.entry-date {
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 12px 0;
  text-shadow: 0px 1px 3px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 1;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;

  &::before {
    content: '';
    display: inline-block;
    width: 4px;
    height: 16px;
    background: linear-gradient(135deg, #d97706, #b45309);
    border-radius: 2px;
    margin-right: 8px;
    box-shadow: 0 0 8px rgba(180, 83, 9, 0.4);
  }
}

.entry-text {
  color: #f8fafc;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 1;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.2);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(180, 83, 9, 0.2);
  transition: all 0.3s ease;

  white-space: pre-wrap;
  word-wrap: break-word;

  .diary-entry:hover & {
    background: rgba(0, 0, 0, 0.3);
    border-color: rgba(180, 83, 9, 0.3);
    color: #ffffff;
  }
}

.no-diary {
  text-align: center;
  padding: 40px 20px;
  color: #fbbf24;
  font-style: italic;
  text-shadow: 0px 1px 2px rgba(146, 64, 14, 0.3);
  position: relative;
  z-index: 3;
}

/* 落叶特效 */
.falling-leaves {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.leaf {
  position: absolute;
  font-size: 18px;
  opacity: 0;
  animation: fall linear infinite;
  filter: drop-shadow(0 2px 4px rgba(146, 64, 14, 0.3));
  z-index: 1;
  animation-fill-mode: forwards;
}

.leaf-1 {
  left: 10%;
  animation-duration: 8s;
  animation-delay: 0s;
}

.leaf-2 {
  left: 25%;
  animation-duration: 10s;
  animation-delay: 2s;
}

.leaf-3 {
  left: 40%;
  animation-duration: 12s;
  animation-delay: 4s;
}

.leaf-4 {
  left: 55%;
  animation-duration: 9s;
  animation-delay: 1s;
}

.leaf-5 {
  left: 70%;
  animation-duration: 11s;
  animation-delay: 3s;
}

.leaf-6 {
  left: 85%;
  animation-duration: 13s;
  animation-delay: 5s;
}

.leaf-7 {
  left: 20%;
  animation-duration: 7s;
  animation-delay: 6s;
}

.leaf-8 {
  left: 65%;
  animation-duration: 14s;
  animation-delay: 7s;
}

@keyframes fall {
  0% {
    transform: translateY(-50px) translateX(0) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 0.8;
  }
  90% {
    opacity: 0.6;
  }
  100% {
    transform: translateY(calc(100% + 50px)) translateX(20px) rotate(360deg);
    opacity: 0;
  }
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .diary-container {
    min-width: 300px;
    max-width: 100%;
    padding: 16px;
    margin: 0 12px;
    border-radius: 14px;
  }

  .mood-section {
    padding: 12px;
    margin-bottom: 16px;
  }

  .mood-value {
    font-size: 16px;
  }

  .mood-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .mood-reason {
    max-width: 100%;
  }

  .diary-entry {
    padding: 16px;
    border-radius: 10px;
  }

  .entry-date {
    font-size: 15px;
    margin-bottom: 10px;

    &::before {
      height: 14px;
      margin-right: 6px;
    }
  }

  .entry-text {
    font-size: 13px;
    padding: 10px;
  }

  .leaf {
    font-size: 16px;
  }
}

/* 动画效果 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.diary-container {
  animation: fadeInUp 0.5s ease-out;
}

.diary-entry {
  animation: fadeInUp 0.6s ease-out;
}

.mood-section {
  animation: fadeInUp 0.4s ease-out;
}
</style>
