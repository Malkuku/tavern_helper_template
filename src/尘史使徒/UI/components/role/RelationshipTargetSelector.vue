<template>
  <div class="npc-selector-bar">
    <button
      v-for="target in targets"
      :key="target"
      type="button"
      class="npc-tab"
      :class="{ active: target === modelValue }"
      @click="$emit('update:modelValue', target)"
    >
      <span class="npc-name">{{ labelFor(target) }}</span
      ><span v-if="editable" class="remove-npc-btn" title="移除关系" @click.stop="$emit('remove', target)">×</span>
    </button>
    <label v-if="editable && allowAdd && availableOptions.length" class="add-npc-btn"
      ><span class="icon">＋</span><span>添加关系</span
      ><select :value="''" aria-label="添加关系对象" @change="add($event.target as HTMLSelectElement)">
        <option value="" disabled>选择对象</option>
        <option v-for="option in availableOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
      </select></label
    >
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
export interface RelationshipTargetOption {
  id: string;
  label: string;
}
const props = withDefaults(
  defineProps<{
    modelValue?: string;
    targets: string[];
    options?: RelationshipTargetOption[];
    editable?: boolean;
    allowAdd?: boolean;
  }>(),
  { modelValue: '', options: () => [], editable: false, allowAdd: true },
);
const emit = defineEmits<{ 'update:modelValue': [value: string]; add: [value: string]; remove: [value: string] }>();
const availableOptions = computed(() => props.options.filter(option => !props.targets.includes(option.id)));
const labelFor = (id: string) => props.options.find(option => option.id === id)?.label || id;
function add(select: HTMLSelectElement) {
  if (!select.value) return;
  emit('add', select.value);
  emit('update:modelValue', select.value);
  select.value = '';
}
</script>

<style scoped>
.npc-selector-bar {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  border-bottom: 1px solid #333;
  white-space: nowrap;
  scrollbar-width: none;
}
.npc-selector-bar::-webkit-scrollbar {
  display: none;
}
.npc-tab,
.add-npc-btn {
  position: relative;
  top: 1px;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 12px;
  min-width: 120px;
  box-sizing: border-box;
  padding: 10px 16px;
  border: 1px solid #333;
  border-bottom: 0;
  border-radius: 6px 6px 0 0;
  color: #aaa;
  background: rgba(20, 20, 20, 0.8);
  cursor: pointer;
}
.npc-tab.active {
  color: var(--c-gold, #c5a059);
  background: #111;
  border-color: var(--c-gold, #c5a059);
  box-shadow: 0 -2px 10px rgba(197, 160, 89, 0.1);
}
.npc-tab.active::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 2px;
  content: '';
  background: var(--c-gold, #c5a059);
}
.npc-name {
  overflow: hidden;
  max-width: 120px;
  font-weight: 500;
  text-overflow: ellipsis;
}
.remove-npc-btn {
  display: grid;
  width: 24px;
  height: 24px;
  margin-left: auto;
  place-items: center;
  color: #888;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 50%;
}
.remove-npc-btn:hover {
  color: #fff;
  background: var(--c-danger, #a7473f);
}
.add-npc-btn {
  border-style: dashed;
}
.add-npc-btn select {
  max-width: 150px;
  color: #ddd;
  background: #111;
  border: 1px solid #444;
}
</style>
