<template>
  <section class="wx-account-page wx-manager">
    <header class="wx-header">
      <button class="wx-back" type="button" aria-label="返回设置" @click="closeManager">‹</button
      ><strong>账号管理</strong>
    </header>
    <form v-if="!unlocked" class="wx-manager-gate" @submit.prevent="unlock">
      <strong>进入账号管理</strong>
      <p>管理当前聊天的账号、头像、好友和表情包。</p>
      <label>管理密码<input v-model="password" type="password" autocomplete="off" /></label>
      <p v-if="error" class="wx-error" role="alert">{{ error }}</p>
      <button class="wx-manager-primary" type="submit">进入管理</button>
    </form>
    <div v-else class="wx-manager-shell">
      <section class="wx-manager-roster" aria-label="账号列表">
        <div class="wx-manager-section-head">
          <div>
            <small>ACCOUNTS</small>
            <h2>全部账号</h2>
          </div>
          <span>{{ rosterEntries.length }} 位</span>
        </div>
        <input v-model="accountSearch" type="search" placeholder="搜索昵称或账号 ID" aria-label="搜索账号" />
        <div class="wx-manager-account-list">
          <button
            v-for="entry in filteredRoster"
            :key="entry.id"
            type="button"
            :class="{ active: selectedId === entry.id }"
            :aria-pressed="selectedId === entry.id"
            @click="selectAccount(entry.id)"
          >
            <WeChatAvatar v-if="entry.hasAccount" :id="entry.id" :accounts="accounts" />
            <span v-else class="wx-avatar"><img :src="entry.avatar" alt="" /></span>
            <span
              ><strong>{{ entry.name }}</strong
              ><small>{{ entry.hasAccount ? entry.id : `未建号 · ${entry.id}` }}</small></span
            >
          </button>
          <p v-if="!filteredRoster.length" class="wx-manager-empty">没有找到账号。</p>
        </div>
      </section>
      <nav class="wx-manager-tabs" aria-label="管理内容">
        <button type="button" :class="{ active: view === 'account' }" @click="view = 'account'">账号资料</button>
        <button type="button" :class="{ active: view === 'library' }" @click="view = 'library'">图片库</button>
      </nav>
      <section v-if="view === 'account' && selectedAccount" class="wx-manager-editor">
        <div class="wx-manager-section-head">
          <div>
            <small>{{ selectedId }}</small>
            <h2>{{ selectedAccount.昵称 || selectedId }}</h2>
          </div>
          <span>编辑账号</span>
        </div>
        <label class="wx-manager-field">昵称<input v-model="name" maxlength="40" /></label>
        <div class="wx-manager-avatar-field">
          <div class="wx-manager-avatar-preview">
            <img v-if="resolveWechatImage(avatar)" :src="resolveWechatImage(avatar)" alt="待保存的头像" />
            <span v-else>{{ (name || selectedId).slice(0, 1) }}</span>
          </div>
          <div>
            <strong>头像</strong><small>从图片库选图，保存账号后生效</small>
            <button type="button" @click="openLibrary('avatar')">从图片库选择</button>
            <button type="button" @click="avatar = ''">清空</button>
          </div>
        </div>
        <details class="wx-manager-external-url">
          <summary>使用外部头像 URL</summary>
          <input v-model="avatar" placeholder="https://… 或 data:image/…" aria-label="头像 URL" />
        </details>
        <div class="wx-manager-subhead">
          <strong>表情包</strong><span>{{ Object.keys(stickers).length }} 个</span>
        </div>
        <div v-if="Object.keys(stickers).length" class="wx-manager-stickers">
          <div v-for="[label, url] in Object.entries(stickers)" :key="label" class="wx-manager-sticker">
            <img v-if="resolveWechatImage(url)" :src="resolveWechatImage(url)" :alt="label" />
            <span>{{ label }}</span
            ><button type="button" :aria-label="`删除表情 ${label}`" @click="delete stickers[label]">删除</button>
          </div>
        </div>
        <p v-else class="wx-manager-muted">当前账号还没有表情包。</p>
        <div class="wx-manager-new-sticker">
          <label class="wx-manager-field"
            >表情名称<input v-model="stickerName" maxlength="30" placeholder="例如：开心"
          /></label>
          <div class="wx-manager-sticker-source">
            <img v-if="resolveWechatImage(stickerUrl)" :src="resolveWechatImage(stickerUrl)" alt="待添加的表情" />
            <span v-else>尚未选图</span>
            <button type="button" @click="openLibrary('sticker')">从图片库选图</button>
            <button v-if="stickerUrl" type="button" @click="stickerUrl = ''">清除选图</button>
          </div>
          <details class="wx-manager-external-url">
            <summary>使用外部表情 URL</summary>
            <input v-model="stickerUrl" placeholder="https://… 或 data:image/…" aria-label="表情图片 URL" />
          </details>
          <button type="button" @click="addSticker">添加表情</button>
        </div>
        <details class="wx-manager-friends">
          <summary>
            好友关系 <span>{{ friends.length }} 位</span>
          </summary>
          <div class="wx-manager-friend-list">
            <label v-for="[id, account] in accountEntries.filter(([id]) => id !== selectedId)" :key="id">
              <input v-model="friends" type="checkbox" :value="id" />{{ account.昵称 }}（{{ id }}）
            </label>
          </div>
        </details>
        <p v-if="notice" class="wx-manager-notice" role="status">{{ notice }}</p>
        <p v-if="error" class="wx-error" role="alert">{{ error }}</p>
        <button class="wx-manager-primary wx-manager-save" type="button" :disabled="saving" @click="save">
          {{ saving ? '正在保存…' : '保存账号' }}
        </button>
      </section>
      <section v-else-if="view === 'account' && selectedRole" class="wx-manager-editor">
        <div class="wx-manager-section-head">
          <div>
            <small>{{ selectedId }}</small>
            <h2>{{ selectedRole.name }}</h2>
          </div>
          <span>尚未建号</span>
        </div>
        <p class="wx-manager-empty">该角色还没有账号。创建后即可设置头像、表情包和好友关系。</p>
        <button class="wx-manager-primary" type="button" :disabled="creating" @click="createAccount">
          {{ creating ? '正在创建…' : '为此角色创建账号' }}
        </button>
        <p v-if="error" class="wx-error" role="alert">{{ error }}</p>
      </section>
      <WeChatImageLibrary
        v-else-if="view === 'library'"
        :accounts="accounts"
        :assignable="!!selectedAccount"
        @avatar="chooseAvatar"
        @sticker="chooseSticker"
      />
      <p v-if="view === 'library' && notice" class="wx-manager-notice" role="status">{{ notice }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { wechatRoleAvatar } from '../../../尘史使徒/UI/components/common/roleAvatarFallback';
import { useMagicGirlStatStore } from '../../store/StatStore';
import { resolveWechatImage } from './imageLibrary';
import WeChatAvatar from './WeChatAvatar.vue';
import WeChatImageLibrary from './WeChatImageLibrary.vue';

const emit = defineEmits<{ close: [] }>();
const store = useMagicGirlStatStore();
const password = ref('');
const unlocked = ref(false);
const error = ref('');
const notice = ref('');
const saving = ref(false);
const creating = ref(false);
const selectedId = ref('user');
const accountSearch = ref('');
const view = ref<'account' | 'library'>('account');
const accounts = computed(() => store.statData?.手机?.微信?.账号 ?? {});
const accountEntries = computed(() => Object.entries(accounts.value));
const roleEntries = computed(() => {
  const roles = store.statData?.角色;
  return [
    ...Object.entries(roles?.主要角色 ?? {}).map(([id, role]) => ({
      id,
      name: role.基础信息.姓名 || id,
      avatar: wechatRoleAvatar(role.meta, id),
    })),
    ...Object.entries(roles?.次要角色 ?? {}).map(([id, role]) => ({
      id,
      name: id,
      avatar: wechatRoleAvatar(role.meta, id),
    })),
  ];
});
const rosterEntries = computed(() => [
  ...accountEntries.value.map(([id, account]) => ({ id, name: account.昵称 || id, avatar: '', hasAccount: true })),
  ...roleEntries.value.filter(role => !accounts.value[role.id]).map(role => ({ ...role, hasAccount: false })),
]);
const filteredRoster = computed(() =>
  rosterEntries.value.filter(entry =>
    `${entry.id} ${entry.name}`.toLowerCase().includes(accountSearch.value.trim().toLowerCase()),
  ),
);
const selectedAccount = computed(() => accounts.value[selectedId.value]);
const selectedRole = computed(() => roleEntries.value.find(role => role.id === selectedId.value));
const name = ref('');
const avatar = ref('');
const stickers = ref<Record<string, string>>({});
const friends = ref<string[]>([]);
const stickerName = ref('');
const stickerUrl = ref('');
const isDirty = computed(
  () =>
    !!selectedAccount.value &&
    (name.value !== selectedAccount.value.昵称 ||
      avatar.value !== selectedAccount.value.头像 ||
      JSON.stringify(stickers.value) !== JSON.stringify(selectedAccount.value.表情包) ||
      JSON.stringify(friends.value) !== JSON.stringify(selectedAccount.value.好友) ||
      !!stickerName.value ||
      !!stickerUrl.value),
);

function unlock() {
  if (password.value !== '987') {
    error.value = '密码错误。';
    return;
  }
  unlocked.value = true;
  password.value = '';
  error.value = '';
}
watch(
  selectedAccount,
  account => {
    name.value = account?.昵称 ?? '';
    avatar.value = account?.头像 ?? '';
    stickers.value = { ...(account?.表情包 ?? {}) };
    friends.value = [...(account?.好友 ?? [])];
    stickerName.value = '';
    stickerUrl.value = '';
    error.value = '';
  },
  { immediate: true },
);

function selectAccount(id: string) {
  if (id === selectedId.value) return;
  if (isDirty.value && !window.confirm('当前账号有未保存的修改，切换后会丢失。继续切换？')) return;
  selectedId.value = id;
  notice.value = '';
}
function closeManager() {
  if (isDirty.value && !window.confirm('当前账号有未保存的修改，离开后会丢失。继续返回？')) return;
  emit('close');
}
async function createAccount() {
  if (!selectedRole.value || creating.value) return;
  creating.value = true;
  error.value = '';
  try {
    await store.ensureWeChatAccount(selectedRole.value.id, selectedRole.value.name, selectedRole.value.avatar);
    notice.value = '账号已创建，现在可以编辑资料和选用图片。';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '创建账号失败。';
  } finally {
    creating.value = false;
  }
}
function openLibrary(target: 'avatar' | 'sticker') {
  view.value = 'library';
  notice.value = target === 'avatar' ? '选中图片后点击“设为头像”。' : '选中图片后点击“选作表情”。';
}
function chooseAvatar(url: string) {
  avatar.value = url;
  view.value = 'account';
  notice.value = '头像已选中，点击“保存账号”后生效。';
}
function chooseSticker(url: string) {
  stickerUrl.value = url;
  view.value = 'account';
  notice.value = '图片已选中，填写表情名称并点击“添加表情”，然后保存账号。';
}
function addSticker() {
  const label = stickerName.value.trim();
  if (!label || !stickerUrl.value.trim()) {
    error.value = '请填写表情名称并选择图片。';
    return;
  }
  if (stickers.value[label]) {
    error.value = '表情名称已存在。';
    return;
  }
  stickers.value = { ...stickers.value, [label]: stickerUrl.value.trim() };
  stickerName.value = '';
  stickerUrl.value = '';
  notice.value = '表情已加入草稿，点击“保存账号”后生效。';
  error.value = '';
}
async function save() {
  if (!selectedAccount.value || saving.value) return;
  if (stickerName.value.trim() || stickerUrl.value.trim()) {
    error.value = '新表情尚未添加，请先点击“添加表情”或清空草稿。';
    return;
  }
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
