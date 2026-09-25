<template>
  <svg class="data-app-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <template v-if="kind === '主要角色'">
      <path d="M24 7.5 27.6 18l10.9 3.2-10.9 3.3L24 35l-3.6-10.5-10.9-3.3L20.4 18 24 7.5Z" />
      <path d="m35.5 31 1.5 4.5 4.5 1.5-4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5 1.5-4.5Z" />
    </template>
    <template v-else-if="kind === '次要角色'">
      <circle cx="18" cy="17" r="5" />
      <circle cx="31" cy="19" r="4" />
      <path d="M8 36c0-6 4.4-10 10-10s10 4 10 10M27 28c5.7-1.3 12 2.5 13 8" />
    </template>
    <template v-else-if="kind === '我的档案'">
      <rect x="10" y="7" width="28" height="34" rx="5" />
      <circle cx="24" cy="19" r="5" />
      <path d="M16 33c1.3-3.7 4-5.5 8-5.5s6.7 1.8 8 5.5" />
    </template>
    <template v-else-if="kind === '技能'">
      <path d="m24 6 3.6 11.3L39 21l-11.4 3.7L24 36l-3.6-11.3L9 21l11.4-3.7L24 6Z" />
      <path d="M12 35v7m-3.5-3.5h7M36 34v8m-4-4h8" />
    </template>
    <template v-else-if="kind === '随身物品'">
      <rect x="8" y="16" width="32" height="25" rx="5" />
      <path d="M17 16v-4a7 7 0 0 1 14 0v4M8 25h32M24 25v7" />
    </template>
    <template v-else-if="kind === '仓库'">
      <path d="m6 18 18-10 18 10v22H6V18Z" />
      <path d="M17 40V25h14v15M6 20h36M22 31h4" />
    </template>
  </svg>
</template>

<script setup lang="ts">
defineProps<{ kind: '主要角色' | '次要角色' | '我的档案' | '技能' | '随身物品' | '仓库' }>();
</script>

<style scoped>
.data-app-icon {
  width: 38px;
  height: 38px;
  stroke: currentColor;
  stroke-width: 2.1;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
