<template>
  <div class="character-status" :class="{ 'starry-theme': !isStarryTheme }">
    <!-- 人物头像区域 -->
    <div class="character-header">
      <div class="avatar-section">
        <div class="avatar-frame">
          <div class="avatar-emoji">{{ characterAvatar }}</div>
        </div>
        <div class="basic-info">
          <h2 class="character-name">{{ characterName }}</h2>
          <p class="character-identity">{{ characterIdentity }}</p>
        </div>
      </div>
    </div>

    <!-- 好感度和亲密度区域 -->
    <div class="relationship-stats">
      <!-- 好感度 -->
      <div class="stat-item" v-if="showFavor">
        <div class="stat-header">
          <span class="stat-title">好感度</span>
          <span class="stat-value">{{ characterFavor }}/1000</span>
        </div>
        <div class="hand-drawn-bar">
          <div class="bar-fill" :style="{ width: favorPercentage / 10 + '%' }"></div>
          <div class="bar-ticks">
            <span v-for="tick in 5" :key="tick" class="tick"></span>
          </div>
        </div>
        <div class="stat-change">
          <span class="change-reason">{{ favorChangeReason || '无' }}</span>
        </div>
      </div>

      <!-- 亲密度 -->
      <div class="stat-item" v-if="showIntimacy">
        <div class="stat-header">
          <span class="stat-title">亲密度</span>
          <span class="stat-value">{{ characterIntimacy }}/1000</span>
        </div>
        <div class="hand-drawn-bar intimacy-bar">
          <div class="bar-fill" :style="{ width: intimacyPercentage / 10 + '%' }"></div>
          <div class="bar-ticks">
            <span v-for="tick in 5" :key="tick" class="tick"></span>
          </div>
        </div>
        <div class="stat-change">
          <span class="change-reason">{{ intimacyChangeReason || '无' }}</span>
        </div>
      </div>
    </div>

    <!-- 服装搭配区域 -->
    <div class="outfit-section">
      <div class="section-header" @click="toggleOutfit">
        <h3 class="section-title">今日装扮</h3>
        <div class="toggle-icon">
          {{ isOutfitExpanded ? '👗' : '👚' }}
        </div>
      </div>
      <transition name="slide-down">
        <div v-if="isOutfitExpanded" class="outfit-content">
          <div class="outfit-grid">
            <div v-for="(item, part) in characterOutfit" :key="part" class="outfit-item">
              <div class="outfit-part">{{ getPartName(part) }}</div>
              <div class="outfit-name">{{ item }}</div>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- 心情状态 -->
    <div class="mood-section">
      <h3 class="section-title">当前想法</h3>
      <div class="mood-display">
        <div class="mood-text">{{ characterThoughts }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, withDefaults } from 'vue';
import type { StatData } from '../types/StatData';
import { useStatStore } from '../store/StatStore';

interface Props {
  statData: StatData;
  characterName: string;
  characterAvatar?: string;
  characterIdentity?: string;
  showFavor?: boolean;
  showIntimacy?: boolean;
}

const statStore = useStatStore();
const isStarryTheme = computed(() => {
  return statStore.stat_data?.theme === 'autumn';
});

// 定义 props
const props = withDefaults(defineProps<Props>(), {
  characterAvatar: '👤',
  characterIdentity: '角色',
  showFavor: true,
  showIntimacy: true,
});

// 展开状态
const isOutfitExpanded = ref(false);

// 定义安全的角色数据类型
interface CharacterData {
  特殊状态?: {
    好感度?: number;
    好感度变化原因?: string;
  };
  服装?: Record<string, string>;
  当前想法?: string;
}

// 安全的属性访问计算属性
const characterData = computed((): CharacterData => {
  const characters = props.statData?.角色;
  if (characters && typeof characters === 'object' && props.characterName in characters) {
    return (characters as Record<string, CharacterData>)[props.characterName] || {};
  }
  return {};
});

const userData = computed(() => {
  return props.statData?.角色?.user || {};
});

// 好感度相关
const characterFavor = computed(() => {
  return characterData.value?.特殊状态?.好感度 || 0;
});

const favorChangeReason = computed(() => {
  return characterData.value?.特殊状态?.好感度变化原因 || '未知';
});

// 亲密度相关
const characterIntimacy = computed(() => {
  const userStatus = userData.value?.特殊状态;
  if (userStatus && typeof userStatus === 'object' && props.characterName in userStatus) {
    return (userStatus as any)[props.characterName]?.亲密度 || 0;
  }
  return 0;
});

const intimacyChangeReason = computed(() => {
  const userStatus = userData.value?.特殊状态;
  if (userStatus && typeof userStatus === 'object' && props.characterName in userStatus) {
    return (userStatus as any)[props.characterName]?.亲密度变化原因 || '未知';
  }
  return '';
});

// 服装数据
const characterOutfit = computed(() => {
  return characterData.value?.服装 || {};
});

// 当前想法
const characterThoughts = computed(() => {
  return characterData.value?.当前想法 || '未知';
});

// 计算百分比
const favorPercentage = computed(() => {
  return (characterFavor.value / 100) * 100;
});

const intimacyPercentage = computed(() => {
  return (characterIntimacy.value / 100) * 100;
});

// 切换服装栏展开状态
const toggleOutfit = () => {
  isOutfitExpanded.value = !isOutfitExpanded.value;
};

// 获取服装部位名称
const getPartName = (part: string) => {
  const partNames: Record<string, string> = {
    上半身: '上半身',
    下半身: '下半身',
    内衣: '内衣',
    袜子: '袜子',
    鞋子: '鞋子',
    配饰: '配饰',
  };
  return partNames[part] || part;
};
</script>

<style lang="scss" scoped>
.character-status {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.character-header {
  margin-bottom: 2rem;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.avatar-frame {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  padding: 4px;
  background: linear-gradient(135deg, #8b4513 0%, #d2691e 100%);
  box-shadow: 0 4px 15px rgba(139, 69, 19, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-emoji {
  font-size: 3.5rem;
  line-height: 1;
}

.character-name {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #5c4b37;
}

.character-identity {
  font-size: 1.1rem;
  opacity: 0.8;
  font-style: italic;
  color: #5c4b37;
}

.relationship-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.stat-item {
  background: rgba(255, 250, 240, 0.9);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e8d5b7;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.stat-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #5c4b37;
}

.stat-value {
  font-size: 1rem;
  opacity: 0.8;
  color: #5c4b37;
}

// 手绘风格进度条
.hand-drawn-bar {
  position: relative;
  height: 24px;
  background: #f5e8c8;
  border-radius: 12px;
  border: 2px solid #8b4513;
  overflow: hidden;
  margin-bottom: 0.5rem;

  &.intimacy-bar {
    border-color: #d2691e;
  }
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #8b4513 0%, #d2691e 100%);
  border-radius: 10px;
  transition: width 1s ease-in-out;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
    animation: shimmer 2s infinite;
  }
}

.bar-ticks {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 10px;
  pointer-events: none;
}

.tick {
  width: 2px;
  height: 100%;
  background: rgba(139, 69, 19, 0.3);
}

.stat-change {
  font-size: 0.9rem;
  opacity: 0.7;
  font-style: italic;
  color: #5c4b37;
}

.outfit-section {
  margin-bottom: 2rem;
  background: rgba(255, 250, 240, 0.9);
  border-radius: 12px;
  border: 1px solid #e8d5b7;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  cursor: pointer;
  transition: background-color 0.3s ease;

  &:hover {
    background: rgba(245, 232, 200, 0.5);
  }
}

.section-title {
  font-size: 1.4rem;
  margin: 0;
  color: #5c4b37;
}

.toggle-icon {
  font-size: 1.2rem;
  transition: transform 0.3s ease;
}

.outfit-content {
  border-top: 1px dashed #e8d5b7;
}

.outfit-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  padding: 1.5rem;
}

.outfit-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 1rem;
  background: rgba(245, 232, 200, 0.5);
  border-radius: 8px;
  border: 1px dashed #d4b78c;
}

.outfit-part {
  font-weight: 600;
  font-size: 0.9rem;
  color: #5c4b37;
}

.outfit-name {
  font-size: 0.9rem;
  opacity: 0.8;
  text-align: right;
  color: #5c4b37;
}

.mood-section {
  background: rgba(255, 250, 240, 0.9);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e8d5b7;
}

.mood-display {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.mood-emoji {
  font-size: 2.5rem;
}

.mood-text {
  font-size: 1.1rem;
  font-style: italic;
  color: #5c4b37;
}

/* 星空主题样式 */
.character-status.starry-theme {
  .avatar-frame {
    background: linear-gradient(135deg, #4a6572 0%, #344955 100%);
    box-shadow: 0 4px 20px rgba(74, 101, 114, 0.4);
  }

  .character-name {
    color: #e3f2fd;
    text-shadow: 0 0 10px rgba(179, 229, 252, 0.5);
  }

  .character-identity {
    color: #bbdefb;
    opacity: 0.9;
  }

  .stat-item {
    background: linear-gradient(135deg, rgba(26, 35, 50, 0.95) 0%, rgba(35, 45, 63, 0.95) 100%);
    border: 1px solid #4a6572;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
  }

  .stat-title {
    color: #e3f2fd;
    font-weight: 700;
    text-shadow: 0 0 8px rgba(179, 229, 252, 0.3);
  }

  .stat-value {
    color: #bbdefb;
    opacity: 0.9;
  }

  .hand-drawn-bar {
    background: rgba(26, 35, 50, 0.8);
    border-color: #5d8aa8;

    &.intimacy-bar {
      border-color: #7bb4c4;
    }
  }

  .bar-fill {
    background: linear-gradient(90deg, #5d8aa8 0%, #7bb4c4 100%);
  }

  .tick {
    background: rgba(93, 138, 168, 0.4);
  }

  .stat-change {
    color: #90caf9;
    opacity: 0.8;
  }

  .outfit-section {
    background: linear-gradient(135deg, rgba(26, 35, 50, 0.95) 0%, rgba(35, 45, 63, 0.95) 100%);
    border: 1px solid #4a6572;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .section-header:hover {
    background: rgba(74, 101, 114, 0.3);
  }

  .section-title {
    color: #e3f2fd;
    text-shadow: 0 0 8px rgba(179, 229, 252, 0.3);
  }

  .outfit-content {
    border-top-color: #4a6572;
  }

  .outfit-item {
    background: rgba(74, 101, 114, 0.3);
    border-color: #5d8aa8;
  }

  .outfit-part {
    color: #e3f2fd;
  }

  .outfit-name {
    color: #bbdefb;
    opacity: 0.9;
  }

  .mood-section {
    background: linear-gradient(135deg, rgba(26, 35, 50, 0.95) 0%, rgba(35, 45, 63, 0.95) 100%);
    border: 1px solid #4a6572;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .mood-text {
    color: #e3f2fd;
  }
}

// 展开收起动画
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  max-height: 500px;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .character-status {
    padding: 1rem;
  }

  .avatar-section {
    flex-direction: column;
    text-align: center;
  }

  .relationship-stats {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .outfit-grid {
    grid-template-columns: 1fr;
  }

  .mood-display {
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }
}
</style>
