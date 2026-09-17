<template>
  <div v-if="open" class="backdrop" @click.self="$emit('cancel')">
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
      </section>
  </div>
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
  const active = panel.value?.ownerDocument.activeElement;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
watch(
  () => props.open,
  async open => {
    if (open) {
      await nextTick();
      previous = panel.value?.ownerDocument.activeElement as HTMLElement | null;
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
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: min(680px, 100%);
  max-height: min(82dvh, 780px);
  overflow: hidden;
  color: #eee7d8;
  background: #1d2123;
  border: 1px solid #67604f;
  box-shadow: 0 24px 80px #000;
}
.modal h2 {
  margin: 0;
  padding: 24px 24px 16px;
  font:
    500 22px Georgia,
    serif;
}
.body {
  display: grid;
  gap: 12px;
  overflow: auto;
  padding: 0 24px 20px;
}
.modal footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 24px;
  background: #15181a;
  border-top: 1px solid #393d3f;
}
@media (max-width: 720px) {
  .backdrop {
    align-items: end;
    padding: 0;
  }
  .modal {
    width: 100%;
    max-height: calc(100dvh - env(safe-area-inset-top));
    border-width: 1px 0 0;
    border-radius: 18px 18px 0 0;
  }
  .modal footer {
    padding-bottom: calc(14px + env(safe-area-inset-bottom));
  }
}
</style>
