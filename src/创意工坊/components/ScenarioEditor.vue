<!-- eslint-disable vue/no-mutating-props -->
<template>
  <div class="workbench">
    <section class="hero">
      <div>
        <small>SCENARIO DOSSIER</small><input v-model="entry.key" class="title" placeholder="未命名剧本" /><textarea
          v-model="entry.desc"
          placeholder="故事的核心冲突"
        />
        <p>{{ theme.name }} · {{ theme.tagline }} · {{ cast.length }} 名角色</p>
      </div>
      <label
        ><input v-model="entry.可用" type="checkbox" :disabled="!playable" />{{
          playable ? '可发布' : '尚未就绪'
        }}</label
      >
    </section>
    <nav>
      <button v-for="item in tabs" :key="item.id" :class="{ active: tab === item.id }" @click="tab = item.id">
        {{ item.label }}<small>{{ item.note }}</small>
      </button>
    </nav>
    <section v-if="tab === 'overview'" class="panel">
      <h3>剧本概览与视觉方案</h3>
      <label>作者<input v-model="entry.author" /></label
      ><label><input v-model="entry.自定义主角" type="checkbox" />允许玩家自定义主角</label>
      <div class="themes">
        <ScenarioVisualCard
          v-for="option in scenarioThemes"
          :key="option.id"
          :theme-id="option.id"
          :name="option.name"
          :active="entry.视觉方案 === option.id"
          compact
          interactive
          @click="entry.视觉方案 = option.id"
        />
      </div>
      <ScenarioVisualCard
        :theme-id="entry.视觉方案"
        :name="entry.key || '未命名剧本'"
        :description="entry.desc || '剧本说明将在这里呈现。'"
        :custom-protagonist="entry.自定义主角"
        active
        expanded
      />
    </section>
    <section v-else-if="tab === 'cast'" class="panel">
      <header>
        <h3>角色阵容</h3>
        <button @click="pickerOpen = true">选择角色</button>
      </header>
      <div class="cast">
        <article v-for="role in cast" :key="role.id">
          <RoleAvatar
            :src="role.entry.meta?.avatar"
            :alt="role.title"
            :seed="role.entry.key"
            :fallback-style="role.entry.meta?.avatarStyle"
            :theme-color="role.entry.meta?.color"
          />
          <div>
            <b>{{ role.title }}</b
            ><small>{{ role.entry.type }} · {{ role.entry.author || '未署名' }}</small>
          </div>
          <button @click="removeRole(role.id)">×</button>
        </article>
      </div>
      <p v-if="!hasUser" class="warning">阵容中需要选择一名主角。</p>
    </section>
    <section v-else-if="tab === 'world'" class="panel">
      <header>
        <h3>初始世界</h3>
        <button @click="mapOpen = true">从地图选择地点</button>
      </header>
      <div class="fields">
        <label v-for="field in worldFields" :key="field"
          >{{ field }}<input v-model="entry.内容配置.世界[field]" /></label
        ><label>地图索引<input v-model="entry.内容配置.世界.地图索引" readonly /></label
        ><label><input v-model="entry.内容配置.世界.危险场景" type="checkbox" />危险场景</label>
      </div>
    </section>
    <section v-else class="panel">
      <header>
        <div>
          <h3>内嵌叙事骨架</h3>
          <small>内容只属于当前剧本</small>
        </div>
      </header>
      <label>开场文本<textarea v-model="entry.内容配置.开场文本" rows="10" /></label
      ><EntrySetEditor
        v-model="entry.内容配置.主线"
        label="主线阶段"
        :create="() => ({ 描述: '', 警惕度: 0, 详细: [], 已交融的魂质: [] })"
        ><template #entry="slot"
          ><label>描述<textarea v-model="slot.entry.描述" /></label
          ><label>警惕度<input v-model.number="slot.entry.警惕度" type="number" /></label></template></EntrySetEditor
      ><EmbeddedNarrativeList v-model="entry.内容配置.任务" kind="任务" /><EmbeddedNarrativeList
        v-model="entry.内容配置.事件"
        kind="事件"
      />
    </section>
  </div>
  <RolePickerDialog
    :open="pickerOpen"
    :model-value="entry.内容配置.角色"
    :source="source"
    @cancel="pickerOpen = false"
    @update:model-value="applyCast"
  />
  <MapLocationPicker
    :open="mapOpen"
    :map="mapData"
    @close="mapOpen = false"
    @select="entry.内容配置.世界.地图索引 = $event"
  />
</template>
<script setup lang="ts">
/* eslint-disable vue/no-mutating-props */
import { computed, onMounted, ref } from 'vue';
import RoleAvatar from '../../尘史使徒/UI/components/common/RoleAvatar.vue';
import ScenarioVisualCard from '../../尘史使徒/UI/components/scenario/ScenarioVisualCard.vue';
import { normalizeRoleSelection } from '../assets/model';
import { assetTitle } from '../assets/presentation';
import { scenarioThemeById, scenarioThemes } from '../scenario/themes';
import type { ScenarioSourceBundle } from '../scenario/types';
import EmbeddedNarrativeList from './EmbeddedNarrativeList.vue';
import EntrySetEditor from './EntrySetEditor.vue';
import MapLocationPicker from './MapLocationPicker.vue';
import RolePickerDialog from './RolePickerDialog.vue';
const props = defineProps<{ entry: any; source: ScenarioSourceBundle }>(),
  tab = ref<'overview' | 'cast' | 'world' | 'story'>('overview'),
  pickerOpen = ref(false),
  mapOpen = ref(false),
  worldFields = ['时间', '地点', '季节', '天气'];
const theme = computed(() => scenarioThemeById[props.entry.视觉方案]),
  mapData = computed<Record<string, any>>(() => Object.values(props.source.registries.地图)[0]?.data ?? {}),
  cast = computed(() =>
    props.entry.内容配置.角色
      .map((id: string) => ({
        id,
        entry: props.source.registries.角色[id],
        title: props.source.registries.角色[id] ? assetTitle('角色', props.source.registries.角色[id]) : '',
      }))
      .filter((x: any) => x.entry),
  ),
  hasUser = computed(() => cast.value.some((x: any) => x.entry.type === 'user')),
  playable = computed(
    () => hasUser.value && props.entry.内容配置.开场文本.trim() && Object.keys(props.entry.内容配置.主线).length,
  ),
  tabs = computed(() => [
    { id: 'overview', label: '概览', note: `${theme.value.name}方案` },
    { id: 'cast', label: '阵容', note: `${cast.value.length} 名` },
    { id: 'world', label: '世界', note: props.entry.内容配置.世界.地点 || '待设置' },
    { id: 'story', label: '叙事', note: `${props.entry.内容配置.任务.length} 项任务` },
  ]);
onMounted(
  () => (props.entry.内容配置.角色 = normalizeRoleSelection(props.entry.内容配置.角色, props.source.registries.角色)),
);
function removeRole(id: string) {
  props.entry.内容配置.角色 = props.entry.内容配置.角色.filter((x: string) => x !== id);
}
function applyCast(v: string[]) {
  props.entry.内容配置.角色 = v;
  pickerOpen.value = false;
}
</script>
<style scoped>
.workbench {
  display: grid;
  gap: 12px;
  min-width: 0;
}
.hero,
.panel {
  background: linear-gradient(135deg, #202426, #151719);
  border: 1px solid #393d3f;
  padding: 16px;
}
.hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 16px;
}
.hero div {
  min-width: 0;
}
.hero input,
.hero textarea,
.panel textarea {
  width: 100%;
  max-width: 100%;
}
.title {
  font-size: 24px;
}
.workbench nav {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.workbench nav button {
  display: grid;
}
.workbench nav .active {
  border-color: #cbb477;
  color: #cbb477;
}
.panel {
  display: grid;
  gap: 14px;
}
.panel header {
  display: flex;
  justify-content: space-between;
}
.themes,
.cast {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 8px;
}
.cast article {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}
.cast article > div {
  display: grid;
}
.fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.fields label,
.panel > label {
  display: grid;
  gap: 5px;
}
.warning {
  color: #e3ad66;
}
@media (max-width: 700px) {
  .hero {
    grid-template-columns: auto minmax(0, 1fr);
  }
  .hero > label {
    grid-column: 1/-1;
  }
  .workbench nav,
  .fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .panel {
    padding: 11px;
  }
  .themes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
