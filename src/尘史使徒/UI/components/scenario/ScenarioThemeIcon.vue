<template>
  <span class="scenario-theme-icon" :class="theme.className">
    <!-- eslint-disable-next-line vue/no-v-html -->
    <svg :viewBox="iconViewBox" v-html="theme.iconMarkup"></svg>
    <span v-if="available !== undefined" class="availability" :class="{ ready: available }">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path v-if="available" d="M5 12l4 4L19 6" />
        <path v-else d="M12 7v6M12 17v.01" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    </span>
  </span>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { scenarioThemeById } from '../../../../创意工坊/scenario/themes';
import type { ScenarioThemeId } from '../../../../创意工坊/scenario/types';
const props = defineProps<{ themeId: ScenarioThemeId; available?: boolean }>();
const theme = computed(() => scenarioThemeById[props.themeId]);
const iconViewBox = computed(() =>
  ['forge', 'edge', 'heart', 'knock'].includes(theme.value.iconKey) ? '0 0 24 24' : '0 0 64 64',
);
</script>
<style scoped>
.scenario-theme-icon {
  position: relative;
  display: inline-grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: var(--theme-color, #cbb477);
  filter: drop-shadow(0 0 5px var(--theme-glow, transparent));
}
.scenario-theme-icon > svg {
  width: 100%;
  height: 100%;
}
.availability {
  position: absolute;
  right: -5px;
  bottom: -4px;
  display: grid;
  width: 22px;
  height: 22px;
  padding: 2px;
  box-sizing: border-box;
  place-items: center;
  color: #ce896b;
  background: #15181a;
  border: 1px solid currentColor;
  border-radius: 50%;
}
.availability.ready {
  color: #7db38a;
}
.availability svg {
  width: 100%;
  height: 100%;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.theme-lamp {
  --theme-color: #ffd700;
  --theme-glow: rgba(255, 215, 0, 0.35);
}
.theme-forge {
  --theme-color: #ff4500;
  --theme-glow: rgba(255, 69, 0, 0.35);
}
.theme-blade {
  --theme-color: #c0c0c0;
  --theme-glow: rgba(192, 192, 192, 0.3);
}
.theme-winter {
  --theme-color: #a3d5d5;
  --theme-glow: rgba(163, 213, 213, 0.3);
}
.theme-heart {
  --theme-color: #ff69b4;
  --theme-glow: rgba(255, 105, 180, 0.35);
}
.theme-cup {
  --theme-color: #b4131b;
  --theme-glow: rgba(180, 19, 27, 0.4);
}
.theme-moth {
  --theme-color: #a8a8a8;
  --theme-glow: rgba(168, 168, 168, 0.3);
}
.theme-key {
  --theme-color: #a52cdb;
  --theme-glow: rgba(165, 44, 219, 0.4);
}
.theme-broken-mirror {
  --theme-color: #c5a059;
  --theme-glow: rgba(197, 160, 89, 0.25);
}
</style>
