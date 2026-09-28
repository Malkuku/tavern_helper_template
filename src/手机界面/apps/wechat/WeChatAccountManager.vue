<template>
  <section class="wx-account-page wx-manager">
    <header class="wx-header">
      <button class="wx-back" type="button" @click="emit('close')">‹</button><strong>账号管理</strong>
    </header>
    <form v-if="!unlocked" class="wx-manager-body" @submit.prevent="unlock">
      <label>管理密码<input v-model="password" type="password" autocomplete="off" /></label>
      <p v-if="error" class="wx-error" role="alert">{{ error }}</p>
      <button type="submit">进入</button>
    </form>
    <div v-else class="wx-manager-body">
      <div class="wx-manager-upload">
        <strong>图片库</strong>
        <p>先上传图片，再在下方设为头像或表情包。图片可供多个账号使用。</p>
        <label class="wx-manager-upload-button"
          >＋ 上传图片<input type="file" accept="image/*" @change="upload"
        /></label>
        <p v-if="notice" class="wx-manager-note" role="status">{{ notice }}</p>
      </div>
      <label
        >账号
        <select v-model="selectedId">
          <option v-for="[id, account] in accountEntries" :key="id" :value="id">{{ account.昵称 }}（{{ id }}）</option>
        </select>
      </label>
      <template v-if="selectedAccount">
        <label>昵称<input v-model="name" maxlength="40" /></label>
        <label>头像 URL<input v-model="avatar" placeholder="图片库引用或外部 URL" /></label>
        <img
          v-if="resolveWechatImage(avatar)"
          class="wx-manager-preview"
          :src="resolveWechatImage(avatar)"
          alt="头像预览"
        />
        <button type="button" @click="avatar = ''">清空头像</button>
        <strong>表情包</strong>
        <div v-for="[label, url] in Object.entries(stickers)" :key="label" class="wx-manager-sticker">
          <img v-if="resolveWechatImage(url)" :src="resolveWechatImage(url)" :alt="label" />
          <span>{{ label }}</span
          ><button type="button" @click="delete stickers[label]">删除</button>
        </div>
        <label>新表情名称<input v-model="stickerName" maxlength="30" /></label>
        <label>图片 URL<input v-model="stickerUrl" placeholder="从下方图片库选择，或填写外部 URL" /></label>
        <button type="button" @click="addSticker">添加表情包</button>
        <strong>好友</strong>
        <label
          v-for="[id, account] in accountEntries.filter(([id]) => id !== selectedId)"
          :key="id"
          class="wx-manager-friend"
        >
          <input v-model="friends" type="checkbox" :value="id" />{{ account.昵称 }}（{{ id }}）
        </label>
        <button type="button" :disabled="saving" @click="save">保存账号</button>
      </template>
      <p class="wx-manager-note">图片库属于脚本，可能被其他聊天引用。清理前请确认其他聊天也不再使用。</p>
      <div class="wx-manager-library">
        <div v-for="[url, data] in images" :key="url" class="wx-manager-image">
          <img :src="data" alt="图片库图片" />
          <button type="button" @click="avatar = url">设为头像</button>
          <button type="button" @click="stickerUrl = url">选作表情</button>
          <button type="button" :disabled="usedImages.has(url)" @click="removeImage(url)">清理</button>
        </div>
      </div>
      <p v-if="error" class="wx-error" role="alert">{{ error }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMagicGirlStatStore } from '../../store/StatStore';
import {
  deleteWechatImage,
  imageLibraryEntries,
  imageReferences,
  readWechatImageFile,
  refreshWechatImageLibrary,
  resolveWechatImage,
  storeWechatImage,
} from './imageLibrary';

const emit = defineEmits<{ close: [] }>();
const store = useMagicGirlStatStore();
const password = ref('');
const unlocked = ref(false);
const error = ref('');
const notice = ref('');
const saving = ref(false);
const selectedId = ref('user');
const accounts = computed(() => store.statData?.手机?.微信?.账号 ?? {});
const accountEntries = computed(() => Object.entries(accounts.value));
const selectedAccount = computed(() => accounts.value[selectedId.value]);
const name = ref('');
const avatar = ref('');
const stickers = ref<Record<string, string>>({});
const friends = ref<string[]>([]);
const stickerName = ref('');
const stickerUrl = ref('');
const images = ref<[string, string][]>([]);
const usedImages = computed(() => imageReferences(accounts.value));

function unlock() {
  if (password.value !== '987') {
    error.value = '密码错误。';
    return;
  }
  unlocked.value = true;
  password.value = '';
  error.value = '';
  refreshWechatImageLibrary();
  images.value = imageLibraryEntries();
}
watch(
  selectedAccount,
  account => {
    name.value = account?.昵称 ?? '';
    avatar.value = account?.头像 ?? '';
    stickers.value = { ...(account?.表情包 ?? {}) };
    friends.value = [...(account?.好友 ?? [])];
    error.value = '';
  },
  { immediate: true },
);

function addSticker() {
  const label = stickerName.value.trim();
  if (!label || !stickerUrl.value.trim()) {
    error.value = '请填写表情包名称和图片 URL。';
    return;
  }
  if (stickers.value[label]) {
    error.value = '表情包名称已存在。';
    return;
  }
  stickers.value = { ...stickers.value, [label]: stickerUrl.value.trim() };
  stickerName.value = '';
  stickerUrl.value = '';
  error.value = '';
}

async function upload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    storeWechatImage(await readWechatImageFile(file));
    images.value = imageLibraryEntries();
    notice.value = '图片已保存到脚本变量。';
    error.value = '';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '图片上传失败。';
  }
  input.value = '';
}

function removeImage(url: string) {
  try {
    deleteWechatImage(url, accounts.value);
    images.value = imageLibraryEntries();
    notice.value = '图片已清理。';
    error.value = '';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '清理失败。';
  }
}

async function save() {
  if (!selectedAccount.value || saving.value) return;
  saving.value = true;
  error.value = '';
  try {
    await store.updateWeChatAccount(selectedId.value, name.value, avatar.value, stickers.value, friends.value);
    notice.value = '账号已保存。';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '账号保存失败。';
  } finally {
    saving.value = false;
  }
}
</script>
