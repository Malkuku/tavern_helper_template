<template>
  <div class="diary-layout" :data-theme="currentTheme">
    <header class="app-header">
      <div class="header-controls">
        <h1 class="diary-title">🌸 甜美日记 🌸</h1>
        <button class="theme-toggle-btn" aria-label="切换主题" @click="toggleTheme">
          <span v-if="currentTheme === 'light'">🌙</span>
          <span v-else>☀️</span>
        </button>
      </div>
    </header>

    <aside class="app-sidebar">
      <nav>
        <ul>
          <li v-for="item in navItems" :key="item.path">
            <router-link :to="item.path" class="nav-link">
              <span class="nav-icon">{{ getNavItemIcon(item.name) }}</span>
              <span class="nav-text">{{ item.name }}</span>
            </router-link>
          </li>
        </ul>
      </nav>
    </aside>

    <main class="main-content-area">
      <div class="page-container">
        <router-view v-slot="{ Component }">
          <transition name="fade-main" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ERAUtil } from '@/Utils/ERAUtil';
import { useStatStore } from '@/教程角色卡/store/StatStore';

const statStore = useStatStore();
const router = useRouter();
const route = useRoute();

// 固定导航项：世界、角色、设置
const baseNavItems = [
  { name: '世界', path: '/世界' },
  { name: '角色', path: '/角色' },
  { name: '设置', path: '/设置' },
];

const navItems = computed(() => {
  return baseNavItems;
});

// 获取导航图标
const getNavItemIcon = (name) => {
  switch(name) {
    case '世界': return '🌍';
    case '角色': return '👤';
    case '设置': return '⚙️';
    default: return '📝';
  }
};

// 主题切换逻辑
const currentTheme = computed(() => statStore.stat_data?.theme || 'light');
const toggleTheme = async () => {
  const theme = currentTheme.value === 'light' ? 'dark' : 'light';
  await ERAUtil.UpdateByObject({ theme: theme });
};
</script>

<style scoped>
/* 引入可爱字体 */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&family=Poppins:wght@300;400;500;600&display=swap');

/* --- 粉红可爱主题系统：CSS 变量 --- */
.diary-layout {
  /* 日记风格主题 */
  --bg-primary: #fff5f7; /* 淡粉色主背景 */
  --bg-secondary: #ffeef0; /* 较深的粉色 */
  --bg-card: #ffffff; /* 卡片白色背景 */
  --text-primary: #d81b60; /* 粉红色文字 */
  --text-secondary: #ec407a; /* 次要文字 */
  --border-color: #ffcdd2; /* 粉色边框 */
  --accent-primary: #f06292; /* 强调色 */
  --accent-light: #ff80ab; /* 浅强调色 */
  --accent-pink: #e91e63; /* 深粉色 */
  --shadow-color: rgba(216, 27, 96, 0.15);
  --diary-paper: #fffdf6; /* 日记纸张色 */
  --ribbon-color: #f48fb1; /* 丝带装饰色 */
  --heart-color: #ff5252; /* 爱心装饰色 */
}

/* --- 基础与桌面端布局 --- */
.diary-layout {
  display: grid;
  grid-template-areas:
    'header header'
    'nav content';
  grid-template-columns: 220px 1fr;
  grid-template-rows: 70px 1fr;
  width: 100vw;
  min-height: 600px;
  max-height: 1400px;
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  color: var(--text-primary);
  font-family: 'Noto Sans SC', 'Poppins', sans-serif;
  transition:
    background-color 0.4s ease,
    color 0.4s ease;
  overflow-y: auto;
  position: relative;
}

/* 装饰性元素 */
.diary-layout::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: radial-gradient(circle at 10% 20%, rgba(248, 187, 208, 0.1) 0.5px, transparent 0.5px),
                    radial-gradient(circle at 20% 80%, rgba(244, 143, 177, 0.1) 0.5px, transparent 0.5px),
                    radial-gradient(circle at 80% 40%, rgba(248, 187, 208, 0.1) 0.5px, transparent 0.5px);
  background-size: 40px 40px;
  pointer-events: none;
  z-index: 0;
}

.diary-layout > * {
  position: relative;
  z-index: 1;
}

/* --- Header --- */
.app-header {
  grid-area: header;
  display: flex;
  align-items: center;
  padding: 0 25px;
  background: linear-gradient(90deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  border-bottom: 3px solid var(--accent-primary);
  box-shadow: 0 4px 15px var(--shadow-color);
  transition:
    background 0.4s ease,
    border-color 0.4s ease;
  z-index: 10;
}

.header-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.diary-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--accent-pink);
  margin: 0;
  text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8);
  letter-spacing: 1px;
}

.theme-toggle-btn {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-light));
  border: none;
  color: white;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 4px 10px var(--shadow-color);
}
.theme-toggle-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 15px var(--shadow-color);
  background: linear-gradient(135deg, var(--accent-light), var(--accent-primary));
}

/* --- 侧边导航栏 (桌面) --- */
.app-sidebar {
  grid-area: nav;
  background: linear-gradient(to bottom, var(--bg-secondary), var(--bg-primary));
  border-right: 2px dashed var(--accent-primary);
  padding-top: 30px;
  transition:
    background 0.4s ease,
    border-color 0.4s ease;
  z-index: 5;
  position: relative;
}

.app-sidebar::before {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 3px;
  background: repeating-linear-gradient(
    to bottom,
    var(--accent-pink),
    var(--accent-pink) 10px,
    transparent 10px,
    transparent 20px
  );
}

.app-sidebar ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-link {
  display: flex;
  align-items: center;
  padding: 18px 25px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 1.1rem;
  font-weight: 500;
  border-left: 4px solid transparent;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.nav-link::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: 0.5s;
}

.nav-link:hover::before {
  left: 100%;
}

.nav-link:hover {
  background-color: var(--bg-card);
  color: var(--accent-pink);
  border-left-color: var(--accent-primary);
  transform: translateX(5px);
}

.nav-icon {
  margin-right: 12px;
  font-size: 1.3rem;
  width: 24px;
  text-align: center;
}

.nav-link.router-link-active {
  background: linear-gradient(to right, var(--accent-primary), var(--accent-light));
  color: white;
  border-left-color: var(--heart-color);
  font-weight: 600;
  box-shadow: 2px 0 10px var(--shadow-color);
}

.nav-link.router-link-active .nav-icon {
  color: white;
}

/* --- 主内容区域 --- */
.main-content-area {
  grid-area: content;
  padding: 25px;
  background: var(--diary-paper);
  transition: background-color 0.4s ease;
  overflow-y: auto;
  position: relative;
}

.main-content-area::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: linear-gradient(to right, rgba(255, 182, 193, 0.03) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255, 182, 193, 0.03) 1px, transparent 1px);
  background-size: 30px 30px;
  pointer-events: none;
  z-index: 0;
}

.page-container {
  position: relative;
  z-index: 1;
  background: var(--bg-card);
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 8px 30px var(--shadow-color);
  border: 1px solid var(--border-color);
  min-height: calc(100vh - 120px);
}

/* --- 路由切换动画 --- */
.fade-main-enter-active,
.fade-main-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-main-enter-from,
.fade-main-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/*
 * =========================================
 *   响应式设计：移动端适配 (<= 768px)
 * =========================================
*/
@media (max-width: 768px) {
  /* 1. 重新定义页面网格布局 */
  .diary-layout {
    grid-template-areas:
      'header'
      'content'
      'nav'; /* 导航移动到底部 */
    grid-template-columns: 1fr; /* 单列布局 */
    grid-template-rows: 60px 1fr 70px; /* 顶部Header, 中间内容(自适应), 底部Nav */
  }

  .app-header {
    padding: 0 15px;
  }

  .diary-title {
    font-size: 1.2rem;
  }

  /* 2. 将侧边栏转换为底部导航栏 */
  .app-sidebar {
    padding-top: 0;
    border-right: none;
    border-top: 2px dashed var(--accent-primary);
    display: flex;
    align-items: center;
    box-shadow: 0 -4px 15px var(--shadow-color);
  }

  .app-sidebar::before {
    display: none;
  }

  .app-sidebar nav {
    width: 100%;
  }

  .app-sidebar ul {
    display: flex;
    justify-content: space-around;
    height: 100%;
  }

  /* 3. 调整导航链接的样式以适应底部栏 */
  .nav-link {
    flex-direction: column;
    padding: 10px 5px;
    border-left: none;
    border-top: 3px solid transparent;
    font-size: 0.85rem;
    text-align: center;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nav-icon {
    margin-right: 0;
    margin-bottom: 5px;
    font-size: 1.2rem;
  }

  .nav-link.router-link-active {
    border-left-color: transparent;
    border-top-color: var(--heart-color);
    background: rgba(240, 98, 146, 0.1);
    color: var(--accent-pink);
  }

  .nav-link.router-link-active {
    background: linear-gradient(to bottom, var(--accent-primary), var(--accent-light));
    color: white;
  }

  /* 4. 调整主内容区的内边距 */
  .main-content-area {
    padding: 15px;
  }

  .page-container {
    padding: 15px;
    min-height: calc(100vh - 140px);
  }
}

/* 滚动条样式 */
.diary-layout::-webkit-scrollbar,
.main-content-area::-webkit-scrollbar {
  width: 10px;
}

.diary-layout::-webkit-scrollbar-track,
.main-content-area::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 5px;
}

.diary-layout::-webkit-scrollbar-thumb,
.main-content-area::-webkit-scrollbar-thumb {
  background: linear-gradient(var(--accent-primary), var(--accent-pink));
  border-radius: 5px;
  border: 2px solid var(--bg-secondary);
}

.diary-layout::-webkit-scrollbar-thumb:hover,
.main-content-area::-webkit-scrollbar-thumb:active {
  background: linear-gradient(var(--accent-light), var(--accent-primary));
}
</style>
