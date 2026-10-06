<template>
  <section class="witch-app presence-panel" data-observation-theme="refined" aria-label="在场角色状态">
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
          <ObservationAvatar :src="selected.role.meta?.avatar" />
          <label class="character-picker">
            <span class="caption">{{ selected.kind }} · {{ selectedIndex + 1 }} / {{ characters.length }}</span>
            <select
              :value="selectedId"
              aria-label="选择在场角色"
              @change="selectedId = ($event.target as HTMLSelectElement).value"
            >
              <option v-for="character in characters" :key="character.id" :value="character.id">
                {{ character.name
                }}{{
                  characters.some(other => other.id !== character.id && other.name === character.name)
                    ? ` · ${character.kind}`
                    : ''
                }}
              </option>
            </select>
          </label>
          <span class="rating">{{ selected.role.当前评级 || '评级未记录' }}</span>
        </div>
        <nav class="data-pages" aria-label="状态分类">
          <button type="button" :class="{ active: page === '阶段' }" @click="page = '阶段'">阶段</button>
          <button type="button" :class="{ active: page === '身体' }" @click="page = '身体'">身体</button>
        </nav>
        <div v-if="page === '阶段'" class="data-sections">
          <section class="monitor-heading">
            <span>01 / 当前状态</span>
            <h3>心象状态</h3>
          </section>
          <section v-for="name in visibleStageNames" :key="name" class="data-card observation-stage" :data-stage="name">
            <div v-if="!canReadField(data, selected, name) || !stage(name)" class="item-heading">
              <StageHelp :kind="name" />
              <span :class="canReadField(data, selected, name) ? 'unlock-mark' : 'lock-mark'">{{
                canReadField(data, selected, name) ? '已解锁' : '未解锁'
              }}</span>
            </div>
            <p v-if="!canReadField(data, selected, name)" class="lock-caption">未解锁 · 请在手机观测中解锁</p>
            <ObservationStageContent
              v-else-if="stage(name)"
              :stage="stage(name)!"
              :kind="name"
              :rating="selected.role.当前评级"
              titled
            />
            <p v-else class="data-prose">暂无阶段记录。</p>
          </section>
        </div>
        <div v-else-if="!canReadField(data, selected, '身体状态')" class="empty locked">
          身体状态未解锁 · 请在手机观测中解锁
        </div>
        <div v-else class="data-sections body-unlock">
          <section class="monitor-heading">
            <span>02 / 状态观测</span>
            <h3>身体状态</h3>
          </section>
          <section v-if="specialStates.length" class="data-card">
            <h3>特殊状态</h3>
            <p class="data-prose">{{ specialStates.map(statusText).join('、') }}</p>
          </section>
          <ObservationBodyCard
            v-for="part in bodyParts"
            :key="`${selected.id}:${part}`"
            :name="part"
            :part="selected.role.身体?.[part]"
            :expanded="expandedBodyParts.includes(part)"
            @toggle="toggleBodyPart(part)"
          />
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { stat_data, 人设阶段 } from '../手机界面/types';
import '../手机界面/apps/witch/witch.css';
import ObservationStageContent from '../手机界面/apps/data/ObservationStageContent.vue';
import ObservationBodyCard from '../手机界面/apps/data/ObservationBodyCard.vue';
import StageHelp from '../手机界面/apps/data/StageHelp.vue';
import ObservationAvatar from '../手机界面/apps/data/ObservationAvatar.vue';
import { bodyParts, canReadField, presentCharacters, stageNames, statusText } from './model';

const data = ref<stat_data>();
const loading = ref(true);
const error = ref('');
const collapsed = ref(false);
const selectedId = ref('');
const page = ref<'阶段' | '身体'>('阶段');
const expandedBodyParts = ref<string[]>([]);
const characters = computed(() => presentCharacters(data.value));
const selectedIndex = computed(() => characters.value.findIndex(character => character.id === selectedId.value));
const selected = computed(() => characters.value[selectedIndex.value]);
const visibleStageNames = computed(() =>
  selected.value?.kind === '主要角色' ? stageNames : stageNames.filter(name => name !== '创伤稳定度'),
);
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
  expandedBodyParts.value = [];
});

function stage(name: keyof 人设阶段) {
  const stages = selected.value?.role.人设阶段;
  return stages && name in stages ? (stages as Partial<人设阶段>)[name] : undefined;
}

watch(page, () => {
  expandedBodyParts.value = [];
});
function toggleBodyPart(part: string) {
  expandedBodyParts.value = expandedBodyParts.value.includes(part)
    ? expandedBodyParts.value.filter(name => name !== part)
    : [...expandedBodyParts.value, part];
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
  box-sizing: border-box;
  width: min(100%, 520px);
  margin: 0 auto;
  height: auto;
  overflow: visible;
  border: 1px solid var(--witch-line);
  border-radius: 14px;
  font-size: 14px;
  overflow-wrap: anywhere;
}
.panel-heading,
.character-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.panel-heading {
  padding: 0 12px;
  border-bottom: 1px solid var(--witch-line);
}
.panel-heading h2 {
  margin: 0;
  font-size: 15px;
}
.panel-heading span,
.caption,
.rating {
  color: var(--witch-muted);
  font-size: 12px;
}
.panel-heading button {
  min-height: 44px;
  padding: 0 10px;
  border-radius: 7px;
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
  text-overflow: ellipsis;
}
.rating {
  flex: 0 0 auto;
  max-width: 80px;
}
.empty {
  padding: 18px 0;
  color: var(--witch-muted);
}
.empty button {
  min-height: 44px;
  padding: 0 12px;
  border-radius: 7px;
}
</style>
