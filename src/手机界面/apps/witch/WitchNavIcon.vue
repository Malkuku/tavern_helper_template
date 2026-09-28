<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'home'">
      <path d="m3.5 10 8.5-7 8.5 7v9a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19v-9Z" />
      <path d="M9 20.5v-7h6v7" />
    </template>
    <template v-else-if="name === 'tasks'">
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V2.5h6V4M8.5 10h7M8.5 14h7M8.5 18H13" />
    </template>
    <template v-else-if="name === 'observe'">
      <path d="M2.5 12s3.6-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.6 5.5-9.5 5.5S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
      <path d="M12 2.5v2M12 19.5v2" />
    </template>
    <template v-else-if="name === 'shop'">
      <path d="M4.5 9h15l-1.2 11h-12L4.5 9ZM8.5 9V6.5a3.5 3.5 0 0 1 7 0V9" />
      <path d="M9 14h6M12 11v6" />
    </template>
    <template v-else>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c.6-3.7 3.1-5.6 7.5-5.6s6.9 1.9 7.5 5.6" />
    </template>
  </svg>
</template>

<script setup lang="ts">
defineProps<{ name: 'home' | 'tasks' | 'observe' | 'shop' | 'mine' }>();
</script>
