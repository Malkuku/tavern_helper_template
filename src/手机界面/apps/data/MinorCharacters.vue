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
        <span class="minor-avatar">{{ (person.名称 || key).slice(0, 1) }}</span>
        <span class="minor-list-copy"
          ><strong>{{ person.名称 || key }}</strong
          ><small>{{ person.在场 ? '当前在场' : '当前未在场' }}</small></span
        >
        <span class="minor-presence">›</span>
      </button>
    </div>
    <template v-if="selectedMinor">
      <section class="data-hero monitor-hero minor-hero">
        <div class="hero-overline">人物信号 · {{ selectedMinor.在场 ? '在线' : '离线' }}</div>
        <h2>{{ selectedMinor.名称 || selectedMinorKey }}</h2>
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
          <h3>简介</h3>
          <p class="data-prose">{{ selectedMinor.简介 || '暂无记录' }}</p>
        </section>
      </template>
      <template v-else>
        <section class="monitor-heading">
          <span>02 / 深层档案</span>
          <h3>更多线索</h3>
          <p>重要信息需使用恶堕积分解锁</p>
        </section>
        <LockedField kind="次要角色" :character-key="selectedMinorKey!" field="性格侧写">
          <div v-for="[key, value] in entries(selectedMinor.性格)" :key="key" class="data-field">
            <span>{{ key }}</span>
            <p>{{ value }}</p>
          </div>
        </LockedField>
        <LockedField kind="次要角色" :character-key="selectedMinorKey!" field="能力描述">
          <p class="data-prose">{{ selectedMinor.能力描述 || '暂无记录' }}</p>
        </LockedField>
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
import { entries } from './entries';
import LockedField from './LockedField.vue';

const props = defineProps<{ data: stat_data }>();
const selectedKey = ref<string | null>(null);
const page = ref<'概览' | '档案'>('概览');
const minorEntries = computed(() => Object.entries(props.data.角色?.次要角色 ?? {}) as [string, 次要角色人设][]);
const selectedMinorKey = computed(() =>
  minorEntries.value.some(([key]) => key === selectedKey.value) ? selectedKey.value : minorEntries.value[0]?.[0],
);
const selectedMinor = computed(() => minorEntries.value.find(([key]) => key === selectedMinorKey.value)?.[1]);
watch(selectedMinorKey, () => {
  page.value = '概览';
});
</script>
