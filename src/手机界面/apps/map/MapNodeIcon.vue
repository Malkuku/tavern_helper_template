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
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>';
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
