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
    <MapExplorer :map="entry.data" />
  </section>
</template>
<script setup lang="ts">
import type { MapEntry } from '../scenario/types';
import MapExplorer from '../../尘史使徒/UI/components/map/MapExplorer.vue';
defineProps<{ entry: MapEntry }>();
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
@media (max-width: 700px) {
  .meta {
    grid-template-columns: 1fr;
  }
  .map-editor header {
    display: block;
  }
}
</style>
