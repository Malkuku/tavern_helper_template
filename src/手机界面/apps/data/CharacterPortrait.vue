<template>
  <div class="character-portrait" :class="{ 'character-portrait-cover': cover }" :aria-label="`${name}的角色画像`">
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
