<template>
  <div class="data-intro">
    <span>能力记录</span>
    <h1>技能</h1>
    <p>当前持有的完整技能效果</p>
  </div>
  <div v-if="skillEntries.length" class="data-sections">
    <section v-for="[name, skill] in skillEntries" :key="name" class="data-card skill-card">
      <button
        type="button"
        class="item-heading entry-toggle"
        :aria-expanded="expandedName === name"
        @click="expandedName = expandedName === name ? '' : name"
      >
        <div>
          <div class="skill-title">
            <InventoryIcon :svg="skill.图标" kind="技能" />
            <h3>{{ name }}</h3>
          </div>
        </div>
        <span class="entry-toggle-tail"
          ><span class="stage-level">{{ skill.适用评级 }}</span
          ><span aria-hidden="true">{{ expandedName === name ? '⌃' : '⌄' }}</span></span
        >
      </button>
      <div v-if="expandedName === name" class="entry-details">
        <p class="data-prose">{{ skill.描述 }}</p>
        <div class="item-effect">
          <span>作用</span>
          <p>{{ skill.作用 }}</p>
        </div>
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
import { computed, ref } from 'vue';
import InventoryIcon from './InventoryIcon.vue';

const props = defineProps<{ data: stat_data }>();
const skillEntries = computed(() => Object.entries(props.data.角色?.user?.技能 ?? {}) as [string, 技能][]);
const expandedName = ref('');
</script>
