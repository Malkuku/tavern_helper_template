<template>
  <div class="data-intro">
    <span>魔法少女档案</span>
    <h1>主要角色</h1>
    <p>选择角色查看状态与人设</p>
  </div>
  <div v-if="mainEntries.length" class="data-selector" aria-label="选择主要角色">
    <button
      v-for="[key, person] in mainEntries"
      :key="key"
      type="button"
      :class="{ active: selectedMainKey === key }"
      @click="selectedKey = key"
    >
      <span class="selector-avatar">{{ person.基础信息?.姓名?.slice(0, 1) || key.slice(0, 1) }}</span>
      <span>{{ person.基础信息?.姓名 || key }}</span>
    </button>
  </div>
  <div v-if="selectedMain" class="data-sections">
    <section class="data-hero">
      <div class="hero-overline">{{ selectedMain.基础信息?.身份 || '角色档案' }}</div>
      <h2>{{ selectedMain.基础信息?.姓名 || selectedMainKey }}</h2>
      <div class="data-badges">
        <span :class="selectedMain.在场 ? 'badge-live' : ''">{{ selectedMain.在场 ? '在场' : '未在场' }}</span>
        <span>{{ selectedMain.是否变身魔法少女 ? '魔法少女形态' : '日常形态' }}</span>
        <span v-if="selectedMain.基础信息?.性别">{{ selectedMain.基础信息.性别 }}</span>
      </div>
    </section>

    <section v-if="selectedMain.基础信息?.姐姐" class="data-card">
      <h3>人物关系</h3>
      <p class="data-prose">姐姐：{{ selectedMain.基础信息.姐姐 }}</p>
    </section>
    <section v-if="selectedMain.外貌" class="data-card">
      <h3>外貌与形态</h3>
      <div v-if="selectedMain.外貌.整体印象" class="data-field">
        <span>整体印象</span>
        <p>{{ selectedMain.外貌.整体印象 }}</p>
      </div>
      <div v-if="selectedMain.外貌.日常外貌" class="data-field">
        <span>日常外貌</span>
        <p>{{ selectedMain.外貌.日常外貌 }}</p>
      </div>
      <div v-if="selectedMain.外貌.魔法少女形态?.正常" class="data-field">
        <span>魔法少女</span>
        <p>{{ selectedMain.外貌.魔法少女形态.正常 }}</p>
      </div>
      <div v-if="selectedMain.外貌.魔法少女形态?.恶堕" class="data-field">
        <span>恶堕形态</span>
        <p>{{ selectedMain.外貌.魔法少女形态.恶堕 }}</p>
      </div>
    </section>
    <section v-if="selectedMain.性格 || selectedMain.背景 || selectedMain.核心创伤" class="data-card">
      <h3>人物故事</h3>
      <div v-if="selectedMain.性格" class="data-field">
        <span>性格</span>
        <p>{{ selectedMain.性格 }}</p>
      </div>
      <div v-if="selectedMain.背景" class="data-field">
        <span>背景</span>
        <p>{{ selectedMain.背景 }}</p>
      </div>
      <div v-if="selectedMain.核心创伤" class="data-field">
        <span>核心创伤</span>
        <p>{{ selectedMain.核心创伤 }}</p>
      </div>
    </section>
    <section v-if="selectedMain.魔法少女能力" class="data-card">
      <h3>魔法少女能力</h3>
      <div v-if="selectedMain.魔法少女能力.基础能力" class="data-field">
        <span>基础能力</span>
        <p>{{ selectedMain.魔法少女能力.基础能力 }}</p>
      </div>
      <div v-if="selectedMain.魔法少女能力.核心能力" class="data-field">
        <span>核心能力</span>
        <p>{{ selectedMain.魔法少女能力.核心能力 }}</p>
      </div>
      <div v-for="[key, value] in entries(selectedMain.魔法少女能力.核心能力限制)" :key="key" class="data-field">
        <span>{{ key }}</span>
        <p>{{ value }}</p>
      </div>
    </section>
    <section v-if="selectedMain.人设阶段" class="data-card">
      <h3>当前阶段</h3>
      <div v-for="[key, stage] in entries(selectedMain.人设阶段)" :key="key" class="stage-row">
        <div>
          <strong>{{ key }}</strong
          ><small>累计经验 {{ stage.累计经验 }}</small>
        </div>
        <span class="stage-level">Lv. {{ stage.当前等级 }}</span>
        <p v-if="stage.描述?.[String(stage.当前等级)]">{{ stage.描述[String(stage.当前等级)] }}</p>
      </div>
    </section>
    <section v-if="selectedMain.身体" class="data-card">
      <h3>身体状态</h3>
      <div v-if="selectedMain.身体.特殊状态?.length" class="data-field">
        <span>特殊状态</span>
        <p>{{ selectedMain.身体.特殊状态.map(formatValue).join('、') }}</p>
      </div>
      <details v-for="[key, part] in entries(selectedMain.身体.开发状态)" :key="key" class="data-details">
        <summary>
          <span>{{ key }}</span
          ><small>Lv. {{ part.当前等级 }} · {{ part.当前状态 }}</small>
        </summary>
        <div class="data-field">
          <span>累计经验</span>
          <p>{{ part.累计经验 }}</p>
        </div>
        <div v-if="part.特征" class="data-field">
          <span>特征</span>
          <p>{{ part.特征 }}</p>
        </div>
        <div v-for="[label, value] in entries(part.描述)" :key="label" class="data-field">
          <span>{{ label }}</span>
          <p>{{ value }}</p>
        </div>
      </details>
    </section>
  </div>
  <div v-else class="data-empty"><strong>暂无主要角色</strong></div>
</template>

<script setup lang="ts">
import type { 角色人设, stat_data } from '../../types';
import { computed, ref } from 'vue';
import { entries } from './entries';

const props = defineProps<{ data: stat_data }>();
const selectedKey = ref<string | null>(null);
const mainEntries = computed(() => Object.entries(props.data.角色?.主要角色 ?? {}) as [string, 角色人设][]);
const selectedMainKey = computed(() =>
  mainEntries.value.some(([key]) => key === selectedKey.value) ? selectedKey.value : mainEntries.value[0]?.[0],
);
const selectedMain = computed(() => mainEntries.value.find(([key]) => key === selectedMainKey.value)?.[1]);
function formatValue(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}
</script>
