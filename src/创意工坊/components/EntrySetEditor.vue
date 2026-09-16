<template>
  <div class="entries">
    <article v-for="(value, key, index) in modelValue" :key="key">
      <header>
        <button type="button" class="title" @click="toggle(String(key))">
          <strong>{{ key }}</strong> · {{ collapsed.has(String(key)) ? '展开' : '折叠' }}</button
        ><span
          ><button type="button" :disabled="index === 0" @click="move(String(key), -1)">↑</button
          ><button type="button" :disabled="index === Object.keys(modelValue).length - 1" @click="move(String(key), 1)">
            ↓</button
          ><button type="button" @click="copy(String(key))">复制</button
          ><button type="button" @click="remove(String(key))">删除</button></span
        >
      </header>
      <slot v-if="!collapsed.has(String(key))" name="entry" :entry="value" :entry-key="String(key)" />
    </article>
    <div class="new">
      <label>{{ label }}名称<input v-model.trim="newKey" @keydown.enter.prevent="add" /></label
      ><button type="button" :disabled="!newKey || newKey in modelValue" @click="add">+ 添加{{ label }}</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { klona } from 'klona';
import { reactive, ref } from 'vue';
const props = defineProps<{ modelValue: Record<string, any>; label: string; create: () => unknown }>();
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, any>] }>();
const newKey = ref(''),
  collapsed = reactive(new Set<string>());
function add() {
  if (!newKey.value || newKey.value in props.modelValue) return;
  emit('update:modelValue', { ...props.modelValue, [newKey.value]: props.create() });
  newKey.value = '';
}
function remove(key: string) {
  const next = { ...props.modelValue };
  delete next[key];
  emit('update:modelValue', next);
}
function toggle(key: string) {
  if (collapsed.has(key)) collapsed.delete(key);
  else collapsed.add(key);
}
function copy(key: string) {
  let nextKey = `${key}副本`,
    n = 2;
  while (nextKey in props.modelValue) nextKey = `${key}副本${n++}`;
  emit('update:modelValue', { ...props.modelValue, [nextKey]: klona(props.modelValue[key]) });
}
function move(key: string, delta: number) {
  const rows = Object.entries(props.modelValue),
    index = rows.findIndex(([k]) => k === key),
    target = index + delta;
  if (target < 0 || target >= rows.length) return;
  [rows[index], rows[target]] = [rows[target], rows[index]];
  emit('update:modelValue', Object.fromEntries(rows));
}
</script>
<style scoped>
.entries {
  display: grid;
  gap: 10px;
}
.entries article {
  padding: 12px;
  background: #15181a;
  border: 1px solid #393d3f;
}
.entries header,
.new {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 8px;
}
.entries header span {
  display: flex;
  gap: 4px;
}
.title {
  flex: 1;
  text-align: left;
}
.new label {
  flex: 1;
}
</style>
