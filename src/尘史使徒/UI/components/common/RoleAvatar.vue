<template>
  <span class="role-avatar-frame" :style="{ '--avatar-theme': themeColor, '--avatar-theme-ring': `${themeColor}33` }">
    <img v-if="src && !failed" :src="src" :alt="alt" @error="failed = true" />
    <img v-else :src="fallbackUrl" alt="" aria-hidden="true" />
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { roleAvatarFallbackDataUri } from './roleAvatarFallback';

const props = withDefaults(
  defineProps<{ src?: string; alt?: string; seed?: string; fallbackStyle?: string; themeColor?: string }>(),
  {
    src: '',
    alt: '角色头像',
    seed: '',
    fallbackStyle: 'auto',
    themeColor: '#C9B485',
  },
);
const failed = ref(false);
const themeColor = computed(() => (/^#[0-9a-fA-F]{6}$/.test(props.themeColor) ? props.themeColor : '#C9B485'));
const fallbackUrl = computed(() =>
  roleAvatarFallbackDataUri(props.fallbackStyle, props.seed || props.alt, themeColor.value),
);
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
  border: 1px solid var(--avatar-theme, #c9b485);
  border-radius: 50%;
  box-shadow:
    0 0 0 3px #0d0f12,
    0 0 0 4px var(--avatar-theme-ring, rgba(201, 180, 133, 0.2));
}
.role-avatar-frame::after {
  position: absolute;
  inset: 4px;
  pointer-events: none;
  content: '';
  border: 1px solid var(--avatar-theme-ring, rgba(201, 180, 133, 0.25));
  border-radius: inherit;
}
img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
