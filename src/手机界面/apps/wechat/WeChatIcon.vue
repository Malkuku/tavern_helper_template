<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'chats'">
      <path
        d="M5.5 5.5h13a2.5 2.5 0 0 1 2.5 2.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-5 3v-3.5A2.5 2.5 0 0 1 3 15.5V8a2.5 2.5 0 0 1 2.5-2.5Z"
      />
      <path d="M7.5 10.5h8m-8 4h5" />
    </template>
    <template v-else-if="name === 'contacts'">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-1.5A4.5 4.5 0 0 1 7.5 14h3A4.5 4.5 0 0 1 15 18.5V20H3ZM17 9h4m-2-2v4" />
    </template>
    <template v-else-if="name === 'me'">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20v-1A5.5 5.5 0 0 1 10 13.5h4a5.5 5.5 0 0 1 5.5 5.5v1h-15Z" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="10.7" cy="10.7" r="7" />
      <path d="m16 16 5 5" />
    </template>
    <template v-else-if="name === 'plus'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M7 12h10" />
    </template>
    <template v-else-if="name === 'more'">
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'chevron'"><path d="m9 5 7 7-7 7" /></template>
    <template v-else-if="name === 'new-friend'">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 3.4 1.3M18 15v6m-3-3h6" />
    </template>
    <template v-else-if="name === 'group'">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M2 20c0-3.2 2.4-5 7-5s7 1.8 7 5M16 15c3.6 0 5.5 1.6 5.5 4.5" />
    </template>
    <template v-else-if="name === 'people'">
      <circle cx="8" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M2.5 20a5.5 5.5 0 0 1 11 0M14 15.5a4.5 4.5 0 0 1 7.5 4.5" />
    </template>
    <template v-else-if="name === 'settings'">
      <circle cx="12" cy="12" r="3" />
      <path
        d="m10 2-.5 2.3-2.3 1-2-.9-2 3.5 1.9 1.5-.2 2.5-2 1.4 2 3.5 2.3-.8 2.1 1.2.7 2.3h4l.6-2.3 2.2-1.2 2.2.8 2-3.5-1.9-1.4-.2-2.5 2-1.5-2-3.5-2.3.9-2.2-1L14 2h-4Z"
      />
    </template>
    <template v-else-if="name === 'voice'">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9a4 4 0 0 1 0 6m4-8a7 7 0 0 1 0 10" />
    </template>
    <template v-else-if="name === 'emoji'">
      <circle cx="12" cy="12" r="9" />
      <circle cx="8.6" cy="9" r=".8" fill="currentColor" stroke="none" />
      <circle cx="15.4" cy="9" r=".8" fill="currentColor" stroke="none" />
      <path d="M7.7 14c1 2 2.4 3 4.3 3s3.3-1 4.3-3" />
    </template>
    <template v-else-if="name === 'location'">
      <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2.3" />
    </template>
    <template v-else-if="name === 'transfer'"><path d="M3 8h17m-4-4 4 4-4 4M21 16H4m4-4-4 4 4 4" /></template>
  </svg>
</template>

<script setup lang="ts">
defineProps<{ name: string }>();
</script>
