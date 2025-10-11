<template>
  <div class="app-layout" :class="{ 'autumn-theme': isDiaryPage }">
    <!-- 导航栏 -->
    <nav class="navigation-bar" :class="{ 'autumn-nav': isDiaryPage }">
      <div class="nav-buttons">
        <button
          v-for="routeT in routes"
          :key="routeT.path"
          class="nav-button"
          :class="{
            active: currentRoute.path === routeT.path,
            'autumn-button': isDiaryPage
          }"
          @click="navigateTo(routeT.path)"
        >
          <span class="nav-icon">{{ routeT.icon }}</span>
          <span class="nav-text">{{ routeT.name }}</span>
        </button>
      </div>
    </nav>

    <!-- 主内容区域 -->
    <main class="main-content">
      <router-view />
    </main>

    <!-- 秋天落叶背景效果 -->
    <div v-if="isDiaryPage" class="autumn-leaves">
      <div class="leaf leaf-1">🍂</div>
      <div class="leaf leaf-2">🍁</div>
      <div class="leaf leaf-3">🍂</div>
      <div class="leaf leaf-4">🍁</div>
      <div class="leaf leaf-5">🍂</div>
      <div class="leaf leaf-6">🍁</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const currentRoute = useRoute();
const router = useRouter();

const routes = [
  { path: '/状态界面', name: '人物状态', icon: '👤' },
  { path: '/世界信息', name: '世界信息', icon: '🌍' },
  { path: '/多多日记', name: '多多日记', icon: '📖' },
];

// 判断是否在多多日记页面
const isDiaryPage = computed(() => currentRoute.path === '/多多日记');

// 导航函数
const navigateTo = (path: string) => {
  router.push(path);
};
</script>

<style lang="scss" scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(37, 99, 235, 0.08));
  font-family: 'Microsoft YaHei', Arial, sans-serif;
  transition: all 0.5s ease;
  position: relative;
  overflow-x: hidden;
}

.navigation-bar {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(37, 99, 235, 0.15));
  border-bottom: 1px solid rgba(147, 197, 253, 0.25);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  padding: 8px 16px;
  position: sticky;
  top: 0;
  z-index: 1000;
  transition: all 0.5s ease;
  flex-shrink: 0;

  &.autumn-nav {
    background: linear-gradient(135deg,
      rgba(180, 83, 9, 0.15),
      rgba(146, 64, 14, 0.2)
    );
    border-bottom: 1px solid rgba(180, 83, 9, 0.3);
  }
}

.nav-buttons {
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
}

.nav-button {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(147, 197, 253, 0.25);
  border-radius: 12px;
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
  }

  &.autumn-button {
    border: 1px solid rgba(180, 83, 9, 0.3);

    &::before {
      background: linear-gradient(135deg, rgba(180, 83, 9, 0.1), transparent);
    }

    &:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(180, 83, 9, 0.5);
      box-shadow: 0 4px 16px rgba(180, 83, 9, 0.2);
    }

    &.active {
      background: rgba(180, 83, 9, 0.25);
      border-color: rgba(180, 83, 9, 0.5);
      box-shadow: 0 2px 8px rgba(180, 83, 9, 0.3);
    }
  }

  .nav-icon {
    font-size: 14px;
    filter: drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.3));
  }

  .nav-text {
    text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.3);
    position: relative;
    z-index: 1;
  }
}

.main-content {
  flex: 1;
  padding: 16px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 0;
  position: relative;
  z-index: 1;
}

/* 秋天落叶动画 */
.autumn-leaves {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 500;
}

.leaf {
  position: absolute;
  font-size: 20px;
  opacity: 0.7;
  animation: fall linear infinite;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.leaf-1 {
  left: 10%;
  animation-duration: 8s;
  animation-delay: 0s;
}

.leaf-2 {
  left: 30%;
  animation-duration: 10s;
  animation-delay: 2s;
}

.leaf-3 {
  left: 50%;
  animation-duration: 12s;
  animation-delay: 4s;
}

.leaf-4 {
  left: 70%;
  animation-duration: 9s;
  animation-delay: 1s;
}

.leaf-5 {
  left: 90%;
  animation-duration: 11s;
  animation-delay: 3s;
}

.leaf-6 {
  left: 20%;
  animation-duration: 13s;
  animation-delay: 5s;
}

@keyframes fall {
  0% {
    transform: translateY(-50px) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 0.7;
  }
  90% {
    opacity: 0.7;
  }
  100% {
    transform: translateY(100vh) rotate(360deg);
    opacity: 0;
  }
}

@media (max-width: 999px) {
  .navigation-bar {
    padding: 6px 12px;
  }

  .nav-buttons {
    gap: 6px;
  }

  .nav-button {
    padding: 6px 12px;
    font-size: 11px;
    border-radius: 10px;
  }

  .nav-icon {
    font-size: 12px;
  }

  .main-content {
    padding: 12px;
  }

  .leaf {
    font-size: 16px;
  }
}
</style>
