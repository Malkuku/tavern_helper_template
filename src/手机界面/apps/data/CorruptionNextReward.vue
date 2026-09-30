<template>
  <p class="observation-corruption-reward">
    <template v-if="level >= 6">恶堕晋级奖励已达上限</template>
    <template v-else-if="reward !== undefined"
      >晋至恶堕 {{ level + 1 }} 级，组织将发放 <strong>+{{ reward }}</strong> 恶堕积分</template
    >
    <template v-else-if="!rating">下一等级奖励将在角色评级确认后揭晓</template>
    <template v-else>角色评级无效，暂无法预览晋级奖励</template>
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { corruptionRewardForRating } from '../../store/corruptionRewards';

const props = defineProps<{ level: number; rating?: string }>();
const reward = computed(() => corruptionRewardForRating(props.rating));
</script>
