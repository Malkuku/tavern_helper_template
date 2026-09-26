<template>
  <!-- markup 已经过 SVG 白名单校验。 -->
  <!-- eslint-disable-next-line vue/no-v-html -->
  <span class="inventory-icon" aria-hidden="true" v-html="markup"></span>
</template>

<script setup lang="ts">
import { sanitizeMapSvg } from '../../../创意工坊/scenario/map';
import { computed } from 'vue';

const props = defineProps<{ svg?: string }>();
const fallback =
  '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="1.5"/></svg>';
const markup = computed(() => {
  try {
    return props.svg ? sanitizeMapSvg(props.svg) : fallback;
  } catch {
    return fallback;
  }
});
</script>
