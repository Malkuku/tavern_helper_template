<template><span class="map-svg-icon" aria-hidden="true" v-html="safeSvg"></span></template>
<script setup lang="ts">
import { computed } from 'vue';
import { renderMapSvg } from '../../../../创意工坊/scenario/map';
const props = defineProps<{ svg: string }>();
const safeSvg = computed(() => {
  try {
    return renderMapSvg(props.svg);
  } catch {
    return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 0 1 4.7.7c0 1.8-2.5 2.1-2.5 4.3M12 17h.01"/></svg>';
  }
});
</script>
<style scoped>
.map-svg-icon,
.map-svg-icon :deep(svg) {
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  max-height: none !important;
}
</style>
