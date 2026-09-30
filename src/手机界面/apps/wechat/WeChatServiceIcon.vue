<template>
  <svg
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    stroke-width="1.9"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'payment'">
      <path d="M4 11V6h6m12 0h6v5m0 10v5h-6m-12 0H4v-5M10 16h12m-6-6 6 6-6 6" />
    </template>
    <template v-else-if="name === 'wallet'">
      <rect x="4" y="8" width="24" height="19" rx="4" />
      <path d="M6 8V6a2 2 0 0 1 2-2h17M19 16h9v7h-9a3.5 3.5 0 0 1 0-7Z" />
      <circle cx="22" cy="19.5" r="1" fill="currentColor" stroke="none" />
    </template>
  </svg>
</template>

<script setup lang="ts">
defineProps<{ name: 'payment' | 'wallet' }>();
</script>
