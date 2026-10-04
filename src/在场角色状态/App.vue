<template>
  <section class="presence-panel" aria-label="在场角色状态">
    <header class="panel-heading">
      <h2>
        在场角色 <span>{{ characters.length }} 人</span>
      </h2>
      <button type="button" :aria-expanded="!collapsed" @click="collapsed = !collapsed">
        {{ collapsed ? '展开' : '收起' }}
      </button>
    </header>
    <div v-if="!collapsed" class="panel-content">
      <p v-if="loading" class="empty" role="status">等待角色数据…</p>
      <div v-else-if="error" class="empty" role="alert">
        <p>{{ error }}</p>
        <button type="button" @click="refresh">重新读取</button>
      </div>
      <p v-else-if="!data?.角色" class="empty">本楼层尚无角色数据。</p>
      <p v-else-if="!selected" class="empty">当前没有在场角色。</p>
      <template v-else>
        <div class="character-heading">
          <label class="character-picker">
            <span class="caption">当前角色 · {{ selectedIndex + 1 }} / {{ characters.length }}</span>
            <select
              :value="selectedId"
              aria-label="选择在场角色"
              @change="selectedId = ($event.target as HTMLSelectElement).value"
            >
              <option v-for="character in characters" :key="character.id" :value="character.id">
                {{ character.name }} · {{ character.kind }}
              </option>
            </select>
          </label>
          <span class="rating">{{ selected.role.当前评级 || '评级未记录' }}</span>
        </div>
        <nav class="page-tabs" aria-label="状态分类">
          <button type="button" :aria-pressed="page === '阶段'" @click="page = '阶段'">阶段</button>
          <button type="button" :aria-pressed="page === '身体'" @click="page = '身体'">身体</button>
        </nav>
        <div v-if="page === '阶段'" class="stages">
          <section
            v-for="name in visibleStageNames"
            :key="name"
            class="stage"
            :class="{ trauma: name === '创伤稳定度', affection: name === '好感度', corruption: name === '恶堕度' }"
          >
            <header>
              <h3>{{ name }}</h3>
              <span v-if="canReadField(data, selected, name) && stage(name)">Lv.{{ stage(name)!.当前等级 }}</span>
            </header>
            <p v-if="!canReadField(data, selected, name)" class="locked">未解锁 · 请在手机观测中解锁</p>
            <p v-else class="prose">{{ stageDescription(name) }}</p>
          </section>
          <p class="footnote">
            <template v-if="selected.kind === '主要角色'">创伤稳定度表示心理应对阶段；</template>
            等级与描述以本楼层记录为准。
          </p>
        </div>
        <div v-else-if="!canReadField(data, selected, '身体状态')" class="empty locked">
          身体状态未解锁 · 请在手机观测中解锁
        </div>
        <div v-else class="body-page">
          <details :key="selected.id" class="special-status">
            <summary>
              特殊状态 <span>{{ specialStates.length }} 项</span>
            </summary>
            <ul v-if="specialStates.length">
              <li v-for="(value, index) in specialStates" :key="index" class="prose">{{ statusText(value) }}</li>
            </ul>
            <p v-else class="muted">暂无特殊状态记录。</p>
          </details>
          <nav class="part-tabs" aria-label="身体部位">
            <button
              v-for="part in bodyParts"
              :key="part"
              type="button"
              :aria-pressed="selectedPart === part"
              @click="selectedPart = part"
            >
              {{ part }}
            </button>
          </nav>
          <section class="part-content">
            <h3>{{ selectedPart }} <span class="caption">当前状态</span></h3>
            <p class="prose">{{ bodyPart?.当前状态 || '暂无当前状态记录。' }}</p>
            <template v-for="field in ['特征', '开发程度'] as const" :key="field">
              <details v-if="bodyPart?.[field]" :key="`${selected.id}:${selectedPart}:${field}`">
                <summary>{{ field }}</summary>
                <p class="prose">{{ bodyPart[field] }}</p>
              </details>
            </template>
          </section>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { stat_data, 人设阶段 } from '../手机界面/types';
import { bodyParts, canReadField, presentCharacters, stageNames, statusText } from './model';

const data = ref<stat_data>();
const loading = ref(true);
const error = ref('');
const collapsed = ref(false);
const selectedId = ref('');
const page = ref<'阶段' | '身体'>('阶段');
const selectedPart = ref<(typeof bodyParts)[number]>(bodyParts[0]);
const characters = computed(() => presentCharacters(data.value));
const selectedIndex = computed(() => characters.value.findIndex(character => character.id === selectedId.value));
const selected = computed(() => characters.value[selectedIndex.value]);
const visibleStageNames = computed(() =>
  selected.value?.kind === '主要角色' ? stageNames : stageNames.filter(name => name !== '创伤稳定度'),
);
const bodyPart = computed(() => selected.value?.role.身体?.[selectedPart.value]);
const specialStates = computed(() => {
  const states = selected.value?.role.身体?.特殊状态;
  return Array.isArray(states) ? states : [];
});
const subscriptions: EventOnReturn[] = [];
let active = true;

watch(characters, list => {
  if (!list.some(character => character.id === selectedId.value)) selectedId.value = list[0]?.id ?? '';
});
watch(selectedId, () => {
  page.value = '阶段';
  selectedPart.value = bodyParts[0];
});

function stage(name: keyof 人设阶段) {
  const stages = selected.value?.role.人设阶段;
  return stages && name in stages ? (stages as Partial<人设阶段>)[name] : undefined;
}

function stageDescription(name: keyof 人设阶段): string {
  const value = stage(name);
  if (!value || !Number.isFinite(value.当前等级)) return '暂无阶段记录。';
  return value.描述?.[String(value.当前等级)] || '当前等级暂无描述。';
}

function refresh() {
  if (!active) return;
  try {
    data.value = Mvu.getMvuData({ type: 'message', message_id: getCurrentMessageId() })?.stat_data as
      | stat_data
      | undefined;
    error.value = '';
  } catch (cause) {
    data.value = undefined;
    error.value = '读取本楼层角色状态失败，请重试。';
    console.error('在场角色状态读取失败', cause);
  }
  loading.value = false;
}

onMounted(async () => {
  try {
    await waitGlobalInitialized('Mvu');
    if (!active) return;
    subscriptions.push(eventOn(Mvu.events.VARIABLE_INITIALIZED, refresh));
    subscriptions.push(eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, refresh));
    subscriptions.push(eventOn('kat_mvu_update_finished', refresh));
    refresh();
  } catch (cause) {
    if (!active) return;
    loading.value = false;
    error.value = '角色数据初始化失败，请重新加载此界面。';
    console.error('在场角色状态初始化失败', cause);
  }
});
onUnmounted(() => {
  active = false;
  subscriptions.forEach(subscription => subscription.stop());
});
</script>

<style>
html,
body,
#app {
  margin: 0;
  padding: 0;
  background: transparent;
}
</style>

<style scoped>
.presence-panel {
  width: min(100%, 520px);
  margin: 0 auto;
  border: 1px solid #55405e;
  border-radius: 14px;
  background: #211a2a;
  color: #f4eef8;
  font:
    14px/1.65 -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    'Noto Sans SC',
    sans-serif;
  overflow-wrap: anywhere;
}
.presence-panel,
.presence-panel * {
  box-sizing: border-box;
}
button,
select {
  font: inherit;
}
button,
summary,
select {
  touch-action: manipulation;
}
button {
  min-height: 44px;
  border: 0;
  color: inherit;
  background: transparent;
  cursor: pointer;
}
button:focus-visible,
select:focus-visible,
summary:focus-visible {
  outline: 2px solid #c4a5ed;
  outline-offset: -2px;
}
.panel-heading,
.character-heading,
.stage header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.panel-heading {
  padding: 0 12px;
  border-bottom: 1px solid #48364f;
}
h2,
h3,
p {
  margin: 0;
}
h2 {
  font-size: 15px;
}
h2 span,
.caption,
.rating,
.muted,
.footnote {
  color: #c3b4ce;
  font-size: 12px;
}
h2 span {
  margin-left: 5px;
  font-weight: 400;
}
.panel-heading button {
  padding: 0 10px;
  color: #d7bee9;
}
.panel-content {
  padding: 12px;
}
.character-heading {
  margin-bottom: 12px;
}
.character-picker {
  display: grid;
  gap: 3px;
  min-width: 0;
  flex: 1;
}
select {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 7px;
  border: 1px solid #695275;
  border-radius: 7px;
  background: #30243c;
  color: #f4eef8;
  text-overflow: ellipsis;
}
.rating {
  flex: 0 0 auto;
  max-width: 80px;
}
.page-tabs,
.part-tabs {
  display: grid;
  gap: 4px;
  padding: 3px;
  border-radius: 9px;
  background: #17131f;
}
.page-tabs {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.part-tabs {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 12px 0;
}
.page-tabs button,
.part-tabs button {
  min-width: 0;
  border-radius: 6px;
  padding: 4px;
}
button[aria-pressed='true'] {
  background: #513b65;
  color: #fff;
}
.stage {
  padding: 13px 0;
}
.stage + .stage {
  border-top: 1px solid #42334b;
}
h3 {
  font-size: 14px;
  font-weight: 600;
}
.stage header {
  margin-bottom: 5px;
}
.stage header span {
  font-size: 12px;
}
.trauma header {
  color: #e8ce94;
}
.affection header {
  color: #f0b1cb;
}
.corruption header {
  color: #cab1f1;
}
.prose {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.locked {
  color: #b9aac5;
  font-size: 13px;
}
.empty {
  padding: 18px 0;
  color: #c3b4ce;
}
.empty button {
  padding: 0 12px;
  margin-top: 8px;
  border-radius: 6px;
  background: #513b65;
}
.footnote {
  padding-top: 8px;
  border-top: 1px solid #42334b;
  font-size: 11px;
}
.special-status {
  margin-top: 10px;
}
summary {
  min-height: 44px;
  padding: 9px 0;
  cursor: pointer;
}
summary span {
  color: #c3b4ce;
  font-size: 12px;
  margin-left: 6px;
}
ul {
  margin: 0;
  padding-left: 20px;
}
li + li {
  margin-top: 8px;
}
.part-content h3 {
  margin-bottom: 8px;
}
.part-content h3 span {
  margin-left: 8px;
  font-weight: 400;
}
.part-content details {
  border-top: 1px solid #42334b;
  margin-top: 12px;
}
.part-content details p {
  padding-bottom: 4px;
}
</style>
