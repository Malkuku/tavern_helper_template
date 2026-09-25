<template>
  <div class="data-intro">
    <span>{{ app === '随身物品' ? '个人持有' : '公共存放' }}</span>
    <h1>{{ app }}</h1>
    <p>{{ app === '随身物品' ? '随身携带的物品' : '仓库中的物品' }}</p>
  </div>
  <div v-if="itemEntries.length" class="data-sections">
    <section v-for="[name, item] in itemEntries" :key="name" class="data-card item-card">
      <div class="item-heading">
        <h3>{{ name }}</h3>
        <span class="item-count">× {{ item.数量 }}</span>
      </div>
      <p v-if="item.描述" class="data-prose">{{ item.描述 }}</p>
      <div v-if="item.作用" class="item-effect">
        <span>作用</span>
        <p>{{ item.作用 }}</p>
      </div>
    </section>
  </div>
  <div v-else class="data-empty">
    <strong>{{ app === '随身物品' ? '暂无随身物品' : '仓库为空' }}</strong>
  </div>
</template>

<script setup lang="ts">
import type { 物品, stat_data } from '../../types';
import { computed } from 'vue';

const props = defineProps<{ data: stat_data; app: '随身物品' | '仓库' }>();
const itemEntries = computed(
  () =>
    Object.entries(props.app === '仓库' ? (props.data.仓库 ?? {}) : (props.data.角色?.user?.物品 ?? {})) as [
      string,
      物品,
    ][],
);
</script>
