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

<style src="../../styles/wechat.css"></style>
