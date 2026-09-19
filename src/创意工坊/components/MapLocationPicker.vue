<template>
  <MapFullscreenDialog
    :open="open"
    :map="map"
    title="选择初始地点"
    mode="selection"
    @close="$emit('close')"
    @select="select"
  />
</template>
<script setup lang="ts">
import MapFullscreenDialog from '../../尘史使徒/UI/components/map/MapFullscreenDialog.vue';
defineProps<{ open: boolean; map: Record<string, any> }>();
const emit = defineEmits<{ close: []; select: [name: string] }>();
function select(name: string) {
  emit('select', name);
  emit('close');
}
</script>
