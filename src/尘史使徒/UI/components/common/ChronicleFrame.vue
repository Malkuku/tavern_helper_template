<template>
  <section class="chronicle-frame" :class="{ 'is-embedded': embedded }">
    <header class="chronicle-header">
      <div class="chronicle-heading">
        <p v-if="subtitle" class="chronicle-subtitle">{{ subtitle }}</p>
        <h2 class="chronicle-title">
          <slot name="heading">{{ title }}</slot>
        </h2>
      </div>
      <div v-if="$slots.actions" class="chronicle-actions"><slot name="actions" /></div>
    </header>
    <div class="chronicle-content"><slot /></div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ title: string; subtitle?: string; embedded?: boolean }>();
</script>

<style scoped>
.chronicle-frame {
  --c-bg-overlay: rgba(15, 18, 24, 0.95);
  --c-gold: #a48b57;
  --c-text-main: #e0e0e0;
  --c-text-dim: #8a92a0;
  --c-border: rgba(164, 139, 87, 0.3);
  --c-hover-bg: rgba(164, 139, 87, 0.1);
  --c-accent-danger: #a83232;
  --font-title: 'Cinzel', 'Songti SC', 'SimSun', serif;
  --font-body: 'EB Garamond', 'Microsoft YaHei', serif;
  --chronicle-panel: rgba(255, 255, 255, 0.025);
  width: 100%;
  min-width: 0;
  max-width: 1100px;
  margin: 0 auto;
  border: 1px solid var(--c-border);
  background: var(--c-bg-overlay);
  color: var(--c-text-main);
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.65;
  overflow-wrap: anywhere;
  box-sizing: border-box;
}
.chronicle-frame :deep(*) {
  box-sizing: border-box;
}
.chronicle-frame :deep(button) {
  font-family: inherit;
}
.chronicle-frame :deep(button:focus-visible),
.chronicle-frame :deep([tabindex]:focus-visible) {
  outline: 2px solid var(--c-gold);
  outline-offset: 3px;
}
.chronicle-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--c-border);
}
.chronicle-heading {
  min-width: 0;
}
.chronicle-subtitle {
  margin: 0 0 4px;
  color: var(--c-text-dim);
  font-size: 11px;
  letter-spacing: 0.16em;
}
.chronicle-title {
  margin: 0;
  color: var(--c-gold);
  font: 600 20px/1.5 var(--font-title);
  letter-spacing: 0.12em;
}
.chronicle-actions {
  min-width: 0;
  max-width: 100%;
}
.chronicle-content {
  padding: 20px 24px;
  min-width: 0;
}
.is-embedded {
  max-width: none;
  border: 0;
  background: transparent;
}
@media (max-width: 520px) {
  .chronicle-header {
    padding: 16px 14px;
    gap: 10px;
  }
  .chronicle-content {
    padding: 14px;
  }
  .chronicle-title {
    font-size: 18px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .chronicle-frame :deep(*) {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
