<template>
  <div class="options-panel" :class="theme">
    <div class="info-card">
      <div class="card-header">
        <h2 class="card-title">选项</h2>
      </div>

      <!-- 空状态 -->
      <div v-if="!showOptions" class="empty-state">
        <div class="empty-icon">🤔</div>
        <p>暂无可用选项</p>
      </div>

      <!-- 选项列表 -->
      <div v-else class="content-wrapper">
        <section class="section">
          <div class="options-list">
            <button v-for="(opt, idx) in optionsList" :key="idx" class="option-btn" @click="selectOption(opt)">
              {{ opt }}
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useStatStore } from '../store/StatStore';
import { useMessageStore } from '../store/MessageStore';

/* 状态 */
const showOptions = ref(false);
const optionsList = ref<string[]>([]);

/* 主题 */
const statStore = useStatStore();
const messageStore = useMessageStore();
const theme = computed(() => (statStore.stat_data?.theme === 'dark' ? 'dark' : 'light'));

/* 解析选项 */
function parseOptions(msg: string): string[] {
  try {
    const block = msg.match(/<options>([\s\S]*?)<\/options>/);
    if (!block?.[1]) return [];
    const ops = Array.from(block[1].matchAll(/<op>(.*?)<\/op>/g), m => m[1].trim());
    return ops.length ? ops : [];
  } catch {
    return [];
  }
}

/* 监听 messageStore */
watch(
  () => messageStore.message,
  msg => {
    const ops = parseOptions(msg);
    optionsList.value = ops;
    showOptions.value = ops.length > 0;
  },
  { immediate: true },
);

/* 点击选项：追加到 SillyTavern 输入框 */
function selectOption(option: string) {
  const input = window.parent.document.querySelector('#send_textarea') as HTMLTextAreaElement;
  if (!input) {
    console.warn('未找到 SillyTavern 输入框 #send_textarea');
    return;
  }
  const cur = input.value.trim();
  input.value = cur ? `${cur} ${option}` : option;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
}
</script>
<style lang="scss" scoped>
/* ========== 粉色 & 深紫色主题变量 ========== */
.options-panel {
  /* 浅色模式 */
  --bg-primary: #fff0f5; /* 主背景：极浅粉 */
  --bg-secondary: #ffe4e6; /* 次背景：浅粉 */
  --bg-tertiary: #ffdce0; /* 卡片背景：柔粉 */
  --text-primary: #3e1f47; /* 主文字：深紫 */
  --text-secondary: #6d4b7d; /* 次文字：紫灰 */
  --text-tertiary: #9a7aa0; /* 第三文字：淡紫灰 */
  --border-color: #d8bfd8; /* 边框：柔紫 */
  --shadow: 0 2px 12px rgba(142, 92, 184, 0.08);
  --accent: #ff66b3; /* 强调色：亮粉 */
  --accent-hover: #ff4da6; /* 强调悬浮：更亮粉 */
  --radius: 12px;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.options-panel.dark {
  /* 深色模式 */
  --bg-primary: #2c1b3d; /* 主背景：深紫 */
  --bg-secondary: #24162f; /* 次背景：更深紫 */
  --bg-tertiary: #1a1025; /* 卡片背景：紫黑 */
  --text-primary: #ffd1e8; /* 主文字：淡粉 */
  --text-secondary: #d9a7c1; /* 次文字：粉灰 */
  --text-tertiary: #a87e9e; /* 第三文字：暗粉灰 */
  --border-color: #4a3a5b; /* 边框：深紫灰 */
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  --accent: #ff66b3; /* 强调色：亮粉 */
  --accent-hover: #ff4da6; /* 强调悬浮：更亮粉 */
}

/* ========== 以下结构与原始文件完全一致 ========== */
.options-panel {
  padding: 24px;
  min-height: 100%;
  background: var(--bg-secondary);
  transition: var(--transition);
}

.info-card {
  background: var(--bg-primary);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
  max-width: 600px;
  margin: 0 auto;
}

.card-header {
  padding: 24px;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
  color: white;
}

.card-title {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.5px;
}

.card-subtitle {
  font-size: 14px;
  opacity: 0.9;
  font-weight: 400;
}

.content-wrapper {
  padding: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--border-color);
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-btn {
  width: 100%;
  text-align: left;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 15px;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: var(--transition);
}

.option-btn:hover {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}

.empty-state {
  padding: 48px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

@media (max-width: 768px) {
  .options-panel {
    padding: 16px;
  }

  .card-header {
    padding: 20px;
  }

  .card-title {
    font-size: 20px;
  }

  .content-wrapper {
    padding: 20px;
  }

  .option-btn {
    font-size: 14px;
    padding: 10px 12px;
  }
}

.options-panel.dark ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.options-panel.dark ::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

.options-panel.dark ::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.options-panel.dark ::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}
</style>
