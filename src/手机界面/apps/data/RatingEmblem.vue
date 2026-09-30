<template>
  <span v-if="grade" class="rating-emblem-wrap" :class="[`rating-${grade.toLowerCase()}`, tooltipAlign]">
    <button
      type="button"
      class="rating-emblem"
      :aria-label="`${grade} 级${kind === 'combat' ? '战力' : '组织'}评级，查看评级说明`"
      :aria-describedby="tooltipId"
      @click="showTooltip = !showTooltip"
      @blur="showTooltip = false"
      @keydown.esc="showTooltip = false"
    >
      <svg viewBox="0 0 64 72" fill="none" aria-hidden="true">
        <path
          d="M32 4 55 13v24c0 15-9 25-23 31C18 62 9 52 9 37V13L32 4Z"
          fill="currentColor"
          fill-opacity=".1"
          stroke="currentColor"
          stroke-width="2"
        />
        <path
          d="M20 52c3 4 7 7 12 10 5-3 9-6 12-10"
          stroke="currentColor"
          stroke-opacity=".65"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
      <strong>{{ grade }}</strong>
    </button>
    <span :id="tooltipId" class="rating-tooltip" :class="{ open: showTooltip }" role="tooltip">
      <strong>{{ grade }} 级 · {{ kind === 'combat' ? '战力评级' : '组织评级' }}</strong>
      <span>{{ kind === 'combat' ? descriptions[grade] : '完成任务并领取奖励，攒够评级贡献就能升级。' }}</span>
    </span>
  </span>
  <span v-else class="rating-unrecorded">{{ rating?.trim() || '未记录' }}</span>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue';

const props = withDefaults(
  defineProps<{ rating?: string; tooltipAlign?: 'left' | 'right'; kind?: 'combat' | 'contribution' }>(),
  {
    rating: '',
    tooltipAlign: 'left',
    kind: 'combat',
  },
);
const descriptions = {
  N: '普通人。',
  D: '比普通人强，但能力和实战经验还有限。',
  C: '已经能稳定地在实战中使用能力。',
  B: '实力明显更强，通常有迅速改变战局的手段。',
  A: '极少见的强者，常规战斗方式很难应对。',
  S: '能力强到可能造成大范围灾害，或让常规战斗方式失效。',
} as const;
const grade = computed(() => {
  const pattern = props.kind === 'combat' ? /^([NDCBAS])(?:级)?$/i : /^([DCBAS])(?:级)?$/i;
  const match = pattern.exec(props.rating?.trim() ?? '');
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
  --rating-color: #aeb7c3;
}
.rating-n {
  --rating-color: #9296a0;
}
.rating-c {
  --rating-color: #79d6b7;
}
.rating-b {
  --rating-color: #82b8f3;
}
.rating-a {
  --rating-color: #f0ce84;
}
.rating-s {
  --rating-color: #e8a0ed;
}
.rating-emblem {
  position: relative;
  display: grid;
  place-items: center;
  width: 60px;
  height: 68px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--rating-color);
  cursor: help;
  filter: drop-shadow(0 0 5px var(--rating-color));
}
.rating-emblem svg {
  width: 100%;
  height: 100%;
}
.rating-emblem strong {
  position: absolute;
  top: 20px;
  color: #fff7fb;
  font-size: 27px;
  line-height: 1;
  text-shadow: 0 1px 5px #250e20;
}
.rating-emblem:focus-visible {
  outline: 2px solid var(--rating-color);
  outline-offset: 2px;
  border-radius: 8px;
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
