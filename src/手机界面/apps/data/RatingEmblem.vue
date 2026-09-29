<template>
  <span v-if="grade" class="rating-emblem-wrap" :class="[`rating-${grade.toLowerCase()}`, tooltipAlign]">
    <button
      type="button"
      class="rating-emblem"
      :aria-label="`${grade} 级战力评级，查看评级说明`"
      :aria-describedby="tooltipId"
      @click="showTooltip = !showTooltip"
      @blur="showTooltip = false"
      @keydown.esc="showTooltip = false"
    >
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <path
          d="M32 3 46 9 57 20 61 32 57 44 46 55 32 61 18 55 7 44 3 32 7 20 18 9Z"
          fill="currentColor"
          fill-opacity=".13"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <path
          d="M32 8 44 13 52 22 56 32 52 42 44 51 32 56 20 51 12 42 8 32 12 22 20 13Z"
          stroke="currentColor"
          stroke-opacity=".55"
        />
        <path
          v-if="grade === 'D'"
          d="m32 14 8 8-8 8-8-8 8-8Zm0 20 8 8-8 8-8-8 8-8Z"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <path
          v-else-if="grade === 'C'"
          d="m18 25 14-10 14 10M18 36l14-10 14 10M21 45l11-8 11 8"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          v-else-if="grade === 'B'"
          d="m32 12 5 11 12 2-9 8 2 12-10-6-10 6 2-12-9-8 12-2 5-11Z"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linejoin="round"
        />
        <path
          v-else-if="grade === 'A'"
          d="m32 12 4 10 11-5-4 12 9 3-9 3 4 12-11-5-4 10-4-10-11 5 4-12-9-3 9-3-4-12 11 5 4-10Z"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linejoin="round"
        />
        <path
          v-else
          d="m12 27 8 7 5-15 7 11 7-11 5 15 8-7-5 19H17l-5-19ZM20 50h24"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linejoin="round"
        />
      </svg>
      <strong>{{ grade }}</strong>
    </button>
    <span :id="tooltipId" class="rating-tooltip" :class="{ open: showTooltip }" role="tooltip">
      <strong>{{ grade }} 级 · 战力评级</strong>
      <span>{{ descriptions[grade] }}</span>
    </span>
  </span>
  <span v-else class="rating-unrecorded">{{ rating?.trim() || '未记录' }}</span>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue';

const props = withDefaults(defineProps<{ rating?: string; tooltipAlign?: 'left' | 'right' }>(), {
  rating: '',
  tooltipAlign: 'left',
});
const descriptions = {
  D: '初步具备超常战斗能力，对普通人具有压倒性优势，但能力规模、经验或身体素质仍然有限。',
  C: '成熟的超能力战斗者，能力已经能够稳定用于实战。',
  B: '明显超出常规能力者的强者，能力完成度高，通常拥有足以迅速改变战局的手段。',
  A: '极少数高危个体，能力规模、强度或特殊性已经能够突破常规战斗方式。',
  S: '规格外个体，其能力足以造成大范围灾害或彻底破坏正常战斗规则。',
} as const;
const grade = computed(() => {
  const match = /^([DCBAS])(?:级)?$/i.exec(props.rating?.trim() ?? '');
  return match?.[1].toUpperCase() as keyof typeof descriptions | undefined;
});
const tooltipId = useId();
const showTooltip = ref(false);
</script>

<style scoped>
.rating-emblem-wrap {
  position: relative;
  display: inline-flex;
  vertical-align: middle;
  --rating-color: #a9aeb8;
}
.rating-c {
  --rating-color: #9dc9d1;
}
.rating-b {
  --rating-color: #bca5ef;
}
.rating-a {
  --rating-color: #ef9bc4;
}
.rating-s {
  --rating-color: #f5c978;
}
.rating-emblem {
  position: relative;
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--rating-color);
  cursor: help;
  filter: drop-shadow(0 0 8px currentColor);
}
.rating-emblem svg {
  width: 100%;
  height: 100%;
}
.rating-emblem strong {
  position: absolute;
  top: 22px;
  color: #fff7fb;
  font-size: 22px;
  line-height: 1;
  text-shadow: 0 1px 5px #250e20;
}
.rating-emblem:focus-visible {
  outline: 2px solid var(--rating-color);
  outline-offset: 2px;
  border-radius: 50%;
}
.rating-tooltip {
  position: absolute;
  z-index: 20;
  top: calc(100% + 8px);
  left: 0;
  display: grid;
  gap: 5px;
  width: 230px;
  max-width: calc(100vw - 50px);
  padding: 11px 13px;
  border: 1px solid var(--rating-color);
  border-radius: 10px;
  background: #201523;
  box-shadow: 0 9px 22px #08040acb;
  color: #f5e9ef;
  font-size: 11px;
  line-height: 1.5;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  transition:
    opacity 0.16s ease,
    transform 0.16s ease,
    visibility 0.16s;
  pointer-events: none;
}
.rating-tooltip strong {
  color: var(--rating-color);
  font-size: 12px;
}
.rating-emblem-wrap.right .rating-tooltip {
  left: auto;
  right: 0;
}
.rating-emblem-wrap:hover .rating-tooltip,
.rating-emblem:focus-visible + .rating-tooltip,
.rating-tooltip.open {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
.rating-unrecorded {
  color: #d5b8ca;
  font-size: 12px;
}
@media (prefers-reduced-motion: reduce) {
  .rating-tooltip {
    transition: none;
  }
}
</style>
