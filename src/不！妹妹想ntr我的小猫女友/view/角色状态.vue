<template>
  <div class="character-status-layout">
    <!-- 星星背景特效 -->
    <div class="stars-background">
      <div v-for="star in stars" :key="star.id" class="star" :style="star.style"></div>
    </div>

    <!-- 角色切换按钮 -->
    <div class="character-switcher">
      <button
        v-for="(character, name) in characters"
        :key="name"
        class="switch-button"
        :class="{ active: currentCharacter === name }"
        @click="switchCharacter(name)"
      >
        <span class="button-icon">
          <span v-if="name === '多多' && character.specialStatus?.当前形态 === '猫'">🐱</span>
          <span v-else-if="name === 'user'">👤</span>
          <span v-else>🐈‍⬛</span>
        </span>
        <span class="button-text">{{ name }}</span>
      </button>
    </div>

    <!-- 角色状态卡片 -->
    <div class="character-cards-container">
      <div
        v-for="(character, name) in characters"
        :key="name"
        class="character-card"
        :class="{ active: currentCharacter === name }"
      >
        <div class="card-header">
          <h2 class="character-name">{{ name }}</h2>
          <div class="character-icon">
            <span v-if="name === '多多' && character.specialStatus?.当前形态 === '猫'">🐱</span>
            <span v-else-if="name === 'user'">👤</span>
            <span v-else>🐈‍⬛</span>
          </div>
        </div>

        <!-- 服装信息 - 可展开/收起 -->
        <div class="status-section clothing-section">
          <div class="section-header" @click="toggleClothing(name)">
            <h3 class="section-title">服装</h3>
            <div class="expand-icon" :class="{ expanded: expandedSections[name] }">
              <span>▼</span>
            </div>
          </div>
          <div class="clothing-content" :class="{ expanded: expandedSections[name] }">
            <div class="clothing-grid">
              <div v-for="(item, type) in character.clothing" :key="type" class="clothing-item">
                <span class="clothing-type">{{ getClothingTypeName(type) }}：</span>
                <span class="clothing-value">{{ item || '无' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 身体状态 -->
        <div class="status-section">
          <h3 class="section-title">身体状态</h3>
          <div class="body-status-grid">
            <div v-for="(status, part) in character.bodyStatus" :key="part" class="body-status-item">
              <span class="body-part">{{ getBodyPartName(part) }}：</span>
              <span class="body-value">{{ status }}</span>
            </div>
          </div>
        </div>

        <!-- 当前想法 -->
        <div class="status-section">
          <h3 class="section-title">当前想法</h3>
          <div class="thoughts-content">
            {{ character.thoughts || '无' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useStatStore } from '../store/StatStore';

// 当前显示的角色
const currentCharacter = ref('user');

// 展开/收起状态
const expandedSections = ref<Record<string, boolean>>({
  user: false,
  多多: false,
  何茉茉: false,
});

// 角色数据
const characters = ref({
  user: {
    clothing: {
      上半身: '',
      下半身: '',
      内衣: '',
      袜子: '',
      鞋子: '',
      配饰: '',
    },
    bodyStatus: {
      阴茎: '正常下垂',
    },
    thoughts: '无',
  },
  多多: {
    specialStatus: {
      当前形态: '猫',
    },
    clothing: {
      上半身: '',
      下半身: '',
      内衣: '',
      袜子: '',
      鞋子: '',
      配饰: '',
    },
    bodyStatus: {
      小穴: '干燥紧闭',
      菊穴: '未开发',
      口穴: '未开发',
    },
    thoughts: '无',
  },
  何茉茉: {
    clothing: {
      上半身: '',
      下半身: '',
      内衣: '',
      袜子: '',
      鞋子: '',
      配饰: '',
    },
    bodyStatus: {
      小穴: '干燥紧闭',
      菊穴: '未开发',
      口穴: '未开发',
    },
    thoughts: '无',
  },
});

// 星星特效
const stars = ref<Array<{ id: number; style: any }>>([]);
let starInterval: number | null = null;

// 切换角色
const switchCharacter = (name: string) => {
  currentCharacter.value = name;
};

// 切换服装展开/收起
const toggleClothing = (name: string) => {
  expandedSections.value[name] = !expandedSections.value[name];
};

// 初始化星星
const initStars = () => {
  stars.value = [];
  for (let i = 0; i < 50; i++) {
    stars.value.push({
      id: i,
      style: {
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${3 + Math.random() * 4}s`,
      },
    });
  }
};

// 获取服装类型的中文名称
const getClothingTypeName = (type: string) => {
  const typeMap: Record<string, string> = {
    上半身: '上衣',
    下半身: '下装',
    内衣: '内衣',
    袜子: '袜子',
    鞋子: '鞋子',
    配饰: '配饰',
  };
  return typeMap[type] || type;
};

// 获取身体部位的中文名称
const getBodyPartName = (part: string) => {
  const partMap: Record<string, string> = {
    小穴: '小穴',
    阴茎: '阴茎',
    菊穴: '菊穴',
    口穴: '口穴',
  };
  return partMap[part] || part;
};

// 监听数据更新
const statStore = useStatStore();
const updateData = () => {
  const stat = statStore.stat_data;
  if (!stat) return;

  if (stat.角色) {
    type CharacterKey = keyof typeof characters.value;

    Object.keys(stat.角色).forEach(name => {
      const key = name as CharacterKey;

      if (key in characters.value) {
        const character = characters.value[key];
        const statCharacter = stat.角色[key];

        if (statCharacter.服装) {
          character.clothing = { ...statCharacter.服装 };
        }
        if (statCharacter.身体状态) {
          character.bodyStatus = { ...statCharacter.身体状态 };
        }
        if (statCharacter.当前想法) {
          character.thoughts = statCharacter.当前想法;
        }
      }
    });
  }
};

watch(
  () => statStore.stat_data,
  () => {
    updateData();
  },
  { deep: true, immediate: true },
);

onMounted(() => {
  initStars();

  // 星星闪烁动画
  starInterval = window.setInterval(() => {
    stars.value.forEach(star => {
      star.style.animationDuration = `${3 + Math.random() * 4}s`;
    });
  }, 5000);
});

onUnmounted(() => {
  if (starInterval) {
    clearInterval(starInterval);
  }
});
</script>

<style lang="scss" scoped>
.character-status-layout {
  padding: 20px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(37, 99, 235, 0.08));
  position: relative;
  overflow: hidden;
  font-family: 'Microsoft YaHei', Arial, sans-serif;
  box-sizing: border-box;
  width: 90%;
}

/* 星星背景特效 */
.stars-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.star {
  position: absolute;
  width: 2px;
  height: 2px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  animation: twinkle linear infinite;
  box-shadow: 0 0 4px 1px rgba(255, 255, 255, 0.5);
}

@keyframes twinkle {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

/* 角色切换按钮 */
.character-switcher {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 24px;
  position: relative;
  z-index: 2;
  flex-wrap: wrap;
}

.switch-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(37, 99, 235, 0.15));
  border: 1px solid rgba(147, 197, 253, 0.25);
  border-radius: 12px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    transform: translateY(-2px);
    border-color: rgba(147, 197, 253, 0.4);
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15);
  }

  &:hover::before {
    opacity: 1;
  }

  &.active {
    background: rgba(59, 130, 246, 0.25);
    border-color: rgba(147, 197, 253, 0.5);
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
    transform: translateY(-2px);
  }

  .button-icon {
    font-size: 16px;
    filter: drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.3));
  }

  .button-text {
    text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.3);
    position: relative;
    z-index: 1;
  }
}

/* 角色卡片容器 - 修复宽度问题 */
.character-cards-container {
  position: relative;
  z-index: 1;
  width: 100%;
  margin: 0 auto;
  min-height: 500px;
}

.character-card {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(37, 99, 235, 0.15));
  border-radius: 16px;
  border: 1px solid rgba(147, 197, 253, 0.25);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 8px 32px rgba(59, 130, 246, 0.15);
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
  transform: translateY(20px);
  pointer-events: none;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  box-sizing: border-box;

  &.active {
    opacity: 1;
    transform: translateY(0);
    pointer-events: all;
    position: relative;
  }

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 40px rgba(59, 130, 246, 0.25);
    border-color: rgba(147, 197, 253, 0.4);
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.2));
  border-bottom: 1px solid rgba(147, 197, 253, 0.3);
}

.character-name {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.3);
}

.character-icon {
  font-size: 28px;
  filter: drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.3));
}

.status-section {
  padding: 18px 24px;
  border-bottom: 1px solid rgba(147, 197, 253, 0.15);

  &:last-of-type {
    border-bottom: none;
  }
}

/* 服装部分特殊样式 */
.clothing-section {
  padding: 0;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 24px;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  }

  .expand-icon {
    transition: transform 0.3s ease;
    color: rgba(147, 197, 253, 0.8);
    font-size: 12px;

    &.expanded {
      transform: rotate(180deg);
    }
  }

  .clothing-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;

    &.expanded {
      max-height: 600px;
    }
  }

  .clothing-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 0 24px 18px 24px;
  }
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  padding-bottom: 5px;
  color: #e2e8f0;
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  &::before {
    content: '✦';
    margin-right: 8px;
    color: rgba(147, 197, 253, 0.8);
    font-size: 14px;
  }
}

.clothing-item,
.body-status-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  border: 1px solid rgba(147, 197, 253, 0.15);
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    transform: translateX(4px);
    border-color: rgba(147, 197, 253, 0.3);
  }
}

.clothing-type,
.body-part {
  font-size: 14px;
  color: #cbd5e1;
  font-weight: 500;
}

.clothing-value,
.body-value {
  font-size: 14px;
  color: #ffffff;
  font-weight: 500;
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.3);
}

.body-status-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.thoughts-content {
  padding: 14px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  border: 1px solid rgba(147, 197, 253, 0.15);
  font-size: 14px;
  color: #ffffff;
  line-height: 1.5;
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.3);
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .character-status-layout {
    padding: 16px;
  }

  .character-switcher {
    gap: 8px;
    margin-bottom: 20px;
  }

  .switch-button {
    padding: 8px 14px;
    font-size: 13px;

    .button-icon {
      font-size: 14px;
    }
  }

  .character-cards-container {
    width: 95%;
  }

  .character-card {
    border-radius: 14px;
  }

  .card-header {
    padding: 16px 20px;
  }

  .character-name {
    font-size: 18px;
  }

  .character-icon {
    font-size: 24px;
  }

  .status-section {
    padding: 16px 20px;
  }

  .clothing-section {
    .section-header {
      padding: 16px 20px;
    }

    .clothing-grid {
      padding: 0 20px 16px 20px;
    }
  }
}

@media (max-width: 480px) {
  .character-status-layout {
    padding: 12px;
  }

  .character-switcher {
    gap: 6px;
    margin-bottom: 16px;
  }

  .switch-button {
    padding: 6px 12px;
    font-size: 12px;
    border-radius: 10px;

    .button-icon {
      font-size: 12px;
    }
  }

  .character-cards-container {
    width: 98%;
  }

  .character-card {
    border-radius: 12px;
  }

  .card-header {
    padding: 14px 16px;
  }

  .character-name {
    font-size: 16px;
  }

  .character-icon {
    font-size: 20px;
  }

  .status-section {
    padding: 14px 16px;
  }

  .section-title {
    font-size: 15px;
  }

  .clothing-section {
    .section-header {
      padding: 14px 16px;
    }

    .clothing-grid {
      padding: 0 16px 14px 16px;
    }
  }

  .clothing-item,
  .body-status-item {
    padding: 8px 12px;
  }

  .clothing-type,
  .body-part,
  .clothing-value,
  .body-value {
    font-size: 13px;
  }

  .thoughts-content {
    font-size: 13px;
    padding: 12px;
    min-height: 70px;
  }
}
</style>
