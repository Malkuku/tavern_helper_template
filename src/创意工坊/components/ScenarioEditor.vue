<!-- eslint-disable vue/no-mutating-props -->
<template>
  <form class="scenario" @submit.prevent>
    <section>
      <h3>剧本设置</h3>
      <div class="grid">
        <label>名称<input v-model="entry.key" required /></label><label>作者<input v-model="entry.author" /></label
        ><label>主题<input v-model="entry.主题" /></label><label>图标<input v-model="entry.图标" /></label
        ><label class="wide">说明<textarea v-model="entry.desc" /></label
        ><label class="check"><input v-model="entry.自定义主角" type="checkbox" />允许自定义主角</label
        ><label class="check"><input v-model="entry.可用" type="checkbox" />请求启用</label>
      </div>
    </section>
    <section>
      <h3>独立初始世界状态</h3>
      <div v-if="world" class="grid">
        <label v-for="f in worldFields" :key="f">{{ f }}<input v-model="world.data[f]" /></label
        ><label
          >地图索引
          <div class="location-control">
            <input v-model="world.data.地图索引" readonly /><button type="button" @click="mapOpen = true">
              打开地图
            </button>
          </div></label
        ><label class="check"><input v-model="world.data.危险场景" type="checkbox" />危险场景</label>
      </div>
      <p v-else class="warning">缺少初始世界状态，请重新创建剧本或修复引用。</p>
    </section>
    <section>
      <h3>角色组装</h3>
      <p>顺序决定同一角色多个版本的优先级：列表中靠后的版本生效。剧本必须恰有一个 user。</p>
      <article v-for="(id, index) in entry.内容配置.角色" :key="id + index" class="reference">
        <div>
          <b>{{ roleName(id) }}</b
          ><small>{{ roleContext(id, index) }}</small>
        </div>
        <button type="button" :disabled="index === 0" @click="move(entry.内容配置.角色, index, -1)">↑</button
        ><button
          type="button"
          :disabled="index === entry.内容配置.角色.length - 1"
          @click="move(entry.内容配置.角色, index, 1)"
        >
          ↓</button
        ><button type="button" @click="entry.内容配置.角色.splice(index, 1)">移除</button>
      </article>
      <label
        >添加角色<select v-model="roleCandidate">
          <option value="">选择角色</option>
          <option v-for="(r, id) in availableRoles" :key="id" :value="id">
            {{ assetTitle('角色', r) }} · {{ r.type }}
          </option>
        </select></label
      ><button type="button" :disabled="!roleCandidate" @click="addRole">+ 添加到末尾</button>
    </section>
    <section>
      <h3>叙事内容</h3>
      <p>新建剧本默认拥有私有素材。显式改选已有素材前，请检查其他引用剧本和修改影响。</p>
      <label
        >开场文本<select v-model="entry.内容配置.开场文本">
          <option value="">未选择</option>
          <option v-for="(v, id) in source.registries.开场文本" :key="id" :value="id">
            {{ assetTitle('开场文本', v) }} · {{ usage('开场文本', id) }}
          </option>
        </select></label
      ><textarea v-if="opening" v-model="opening.data" rows="12" class="prose" /><label
        >主线<select v-model="entry.内容配置.主线">
          <option value="">未选择</option>
          <option v-for="(v, id) in source.registries.主线" :key="id" :value="id">
            {{ assetTitle('主线', v) }} · {{ usage('主线', id) }}
          </option>
        </select></label
      ><EntrySetEditor
        v-if="mainline"
        v-model="mainline.data"
        label="主线"
        :create="() => ({ 描述: '', 警惕度: 0, 详细: [], 已交融的魂质: [] })"
        ><template #entry="p"
          ><label>描述<textarea v-model="p.entry.描述" /></label
          ><label>警惕度<input v-model.number="p.entry.警惕度" type="number" /></label></template></EntrySetEditor
      ><NarrativeList :ids="entry.内容配置.任务" category="任务" :source="source" /><NarrativeList
        :ids="entry.内容配置.事件"
        category="事件"
        :source="source"
      />
    </section>
  </form>
  <MapLocationPicker :open="mapOpen" :map="mapData" @close="mapOpen = false" @select="world.data.地图索引 = $event" />
</template>
<script setup lang="ts">
/* eslint-disable vue/no-mutating-props */ import { computed, ref } from 'vue';
import { assetTitle } from '../assets/presentation';
import type { ScenarioSourceBundle } from '../scenario/types';
import EntrySetEditor from './EntrySetEditor.vue';
import NarrativeList from './NarrativeList.vue';
import MapLocationPicker from './MapLocationPicker.vue';
const props = defineProps<{ entry: any; source: ScenarioSourceBundle }>();
const roleCandidate = ref(''),
  mapOpen = ref(false),
  worldFields = ['时间', '地点', '季节', '天气'];
const world = computed<any>(() => props.source.registries.世界[props.entry.内容配置.世界]),
  opening = computed<any>(() => props.source.registries.开场文本[props.entry.内容配置.开场文本]),
  mainline = computed<any>(() => props.source.registries.主线[props.entry.内容配置.主线]);
const mapData = computed<Record<string, any>>(() => Object.values(props.source.registries.地图)[0]?.data ?? {});
const availableRoles = computed(() =>
  Object.fromEntries(
    Object.entries(props.source.registries.角色).filter(([id]) => !props.entry.内容配置.角色.includes(id)),
  ),
);
function roleName(id: string) {
  const r = props.source.registries.角色[id];
  return r ? `${assetTitle('角色', r)} · ${r.type}` : '已缺失角色';
}
function roleContext(id: string, index: number) {
  const r = props.source.registries.角色[id];
  if (!r) return '';
  const later = props.entry.内容配置.角色.slice(index + 1).some((x: string) => {
    const v = props.source.registries.角色[x];
    return v?.type === r.type && v?.key === r.key;
  });
  return later ? '后面还有同一角色的版本，本项不会生效' : '本角色最终使用此版本';
}
function move(a: string[], i: number, d: number) {
  [a[i], a[i + d]] = [a[i + d], a[i]];
}
function addRole() {
  if (roleCandidate.value) {
    props.entry.内容配置.角色.push(roleCandidate.value);
    roleCandidate.value = '';
  }
}
function usage(category: '开场文本' | '主线', id: string) {
  const names = Object.values(props.source.scenarios)
    .filter(s => s.内容配置[category] === id)
    .map(s => s.key);
  return names.length ? `已被 ${names.join('、')} 引用` : '未被引用';
}
</script>
<style scoped>
.scenario {
  display: grid;
  gap: 14px;
}
.scenario section {
  padding: 16px;
  background: #1d2123;
  border: 1px solid #393d3f;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.wide {
  grid-column: 1/-1;
}
.scenario label {
  display: grid;
  gap: 5px;
}
.check {
  display: flex !important;
  align-items: center;
}
.check input {
  width: auto !important;
}
.location-control {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 7px;
}
.reference {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 6px;
  align-items: center;
  padding: 8px;
  background: #15181a;
}
.reference small {
  display: block;
  color: #d8a95d;
}
.warning {
  color: #d8a95d;
}
.prose {
  font-family: ui-monospace, monospace;
}
@media (max-width: 700px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .wide {
    grid-column: auto;
  }
}
</style>
