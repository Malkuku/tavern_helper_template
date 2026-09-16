<template>
  <Teleport to="body"
    ><div v-if="open" class="backdrop" @click.self="$emit('cancel')">
      <section
        ref="panel"
        class="modal"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @keydown.esc="$emit('cancel')"
        @keydown.tab="keepFocus"
      >
        <h2 :id="titleId" tabindex="-1">{{ title }}</h2>
        <div class="body"><slot /></div>
        <footer>
          <button ref="safe" @click="$emit('cancel')">{{ cancelLabel }}</button><slot name="actions" />
        </footer>
      </section></div
  ></Teleport>
</template>
<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
const props = withDefaults(defineProps<{ open: boolean; title: string; cancelLabel?: string }>(), {
  cancelLabel: '取消',
});
defineEmits<{ cancel: [] }>();
const panel = ref<HTMLElement>(),
  safe = ref<HTMLButtonElement>(),
  titleId = `dialog-${Math.random().toString(36).slice(2)}`;
let previous: HTMLElement | null = null;
function keepFocus(event: KeyboardEvent) {
  const items = panel.value?.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
  );
  if (!items?.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
watch(
  () => props.open,
  async open => {
    if (open) {
      previous = document.activeElement as HTMLElement;
      await nextTick();
      safe.value?.focus();
    } else previous?.focus();
  },
);
</script>
<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 20000;
  display: grid;
  place-items: center;
  padding: 16px;
  background: #000b;
}
.modal {
  width: min(680px, 100%);
  max-height: min(82vh, 780px);
  overflow: auto;
  padding: 24px;
  color: #eee7d8;
  background: #1d2123;
  border: 1px solid #67604f;
  box-shadow: 0 24px 80px #000;
}
.modal h2 {
  margin: 0 0 16px;
  font:
    500 22px Georgia,
    serif;
}
.body {
  display: grid;
  gap: 12px;
}
.modal footer {
  position: sticky;
  bottom: -24px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin: 20px -24px -24px;
  padding: 14px 24px;
  background: #15181a;
  border-top: 1px solid #393d3f;
}
</style>
