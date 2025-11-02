<template>
  <div class="layout" :class="theme">
    <!-- 顶部栏 -->
    <header class="header">
      <div class="header-content">
        <div class="logo">信息面板</div>
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
        <div class="actions">
          <button class="btn-icon" @click="toggleTheme">
            {{ theme === 'light' ? '🌙' : '☀️' }}
          </button>
        </div>
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

const username = computed(() => {
  return substitudeMacros('{{user}}');
});

// 导航菜单
const activeKey = ref('');
const menuItems = [
  { key: '世界信息', label: '世界信息' },
  { key: 'user', label: username },
  { key: '卡特琳娜', label: '卡特琳娜' },
  { key: '任务', label: '任务' },
  { key: '选项', label: '选项' },
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
/* 浅色主题 */
.layout {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f7fa;
  --bg-tertiary: #fafbfc;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --text-tertiary: #999999;
  --border-color: #e4e7ed;
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  --accent: #409eff;
  --accent-hover: #66b1ff;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 深色主题 */
.layout.dark {
  --bg-primary: #141414;
  --bg-secondary: #1f1f1f;
  --bg-tertiary: #262626;
  --text-primary: #ffffff;
  --text-secondary: #a6a6a6;
  --text-tertiary: #737373;
  --border-color: #303030;
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  --accent: #1890ff;
  --accent-hover: #40a9ff;
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
  margin-right: 48px;
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

/* 响应式设计 */
@media (max-width: 768px) {
  .header-content {
    padding: 0 16px;
  }

  .logo {
    font-size: 18px;
    margin-right: 24px;
  }

  .nav {
    gap: 4px;
  }

  .nav-item {
    padding: 6px 12px;
    font-size: 13px;
  }

  .content {
    padding: 16px;
  }
}

/* 暗色模式下的滚动条 */
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
