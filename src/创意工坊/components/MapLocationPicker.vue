<template>
  <div v-if="open" class="overlay">
    <header>
      <button @click="$emit('close')">← 返回剧本</button>
      <h2>选择初始地点</h2>
    </header>
    <MapExplorer :map="map" mode="selection" @select="select" />
  </div>
</template>
<script setup lang="ts">
import MapExplorer from '../../尘史使徒/UI/components/map/MapExplorer.vue';
defineProps<{ open: boolean; map: Record<string, any> }>();
const emit = defineEmits<{ close: []; select: [name: string] }>();
function select(name: string) {
  emit('select', name);
  emit('close');
}
</script>
<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: #101216;
}
.overlay header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  color: #c5a059;
  border-bottom: 1px solid #594d31;
}
.overlay :deep(.vision) {
  height: calc(100% - 65px);
}
</style>
