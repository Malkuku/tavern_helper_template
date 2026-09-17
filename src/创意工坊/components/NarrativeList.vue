<!-- eslint-disable vue/no-mutating-props -->
<template>
  <div class="list">
    <h4>{{ category }}</h4>
    <article v-for="(id, index) in ids" :key="id">
      <label
        >素材<select :value="id" @change="replace(index, ($event.target as HTMLSelectElement).value)">
          <option v-for="(v, oid) in source.registries[category]" :key="oid" :value="oid">
            {{ assetTitle(category, v) }} · {{ usage(String(oid)) }}
          </option>
        </select></label
      >
      <div v-if="source.registries[category][id]" class="fields">
        <label>名称<input v-model="source.registries[category][id].key" /></label
        ><label v-for="f in fields" :key="f"
          >{{ f }}<textarea v-model="source.registries[category][id].data[f]" />
        </label>
      </div>
      <button type="button" @click="ids.splice(index, 1)">移除</button>
    </article>
    <label
      >显式复用已有{{ category
      }}<select v-model="candidate">
        <option value="">选择素材</option>
        <option v-for="(v, id) in available" :key="id" :value="id">
          {{ assetTitle(category, v) }} · {{ usage(String(id)) }}
        </option>
      </select></label
    ><button type="button" :disabled="!candidate" @click="add">+ 添加引用</button>
  </div>
</template>
<script setup lang="ts">
/* eslint-disable vue/no-mutating-props */ import { computed, ref } from 'vue';
import { assetTitle } from '../assets/presentation';
import type { ScenarioSourceBundle } from '../scenario/types';
const props = defineProps<{ ids: string[]; category: '任务' | '事件'; source: ScenarioSourceBundle }>();
const candidate = ref('');
const fields = computed(() =>
  props.category === '任务' ? ['描述', '目标', '阻碍', '期望奖励'] : ['描述', '作用', '进度'],
);
const available = computed(() =>
  Object.fromEntries(Object.entries(props.source.registries[props.category]).filter(([id]) => !props.ids.includes(id))),
);
function usage(id: string) {
  const names = Object.values(props.source.scenarios)
    .filter(s => s.内容配置[props.category].includes(id))
    .map(s => s.key);
  return names.length ? `影响 ${names.join('、')}` : '未被引用';
}
function replace(index: number, id: string) {
  props.ids[index] = id;
}
function add() {
  if (candidate.value) {
    props.ids.push(candidate.value);
    candidate.value = '';
  }
}
</script>
<style scoped>
.list,
.fields {
  display: grid;
  gap: 8px;
}
.list article {
  padding: 10px;
  background: #15181a;
}
.fields {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.list label {
  display: grid;
  gap: 5px;
}
@media (max-width: 720px) {
  .fields {
    grid-template-columns: 1fr;
  }
}
</style>
