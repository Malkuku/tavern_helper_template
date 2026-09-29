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
        她能否在伤痛面前守住自我。稳定时，她仍能辨明敌友，作出自己的选择；当伤痕压过理智，原本坚定的信念也可能化为失控的执念。
      </span>
      <span v-else-if="kind === '好感度'">
        她会记住你给予的援手，也会记住受到的伤害。你们的相处与共同经历，决定了她愿意让你走近多少。
      </span>
      <span v-else>恶堕如暗潮，悄悄改变她的欲望与力量。沉得越深，越难回到最初的模样。</span>
      <span v-if="kind === '创伤稳定度'" class="stage-help-warning">警告：稳定度过低，可能引发灾难性的后果。</span>
      <span v-else-if="kind === '恶堕度'" class="stage-help-warning">
        警告：高恶堕值会污染魔法少女的魔力，使其魔装发生不可逆转的变化。
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
