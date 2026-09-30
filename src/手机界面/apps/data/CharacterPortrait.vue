<template>
  <div
    class="character-portrait"
    :class="{ 'character-portrait-cover': cover, 'character-portrait-empty': !src || failed }"
    :aria-label="src && !failed ? `${name}的角色画像` : undefined"
  >
    <img v-if="src && !failed" :src="src" :alt="`${name}的角色画像`" @error="failed = true" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{ src: string | null; name: string; cover?: boolean }>();
const failed = ref(false);
watch(
  () => props.src,
  () => {
    failed.value = false;
  },
);
</script>
