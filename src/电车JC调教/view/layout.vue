<template>
  <div class="layout" :class="theme">
    <!-- 顶部栏 -->
    <header class="header">
      <div class="header-content">
        <div class="logo">信息面板</div>
        <div class="actions">
          <button class="btn-icon" @click="toggleTheme">
            {{ theme === 'light' ? '♥️' : '🪻' }}
          </button>
        </div>
        <nav class="nav">
          <a
            v-for="item in menuItems"
            :key="item.key"
            :class="['nav-item', { active: activeKey === item.key }]"
            @click="handleNavClick(item.key)"
          >
            {{ item.label }}
          </a>
        </nav>


      </div>
    </header>

    <!-- 主体内容区 -->
    <main class="main">
      <section class="content">
        <router-view />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useStatStore } from '../store/StatStore';

const router = useRouter();
const route = useRoute();
const statStore = useStatStore();

// 主题切换
const theme = computed(() => (statStore.stat_data?.theme === 'dark' ? 'dark' : 'light'));
const toggleTheme = async () => {
  if (!statStore.stat_data) return;
  const currentTheme = statStore.stat_data?.theme ?? 'light';
  statStore.stat_data.theme = currentTheme === 'light' ? 'dark' : 'light';
  await updateVariablesWith(variables => _.update(variables, 'stat_data.theme', () => statStore.stat_data?.theme));
};


// 导航菜单
const activeKey = ref('');
const menuItems = [
  { key: '世界信息', label: '世界信息' },
  { key: '选项', label: '选项' },
  { key: '星宫', label: '星宫诗羽' },
  { key: '白石', label: '白石䌷' },
  { key: '橘', label: '橘瑠奈' },
  { key: '梦', label: '夜月梦' },
];

// 监听路由变化
watch(
  () => route.name,
  newRoute => {
    activeKey.value = newRoute as string;
  },
  { immediate: true },
);

// 导航点击
const handleNavClick = (key: string) => {
  activeKey.value = key;
  router.push({ name: key });
};
</script>

<style lang="scss" scoped>
/* 粉色 & 深紫色主题 */
.layout {
  /* 主背景：浅粉 */
  --bg-primary: #fff0f5;
  /* 次背景：稍深一点的粉 */
  --bg-secondary: #ffe4e6;
  /* 第三背景：更柔和的粉 */
  --bg-tertiary: #ffdce0;
  /* 主文字：深紫 */
  --text-primary: #3e1f47;
  /* 次文字：紫灰 */
  --text-secondary: #6d4b7d;
  /* 第三文字：淡紫灰 */
  --text-tertiary: #9a7aa0;
  /* 边框：柔紫 */
  --border-color: #d8bfd8;
  /* 阴影：淡紫透明 */
  --shadow: 0 2px 12px rgba(142, 92, 184, 0.08);
  /* 主accent：亮粉 */
  --accent: #ff66b3;
  /* accent悬浮：更亮的粉 */
  --accent-hover: #ff4da6;
  /* 过渡动画 */
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 深色模式：深紫背景 + 粉紫点缀 */
.layout.dark {
  /* 主背景：深紫 */
  --bg-primary: #2c1b3d;
  /* 次背景：更深紫 */
  --bg-secondary: #24162f;
  /* 第三背景：紫黑 */
  --bg-tertiary: #1a1025;
  /* 主文字：淡粉 */
  --text-primary: #ffd1e8;
  /* 次文字：粉灰 */
  --text-secondary: #d9a7c1;
  /* 第三文字：暗粉灰 */
  --text-tertiary: #a87e9e;
  /* 边框：深紫灰 */
  --border-color: #4a3a5b;
  /* 阴影：深紫透明 */
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  /* 主accent：亮粉 */
  --accent: #ff66b3;
  /* accent悬浮：更亮的粉 */
  --accent-hover: #ff4da6;
}

.layout {
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  color: var(--text-primary);
  transition: var(--transition);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 顶部栏 */
.header {
  flex-shrink: 0;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  box-shadow: var(--shadow);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.header-content {
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 24px;
  max-width: 1440px;
  margin: 0 auto;
  width: 100%;
}

.logo {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-right: 10px;
  letter-spacing: -0.5px;
}

.nav {
  display: flex;
  gap: 8px;
  flex: 1;
}

.nav-item {
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  transition: var(--transition);
  position: relative;
  user-select: none;
}

.nav-item:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.nav-item.active {
  color: var(--accent);
  background: var(--bg-tertiary);
}

.nav-item.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 16px;
  right: 16px;
  height: 2px;
  background: var(--accent);
  border-radius: 2px;
}

.actions {
  display: flex;
  gap: 8px;
  margin-right: 18px;
  align-items: center;
}

.btn-icon {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
  border-radius: 8px;
  transition: var(--transition);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: var(--border-color);
  color: var(--text-primary);
  transform: translateY(-1px);
}

/* 主体内容 */
.main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  max-width: 1440px;
  margin: 0 auto;
  width: 100%;
}

/* 响应式：导航自动折行 */
@media (max-width: 768px) {
  .header-content {
    flex-wrap: wrap;
    height: auto;
    padding: 8px 16px;
    row-gap: 8px;
  }

  .logo {
    margin-right: auto;
    font-size: 18px;
  }

  .nav {
    flex: 1 1 100%;
    flex-wrap: wrap;
    gap: 4px;
    margin: 4px 0;
  }

  .nav-item {
    padding: 6px 12px;
    font-size: 13px;
  }

  .actions {
    margin-left: auto;
  }

  .content {
    padding: 16px;
  }
}

/* 暗色模式滚动条 */
.layout.dark ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.layout.dark ::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

.layout.dark ::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.layout.dark ::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}
</style>
