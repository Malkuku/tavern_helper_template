<template>
  <div class="wx-sticker-overlay" @click.self="close" @keydown.esc.stop.prevent="close" @keydown.tab="trapFocus">
    <section ref="sheet" class="wx-sticker-sheet" role="dialog" aria-modal="true" :aria-label="label" tabindex="-1">
      <slot />
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
const props = withDefaults(defineProps<{ label: string; busy?: boolean }>(), { busy: false });
const emit = defineEmits<{ close: [] }>();
const sheet = ref<HTMLElement>();
let previousFocus: HTMLElement | null = null;
function controls() {
  return [
    ...(sheet.value?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]):not([type="file"]), select:not([disabled]), summary, [tabindex="0"]',
    ) ?? []),
  ].filter(element => element.getClientRects().length > 0);
}
function close() {
  if (!props.busy) emit('close');
}
function trapFocus(event: KeyboardEvent) {
  const elements = controls();
  if (!elements.length) {
    event.preventDefault();
    sheet.value?.focus();
    return;
  }
  const first = elements[0];
  const last = elements[elements.length - 1];
  if (event.shiftKey && (document.activeElement === first || document.activeElement === sheet.value)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === sheet.value)) {
    event.preventDefault();
    first.focus();
  }
}
onMounted(() => {
  previousFocus = document.activeElement as HTMLElement | null;
  (controls()[0] ?? sheet.value)?.focus();
});
onUnmounted(() => {
  if (previousFocus?.isConnected) previousFocus.focus();
});
</script>
