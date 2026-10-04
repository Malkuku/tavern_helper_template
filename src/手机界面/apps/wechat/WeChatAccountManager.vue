<template>
  <section class="wx-account-page wx-manager">
    <WeChatStickerManager
      v-if="view === 'stickers' && selectedAccount"
      :account-id="selectedId"
      :accounts="accounts"
      @close="view = 'account'"
    />
    <WeChatStickerImport
      v-if="libraryStickerUrl && selectedAccount"
      :account-id="selectedId"
      :accounts="accounts"
      :initial-image="libraryStickerUrl"
      @close="libraryStickerUrl = ''"
    />
    <header v-if="view !== 'stickers'" class="wx-header">
      <button class="wx-back" type="button" aria-label="返回" @click="closeManager">‹</button><strong>账号管理</strong>
    </header>
    <form v-if="view === 'account' && !unlocked" class="wx-manager-gate" @submit.prevent="unlock">
      <strong>进入账号管理</strong>
      <p>管理当前聊天的账号、头像、好友和表情包。</p>
      <label>管理密码<input v-model="password" type="password" autocomplete="off" /></label>
      <p v-if="error" class="wx-error" role="alert">{{ error }}</p>
      <button class="wx-manager-primary" type="submit">进入管理</button>
    </form>
    <div v-else-if="view !== 'stickers'" class="wx-manager-shell">
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
        <button type="button" :class="{ active: view === 'account' }" @click="changeView('account')">资料</button>
        <button type="button" :disabled="!selectedAccount" @click="changeView('stickers')">表情包</button>
        <button type="button" :class="{ active: view === 'library' }" @click="changeView('library')">图片库</button>
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
            <button type="button" @click="openLibrary()">从图片库选择</button>
            <button type="button" @click="avatar = ''">清空</button>
          </div>
        </div>
        <details class="wx-manager-external-url">
          <summary>使用外部头像 URL</summary>
          <input v-model="avatar" placeholder="https://… 或 data:image/…" aria-label="头像 URL" />
        </details>
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
import WeChatStickerManager from './WeChatStickerManager.vue';
import WeChatStickerImport from './WeChatStickerImport.vue';
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
const view = ref<'account' | 'stickers' | 'library'>('account');
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
const friends = ref<string[]>([]);
const libraryStickerUrl = ref('');
const isDirty = computed(
  () =>
    !!selectedAccount.value &&
    (name.value !== selectedAccount.value.昵称 ||
      avatar.value !== selectedAccount.value.头像 ||
      JSON.stringify(friends.value) !== JSON.stringify(selectedAccount.value.好友)),
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
    friends.value = [...(account?.好友 ?? [])];
    error.value = '';
  },
  { immediate: true },
);

function selectAccount(id: string) {
  if (id === selectedId.value) return;
  if (isDirty.value && !window.confirm('当前账号有未保存的修改，切换后会丢失。继续切换？')) return;
  selectedId.value = id;
  libraryStickerUrl.value = '';
  notice.value = '';
}
function changeView(next: 'account' | 'stickers' | 'library') {
  if (next === view.value) return;
  if (view.value === 'account' && isDirty.value && !window.confirm('账号资料尚未保存，切换后会丢失。继续？')) return;
  if (view.value === 'account') {
    name.value = selectedAccount.value?.昵称 ?? '';
    avatar.value = selectedAccount.value?.头像 ?? '';
    friends.value = [...(selectedAccount.value?.好友 ?? [])];
  }
  libraryStickerUrl.value = '';
  view.value = next;
  notice.value = '';
  error.value = '';
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
function openLibrary() {
  changeView('library');
  if (view.value !== 'library') return;
  notice.value = '选中图片后点击“设为头像”。';
}
function chooseAvatar(url: string) {
  changeView('account');
  if (view.value !== 'account') return;
  avatar.value = url;
  notice.value = '头像已选中，点击“保存账号”后生效。';
}
function chooseSticker(url: string) {
  libraryStickerUrl.value = url;
}
async function save() {
  if (!selectedAccount.value || saving.value) return;
  saving.value = true;
  error.value = '';
  try {
    await store.updateWeChatAccount(
      selectedId.value,
      name.value,
      avatar.value,
      selectedAccount.value.表情包,
      friends.value,
    );
    notice.value = '账号已保存。';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '账号保存失败。';
  } finally {
    saving.value = false;
  }
}
</script>
