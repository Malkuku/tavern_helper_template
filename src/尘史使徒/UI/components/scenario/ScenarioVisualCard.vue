<template>
  <article class="scenario-card" :class="[theme.className, { active, compact, interactive }]">
    <div class="art-bg-effect"></div>
    <div class="card-content">
      <div class="scenario-icon-wrapper">
        <ScenarioThemeIcon :theme-id="themeId" :available="available" />
      </div>
      <h2 class="scenario-title art-name">{{ name }}</h2>
      <div v-if="customProtagonist" class="scenario-tags"><span class="tag">自定义主角</span></div>
      <div v-if="expanded" class="scenario-details">
        <p v-if="description" class="scenario-desc">{{ description }}</p>
        <slot />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { scenarioThemeById } from '../../../../创意工坊/scenario/themes';
import type { ScenarioThemeId } from '../../../../创意工坊/scenario/types';
import ScenarioThemeIcon from './ScenarioThemeIcon.vue';

const props = withDefaults(
  defineProps<{
    themeId: ScenarioThemeId;
    name: string;
    description?: string;
    active?: boolean;
    expanded?: boolean;
    compact?: boolean;
    interactive?: boolean;
    customProtagonist?: boolean;
    available?: boolean;
  }>(),
  { description: '', active: false, expanded: false, compact: false, interactive: false, customProtagonist: false },
);
const theme = computed(() => scenarioThemeById[props.themeId]);
</script>

<style scoped>
.scenario-card {
  --c-gold: #a48b57;
  --c-gold-dim: rgba(164, 139, 87, 0.3);
  --c-text-dim: #8a92a0;
  --c-bg-card: rgba(0, 0, 0, 0.6);
  --font-title: 'Cinzel', serif;
  position: relative;
  background: var(--c-bg-card);
  border: 1px solid var(--c-gold-dim);
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  min-height: 220px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.scenario-card.interactive {
  cursor: pointer;
}
.scenario-card.interactive:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  border-color: var(--theme-color, var(--c-gold));
}
.scenario-card.active {
  border-color: var(--theme-color, var(--c-gold));
  box-shadow: 0 0 20px var(--theme-glow, var(--c-gold-dim));
  min-height: 400px;
  background: rgba(0, 0, 0, 0.8);
}
.card-content {
  position: relative;
  z-index: 2;
  padding: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  height: 100%;
}
.scenario-icon-wrapper {
  width: 80px;
  height: 80px;
  margin-bottom: 15px;
  color: var(--theme-color, var(--c-gold));
  filter: drop-shadow(0 0 5px var(--theme-glow, transparent));
  transition: transform 0.3s;
  position: relative;
}
.scenario-card.interactive:hover .scenario-icon-wrapper {
  transform: scale(1.1);
}
.scenario-title {
  font-family: var(--font-title);
  font-size: 1.6rem;
  margin: 0 0 10px;
  transition: color 0.3s;
}
.scenario-details {
  margin-top: 20px;
  animation: fade-in 0.5s ease-in-out;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
.scenario-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 15px;
  flex-wrap: wrap;
  justify-content: center;
}
.tag {
  font-size: 0.75rem;
  padding: 2px 8px;
  border: 1px solid var(--c-text-dim);
  color: var(--c-text-dim);
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.3);
}
.scenario-desc {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--c-text-dim);
  margin-bottom: 25px;
  max-width: 90%;
  white-space: pre-line;
}
.art-bg-effect {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}
.compact {
  min-height: 180px;
}
.compact.active {
  min-height: 240px;
}
.compact .card-content {
  padding: 18px;
}
.compact .scenario-icon-wrapper {
  width: 58px;
  height: 58px;
}
.compact .scenario-title {
  font-size: 1.25rem;
}
.theme-lamp {
  --theme-color: #ffd700;
  --theme-glow: rgba(255, 215, 0, 0.3);
}
.theme-lamp .art-name {
  color: var(--theme-color);
  text-shadow: 0 0 10px var(--theme-color);
}
.theme-lamp .art-bg-effect {
  background: radial-gradient(circle, var(--theme-color) 0%, transparent 70%);
  opacity: 0.15;
}
.theme-forge {
  --theme-color: #ff4500;
  --theme-glow: rgba(255, 69, 0, 0.3);
}
.theme-forge .art-name {
  color: var(--theme-color);
  text-shadow: 0 0 10px var(--theme-color);
}
.theme-forge .art-bg-effect::before,
.theme-forge .art-bg-effect::after {
  content: '';
  position: absolute;
  left: 0;
  width: 100%;
  height: 200%;
  background-image: radial-gradient(circle, var(--theme-color) 1px, transparent 1px);
  animation: forge-rise linear infinite;
}
.theme-forge .art-bg-effect::before {
  background-size: 70px 70px;
  animation-duration: 6s;
  opacity: 0.7;
}
.theme-forge .art-bg-effect::after {
  background-size: 110px 110px;
  animation-duration: 10s;
  animation-delay: -3s;
  opacity: 0.6;
}
.theme-blade {
  --theme-color: #c0c0c0;
  --theme-glow: rgba(192, 192, 192, 0.3);
}
.theme-blade .art-name {
  color: var(--theme-color);
}
.theme-blade .art-bg-effect {
  background:
    linear-gradient(0deg, rgba(255, 255, 255, 0.05), rgba(0, 0, 0, 0.05)),
    repeating-linear-gradient(90deg, #ccc, #ccc 1px, #bbb 1px, #bbb 2px);
  opacity: 0.15;
}
.theme-winter {
  --theme-color: #a3d5d5;
  --theme-glow: rgba(163, 213, 213, 0.3);
}
.theme-winter .art-name {
  color: var(--theme-color);
}
.theme-winter .art-bg-effect {
  background: radial-gradient(circle, #fff 5%, transparent 6%), radial-gradient(circle, #fff 3%, transparent 4%);
  background-size:
    30px 30px,
    50px 50px;
  background-position:
    0 0,
    25px 25px;
  animation: snow 10s linear infinite;
  opacity: 0.3;
}
.theme-heart {
  --theme-color: #ff69b4;
  --theme-glow: rgba(255, 105, 180, 0.3);
}
.theme-heart .art-name {
  color: var(--theme-color);
}
.theme-heart .art-bg-effect {
  background: radial-gradient(circle, var(--theme-color) 0%, transparent 50%) no-repeat center;
  animation: heart-pulse 2s infinite ease-in-out;
  opacity: 0.15;
}
.theme-cup {
  --theme-color: #8b0000;
  --theme-glow: rgba(139, 0, 0, 0.4);
}
.theme-cup .art-name {
  color: var(--theme-color);
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
}
.theme-cup .art-bg-effect {
  background-image:
    linear-gradient(to bottom, var(--theme-color) 30%, transparent 100%),
    linear-gradient(to bottom, var(--theme-color) 30%, transparent 100%),
    linear-gradient(to bottom, var(--theme-color) 30%, transparent 100%);
  background-repeat: no-repeat;
  background-size:
    2px 150%,
    3px 200%,
    1px 220%;
  background-position:
    10% 0,
    50% 0,
    90% 0;
  animation: cup-drip 6s linear infinite;
  opacity: 0.4;
}
.theme-moth {
  --theme-color: #a8a8a8;
  --theme-glow: rgba(168, 168, 168, 0.3);
}
.theme-moth .art-name {
  color: var(--theme-color);
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5);
  animation: moth-glitch 2s infinite steps(1);
}
.theme-moth .art-bg-effect {
  background: repeating-linear-gradient(45deg, #0001, #0001 1px, transparent 1px, transparent 5px);
  opacity: 0.2;
}
.theme-key {
  --theme-color: #9400d3;
  --theme-glow: rgba(148, 0, 211, 0.3);
}
.theme-key .art-name {
  color: var(--theme-color);
}
.theme-key .art-bg-effect {
  background: radial-gradient(
    ellipse at center,
    var(--theme-color) 0%,
    rgba(148, 0, 211, 0.5) 30%,
    rgba(148, 0, 211, 0.1) 60%,
    transparent 80%
  );
  transform-origin: center;
  animation: key-spin 30s linear infinite;
  opacity: 0.4;
}
.theme-broken-mirror {
  --theme-color: #c5a059;
  --theme-glow: rgba(197, 160, 89, 0.2);
}
.theme-broken-mirror .art-name {
  color: var(--theme-color);
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.8);
  opacity: 0.8;
}
.theme-broken-mirror .art-bg-effect {
  background: linear-gradient(
    135deg,
    transparent 40%,
    rgba(197, 160, 89, 0.1) 40%,
    rgba(197, 160, 89, 0.1) 60%,
    transparent 60%
  );
  background-size: 20px 20px;
  opacity: 0.3;
}
.theme-broken-mirror :deep(.scenario-theme-icon > svg) {
  animation: broken-shake 5s infinite;
}
:global(.scenario-layout.theme-lamp) {
  --theme-color: #ffd700;
  --theme-glow: rgba(255, 215, 0, 0.3);
}
:global(.scenario-layout.theme-forge) {
  --theme-color: #ff4500;
  --theme-glow: rgba(255, 69, 0, 0.3);
}
:global(.scenario-layout.theme-blade) {
  --theme-color: #c0c0c0;
  --theme-glow: rgba(192, 192, 192, 0.3);
}
:global(.scenario-layout.theme-winter) {
  --theme-color: #a3d5d5;
  --theme-glow: rgba(163, 213, 213, 0.3);
}
:global(.scenario-layout.theme-heart) {
  --theme-color: #ff69b4;
  --theme-glow: rgba(255, 105, 180, 0.3);
}
:global(.scenario-layout.theme-cup) {
  --theme-color: #8b0000;
  --theme-glow: rgba(139, 0, 0, 0.4);
}
:global(.scenario-layout.theme-moth) {
  --theme-color: #a8a8a8;
  --theme-glow: rgba(168, 168, 168, 0.3);
}
:global(.scenario-layout.theme-key) {
  --theme-color: #9400d3;
  --theme-glow: rgba(148, 0, 211, 0.3);
}
:global(.scenario-layout.theme-broken-mirror) {
  --theme-color: #c5a059;
  --theme-glow: rgba(197, 160, 89, 0.2);
}
:global(.scenario-layout.theme-moth .title) {
  animation: moth-glitch 2s infinite steps(1);
}
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes forge-rise {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-50%);
  }
}
@keyframes snow {
  from {
    background-position:
      0 0,
      25px 25px;
  }
  to {
    background-position:
      0 300px,
      25px 325px;
  }
}
@keyframes heart-pulse {
  0%,
  100% {
    background-size: 100% 100%;
    opacity: 0.1;
  }
  50% {
    background-size: 150% 150%;
    opacity: 0.2;
  }
}
@keyframes cup-drip {
  from {
    background-position-y: -250%;
  }
  to {
    background-position-y: 100%;
  }
}
@keyframes moth-glitch {
  0%,
  15%,
  100% {
    transform: translate(0) skew(0);
  }
  5% {
    transform: translate(-2px, 1px) skew(-2deg);
  }
  10% {
    transform: translate(2px, -1px) skew(2deg);
  }
}
@keyframes key-spin {
  from {
    transform: scale(1.5) rotate(0);
  }
  to {
    transform: scale(1.5) rotate(360deg);
  }
}
@keyframes broken-shake {
  0%,
  90%,
  100% {
    transform: rotate(0);
  }
  92% {
    transform: rotate(2deg);
  }
  94% {
    transform: rotate(-2deg);
  }
  96% {
    transform: rotate(1deg);
  }
  98% {
    transform: rotate(-1deg);
  }
}
</style>
