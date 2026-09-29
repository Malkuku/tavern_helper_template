<template>
  <span
    class="inventory-icon"
    :class="kind === '技能' ? 'inventory-icon-skill' : 'inventory-icon-item'"
    aria-hidden="true"
  >
    <svg v-if="kind === '技能'" class="inventory-icon-backdrop" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="17" stroke="currentColor" stroke-opacity=".5" />
      <circle cx="20" cy="20" r="12" stroke="currentColor" stroke-opacity=".35" />
      <path
        d="M20 1v7M20 32v7M1 20h7M32 20h7M7 7l5 5m16 16 5 5M33 7l-5 5M12 28l-5 5"
        stroke="currentColor"
        stroke-opacity=".55"
      />
      <path d="m20 11 3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6Z" fill="currentColor" fill-opacity=".12" />
    </svg>
    <svg v-else class="inventory-icon-backdrop" viewBox="0 0 40 40" fill="none">
      <path d="M7 10 20 3l13 7v20l-13 7-13-7V10Z" stroke="currentColor" stroke-opacity=".55" />
      <path d="m7 10 13 7 13-7M20 17v20M13 6l14 8M13 25l7 4 7-4" stroke="currentColor" stroke-opacity=".35" />
    </svg>
    <!-- markup 已经过 SVG 白名单校验。 -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <span class="inventory-icon-glyph" v-html="markup"></span>
  </span>
</template>

<script setup lang="ts">
import { sanitizeMapSvg } from '../../../创意工坊/scenario/map';
import { computed } from 'vue';

const props = defineProps<{ svg?: string; kind: '技能' | '道具' }>();
const fallbacks = {
  技能: '<svg viewBox="0 0 24 24"><path d="m12 2 2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3L12 2Z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  道具: '<svg viewBox="0 0 24 24"><path d="M5 8h14v12H5V8ZM8 8V5a4 4 0 0 1 8 0v3M9 13h6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
} as const;
const markup = computed(() => {
  try {
    return props.svg ? sanitizeMapSvg(props.svg) : fallbacks[props.kind];
  } catch {
    return fallbacks[props.kind];
  }
});
</script>

<style scoped>
.inventory-icon {
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  width: 38px;
  height: 38px;
  overflow: hidden;
  border: 1px solid #8c5072;
  border-radius: 11px;
  background: #3b2036;
  color: #f9b6d1;
}
.inventory-icon-skill {
  border-color: #aa75c5;
  background: #392445;
  color: #d8aeef;
}
.inventory-icon-item {
  border-color: #bc8b68;
  background: #3d2b2c;
  color: #f0c097;
}
.inventory-icon-backdrop {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.inventory-icon-glyph {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 27px;
  height: 27px;
}
.inventory-icon-glyph :deep(svg) {
  display: block;
  width: 27px;
  height: 27px;
}
</style>
