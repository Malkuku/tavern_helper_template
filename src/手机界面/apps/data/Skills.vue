<template>
  <div class="data-intro">
    <span>能力记录</span>
    <h1>技能</h1>
    <p>当前等级与各级效果</p>
  </div>
  <div v-if="skillEntries.length" class="data-sections">
    <section v-for="[name, skill] in skillEntries" :key="name" class="data-card skill-card">
      <div class="item-heading">
        <div>
          <span class="item-kicker">已习得技能</span>
          <h3>{{ name }}</h3>
        </div>
        <span class="stage-level">Lv. {{ skill.当前等级 }}</span>
      </div>
      <div
        v-for="[level, info] in entries(skill.等级表)"
        :key="level"
        class="skill-level"
        :class="{ current: String(skill.当前等级) === level }"
      >
        <div class="skill-level-head">
          <strong>等级 {{ level }}</strong
          ><span v-if="String(skill.当前等级) === level">当前</span>
        </div>
        <p>{{ info.描述 }}</p>
        <small>战力评分 {{ info.战力评分 }} · 升级消耗 {{ info.升级消耗 }}</small>
      </div>
    </section>
  </div>
  <div v-else class="data-empty">
    <strong>暂无技能</strong>
    <p>已习得的技能会显示在这里。</p>
  </div>
</template>

<script setup lang="ts">
import type { 技能, stat_data } from '../../types';
import { computed } from 'vue';
import { entries } from './entries';

const props = defineProps<{ data: stat_data }>();
const skillEntries = computed(() => Object.entries(props.data.角色?.user?.技能 ?? {}) as [string, 技能][]);
</script>
