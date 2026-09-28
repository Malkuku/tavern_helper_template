<template>
  <div class="character-portrait" :class="{ 'character-portrait-cover': cover }" :aria-label="`${name}的角色画像`">
    <svg v-if="!loaded" class="character-portrait-fallback" viewBox="0 0 320 320" fill="none" aria-hidden="true">
      <circle cx="160" cy="150" r="125" stroke="currentColor" stroke-opacity=".22" />
      <circle cx="160" cy="150" r="101" stroke="currentColor" stroke-opacity=".27" />
      <path
        d="m160 13 5 13 13 5-13 5-5 13-5-13-13-5 13-5 5-13ZM253 70l3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Z"
        fill="currentColor"
        opacity=".65"
      />
      <path
        d="M109 234c8-28 24-42 51-42s43 14 51 42M126 134c0-22 15-39 34-39s34 17 34 39c0 26-15 47-34 47s-34-21-34-47Z"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
      />
      <path
        d="M114 143c-5-43 12-71 46-71s51 28 46 71c-8-13-13-25-13-38-15 14-35 22-66 24-2 6-7 11-13 14Z"
        fill="currentColor"
        opacity=".26"
        stroke="currentColor"
        stroke-width="2"
      />
      <path d="M83 264h154M107 279h106" stroke="currentColor" stroke-opacity=".35" stroke-linecap="round" />
    </svg>
    <img
      v-if="src && !failed"
      :src="src"
      :alt="`${name}的角色画像`"
      :class="{ loaded }"
      @load="loaded = true"
      @error="failed = true"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{ src: string | null; name: string; cover?: boolean }>();
const loaded = ref(false);
const failed = ref(false);
watch(
  () => props.src,
  () => {
    loaded.value = false;
    failed.value = false;
  },
);
</script>
