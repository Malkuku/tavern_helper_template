<template>
  <div class="data-intro monitor-intro">
    <span>PEOPLE OBSERVER</span>
    <h1>人物观测</h1>
  </div>
  <div v-if="minorEntries.length" class="data-sections">
    <div class="minor-list" aria-label="选择次要角色">
      <button
        v-for="[key, person] in minorEntries"
        :key="key"
        type="button"
        :class="{ active: selectedMinorKey === key }"
        @click="selectedKey = key"
      >
        <span class="minor-avatar">{{ key.slice(0, 1) }}</span>
        <span class="minor-list-copy"
          ><strong>{{ key }}</strong
          ><small>{{ person.在场 ? '当前在场' : '当前未在场' }}</small></span
        >
        <span class="minor-presence">›</span>
      </button>
    </div>
    <template v-if="selectedMinor">
      <section class="data-hero monitor-hero minor-hero">
        <div class="hero-overline">人物信号 · {{ selectedMinor.在场 ? '在线' : '离线' }}</div>
        <h2>{{ selectedMinorKey }}</h2>
        <div class="data-badges">
          <span :class="selectedMinor.在场 ? 'badge-live' : ''">{{ selectedMinor.在场 ? '在场' : '未在场' }}</span>
        </div>
      </section>
      <nav class="data-pages" aria-label="人物档案分页">
        <button type="button" :class="{ active: page === '概览' }" @click="page = '概览'">概览</button>
        <button type="button" :class="{ active: page === '档案' }" @click="page = '档案'">档案</button>
      </nav>
      <template v-if="page === '概览'">
        <section class="monitor-heading">
          <span>01 / 人物概览</span>
          <h3>当前记录</h3>
        </section>
        <section class="data-card">
          <h3>身份</h3>
          <p class="data-prose">{{ selectedMinor.身份.join('、') || '暂无记录' }}</p>
        </section>
        <section class="data-card">
          <h3>当前评级</h3>
          <p class="data-prose">{{ selectedMinor.当前评级 || '未记录' }}</p>
        </section>
        <section class="data-card">
          <h3>背景</h3>
          <p class="data-prose">{{ selectedMinor.背景 || '暂无记录' }}</p>
        </section>
        <section class="data-card">
          <h3>外貌</h3>
          <p class="data-prose">{{ selectedMinor.外貌 || '暂无记录' }}</p>
        </section>
        <section v-if="selectedMinor.人设阶段?.恶堕度" class="data-card">
          <h3>恶堕度 · 等级 {{ selectedMinor.人设阶段.恶堕度.当前等级 }}</h3>
          <p class="data-prose">{{ currentMinorCorruption || '暂无当前阶段描述' }}</p>
          <small>累计经验 {{ selectedMinor.人设阶段.恶堕度.累计经验 }}</small>
        </section>
      </template>
      <template v-else>
        <section class="monitor-heading">
          <span>02 / 深层档案</span>
          <h3>更多线索</h3>
          <p>重要信息需使用恶堕积分解锁</p>
        </section>
        <LockedField kind="次要角色" :character-key="selectedMinorKey!" field="性格侧写">
          <p class="data-prose">{{ selectedMinor.性格 || '暂无记录' }}</p>
        </LockedField>
        <LockedField kind="次要角色" :character-key="selectedMinorKey!" field="能力描述">
          <p v-for="(ability, index) in selectedMinor.能力描述" :key="index" class="data-prose">{{ ability }}</p>
          <p v-if="!selectedMinor.能力描述.length" class="data-prose">暂无记录</p>
        </LockedField>
        <section class="data-card">
          <h3>身体开发状态</h3>
          <p v-for="(state, index) in selectedMinor.身体开发状态" :key="index" class="data-prose">{{ state }}</p>
          <p v-if="!selectedMinor.身体开发状态.length" class="data-prose">暂无记录</p>
        </section>
      </template>
    </template>
  </div>
  <div v-else class="data-empty">
    <strong>暂无次要角色</strong>
    <p>故事中出现的角色会显示在这里。</p>
  </div>
</template>

<script setup lang="ts">
import type { 次要角色人设, stat_data } from '../../types';
import { computed, ref, watch } from 'vue';
import LockedField from './LockedField.vue';
import { currentLevelDescription } from './entries';
import { isDiscoveredTarget } from '../../store/discoveredTargets';

const props = defineProps<{ data: stat_data }>();
const selectedKey = ref<string | null>(null);
const page = ref<'概览' | '档案'>('概览');
const minorEntries = computed(() =>
  (Object.entries(props.data.角色?.次要角色 ?? {}) as [string, 次要角色人设][]).filter(([key]) =>
    isDiscoveredTarget(props.data, key),
  ),
);
const selectedMinorKey = computed(() =>
  minorEntries.value.some(([key]) => key === selectedKey.value) ? selectedKey.value : minorEntries.value[0]?.[0],
);
const selectedMinor = computed(() => minorEntries.value.find(([key]) => key === selectedMinorKey.value)?.[1]);
const currentMinorCorruption = computed(() => {
  const stage = selectedMinor.value?.人设阶段?.恶堕度;
  return stage ? currentLevelDescription(stage) : undefined;
});
watch(selectedMinorKey, () => {
  page.value = '概览';
});
</script>
