<template>
  <div class="world-info-container">
    <!-- 世界信息标题 -->
    <div class="world-title-section">
      <h2 class="world-title">
        <span class="world-icon">🌍</span>
        世界信息
      </h2>
      <p class="world-description">当前世界的状态和环境详情</p>
    </div>

    <!-- 世界信息卡片网格 -->
    <div class="world-grid">
      <!-- 日期卡片 -->
      <div class="info-card date-card">
        <div class="card-icon">📅</div>
        <div class="card-content">
          <h3 class="card-title">日期</h3>
          <p class="card-value">{{ formattedDate }}</p>
        </div>
      </div>

      <!-- 天气卡片 -->
      <div class="info-card weather-card">
        <div class="card-icon">☀️</div>
        <div class="card-content">
          <h3 class="card-title">天气</h3>
          <p class="card-value">{{ worldInfo.天气 || '未知' }}</p>
        </div>
      </div>

      <!-- 温度卡片 -->
      <div class="info-card temperature-card">
        <div class="card-icon">🌡️</div>
        <div class="card-content">
          <h3 class="card-title">温度</h3>
          <p class="card-value">{{ worldInfo.温度 || '未知' }}</p>
        </div>
      </div>

      <!-- 在场人物卡片 -->
      <div class="info-card people-card">
        <div class="card-icon">👥</div>
        <div class="card-content">
          <h3 class="card-title">在场人物</h3>
          <p class="card-value">{{ worldInfo.在场人物 || '无' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useStatStore } from '@/尘史使徒/store/StatStore';

const statStore = useStatStore();

// 计算属性：获取世界信息
const worldInfo = computed(() => {
  if (!statStore.stat_data || !statStore.stat_data['世界信息']) {
    return {};
  }
  return statStore.stat_data['世界信息'];
});

// 计算属性：格式化日期
const formattedDate = computed(() => {
  if (!worldInfo.value.日期) {
    return '未知日期';
  }
  return worldInfo.value.日期;
});

// 计算属性：最后更新时间
const lastUpdated = ref(null);

onMounted(() => {
  // 初始化统计存储
  statStore.initData();
  statStore.registerListener();

  // 设置最后更新时间
  lastUpdated.value = new Date().toLocaleString('zh-CN');
});
</script>

<style scoped>
/* 世界信息容器 */
.world-info-container {
  display: flex;
  flex-direction: column;
  gap: 25px;
  padding: 20px;
  height: 100%;
}

/* 标题部分 */
.world-title-section {
  text-align: center;
  margin-bottom: 10px;
}

.world-title {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--accent-pink);
  margin: 0 0 10px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.world-icon {
  font-size: 1.5rem;
}

.world-description {
  color: var(--text-secondary);
  font-size: 1rem;
  margin: 0;
}

/* 世界信息网格 */
.world-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 25px;
}

/* 信息卡片 */
.info-card {
  background: linear-gradient(135deg, var(--bg-card), #fefefe);
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 6px 20px var(--shadow-color);
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.info-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--accent-primary), var(--accent-light));
}

.info-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px var(--shadow-color);
}

.card-icon {
  font-size: 2.5rem;
  margin-bottom: 15px;
  text-align: center;
}

.card-content {
  text-align: center;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 10px 0;
}

.card-value {
  font-size: 1.2rem;
  color: var(--accent-pink);
  font-weight: 500;
  margin: 0;
  word-break: break-word;
}

/* 特殊卡片类型的颜色变化 */
.date-card::before {
  background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
}

.weather-card::before {
  background: linear-gradient(90deg, #a1c4fd 0%, #c2e9fb 100%);
}

.temperature-card::before {
  background: linear-gradient(90deg, #ff9a9e 0%, #fecfef 100%);
}

.people-card::before {
  background: linear-gradient(90deg, #f6d365 0%, #fda085 100%);
}

/* 附加信息区域 */
.additional-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 25px;
  margin-top: 15px;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 10px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--accent-primary);
  display: inline-block;
}

.section-content {
  font-size: 1rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
  padding: 10px 15px;
  background: var(--bg-secondary);
  border-radius: 10px;
  border-left: 4px solid var(--accent-primary);
}

/* 场景预览区域 */
.world-scene-preview {
  margin-top: 25px;
  padding-top: 20px;
  border-top: 2px dashed var(--border-color);
}

.scene-content {
  padding: 15px;
  background: linear-gradient(135deg, var(--bg-secondary), var(--bg-primary));
  border-radius: 12px;
  border: 1px solid var(--border-color);
  line-height: 1.7;
  color: var(--text-primary);
  font-style: italic;
}

/* 更新时间 */
.update-info {
  text-align: center;
  color: var(--text-secondary);
  font-style: italic;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px dashed var(--border-color);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .world-info-container {
    padding: 15px;
    gap: 20px;
  }

  .world-title {
    font-size: 1.5rem;
  }

  .world-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .additional-info {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .card-icon {
    font-size: 2rem;
  }

  .card-value {
    font-size: 1.1rem;
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

.info-card {
  animation: fadeInUp 0.5s ease forwards;
}

.info-card:nth-child(1) { animation-delay: 0.1s; }
.info-card:nth-child(2) { animation-delay: 0.2s; }
.info-card:nth-child(3) { animation-delay: 0.3s; }
.info-card:nth-child(4) { animation-delay: 0.4s; }
</style>
