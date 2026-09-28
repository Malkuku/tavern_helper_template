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
      <path d="M3 11V4h7M22 4h7v7M29 21v7h-7M10 28H3v-7M10 16l4 4 8-9" />
    </template>
    <template v-else-if="name === 'wallet'">
      <path d="M3 7h26v21H3zM3 10V5h24v5M29 15h-9a5 5 0 0 0 0 10h9" />
      <circle cx="21" cy="20" r="1" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'credit'">
      <path d="M3 6h25v20H3zM7 12h17M22 23l6 3v-6" />
    </template>
    <template v-else-if="name === 'loan'">
      <path d="M3 9h24v17H3zM7 6h22v17M12 14l4 5 4-5M12 20h8M16 19v5" />
    </template>
    <template v-else-if="name === 'wealth'">
      <path d="M13 4a12 12 0 1 0 15 11M17 4a12 12 0 0 1 11 11M22 26l6 2-2-6M16 9l-4 7 5 5 4-9" />
    </template>
    <template v-else-if="name === 'insurance'">
      <path
        d="M5 13a11 11 0 0 1 22 0M6 14c2-3 5-3 7 0 2-3 5-3 7 0 2-3 5-3 7 0M16 13v13a4 4 0 0 0 8 0M19 8l-4 17M8 25h17"
      />
    </template>
    <template v-else-if="name === 'phone'">
      <rect x="7" y="2" width="18" height="28" rx="1" />
      <path d="M13 5h6M12 13l4 5 4-5M12 19h8M16 18v6" />
    </template>
    <template v-else-if="name === 'utilities'">
      <path d="M17 3a12 12 0 1 0 11 11M12 16l4 4 9-10" />
    </template>
    <template v-else-if="name === 'qq'">
      <path d="M10 11c0-5 2-8 6-8s6 3 6 8c0 3 2 6 3 9 1 3-1 5-4 4-2 4-8 4-10 0-3 1-5-1-4-4 1-3 3-6 3-9Z" />
    </template>
    <template v-else-if="name === 'city'">
      <path
        d="M4 22v-9l8-4v13M11 22V5h8v17M19 10l8 3v9M2 24c4 5 9 5 14 2 5 3 10 3 14-2M7 16h2m6-7h2m-2 5h2m-2 5h2m6-3h2"
      />
    </template>
    <template v-else-if="name === 'charity'">
      <path d="M16 3v26M3 16h26M7 7l18 18M25 7 7 25" stroke-width="5" />
      <circle cx="16" cy="16" r="3" fill="var(--wx-panel)" stroke="none" />
    </template>
    <template v-else-if="name === 'health'">
      <path d="M6 6h20v18H15l-5 4v-4H6zM16 10v10M11 15h10" />
    </template>
    <template v-else-if="name === 'travel'">
      <circle cx="16" cy="16" r="12" />
      <path d="m11 14 13-7-6 15-3-6-4-2Z" />
    </template>
    <template v-else-if="name === 'train'">
      <path d="M4 13h19l5 5-5 5H4M4 18h20M5 26h20M18 8l5-2m-2 4 6-1" />
    </template>
    <template v-else-if="name === 'ride'">
      <path d="M4 8h24v9a12 12 0 0 1-24 0V8ZM4 11h24" />
    </template>
    <template v-else-if="name === 'hotel'">
      <path d="M5 25V12h22v13M5 18h22M7 12l3-7h12l3 7M4 28v-3h24v3M25 5l3-2" />
    </template>
    <template v-else-if="name === 'cash'">
      <circle cx="16" cy="16" r="12" />
      <path d="m11 10 5 7 5-7M11 17h10M11 21h10M16 17v8" />
    </template>
    <template v-else-if="name === 'gem'">
      <path d="M3 12 9 5h14l6 7-13 16L3 12ZM3 12h26M9 5l4 7 3 16 3-16 4-7" />
    </template>
    <template v-else-if="name === 'bank'">
      <rect x="4" y="6" width="24" height="20" />
      <path d="M7 11h18" />
    </template>
    <template v-else-if="name === 'family'">
      <path d="m6 10 5-5 16 16-5 5L6 10ZM10 26l-5-5 16-16 5 5" />
    </template>
    <template v-else-if="name === 'score'">
      <path d="m16 2 4 3 5-1 1 5 4 3-3 4 1 5-5 1-3 5-4-2-4 2-3-5-5-1 1-5-3-4 4-3 1-5 5 1 4-3Z" />
      <path d="M12 20c0-4 8-4 8 0M16 11a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    </template>
    <template v-else-if="name === 'support'">
      <path d="M6 23a12 12 0 1 1 7 4l-7 2 1-6Z" />
      <path d="m12 16 3 3 5-6" />
    </template>
  </svg>
</template>

<script setup lang="ts">
defineProps<{ name: string }>();
</script>
