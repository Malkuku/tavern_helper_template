<template>
  <div class="inline-field" :class="{ active, wide, empty: !displayText }" @click="begin">
    <span class="field-label">{{ label }}</span>
    <template v-if="active && !readonly">
      <textarea
        v-if="multiline"
        ref="control"
        :value="stringValue"
        rows="2"
        @input="update(($event.target as HTMLTextAreaElement).value)"
        @keydown.esc="active = false"
        @blur="active = false"
      />
      <input
        v-else
        ref="control"
        :value="stringValue"
        @input="update(($event.target as HTMLInputElement).value)"
        @keydown.enter="active = false"
        @keydown.esc="active = false"
        @blur="active = false"
      />
    </template>
    <p v-else>{{ displayText || placeholder }}</p>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
const props = withDefaults(
  defineProps<{
    modelValue?: string | number;
    label: string;
    placeholder?: string;
    multiline?: boolean;
    readonly?: boolean;
    wide?: boolean;
  }>(),
  { modelValue: '', placeholder: '点击填写', multiline: false, readonly: false, wide: false },
);
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const active = ref(false),
  control = ref<HTMLInputElement | HTMLTextAreaElement>();
const stringValue = computed(() => String(props.modelValue ?? ''));
const displayText = computed(() => stringValue.value.trim());
async function begin() {
  if (props.readonly || active.value) return;
  active.value = true;
  await nextTick();
  control.value?.focus();
}
function update(value: string) {
  emit('update:modelValue', value);
}
</script>
<style scoped>
.inline-field {
  min-width: 0;
  padding: 11px 12px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.012));
  border: 1px solid rgba(255, 255, 255, 0.07);
  cursor: text;
  transition: 0.16s;
}
.inline-field:hover,
.inline-field.active {
  background: rgba(203, 180, 119, 0.045);
  border-color: rgba(203, 180, 119, 0.38);
}
.field-label {
  display: block;
  margin-bottom: 6px;
  color: #9f9789;
  font-size: 11px;
  letter-spacing: 0.08em;
}
p {
  min-height: 1.4em;
  margin: 0;
  color: #eee8dc;
  line-height: 1.55;
  white-space: pre-wrap;
}
.empty p {
  color: #736f68;
  font-style: italic;
}
input,
textarea {
  box-sizing: border-box;
  width: 100%;
  padding: 0;
  color: #fff8e9;
  font: inherit;
  line-height: 1.55;
  background: transparent;
  border: 0;
  outline: 0;
}
textarea {
  min-height: 3.1em;
  overflow: hidden;
  resize: vertical;
}
.wide {
  grid-column: 1/-1;
}
</style>
