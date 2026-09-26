<template>
  <div class="data-intro monitor-intro">
    <span>PERSONA MONITOR</span>
    <h1>心象监测</h1>
  </div>
  <div v-if="mainEntries.length" class="data-selector" aria-label="选择主要角色">
    <button
      v-for="[key] in mainEntries"
      :key="key"
      type="button"
      :class="{ active: selectedMainKey === key }"
      @click="selectedKey = key"
    >
      <span class="selector-avatar">{{ key.slice(0, 1) }}</span
      ><span>{{ key }}</span>
    </button>
  </div>
  <div v-if="selectedMain" class="data-sections">
    <section class="data-hero monitor-hero">
      <div class="hero-overline">实时观测 · {{ selectedMain.在场 ? '信号在线' : '信号离线' }}</div>
      <h2>{{ selectedMainKey }}</h2>
      <div class="data-badges">
        <span :class="selectedMain.在场 ? 'badge-live' : ''">{{ selectedMain.在场 ? '在场' : '未在场' }}</span
        ><span>{{ selectedMain.是否变身魔法少女 ? '魔法少女形态' : '日常形态' }}</span>
      </div>
    </section>
    <nav class="data-pages" aria-label="角色档案分页">
      <button v-for="item in pages" :key="item" type="button" :class="{ active: page === item }" @click="page = item">
        {{ item }}
      </button>
    </nav>
    <template v-if="page === '心象'">
      <section class="monitor-heading">
        <span>01 / 当前心象</span>
        <h3>心象状态</h3>
      </section>
      <section v-for="[key, stage] in stageEntries" :key="key" class="data-card monitor-card">
        <div class="monitor-card-head">
          <strong>{{ key }}</strong
          ><span>等级 {{ stage.当前等级 }}</span>
        </div>
        <p class="data-prose">{{ currentLevelDescription(stage) || '暂无记录' }}</p>
        <small>累计经验 {{ stage.累计经验 }}</small>
      </section>
    </template>
    <template v-else-if="page === '身体'">
      <section class="monitor-heading">
        <span>02 / 状态观测</span>
        <h3>身体状态</h3>
      </section>
      <section v-if="selectedMain.身体.特殊状态?.length" class="data-card">
        <h3>特殊状态</h3>
        <p class="data-prose">{{ selectedMain.身体.特殊状态.map(formatValue).join('、') }}</p>
      </section>
      <section v-for="[key, part] in bodyEntries" :key="key" class="data-card monitor-card">
        <div class="monitor-card-head">
          <strong>{{ key }}</strong
          ><span>等级 {{ part.当前等级 }}</span>
        </div>
        <p class="monitor-state">{{ part.当前状态 }}</p>
        <p v-if="part.特征" class="data-prose">{{ part.特征 }}</p>
        <p v-if="currentLevelDescription(part)" class="data-prose">{{ currentLevelDescription(part) }}</p>
      </section>
    </template>
    <template v-else>
      <section class="monitor-heading">
        <span>03 / 人物档案</span>
        <h3>档案线索</h3>
        <p>重要信息需使用恶堕积分解锁</p>
      </section>
      <section class="data-card">
        <h3>基础信息</h3>
        <p class="data-prose">{{ selectedMain.基础信息 || '暂无记录' }}</p>
      </section>
      <section class="data-card">
        <h3>整体印象</h3>
        <p class="data-prose">{{ selectedMain.外貌.整体印象 || '暂无记录' }}</p>
      </section>
      <LockedField kind="主要角色" :character-key="selectedMainKey!" field="日常外貌"
        ><p class="data-prose">{{ selectedMain.外貌.日常外貌 || '暂无记录' }}</p></LockedField
      >
      <LockedField kind="主要角色" :character-key="selectedMainKey!" field="魔法形态"
        ><p class="data-prose">{{ selectedMain.外貌.魔法少女形态.正常 || '暂无记录' }}</p></LockedField
      >
      <LockedField kind="主要角色" :character-key="selectedMainKey!" field="性格"
        ><p class="data-prose">{{ selectedMain.性格 || '暂无记录' }}</p></LockedField
      >
      <LockedField kind="主要角色" :character-key="selectedMainKey!" field="背景"
        ><p class="data-prose">{{ selectedMain.背景 || '暂无记录' }}</p></LockedField
      >
      <LockedField kind="主要角色" :character-key="selectedMainKey!" field="核心能力">
        <p class="data-prose">{{ selectedMain.魔法少女能力.核心能力 || '暂无记录' }}</p>
        <div v-for="[key, value] in entries(selectedMain.魔法少女能力.核心能力限制)" :key="key" class="data-field">
          <span>{{ key }}</span>
          <p>{{ value }}</p>
        </div>
      </LockedField>
      <LockedField kind="主要角色" :character-key="selectedMainKey!" field="核心创伤"
        ><p class="data-prose">{{ selectedMain.核心创伤 || '暂无记录' }}</p></LockedField
      >
    </template>
  </div>
  <div v-else class="data-empty"><strong>暂无主要角色</strong></div>
</template>

<script setup lang="ts">
import type { 角色人设, stat_data } from '../../types';
import { computed, ref, watch } from 'vue';
import { currentLevelDescription, entries } from './entries';
import LockedField from './LockedField.vue';

const props = defineProps<{ data: stat_data }>();
const selectedKey = ref<string | null>(null);
const pages = ['心象', '身体', '档案'] as const;
const page = ref<(typeof pages)[number]>('心象');
const mainEntries = computed(() => Object.entries(props.data.角色?.主要角色 ?? {}) as [string, 角色人设][]);
const selectedMainKey = computed(() =>
  mainEntries.value.some(([key]) => key === selectedKey.value) ? selectedKey.value : mainEntries.value[0]?.[0],
);
const selectedMain = computed(() => mainEntries.value.find(([key]) => key === selectedMainKey.value)?.[1]);
const stageEntries = computed(() => entries(selectedMain.value?.人设阶段));
const bodyEntries = computed(() => entries(selectedMain.value?.身体?.开发状态));
watch(selectedMainKey, () => {
  page.value = '心象';
});
function formatValue(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}
</script>
