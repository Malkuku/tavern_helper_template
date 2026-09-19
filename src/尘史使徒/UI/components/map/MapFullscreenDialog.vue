<template>
  <div v-if="open" class="map-fullscreen-dialog" role="dialog" aria-modal="true" :aria-label="title">
    <header>
      <h2>{{ title }}</h2>
      <button type="button" @click="$emit('close')">关闭 ×</button>
    </header>
    <MapExplorer
      class="fullscreen-map"
      :map="map"
      :mode="mode"
      :current-location="currentLocation"
      @select="$emit('select', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import MapExplorer from './MapExplorer.vue';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    map: Record<string, any>;
    mode?: 'preview' | 'selection';
    currentLocation?: string;
  }>(),
  { mode: 'preview', currentLocation: '' },
);
const emit = defineEmits<{ close: []; select: [name: string] }>();

function closeOnEscape(event: KeyboardEvent) {
  if (props.open && event.key === 'Escape') emit('close');
}
onMounted(() => window.addEventListener('keydown', closeOnEscape));
onUnmounted(() => window.removeEventListener('keydown', closeOnEscape));
</script>

<style scoped>
.map-fullscreen-dialog {
  position: fixed !important;
  inset: 0 !important;
  z-index: 10000 !important;
  display: grid !important;
  grid-template-rows: auto minmax(0, 1fr) !important;
  width: 100vw !important;
  height: 100vh !important;
  height: 100dvh !important;
  overflow: hidden !important;
  background: #101216 !important;
}
.map-fullscreen-dialog header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 16px !important;
  padding: calc(12px + env(safe-area-inset-top)) calc(20px + env(safe-area-inset-right)) 12px
    calc(20px + env(safe-area-inset-left)) !important;
  color: #c5a059 !important;
  background: #101216 !important;
  border-bottom: 1px solid #594d31 !important;
}
.map-fullscreen-dialog h2 {
  margin: 0 !important;
  color: #c5a059 !important;
  font-size: 1rem !important;
}
.map-fullscreen-dialog button {
  padding: 7px 12px !important;
  color: #c5a059 !important;
  background: transparent !important;
  border: 1px solid currentColor !important;
  cursor: pointer !important;
}
.fullscreen-map {
  min-height: 0 !important;
}
</style>
