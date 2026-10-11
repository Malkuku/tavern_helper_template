<template>
  <span class="stage-help">
    <button
      type="button"
      class="stage-help-button"
      :aria-label="`了解${kind}`"
      :aria-describedby="tooltipId"
      @click="open = !open"
      @blur="open = false"
      @keydown.esc="open = false"
    >
      {{ kind }}
    </button>
    <span :id="tooltipId" class="stage-help-tooltip" :class="{ open }" role="tooltip">
      <strong>{{ kind }}</strong>
      <span v-if="kind === '创伤稳定度'">
        创伤、欲望，抑或是从未离去的那一天——想要改变这一切的强烈愿望，引发了足以扭曲现实的奇迹，却无法治愈她内心深处结痂的创口。
      </span>
      <span v-else-if="kind === '好感度'">
        她会记住你给予的援手，也会记住受到的伤害。你们的相处与共同经历，决定了她愿意让你走近多少。
      </span>
      <span v-else>恶堕如暗潮，悄悄改变她的欲望与力量。沉得越深，越难回到最初的模样。</span>
      <span v-if="kind === '创伤稳定度'" class="stage-help-warning">她究竟在逃避着什么？</span>
      <span v-else-if="kind === '恶堕度'" class="stage-help-warning">
        去看看她欲望的真实颜色吧
      </span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { ref, useId } from 'vue';

defineProps<{ kind: '创伤稳定度' | '好感度' | '恶堕度' }>();

const tooltipId = useId();
const open = ref(false);
</script>
