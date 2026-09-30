<template>
  <div class="witch-refresh-feedback" role="status" aria-live="polite">
    <span class="witch-refresh-orbit" aria-hidden="true"></span>
    <span class="witch-refresh-copy">
      <strong>{{ label }}</strong>
      <small>请稍候，完成后会在这里显示</small>
    </span>
    <span class="witch-refresh-track" aria-hidden="true"><span></span></span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string }>();
</script>
