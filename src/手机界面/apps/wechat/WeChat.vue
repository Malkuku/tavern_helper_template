<template>
  <div class="wechat">
    <template v-if="selectedSession && selectedKey">
      <header class="wx-header">
        <button class="wx-back" type="button" aria-label="返回微信" @click="selectedKey = null">‹</button>
        <strong>{{ selectedTitle }}</strong>
        <small v-if="selectedSession.类型 === '群聊'" class="wx-header-side"
          >{{ selectedSession.成员.length }} 人</small
        >
      </header>
      <div ref="messagesElement" class="wx-messages">
        <p v-if="!selectedSession.消息.length && !pending" class="wx-empty">还没有消息，发一条开始聊天。</p>
        <div
          v-for="(message, index) in selectedSession.消息"
          :key="index"
          class="wx-message"
          :class="{ mine: message.发送者 === 'user' }"
        >
          <WeChatAvatar :id="message.发送者" :accounts="accounts" />
          <div class="wx-message-main">
            <small v-if="selectedSession.类型 === '群聊' && message.发送者 !== 'user'">{{
              accounts[message.发送者]?.昵称 || message.发送者
            }}</small>
            <div class="wx-bubble">
              <WeChatMessageContent :items="message.内容" :accounts="accounts" :sender="message.发送者" />
            </div>
            <div class="wx-message-meta">
              <time>{{ displayTime(message.时间) }}</time
              ><button type="button" @click="quoteMessage(message)">引用</button>
            </div>
          </div>
        </div>
        <div v-if="pending" class="wx-message mine wx-pending">
          <WeChatAvatar id="user" :accounts="accounts" />
          <div class="wx-message-main">
            <div class="wx-bubble">
              <WeChatMessageContent :items="pending.内容" :accounts="accounts" sender="user" />
            </div>
            <small>等待正文确认 · <button type="button" @click="retrySend">重试生成</button></small>
          </div>
        </div>
      </div>
      <p v-if="error" class="wx-error" role="alert">{{ error }}</p>
      <div v-if="quoted" class="wx-compose-quote">
        <span>引用 {{ accounts[quoted.发送者]?.昵称 || quoted.发送者 }}：{{ contentSummary(quoted.内容) }}</span>
        <button type="button" aria-label="取消引用" @click="quoted = null">×</button>
      </div>
      <div v-if="stickerOpen && stickerNames.length" class="wx-sticker-picker">
        <button
          v-for="name in stickerNames"
          :key="name"
          type="button"
          :disabled="!!pending || sending || !worldTime"
          @click="sendSticker(name)"
        >
          {{ name }}
        </button>
      </div>
      <form class="wx-compose" @submit.prevent="sendMessage">
        <button
          class="wx-compose-sticker"
          type="button"
          aria-label="选择表情包"
          :disabled="!stickerNames.length"
          @click="stickerOpen = !stickerOpen"
        >
          ☺
        </button>
        <input
          v-model="draft"
          aria-label="输入消息"
          :placeholder="worldTime ? '发送消息' : '世界时间未设置'"
          :disabled="!!pending || sending || !worldTime"
        />
        <button type="submit" :disabled="!draft.trim() || !!pending || sending || !worldTime">发送</button>
      </form>
    </template>

    <template v-else-if="subPage === 'requests'">
      <header class="wx-header">
        <button class="wx-back" type="button" aria-label="返回通讯录" @click="subPage = null">‹</button>
        <strong>朋友申请</strong>
      </header>
      <div class="wx-body">
        <div class="wx-section-label">收到的申请</div>
        <div v-for="[id, request] in incomingRequests" :key="id" class="wx-list-row wx-request-row">
          <WeChatAvatar :id="id" :accounts="accounts" />
          <div class="wx-row-main">
            <strong>{{ accounts[id]?.昵称 || id }}</strong
            ><small>{{ request.验证消息 }}</small>
          </div>
          <button type="button" class="wx-small-action" @click="respondFriend(id, true)">同意</button>
          <button type="button" class="wx-small-action muted" @click="respondFriend(id, false)">拒绝</button>
        </div>
        <p v-if="!incomingRequests.length" class="wx-empty">暂无待处理申请</p>
        <div class="wx-section-label">已发送</div>
        <div v-for="[id, request] in outgoingRequests" :key="id" class="wx-list-row">
          <WeChatAvatar :id="id" :accounts="accounts" />
          <div class="wx-row-main">
            <strong>{{ accounts[id]?.昵称 || id }}</strong
            ><small>{{ request.验证消息 }}</small>
          </div>
          <span class="wx-muted">等待同意</span>
        </div>
        <p v-if="error" class="wx-error" role="alert">{{ error }}</p>
      </div>
    </template>

    <template v-else-if="subPage === 'add'">
      <header class="wx-header">
        <button class="wx-back" type="button" aria-label="返回通讯录" @click="subPage = null">‹</button>
        <strong>添加朋友</strong>
      </header>
      <div class="wx-body">
        <label class="wx-search"
          ><span>⌕</span><input v-model="query" aria-label="搜索账号" placeholder="搜索昵称或账号"
        /></label>
        <label class="wx-request-message"
          >验证消息<input v-model="requestMessage" maxlength="100" placeholder="请求添加好友"
        /></label>
        <div v-for="[id, account] in addCandidates" :key="id" class="wx-list-row">
          <WeChatAvatar :id="id" :accounts="accounts" />
          <strong>{{ account.昵称 || id }}</strong>
          <button
            type="button"
            class="wx-small-action"
            :disabled="!!self?.好友请求?.发出?.[id]"
            @click="requestFriend(id)"
          >
            {{ self?.好友请求?.发出?.[id] ? '已申请' : '申请' }}
          </button>
        </div>
        <p v-if="!addCandidates.length" class="wx-empty">没有可添加的账号</p>
        <p v-if="error" class="wx-error" role="alert">{{ error }}</p>
      </div>
    </template>

    <template v-else>
      <header class="wx-header">
        <strong>{{ tabs.find(item => item.id === tab)?.label }}</strong>
        <button
          v-if="tab === 'contacts'"
          class="wx-header-side wx-add-button"
          type="button"
          aria-label="添加朋友"
          @click="subPage = 'add'"
        >
          ＋
        </button>
      </header>
      <div class="wx-body" :class="{ 'wx-me-body': tab === 'me' }">
        <template v-if="!wechat"><p class="wx-empty">当前楼层尚无微信数据，请重新打开手机完成初始化。</p></template>
        <template v-else-if="tab === 'chats'">
          <label class="wx-search"
            ><span>⌕</span><input v-model="query" aria-label="搜索聊天" placeholder="搜索会话"
          /></label>
          <button
            v-for="item in visibleChats"
            :key="item.key"
            class="wx-chat-row"
            type="button"
            @click="openChat(item.key)"
          >
            <span v-if="item.group" class="wx-avatar wx-group-avatar">群</span>
            <WeChatAvatar v-else :id="item.avatarId" :accounts="accounts" />
            <span class="wx-row-main"
              ><strong>{{ item.title }}</strong
              ><small>{{ item.preview }}</small></span
            >
            <time>{{ displayTime(item.time) }}</time>
          </button>
          <p v-if="!visibleChats.length" class="wx-empty">暂无会话，可从通讯录选择好友开始聊天。</p>
        </template>
        <template v-else-if="tab === 'contacts'">
          <label class="wx-search"
            ><span>⌕</span><input v-model="query" aria-label="搜索联系人" placeholder="搜索好友"
          /></label>
          <button class="wx-list-row wx-group-row" type="button" @click="subPage = 'requests'">
            <span class="wx-feature-icon moments">✉</span><strong>朋友申请</strong>
            <span v-if="incomingRequests.length" class="wx-count">{{ incomingRequests.length }}</span
            ><span class="wx-chevron">›</span>
          </button>
          <div class="wx-section-label">联系人 · {{ contacts.length }}</div>
          <button
            v-for="[id, account] in visibleContacts"
            :key="id"
            class="wx-list-row"
            type="button"
            @click="openContact(id)"
          >
            <WeChatAvatar :id="id" :accounts="accounts" /><strong>{{ account.昵称 || id }}</strong
            ><span class="wx-chevron">›</span>
          </button>
          <p v-if="!contacts.length" class="wx-empty">暂无好友</p>
        </template>
        <template v-else-if="tab === 'discover'">
          <div class="wx-section-label">发现</div>
          <div class="wx-list-row">
            <span class="wx-feature-icon moments">▦</span><strong>朋友圈</strong><span class="wx-muted">暂无数据</span>
          </div>
          <p class="wx-empty">朋友圈、视频号和小程序尚无对应变量数据。</p>
        </template>
        <template v-else>
          <div class="wx-profile">
            <WeChatAvatar id="user" :accounts="accounts" />
            <div>
              <strong>{{ self?.昵称 || '我' }}</strong
              ><small>微信号：user</small>
            </div>
          </div>
          <div class="wx-list-row">
            <span class="wx-feature-icon favorite">☆</span><strong>好友</strong
            ><span class="wx-muted">{{ self?.好友?.length || 0 }} 人</span>
          </div>
          <div class="wx-list-row">
            <span class="wx-feature-icon settings">⌕</span><strong>会话</strong
            ><span class="wx-muted">{{ chats.length }} 个</span>
          </div>
        </template>
      </div>
      <nav class="wx-tabs" aria-label="微信导航">
        <button
          v-for="item in tabs"
          :key="item.id"
          type="button"
          :class="{ selected: tab === item.id }"
          @click="selectTab(item.id)"
        >
          <span class="wx-tab-icon">{{ item.icon }}</span
          ><small>{{ item.label }}</small>
        </button>
      </nav>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useMagicGirlStatStore } from '../../store/StatStore';
import type { 微信会话, 微信数据, 微信消息, 微信消息内容 } from '../../types';
import { chatTitle, contentSummary, privateChatKey } from './wechatData';
import WeChatAvatar from './WeChatAvatar.vue';
import WeChatMessageContent from './WeChatMessageContent.vue';

type Tab = 'chats' | 'contacts' | 'discover' | 'me';
const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'chats', label: '微信', icon: '◉' },
  { id: 'contacts', label: '通讯录', icon: '♟' },
  { id: 'discover', label: '发现', icon: '◈' },
  { id: 'me', label: '我', icon: '◯' },
];
const store = useMagicGirlStatStore();
const wechat = computed(() => store.statData?.手机?.微信);
const accounts = computed<微信数据['账号']>(() => wechat.value?.账号 ?? {});
const self = computed(() => accounts.value.user);
const worldTime = computed(() => store.statData?.世界?.时间 || '');
const stickerNames = computed(() => Object.keys(self.value?.表情包 ?? {}));
const tab = ref<Tab>('chats');
const subPage = ref<'requests' | 'add' | null>(null);
const selectedKey = ref<string | null>(null);
const selectedSession = computed<微信会话 | null>(() => {
  if (!selectedKey.value) return null;
  const existing = wechat.value?.会话?.[selectedKey.value];
  if (existing) return existing;
  const other = selectedKey.value.startsWith('私聊:user&') ? selectedKey.value.slice('私聊:user&'.length) : '';
  return other && self.value?.好友.includes(other) && accounts.value[other]
    ? { 类型: '私聊', 成员: ['user', other], 消息: [] }
    : null;
});
const selectedTitle = computed(() =>
  selectedKey.value && selectedSession.value && wechat.value
    ? chatTitle(selectedKey.value, selectedSession.value, wechat.value)
    : '聊天',
);
const pending = computed(() => (wechat.value?.准备发送?.会话 === selectedKey.value ? wechat.value.准备发送 : null));
const chats = computed(() =>
  Object.entries(wechat.value?.会话 ?? {})
    .filter(([, session]) => session.成员?.includes('user'))
    .map(([key, session]) => {
      const last = session.消息.at(-1);
      return {
        key,
        title: chatTitle(key, session, wechat.value!),
        group: session.类型 === '群聊',
        avatarId: session.类型 === '私聊' ? session.成员.find(id => id !== 'user') || 'user' : 'user',
        preview: last
          ? `${last.发送者 === 'user' ? '我' : accounts.value[last.发送者]?.昵称 || last.发送者}：${contentSummary(last.内容)}`
          : '暂无消息',
        time: last?.时间 || '',
      };
    })
    .sort((a, b) => b.time.localeCompare(a.time)),
);
const contacts = computed(() =>
  (self.value?.好友 ?? [])
    .filter(id => !!accounts.value[id])
    .map(id => [id, accounts.value[id]] as const)
    .sort((a, b) => (a[1].昵称 || a[0]).localeCompare(b[1].昵称 || b[0], 'zh-CN')),
);
const incomingRequests = computed(() => Object.entries(self.value?.好友请求?.收到 ?? {}));
const outgoingRequests = computed(() => Object.entries(self.value?.好友请求?.发出 ?? {}));
const addCandidates = computed(() =>
  Object.entries(accounts.value).filter(
    ([id, account]) =>
      id !== 'user' &&
      !self.value?.好友.includes(id) &&
      !self.value?.好友请求?.收到?.[id] &&
      `${id} ${account.昵称}`.includes(query.value.trim()),
  ),
);
const visibleContacts = computed(() =>
  contacts.value.filter(([id, account]) => `${id} ${account.昵称}`.includes(query.value.trim())),
);
const visibleChats = computed(() => chats.value.filter(item => item.title.includes(query.value.trim())));
const query = ref('');
const draft = ref('');
const requestMessage = ref('');
const error = ref('');
const sending = ref(false);
const quoted = ref<微信消息 | null>(null);
const stickerOpen = ref(false);
const messagesElement = ref<HTMLElement>();

function displayTime(value: string): string {
  return value.match(/T(\d{1,2}:\d{2})/)?.[1] || value;
}
function selectTab(next: Tab) {
  tab.value = next;
  query.value = '';
  error.value = '';
}
function openChat(key: string) {
  selectedKey.value = key;
  draft.value = '';
  quoted.value = null;
  stickerOpen.value = false;
  error.value = '';
  scrollBottom();
}
function openContact(id: string) {
  openChat(privateChatKey(id));
}
async function scrollBottom() {
  await nextTick();
  messagesElement.value?.scrollTo({ top: messagesElement.value.scrollHeight });
}
async function sendMessage() {
  const text = draft.value.trim();
  if (!text || !selectedKey.value || sending.value) return;
  sending.value = true;
  error.value = '';
  try {
    const content: 微信消息内容[] = quoted.value ? [text, { 引用: quoted.value }] : [text];
    await store.sendWeChatMessage(selectedKey.value, content);
    draft.value = '';
    quoted.value = null;
    await scrollBottom();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '发送失败';
  } finally {
    sending.value = false;
  }
}
function quoteMessage(message: 微信消息) {
  quoted.value = message;
  stickerOpen.value = false;
}
async function sendSticker(name: string) {
  if (!selectedKey.value || sending.value) return;
  sending.value = true;
  error.value = '';
  try {
    const content: 微信消息内容[] = [`<表情包>${name}</表情包>`];
    if (quoted.value) content.push({ 引用: quoted.value });
    await store.sendWeChatMessage(selectedKey.value, content);
    quoted.value = null;
    stickerOpen.value = false;
    await scrollBottom();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '发送失败';
  } finally {
    sending.value = false;
  }
}
async function retrySend() {
  error.value = '';
  try {
    await store.retryWeChatSend();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '重试失败';
  }
}
async function requestFriend(id: string) {
  error.value = '';
  try {
    await store.requestWeChatFriend(id, requestMessage.value.trim());
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '申请失败';
  }
}
async function respondFriend(id: string, accept: boolean) {
  error.value = '';
  try {
    await store.respondWeChatFriend(id, accept);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '处理失败';
  }
}
watch(() => selectedSession.value?.消息.length, scrollBottom);
</script>

<style src="../../styles/wechat.css"></style>
