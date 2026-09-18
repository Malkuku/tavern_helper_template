<template>
  <div class="json-block" :class="{ nested: depth > 0 }">
    <template v-if="isObject">
      <div v-for="([key, value], index) in objectEntries" :key="`${key}-${index}`" class="field-block">
        <div class="field-head">
          <input class="key" :value="key" aria-label="字段名" @change="renameKey(key, $event)" />
          <select :value="valueType(value)" aria-label="字段类型" @change="changeObjectType(key, $event)">
            <option value="text">文本</option>
            <option value="number">数字</option>
            <option value="boolean">开关</option>
            <option value="object">分组</option>
            <option value="array">列表</option>
          </select>
          <button :disabled="index === 0" @click="moveKey(key, -1)">↑</button>
          <button :disabled="index === objectEntries.length - 1" @click="moveKey(key, 1)">↓</button>
          <button class="danger" @click="removeKey(key)">×</button>
        </div>
        <JsonBlockEditor
          v-if="isContainer(value)"
          :model-value="value"
          :depth="depth + 1"
          @update:model-value="setKey(key, $event)"
        />
        <textarea
          v-else-if="typeof value === 'string'"
          :value="value"
          rows="2"
          @input="setKey(key, $event.target.value)"
        />
        <input
          v-else-if="typeof value === 'number'"
          :value="value"
          type="number"
          @input="setKey(key, Number($event.target.value))"
        />
        <label v-else class="toggle"
          ><input :checked="value" type="checkbox" @change="setKey(key, $event.target.checked)" />{{
            value ? '是' : '否'
          }}</label
        >
      </div>
      <button class="add" @click="addKey">＋ 添加字段</button>
    </template>
    <template v-else>
      <div v-for="(value, index) in arrayValue" :key="index" class="field-block array-item">
        <div class="field-head">
          <span>#{{ index + 1 }}</span
          ><select :value="valueType(value)" @change="changeArrayType(index, $event)">
            <option value="text">文本</option>
            <option value="number">数字</option>
            <option value="boolean">开关</option>
            <option value="object">分组</option>
            <option value="array">列表</option></select
          ><button :disabled="index === 0" @click="moveArray(index, -1)">↑</button
          ><button :disabled="index === arrayValue.length - 1" @click="moveArray(index, 1)">↓</button
          ><button class="danger" @click="removeArray(index)">×</button>
        </div>
        <JsonBlockEditor
          v-if="isContainer(value)"
          :model-value="value"
          :depth="depth + 1"
          @update:model-value="setArray(index, $event)"
        />
        <textarea
          v-else-if="typeof value === 'string'"
          :value="value"
          rows="2"
          @input="setArray(index, $event.target.value)"
        />
        <input
          v-else-if="typeof value === 'number'"
          :value="value"
          type="number"
          @input="setArray(index, Number($event.target.value))"
        />
        <label v-else class="toggle"
          ><input :checked="value" type="checkbox" @change="setArray(index, $event.target.checked)" />{{
            value ? '是' : '否'
          }}</label
        >
      </div>
      <button class="add" @click="addArray">＋ 添加条目</button>
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
defineOptions({ name: 'JsonBlockEditor' });
const props = withDefaults(defineProps<{ modelValue: Record<string, unknown> | unknown[]; depth?: number }>(), {
  depth: 0,
});
const emit = defineEmits<{ 'update:modelValue': [Record<string, unknown> | unknown[]] }>();
const isObject = computed(() => !Array.isArray(props.modelValue));
const objectEntries = computed(() => Object.entries(props.modelValue as Record<string, unknown>));
const arrayValue = computed(() => props.modelValue as unknown[]);
const isContainer = (v: unknown): v is Record<string, unknown> | unknown[] => typeof v === 'object' && v !== null;
const valueType = (v: unknown) =>
  Array.isArray(v)
    ? 'array'
    : isContainer(v)
      ? 'object'
      : typeof v === 'number'
        ? 'number'
        : typeof v === 'boolean'
          ? 'boolean'
          : 'text';
const fresh = (type: string): unknown =>
  type === 'object' ? {} : type === 'array' ? [] : type === 'number' ? 0 : type === 'boolean' ? false : '';
function uniqueKey(source: Record<string, unknown>, base = '新字段') {
  let key = base,
    n = 2;
  while (key in source) key = `${base}${n++}`;
  return key;
}
function updateObject(mutator: (v: Record<string, unknown>) => void) {
  const next = { ...(props.modelValue as Record<string, unknown>) };
  mutator(next);
  emit('update:modelValue', next);
}
function setKey(key: string, value: unknown) {
  updateObject(v => {
    v[key] = value;
  });
}
function addKey() {
  updateObject(v => {
    v[uniqueKey(v)] = '';
  });
}
function removeKey(key: string) {
  updateObject(v => {
    delete v[key];
  });
}
function renameKey(key: string, event: Event) {
  const target = event.target as HTMLInputElement,
    nextKey = target.value.trim(),
    source = props.modelValue as Record<string, unknown>;
  if (!nextKey || (nextKey !== key && nextKey in source)) {
    target.value = key;
    return;
  }
  emit('update:modelValue', Object.fromEntries(Object.entries(source).map(([k, v]) => [k === key ? nextKey : k, v])));
}
function moveKey(key: string, delta: number) {
  const rows = objectEntries.value.slice(),
    i = rows.findIndex(([k]) => k === key),
    j = i + delta;
  if (j < 0 || j >= rows.length) return;
  [rows[i], rows[j]] = [rows[j], rows[i]];
  emit('update:modelValue', Object.fromEntries(rows));
}
function changeObjectType(key: string, event: Event) {
  setKey(key, fresh((event.target as HTMLSelectElement).value));
}
function updateArray(mutator: (v: unknown[]) => void) {
  const next = [...arrayValue.value];
  mutator(next);
  emit('update:modelValue', next);
}
function setArray(index: number, value: unknown) {
  updateArray(v => {
    v[index] = value;
  });
}
function addArray() {
  updateArray(v => v.push(''));
}
function removeArray(index: number) {
  updateArray(v => v.splice(index, 1));
}
function moveArray(index: number, delta: number) {
  updateArray(v => {
    const j = index + delta;
    if (j < 0 || j >= v.length) return;
    [v[index], v[j]] = [v[j], v[index]];
  });
}
function changeArrayType(index: number, event: Event) {
  setArray(index, fresh((event.target as HTMLSelectElement).value));
}
</script>
<style scoped>
.json-block {
  display: grid;
  gap: 8px;
  min-width: 0;
}
.json-block.nested {
  padding: 9px;
  border-left: 1px solid rgba(203, 180, 119, 0.28);
  background: rgba(0, 0, 0, 0.14);
}
.field-block {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 9px;
  background: rgba(255, 255, 255, 0.025);
}
.field-head {
  display: flex;
  gap: 5px;
  align-items: center;
  min-width: 0;
}
.field-head .key {
  flex: 1;
  min-width: 80px;
  font-weight: 600;
}
.field-head span {
  flex: 1;
  color: #999;
}
.field-head button {
  padding: 3px 7px;
}
.danger {
  color: #e48b8b;
}
.field-block textarea,
.field-block > input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.toggle {
  display: flex;
  gap: 7px;
  align-items: center;
}
.add {
  justify-self: start;
  color: #cbb477;
}
@media (max-width: 560px) {
  .field-head {
    flex-wrap: wrap;
  }
  .field-head .key {
    flex-basis: 100%;
  }
}
</style>
