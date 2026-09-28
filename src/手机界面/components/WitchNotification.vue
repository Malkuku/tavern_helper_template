<template>
  <div
    class="phone-notification witch-notification"
    :class="{ 'witch-notification-warning': notice.warning }"
    role="status"
  >
    <button
      class="phone-notification-open"
      type="button"
      :aria-label="`打开魔女恶堕计划：${notice.title}`"
      @click="emit('open')"
    >
      <span class="phone-notification-avatar witch-notification-icon" aria-hidden="true">
        <WitchMark />
      </span>
      <span class="phone-notification-copy">
        <span class="witch-notification-source"><span>魔女恶堕计划</span><time>现在</time></span>
        <strong>{{ notice.title }}</strong>
        <small>{{ notice.message }}</small>
      </span>
    </button>
    <button class="phone-notification-close" type="button" aria-label="关闭应用提醒" @click="emit('close')">×</button>
  </div>
</template>

<script setup lang="ts">
import WitchMark from '../apps/witch/WitchMark.vue';
import type { WitchNotice } from '../apps/witch/witchNotifications';

defineProps<{ notice: WitchNotice }>();
const emit = defineEmits<{ open: []; close: [] }>();
</script>
