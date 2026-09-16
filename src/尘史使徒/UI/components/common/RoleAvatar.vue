<template>
  <span class="role-avatar-frame">
    <img v-if="src && !failed" :src="src" :alt="alt" @error="failed = true" />
    <svg v-else viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="43" />
      <path d="M29 78c3-15 11-23 21-23s18 8 21 23M50 22a15 15 0 1 1 0 30 15 15 0 0 1 0-30Z" />
      <path class="sigil" d="m50 8 7 10-7 5-7-5 7-10Zm0 84-7-10 7-5 7 5-7 10Z" />
    </svg>
  </span>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = withDefaults(defineProps<{ src?: string; alt?: string }>(), {
  src: '',
  alt: '角色头像',
});
const failed = ref(false);
watch(() => props.src, () => (failed.value = false));
</script>

<style scoped>
.role-avatar-frame {
  position: relative; display: inline-grid; flex: 0 0 auto;
  width: var(--avatar-size, 58px); height: var(--avatar-size, 58px); place-items: center; overflow: hidden;
  color: #c9b485; background: radial-gradient(circle at 50% 35%, #343027, #090a0c 72%);
  border: 1px solid #8a7953; border-radius: 50%; box-shadow: 0 0 0 3px #0d0f12, 0 0 0 4px rgba(201,180,133,.2);
}
.role-avatar-frame::after { position: absolute; inset: 4px; pointer-events: none; content: ''; border: 1px solid rgba(201,180,133,.25); border-radius: inherit; }
img { width: 100%; height: 100%; object-fit: cover; }
svg { width: 70%; height: 70%; fill: none; stroke: currentColor; stroke-width: 3; opacity: 0.82; }
.sigil { stroke-width: 2; opacity: 0.55; }
</style>
