<template>
  <div class="world-info-container">
    <h2 class="page-title">世界信息</h2>
    <div class="info-content">
      <div class="info-section">
        <div class="info-item time-item">
          <div class="info-label">时间</div>
          <div class="info-value">{{ formattedDateTime }}</div>
        </div>
        <div class="info-item location-item">
          <div class="info-label">地点</div>
          <div class="info-value">{{ currentLocation }}</div>
        </div>
        <div class="info-item character-item">
          <div class="info-label">当前人物</div>
          <div class="info-value">{{ currentCharacter }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const currentDate = ref('');
const currentTime = ref('');
const currentLocation = ref('');
const currentCharacter = ref('');

// 计算格式化后的日期时间显示
const formattedDateTime = computed(() => {
  if (!currentDate.value && !currentTime.value) {
    return '未知时间';
  }

  if (currentDate.value && currentTime.value) {
    return `${currentDate.value} ${currentTime.value}`;
  }

  return currentDate.value || currentTime.value;
});

function updateWorldInfo() {
  // 获取最后一楼的 MVU 变量
  const variables = Mvu.getMvuData({ type: 'message', message_id: getCurrentMessageId() });

  // 获取日期
  currentDate.value = _.get(variables, 'stat_data.世界.日期') || '';
  // 获取当前时间
  currentTime.value = _.get(variables, 'stat_data.世界.时间') || '';
  // 获取地点信息
  currentLocation.value = _.get(variables, 'stat_data.世界.地点') || '未知地点';
  // 获取当前人物
  currentCharacter.value = _.get(variables, 'stat_data.世界.当前人物') || '未知人物';
}

onMounted(() => {
  updateWorldInfo();
});
</script>

<style lang="scss" scoped>
.world-info-container {
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
  font-family: 'Microsoft YaHei', Arial, sans-serif;
}

.page-title {
  color: #ffffff;
  font-size: 20px;
  font-weight: 700;
  text-align: center;
  margin: 0 0 20px 0;
  text-shadow: 0px 2px 4px rgba(0, 0, 0, 0.3);
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-section {
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

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), transparent);
    border-radius: 12px;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover::before {
    opacity: 1;
  }
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(147, 197, 253, 0.2);
  position: relative;
  z-index: 1;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    .info-label {
      color: #bfdbfe;
      text-shadow: 0 0 8px rgba(191, 219, 254, 0.5);
    }

    .info-value {
      color: #ffffff;
      text-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
    }
  }
}

.info-label {
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0px 1px 3px rgba(0, 0, 0, 0.3);
  min-width: 60px;
  transition: all 0.3s ease;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 12px;
  color: #f8fafc;
  font-weight: 600;
  text-align: right;
  flex: 1;
  margin-left: 16px;
  word-break: break-word;
  line-height: 1.4;
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  background: rgba(0, 0, 0, 0.2);
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(147, 197, 253, 0.2);
}

/* 时间特效 - 流动光影 */
.time-item .info-value {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(37, 99, 235, 0.2));
  border-color: rgba(147, 197, 253, 0.4);
  font-weight: 700;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
    animation: timeShimmer 3s infinite;
  }
}

.time-item .info-label::before {
  content: '⏰';
  margin-right: 6px;
  font-size: 12px;
}

/* 地点特效 - 地图标记风格 */
.location-item .info-value {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(22, 163, 74, 0.15));
  border-color: rgba(74, 222, 128, 0.4);
  border-left: 3px solid rgba(74, 222, 128, 0.6);
}

.location-item .info-label::before {
  content: '📍';
  margin-right: 6px;
  font-size: 12px;
}

.location-item:hover .info-value {
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.3);
  transform: translateX(2px);
}

/* 人物特效 - 人物轮廓风格 */
.character-item .info-value {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(147, 51, 234, 0.15));
  border-color: rgba(192, 132, 252, 0.4);
  position: relative;
}

.character-item .info-label::before {
  content: '👤';
  margin-right: 6px;
  font-size: 12px;
}

.character-item:hover .info-value {
  box-shadow: 0 0 12px rgba(168, 85, 247, 0.3);
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.35), rgba(147, 51, 234, 0.25));
}

.character-item .info-value::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 8px;
  width: 4px;
  height: 4px;
  background: rgba(192, 132, 252, 0.8);
  border-radius: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.character-item:hover .info-value::after {
  opacity: 1;
  animation: pulse 1.5s infinite;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .world-info-container {
    min-width: 300px;
    max-width: 100%;
    padding: 16px;
    margin: 0 12px;
    border-radius: 14px;
  }

  .info-section {
    padding: 12px;
    border-radius: 10px;
  }

  .info-item {
    padding: 8px 0;
  }

  .info-label {
    font-size: 12px;
    min-width: 50px;
  }

  .info-value {
    font-size: 11px;
    padding: 4px 8px;
    margin-left: 12px;
  }

  .info-label::before {
    margin-right: 4px;
    font-size: 11px;
  }
}

/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes timeShimmer {
  0% {
    left: -100%;
  }
  50%, 100% {
    left: 100%;
  }
}

@keyframes pulse {
  0%, 100% {
    transform: translateY(-50%) scale(1);
    opacity: 0.8;
  }
  50% {
    transform: translateY(-50%) scale(1.2);
    opacity: 1;
  }
}

.world-info-container {
  animation: fadeIn 0.5s ease-out;
}

.info-item {
  animation: fadeIn 0.6s ease-out;

  &:nth-child(1) { animation-delay: 0.1s; }
  &:nth-child(2) { animation-delay: 0.2s; }
  &:nth-child(3) { animation-delay: 0.3s; }
}
</style>