<template>
  <span class="role-avatar-frame" :class="`fallback-${fallbackIndex}`">
    <img v-if="src && !failed" :src="src" :alt="alt" @error="failed = true" />
    <svg v-else viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="43" />
      <path
        v-if="fallbackIndex === 0"
        d="M29 78c3-15 11-23 21-23s18 8 21 23M50 22a15 15 0 1 1 0 30 15 15 0 0 1 0-30Z"
      />
      <path
        v-else-if="fallbackIndex === 1"
        d="M26 76c5-14 13-21 24-21s19 7 24 21M34 38c0-12 7-20 16-20s16 8 16 20c-5-5-10-8-16-8s-11 3-16 8Zm4 1c1 11 5 17 12 17s11-6 12-17"
      />
      <path
        v-else-if="fallbackIndex === 2"
        d="M25 76c4-14 13-22 25-22s21 8 25 22M34 43V31l8-12 8 7 8-7 8 12v12c0 9-7 16-16 16s-16-7-16-16Z"
      />
      <path
        v-else-if="fallbackIndex === 3"
        d="M27 77c4-15 12-22 23-22s19 7 23 22M31 35l10-16 9 7 9-7 10 16-5 17H36l-5-17Zm11 5h16"
      />
      <path
        v-else-if="fallbackIndex === 4"
        d="M26 77c5-15 13-22 24-22s19 7 24 22M35 31c3-9 8-14 15-14s12 5 15 14l-4 21H39l-4-21Zm3 7 12-8 12 8"
      />
      <path
        v-else
        d="M27 77c4-15 12-22 23-22s19 7 23 22M33 34c5-11 10-16 17-16s12 5 17 16l-6 20H39l-6-20Zm7 5h20M50 18v36"
      />
      <path class="sigil" d="m50 8 7 10-7 5-7-5 7-10Zm0 84-7-10 7-5 7 5-7 10Z" />
    </svg>
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = withDefaults(defineProps<{ src?: string; alt?: string; seed?: string; fallbackStyle?: string }>(), {
  src: '',
  alt: '角色头像',
  seed: '',
  fallbackStyle: 'auto',
});
const failed = ref(false);
const fallbackIndex = computed(() => {
  if (/^[0-5]$/.test(props.fallbackStyle)) return Number(props.fallbackStyle);
  let hash = 2166136261;
  for (const char of props.seed || props.alt) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) % 6;
});
watch(
  () => props.src,
  () => (failed.value = false),
);
</script>

<style scoped>
.role-avatar-frame {
  position: relative;
  display: inline-grid;
  flex: 0 0 auto;
  width: var(--avatar-size, 58px);
  height: var(--avatar-size, 58px);
  place-items: center;
  overflow: hidden;
  color: #c9b485;
  background: radial-gradient(circle at 50% 35%, #343027, #090a0c 72%);
  border: 1px solid #8a7953;
  border-radius: 50%;
  box-shadow:
    0 0 0 3px #0d0f12,
    0 0 0 4px rgba(201, 180, 133, 0.2);
}
.role-avatar-frame::after {
  position: absolute;
  inset: 4px;
  pointer-events: none;
  content: '';
  border: 1px solid rgba(201, 180, 133, 0.25);
  border-radius: inherit;
}
img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
svg {
  width: 70%;
  height: 70%;
  fill: none;
  stroke: currentColor;
  stroke-width: 3;
  opacity: 0.82;
}
.sigil {
  stroke-width: 2;
  opacity: 0.55;
}
</style>
