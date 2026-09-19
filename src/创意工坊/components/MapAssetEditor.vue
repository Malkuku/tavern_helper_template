<template>
  <section class="map-editor">
    <header>
      <div>
        <small>MAP ASSET</small>
        <h3>{{ entry.desc || '未命名地图' }}</h3>
      </div>
      <span>地图节点只能通过 JSON 往返编辑</span>
    </header>
    <div class="meta">
      <label>作者<input :value="entry.author" readonly /></label
      ><label>简介<input :value="entry.desc" readonly /></label>
    </div>
    <button class="preview-button" type="button" @click="previewOpen = true">全屏预览地图</button>
    <MapFullscreenDialog
      :open="previewOpen"
      :map="entry.data"
      :title="entry.desc || '地图预览'"
      @close="previewOpen = false"
    />
  </section>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import type { MapEntry } from '../scenario/types';
import MapFullscreenDialog from '../../尘史使徒/UI/components/map/MapFullscreenDialog.vue';
defineProps<{ entry: MapEntry }>();
const previewOpen = ref(false);
</script>
<style scoped>
.map-editor {
  display: grid;
  gap: 12px;
}
.map-editor header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.map-editor header small {
  color: #cbb477;
}
.map-editor header h3 {
  margin: 3px 0;
}
.map-editor header span {
  color: #888;
}
.meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.meta label {
  display: grid;
  gap: 4px;
}
.preview-button {
  min-height: 42px;
  color: #cbb477;
  background: #17191f;
  border: 1px solid #594d31;
  cursor: pointer;
}
@media (max-width: 700px) {
  .meta {
    grid-template-columns: 1fr;
  }
  .map-editor header {
    display: block;
  }
}
</style>
