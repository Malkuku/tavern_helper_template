<template>
  <div class="quest-view">
    <header class="quest-header">
      <h1 class="page-title">道寻 <span class="subtitle">QUESTS & EVENTS</span></h1>
      <div class="header-line"></div>
    </header>

    <nav class="quest-tabs">
      <div class="tabs-group">
        <button
          v-if="hasBoardData"
          :class="['tab-btn', { active: currentTab === 'board' }]"
          @click="currentTab = 'board'"
        >
          <span class="tab-icon">€</span>
          <span class="tab-name">委托</span>
          <span class="tab-badge-dot"></span>
        </button>

        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab-btn', { active: currentTab === tab.id }]"
          @click="currentTab = tab.id"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-name">{{ tab.name }}</span>
          <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
        </button>
      </div>

      <!-- 编辑模式切换按钮 (仅在插曲和因果页面显示) -->
      <transition name="fade">
        <button
          v-if="currentTab === 'tasks' || currentTab === 'events'"
          class="edit-mode-btn"
          :class="{ 'is-editing': isEditMode }"
          @click="toggleEditMode"
        >
          <span class="icon">{{ isEditMode ? '✓' : '✎' }}</span>
          <span class="text">{{ isEditMode ? '完成' : '编辑' }}</span>
        </button>
      </transition>
    </nav>

    <div class="quest-content">
      <transition name="fade-slide" mode="out-in">
        <!-- 0. 布告栏面板 (最终优化版) -->
        <div v-if="currentTab === 'board'" class="panel-board" key="board">
          <div class="board-grid">
            <div
              v-for="(quest, name) in questBoardData"
              :key="name"
              class="task-card board-card"
              :class="{
                'is-selected': selectedQuests.has(name),
                'is-sealed': isSubmitting && selectedQuests.has(name),
              }"
              @click="!isSubmitting && toggleQuest(name)"
            >
              <!-- 选中时的左侧光条 -->
              <div class="active-bar"></div>

              <!-- 顶部：标题与状态 -->
              <div class="card-top">
                <h3 class="quest-title">{{ name }}</h3>
                <div class="status-checkbox">
                  <transition name="scale-in">
                    <span v-show="selectedQuests.has(name)" class="check-icon"></span>
                  </transition>
                </div>
              </div>

              <!-- 中部：信息区 -->
              <div class="card-content">
                <div class="info-group">
                  <span class="info-label">委托详情 / DETAIL</span>
                  <p class="info-text">{{ quest['描述'] }}</p>
                </div>

                <div class="info-group warning" v-if="quest['要求']">
                  <span class="info-label">执行要求 / REQUIREMENT</span>
                  <p class="info-text">{{ quest['要求'] }}</p>
                </div>
              </div>

              <!-- 底部：报酬 (垂直布局优化) -->
              <div class="card-footer">
                <span class="reward-label">ESTIMATED REWARD</span>
                <div class="reward-content">
                  <span class="reward-icon">❖</span>
                  <span class="reward-value">{{ quest['报酬'] }}</span>
                </div>
              </div>

              <!-- 选中时的边框流光 -->
              <div class="card-glow" v-if="selectedQuests.has(name)"></div>
            </div>
          </div>

          <!-- 底部签署栏 -->
          <transition name="slide-up">
            <div v-if="selectedQuests.size > 0" class="signature-bar">
              <div class="signature-info">
                <span class="label">PENDING CONTRACTS</span>
                <span class="count">{{ selectedQuests.size }}</span>
              </div>

              <button
                class="sign-btn"
                @click="confirmQuests"
                :disabled="isSubmitting"
                :class="{ 'btn-loading': isSubmitting }"
              >
                <span class="btn-text" v-if="!isSubmitting">签署契约 / SIGN</span>
                <span class="btn-text" v-else>SEALING...</span>
                <div class="btn-shine"></div>
              </button>
            </div>
          </transition>
        </div>

        <!-- 1. 主线任务 -->
        <div v-else-if="currentTab === 'main'" class="panel-main" key="main">
          <div v-if="filteredMainQuests.length === 0" class="empty-state">暂无主线指引</div>
          <MainQuestCard
            v-for="quest in filteredMainQuests"
            :key="quest.title"
            :title="quest.title"
            :data="quest"
            :blocks="questStore.mainlineMeta?.layouts[quest.title]?.blocks"
          />
        </div>

        <!-- 2. 委托任务 -->
        <div v-else-if="currentTab === 'tasks'" key="tasks" class="panel-tasks">
          <div v-if="filteredTasks.length === 0" class="empty-state">暂无进行中的委托</div>
          <div class="task-grid">
            <NarrativeEntryCard
              v-for="task in filteredTasks"
              :key="task.title"
              :title="task.title"
              :data="task"
              kind="任务"
              ><template v-if="isEditMode" #actions
                ><button class="card-delete-btn" title="放弃委托" @click.stop="handleDelete(task)">×</button></template
              ></NarrativeEntryCard
            >
          </div>
        </div>

        <!-- 3. 事件 -->
        <div v-else-if="currentTab === 'events'" class="panel-events" key="events">
          <div v-if="filteredEvents.length === 0" class="empty-state">无特殊事件</div>
          <div class="event-list">
            <NarrativeEntryCard
              v-for="evt in filteredEvents"
              :key="evt.title"
              :title="evt.title"
              :data="evt"
              kind="事件"
              ><template v-if="isEditMode" #actions
                ><button class="row-delete-btn" @click.stop="handleDelete(evt)">删除</button></template
              ></NarrativeEntryCard
            >
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useQuestStore } from '@/尘史使徒/UI/store/QuestStore';
import { useUiStore } from '@/尘史使徒/UI/store/UIStore';
import MainQuestCard from '@/尘史使徒/UI/components/task/MainQuestCard.vue';
import NarrativeEntryCard from '@/尘史使徒/UI/components/task/NarrativeEntryCard.vue';
import { MvuUtil } from '@/Utils/MvuUtil';

const router = useRouter();
const questStore = useQuestStore();
const uiStore = useUiStore();

// 数据源
const questBoardData = computed(() => questStore.questBoardData);
const hasBoardData = computed(() => questStore.hasBoardData);

// Tab 逻辑
const currentTab = ref(hasBoardData.value ? 'board' : 'main');

// 监听新任务，自动切到布告栏
watch(hasBoardData, val => {
  if (val) currentTab.value = 'board';
});

// 切换 Tab 时退出编辑模式
watch(currentTab, () => {
  isEditMode.value = false;
});

// 过滤已接取任务
const filteredMainQuests = computed(() => questStore.mainQuests.filter(q => q.title !== '$template'));
const filteredTasks = computed(() => questStore.tasks.filter(t => t.title !== '$template'));
const filteredEvents = computed(() => questStore.events.filter(e => e.title !== '$template'));

const tabs = computed(() => [
  { id: 'main', name: '主律', icon: '▣', count: filteredMainQuests.value.length },
  { id: 'tasks', name: '插曲', icon: '◌', count: filteredTasks.value.length },
  { id: 'events', name: '因果', icon: '⫩', count: filteredEvents.value.length },
]);

// --- 编辑/删除逻辑 ---
const isEditMode = ref(false);

const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value;
};

const handleDelete = async (object: any) => {
  // 必须要有 title 才能定位 Key
  if (!object || !object.title) return;

  const confirmText = `确定要删除 "${object.title}" 吗？`;
  if (!window.confirm(confirmText)) return;

  // 1. 根据当前 Tab 确定在全局数据中的根节点 Key
  let rootKey = '';
  switch (currentTab.value) {
    case 'tasks':
      rootKey = '任务';
      break;
    case 'events':
      rootKey = '事件';
      break;
    case 'main':
      rootKey = '主线';
      break;
    default:
      console.warn('当前标签页不支持删除操作');
      return;
  }

  // 2. 构造 Payload： { "根节点": { "对象名": {} } }
  // 使用空对象 {} 标记删除
  const payload = {
    [rootKey]: {
      [object.title]: {},
    },
  };

  try {
    // 3. 调用 API
    // 使用 MvuUtil 的差分更新方法删除任务
    const diffPayload = {
      [rootKey]: {
        [object.title]: null, // null 表示删除该字段
      },
    };
    await MvuUtil.updateMvuDataByDiff(diffPayload);
  } catch (e) {
    console.error('删除失败', e);
  }
};

// --- 接取逻辑 ---
const selectedQuests = ref<Set<string>>(new Set());
const isSubmitting = ref(false);

const toggleQuest = (name: string) => {
  if (selectedQuests.value.has(name)) selectedQuests.value.delete(name);
  else selectedQuests.value.add(name);
};

const confirmQuests = async () => {
  if (selectedQuests.value.size === 0 || isSubmitting.value) return;

  isSubmitting.value = true;
  await new Promise(resolve => setTimeout(resolve, 800));

  const logs = Array.from(selectedQuests.value).map(name => {
    const quest = questBoardData.value[name];
    return {
      名称: name,
      描述: quest['描述'],
      要求: quest['要求'],
      报酬: quest['报酬'],
    };
  });

  try {
    const jsonStr = JSON.stringify(logs, null, 0);
    const outputText = `<user>希望接取以下委托
<list>
${jsonStr}
</list>
如果顺利，则离开当前场景
`;

    // 1. 将信息存储到 UI Store
    uiStore.setPendingInput(outputText);

    // 2. 清理当前状态
    selectedQuests.value.clear();
    questStore.clearQuestBoardData();

    // 3. 跳转回正文页面 (假设路由路径为 /选项)
    await router.push('/选项');
  } catch (e) {
    console.error('委托提交失败', e);
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
/* 继承 Layout.vue 的变量，并定义局部变量 */
.quest-view {
  --c-card-bg: rgba(20, 20, 20, 0.6);
  --c-card-border: rgba(164, 139, 87, 0.4);
  --c-accent-danger: #a83232;
  --c-gold: #d4af37;
  --c-gold-glow: rgba(212, 175, 55, 0.5);
  --c-text-main: #e0e0e0;
  --c-text-dim: #888;

  height: 100vh; /* 兼容旧浏览器 */
  height: 100dvh; /* 关键修复：使用动态视口高度，自动适应浏览器地址栏/工具栏 */
  display: flex;
  flex-direction: column;
  padding: 20px 40px;
  overflow: hidden;
  font-family: var(--font-body);
  color: var(--c-text-main);
  position: relative;
}

/* --- Header --- */
.quest-header {
  flex-shrink: 0;
  margin-bottom: 20px;
}

.page-title {
  font-family: var(--font-title);
  font-size: 2rem;
  color: var(--c-text-main);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 0;
}

.subtitle {
  font-size: 0.9rem;
  color: var(--c-gold);
  margin-left: 10px;
  font-weight: 400;
}

.header-line {
  height: 1px;
  background: linear-gradient(90deg, var(--c-gold), transparent);
  margin-top: 10px;
  width: 100%;
}

/* --- Tabs --- */
.quest-tabs {
  display: flex;
  justify-content: space-between; /* 两端对齐，容纳编辑按钮 */
  align-items: center;
  margin-bottom: 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-right: 10px;
}

.tabs-group {
  display: flex;
  gap: 20px;
}

.tab-btn {
  background: transparent;
  border: none;
  padding: 10px 20px;
  color: var(--c-text-dim);
  font-family: var(--font-title);
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  transition: all 0.3s;
}

.tab-btn:hover {
  color: var(--c-text-main);
  background: rgba(255, 255, 255, 0.05);
}

.tab-btn.active {
  color: var(--c-gold);
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--c-gold);
  box-shadow: 0 0 10px var(--c-gold);
}

.tab-badge-dot {
  width: 8px;
  height: 8px;
  background-color: var(--c-accent-danger);
  border-radius: 50%;
  position: absolute;
  top: 8px;
  right: 8px;
  box-shadow: 0 0 5px var(--c-accent-danger);
  animation: pulse-dot 1.5s infinite;
}

@keyframes pulse-dot {
  0% {
    transform: scale(1);
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(168, 50, 50, 0.7);
  }
  70% {
    transform: scale(1.1);
    opacity: 0.8;
    box-shadow: 0 0 0 6px rgba(168, 50, 50, 0);
  }
  100% {
    transform: scale(1);
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(168, 50, 50, 0);
  }
}

.tab-count {
  font-size: 0.8rem;
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: sans-serif;
}

/* --- Edit Mode Button --- */
.edit-mode-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--c-text-dim);
  padding: 6px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.edit-mode-btn:hover {
  border-color: var(--c-gold);
  color: var(--c-gold);
}

.edit-mode-btn.is-editing {
  background: var(--c-accent-danger);
  border-color: var(--c-accent-danger);
  color: white;
  box-shadow: 0 0 10px rgba(168, 50, 50, 0.4);
}

.edit-mode-btn.is-editing:hover {
  background: #c0392b;
}

/* --- Content Area --- */
.quest-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 10px;
  padding-bottom: 80px;
  scrollbar-width: thin;
  scrollbar-color: var(--c-gold) transparent;
}

.quest-content::-webkit-scrollbar {
  width: 4px;
}
.quest-content::-webkit-scrollbar-thumb {
  background: var(--c-gold);
}

.empty-state {
  text-align: center;
  padding: 50px;
  color: var(--c-text-dim);
  font-style: italic;
  border: 1px dashed var(--c-border);
}

/* =========================================
   Board Card (新进委托) - 最终优化版
   ========================================= */
.board-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  padding-bottom: 40px;
}

.board-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: rgba(15, 15, 15, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  min-height: 220px;
}

.board-card:hover {
  transform: translateY(-4px);
  border-color: rgba(212, 175, 55, 0.3);
  background: rgba(20, 20, 20, 0.95);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

/* 选中状态 */
.board-card.is-selected {
  border-color: var(--c-gold);
  background: linear-gradient(160deg, rgba(20, 20, 20, 0.95) 0%, rgba(35, 30, 15, 0.95) 100%);
  box-shadow: 0 5px 25px rgba(212, 175, 55, 0.15);
}

/* 左侧激活光条 */
.active-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--c-gold);
  transform: scaleY(0);
  transform-origin: bottom;
  transition: transform 0.3s ease;
  z-index: 2;
}

.board-card.is-selected .active-bar {
  transform: scaleY(1);
}

/* --- 顶部区域 --- */
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 20px 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.quest-title {
  font-family: var(--font-title);
  font-size: 1.15rem;
  color: #eee;
  margin: 0;
  line-height: 1.3;
  padding-right: 15px;
  word-break: break-word;
}

/* 状态指示器 (Checkbox) */
.status-checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.board-card:hover .status-checkbox {
  border-color: rgba(255, 255, 255, 0.5);
}

.board-card.is-selected .status-checkbox {
  background: var(--c-gold);
  border-color: var(--c-gold);
  box-shadow: 0 0 8px var(--c-gold);
}

.check-icon {
  color: #111;
  font-size: 12px;
  font-weight: 900;
}

/* --- 内容区域 --- */
.card-content {
  flex: 1;
  padding: 15px 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.info-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.info-text {
  font-size: 0.9rem;
  color: var(--c-text-dim);
  margin: 0;
  line-height: 1.5;
  white-space: pre-wrap;
}

.info-group.warning .info-text {
  color: #d48888;
}

/* --- 底部报酬区域 (垂直布局优化) --- */
.card-footer {
  margin-top: auto;
  padding: 15px 20px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column; /* 垂直排列 */
  gap: 6px;
  transition: background 0.3s ease;
}

.reward-label {
  font-size: 0.65rem;
  color: var(--c-gold);
  opacity: 0.6;
  letter-spacing: 1.5px;
  font-weight: bold;
  text-transform: uppercase;
  transition: color 0.3s;
}

.reward-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reward-icon {
  font-size: 0.9rem;
  color: var(--c-gold);
  opacity: 0.8;
  transition: color 0.3s;
}

.reward-value {
  font-family: var(--font-title);
  color: var(--c-gold);
  font-size: 1.1rem; /* 加大字号 */
  font-weight: bold;
  line-height: 1.2;
  transition: color 0.3s;
}

/* 选中时底部变色 */
.board-card.is-selected .card-footer {
  background: var(--c-gold);
}

.board-card.is-selected .reward-label {
  color: rgba(0, 0, 0, 0.6);
  opacity: 1;
}

.board-card.is-selected .reward-icon,
.board-card.is-selected .reward-value {
  color: #1a1a1a; /* 反色 */
  text-shadow: none;
}

/* 选中流光 */
.card-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  box-shadow: inset 0 0 0 1px var(--c-gold);
  z-index: 1;
  opacity: 0.5;
}

/* 签署时的燃烧消失动画 */
.board-card.is-sealed {
  animation: contract-burn 0.8s forwards;
  pointer-events: none;
}

@keyframes contract-burn {
  0% {
    transform: scale(1);
    filter: brightness(1);
    border-color: var(--c-gold);
  }
  40% {
    transform: scale(0.98);
    filter: brightness(2) sepia(1);
    background: var(--c-gold);
  }
  100% {
    transform: scale(0.9);
    opacity: 0;
    filter: blur(10px);
  }
}

@keyframes scale-in {
  from {
    transform: scale(0);
  }
  to {
    transform: scale(1);
  }
}

.scale-in-enter-active {
  animation: scale-in 0.2s;
}

/* =========================================
   Signature Bar (底部签署栏)
   ========================================= */
.signature-bar {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px 20px;
  background: rgba(15, 15, 15, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  z-index: 100;
}

.signature-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-left: 10px;
}

.signature-info .label {
  font-size: 0.65rem;
  color: var(--c-text-dim);
  letter-spacing: 1px;
}

.signature-info .count {
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--c-gold);
  font-family: var(--font-title);
}

.sign-btn {
  position: relative;
  background: linear-gradient(135deg, var(--c-gold) 0%, #a68b3a 100%);
  border: none;
  border-radius: 30px;
  padding: 12px 32px;
  color: #1a1a1a;
  font-family: var(--font-title);
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
}

.sign-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(212, 175, 55, 0.5);
  filter: brightness(1.1);
}

.sign-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.sign-btn:disabled {
  background: #333;
  color: #666;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transform: skewX(-20deg);
  animation: shine 3s infinite;
}

@keyframes shine {
  0% {
    left: -100%;
  }
  20% {
    left: 200%;
  }
  100% {
    left: 200%;
  }
}

/* --- Task Grid (通用) --- */
.task-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.task-card {
  background: var(--c-card-bg);
  border: 1px solid var(--c-border);
  padding: 20px;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  display: flex;
  flex-direction: column;
  position: relative; /* For delete btn */
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  border-color: var(--c-gold);
}

.task-header h3 {
  font-family: var(--font-title);
  color: var(--c-text-main);
  margin: 0 0 10px 0;
  font-size: 1.2rem;
}

.decoration-line {
  height: 2px;
  width: 30px;
  background: var(--c-gold);
  margin-bottom: 15px;
}

.task-body .desc {
  font-size: 0.95rem;
  color: var(--c-text-dim);
  margin-bottom: 15px;
  flex-grow: 1;
}

.meta-row {
  display: flex;
  align-items: baseline;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.meta-row .icon {
  margin-right: 8px;
  width: 15px;
  text-align: center;
}
.meta-row .label {
  color: var(--c-text-dim);
  margin-right: 5px;
}
.meta-row .value {
  color: var(--c-text-main);
}
.meta-row.reward .value {
  color: var(--c-gold);
}

.achievements {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
}

.ach-item {
  color: #8bc34a;
  font-size: 0.85rem;
}

/* --- Delete Button (Card) --- */
.card-delete-btn {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--c-accent-danger);
  color: white;
  border: 2px solid #1a1a1a;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
  transition: transform 0.2s;
}

.card-delete-btn:hover {
  transform: scale(1.1);
  background: #c0392b;
}

/* --- Event List --- */
.event-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid transparent;
  border-bottom: 1px solid var(--c-border);
  padding: 20px;
  margin-bottom: 10px;
  position: relative;
}

.event-row:hover {
  background: rgba(164, 139, 87, 0.05);
}

.event-info {
  flex: 1;
  padding-right: 40px;
}

.event-info h3 {
  font-family: var(--font-title);
  color: var(--c-gold);
  margin: 0 0 5px 0;
}

.event-info p {
  margin: 0 0 10px 0;
  color: var(--c-text-dim);
}

.event-progress {
  width: 250px;
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
}

.progress-text {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  letter-spacing: 1px;
  color: var(--c-gold);
  gap: 15px;
}

/* --- Delete Button (Row) --- */
.event-actions {
  margin-left: 20px;
}

.row-delete-btn {
  background: rgba(168, 50, 50, 0.2);
  border: 1px solid var(--c-accent-danger);
  color: #ff8a80;
  padding: 5px 12px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 4px;
}

.row-delete-btn:hover {
  background: var(--c-accent-danger);
  color: white;
}

/* --- Mobile Optimization --- */
@media (max-width: 768px) {
  /* 1. 容器调整：减少内边距，防止溢出 */
  .quest-view {
    padding: 10px 15px;
    height: 100vh; /* 确保占满视口 */
  }

  /* 2. 头部调整：减小字号，紧凑布局 */
  .quest-header {
    margin-bottom: 15px;
  }
  .page-title {
    font-size: 1.5rem;
  }
  .subtitle {
    display: block; /* 换行显示副标题，避免挤压 */
    margin-left: 0;
    margin-top: 4px;
    font-size: 0.75rem;
  }

  /* 3. Tab 栏优化：支持横向滚动，隐藏滚动条 */
  .quest-tabs {
    overflow-x: auto;
    white-space: nowrap;
    padding-bottom: 5px; /* 留出滚动条空间或触控空间 */
    margin-bottom: 20px;
    -webkit-overflow-scrolling: touch;
    /* 隐藏滚动条 */
    scrollbar-width: none;
  }
  .quest-tabs::-webkit-scrollbar {
    display: none;
  }

  .tabs-group {
    gap: 10px;
  }

  .tab-btn {
    padding: 8px 12px;
    font-size: 1rem;
    flex-shrink: 0; /* 防止按钮被压缩 */
  }

  /* 编辑按钮独立一行或浮动，视情况而定，这里保持在流中但允许滚动 */
  .edit-mode-btn {
    margin-left: auto; /* 挤到最右边 */
    padding-left: 15px;
    flex-shrink: 0;
  }

  /* 4. 内容区域：增加底部留白，防止被签署栏遮挡 */
  .quest-content {
    padding-right: 0; /* 移动端通常不需要右侧滚动条留白 */
    padding-bottom: 100px; /* 增加底部空间 */
  }

  /* 5. 列表与卡片调整 */
  .board-grid,
  .task-grid {
    grid-template-columns: 1fr; /* 强制单列 */
    gap: 15px;
  }

  .board-card {
    min-height: auto; /* 允许高度自适应 */
  }

  .event-row {
    flex-direction: column;
    align-items: flex-start;
    padding: 15px;
  }

  .event-info {
    padding-right: 0;
    margin-bottom: 12px;
  }

  .event-progress {
    width: 100%;
    justify-content: space-between; /* 两端对齐进度条 */
  }

  /* 6. 签署栏优化：宽度适配，位置调整 */
  .signature-bar {
    width: calc(100% - 30px); /* 减去容器 padding */
    bottom: 20px;
    padding: 10px 15px;
    flex-direction: row;
    justify-content: space-between;
  }

  .sign-btn {
    padding: 10px 20px;
    font-size: 0.9rem;
  }

  /* 7. 删除按钮优化：增大触控区域 */
  .card-delete-btn {
    width: 36px;
    height: 36px;
    font-size: 20px;
    top: -12px;
    right: -5px;
  }
}

/* --- Animation --- */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Shake Animation for Edit Mode */
@keyframes shake {
  0% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(0.5deg);
  }
  50% {
    transform: rotate(0deg);
  }
  75% {
    transform: rotate(-0.5deg);
  }
  100% {
    transform: rotate(0deg);
  }
}

.shake-anim {
  animation: shake 0.5s infinite;
}
</style>
