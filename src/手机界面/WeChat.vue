<template>
  <div class="wechat">
    <template v-if="chat">
      <header class="wx-header wx-chat-header">
        <button class="wx-back" type="button" aria-label="返回微信" @click="chat = null">‹</button>
        <strong>{{ chat.name }}</strong>
        <span class="wx-header-side">···</span>
      </header>
      <div ref="messagesElement" class="wx-messages">
        <div v-for="(message, index) in chat.messages" :key="index" class="wx-message" :class="{ mine: message.mine }">
          <span class="wx-avatar" :style="{ background: message.mine ? '#a2b7d1' : chat.color }">{{
            message.mine ? '我' : chat.name.slice(0, 1)
          }}</span>
          <div class="wx-bubble">{{ message.text }}</div>
        </div>
      </div>
      <form class="wx-compose" @submit.prevent="sendMessage">
        <span class="wx-compose-icon" aria-hidden="true">◉</span>
        <input v-model="draft" aria-label="输入消息" placeholder="发送消息" />
        <button type="submit" :disabled="!draft.trim()">发送</button>
      </form>
    </template>

    <template v-else-if="detail">
      <header class="wx-header">
        <button class="wx-back" type="button" aria-label="返回" @click="detail = null">‹</button>
        <strong>{{ detail }}</strong>
      </header>
      <div v-if="detail === '朋友圈'" class="wx-moments">
        <div class="wx-moments-cover"><span>朋友圈</span></div>
        <div class="wx-moment">
          <span class="wx-avatar" style="background: #dfaa7c">林</span>
          <div>
            <strong>林间来信</strong>
            <p>今天也要记得看一看窗外。</p>
            <small>刚刚</small>
          </div>
        </div>
        <div class="wx-moment">
          <span class="wx-avatar" style="background: #85abb5">周</span>
          <div>
            <strong>周予</strong>
            <p>周末的咖啡和好天气 ☀</p>
            <small>昨天</small>
          </div>
        </div>
      </div>
      <div v-else class="wx-detail-note">{{ detail }}的内容将在接入数据后显示</div>
    </template>

    <template v-else>
      <header class="wx-header">
        <strong>{{ tab === 'chats' ? '微信' : tabLabel }}</strong>
        <span v-if="tab === 'chats'" class="wx-header-side" aria-hidden="true">＋</span>
      </header>
      <div class="wx-body" :class="{ 'wx-me-body': tab === 'me' }">
        <template v-if="tab === 'chats'">
          <label class="wx-search"
            ><span>⌕</span><input v-model="query" aria-label="搜索聊天" placeholder="搜索"
          /></label>
          <button
            v-for="item in filteredChats"
            :key="item.id"
            class="wx-chat-row"
            type="button"
            @click="openChat(item)"
          >
            <span class="wx-avatar" :style="{ background: item.color }">{{ item.name.slice(0, 1) }}</span>
            <span class="wx-row-main"
              ><strong>{{ item.name }}</strong
              ><small>{{ item.messages.at(-1)?.text }}</small></span
            >
            <time>{{ item.time }}</time>
          </button>
          <p v-if="!filteredChats.length" class="wx-empty">没有找到聊天</p>
        </template>
        <template v-else-if="tab === 'contacts'">
          <label class="wx-search"
            ><span>⌕</span><input v-model="query" aria-label="搜索联系人" placeholder="搜索"
          /></label>
          <div class="wx-section-label">联系人</div>
          <button
            v-for="item in filteredChats"
            :key="item.id"
            class="wx-list-row"
            type="button"
            @click="openChat(item)"
          >
            <span class="wx-avatar" :style="{ background: item.color }">{{ item.name.slice(0, 1) }}</span
            ><strong>{{ item.name }}</strong>
          </button>
          <p v-if="!filteredChats.length" class="wx-empty">没有找到联系人</p>
        </template>
        <template v-else-if="tab === 'discover'">
          <button class="wx-list-row wx-group-row" type="button" @click="detail = '朋友圈'">
            <span class="wx-feature-icon moments">▦</span><strong>朋友圈</strong><span class="wx-chevron">›</span>
          </button>
          <button class="wx-list-row wx-group-row" type="button" @click="detail = '视频号'">
            <span class="wx-feature-icon video">▷</span><strong>视频号</strong><span class="wx-chevron">›</span>
          </button>
          <button class="wx-list-row" type="button" @click="detail = '小程序'">
            <span class="wx-feature-icon mini">◉</span><strong>小程序</strong><span class="wx-chevron">›</span>
          </button>
        </template>
        <template v-else>
          <div class="wx-profile">
            <span class="wx-avatar wx-profile-avatar">我</span>
            <div><strong>我</strong><small>微信号：demo_user</small></div>
            <span class="wx-chevron">›</span>
          </div>
          <button class="wx-list-row wx-group-row" type="button" @click="detail = '收藏'">
            <span class="wx-feature-icon favorite">☆</span><strong>收藏</strong><span class="wx-chevron">›</span>
          </button>
          <button class="wx-list-row" type="button" @click="detail = '设置'">
            <span class="wx-feature-icon settings">⚙</span><strong>设置</strong><span class="wx-chevron">›</span>
          </button>
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
import { computed, nextTick, ref } from 'vue';

type Tab = 'chats' | 'contacts' | 'discover' | 'me';
type Chat = { id: number; name: string; color: string; time: string; messages: { text: string; mine: boolean }[] };
const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'chats', label: '微信', icon: '◉' },
  { id: 'contacts', label: '通讯录', icon: '♟' },
  { id: 'discover', label: '发现', icon: '◈' },
  { id: 'me', label: '我', icon: '◯' },
];
const chats = ref<Chat[]>([
  {
    id: 1,
    name: '林间来信',
    color: '#dfaa7c',
    time: '09:41',
    messages: [{ text: '早上好，今天有什么计划？', mine: false }],
  },
  { id: 2, name: '周予', color: '#85abb5', time: '昨天', messages: [{ text: '照片我已经发给你啦', mine: false }] },
  {
    id: 3,
    name: '文件传输助手',
    color: '#68b56e',
    time: '星期二',
    messages: [{ text: '欢迎使用文件传输助手', mine: false }],
  },
]);
const tab = ref<Tab>('chats');
const tabLabel = computed(() => tabs.find(item => item.id === tab.value)?.label);
const chat = ref<Chat | null>(null);
const detail = ref<string | null>(null);
const query = ref('');
const draft = ref('');
const messagesElement = ref<HTMLElement>();
const filteredChats = computed(() => chats.value.filter(item => item.name.includes(query.value.trim())));

function selectTab(next: Tab) {
  tab.value = next;
  query.value = '';
}
function openChat(item: Chat) {
  chat.value = item;
  draft.value = '';
}
async function sendMessage() {
  const text = draft.value.trim();
  if (!text || !chat.value) return;
  chat.value.messages.push({ text, mine: true });
  chat.value.time = '刚刚';
  draft.value = '';
  await nextTick();
  messagesElement.value?.scrollTo({ top: messagesElement.value.scrollHeight, behavior: 'smooth' });
}
</script>

<style>
.wechat {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  padding-top: 52px;
  background: #ededed;
  color: #191919;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
}
.wx-header {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 49px;
  padding: 0 16px;
  border-bottom: 1px solid #d9d9d9;
  background: #ededed;
  font-size: 17px;
}
.wx-header strong {
  font-weight: 600;
}
.wx-back {
  position: absolute;
  left: 13px;
  border: 0;
  background: none;
  color: #222;
  font-size: 34px !important;
  line-height: 1;
}
.wx-header-side {
  position: absolute;
  right: 19px;
  font-size: 27px;
  line-height: 1;
}
.wx-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
.wx-search {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 36px;
  margin: 8px 10px;
  padding: 0 10px;
  border-radius: 8px;
  background: #fff;
  color: #929292;
}
.wx-search span {
  font-size: 24px;
  line-height: 1;
}
.wx-search input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #222;
  font: inherit;
  font-size: 14px;
}
.wx-chat-row,
.wx-list-row {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 68px;
  padding: 8px 16px;
  border: 0;
  border-bottom: 1px solid #e8e8e8;
  background: #fff;
  color: inherit;
  text-align: left;
}
.wx-chat-row {
  gap: 12px;
}
.wx-avatar {
  display: grid;
  flex: none;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 5px;
  color: #fff;
  font-size: 19px;
  font-weight: 600;
}
.wx-row-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.wx-row-main strong,
.wx-list-row strong {
  overflow: hidden;
  font-size: 16px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wx-row-main small {
  overflow: hidden;
  color: #999;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wx-chat-row time {
  align-self: flex-start;
  margin-top: 4px;
  color: #aaa;
  font-size: 11px;
}
.wx-section-label {
  padding: 8px 16px;
  color: #888;
  font-size: 13px;
}
.wx-list-row {
  gap: 14px;
  min-height: 58px;
}
.wx-list-row .wx-avatar {
  width: 38px;
  height: 38px;
  font-size: 16px;
}
.wx-group-row {
  margin-bottom: 9px;
}
.wx-feature-icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 29px;
  height: 29px;
  border-radius: 5px;
  color: #fff;
  font-size: 23px;
}
.wx-feature-icon.moments {
  background: #6abf80;
}
.wx-feature-icon.video {
  background: #e9956c;
}
.wx-feature-icon.mini {
  background: #6c92d8;
}
.wx-feature-icon.favorite {
  background: #e9bc57;
}
.wx-feature-icon.settings {
  background: #769cb7;
}
.wx-chevron {
  margin-left: auto;
  color: #b3b3b3;
  font-size: 24px;
}
.wx-profile {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 144px;
  margin-bottom: 10px;
  padding: 25px 18px;
  background: #fff;
}
.wx-profile-avatar {
  width: 62px;
  height: 62px;
  background: #a2b7d1;
  font-size: 24px;
}
.wx-profile div {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.wx-profile strong {
  font-size: 20px;
}
.wx-profile small {
  color: #888;
  font-size: 13px;
}
.wx-tabs {
  display: flex;
  flex: none;
  height: 80px;
  padding-bottom: 23px;
  border-top: 1px solid #d5d5d5;
  background: #f7f7f7;
}
.wx-tabs button {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: 0;
  background: none;
  color: #777;
}
.wx-tabs button.selected {
  color: #07ad58;
}
.wx-tab-icon {
  font-size: 25px;
  line-height: 1;
}
.wx-tabs small {
  font-size: 10px;
}
.wx-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 14px;
}
.wx-message {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-bottom: 17px;
}
.wx-message.mine {
  flex-direction: row-reverse;
}
.wx-message .wx-avatar {
  width: 40px;
  height: 40px;
  font-size: 16px;
}
.wx-bubble {
  max-width: 72%;
  padding: 10px 12px;
  border-radius: 5px;
  background: #fff;
  font-size: 15px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.wx-message.mine .wx-bubble {
  background: #95ec69;
}
.wx-compose {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 82px;
  padding: 7px 10px 30px;
  border-top: 1px solid #d7d7d7;
  background: #f7f7f7;
}
.wx-compose-icon {
  color: #777;
  font-size: 25px;
}
.wx-compose input {
  flex: 1;
  min-width: 0;
  height: 38px;
  padding: 0 9px;
  border: 0;
  border-radius: 5px;
  outline: none;
  background: #fff;
  color: #222;
  font: inherit;
  font-size: 15px;
}
.wx-compose button {
  min-width: 49px;
  height: 36px;
  border: 0;
  border-radius: 5px;
  background: #07ad58;
  color: #fff;
  font-size: 13px;
}
.wx-compose button:disabled {
  background: #d4d4d4;
  color: #999;
}
.wx-empty,
.wx-detail-note {
  padding: 28px;
  color: #999;
  font-size: 14px;
  text-align: center;
}
.wx-moments {
  flex: 1;
  overflow-y: auto;
  background: #fff;
}
.wx-moments-cover {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  height: 175px;
  padding: 20px;
  background: linear-gradient(135deg, #6a8d8f, #233d54);
  color: #fff;
  font-size: 21px;
  font-weight: 600;
}
.wx-moment {
  display: flex;
  gap: 12px;
  padding: 18px 14px;
  border-bottom: 1px solid #eee;
}
.wx-moment div {
  flex: 1;
}
.wx-moment strong {
  color: #526b8b;
  font-size: 15px;
}
.wx-moment p {
  margin: 7px 0;
  font-size: 14px;
}
.wx-moment small {
  color: #aaa;
}
@media (max-width: 600px) {
  .wechat {
    padding-top: calc(52px + env(safe-area-inset-top));
  }
  .wx-tabs,
  .wx-compose {
    padding-bottom: max(23px, env(safe-area-inset-bottom));
    height: auto;
    min-height: 80px;
  }
}
</style>
