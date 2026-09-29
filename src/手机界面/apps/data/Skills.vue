<template>
  <div class="data-intro">
    <span>能力记录</span>
    <h1>技能</h1>
    <p>当前持有的完整技能效果 · 技能栏位 {{ skillEntries.length }} / {{ slots }}</p>
  </div>
  <div v-if="skillEntries.length" class="data-sections">
    <OwnedAssetCard
      v-for="[name, skill] in skillEntries"
      :key="name"
      :name="name"
      :entry="skill"
      kind="技能"
      :expanded="expandedName === name"
      @toggle="expandedName = expandedName === name ? '' : name"
    />
  </div>
  <div v-else class="data-empty">
    <strong>暂无技能</strong>
    <p>已习得的技能会显示在这里。</p>
  </div>
</template>

<script setup lang="ts">
import type { 技能, stat_data } from '../../types';
import { computed, ref } from 'vue';
import OwnedAssetCard from './OwnedAssetCard.vue';
import { skillSlotCount } from '../skillShop/skillShop';

const props = defineProps<{ data: stat_data }>();
const skillEntries = computed(() => Object.entries(props.data.角色?.user?.技能 ?? {}) as [string, 技能][]);
const slots = computed(() => skillSlotCount(props.data));
const expandedName = ref('');
</script>
