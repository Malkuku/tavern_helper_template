<template>
  <section class="string-field" :class="{ active }" @click="active = true">
    <header>
      <span>{{ label }}</span
      ><button type="button" @click.stop="active = !active">{{ active ? '完成' : '编辑' }}</button>
    </header>
    <StringListEditor
      v-if="active"
      :model-value="modelValue || []"
      :label="label"
      @update:model-value="$emit('update:modelValue', $event)"
    />
    <div v-else class="chips">
      <span v-for="value in modelValue || []" :key="value">{{ value }}</span
      ><i v-if="!modelValue?.length">尚未填写</i>
    </div>
  </section>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import StringListEditor from './StringListEditor.vue';
defineProps<{ modelValue: string[]; label: string }>();
defineEmits<{ 'update:modelValue': [value: string[]] }>();
const active = ref(false);
</script>
<style scoped>
.string-field {
  display: grid;
  gap: 9px;
  margin: 10px 0;
  padding: 11px 12px;
  background: rgba(255, 255, 255, 0.018);
  border: 1px solid rgba(255, 255, 255, 0.07);
  cursor: text;
}
.string-field.active,
.string-field:hover {
  border-color: rgba(203, 180, 119, 0.34);
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #9f9789;
  font-size: 11px;
  letter-spacing: 0.08em;
}
header button {
  color: #cbb477;
  background: transparent;
  border-color: transparent;
}
.chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.chips span {
  padding: 4px 8px;
  color: #ded7c9;
  background: #24282a;
  border: 1px solid #3c4143;
}
.chips i {
  color: #736f68;
}
</style>
