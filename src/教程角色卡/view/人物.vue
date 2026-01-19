<template>
  <div class="character-container">
    <h2 class="character-title">👤 人物信息</h2>
    
    <div v-if="statStore.stat_data && statStore.stat_data['人物信息']" class="characters-grid">
      <!-- 遍历所有人物 -->
      <div 
        v-for="(character, name) in statStore.stat_data['人物信息']" 
        :key="name" 
        class="character-card"
      >
        <div class="character-header">
          <h3 class="character-name">{{ name }}</h3>
        </div>
        
        <div class="character-details">
          <div class="detail-row">
            <span class="detail-label">性别:</span>
            <span class="detail-value">{{ character['性别'] }}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">年龄:</span>
            <span class="detail-value">{{ character['年龄'] }}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">身高:</span>
            <span class="detail-value">{{ character['身高'] }}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">职业:</span>
            <span class="detail-value">{{ character['职业'] }}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">体力:</span>
            <span class="detail-value">
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: `${calculatePercentage(character['体力'], 100)}%` }"
                ></div>
              </div>
              <span class="progress-text">{{ character['体力'] }}/100</span>
            </span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">性欲:</span>
            <span class="detail-value">
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ backgroundColor: getDesireColor(character['性欲']), width: `${calculatePercentage(character['性欲'], 100)}%` }"
                ></div>
              </div>
              <span class="progress-text">{{ character['性欲'] }}/100</span>
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="empty-state">
      <p>暂无人物信息，请等待数据加载...</p>
    </div>
  </div>
</template>

<script setup>
import { useStatStore } from '@/教程角色卡/store/StatStore';

const statStore = useStatStore();

// 计算百分比
const calculatePercentage = (current, max) => {
  return Math.min((current / max) * 100, 100);
};

// 根据性欲值返回颜色
const getDesireColor = (desire) => {
  if (desire < 30) return '#90caf9'; // 浅蓝
  if (desire < 60) return '#ffcc80'; // 浅橙
  return '#f48fb1'; // 粉色
};
</script>

<style scoped>
.character-container {
  padding: 20px;
  background: var(--bg-card);
  border-radius: 12px;
  box-shadow: 0 4px 15px var(--shadow-color);
  border: 1px solid var(--border-color);
}

.character-title {
  color: var(--text-primary);
  font-size: 1.5rem;
  margin-bottom: 25px;
  text-align: center;
  font-weight: 600;
}

.characters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.character-card {
  background: linear-gradient(135deg, #ffffff 0%, var(--bg-secondary) 100%);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 10px var(--shadow-color);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.character-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px var(--shadow-color);
}

.character-header {
  border-bottom: 2px dashed var(--accent-primary);
  padding-bottom: 12px;
  margin-bottom: 15px;
}

.character-name {
  color: var(--accent-pink);
  font-size: 1.3rem;
  margin: 0;
  font-weight: 600;
}

.character-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-weight: 500;
  color: var(--text-primary);
  min-width: 60px;
}

.detail-value {
  color: var(--text-secondary);
  text-align: right;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.progress-bar {
  width: 120px;
  height: 12px;
  background-color: #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-primary), var(--accent-light));
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.9rem;
  color: var(--text-secondary);
  min-width: 60px;
  text-align: right;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
  font-style: italic;
}
</style>