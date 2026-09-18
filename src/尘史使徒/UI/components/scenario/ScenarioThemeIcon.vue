<template>
  <span class="scenario-theme-icon" :class="theme.className">
    <!-- eslint-disable-next-line vue/no-v-html -->
    <svg :viewBox="iconViewBox" v-html="theme.iconMarkup"></svg>
  </span>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { scenarioThemeById } from '../../../../创意工坊/scenario/themes';
import type { ScenarioThemeId } from '../../../../创意工坊/scenario/types';
const props = defineProps<{ themeId: ScenarioThemeId }>();
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
.theme-secret-moon {
  --theme-color: #9aa7dc;
  --theme-glow: rgba(125, 145, 220, 0.4);
}
.theme-hexagram {
  --theme-color: #dcc37a;
  --theme-glow: rgba(220, 195, 122, 0.38);
}
.theme-worm {
  --theme-color: #a98272;
  --theme-glow: rgba(137, 87, 70, 0.4);
}
.theme-woodland {
  --theme-color: #74a276;
  --theme-glow: rgba(83, 142, 89, 0.38);
}
.theme-bone-gate {
  --theme-color: #d8d1bd;
  --theme-glow: rgba(216, 209, 189, 0.3);
}
</style>
