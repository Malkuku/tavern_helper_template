<template>
  <section class="collection-board">
    <header>
      <div>
        <p>{{ eyebrow }}</p>
        <h3>{{ title }}</h3>
      </div>
      <button type="button" @click="adding = true">＋ 新增{{ itemLabel }}</button>
    </header>
    <div class="card-grid">
      <article
        v-for="(value, key, index) in modelValue"
        :key="key"
        class="entry-card"
        :class="{ active: activeKey === key }"
        @click="open(String(key))"
      >
        <div class="entry-summary">
          <span>{{ icon }}</span>
          <div>
            <strong>{{ key }}</strong
            ><small>{{ summary(value) }}</small>
          </div>
          <button type="button" @click.stop="open(String(key))">{{ activeKey === key ? '收起' : '编辑' }}</button>
        </div>
        <div v-if="activeKey === key" class="inline-editor" @click.stop>
          <label v-for="field in fields" :key="field.key"
            ><span>{{ field.label }}</span>
            <input
              v-if="field.type === 'number'"
              :value="activeRecord[field.key]"
              type="number"
              @input="setField(field.key, Number(($event.target as HTMLInputElement).value))"
            />
            <textarea
              v-else
              :value="displayValue(activeRecord[field.key])"
              rows="3"
              @input="setTextField(field.key, ($event.target as HTMLTextAreaElement).value)"
            />
          </label>
          <div class="entry-actions">
            <button type="button" class="danger" @click="remove">删除{{ itemLabel }}</button>
            <span>
              <button type="button" :disabled="index === 0" @click="move(String(key), -1)">上移</button>
              <button
                type="button"
                :disabled="index === Object.keys(modelValue).length - 1"
                @click="move(String(key), 1)"
              >
                下移
              </button>
              <button type="button" @click="copy(String(key))">复制</button>
              <button type="button" @click="close">完成</button>
            </span>
          </div>
        </div>
      </article>
      <button v-if="!Object.keys(modelValue).length" type="button" class="empty-card" @click="adding = true">
        尚无{{ itemLabel }}，点击创建
      </button>
    </div>
    <div v-if="adding" class="create-row">
      <label
        >{{ itemLabel }}名称<input
          v-model.trim="newKey"
          :list="options.length ? listId : undefined"
          @keydown.enter.prevent="add" /></label
      ><datalist v-if="options.length" :id="listId">
        <option v-for="option in options" :key="option" :value="option" />
      </datalist>
      <p v-if="newKey && newKey in modelValue" class="warning">该名称已经存在。</p>
      <div>
        <button type="button" @click="close">取消</button
        ><button type="button" class="primary" :disabled="!newKey || newKey in modelValue" @click="add">创建</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
type Kind = '术' | '语料';
const props = withDefaults(defineProps<{ modelValue?: Record<string, any>; kind: Kind; options?: string[] }>(), {
  modelValue: () => ({}),
  options: () => [],
});
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, any>] }>();
const activeKey = ref(''),
  adding = ref(false),
  newKey = ref(''),
  listId = `role-entry-${Math.random().toString(36).slice(2)}`;
const configs = {
  术: {
    icon: '◇',
    fields: [
      ['等级', '等级', 'number'],
      ['经验', '经验', 'number'],
    ],
    create: () => ({ 等级: 0, 经验: 0 }),
  },
  语料: { icon: '“', fields: [['内容', '语句']], create: () => ({ 内容: [] }) },
} as const;
const config = computed(() => configs[props.kind]);
const title = computed(() => (props.kind === '术' ? '术之等级' : '角色语料'));
const eyebrow = computed(() => ({ 术: 'ARTS', 语料: 'VOICE' })[props.kind]);
const itemLabel = computed(() => (props.kind === '术' ? '性相' : '语料场景'));
const icon = computed(() => config.value.icon);
const fields = computed(() =>
  config.value.fields.map(([key, label, type]) => ({ key, label, type, options: undefined })),
);
const activeValue = computed(() => props.modelValue[activeKey.value]);
const activeRecord = computed(() =>
  Array.isArray(activeValue.value) ? { 内容: activeValue.value } : activeValue.value,
);
function summary(value: any) {
  if (Array.isArray(value)) return value.slice(0, 2).join(' · ') || '暂无内容';
  if (typeof value !== 'object' || value === null) return String(value ?? '暂无内容');
  return String(
    value.描述 ||
      value.情感羁绊 ||
      value.作用 ||
      value.认知了解 ||
      value.类型 ||
      Object.values(value).find(v => v !== '' && v !== 0) ||
      '暂无内容',
  ).slice(0, 54);
}
function open(key: string) {
  activeKey.value = activeKey.value === key ? '' : key;
}
function close() {
  activeKey.value = '';
  adding.value = false;
  newKey.value = '';
}
function add() {
  if (!newKey.value || newKey.value in props.modelValue) return;
  emit('update:modelValue', { ...props.modelValue, [newKey.value]: config.value.create() });
  activeKey.value = newKey.value;
  adding.value = false;
  newKey.value = '';
}
function remove() {
  const next = { ...props.modelValue };
  delete next[activeKey.value];
  emit('update:modelValue', next);
  close();
}
function copy(key: string) {
  let nextKey = `${key}副本`,
    index = 2;
  while (nextKey in props.modelValue) nextKey = `${key}副本${index++}`;
  emit('update:modelValue', { ...props.modelValue, [nextKey]: structuredClone(props.modelValue[key]) });
  activeKey.value = nextKey;
}
function move(key: string, delta: number) {
  const rows = Object.entries(props.modelValue),
    index = rows.findIndex(([name]) => name === key),
    target = index + delta;
  if (target < 0 || target >= rows.length) return;
  [rows[index], rows[target]] = [rows[target], rows[index]];
  emit('update:modelValue', Object.fromEntries(rows));
}
function updateActive(value: any) {
  emit('update:modelValue', { ...props.modelValue, [activeKey.value]: value });
}
function setField(key: string, value: any) {
  if (Array.isArray(activeValue.value) && key === '内容') updateActive(value);
  else updateActive({ ...activeValue.value, [key]: value });
}
function displayValue(value: any) {
  return Array.isArray(value) ? value.join('\n') : String(value ?? '');
}
function setTextField(key: string, value: string) {
  setField(
    key,
    Array.isArray(activeRecord.value[key])
      ? value
          .split('\n')
          .map(v => v.trim())
          .filter(Boolean)
      : value,
  );
}
</script>

<style scoped>
.collection-board {
  display: grid;
  gap: 12px;
  min-width: 0;
}
.collection-board > header {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
}
.collection-board > header > div,
.card-grid,
.create-row {
  min-width: 0;
  max-width: 100%;
}
.collection-board h3,
.collection-board p {
  margin: 0;
}
.collection-board p {
  color: #cbb477;
  font-size: 10px;
  letter-spacing: 0.18em;
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
  gap: 10px;
}
.entry-card {
  display: grid;
  min-width: 0;
  max-width: 100%;
  min-height: 90px;
  padding: 0;
  overflow: hidden;
  background: linear-gradient(145deg, #202426, #141719);
  border: 1px solid #393d3f;
  transition:
    border-color 0.18s ease,
    background 0.18s ease;
}
.entry-card.active {
  grid-column: 1 / -1;
  border-color: #82704b;
  background: linear-gradient(145deg, #24251f, #151719);
}
.entry-summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 88px;
  padding: 14px 16px;
  cursor: pointer;
}
.entry-summary > span {
  color: #cbb477;
  font-size: 24px;
}
.entry-summary > div {
  display: grid;
  gap: 5px;
  min-width: 0;
}
.entry-summary strong {
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.entry-card small {
  overflow: hidden;
  color: #a9a293;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.inline-editor {
  display: grid;
  min-width: 0;
  max-width: 100%;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #393d3f;
}
.inline-editor label {
  display: grid;
  min-width: 0;
  gap: 6px;
  color: #bdb39f;
}
.inline-editor textarea {
  width: 100%;
  max-width: 100%;
  min-height: 76px;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.entry-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.entry-actions span {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.empty-card {
  min-height: 100px;
  border-style: dashed !important;
}
.create-row {
  display: grid;
  gap: 10px;
  padding: 14px;
  background: #181c1e;
  border: 1px dashed #756744;
}
.create-row label {
  display: grid;
  gap: 6px;
}
.create-row > div {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.warning {
  color: #d8a95d;
}
@media (max-width: 720px) {
  .collection-board > header {
    align-items: stretch;
    flex-direction: column;
    gap: 8px;
  }
  .collection-board > header > button {
    width: 100%;
    min-width: 0;
    max-width: 100%;
    white-space: normal;
    overflow-wrap: anywhere;
  }
  .entry-summary {
    grid-template-columns: auto minmax(0, 1fr);
  }
  .entry-summary > button {
    grid-column: 1 / -1;
  }
  .inline-editor {
    grid-template-columns: 1fr;
  }
  .entry-actions {
    grid-column: auto;
    align-items: stretch;
    flex-direction: column;
  }
  .entry-actions > button,
  .entry-actions span,
  .entry-actions span button {
    flex: 1;
  }
}
</style>
