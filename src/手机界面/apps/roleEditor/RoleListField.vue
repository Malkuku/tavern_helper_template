<template>
  <div class="pre-list-field">
    <span>{{ label }}</span>
    <div v-for="(_, index) in modelValue" :key="index" class="pre-list-row">
      <textarea
        :value="modelValue[index]"
        :aria-label="`${label} ${index + 1}`"
        rows="2"
        @input="update(index, ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
      <button type="button" :aria-label="`删除${label} ${index + 1}`" @click="remove(index)">删除</button>
    </div>
    <button type="button" @click="$emit('update:modelValue', [...modelValue, ''])">＋ 添加{{ label }}</button>
  </div>
</template>
<script setup lang="ts">
const props = defineProps<{ modelValue: string[]; label: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>();
function update(index: number, value: string) {
  const next = [...props.modelValue];
  next[index] = value;
  emit('update:modelValue', next);
}
function remove(index: number) {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, i) => i !== index),
  );
}
</script>
