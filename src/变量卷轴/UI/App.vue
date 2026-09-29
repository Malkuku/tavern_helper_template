<template>
  <div
    v-if="!uiStore.showUI"
    ref="draggableBtn"
    class="ac-toggle-btn"
    :class="{ 'has-update': hasNewData }"
    :style="btnPositionStyle"
    :title="`打开命运分歧${options.length ? `，${options.length} 个选项` : ''}`"
    role="button"
    tabindex="0"
    @click="handleBtnClick"
    @keydown.enter.prevent="handleBtnClick"
    @keydown.space.prevent="handleBtnClick"
    @pointerdown="startPointer($event, 'button')"
    @pointermove="movePointer"
    @pointerup="endPointer"
    @pointercancel="endPointer"
  >
    <!-- 命运分歧悬浮徽记 -->
    <svg viewBox="0 0 100 100" class="ac-logo-svg">
      <defs>
        <linearGradient id="fateGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffd1e4" />
          <stop offset="100%" stop-color="#bf5d93" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="#211427" stroke="url(#fateGradient)" stroke-width="2" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="#e991bc" stroke-opacity=".45" stroke-width="1" />
      <path d="M50 18 L56 40 L78 50 L56 56 L50 80 L44 56 L22 50 L44 40 Z" fill="url(#fateGradient)" />
      <circle cx="50" cy="50" r="7" fill="#44213d" stroke="#ffd1e4" stroke-width="2" />
      <circle cx="50" cy="8" r="2" fill="#ffd1e4" />
      <circle cx="92" cy="50" r="2" fill="#ffd1e4" />
      <circle cx="50" cy="92" r="2" fill="#ffd1e4" />
      <circle cx="8" cy="50" r="2" fill="#ffd1e4" />
    </svg>

    <span v-if="options.length" class="option-badge">{{ options.length }}</span>

    <!--
      特效层：仅当 hasNewData 为 true 时显示
      展开后 hasNewData 会被重置，特效消失
    -->
    <div v-if="hasNewData" class="animus-pulse"></div>
  </div>

  <!--
    模式 2: 展开状态 - 变量监控窗口 (可拖拽、可调整大小)
  -->
  <div v-if="uiStore.showUI" class="ac-window" :class="{ 'is-dragging': isDragging }" :style="windowStyle">
    <!-- 顶部装饰条 -->
    <div class="ac-window-border-top"></div>

    <!-- 窗口标题栏 -->
    <div
      class="ac-header"
      @pointerdown="startPointer($event, 'window')"
      @pointermove="movePointer"
      @pointerup="endPointer"
      @pointercancel="endPointer"
    >
      <div class="ac-header-left">
        <span class="ac-icon">✦</span>
        <span class="ac-title">命运分歧</span>
      </div>
      <div class="ac-controls">
        <button title="刷新当前楼层" @click.stop="refreshData">↻</button>
        <button title="收起窗口" @click.stop="toggleUI">−</button>
      </div>
    </div>

    <div class="ac-tabs" role="tablist" aria-label="命运分歧内容">
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'options'"
        :class="{ active: activeTab === 'options' }"
        @click="activeTab = 'options'"
      >
        命运选项 <span v-if="options.length" class="tab-count">{{ options.length }}</span>
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'variables'"
        :class="{ active: activeTab === 'variables' }"
        @click="activeTab = 'variables'"
      >
        变量记录 <span v-if="parsedLogs.length" class="tab-count">{{ parsedLogs.length }}</span>
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'skills'"
        :class="{ active: activeTab === 'skills' }"
        @click="activeTab = 'skills'"
      >
        技能 <span v-if="skills.length" class="tab-count">{{ skills.length }}</span>
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'items'"
        :class="{ active: activeTab === 'items' }"
        @click="activeTab = 'items'"
      >
        道具 <span v-if="items.length" class="tab-count">{{ items.length }}</span>
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'quests'"
        :class="{ active: activeTab === 'quests' }"
        @click="activeTab = 'quests'"
      >
        任务 <span v-if="quests.length" class="tab-count">{{ quests.length }}</span>
      </button>
    </div>

    <!-- 内容区域 -->
    <div class="ac-content">
      <div class="ac-background-grid"></div>

      <template v-if="activeTab === 'options'">
        <div v-if="options.length === 0" class="ac-empty">
          <span>暂无可用选项</span>
          <div class="sub-text">当前楼层没有命运分歧</div>
        </div>
        <div v-else class="ac-options">
          <button
            v-for="(option, index) in options"
            :key="`${index}:${option}`"
            type="button"
            class="ac-option"
            :class="{ selected: selectedOption === index }"
            @click="appendOption(option, index)"
          >
            <span class="option-index">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="option-copy">{{ option }}</span>
            <span class="option-arrow" aria-hidden="true">↗</span>
          </button>
        </div>
        <div v-if="inputError" class="ac-error" role="alert">{{ inputError }}</div>
      </template>

      <template v-else-if="activeTab === 'skills' || activeTab === 'items'">
        <div v-if="(activeTab === 'skills' ? skills : items).length === 0" class="ac-empty">
          <span>暂无{{ activeTab === 'skills' ? '技能' : '随身道具' }}</span>
        </div>
        <div v-else class="ac-options ac-asset-list">
          <OwnedAssetCard
            v-for="[entryName, entry] in activeTab === 'skills' ? skills : items"
            :key="entryName"
            :name="entryName"
            :entry="entry"
            :kind="activeTab === 'skills' ? '技能' : '道具'"
            :expanded="expandedName === entryName"
            @toggle="selectEntry(entryName)"
          >
            <template #actions>
              <label v-if="isItem(entry)" class="ac-use-quantity">
                使用数量 <input v-model.number="useQuantity" type="number" min="1" :max="entry.数量" step="1" />
              </label>
              <button type="button" class="asset-use-button" @click="prepareUse(entryName)">
                使用{{ isItem(entry) ? '道具' : '技能' }}
              </button>
            </template>
          </OwnedAssetCard>
        </div>
        <div v-if="inputError" class="ac-error" role="alert">{{ inputError }}</div>
        <div v-if="inputNotice" class="ac-notice" role="status">{{ inputNotice }}</div>
      </template>

      <template v-else-if="activeTab === 'quests'">
        <div v-if="quests.length === 0" class="ac-empty"><span>暂无已接任务</span></div>
        <div v-else class="ac-options ac-asset-list">
          <QuestCard
            v-for="[questName, task] in quests"
            :key="questName"
            :name="questName"
            :task="task"
            :accepted="true"
          >
            <template v-if="!task.已完成" #actions>
              <button type="button" class="quest-card-action" @click="prepareQuest(questName)">推进任务</button>
            </template>
          </QuestCard>
        </div>
        <div v-if="inputError" class="ac-error" role="alert">{{ inputError }}</div>
        <div v-if="inputNotice" class="ac-notice" role="status">{{ inputNotice }}</div>
      </template>

      <div v-else-if="parsedLogs.length === 0" class="ac-empty">
        <span>暂无变量记录</span>
        <div class="sub-text">当前楼层没有检测到变量变更</div>
      </div>

      <!-- 循环渲染匹配到的正则结果 -->
      <div
        v-for="(log, index) in activeTab === 'variables' ? parsedLogs : []"
        :key="index"
        class="ac-log-entry"
        :class="{ 'is-think': log.type === 'variablethink' }"
      >
        <div class="ac-log-header" :class="log.type">
          <span class="log-index">0x{{ String(index).padStart(4, '0') }}</span>
          <span class="log-action">{{ formatType(log.type) }}</span>
        </div>
        <div class="ac-log-body">
          <div v-if="log.type === 'variablethink'" class="ac-think-text">
            {{ log.data }}
          </div>
          <div v-else class="ac-json-wrapper">
            <JsonNode :value="log.data" :name="''" :is-last="true" :depth="0" :force-open="false" />
          </div>
        </div>
      </div>
    </div>

    <!-- 底部装饰 -->
    <div class="ac-footer">
      <span
        >选项 {{ options.length }} · 变量 {{ parsedLogs.length }} · 技能 {{ skills.length }} · 道具 {{ items.length }} ·
        任务 {{ quests.length }}</span
      >
      <button
        class="resize-handle-icon"
        type="button"
        title="拖拽调整窗口大小"
        aria-label="拖拽调整窗口大小"
        @pointerdown="startPointer($event, 'resize')"
        @pointermove="movePointer"
        @pointerup="endPointer"
        @pointercancel="endPointer"
      >
        ◢
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, h, defineComponent, computed, nextTick, onMounted, onUnmounted, watch, reactive } from 'vue';
import { useUiStore } from '@/变量卷轴/UI/store/UIStore';
import { useMessageStore } from '@/变量卷轴/UI/store/MessageStore';
import { parseVariableLogs, type VariableLog } from '@/Utils/VariableLogParser';
import { parseMessageOptions } from './optionParser';
import type { 技能, 物品, 任务, stat_data } from '@/手机界面/types';
import OwnedAssetCard from '@/手机界面/apps/data/OwnedAssetCard.vue';
import QuestCard from '@/手机界面/apps/quests/QuestCard.vue';
import { buildQuestPrompt, buildUsePrompt } from './usePrompt';

const uiStore = useUiStore();
const messageStore = useMessageStore();

const draggableBtn = ref<HTMLElement | null>(null);
const parsedLogs = ref<VariableLog[]>([]);
const options = computed(() => parseMessageOptions(messageStore.message));
const skills = computed(() => Object.entries(messageStore.statData?.角色?.user?.技能 ?? {}) as [string, 技能][]);
const items = computed(() => Object.entries(messageStore.statData?.角色?.user?.物品 ?? {}) as [string, 物品][]);
const quests = computed(() => Object.entries(messageStore.statData?.任务 ?? {}) as [string, 任务][]);
const activeTab = ref<'options' | 'variables' | 'skills' | 'items' | 'quests'>('options');
const selectedOption = ref<number | null>(null);
const inputError = ref('');
const inputNotice = ref('');
const expandedName = ref('');
const useQuantity = ref(1);
const isItem = (entry: 技能 | 物品): entry is 物品 => '数量' in entry;
const isDragging = ref(false);

// 新增：是否有新数据（控制特效）
const hasNewData = ref(false);

const btnPosition = reactive({ top: 100, left: 100 });
const windowState = reactive({ top: 100, left: 100, width: 460, height: 380 });
let hostWindow: Window | null = null;
let compactViewport = false;
let pointer: {
  kind: 'button' | 'window' | 'resize';
  id: number;
  x: number;
  y: number;
  left: number;
  top: number;
  width: number;
  height: number;
} | null = null;
let didDrag = false;

const btnPositionStyle = computed(() => ({
  top: `${btnPosition.top}px`,
  left: `${btnPosition.left}px`,
}));

const windowStyle = computed(() => ({
  top: `${windowState.top}px`,
  left: `${windowState.left}px`,
  width: `${windowState.width}px`,
  height: `${windowState.height}px`,
}));

const toggleUI = () => {
  if (isDragging.value) return;
  uiStore.showUI = !uiStore.showUI;

  // 逻辑：当打开 UI 时，视为已读，关闭特效
  if (uiStore.showUI) {
    hasNewData.value = false;
  }
};

const handleBtnClick = () => {
  if (didDrag) {
    didDrag = false;
    return;
  }
  toggleUI();
};

const appendOption = (option: string, index: number) => {
  try {
    const input = window.parent.document.querySelector<HTMLTextAreaElement>('#send_textarea');
    if (!input) {
      inputError.value = '未找到酒馆输入框，无法填入选项。';
      return;
    }
    const current = input.value.trim();
    input.value = current ? `${current} ${option}` : option;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
    selectedOption.value = index;
    inputError.value = '';
  } catch (error) {
    console.error('写入选项失败', error);
    inputError.value = '填入选项失败，请检查酒馆输入框。';
  }
};

function selectEntry(name: string) {
  expandedName.value = expandedName.value === name ? '' : name;
  useQuantity.value = 1;
  inputError.value = '';
  inputNotice.value = '';
}

async function prepareDraft(buildPrompt: (data: stat_data | undefined) => string, notice: string) {
  inputError.value = '';
  inputNotice.value = '';
  if (messageStore.messageId !== getLastMessageId()) {
    messageStore.getMessage();
    await nextTick();
    inputError.value = '当前楼层已变化，请重新选择。';
    return;
  }
  try {
    const data = getVariables({ type: 'message', message_id: -1 })?.stat_data as stat_data | undefined;
    const prompt = buildPrompt(data);
    const input = window.parent.document.querySelector<HTMLTextAreaElement>('#send_textarea');
    if (!input) throw new Error('未找到酒馆聊天输入框。');
    input.value += `${input.value && !input.value.endsWith('\n') ? '\n' : ''}${prompt}`;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
    inputNotice.value = notice;
  } catch (error) {
    inputError.value = error instanceof Error ? error.message : '填写聊天输入框失败。';
  }
}

function prepareUse(name: string) {
  void prepareDraft(
    data => buildUsePrompt(data, activeTab.value === 'skills' ? 'skills' : 'items', name, useQuantity.value),
    '使用意图已填入聊天输入框；发送后由剧情处理实际效果。',
  );
}

function prepareQuest(name: string) {
  void prepareDraft(data => buildQuestPrompt(data, name), '任务推进意图已填入聊天输入框；发送后由剧情处理进度。');
}

const formatType = (type: string) => {
  const map: Record<string, string> = {
    variableinsert: '变量新增',
    variableedit: '变量变更',
    variabledelete: '变量删除',
    variablethink: '思考记录',
    jsonpatch: '变量补丁',
  };
  return map[type] || type;
};

const parseMessageContent = () => {
  const results = parseVariableLogs(messageStore.message);
  parsedLogs.value = results;

  if (results.length > 0 && !uiStore.showUI) {
    hasNewData.value = true;
  }
};

const refreshData = () => {
  messageStore.getMessage();
  parseMessageContent();
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function fitToViewport() {
  if (!hostWindow) return;
  const { innerWidth, innerHeight } = hostWindow;
  const compact = innerWidth <= 768;
  if (compact !== compactViewport) {
    compactViewport = compact;
    if (compact) {
      windowState.width = Math.min(320, innerWidth - 24);
      windowState.height = Math.min(340, Math.floor(innerHeight * 0.55));
      windowState.left = 12;
      windowState.top = 12;
    }
  }
  windowState.width = Math.min(windowState.width, innerWidth - 24);
  windowState.height = Math.min(windowState.height, innerHeight - 24);
  windowState.left = clamp(windowState.left, 12, innerWidth - windowState.width - 12);
  windowState.top = clamp(windowState.top, 12, innerHeight - windowState.height - 12);
  btnPosition.left = clamp(btnPosition.left, 0, innerWidth - 48);
  btnPosition.top = clamp(btnPosition.top, 0, innerHeight - 48);
}

function startPointer(event: PointerEvent, kind: 'button' | 'window' | 'resize') {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  if (kind === 'window' && (event.target as Element).closest('button')) return;
  const target = event.currentTarget as HTMLElement;
  hostWindow = target.ownerDocument.defaultView;
  pointer = {
    kind,
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    left: kind === 'button' ? btnPosition.left : windowState.left,
    top: kind === 'button' ? btnPosition.top : windowState.top,
    width: windowState.width,
    height: windowState.height,
  };
  didDrag = false;
  target.setPointerCapture(event.pointerId);
}

function movePointer(event: PointerEvent) {
  if (!pointer || pointer.id !== event.pointerId || !hostWindow) return;
  const dx = event.clientX - pointer.x;
  const dy = event.clientY - pointer.y;
  if (!didDrag && Math.hypot(dx, dy) < 4) return;
  didDrag = true;
  isDragging.value = true;
  if (pointer.kind === 'button') {
    btnPosition.left = clamp(pointer.left + dx, 0, hostWindow.innerWidth - 48);
    btnPosition.top = clamp(pointer.top + dy, 0, hostWindow.innerHeight - 48);
  } else if (pointer.kind === 'window') {
    windowState.left = clamp(pointer.left + dx, 0, hostWindow.innerWidth - windowState.width);
    windowState.top = clamp(pointer.top + dy, 0, hostWindow.innerHeight - windowState.height);
  } else {
    const minWidth = Math.min(280, hostWindow.innerWidth - pointer.left - 12);
    const minHeight = Math.min(200, hostWindow.innerHeight - pointer.top - 12);
    windowState.width = clamp(pointer.width + dx, minWidth, hostWindow.innerWidth - pointer.left - 12);
    windowState.height = clamp(pointer.height + dy, minHeight, hostWindow.innerHeight - pointer.top - 12);
  }
}

function endPointer(event: PointerEvent) {
  if (!pointer || pointer.id !== event.pointerId) return;
  pointer = null;
  isDragging.value = false;
  const target = event.currentTarget as HTMLElement;
  if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
  setTimeout(() => {
    didDrag = false;
  }, 0);
}

// 打开后消除新数据提示。
watch(
  () => uiStore.showUI,
  newVal => {
    if (newVal) {
      hasNewData.value = false;
    }
  },
);

// 监听消息变化
watch([() => messageStore.message, () => messageStore.messageId], () => {
  parseMessageContent();
  selectedOption.value = null;
  inputError.value = '';
});

watch(
  () => messageStore.statData,
  () => {
    expandedName.value = '';
    useQuantity.value = 1;
    inputError.value = '';
    inputNotice.value = '';
  },
);

watch(activeTab, () => {
  expandedName.value = '';
  inputError.value = '';
  inputNotice.value = '';
});

onMounted(() => {
  refreshData();
  hostWindow = draggableBtn.value?.ownerDocument.defaultView ?? window.parent;
  fitToViewport();
  hostWindow.addEventListener('resize', fitToViewport);
});

onUnmounted(() => {
  hostWindow?.removeEventListener('resize', fitToViewport);
});

// ============================================================
// JsonNode 组件 (保持不变)
// ============================================================
const JsonNode = defineComponent({
  name: 'JsonNode',
  props: {
    name: { type: [String, Number], default: '' },
    value: { type: [Object, Array, String, Number, Boolean, null] as any, default: null },
    isLast: { type: Boolean, default: true },
    depth: { type: Number, default: 0 },
    forceOpen: { type: Boolean, default: true },
  },
  setup(props) {
    const isOpen = ref(props.forceOpen);
    const toggle = () => {
      isOpen.value = !isOpen.value;
    };

    const isObject = computed(() => props.value !== null && typeof props.value === 'object');
    const isArray = computed(() => Array.isArray(props.value));

    const valueClass = computed(() => {
      if (props.value === null) return 'jv-null';
      if (typeof props.value === 'string') return 'jv-string';
      if (typeof props.value === 'number') return 'jv-number';
      if (typeof props.value === 'boolean') return 'jv-boolean';
      return '';
    });

    const formattedValue = computed(() => {
      if (props.value === null) return 'NULL';
      if (typeof props.value === 'string') return `"${props.value}"`;
      return String(props.value);
    });

    return () => {
      const { name, value, isLast, depth } = props;
      const indent = { paddingLeft: `${depth * 15}px` };

      if (isObject.value) {
        const keys = Object.keys(value);
        const isEmpty = keys.length === 0;
        const openBracket = isArray.value ? '[' : '{';
        const closeBracket = isArray.value ? ']' : '}';
        const itemCount = keys.length;

        const headerContent = [
          !isEmpty &&
            h(
              'span',
              {
                class: ['jv-toggle', { open: isOpen.value }],
                onClick: (e: Event) => {
                  e.stopPropagation();
                  toggle();
                },
              },
              '▶',
            ),
          name !== '' && h('span', { class: 'jv-key' }, `${name}: `),
          h('span', { class: 'jv-bracket' }, openBracket),
          !isOpen.value && !isEmpty && h('span', { class: 'jv-ellipsis', onClick: toggle }, ` ... `),
          (!isOpen.value || isEmpty) && h('span', { class: 'jv-bracket' }, closeBracket),
          !isLast && (!isOpen.value || isEmpty) && h('span', { class: 'jv-comma' }, ','),
          !isOpen.value && !isEmpty && h('span', { class: 'jv-count' }, ` // ${itemCount}`),
        ];

        const children: any[] = [];
        if (isOpen.value && !isEmpty) {
          keys.forEach((key, index) => {
            children.push(
              h(JsonNode, {
                key: key,
                name: isArray.value ? '' : key,
                value: value[key],
                isLast: index === keys.length - 1,
                depth: depth + 1,
                forceOpen: true,
              }),
            );
          });
          children.push(
            h('div', { class: 'jv-line', style: indent }, [
              h('span', { class: 'jv-bracket' }, closeBracket),
              !isLast && h('span', { class: 'jv-comma' }, ','),
            ]),
          );
        }

        return h('div', { class: 'jv-node' }, [
          h('div', { class: 'jv-line jv-clickable', style: indent, onClick: toggle }, headerContent),
          children,
        ]);
      } else {
        return h('div', { class: 'jv-line', style: indent }, [
          name !== '' && h('span', { class: 'jv-key' }, `${name}: `),
          h('span', { class: valueClass.value }, formattedValue.value),
          !isLast && h('span', { class: 'jv-comma' }, ','),
        ]);
      }
    };
  },
});
</script>

<style scoped>
.ac-toggle-btn,
.ac-window {
  --ac-pink: #f49cc4;
  --ac-pink-dim: #ad6a92;
  --ac-black: #1c1222;
  --ac-text: #f8edf4;
  --ac-blue: #bba5ee;
  --ac-red: #e67d9e;
  --ac-grey: #888;

  --font-title: 'Noto Serif SC', 'Songti SC', serif;
  --font-tech: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
}

/* 悬浮按钮 */
.ac-toggle-btn {
  position: fixed;
  width: 48px;
  height: 48px;
  cursor: pointer;
  z-index: 90001;
  transition: transform 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
}

.ac-toggle-btn:hover {
  transform: scale(1.1);
}
.ac-toggle-btn:active {
  transform: scale(0.95);
}

.option-badge {
  position: absolute;
  top: 0;
  right: -4px;
  display: grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border: 1px solid #ffd1e4;
  border-radius: 999px;
  background: #8d3e69;
  color: #fff4f8;
  font: 700 10px var(--font-tech);
}

/* 当有新数据时，图标本身也添加一点发光呼吸 */
.ac-toggle-btn.has-update .ac-logo-svg {
  filter: drop-shadow(0 0 8px rgba(244, 156, 196, 0.8));
  animation: icon-breathe 2s infinite alternate;
}

@keyframes icon-breathe {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.05);
  }
}

.ac-logo-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 5px rgba(244, 156, 196, 0.5));
  transition: filter 0.3s;
}

.ac-tabs {
  display: flex;
  overflow-x: auto;
  gap: 6px;
  padding: 6px 10px 0;
  border-bottom: 1px solid #9c55758c;
}

.ac-tabs button {
  flex: 0 0 auto;
  padding: 6px 10px;
  border: 1px solid transparent;
  border-radius: 9px 9px 0 0;
  background: transparent;
  color: #c6aabd;
  cursor: pointer;
  font: 600 12px var(--font-tech);
}

.ac-tabs button.active {
  border-color: #9c55758c;
  border-bottom-color: #352037;
  background: #352037;
  color: #ffd1e4;
}

.tab-count {
  margin-left: 4px;
  color: #f49cc4;
  font-size: 10px;
}

.ac-options {
  position: relative;
  display: grid;
  gap: 8px;
}

.ac-asset-list {
  gap: 11px;
}

.ac-option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border: 1px solid #7c4b6b;
  border-radius: 11px;
  background: linear-gradient(105deg, #40233b, #29182c 70%);
  color: #f8edf4;
  cursor: pointer;
  font: 12px/1.5 var(--font-tech);
  text-align: left;
}

.ac-option:hover,
.ac-option.selected {
  border-color: #e987b4;
  background: linear-gradient(105deg, #643052, #382039 70%);
}

.ac-use-quantity {
  color: #e0cfda;
  font-size: 11px;
}

.ac-use-quantity input {
  width: 62px;
  margin-left: 6px;
  padding: 3px 5px;
  border: 1px solid #68405d;
  border-radius: 10px;
  background: #211826;
  color: #f8eef4;
}

.ac-notice {
  position: relative;
  color: #b9ddbb;
  font: 11px/1.5 var(--font-tech);
}

.option-index {
  display: grid;
  flex: none;
  place-items: center;
  width: 25px;
  height: 25px;
  border: 1px solid #dc83ac7a;
  border-radius: 8px;
  color: #ffb6d4;
  font-size: 10px;
  font-weight: 800;
}

.option-copy {
  flex: 1;
  min-width: 0;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.option-arrow {
  color: #de8cb3;
  font-size: 15px;
}
.ac-error {
  position: relative;
  margin-top: 12px;
  color: #ffc3d4;
  font-size: 11px;
}
.ac-toggle-btn:focus-visible,
.ac-tabs button:focus-visible,
.ac-option:focus-visible,
.ac-controls button:focus-visible {
  outline: 2px solid #ffc0da;
  outline-offset: 2px;
}

.animus-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1px solid var(--ac-pink);
  opacity: 0;
  animation: pulse-ring 2s infinite; /* 加快一点频率 */
  pointer-events: none;
}

@keyframes pulse-ring {
  0% {
    width: 60%;
    height: 60%;
    opacity: 0;
    border-width: 3px;
  }
  50% {
    opacity: 0.8;
  }
  100% {
    width: 160%;
    height: 160%;
    opacity: 0;
    border-width: 0px;
  }
}

/* 主窗口 */
.ac-window {
  position: fixed;
  box-sizing: border-box;
  background: rgba(28, 18, 34, 0.97);
  border: 1px solid var(--ac-pink-dim);
  box-shadow:
    0 0 20px rgba(0, 0, 0, 0.8),
    inset 0 0 50px rgba(0, 0, 0, 0.5);
  z-index: 90000;
  display: flex;
  flex-direction: column;
  color: var(--ac-text);
  font-family: var(--font-tech);
  backdrop-filter: blur(5px);
  will-change: top, left, width, height;
  border-radius: 16px;
}

/* 拖拽优化：禁用特效 */
.ac-window.is-dragging {
  backdrop-filter: none;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
  transition: none !important;
  opacity: 0.9;
}

.ac-window-border-top {
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--ac-pink), transparent);
  width: 100%;
}

.ac-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.05), transparent);
  border-bottom: 1px solid rgba(220, 131, 172, 0.3);
  cursor: move;
  user-select: none;
  touch-action: none;
}

.ac-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ac-icon {
  color: var(--ac-pink);
  font-size: 16px;
}
.ac-title {
  font-family: var(--font-title);
  color: var(--ac-pink);
  font-size: 13px;
  letter-spacing: 1px;
  text-shadow: 0 0 5px rgba(244, 156, 196, 0.3);
}

.ac-controls button {
  background: transparent;
  border: 1px solid transparent;
  color: var(--ac-pink-dim);
  cursor: pointer;
  font-family: var(--font-tech);
  font-size: 14px;
  margin-left: 5px;
  padding: 0 8px;
  transition: all 0.2s;
}
.ac-controls button:hover {
  color: var(--ac-pink);
  border-color: var(--ac-pink);
  background: rgba(244, 156, 196, 0.1);
}

.ac-content {
  flex: 1;
  overflow: auto;
  padding: 11px;
  position: relative;
  scrollbar-width: thin;
  scrollbar-color: var(--ac-pink-dim) #211427;
}

.ac-background-grid {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    linear-gradient(rgba(220, 131, 172, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(220, 131, 172, 0.05) 1px, transparent 1px);
  background-size: 20px 20px;
  pointer-events: none;
  z-index: 0;
}

.ac-empty {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--ac-pink-dim);
  font-family: var(--font-title);
}

.sub-text {
  font-family: var(--font-tech);
  font-size: 0.9em;
  margin-top: 10px;
  opacity: 0.7;
}

.ac-log-entry {
  position: relative;
  z-index: 1;
  margin-bottom: 12px;
  border-left: 2px solid var(--ac-pink-dim);
  background: rgba(64, 35, 59, 0.62);
  transition: border-color 0.3s;
}

.ac-log-entry:hover {
  border-left-color: var(--ac-pink);
  background: rgba(255, 255, 255, 0.02);
}

.ac-log-entry.is-think {
  border-left-color: var(--ac-grey);
  background: rgba(48, 32, 57, 0.7);
}

.ac-log-header {
  display: flex;
  justify-content: space-between;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: bold;
  background: rgba(220, 131, 172, 0.1);
  border-bottom: 1px solid rgba(220, 131, 172, 0.1);
}

.ac-log-header.variableinsert {
  color: #b9ddbb;
}
.ac-log-header.variableedit {
  color: var(--ac-blue);
}
.ac-log-header.variabledelete {
  color: var(--ac-red);
}
.ac-log-header.variablethink {
  color: var(--ac-grey);
  font-style: italic;
}

.log-index {
  font-family: var(--font-tech);
  opacity: 0.7;
}
.log-action {
  font-family: var(--font-title);
  letter-spacing: 1px;
}

.ac-log-body {
  padding: 8px;
  font-size: 12px;
  overflow-x: auto;
}

.ac-think-text {
  font-family: 'Courier New', Courier, monospace;
  color: #d5b8ca;
  white-space: pre-wrap;
  line-height: 1.4;
  font-size: 11px;
}

.ac-footer {
  padding: 4px 10px;
  font-size: 9px;
  color: #c6aabd;
  border-top: 1px solid #9c55758c;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #211427;
  user-select: none;
}

.ac-footer > span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.resize-handle-icon {
  color: var(--ac-pink-dim);
  cursor: nwse-resize;
  font-size: 13px;
  border: 0;
  background: transparent;
  min-width: 24px;
  min-height: 24px;
  touch-action: none;
}

/* JSON Tree 样式覆盖 */
:deep(.jv-node) {
  position: relative;
  font-family: 'Consolas', monospace;
}
:deep(.jv-line) {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  white-space: pre-wrap;
}
:deep(.jv-clickable) {
  cursor: pointer;
}
:deep(.jv-clickable:hover) {
  background-color: rgba(244, 156, 196, 0.1);
}
:deep(.jv-toggle) {
  display: inline-block;
  width: 16px;
  text-align: center;
  margin-right: 4px;
  color: var(--ac-pink);
  transition: transform 0.2s;
}
:deep(.jv-toggle.open) {
  transform: rotate(90deg);
}
:deep(.jv-key) {
  color: var(--ac-blue);
}
:deep(.jv-string) {
  color: #ffc6ae;
}
:deep(.jv-number) {
  color: #b9ddbb;
}
:deep(.jv-boolean) {
  color: #bba5ee;
}
:deep(.jv-null) {
  color: var(--ac-red);
}
:deep(.jv-bracket),
:deep(.jv-comma) {
  color: #a88ca2;
}
:deep(.jv-ellipsis) {
  background: #44213d;
  padding: 0 4px;
  border-radius: 2px;
  color: #d5b8ca;
}
:deep(.jv-count) {
  color: #a88ca2;
  font-style: italic;
  margin-left: 8px;
}
</style>
