<template>
  <!-- SVG 已经通过地图安全白名单校验。 -->
  <!-- eslint-disable-next-line vue/no-v-html -->
  <span class="phone-map-svg" aria-hidden="true" v-html="markup"></span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { sanitizeMapSvg } from '../../../创意工坊/scenario/map';

const props = defineProps<{ svg?: string }>();
const fallback =
  '<svg viewBox="0 0 24 24"><path d="M12 22c-2.1-2.7-7-8.1-7-13a7 7 0 0 1 14 0c0 4.9-4.9 10.3-7 13Z" fill="#2785e8"/><circle cx="12" cy="9" r="3" fill="#fff"/></svg>';
const markup = computed(() => {
  try {
    return props.svg ? sanitizeMapSvg(props.svg) : fallback;
  } catch {
    return fallback;
  }
});
</script>

<style scoped>
.phone-map-svg,
.phone-map-svg :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
