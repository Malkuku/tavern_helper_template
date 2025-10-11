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
            active: $route.path === routeT.path,
            'autumn-button': isDiaryPage
          }"
          @click="$router.push(routeT.path)"
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

    <!-- 星空追加选择框 - 放在底部正中间 -->
    <div class="mystic-card-container">
      <details class="mystic-card-silent">
        <summary class="card-summary">
          <div class="action-btn-silent toggle-collapse-btn">{{ isCardOpen ? '收起' : '展开' }}</div>
        </summary>
        <div class="button-group-silent">
          <button
            v-for="(item, index) in items"
            :key="index"
            class="action-btn-silent"
            :class="['opt' + (index + 1), { active: activeItem === index }]"
          >
            {{ item.title }}
          </button>
        </div>
      </details>
    </div>

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
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const routes = [
  { path: '/状态界面', name: '人物状态', icon: '👤' },
  { path: '/世界信息', name: '世界信息', icon: '🌍' },
  { path: '/多多日记', name: '多多日记', icon: '📖' },
];

// 判断是否在多多日记页面
const isDiaryPage = computed(() => route.path === '/多多日记');

// 星空选择框相关状态
const isCardOpen = ref(false);
const activeItem = ref<number | null>(null);

// 选项配置
interface RoleplayOption {
  title: string;
  content: string;
}

const items = ref<RoleplayOption[]>([]);

// 从消息中提取选项内容
function extractItems() {
  try {
    const message_id = getCurrentMessageId();
    const chat_messages = getChatMessages(message_id);

    if (!chat_messages || chat_messages.length === 0) {
      console.warn('No chat messages found');
      return [];
    }

    const chat_message = chat_messages[0];
      const regex = /<①>(.*?)<\/①>.*?<②>(.*?)<\/②>.*?<③>(.*?)<\/③>.*?<④>(.*?)<\/④>.*?<⑤>(.*?)<\/⑤>.*?<⑥>(.*?)<\/⑥>/s;
      const match = chat_message.message.match(regex);

      if (match) {
        return [
          { title: match[1]?.trim() || '选项1', content: match[1]?.trim() || '$1' },
          { title: match[2]?.trim() || '选项2', content: match[2]?.trim() || '$2' },
          { title: match[3]?.trim() || '选项3', content: match[3]?.trim() || '$3' },
          { title: match[4]?.trim() || '选项4', content: match[4]?.trim() || '$4' },
          { title: match[5]?.trim() || '选项5', content: match[5]?.trim() || '$5' },
          { title: match[6]?.trim() || '选项6', content: match[6]?.trim() || '$6' }
        ];
      }else return [];
  } catch (error) {
    console.error('Error extracting items:', error);
    return [];
  }
}
// 设置按钮点击事件监听器
function setupButtonListeners() {
  nextTick(() => {
    const buttons = document.querySelectorAll('.button-group-silent .action-btn-silent:not(.toggle-collapse-btn)');

    buttons.forEach((btn, index) => {
      // 移除现有的事件监听器（避免重复绑定）
      btn.replaceWith(btn.cloneNode(true));
    });

    // 重新获取按钮并绑定事件
    const newButtons = document.querySelectorAll('.button-group-silent .action-btn-silent:not(.toggle-collapse-btn)');

    newButtons.forEach((btn, index) => {
      if (index < items.value.length) {
        const item = items.value[index];
        // 设置 data-action 属性
        btn.setAttribute('data-action', item.content);

        btn.addEventListener('click', (event) => {
          event.stopPropagation();
          const textToAppend = btn.getAttribute('data-action');
          if (!textToAppend) return;

          try {
            // 尝试在父窗口（SillyTavern主窗口）中查找输入框
            const input = window.parent.document.querySelector('#send_textarea') as HTMLTextAreaElement;
            if (input) {
              const currentValue = input.value.trim();
              input.value = currentValue ? `${currentValue} ${textToAppend}` : textToAppend;
              input.dispatchEvent(new Event('input', { bubbles: true }));

              // 切换激活状态
              btn.classList.toggle('active');
            } else {
              console.error('SillyTavern input #send_textarea not found in parent window.');

              // 如果在父窗口找不到，尝试在当前窗口找（备用方案）
              const localInput = document.querySelector('#send_textarea') as HTMLTextAreaElement;
              if (localInput) {
                const currentValue = localInput.value.trim();
                localInput.value = currentValue ? `${currentValue} ${textToAppend}` : textToAppend;
                localInput.dispatchEvent(new Event('input', { bubbles: true }));
                btn.classList.toggle('active');
              }
            }
          } catch (error) {
            console.error('Error appending text:', error);
          }
        });
      }
    });
  });
}

// 监听 details 元素的 toggle 事件
const setupCardListeners = () => {
  const detailsElement = document.querySelector('.mystic-card-silent');
  if (detailsElement) {
    detailsElement.addEventListener('toggle', () => {
      isCardOpen.value = (detailsElement as HTMLDetailsElement).open;
    });
  }
};

onMounted(() => {
  // 组件挂载时获取选项内容
  items.value = extractItems();

  // 设置卡片监听器
  setupCardListeners();

  // 设置按钮监听器
  setupButtonListeners();
});

// 监听 items 变化，当选项更新时重新绑定事件
watch(items, () => {
  setupButtonListeners();
});

onUnmounted(() => {
  // 清理事件监听器
  const detailsElement = document.querySelector('.mystic-card-silent');
  if (detailsElement) {
    detailsElement.removeEventListener('toggle', () => {});
  }

  // 清理按钮事件监听器
  const buttons = document.querySelectorAll('.button-group-silent .action-btn-silent');
  buttons.forEach(btn => {
    btn.replaceWith(btn.cloneNode(true));
  });
});
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
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.nav-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(147, 197, 253, 0.25);
  border-radius: 12px;
  color: #ffffff;
  font-size: 12px;
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
  margin-bottom: 80px;
}

/* 星空追加选择框样式 - 减少透明度 */
.mystic-card-container {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  width: calc(100% - 32px);
  max-width: 1200px;
  pointer-events: none;
}

.mystic-card-silent {
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(37, 99, 235, 0.12));
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 8px 30px rgba(59, 130, 246, 0.1),
              inset 0 0 1px 1px rgba(147, 197, 253, 0.2);
  border: 1px solid rgba(147, 197, 253, 0.2);
  position: relative;
  overflow: hidden;
  width: 100%;
  pointer-events: auto;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.card-summary {
  list-style: none;
  cursor: pointer;
  order: 2;
  margin-top: 12px;
}

.card-summary::-webkit-details-marker {
  display: none;
}

.mystic-card-silent:not([open]) > .card-summary {
  margin-top: 0;
}

.button-group-silent {
  display: flex;
  flex-direction: column;
  gap: 10px;
  order: 1;
  width: 100%;
}

.action-btn-silent {
  box-sizing: border-box;
  border-radius: 8px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  width: 100%;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(147, 197, 253, 0.2);
  background: rgba(255, 255, 255, 0.06);
  color: #ffffff;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  cursor: pointer;
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.3);
}

.action-btn-silent:not(.toggle-collapse-btn):hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(147, 197, 253, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15);
}

.action-btn-silent.active {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(147, 197, 253, 0.5);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

.action-btn-silent.opt1:hover, .action-btn-silent.opt1.active {
  box-shadow: 0 4px 16px rgba(116, 185, 255, 0.2);
  border-color: rgba(116, 185, 255, 0.4);
}
.action-btn-silent.opt2:hover, .action-btn-silent.opt2.active {
  box-shadow: 0 4px 16px rgba(162, 155, 254, 0.2);
  border-color: rgba(162, 155, 254, 0.4);
}
.action-btn-silent.opt3:hover, .action-btn-silent.opt3.active {
  box-shadow: 0 4px 16px rgba(255, 234, 167, 0.2);
  border-color: rgba(255, 234, 167, 0.4);
}
.action-btn-silent.opt4:hover, .action-btn-silent.opt4.active {
  box-shadow: 0 4px 16px rgba(250, 177, 160, 0.2);
  border-color: rgba(250, 177, 160, 0.4);
}
.action-btn-silent.opt5:hover, .action-btn-silent.opt5.active {
  box-shadow: 0 4px 16px rgba(85, 239, 196, 0.2);
  border-color: rgba(85, 239, 196, 0.4);
}
.action-btn-silent.opt6:hover, .action-btn-silent.opt6.active {
  box-shadow: 0 4px 16px rgba(255, 118, 117, 0.2);
  border-color: rgba(255, 118, 117, 0.4);
}

.toggle-collapse-btn {
  text-align: center;
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(147, 197, 253, 0.3);
  cursor: pointer;
  font-size: 14px;
  padding: 12px 20px;
}

.card-summary:hover .toggle-collapse-btn {
  background: rgba(59, 130, 246, 0.25) !important;
  border-color: rgba(147, 197, 253, 0.5);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2);
}

/* 为日记页面添加秋天主题的选项框样式 */
.autumn-theme .mystic-card-silent {
  background: linear-gradient(135deg, rgba(180, 83, 9, 0.08), rgba(146, 64, 14, 0.12));
  box-shadow: 0 8px 30px rgba(180, 83, 9, 0.1),
              inset 0 0 1px 1px rgba(180, 83, 9, 0.2);
  border: 1px solid rgba(180, 83, 9, 0.2);
}

.autumn-theme .action-btn-silent {
  border: 1px solid rgba(180, 83, 9, 0.2);
  background: rgba(255, 255, 255, 0.06);
}

.autumn-theme .action-btn-silent:not(.toggle-collapse-btn):hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(180, 83, 9, 0.4);
  box-shadow: 0 4px 16px rgba(180, 83, 9, 0.15);
}

.autumn-theme .action-btn-silent.active {
  background: rgba(180, 83, 9, 0.2);
  border-color: rgba(180, 83, 9, 0.5);
  box-shadow: 0 2px 8px rgba(180, 83, 9, 0.2);
}

.autumn-theme .toggle-collapse-btn {
  background: rgba(180, 83, 9, 0.15);
  border-color: rgba(180, 83, 9, 0.3);
}

.autumn-theme .card-summary:hover .toggle-collapse-btn {
  background: rgba(180, 83, 9, 0.25) !important;
  border-color: rgba(180, 83, 9, 0.5);
  box-shadow: 0 4px 16px rgba(180, 83, 9, 0.2);
}

/* 秋天落叶动画和其他样式保持不变 */
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
    margin-bottom: 70px;
  }

  .leaf {
    font-size: 16px;
  }

  .mystic-card-container {
    bottom: 10px;
    width: calc(100% - 24px);
    max-width: none;
  }

  .mystic-card-silent {
    padding: 12px;
    border-radius: 10px;
  }

  .action-btn-silent {
    padding: 10px 16px;
    font-size: 13px;
  }

  .toggle-collapse-btn {
    padding: 10px 16px;
    font-size: 13px;
  }
}
</style>