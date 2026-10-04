<template>
  <WeChatStickerSheet label="添加表情" :busy="busy" @close="requestClose">
    <header class="wx-sticker-sheet-head">
      <button type="button" :disabled="busy" @click="requestClose">取消</button
      ><strong>{{ drafts.length > 1 ? `添加 ${drafts.length} 张表情` : '添加表情' }}</strong
      ><button class="wx-sticker-accent" type="button" :disabled="busy || !drafts.length" @click="submit">
        {{ busy ? '保存中…' : '保存' }}
      </button>
    </header>
    <div ref="bodyElement" class="wx-sticker-sheet-body">
      <p v-if="error" class="wx-sticker-error" role="alert">{{ error }}</p>
      <p v-if="reading" role="status">{{ reading }}</p>
      <div v-if="!drafts.length && !sourceView" class="wx-sticker-sources">
        <button type="button" :disabled="busy" @click="fileInput?.click()">从设备选择图片</button
        ><button type="button" :disabled="busy" @click="sourceView = 'library'">从图库选择</button
        ><button type="button" :disabled="busy" @click="sourceView = 'url'">使用图片链接</button>
      </div>
      <WeChatImageLibrary
        v-if="sourceView === 'library'"
        :accounts="accounts"
        :assignable="true"
        pick-only
        @sticker="chooseLibraryImage"
      />
      <form v-if="sourceView === 'url'" class="wx-sticker-url" @submit.prevent="chooseUrl">
        <label>图片链接<input v-model="externalUrl" type="url" placeholder="https://…" /></label
        ><button type="submit">使用这张图片</button>
      </form>
      <div
        v-for="(draft, index) in drafts"
        :key="draft.id"
        class="wx-sticker-import-item"
        :class="{ single: drafts.length === 1 }"
      >
        <img :src="resolveWechatImage(draft.url)" :alt="draft.name || '待添加表情'" />
        <label
          >名称<input
            v-model="draft.name"
            :aria-label="`第 ${index + 1} 张表情名称`"
            maxlength="30"
            :disabled="busy || draft.imported"
            placeholder="给表情起个名字"
          /><small v-if="draft.error" class="wx-sticker-error" role="alert">{{ draft.error }}</small
          ><small v-if="draft.imported">使用已有名称</small></label
        >
        <details v-if="!busy">
          <summary>调整图片</summary>
          <button v-if="draft.file && !draft.imported" type="button" @click="crop(draft)">裁剪</button
          ><button type="button" @click="drafts.splice(index, 1)">移除这张</button>
        </details>
      </div>
      <button v-if="drafts.length" class="wx-sticker-subtle" type="button" :disabled="busy" @click="fileInput?.click()">
        再选几张
      </button>
      <button v-if="sourceView" class="wx-sticker-subtle" type="button" :disabled="busy" @click="sourceView = ''">
        返回选择方式
      </button>
      <input
        ref="fileInput"
        class="wx-hidden-file"
        type="file"
        accept="image/*"
        multiple
        :disabled="busy"
        @change="readFiles"
        @cancel="reading = ''"
      />
    </div>
  </WeChatStickerSheet>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import type { 微信数据 } from '../../types';
import { useMagicGirlStatStore } from '../../store/StatStore';
import { chooseImageCrop } from '../../imageCrop';
import { readWechatImageFile, resolveWechatImage } from './imageLibrary';
import { useStickerImport, type StickerDraft } from './stickerImport';
import WeChatImageLibrary from './WeChatImageLibrary.vue';
import WeChatStickerSheet from './WeChatStickerSheet.vue';
import './stickers.css';

const props = defineProps<{
  accountId: string;
  accounts: 微信数据['账号'];
  initialImage?: string;
  chooseFiles?: boolean;
}>();
const emit = defineEmits<{ close: []; saved: [] }>();
const store = useMagicGirlStatStore();
const { drafts, busy, error, addImage, save } = useStickerImport(
  () => props.accountId,
  () => props.accounts,
  store.updateWeChatAccount,
);
const fileInput = ref<HTMLInputElement>();
const bodyElement = ref<HTMLElement>();
const sourceView = ref<'' | 'library' | 'url'>('');
const externalUrl = ref('');
const reading = ref('');
if (props.initialImage) addImage(props.initialImage);
onMounted(() => {
  if (props.chooseFiles && !props.initialImage) fileInput.value?.click();
});

function requestClose() {
  if (busy.value) return;
  if ((drafts.value.length || externalUrl.value) && !window.confirm('放弃尚未保存的表情？')) return;
  emit('close');
}
function chooseLibraryImage(url: string) {
  addImage(url);
  sourceView.value = '';
}
function chooseUrl() {
  if (!/^https?:\/\//.test(externalUrl.value.trim())) {
    error.value = '请填写 http 或 https 图片链接。';
    return;
  }
  addImage(externalUrl.value.trim());
  externalUrl.value = '';
  sourceView.value = '';
  error.value = '';
}
async function readFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = [...(input.files ?? [])];
  if (!files.length || busy.value) return;
  busy.value = true;
  error.value = '';
  const failures: string[] = [];
  try {
    for (const [index, file] of files.entries()) {
      reading.value = `读取 ${index + 1} / ${files.length}`;
      try {
        addImage(await readWechatImageFile(file), file.name.replace(/\.[^.]+$/, '').slice(0, 30), file);
      } catch (cause) {
        failures.push(`${file.name}：${cause instanceof Error ? cause.message : '读取失败'}`);
      }
    }
    error.value = failures.join('；');
    sourceView.value = '';
  } finally {
    busy.value = false;
    reading.value = '';
    input.value = '';
    await nextTick();
    bodyElement.value?.querySelector<HTMLInputElement>('input:not([disabled]):not([type=file])')?.focus();
  }
}
async function crop(draft: StickerDraft) {
  if (!draft.file || busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    const file = await chooseImageCrop(draft.file);
    if (file) {
      draft.url = await readWechatImageFile(file);
      draft.file = file;
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '裁剪失败。';
  } finally {
    busy.value = false;
  }
}
async function submit() {
  if (await save()) {
    emit('saved');
    emit('close');
  }
}
</script>
