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
        d="m50 16 8 20 21-3-16 14 10 19-23-8-23 8 10-19L21 33l21 3 8-20Zm0 20v22M37 47h26"
      />
      <path
        v-else-if="fallbackIndex === 2"
        d="m61 17 9 9-12 12-6-6 9-15ZM52 32 27 71l3 3 4-3 3 4 4-4 3 3 20-36-12-6ZM24 76l12-4"
      />
      <path
        v-else-if="fallbackIndex === 3"
        d="M67 17C46 21 31 39 27 71c13-4 25-13 31-26M30 70l-7 12M37 61l18-2M43 52l17-3M49 42l15-4"
      />
      <path
        v-else-if="fallbackIndex === 4"
        d="M15 50s13-19 35-19 35 19 35 19-13 19-35 19S15 50 15 50Zm35-11a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm0 4v14M43 50h14"
      />
      <path
        v-else
        d="M69 20A34 34 0 1 0 78 69 29 29 0 1 1 69 20ZM29 61l12-5M35 70l9-8"
      />
      <path v-if="fallbackIndex === 0" class="sigil" d="m50 8 7 10-7 5-7-5 7-10Zm0 84-7-10 7-5 7 5-7 10Z" />
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
