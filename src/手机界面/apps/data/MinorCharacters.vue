<template>
  <div class="data-intro">
    <span>人物图鉴</span>
    <h1>次要角色</h1>
    <p>随故事展开的人物记录</p>
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
          ><small>{{ person.简介 || '暂无简介' }}</small></span
        >
        <span class="minor-presence">{{ person.在场 ? '在场' : '未在场' }}</span>
      </button>
    </div>
    <template v-if="selectedMinor">
      <section class="data-hero minor-hero">
        <div class="hero-overline">人物档案</div>
        <h2>{{ selectedMinor.名称 || selectedMinorKey }}</h2>
        <div class="data-badges">
          <span :class="selectedMinor.在场 ? 'badge-live' : ''">{{ selectedMinor.在场 ? '在场' : '未在场' }}</span>
        </div>
      </section>
      <section v-if="selectedMinor.简介" class="data-card">
        <h3>简介</h3>
        <p class="data-prose">{{ selectedMinor.简介 }}</p>
      </section>
      <section v-if="selectedMinor.性格" class="data-card">
        <h3>性格侧写</h3>
        <div v-for="[key, value] in entries(selectedMinor.性格)" :key="key" class="data-field">
          <span>{{ key }}</span>
          <p>{{ value }}</p>
        </div>
      </section>
      <section v-if="selectedMinor.能力描述" class="data-card">
        <h3>能力描述</h3>
        <p class="data-prose">{{ selectedMinor.能力描述 }}</p>
      </section>
    </template>
  </div>
  <div v-else class="data-empty">
    <strong>暂无次要角色</strong>
    <p>故事中出现的角色会显示在这里。</p>
  </div>
</template>

<script setup lang="ts">
import type { 次要角色人设, stat_data } from '../../types';
import { computed, ref } from 'vue';
import { entries } from './entries';

const props = defineProps<{ data: stat_data }>();
const selectedKey = ref<string | null>(null);
const minorEntries = computed(() => Object.entries(props.data.角色?.次要角色 ?? {}) as [string, 次要角色人设][]);
const selectedMinorKey = computed(() =>
  minorEntries.value.some(([key]) => key === selectedKey.value) ? selectedKey.value : minorEntries.value[0]?.[0],
);
const selectedMinor = computed(() => minorEntries.value.find(([key]) => key === selectedMinorKey.value)?.[1]);
</script>
