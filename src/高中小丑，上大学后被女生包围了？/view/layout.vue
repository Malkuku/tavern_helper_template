<template>
  <div class="letter-layout" :class="theme">
    <!-- 顶部导航栏 -->
    <header class="header">
      <div class="nav-container">
        <h1 class="logo">Letter Cottage</h1>
        <div class="theme-switcher">
          <button
            class="theme-btn"
            @click="toggleTheme"
            :title="theme === 'autumn' ? '切换到星空主题' : '切换到秋天主题'"
          >
            {{ theme === 'autumn' ? '🍂 秋日之诗' : '🌙 星夜之歌' }}
          </button>
        </div>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="main-content">
      <div class="letter-paper">
        <!-- 左侧页签 - 像书里夹着的信笺 -->
        <div class="page-tabs">
          <div class="page-tabs">
            <div
              v-for="tab in tabs"
              :key="tab.path"
              class="page-tab"
              :class="{ active: isActive(tab.path) }"
              @click="handleTabClick(tab)"
            >
              <div class="tab-sticker"></div>
              <span class="tab-text">{{ tab.name }}</span>
            </div>
          </div>
        </div>

        <!-- 路由内容区域 -->
        <div class="letter-lines"></div>
        <div class="letter-content">
          <router-view v-slot="{ Component }">
            <transition name="page-fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>

        <!-- 装饰元素 -->
        <div class="decorations">
          <!-- 右下角钢笔 - 穿出内容区 -->
          <div class="decoration pen">🖋️</div>

          <!-- 左上角大护角 -->
          <div class="corner-protector top-left"></div>

          <!-- 右上方垂坠标签 -->
          <div class="hanging-label"></div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { useStatStore } from '../store/StatStore';

const currentRoute = useRoute();
const router = useRouter();

// 主题状态
const statStore = useStatStore();
const theme = computed(() => (statStore.stat_data?.theme ? statStore.stat_data.theme : 'autumn'));

const username = computed(() => substitudeMacros('{{user}}'));

const showCharacters = ref(false);

// 切换函数
function toggleGroup() {
  showCharacters.value = !showCharacters.value;
}

const dummyName = computed(() => (showCharacters.value ? '返回' : '角色信息'));

// 全部 7 条真实路由
const allRoutes = [
  { path: '/user', name: username, group: 'char' },
  { path: '/林安安', name: '林安安', group: 'char' },
  { path: '/李沐', name: '李沐', group: 'char' },
  { path: '/张小花', name: '张小花', group: 'char' },
  { path: '/苏浅浅', name: '苏浅浅', group: 'char' },
  { path: '/世界信息', name: '活动档案', group: 'todo' },
  { path: '/TODOLIST', name: 'TODOLIST', group: 'todo' },
  { path: '/选项', name: '展望未来', group: 'todo' },
  { path: '/more', name: dummyName, group: 'dummy' },
];

const tabs = computed(() => {
  const flag = showCharacters.value;
  return allRoutes.filter(t => {
    if (t.group === 'dummy') return true; // 假路由永远显示
    return flag
      ? t.group === 'char' // 人物模式
      : t.group === 'todo'; // 常驻模式
  });
});

// 改进的路由激活判断
const isActive = (path: string) => {
  if (path === '/') {
    return currentRoute.path === '/';
  }
  return currentRoute.path.startsWith(path);
};

// 切换主题
const toggleTheme = async () => {
  if (!statStore.stat_data) return;
  const currentTheme = statStore.stat_data?.theme ?? 'autumn';
  statStore.stat_data.theme = currentTheme === 'autumn' ? 'starry' : 'autumn';
  await updateVariablesWith(variables => _.update(variables, 'stat_data.theme', () => statStore.stat_data?.theme));
};

// 导航到指定路由
function handleTabClick(tab: (typeof allRoutes)[0]) {
  if (tab.group === 'dummy') {
    toggleGroup(); // 假路由：只切换分组
  } else {
    router.push(tab.path); // 真路由：正常跳转
  }
}
</script>

<style lang="scss" scoped>
.letter-layout {
  display: flex;
  flex-direction: column;
  transition: all 0.5s ease;

  &.autumn {
    background: linear-gradient(135deg, #f5e8c8 0%, #e8d5b7 100%);
    color: #5c4b37;
  }

  &.starry {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: #e6e6ff;
  }
}

.header {
  padding: 1rem 0;
  border-bottom: 1px solid;

  .autumn & {
    border-color: rgba(92, 75, 55, 0.2);
    background: rgba(245, 232, 200, 0.9);
  }

  .starry & {
    border-color: rgba(230, 230, 255, 0.2);
    background: rgba(26, 26, 46, 0.9);
  }
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 1.8rem;
  font-weight: bold;

  .autumn & {
    color: #8b4513;
  }

  .starry & {
    color: #a8d8ea;
  }
}

.theme-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 1rem;
  font-family: inherit;
  transition: all 0.3s ease;

  .autumn & {
    background: #8b4513;
    color: #f5e8c8;

    &:hover {
      background: #a0522d;
    }
  }

  .starry & {
    background: #a8d8ea;
    color: #16213e;

    &:hover {
      background: #c1e4f5;
    }
  }
}

.main-content {
  flex: 1;
  padding: 2rem;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.letter-paper {
  position: relative;
  width: 100%;
  max-width: 900px;
  min-height: 600px;
  padding: 3rem;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: visible; /* 改为visible让钢笔可以穿出去 */

  .autumn & {
    background: #fffaf0;
    border: 1px solid #e8d5b7;
  }

  .starry & {
    background: #0f3460;
    border: 1px solid #1a1a2e;
  }
}

// 装饰元素容器
.decorations {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 2;
}

// 右下角钢笔 - 穿出内容区
.pen {
  position: absolute;
  bottom: -20px; /* 穿出底部 */
  right: -15px; /* 穿出右侧 */
  font-size: 4rem;
  opacity: 0.8;
  transition: all 0.3s ease;
  filter: drop-shadow(4px 4px 8px rgba(0, 0, 0, 0.4));
  transform: rotate(-15deg);
  z-index: 13; /* 确保在最上层 */

  .autumn & {
    filter: drop-shadow(4px 4px 8px rgba(139, 69, 19, 0.5));
  }

  .starry & {
    filter: drop-shadow(4px 4px 8px rgba(168, 216, 234, 0.5));
  }

  &:hover {
    opacity: 0.9;
    transform: rotate(-12deg) scale(1.05);
  }
}

// 左上角大护角
.corner-protector.top-left {
  position: absolute;
  top: 0;
  left: 0;
  width: 120px;
  height: 120px;
  border-top-left-radius: 8px;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -60px;
    left: -60px;
    width: 120px;
    height: 120px;
    border-radius: 50%;

    .autumn & {
      background: linear-gradient(135deg, rgba(139, 69, 19, 0.15) 0%, rgba(210, 180, 140, 0.25) 100%);
      border: 2px solid rgba(210, 180, 140, 0.4);
    }

    .starry & {
      background: linear-gradient(135deg, rgba(168, 216, 234, 0.15) 0%, rgba(26, 26, 46, 0.25) 100%);
      border: 2px solid rgba(168, 216, 234, 0.4);
    }
  }
}

// 右上方垂坠标签 - 像锦旗那样
.hanging-label {
  position: absolute;
  top: -5px;
  right: 60px;
  width: 25px;
  height: 80px;
  z-index: 12;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;

    .autumn & {
      background: #8b4513;
      box-shadow: 0 0 0 2px rgba(139, 69, 19, 0.3);
    }

    .starry & {
      background: #a8d8ea;
      box-shadow: 0 0 0 2px rgba(168, 216, 234, 0.3);
    }
  }

  &::after {
    content: '';
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    width: 20px;
    height: 65px;
    border-radius: 10px;

    .autumn & {
      background: linear-gradient(
        to bottom,
        rgba(139, 69, 19, 0.8) 0%,
        rgba(210, 180, 140, 0.6) 30%,
        rgba(210, 180, 140, 0.4) 70%,
        rgba(139, 69, 19, 0.3) 100%
      );
      border: 1px solid rgba(210, 180, 140, 0.5);
    }

    .starry & {
      background: linear-gradient(
        to bottom,
        rgba(168, 216, 234, 0.8) 0%,
        rgba(26, 26, 46, 0.6) 30%,
        rgba(26, 26, 46, 0.4) 70%,
        rgba(168, 216, 234, 0.3) 100%
      );
      border: 1px solid rgba(168, 216, 234, 0.5);
    }
  }
}

// 左侧页签 - 真正的书签效果
.page-tabs {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 10;
}

.page-tab {
  position: relative;
  padding: 12px 16px 12px 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 100px;

  /* 书签主体在纸张内部 */
  .autumn & {
    background: linear-gradient(135deg, #f9f3e9 0%, #f5e8c8 100%);
    border: 1px solid #d4b78c;
    border-left: none;
    border-radius: 0 8px 8px 0;
    margin-left: -15px; /* 向左偏移，部分在纸张外 */
  }

  .starry & {
    background: linear-gradient(135deg, #1e3a5f 0%, #2d4d7a 100%);
    border: 1px solid #3a5a80;
    border-left: none;
    border-radius: 0 8px 8px 0;
    margin-left: -15px;
  }

  // 激活状态样式
  &.active {
    .autumn & {
      background: linear-gradient(135deg, #e8d5b7 0%, #d4b78c 100%);
      border-color: #b3956a;
      box-shadow: 2px 2px 8px rgba(139, 69, 19, 0.2);
    }

    .starry & {
      background: linear-gradient(135deg, #2d4d7a 0%, #3a5a80 100%);
      border-color: #4a6a90;
      box-shadow: 2px 2px 8px rgba(168, 216, 234, 0.2);
    }

    .tab-text {
      font-weight: 600;

      .autumn & {
        color: #8b4513;
      }

      .starry & {
        color: #c1e4f5;
      }
    }
  }

  // 悬停效果
  &:hover:not(.active) {
    transform: translateX(2px);

    .autumn & {
      background: linear-gradient(135deg, #f5e8c8 0%, #e8d5b7 100%);
    }

    .starry & {
      background: linear-gradient(135deg, #2d4d7a 0%, #3a5a80 100%);
    }
  }
}

// 书签露出的部分
.tab-sticker {
  position: absolute;
  top: 50%;
  left: -25px; /* 向左延伸到纸张外 */
  transform: translateY(-50%);
  width: 30px;
  height: 40px;
  border-radius: 4px 0 0 4px;
  z-index: 11; /* 在纸张上方 */
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;

  .autumn & {
    background: linear-gradient(135deg, #d4b78c 0%, #c4a57a 100%);
    border: 1px solid #b3956a;
  }

  .starry & {
    background: linear-gradient(135deg, #3a5a80 0%, #4a6a90 100%);
    border: 1px solid #5a7aa0;
  }

  .page-tab.active & {
    .autumn & {
      background: linear-gradient(135deg, #a0522d 0%, #8b4513 100%);
      border-color: #7a3d1a;
      box-shadow: 3px 0 8px rgba(139, 69, 19, 0.3);
    }

    .starry & {
      background: linear-gradient(135deg, #c1e4f5 0%, #a8d8ea 100%);
      border-color: #97c8e0;
      box-shadow: 3px 0 8px rgba(168, 216, 234, 0.3);
    }
  }
}

.tab-text {
  font-size: 0.85rem;
  font-weight: 500;
  letter-spacing: 1px;
  display: block;
  position: relative;
  z-index: 2;
  text-align: left;
  margin-left: 10px; /* 为书签留出空间 */
  transition: all 0.3s ease;
}

// 添加书页夹住的效果
.letter-paper::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 10px;
  z-index: 9;
  pointer-events: none;

  .autumn & {
    background: linear-gradient(to right, rgba(255, 250, 240, 0.8) 0%, transparent 100%);
  }

  .starry & {
    background: linear-gradient(to right, rgba(15, 52, 96, 0.8) 0%, transparent 100%);
  }
}

.letter-lines {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: repeating-linear-gradient(
    transparent,
    transparent 23px,
    rgba(0, 0, 0, 0.1) 23px,
    rgba(0, 0, 0, 0.1) 24px
  );
  pointer-events: none;
  border-radius: 8px;
  z-index: 1;

  .starry & {
    background-image: repeating-linear-gradient(
      transparent,
      transparent 23px,
      rgba(230, 230, 255, 0.1) 23px,
      rgba(230, 230, 255, 0.1) 24px
    );
  }
}

.letter-content {
  position: relative;
  z-index: 1;
  min-height: 500px;
  padding-left: 40px; /* 减少左侧padding，因为页签现在在外面 */
}

// 路由切换动画
.page-fade-enter-active,
.page-fade-leave-active {
  transition: all 0.3s ease;
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

// 响应式设计 - 保持侧边栏布局
@media (max-width: 768px) {
  .main-content {
    padding: 1rem;
  }

  .letter-paper {
    padding: 2rem 1.5rem 2rem 4rem; /* 增加左侧padding为页签留空间 */
    min-height: 500px;
    position: relative;
    overflow: visible;
  }

  .page-tabs {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    flex-direction: column;
    gap: 6px;
    width: auto;
  }

  .page-tab {
    min-width: 90px;
    padding: 10px 12px 10px 6px;
    margin-left: -12px;
  }

  .tab-sticker {
    left: -18px;
    width: 22px;
    height: 32px;
  }

  .tab-text {
    font-size: 0.75rem;
    margin-left: 6px;
  }

  .letter-content {
    padding-left: 20px;
    min-height: 400px;
  }

  .nav-container {
    padding: 0 1rem;
  }

  .logo {
    font-size: 1.5rem;
  }

  // 移动端调整装饰
  .pen {
    bottom: -15px;
    right: -10px;
    font-size: 3rem;
  }

  .corner-protector.top-left {
    width: 80px;
    height: 80px;

    &::before {
      top: -40px;
      left: -40px;
      width: 80px;
      height: 80px;
    }
  }

  .hanging-label {
    right: 40px;
    width: 20px;
    height: 60px;

    &::after {
      width: 16px;
      height: 50px;
    }
  }
}

// 超小屏幕优化 - 仍然保持侧边栏
@media (max-width: 480px) {
  .letter-paper {
    padding: 1.5rem 1rem 1.5rem 3.5rem;
    min-height: 450px;
  }

  .page-tab {
    min-width: 80px;
    padding: 8px 10px 8px 4px;
    margin-left: -10px;
  }

  .tab-sticker {
    left: -15px;
    width: 18px;
    height: 28px;
  }

  .tab-text {
    font-size: 0.7rem;
    margin-left: 4px;
  }

  .letter-content {
    padding-left: 15px;
    min-height: 350px;
  }

  .main-content {
    padding: 0.5rem;
  }

  // 超小屏幕调整装饰
  .pen {
    bottom: -10px;
    right: -8px;
    font-size: 2.5rem;
  }

  .corner-protector.top-left {
    width: 60px;
    height: 60px;

    &::before {
      top: -30px;
      left: -30px;
      width: 60px;
      height: 60px;
    }
  }

  .hanging-label {
    right: 30px;
    width: 16px;
    height: 50px;

    &::before {
      width: 6px;
      height: 6px;
    }

    &::after {
      width: 14px;
      height: 40px;
    }
  }
}

// 极小屏幕 - 仍然保持侧边栏，进一步缩小尺寸
@media (max-width: 360px) {
  .letter-paper {
    padding: 1rem 0.8rem 1rem 3rem;
    min-height: 400px;
  }

  .page-tab {
    min-width: 70px;
    padding: 6px 8px 6px 3px;
    margin-left: -8px;
  }

  .tab-sticker {
    left: -12px;
    width: 15px;
    height: 24px;
  }

  .tab-text {
    font-size: 0.65rem;
    margin-left: 3px;
  }

  .letter-content {
    padding-left: 12px;
    min-height: 300px;
  }

  // 极小屏幕简化装饰
  .pen {
    bottom: -8px;
    right: -6px;
    font-size: 2rem;
  }

  .corner-protector.top-left {
    width: 50px;
    height: 50px;

    &::before {
      top: -25px;
      left: -25px;
      width: 50px;
      height: 50px;
    }
  }

  .hanging-label {
    right: 25px;
    width: 14px;
    height: 40px;

    &::before {
      width: 5px;
      height: 5px;
    }

    &::after {
      width: 12px;
      height: 32px;
    }
  }
}
</style>
