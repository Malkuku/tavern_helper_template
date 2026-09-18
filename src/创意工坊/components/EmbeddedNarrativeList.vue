<template>
  <section class="list">
    <header>
      <h4>{{ kind }}</h4>
      <button @click="add">＋ 新增</button>
    </header>
    <article v-for="(item, i) in modelValue" :key="i">
      <input v-model="item.key" :placeholder="`${kind}名称`" /><textarea
        v-model="item.data.描述"
        placeholder="描述"
      /><template v-if="kind === '任务'">
        <textarea v-model="item.data.目标" placeholder="目标" /><textarea
          v-model="item.data.阻碍"
          placeholder="阻碍"
        /><textarea v-model="item.data.期望奖励" placeholder="期望奖励" /></template
      ><template v-else>
        <textarea v-model="item.data.作用" placeholder="作用" /><input v-model="item.data.进度" placeholder="进度"
      /></template>
      <div>
        <button :disabled="i === 0" @click="move(i, -1)">上移</button
        ><button :disabled="i === modelValue.length - 1" @click="move(i, 1)">下移</button
        ><button @click="copy(i)">复制</button><button @click="remove(i)">删除</button>
      </div>
    </article>
  </section>
</template>
<script setup lang="ts">
import type { EmbeddedNarrativeEntry } from '../scenario/types';
const p = defineProps<{ modelValue: EmbeddedNarrativeEntry[]; kind: '任务' | '事件' }>(),
  e = defineEmits<{ 'update:modelValue': [EmbeddedNarrativeEntry[]] }>(),
  fresh = () => ({
    key: '',
    data:
      p.kind === '任务'
        ? { 描述: '', 目标: '', 阻碍: '', 期望奖励: '', 取得成果: [] }
        : { 描述: '', 作用: '', 进度: '' },
  });
function set(v: EmbeddedNarrativeEntry[]) {
  e('update:modelValue', v);
}
function add() {
  set([...p.modelValue, fresh()]);
}
function remove(i: number) {
  set(p.modelValue.filter((_, n) => n !== i));
}
function copy(i: number) {
  const n = structuredClone(p.modelValue);
  n.splice(i + 1, 0, structuredClone(n[i]));
  set(n);
}
function move(i: number, d: number) {
  const n = structuredClone(p.modelValue),
    j = i + d;
  [n[i], n[j]] = [n[j], n[i]];
  set(n);
}
</script>
<style scoped>
.list {
  display: grid;
  gap: 8px;
}
.list header {
  display: flex;
  justify-content: space-between;
}
.list article {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  padding: 10px;
  background: #151719;
}
.list input,
.list textarea {
  min-width: 0;
  width: 100%;
  max-width: 100%;
}
.list article div {
  grid-column: 1/-1;
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}
@media (max-width: 700px) {
  .list article {
    grid-template-columns: 1fr;
  }
  .list article div {
    grid-column: auto;
  }
}
</style>
