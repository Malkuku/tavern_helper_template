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
        d="M20.5 11.2c0 4.6-3.8 8.3-8.5 8.3-1.4 0-2.7-.3-3.9-.9L3 20l1.5-4.5A8.1 8.1 0 0 1 3.5 11c0-4.6 3.8-8.3 8.5-8.3s8.5 3.7 8.5 8.5Z"
      />
    </template>
    <template v-else-if="name === 'contacts' || name === 'me'">
      <path d="M11 3.2a3.8 3.8 0 0 1 3.8 3.9c0 2.2-1.5 4.2-3.8 4.2S7.2 9.3 7.2 7.1A3.8 3.8 0 0 1 11 3.2Z" />
      <path d="M3.3 20c.2-4.4 2.8-6.2 7.7-6.2s7.5 1.8 7.7 6.2H3.3Z" />
      <path v-if="name === 'contacts'" d="M19 9h3m-3 3h3" />
    </template>
    <template v-else-if="name === 'discover'">
      <circle cx="12" cy="12" r="9" />
      <path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="10.7" cy="10.7" r="7" />
      <path d="m16 16 5 5" />
    </template>
    <template v-else-if="name === 'plus'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M7 12h10" />
    </template>
    <template v-else-if="name === 'chevron'"><path d="m9 5 7 7-7 7" /></template>
    <template v-else-if="name === 'new-friend'">
      <circle cx="10" cy="8" r="3" />
      <path d="M3 19c0-3.3 2.5-5 7-5 1 0 2 .1 2.7.4M18 14v7m-3.5-3.5h7" />
    </template>
    <template v-else-if="name === 'group'">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M2 20c0-3.2 2.4-5 7-5s7 1.8 7 5M16 15c3.6 0 5.5 1.6 5.5 4.5" />
    </template>
    <template v-else-if="name === 'tag'">
      <path d="M3 3h9l9 9-9 9-9-9V3Z" />
      <circle cx="7.5" cy="7.5" r="1" />
    </template>
    <template v-else-if="name === 'book'">
      <path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v14" />
    </template>
    <template v-else-if="name === 'moments'">
      <circle cx="12" cy="12" r="9" />
      <path d="m12 3 3 6-3 3m9 0-6 3-3-3m0 9-3-6 3-3m-9 0 6-3 3 3" />
    </template>
    <template v-else-if="name === 'video'"><path d="M3 6c3-3 6-3 9 6 3-9 6-9 9-6-1 7-4 12-9 12S4 13 3 6Z" /></template>
    <template v-else-if="name === 'live'">
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="4" />
    </template>
    <template v-else-if="name === 'scan'"><path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5M6 12h12" /></template>
    <template v-else-if="name === 'music'">
      <path d="M10 18V5l9 2v10M10 18c0 3-6 4-6 1s6-4 6-1Zm9-1c0 3-6 4-6 1s6-4 6-1Z" />
    </template>
    <template v-else-if="name === 'look'">
      <path
        d="m12 2 2.7 4.9 5.5-.7-.7 5.5L22 14l-5.1 2.7.7 5.5-5.5-.7L9.4 24l-2.7-5.1-5.5.7.7-5.5L0 11.4l5.1-2.7-.7-5.5 5.5.7L12 2Z"
      />
    </template>
    <template v-else-if="name === 'people'">
      <circle cx="7" cy="6" r="2" />
      <circle cx="17" cy="6" r="2" />
      <path d="M4 12h6l-1 9H5l-1-9Zm10 0h6l-1 9h-4l-1-9Z" />
    </template>
    <template v-else-if="name === 'settings'">
      <circle cx="12" cy="12" r="3" />
      <path
        d="m10 2-.5 2.3-2.3 1-2-.9-2 3.5 1.9 1.5-.2 2.5-2 1.4 2 3.5 2.3-.8 2.1 1.2.7 2.3h4l.6-2.3 2.2-1.2 2.2.8 2-3.5-1.9-1.4-.2-2.5 2-1.5-2-3.5-2.3.9-2.2-1L14 2h-4Z"
      />
    </template>
    <template v-else-if="name === 'voice'">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 9c2 1.5 2 4.5 0 6m4-8c3 2.5 3 7.5 0 10m4-12c4 3.5 4 10.5 0 14" />
    </template>
    <template v-else-if="name === 'emoji'">
      <circle cx="12" cy="12" r="9" />
      <circle cx="8.6" cy="9" r=".8" fill="currentColor" stroke="none" />
      <circle cx="15.4" cy="9" r=".8" fill="currentColor" stroke="none" />
      <path d="M7.7 14c1 2 2.4 3 4.3 3s3.3-1 4.3-3" />
    </template>
    <template v-else-if="name === 'photo'">
      <rect x="2.5" y="4" width="19" height="16" rx="2" />
      <circle cx="8" cy="9" r="1.5" />
      <path d="m3 17 5-5 3 3 3-2 7 6" />
    </template>
    <template v-else-if="name === 'camera'">
      <path d="M3 7h4l1.3-2h7.4L17 7h4v12H3V7Z" />
      <circle cx="12" cy="13" r="3.5" />
    </template>
    <template v-else-if="name === 'video-call'">
      <rect x="2.5" y="6" width="13" height="12" rx="2" />
      <path d="m16 10 5-3v10l-5-3" />
    </template>
    <template v-else-if="name === 'location'">
      <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2.3" />
    </template>
    <template v-else-if="name === 'redpacket'">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M4 8c3 2.5 5.7 3.8 8 3.8S17 10.5 20 8" />
      <circle cx="12" cy="12" r="1.3" />
    </template>
    <template v-else-if="name === 'gift'">
      <rect x="3" y="9" width="18" height="12" rx="1" />
      <path d="M2 9h20M12 9v12M12 9C6 8 6 3 9 3c2 0 3 3 3 6Zm0 0c6-1 6-6 3-6-2 0-3 3-3 6Z" />
    </template>
    <template v-else-if="name === 'transfer'"><path d="M3 8h17m-4-4 4 4-4 4M21 16H4m4-4-4 4 4 4" /></template>
    <template v-else-if="name === 'favorite'">
      <path d="m12 2 3 6.2 6.8 1-4.9 4.8 1.2 6.8L12 17.6l-6.1 3.2 1.2-6.8-4.9-4.8 6.8-1L12 2Z" />
    </template>
    <template v-else>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </template>
  </svg>
</template>

<script setup lang="ts">
defineProps<{ name: string }>();
</script>
