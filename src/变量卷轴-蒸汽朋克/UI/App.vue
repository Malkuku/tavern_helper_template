<template>
  <div
    v-if="!uiStore.showUI"
    ref="draggableBtn"
    class="ac-toggle-btn"
    :class="{ 'has-update': hasNewData }"
    :style="btnPositionStyle"
    title="启动差分机序列"
    @click="handleBtnClick"
  >
    <!-- 蒸汽朋克风格：齿轮 SVG 图标 -->
    <svg viewBox="0 0 100 100" class="ac-logo-svg" :class="{ 'is-spinning': hasNewData }">
      <defs>
        <linearGradient id="brassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#e5c07b;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#c5a059;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#8a6d3b;stop-opacity:1" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- 核心：机械齿轮 -->
      <g transform="translate(50, 50)" filter="url(#glow)">
        <!-- 外部齿轮轮廓 (8齿) -->
        <path d="M -8 -38 L -4 -46 L 4 -46 L 8 -38
                 A 38 38 0 0 1 23 -30 L 32 -33 L 38 -27 L 30 -23
                 A 38 38 0 0 1 38 -8 L 46 -4 L 46 4 L 38 8
                 A 38 38 0 0 1 30 23 L 33 32 L 27 38 L 23 30
                 A 38 38 0 0 1 8 38 L 4 46 L -4 46 L -8 38
                 A 38 38 0 0 1 -23 30 L -32 33 L -38 27 L -30 23
                 A 38 38 0 0 1 -38 8 L -46 4 L -46 -4 L -38 -8
                 A 38 38 0 0 1 -30 -23 L -33 -32 L -27 -38 L -23 -30
                 A 38 38 0 0 1 -8 -38 Z"
              fill="none" stroke="url(#brassGradient)" stroke-width="2.5" stroke-linejoin="round" />

        <!-- 内圈轨道 -->
        <circle cx="0" cy="0" r="26" fill="none" stroke="url(#brassGradient)" stroke-width="1.5" stroke-dasharray="4 4" />

        <!-- 轴心 -->
        <circle cx="0" cy="0" r="8" fill="none" stroke="url(#brassGradient)" stroke-width="2" />
        <circle cx="0" cy="0" r="3" fill="url(#brassGradient)" />

        <!-- 主十字辐条 -->
        <line x1="0" y1="-8" x2="0" y2="-26" stroke="url(#brassGradient)" stroke-width="2" />
        <line x1="0" y1="8" x2="0" y2="26" stroke="url(#brassGradient)" stroke-width="2" />
        <line x1="-8" y1="0" x2="-26" y2="0" stroke="url(#brassGradient)" stroke-width="2" />
        <line x1="8" y1="0" x2="26" y2="0" stroke="url(#brassGradient)" stroke-width="2" />

        <!-- 装饰性斜辐条 -->
        <line x1="-6" y1="-6" x2="-18" y2="-18" stroke="url(#brassGradient)" stroke-width="1" opacity="0.6" />
        <line x1="6" y1="6" x2="18" y2="18" stroke="url(#brassGradient)" stroke-width="1" opacity="0.6" />
        <line x1="-6" y1="6" x2="-18" y2="18" stroke="url(#brassGradient)" stroke-width="1" opacity="0.6" />
        <line x1="6" y1="-6" x2="18" y2="-18" stroke="url(#brassGradient)" stroke-width="1" opacity="0.6" />
      </g>
    </svg>

    <!--
      特效层：仅当 hasNewData 为 true 时显示
      展开后 hasNewData 会被重置，特效消失
    -->
    <div v-if="hasNewData" class="animus-pulse"></div>
  </div>

  <!--
    模式 2: 展开状态 - 变量监控窗口 (可拖拽、可调整大小)
  -->
  <div
    v-if="uiStore.showUI"
    ref="draggableWindow"
    class="ac-window"
    :class="{ 'is-dragging': isDragging }"
    :style="windowStyle"
  >
    <!-- 顶部装饰条 (复古警示纹理) -->
    <div class="ac-window-border-top"></div>

    <!-- 窗口标题栏 -->
    <div class="ac-header">
      <div class="ac-header-left">
        <span class="ac-icon">⚙</span>
        <span class="ac-title">差分机 // 变量观测仪</span>
      </div>
      <div class="ac-controls">
        <button @click.stop="refreshData" title="重新校准">↻</button>
        <button @click.stop="toggleUI" title="收起">_</button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="ac-content">
      <div class="ac-background-grid"></div>

      <div v-if="parsedLogs.length === 0" class="ac-empty">
        <span class="blink">正在检索齿轮矩阵...</span>
        <div class="sub-text">未检测到灵质波动。</div>
      </div>

      <!-- 循环渲染匹配到的正则结果 -->
      <div v-for="(log, index) in parsedLogs" :key="index" class="ac-log-entry" :class="{ 'is-think': log.type === 'variablethink' }">
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
      <span>核心稳定 // 记忆齿轮: {{ parsedLogs.length }} 组</span>
      <span class="resize-handle-icon">◢</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, h, defineComponent, computed, onMounted, watch, nextTick, reactive } from 'vue';
import { useUiStore } from '@/变量卷轴-蒸汽朋克/UI/store/UIStore';
import { useMessageStore } from '@/变量卷轴-蒸汽朋克/UI/store/MessageStore';
import { parseVariableLogs, type VariableLog } from '@/Utils/VariableLogParser';


const uiStore = useUiStore();
const messageStore = useMessageStore();

const draggableBtn = ref<HTMLElement | null>(null);
const draggableWindow = ref<HTMLElement | null>(null);
const parsedLogs = ref<VariableLog[]>([]);
const isDragging = ref(false);

// 新增：是否有新数据（控制特效）
const hasNewData = ref(false);

const btnPosition = reactive({ top: 100, left: 100 });
const windowState = reactive({ top: 100, left: 100, width: 600, height: 500 });

const btnPositionStyle = computed(() => ({
  top: `${btnPosition.top}px`,
  left: `${btnPosition.left}px`
}));

const windowStyle = computed(() => ({
  top: `${windowState.top}px`,
  left: `${windowState.left}px`,
  width: `${windowState.width}px`,
  height: `${windowState.height}px`
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
  if (!isDragging.value) {
    toggleUI();
  }
};

const formatType = (type: string) => {
  const map: Record<string, string> = {
    'variableinsert': '注入',
    'variableedit': '覆写',
    'variabledelete': '销毁',
    'variablethink': '>> 逻辑推演'
  };
  return map[type] || type.toUpperCase();
};

const parseMessageContent = () => {
  const results = parseVariableLogs(messageStore.message, { includeUpdateVariable: true });
  parsedLogs.value = results;

  if (results.length > 0 && !uiStore.showUI) {
    hasNewData.value = true;
  }
};

const refreshData = () => {
  messageStore.getMessage();
  parseMessageContent();
};

const initDraggable = () => {
  if (draggableBtn.value) {
    const $btn = $(draggableBtn.value);
    if ($btn.data('ui-draggable')) $btn.draggable('destroy');

    $btn.draggable({
      containment: 'window',
      scroll: false,
      start: () => { isDragging.value = true; },
      stop: (event, ui) => {
        btnPosition.top = ui.position.top;
        btnPosition.left = ui.position.left;
        setTimeout(() => { isDragging.value = false; }, 100);
      }
    });
  }

  if (draggableWindow.value) {
    const $win = $(draggableWindow.value);
    if ($win.data('ui-draggable')) $win.draggable('destroy');
    if ($win.data('ui-resizable')) $win.resizable('destroy');

    $win.draggable({
      handle: '.ac-header',
      containment: 'window',
      scroll: false,
      start: () => { isDragging.value = true; },
      stop: (event, ui) => {
        isDragging.value = false;
        windowState.top = ui.position.top;
        windowState.left = ui.position.left;
      }
    });

    $win.resizable({
      minHeight: 300,
      minWidth: 400,
      handles: 'all',
      start: () => { isDragging.value = true; },
      stop: (event, ui) => {
        isDragging.value = false;
        windowState.width = ui.size.width;
        windowState.height = ui.size.height;
        windowState.top = ui.position.top;
        windowState.left = ui.position.left;
      }
    });
  }
};

watch(() => uiStore.showUI, (newVal) => {
  if (newVal) {
    hasNewData.value = false;
  }
  nextTick(() => {
    initDraggable();
  });
});

watch(() => messageStore.message, () => {
  parseMessageContent();
});

onMounted(() => {
  refreshData();
  nextTick(() => {
    initDraggable();
  });
});

// ============================================================
// JsonNode 组件
// ============================================================
const JsonNode = defineComponent({
  name: 'JsonNode',
  props: {
    name: { type: [String, Number], default: '' },
    value: { type: [Object, Array, String, Number, Boolean, null] as any, default: null },
    isLast: { type: Boolean, default: true },
    depth: { type: Number, default: 0 },
    forceOpen: { type: Boolean, default: true }
  },
  setup(props) {
    const isOpen = ref(props.forceOpen);
    const toggle = () => { isOpen.value = !isOpen.value; };

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
          !isEmpty && h('span', {
            class: ['jv-toggle', { open: isOpen.value }],
            onClick: (e: Event) => { e.stopPropagation(); toggle(); }
          }, '▶'),
          name !== '' && h('span', { class: 'jv-key' }, `${name}: `),
          h('span', { class: 'jv-bracket' }, openBracket),
          !isOpen.value && !isEmpty && h('span', { class: 'jv-ellipsis', onClick: toggle }, ` ... `),
          (!isOpen.value || isEmpty) && h('span', { class: 'jv-bracket' }, closeBracket),
          (!isLast && (!isOpen.value || isEmpty)) && h('span', { class: 'jv-comma' }, ','),
          !isOpen.value && !isEmpty && h('span', { class: 'jv-count' }, ` // ${itemCount}`)
        ];

        const children: any[] = [];
        if (isOpen.value && !isEmpty) {
          keys.forEach((key, index) => {
            children.push(h(JsonNode, {
              key: key,
              name: isArray.value ? '' : key,
              value: value[key],
              isLast: index === keys.length - 1,
              depth: depth + 1,
              forceOpen: true
            }));
          });
          children.push(h('div', { class: 'jv-line', style: indent }, [
            h('span', { class: 'jv-bracket' }, closeBracket),
            !isLast && h('span', { class: 'jv-comma' }, ',')
          ]));
        }

        return h('div', { class: 'jv-node' }, [
          h('div', { class: 'jv-line jv-clickable', style: indent, onClick: toggle }, headerContent),
          children
        ]);
      } else {
        return h('div', { class: 'jv-line', style: indent }, [
          name !== '' && h('span', { class: 'jv-key' }, `${name}: `),
          h('span', { class: valueClass.value }, formattedValue.value),
          !isLast && h('span', { class: 'jv-comma' }, ',')
        ]);
      }
    };
  }
});
</script>

<style scoped>
/* 引入维多利亚古典字体与打字机机械字体 */
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap');

.ac-toggle-btn, .ac-window {
  /* 蒸汽朋克色板 */
  --ac-gold: #c5a059;       /* 黄铜色 */
  --ac-gold-dim: #8a6d3b;   /* 暗黄铜 */
  --ac-black: #1a1511;      /* 深褐色/皮革黑 */
  --ac-text: #e8dcc7;       /* 羊皮纸白 */
  --ac-blue: #5c9ebf;       /* 蒸汽蓝 */
  --ac-red: #a73a3a;        /* 铁锈红 */
  --ac-grey: #7f8c8d;       /* 生铁灰 */

  --font-title: 'Cinzel', serif;
  --font-tech: 'Courier Prime', monospace;
}

/* 悬浮按钮 */
.ac-toggle-btn {
  position: fixed;
  width: 64px;
  height: 64px;
  cursor: pointer;
  z-index: 90001;
  transition: transform 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ac-toggle-btn:hover { transform: scale(1.1); }
.ac-toggle-btn:active { transform: scale(0.95); }

/* 齿轮 SVG 样式与旋转动画 */
.ac-logo-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 5px rgba(197, 160, 89, 0.5));
  transition: filter 0.3s;
}

.ac-logo-svg.is-spinning {
  animation: spin-gear 4s linear infinite;
  filter: drop-shadow(0 0 10px rgba(197, 160, 89, 0.8));
}

@keyframes spin-gear {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 蒸汽扩散脉冲特效 */
.animus-pulse {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 100%; height: 100%;
  border-radius: 50%;
  border: 1px dashed var(--ac-gold);
  opacity: 0;
  animation: steam-pulse 3s infinite linear;
  pointer-events: none;
}

@keyframes steam-pulse {
  0% { width: 60%; height: 60%; opacity: 0; transform: translate(-50%, -50%) rotate(0deg); }
  50% { opacity: 0.6; }
  100% { width: 180%; height: 180%; opacity: 0; transform: translate(-50%, -50%) rotate(90deg); }
}

/* 主窗口 */
.ac-window {
  position: fixed;
  background: rgba(26, 21, 17, 0.95);
  border: 2px solid var(--ac-gold-dim);
  border-radius: 4px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.9), inset 0 0 30px rgba(0, 0, 0, 0.7);
  z-index: 90000;
  display: flex;
  flex-direction: column;
  color: var(--ac-text);
  font-family: var(--font-tech);
  backdrop-filter: blur(5px);
  will-change: top, left, width, height;
}

.ac-window.is-dragging {
  backdrop-filter: none;
  box-shadow: 0 0 10px rgba(0,0,0,0.8);
  transition: none !important;
  opacity: 0.9;
}

/* 顶部复古警示条纹 */
.ac-window-border-top {
  height: 4px;
  background: repeating-linear-gradient(
    45deg,
    var(--ac-gold-dim),
    var(--ac-gold-dim) 10px,
    var(--ac-black) 10px,
    var(--ac-black) 20px
  );
  width: 100%;
  border-bottom: 1px solid var(--ac-gold);
}

.ac-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 15px;
  background: linear-gradient(to bottom, rgba(197, 160, 89, 0.15), transparent);
  border-bottom: 2px double var(--ac-gold-dim);
  cursor: move;
  user-select: none;
}

.ac-header-left { display: flex; align-items: center; gap: 10px; }
.ac-icon { color: var(--ac-gold); font-size: 18px; }
.ac-title {
  font-family: var(--font-title);
  color: var(--ac-gold);
  font-size: 15px;
  font-weight: bold;
  letter-spacing: 1px;
  text-shadow: 0 0 5px rgba(197, 160, 89, 0.3);
}

.ac-controls button {
  background: transparent;
  border: 1px solid transparent;
  color: var(--ac-gold-dim);
  cursor: pointer;
  font-family: var(--font-tech);
  font-size: 16px;
  font-weight: bold;
  margin-left: 5px;
  padding: 0 8px;
  transition: all 0.2s;
}
.ac-controls button:hover {
  color: var(--ac-gold);
  border-color: var(--ac-gold);
  background: rgba(197, 160, 89, 0.1);
}

.ac-content {
  flex: 1;
  overflow: auto;
  padding: 15px;
  position: relative;
  scrollbar-width: thin;
  scrollbar-color: var(--ac-gold-dim) var(--ac-black);
}

/* 复古点阵/羊皮纸纹理感 */
.ac-background-grid {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: radial-gradient(rgba(197, 160, 89, 0.1) 1px, transparent 1px);
  background-size: 15px 15px;
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
  color: var(--ac-gold-dim);
  font-family: var(--font-title);
}

.blink { animation: blinker 2s linear infinite; font-size: 1.2em; font-weight: bold; }
@keyframes blinker { 50% { opacity: 0.4; } }
.sub-text { font-family: var(--font-tech); font-size: 0.9em; margin-top: 10px; opacity: 0.7; }

.ac-log-entry {
  position: relative;
  z-index: 1;
  margin-bottom: 12px;
  border-left: 3px solid var(--ac-gold-dim);
  background: rgba(0, 0, 0, 0.4);
  transition: border-color 0.3s;
}

.ac-log-entry:hover {
  border-left-color: var(--ac-gold);
  background: rgba(197, 160, 89, 0.05);
}

.ac-log-entry.is-think {
  border-left-color: var(--ac-grey);
  background: rgba(0, 0, 0, 0.2);
}

.ac-log-header {
  display: flex;
  justify-content: space-between;
  padding: 4px 10px;
  font-size: 13px;
  font-weight: bold;
  background: rgba(197, 160, 89, 0.1);
  border-bottom: 1px solid rgba(197, 160, 89, 0.2);
}

.ac-log-header.variableinsert { color: #8abeb7; } /* 氧化铜绿 */
.ac-log-header.variableedit { color: var(--ac-blue); }
.ac-log-header.variabledelete { color: var(--ac-red); }
.ac-log-header.variablethink { color: var(--ac-grey); font-style: italic; }

.log-index { font-family: var(--font-tech); opacity: 0.7; }
.log-action { font-family: var(--font-title); letter-spacing: 1px; }

.ac-log-body {
  padding: 10px;
  font-size: 14px;
  overflow-x: auto;
}

.ac-think-text {
  font-family: var(--font-tech);
  color: #a09f9d;
  white-space: pre-wrap;
  line-height: 1.5;
  font-size: 13px;
}

.ac-footer {
  padding: 4px 10px;
  font-size: 11px;
  color: #888;
  border-top: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #110e0b;
  user-select: none;
}

.resize-handle-icon {
  color: var(--ac-gold-dim);
  cursor: se-resize;
  font-size: 10px;
}

/* JSON Tree 蒸汽朋克配色覆盖 */
:deep(.jv-node) { position: relative; font-family: var(--font-tech); }
:deep(.jv-line) { display: flex; align-items: flex-start; flex-wrap: wrap; white-space: pre-wrap; }
:deep(.jv-clickable) { cursor: pointer; }
:deep(.jv-clickable:hover) { background-color: rgba(197, 160, 89, 0.1); }
:deep(.jv-toggle) { display: inline-block; width: 16px; text-align: center; margin-right: 4px; color: var(--ac-gold); transition: transform 0.2s; }
:deep(.jv-toggle.open) { transform: rotate(90deg); }
:deep(.jv-key) { color: var(--ac-blue); }
:deep(.jv-string) { color: #d2a878; } /* 褪色墨水/牛皮纸色 */
:deep(.jv-number) { color: #8abeb7; } /* 氧化铜绿 */
:deep(.jv-boolean) { color: #5c9ebf; } /* 蒸汽蓝 */
:deep(.jv-null) { color: var(--ac-red); } /* 铁锈红 */
:deep(.jv-bracket), :deep(.jv-comma) { color: #7f8c8d; }
:deep(.jv-ellipsis) { background: #333; padding: 0 4px; border-radius: 2px; color: #aaa; }
:deep(.jv-count) { color: #666; font-style: italic; margin-left: 8px; }
</style>
