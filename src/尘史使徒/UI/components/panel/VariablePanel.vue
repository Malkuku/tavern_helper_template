<!-- src/尘史使徒/UI/components/panel/VariablePanel.vue -->
<template>
  <transition name="slide-down-edit">
    <div class="edit-panel variable-panel">
      <div class="edit-header">
        <span>变量监控</span>
        <button class="close-edit" @click="$emit('close')">×</button>
      </div>

      <div class="edit-body ac-content">
        <div v-if="parsedLogs.length === 0" class="ac-empty">
          <span class="blink">SEARCHING MEMORY BLOCKS...</span>
          <div class="sub-text">No variable modifications detected.</div>
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
    </div>
  </transition>
</template>

<script setup lang="ts">
import { useMessageStore } from '@/尘史使徒/UI/store/MessageStore'; // 注意路径根据实际情况调整
import { parseVariableLogs, type VariableLog } from '@/Utils/VariableLogParser';
import { computed, defineComponent, h, onMounted, ref, watch } from 'vue';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const messageStore = useMessageStore();
const parsedLogs = ref<VariableLog[]>([]);

const formatType = (type: string) => {
  const map: Record<string, string> = {
    'variableinsert': 'ALLOCATE',
    'variableedit': 'OVERWRITE',
    'variabledelete': 'DEALLOCATE',
    'variablethink': '>> SYNAPTIC PROCESS'
  };
  return map[type] || type.toUpperCase();
};

const parseMessageContent = () => {
  const results = parseVariableLogs(messageStore.message);
  parsedLogs.value = results;
};

onMounted(() => {
  parseMessageContent();
});

watch(() => messageStore.message, () => {
  parseMessageContent();
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
/* 继承 EditPanel 的基础布局 */
.edit-panel {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 80%; height: 80%; background: rgba(20, 22, 28, 0.95);
  border: 1px solid var(--c-gold); border-radius: 4px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.5); z-index: 15;
  backdrop-filter: blur(10px); display: flex; flex-direction: column;
}
.edit-header {
  padding: 8px 15px; background: rgba(164, 139, 87, 0.1);
  border-bottom: 1px solid rgba(164, 139, 87, 0.3);
  display: flex; justify-content: space-between; align-items: center;
  color: var(--c-gold); font-family: 'Cinzel', serif; font-size: 0.9rem; flex-shrink: 0;
}
.close-edit { background: none; border: none; color: var(--c-text-dim); cursor: pointer; font-size: 1.2rem; }
.edit-body { flex: 1; padding: 15px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--c-gold) transparent; }

/* 变量监控专属样式 */
.ac-empty { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: rgba(164, 139, 87, 0.7); font-family: 'Cinzel', serif; }
.blink { animation: blinker 2s linear infinite; font-size: 1.2em; }
@keyframes blinker { 50% { opacity: 0.3; } }
.sub-text { font-family: monospace; font-size: 0.9em; margin-top: 10px; opacity: 0.7; }

.ac-log-entry {
  margin-bottom: 12px; border-left: 2px solid rgba(164, 139, 87, 0.5);
  background: rgba(0, 0, 0, 0.4); transition: border-color 0.3s;
}
.ac-log-entry:hover { border-left-color: var(--c-gold); background: rgba(255, 255, 255, 0.02); }
.ac-log-entry.is-think { border-left-color: #888; background: rgba(0, 0, 0, 0.2); }

.ac-log-header {
  display: flex; justify-content: space-between; padding: 4px 10px; font-size: 12px; font-weight: bold;
  background: rgba(164, 139, 87, 0.1); border-bottom: 1px solid rgba(164, 139, 87, 0.1);
}
.ac-log-header.variableinsert { color: #4caf50; }
.ac-log-header.variableedit { color: #00a8e8; }
.ac-log-header.variabledelete { color: #b91c1c; }
.ac-log-header.variablethink { color: #888; font-style: italic; }

.log-index { font-family: monospace; opacity: 0.7; }
.log-action { font-family: 'Cinzel', serif; letter-spacing: 1px; }
.ac-log-body { padding: 10px; font-size: 13px; overflow-x: auto; }
.ac-think-text { font-family: 'Courier New', Courier, monospace; color: #aaa; white-space: pre-wrap; line-height: 1.4; font-size: 12px; }

/* JSON Tree 样式 */
:deep(.jv-node) { position: relative; font-family: 'Consolas', monospace; }
:deep(.jv-line) { display: flex; align-items: flex-start; flex-wrap: wrap; white-space: pre-wrap; }
:deep(.jv-clickable) { cursor: pointer; }
:deep(.jv-clickable:hover) { background-color: rgba(212, 175, 55, 0.1); }
:deep(.jv-toggle) { display: inline-block; width: 16px; text-align: center; margin-right: 4px; color: var(--c-gold); transition: transform 0.2s; }
:deep(.jv-toggle.open) { transform: rotate(90deg); }
:deep(.jv-key) { color: #00a8e8; }
:deep(.jv-string) { color: #ce9178; }
:deep(.jv-number) { color: #b5cea8; }
:deep(.jv-boolean) { color: #569cd6; }
:deep(.jv-null) { color: #b91c1c; }
:deep(.jv-bracket), :deep(.jv-comma) { color: #666; }
:deep(.jv-ellipsis) { background: #333; padding: 0 4px; border-radius: 2px; color: #aaa; }
:deep(.jv-count) { color: #555; font-style: italic; margin-left: 8px; }

/* 动画与移动端适配 */
.slide-down-edit-enter-active, .slide-down-edit-leave-active { transition: all 0.3s ease; }
.slide-down-edit-enter-from, .slide-down-edit-leave-to { opacity: 0; transform: translate(-50%, -55%); }

@media (max-width: 1000px) {
  .edit-panel {
    top: 0; left: 0; transform: none; width: 100%; height: 100dvh;
    border-radius: 0; border: none;
  }
  .slide-down-edit-enter-from, .slide-down-edit-leave-to { opacity: 0; transform: translateY(-10px); }
}
</style>
