<template>
  <div class="wx-sticker-picker">
    <div class="wx-sticker-picker-head">
      <strong>我的表情 · {{ names.length }}</strong>
      <div class="wx-sticker-picker-actions">
        <button type="button" @click="emit('add')">＋ 添加</button
        ><button type="button" @click="emit('manage')">管理</button>
      </div>
    </div>
    <input
      v-if="names.length"
      v-model="search"
      class="wx-sticker-search"
      type="search"
      placeholder="搜索表情"
      aria-label="搜索我的表情"
    />
    <div class="wx-custom-sticker-grid">
      <p v-if="!names.length" class="wx-sticker-empty">还没有表情，点击上方添加。</p>
      <p v-else-if="!visible.length" class="wx-sticker-empty">没有找到这个表情。</p>
      <button
        v-for="name in visible"
        :key="name"
        class="wx-sticker-choice"
        type="button"
        :disabled="disabled"
        :aria-label="`发送 ${name}`"
        @click="emit('send', name)"
      >
        <img :src="resolveWechatImage(stickers[name])" :alt="name" loading="lazy" /><small>{{ name }}</small>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { readStickerPreferences, resolveWechatImage } from './imageLibrary';
const props = withDefaults(defineProps<{ stickers: Record<string, string>; disabled?: boolean }>(), {
  disabled: false,
});
const emit = defineEmits<{ add: []; manage: []; send: [name: string] }>();
const search = ref('');
defineExpose({
  clearSearch: () => {
    search.value = '';
  },
});
const names = computed(() => {
  const favorites = readStickerPreferences().favorites;
  return Object.keys(props.stickers)
    .reverse()
    .sort((a, b) => Number(favorites.includes(b)) - Number(favorites.includes(a)));
});
const visible = computed(() =>
  names.value.filter(name => name.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())),
);
</script>

<style scoped>
.wx-sticker-picker-actions {
  display: flex;
  gap: 6px;
}
.wx-sticker-picker-head strong {
  min-width: 0;
}
.wx-sticker-picker-head .wx-sticker-picker-actions {
  flex: none;
}
</style>
