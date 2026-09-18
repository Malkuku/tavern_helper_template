<!-- eslint-disable vue/no-mutating-props -->
<template>
  <div class="workbench">
    <section class="hero">
      <div class="hero-icon"><svg :viewBox="themeViewBox" v-html="theme.iconMarkup"></svg></div>
      <div class="hero-copy">
        <small>SCENARIO DOSSIER</small><input v-model="entry.key" class="title" placeholder="未命名剧本" /><textarea
          v-model="entry.desc"
          placeholder="故事的核心冲突"
        />
        <p>{{ theme.name }} · {{ theme.tagline }} · {{ cast.length }} 名角色</p>
      </div>
      <button
        class="publish-state"
        :class="{ ready: playable && entry.可用 }"
        :disabled="!playable"
        @click="entry.可用 = !entry.可用"
      >
        <svg viewBox="0 0 24 24">
          <path v-if="playable && entry.可用" d="M5 12l4 4L19 6" />
          <path v-else d="M12 7v6M12 17v.01" />
          <circle cx="12" cy="12" r="9" /></svg
        ><span>{{ playable ? (entry.可用 ? '已启用' : '可启用') : '尚未就绪' }}</span>
      </button>
    </section>
    <div class="workbench-body">
      <nav aria-label="剧本分区">
        <button v-for="item in tabs" :key="item.id" :class="{ active: tab === item.id }" @click="tab = item.id">
          <span class="tab-icon"><svg :viewBox="item.iconViewBox || '0 0 24 24'" v-html="item.icon"></svg></span
          ><span class="tab-copy"
            ><b>{{ item.label }}</b
            ><small>{{ item.note }}</small></span
          ><span class="tab-state" :class="{ done: item.done }"></span>
        </button>
      </nav>
      <main class="workspace">
        <section v-if="tab === 'overview'" class="panel">
          <header>
            <div>
              <small>IDENTITY & VISUAL</small>
              <h3>剧本概览</h3>
            </div>
          </header>
          <div class="meta-fields">
            <label>作者<input v-model="entry.author" /></label>
            <div class="choice-field">
              <span>主角创建方式</span>
              <div role="group" aria-label="主角创建方式">
                <button
                  type="button"
                  :class="{ active: !entry.自定义主角 }"
                  :aria-pressed="!entry.自定义主角"
                  @click="entry.自定义主角 = false"
                >
                  {{ !entry.自定义主角 ? '✓ 固定主角（当前）' : '固定主角' }}
                </button>
                <button
                  type="button"
                  :class="{ active: entry.自定义主角 }"
                  :aria-pressed="entry.自定义主角"
                  @click="entry.自定义主角 = true"
                >
                  {{ entry.自定义主角 ? '✓ 允许自定义（当前）' : '允许自定义' }}
                </button>
              </div>
            </div>
          </div>
          <div class="themes">
            <button
              v-for="option in scenarioThemes"
              :key="option.id"
              type="button"
              class="theme-option"
              :class="{ active: entry.视觉方案 === option.id }"
              :title="`${option.name}：${option.tagline}`"
              @click="entry.视觉方案 = option.id"
            >
              <ScenarioThemeIcon :theme-id="option.id" />
              <span>{{ option.name }}</span>
            </button>
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
            <div>
              <small>CAST ASSEMBLY</small>
              <h3>角色阵容</h3>
            </div>
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
                ><small>{{ role.entry.author || '未署名' }}</small
                ><small>{{ role.entry.desc || '暂无素材说明' }}</small>
              </div>
              <div class="cast-actions">
                <button type="button" @click="previewId = role.id">预览</button>
                <button type="button" aria-label="从阵容移除" @click="removeRole(role.id)">×</button>
              </div>
            </article>
          </div>
          <p v-if="!hasUser" class="warning">阵容中需要选择一名主角。</p>
        </section>
        <section v-else-if="tab === 'world'" class="panel">
          <header>
            <div>
              <small>INITIAL WORLD</small>
              <h3>初始世界</h3>
            </div>
            <button @click="mapOpen = true">从地图选择地点</button>
          </header>
          <div class="fields">
            <label v-for="field in worldFields" :key="field"
              >{{ field }}<input v-model="entry.内容配置.世界[field]" /></label
            ><label>地图索引<input v-model="entry.内容配置.世界.地图索引" readonly /></label>
            <div class="choice-field">
              <span>场景危险度</span>
              <div role="group" aria-label="场景危险度">
                <button
                  type="button"
                  :class="{ active: !entry.内容配置.世界.危险场景 }"
                  :aria-pressed="!entry.内容配置.世界.危险场景"
                  @click="entry.内容配置.世界.危险场景 = false"
                >
                  {{ !entry.内容配置.世界.危险场景 ? '✓ 普通场景（当前）' : '普通场景' }}
                </button>
                <button
                  type="button"
                  :class="{ active: entry.内容配置.世界.危险场景 }"
                  :aria-pressed="entry.内容配置.世界.危险场景"
                  @click="entry.内容配置.世界.危险场景 = true"
                >
                  {{ entry.内容配置.世界.危险场景 ? '✓ 危险场景（当前）' : '危险场景' }}
                </button>
              </div>
            </div>
          </div>
        </section>
        <section v-else class="panel story">
          <header>
            <div>
              <small>NARRATIVE SYSTEM</small>
              <h3>叙事编排</h3>
              <p>主线使用自由结构；任务与事件沿用玩家实际看到的卡片。</p>
            </div>
          </header>
          <label class="opening">开场文本<textarea v-model="entry.内容配置.开场文本" rows="8" /></label
          ><MainlineComposer v-model="entry.内容配置.主线" /><EmbeddedNarrativeList
            v-model="entry.内容配置.任务"
            kind="任务"
          /><EmbeddedNarrativeList v-model="entry.内容配置.事件" kind="事件" />
        </section>
      </main>
    </div>
  </div>
  <RolePickerDialog
    :open="pickerOpen"
    :model-value="entry.内容配置.角色"
    :source="source"
    @cancel="pickerOpen = false"
    @update:model-value="applyCast"
  /><MapLocationPicker
    :open="mapOpen"
    :map="mapData"
    @close="mapOpen = false"
    @select="entry.内容配置.世界.地图索引 = $event"
  />
  <AppDialog
    :open="!!previewRole"
    :title="previewRole ? `${assetTitle('角色', previewRole)} · 阵容预览` : '阵容预览'"
    cancel-label="关闭"
    @cancel="previewId = ''"
  >
    <div v-if="previewRole" class="role-preview">
      <CharPanel :data="previewData" :char-type="previewCharType" mode="view" />
    </div>
  </AppDialog>
</template>
<script setup lang="ts">
/* eslint-disable vue/no-mutating-props */
import { computed, onMounted, ref } from 'vue';
import RoleAvatar from '../../尘史使徒/UI/components/common/RoleAvatar.vue';
import CharPanel from '../../尘史使徒/UI/components/role/CharPanel.vue';
import ScenarioVisualCard from '../../尘史使徒/UI/components/scenario/ScenarioVisualCard.vue';
import ScenarioThemeIcon from '../../尘史使徒/UI/components/scenario/ScenarioThemeIcon.vue';
import { normalizeRoleSelection } from '../assets/model';
import { assetTitle } from '../assets/presentation';
import { scenarioThemeById, scenarioThemes } from '../scenario/themes';
import { mainlineEntries } from '../scenario/mainlineLayout';
import type { ScenarioSourceBundle } from '../scenario/types';
import EmbeddedNarrativeList from './EmbeddedNarrativeList.vue';
import AppDialog from './AppDialog.vue';
import MainlineComposer from './MainlineComposer.vue';
import MapLocationPicker from './MapLocationPicker.vue';
import RolePickerDialog from './RolePickerDialog.vue';
const props = defineProps<{ entry: any; source: ScenarioSourceBundle }>(),
  tab = ref<'overview' | 'cast' | 'world' | 'story'>('overview'),
  pickerOpen = ref(false),
  previewId = ref(''),
  mapOpen = ref(false),
  worldFields = ['时间', '地点', '季节', '天气'];
const theme = computed(() => scenarioThemeById[props.entry.视觉方案]),
  themeViewBox = computed(() =>
    ['forge', 'edge', 'heart', 'knock'].includes(theme.value.iconKey) ? '0 0 24 24' : '0 0 64 64',
  ),
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
  previewRole = computed(() => props.source.registries.角色[previewId.value]),
  previewData = computed(() => ({ ...(previewRole.value?.data as object), meta: previewRole.value?.meta })),
  previewCharType = computed(
    () => ({ user: 'user', 主要角色: 'main', 次要角色: 'minor' })[previewRole.value?.type ?? ''] ?? 'main',
  ),
  playable = computed(() =>
    Boolean(hasUser.value && props.entry.内容配置.开场文本.trim() && mainlineEntries(props.entry.内容配置.主线).length),
  ),
  tabs = computed(() => [
    {
      id: 'overview',
      label: '概览',
      note: `${theme.value.name} · ${theme.value.tagline}`,
      done: Boolean(props.entry.key && props.entry.desc),
      icon: theme.value.iconMarkup,
      iconViewBox: themeViewBox.value,
    },
    {
      id: 'cast',
      label: '角色阵容',
      note: `${cast.value.length} 名角色`,
      done: hasUser.value,
      iconViewBox: '0 0 24 24',
      icon: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2-7 6-7s6 3 6 7M16 7h5M18.5 4.5v5"/>',
    },
    {
      id: 'world',
      label: '初始世界',
      note: props.entry.内容配置.世界.地点 || '待设置地点',
      done: Boolean(props.entry.内容配置.世界.地点),
      iconViewBox: '0 0 24 24',
      icon: '<circle cx="12" cy="12" r="9"/><path d="M12 3c3 3 4 6 4 9s-1 6-4 9c-3-3-4-6-4-9s1-6 4-9M3 12h18"/>',
    },
    {
      id: 'story',
      label: '叙事编排',
      note: `${mainlineEntries(props.entry.内容配置.主线).length} 主线 · ${props.entry.内容配置.任务.length} 任务 · ${props.entry.内容配置.事件.length} 事件`,
      done: Boolean(props.entry.内容配置.开场文本.trim() && mainlineEntries(props.entry.内容配置.主线).length),
      iconViewBox: '0 0 24 24',
      icon: '<path d="M5 4v16M5 7h7l3 3h5M5 16h6l3-3h5"/><circle cx="19" cy="10" r="2"/><circle cx="19" cy="13" r="2"/>',
    },
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
  grid-template-columns: 74px minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
}
.hero-icon {
  width: 64px;
  height: 64px;
  color: #cbb477;
  filter: drop-shadow(0 0 8px currentColor);
  opacity: 0.85;
}
.hero-icon svg {
  width: 100%;
  height: 100%;
}
.hero-copy {
  min-width: 0;
}
.hero input,
.hero textarea,
.panel textarea {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
.title {
  font-size: 24px;
}
.publish-state {
  display: grid;
  justify-items: center;
  gap: 4px;
  min-width: 92px;
  color: #c47f63;
}
.publish-state.ready {
  color: #8db78d;
}
.publish-state svg {
  width: 30px;
  height: 30px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
}
.workbench-body {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}
.workspace {
  min-width: 0;
}
.workbench nav {
  display: grid;
  gap: 6px;
  position: sticky;
  top: 8px;
}
.workbench nav button {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 8px;
  align-items: center;
  text-align: left;
  gap: 9px;
  padding: 12px;
}
.workbench nav button.active {
  border-color: #cbb477;
  color: #cbb477;
  background: rgba(203, 180, 119, 0.07);
}
.tab-icon {
  width: 28px;
  height: 28px;
  color: #83878b;
}
.tab-icon svg {
  width: 100%;
  height: 100%;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
}
.tab-copy {
  display: grid;
  min-width: 0;
}
.tab-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tab-state {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #72483b;
}
.tab-state.done {
  background: #718f70;
  box-shadow: 0 0 7px #718f70;
}
.panel {
  display: grid;
  gap: 16px;
}
.panel header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.panel header h3 {
  margin: 2px 0;
}
.panel header small {
  color: #cbb477;
  letter-spacing: 0.14em;
}
.panel header p {
  color: #888;
  margin: 4px 0;
}
.themes,
.cast {
  display: grid;
  gap: 8px;
}
.themes {
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
}
.theme-option {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  gap: 7px;
  align-items: center;
  min-width: 0;
  padding: 8px 10px;
  color: #cbb477;
  text-align: left;
}
.theme-option.active {
  border-color: currentColor;
  background: color-mix(in srgb, currentColor 12%, #151719);
  box-shadow: inset 0 -2px currentColor;
}
.theme-option :deep(.scenario-theme-icon) {
  width: 26px;
  height: 26px;
}
.theme-option span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cast {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
}
.cast article {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  padding: 9px;
  background: #151719;
  min-width: 0;
  min-height: 58px;
}
.cast article > div {
  display: grid;
  min-width: 0;
}
.cast article > .cast-actions {
  display: flex;
  gap: 5px;
  align-self: stretch;
}
.cast-actions button {
  padding: 5px 8px;
}
.cast article small,
.cast article b {
  overflow-wrap: anywhere;
}
.fields,
.meta-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.fields label,
.meta-fields label,
.opening {
  display: grid;
  gap: 5px;
}
.choice-field {
  display: grid;
  gap: 5px;
  align-self: end;
}
.choice-field > div {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  padding: 3px;
  background: #111416;
  border: 1px solid #454a4c;
}
.choice-field button {
  min-width: 0;
  padding: 7px 10px;
  color: #aaa397 !important;
  background: transparent !important;
  border-color: transparent !important;
}
.choice-field button.active {
  color: #17130c !important;
  font-weight: 700;
  background: #d8bf7b !important;
  border-color: #f1d995 !important;
  box-shadow:
    0 0 0 1px #f1d995,
    0 0 12px rgba(203, 180, 119, 0.38);
}
.warning {
  color: #e3ad66;
}
.role-preview {
  height: min(62dvh, 620px);
  min-height: 420px;
  overflow: hidden;
}
.story > :not(header) {
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}
@media (max-width: 700px) {
  .hero {
    grid-template-columns: 54px minmax(0, 1fr);
  }
  .hero-icon {
    width: 48px;
    height: 48px;
  }
  .publish-state {
    grid-column: 1/-1;
    display: flex;
    justify-content: center;
  }
  .workbench-body {
    grid-template-columns: 1fr;
  }
  .workbench nav {
    display: flex;
    overflow-x: auto;
    position: static;
  }
  .workbench nav button {
    flex: 0 0 170px;
  }
  .fields,
  .meta-fields {
    grid-template-columns: 1fr;
  }
  .panel {
    padding: 11px;
  }
  .themes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
