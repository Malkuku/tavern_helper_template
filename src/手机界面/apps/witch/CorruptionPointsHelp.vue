<template>
  <div class="points-help">
    <button
      type="button"
      class="points-help-trigger"
      aria-label="查看恶堕积分获取方式"
      :aria-describedby="helpId"
      :aria-expanded="open"
      @click="open = !open"
      @blur="open = false"
      @keydown.esc="open = false"
    >
      <slot />
    </button>
    <span :id="helpId" class="points-help-tooltip" :class="{ open }" role="tooltip">
      <strong>恶堕积分怎么获得？</strong>
      <span>完成委派任务并领取奖励，即可获得恶堕积分。</span>
      <span>魔法少女首次迈入新的恶堕等级时，组织会按她的评级发放一次性积分，自动入账。</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, useId } from 'vue';

const helpId = useId();
const open = ref(false);
</script>

<style scoped>
.points-help {
  position: relative;
  display: inline-flex;
  max-width: 100%;
}
.points-help-trigger {
  display: inline-flex;
  align-items: center;
  gap: inherit;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: help;
}
.points-help-trigger:focus-visible {
  outline: 2px solid #f4ccdf;
  outline-offset: 3px;
  border-radius: inherit;
}
.points-help-tooltip {
  position: absolute;
  z-index: 30;
  top: calc(100% + 9px);
  right: 0;
  display: grid;
  gap: 7px;
  width: min(252px, calc(100vw - 65px));
  padding: 11px 13px;
  border: 1px solid #b984a3;
  border-radius: 10px;
  background: #201523;
  box-shadow: 0 9px 22px #08040acb;
  color: #f5e9ef;
  font-size: 11px;
  font-weight: 400;
  line-height: 1.5;
  text-align: left;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  transition:
    opacity 0.16s ease,
    transform 0.16s ease,
    visibility 0.16s;
  pointer-events: none;
}
.points-help-tooltip strong {
  color: #f3b5d3;
  font-size: 12px;
}
.points-help:hover .points-help-tooltip,
.points-help-trigger:focus-visible + .points-help-tooltip,
.points-help-tooltip.open {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
@media (prefers-reduced-motion: reduce) {
  .points-help-tooltip {
    transition: none;
  }
}
</style>
