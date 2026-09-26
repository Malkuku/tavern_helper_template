<template>
  <div class="wechat" :class="{ 'wx-dark': darkMode }">
    <p v-if="store.wechatLogError" class="wx-log-error" role="alert">微信消息同步失败：{{ store.wechatLogError }}</p>
    <template v-if="selectedSession && selectedKey">
      <header class="wx-header wx-chat-header">
        <button class="wx-back" type="button" aria-label="返回微信" @click="selectedKey = null">‹</button>
        <strong>{{ selectedTitle }}</strong>
        <button class="wx-chat-more" type="button" aria-label="聊天详情" @click="detailsOpen = true">•••</button>
      </header>
      <div ref="messagesElement" class="wx-messages">
        <p v-if="!selectedSession.消息.length && !pending" class="wx-empty">还没有消息，发一条开始聊天。</p>
        <template v-for="(message, index) in selectedSession.消息" :key="index">
          <time v-if="showMessageTime(index)" class="wx-time-divider">{{ displayTime(message.时间) }}</time>
          <div v-if="!isWeChatMessage(message)" class="wx-system-tip">{{ operationSummary(message) }}</div>
          <template v-else>
            <div
              v-for="(part, contentIndex) in message.内容"
              :key="contentIndex"
              class="wx-message"
              :class="{ mine: message.发送者 === 'user' }"
            >
              <button
                v-if="message.发送者 !== 'user'"
                class="wx-avatar-action"
                type="button"
                :aria-label="`拍一拍${accounts[message.发送者]?.昵称 || message.发送者}`"
                @click="poke(message.发送者)"
              >
                <WeChatAvatar :id="message.发送者" :accounts="accounts" />
              </button>
              <WeChatAvatar v-else :id="message.发送者" :accounts="accounts" />
              <div class="wx-message-main">
                <small v-if="selectedSession.类型 === '群聊' && message.发送者 !== 'user'">{{
                  accounts[message.发送者]?.昵称 || message.发送者
                }}</small>
                <div class="wx-bubble">
                  <div v-if="contentIndex === 0 && message.引用" class="wx-rich wx-quote">
                    <small>引用 {{ accounts[message.引用.发送者]?.昵称 || message.引用.发送者 }}</small>
                    <WeChatMessageContent
                      :items="message.引用.内容"
                      :accounts="accounts"
                      :sender="message.引用.发送者"
                    />
                  </div>
                  <WeChatMessageContent
                    :items="[part]"
                    :accounts="accounts"
                    :sender="message.发送者"
                    :states="message.特殊内容状态"
                    :start-index="contentIndex"
                    @open-payment="openPayment(message, $event)"
                    @open-card="openCard"
                  />
                </div>
                <div class="wx-message-meta">
                  <button type="button" @click="quoteMessage({ ...message, 内容: [part] })">引用</button>
                  <button type="button" @click="startForward({ ...message, 内容: [part] })">转发</button>
                </div>
              </div>
            </div>
          </template>
        </template>
        <template v-if="pending">
          <div v-for="(part, contentIndex) in pending.内容" :key="contentIndex" class="wx-message mine wx-pending">
            <WeChatAvatar id="user" :accounts="accounts" />
            <div class="wx-message-main">
              <div class="wx-bubble">
                <div v-if="contentIndex === 0 && pending.引用" class="wx-rich wx-quote">
                  引用 {{ pending.引用.发送者 }}：{{ contentSummary(pending.引用.内容) }}
                </div>
                <WeChatMessageContent :items="[part]" :accounts="accounts" sender="user" />
              </div>
              <small v-if="contentIndex === pending.内容.length - 1"
                >等待正文确认 · <button type="button" @click="retrySend">重试生成</button></small
              >
            </div>
          </div>
        </template>
        <div v-if="pending && generating" class="wx-typing">
          <span class="wx-typing-dots"><i></i><i></i><i></i></span>对方正在输入中...
        </div>
      </div>
      <p v-if="error" class="wx-error" role="alert">{{ error }}</p>
      <div v-if="quoted" class="wx-compose-quote">
        <span>引用 {{ accounts[quoted.发送者]?.昵称 || quoted.发送者 }}：{{ contentSummary(quoted.内容) }}</span>
        <button type="button" aria-label="取消引用" @click="quoted = null">×</button>
      </div>
      <div v-if="stickerOpen" class="wx-sticker-picker">
        <p v-if="!stickerNames.length" class="wx-sticker-empty">还没有表情包，添加图片后就能在聊天中发送。</p>
        <button
          v-for="name in stickerNames"
          :key="name"
          class="wx-sticker-choice"
          type="button"
          :disabled="!!pending || sending || !worldTime"
          @click="sendSticker(name)"
        >
          <img :src="self?.表情包[name]" :alt="name" /><small>{{ name }}</small>
        </button>
        <button class="wx-sticker-add" type="button" @click="stickerFileInput?.click()">
          <WeChatIcon name="plus" />添加表情包
        </button>
        <input ref="stickerFileInput" class="wx-hidden-file" type="file" accept="image/*" @change="readStickerFile" />
        <form v-if="newStickerSource" class="wx-sticker-form" @submit.prevent="saveSticker">
          <img :src="newStickerSource" alt="新表情包预览" />
          <input v-model="newStickerName" aria-label="表情包名称" maxlength="30" placeholder="给表情包起个名字" />
          <button type="submit" :disabled="savingSticker">保存</button>
        </form>
      </div>
      <form class="wx-compose" @submit.prevent="sendMessage">
        <button class="wx-compose-voice" type="button" aria-label="语音" @click="voiceOpen = !voiceOpen">
          <WeChatIcon name="voice" />
        </button>
        <input
          v-model="draft"
          aria-label="输入消息"
          :placeholder="worldTime ? '' : '世界时间未设置'"
          :disabled="!!pending || sending || !worldTime"
        />
        <button class="wx-compose-sticker" type="button" aria-label="选择表情包" @click="stickerOpen = !stickerOpen">
          <WeChatIcon name="emoji" />
        </button>
        <button v-if="draft.trim()" type="submit" :disabled="!!pending || sending || !worldTime">发送</button>
        <button
          v-else
          class="wx-compose-plus"
          type="button"
          aria-label="更多聊天功能"
          @click="extrasOpen = !extrasOpen"
        >
          <WeChatIcon name="plus" />
        </button>
      </form>
      <div v-if="extrasOpen" class="wx-chat-extras">
        <button v-for="item in extraActions" :key="item.label" type="button" @click="openExtra(item.label)">
          <span><WeChatIcon :name="item.icon" /></span>{{ item.label }}
        </button>
      </div>
      <form v-if="paymentKind" class="wx-payment-compose" @submit.prevent="sendPayment">
        <strong>发送{{ paymentKind }}</strong>
        <input v-model="paymentAmount" aria-label="金额" placeholder="金额（g）" inputmode="decimal" />
        <input v-model="paymentRemark" aria-label="备注" placeholder="备注" />
        <button type="submit" :disabled="!!pending || sending || !worldTime">发送</button>
        <button type="button" @click="paymentKind = null">取消</button>
      </form>
      <form v-if="voiceOpen" class="wx-action-panel" @submit.prevent="sendVoice">
        <strong>发送语音消息</strong
        ><input v-model="voiceText" aria-label="语音转写内容" placeholder="输入语音转写内容" /><input
          v-model="voiceDuration"
          aria-label="语音时长"
          placeholder="时长（秒）"
          inputmode="numeric"
        /><button type="submit" :disabled="!!pending || sending">发送</button
        ><button type="button" @click="voiceOpen = false">取消</button>
      </form>
      <div v-if="cardPickerOpen" class="wx-action-panel">
        <strong>发送名片</strong
        ><button v-for="[id, account] in cardCandidates" :key="id" type="button" @click="sendCard(id)">
          {{ account.昵称 || id }}</button
        ><button type="button" @click="cardPickerOpen = false">取消</button>
      </div>
      <div v-if="forwarding" class="wx-action-panel">
        <strong>转发到</strong
        ><button v-for="item in chats" :key="item.key" type="button" @click="sendForward(item.key)">
          {{ item.title }}</button
        ><button type="button" @click="forwarding = null">取消</button>
      </div>
      <div v-if="detailsOpen" class="wx-action-panel">
        <strong>聊天详情</strong
        ><span>成员：{{ selectedSession.成员.map(id => accounts[id]?.昵称 || id).join('、') }}</span
        ><template v-if="selectedSession.类型 === '群聊'"
          ><button v-for="[id, account] in inviteCandidates" :key="id" type="button" @click="invite(id)">
            邀请 {{ account.昵称 || id }} 进群
          </button></template
        ><button type="button" @click="detailsOpen = false">关闭</button>
      </div>
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
          <button type="button" class="wx-small-action" :disabled="!!outgoingRequest(id)" @click="requestFriend(id)">
            {{ outgoingRequest(id) ? '已申请' : '申请' }}
          </button>
        </div>
        <p v-if="!addCandidates.length" class="wx-empty">没有可添加的账号</p>
        <p v-if="error" class="wx-error" role="alert">{{ error }}</p>
      </div>
    </template>

    <template v-else>
      <header v-if="tab !== 'me'" class="wx-header wx-main-header">
        <strong>{{
          tab === 'chats' ? `微信${chats.length ? `(${chats.length})` : ''}` : tabs.find(item => item.id === tab)?.label
        }}</strong>
        <div class="wx-header-actions">
          <button type="button" aria-label="搜索" @click="searchOpen = !searchOpen">
            <WeChatIcon name="search" />
          </button>
          <button
            type="button"
            :aria-label="tab === 'contacts' ? '添加朋友' : '更多'"
            @click="tab === 'contacts' ? (subPage = 'add') : showUnavailable('更多功能')"
          >
            <WeChatIcon name="plus" />
          </button>
        </div>
      </header>
      <div class="wx-body" :class="{ 'wx-me-body': tab === 'me' }">
        <template v-if="!wechat"><p class="wx-empty">当前楼层尚无微信数据，请重新打开手机完成初始化。</p></template>
        <template v-else-if="tab === 'chats'">
          <label v-if="searchOpen" class="wx-search"
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
          <label v-if="searchOpen" class="wx-search"
            ><span>⌕</span><input v-model="query" aria-label="搜索联系人" placeholder="搜索好友"
          /></label>
          <button class="wx-list-row wx-contact-feature" type="button" @click="subPage = 'requests'">
            <span class="wx-feature-icon orange"><WeChatIcon name="new-friend" /></span><strong>新的朋友</strong>
            <span v-if="incomingRequests.length" class="wx-count">{{ incomingRequests.length }}</span>
          </button>
          <button
            v-for="item in contactFeatures"
            :key="item.label"
            class="wx-list-row wx-contact-feature"
            type="button"
            @click="showUnavailable(item.label)"
          >
            <span class="wx-feature-icon" :class="item.color"><WeChatIcon :name="item.icon" /></span
            ><strong>{{ item.label }}</strong>
          </button>
          <div class="wx-section-label">{{ contacts.length ? '好友' : '暂无好友' }}</div>
          <button
            v-for="[id, account] in visibleContacts"
            :key="id"
            class="wx-list-row"
            type="button"
            @click="openContact(id)"
          >
            <WeChatAvatar :id="id" :accounts="accounts" /><strong>{{ account.昵称 || id }}</strong>
          </button>
        </template>
        <template v-else-if="tab === 'discover'">
          <div v-for="(group, index) in discoverGroups" :key="index" class="wx-menu-group">
            <button
              v-for="item in group"
              :key="item.label"
              class="wx-list-row wx-menu-row"
              type="button"
              @click="showUnavailable(item.label)"
            >
              <span class="wx-line-icon" :class="item.color"><WeChatIcon :name="item.icon" /></span
              ><strong>{{ item.label }}</strong
              ><WeChatIcon class="wx-row-chevron" name="chevron" />
            </button>
          </div>
        </template>
        <template v-else>
          <button class="wx-profile" type="button" @click="showUnavailable('个人信息')">
            <WeChatAvatar id="user" :accounts="accounts" />
            <div>
              <strong>{{ self?.昵称 || '我' }}</strong
              ><small>微信号：{{ self?.昵称 || 'user' }}</small>
            </div>
            <WeChatIcon class="wx-row-chevron" name="chevron" />
          </button>
          <div v-for="(group, index) in meGroups" :key="index" class="wx-menu-group">
            <button
              v-for="item in group"
              :key="item.label"
              class="wx-list-row wx-menu-row"
              type="button"
              @click="showUnavailable(item.label)"
            >
              <span class="wx-line-icon" :class="item.color"><WeChatIcon :name="item.icon" /></span
              ><strong>{{ item.label }}</strong
              ><WeChatIcon class="wx-row-chevron" name="chevron" />
            </button>
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
          <span class="wx-tab-icon"><WeChatIcon :name="item.id" /></span><small>{{ item.label }}</small>
        </button>
      </nav>
    </template>
    <div v-if="unavailable" class="wx-dialog-backdrop" @click.self="unavailable = ''">
      <div class="wx-dialog" role="alertdialog" aria-modal="true">
        <p>{{ unavailable }}暂未开放</p>
        <button type="button" @click="unavailable = ''">知道了</button>
      </div>
    </div>
    <div v-if="paymentView" class="wx-dialog-backdrop" @click.self="paymentView = null">
      <div class="wx-payment-dialog" role="dialog" aria-modal="true" aria-label="款项详情">
        <button class="wx-dialog-close" type="button" @click="paymentView = null">×</button
        ><span class="wx-payment-dialog-icon">{{ paymentView.kind === '红包' ? '🧧' : '¥' }}</span
        ><strong>{{ paymentView.kind === '红包' ? '微信红包' : '微信转账' }}</strong
        ><b>{{ paymentView.amount }}</b>
        <p>{{ paymentView.remark || '恭喜发财，大吉大利' }}</p>
        <small>{{ paymentView.status || '待处理' }}</small>
        <div v-if="paymentView.message.发送者 !== 'user' && !paymentView.status" class="wx-payment-dialog-actions">
          <button
            type="button"
            :disabled="sending"
            @click="resolvePayment(paymentView.kind === '红包' ? '领取红包' : '领取转账')"
          >
            {{ paymentView.kind === '红包' ? '开红包' : '确认收款' }}</button
          ><button
            v-if="paymentView.kind === '转账'"
            type="button"
            :disabled="sending"
            @click="resolvePayment('退回转账')"
          >
            退回
          </button>
        </div>
      </div>
    </div>
    <div v-if="cardView" class="wx-dialog-backdrop" @click.self="cardView = null">
      <div class="wx-card-dialog" role="dialog" aria-modal="true" aria-label="联系人名片">
        <WeChatAvatar :id="cardView" :accounts="accounts" /><strong>{{ accounts[cardView]?.昵称 || cardView }}</strong
        ><small>微信号：{{ cardView }}</small
        ><button v-if="self?.好友.includes(cardView)" type="button" @click="openCardChat">发消息</button
        ><button v-else-if="!outgoingRequest(cardView)" type="button" @click="requestCardFriend">添加朋友</button
        ><small v-else>好友申请已发送</small><button type="button" @click="cardView = null">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useMagicGirlStatStore } from '../../store/StatStore';
import type { 微信会话, 微信数据, 微信消息, 微信消息内容 } from '../../types';
import {
  chatTitle,
  contentSummary,
  friendRequest,
  isWeChatMessage,
  operationSummary,
  privateChatKey,
} from './wechatData';
import type { OperationEvent } from './wechatData';
import WeChatAvatar from './WeChatAvatar.vue';
import WeChatIcon from './WeChatIcon.vue';
import WeChatMessageContent from './WeChatMessageContent.vue';

type Tab = 'chats' | 'contacts' | 'discover' | 'me';
const tabs: { id: Tab; label: string }[] = [
  { id: 'chats', label: '微信' },
  { id: 'contacts', label: '通讯录' },
  { id: 'discover', label: '发现' },
  { id: 'me', label: '我' },
];
const contactFeatures = [
  { label: '仅聊天的朋友', icon: 'contacts', color: 'orange' },
  { label: '群聊', icon: 'group', color: 'green' },
  { label: '标签', icon: 'tag', color: 'blue' },
  { label: '公众号', icon: 'book', color: 'blue' },
  { label: '服务号', icon: 'book', color: 'cyan' },
];
const discoverGroups = [
  [{ label: '朋友圈', icon: 'moments', color: 'multi' }],
  [
    { label: '视频号', icon: 'video', color: 'orange-text' },
    { label: '直播', icon: 'live', color: 'red' },
  ],
  [
    { label: '扫一扫', icon: 'scan', color: 'blue-text' },
    { label: '听一听', icon: 'music', color: 'red' },
  ],
  [
    { label: '看一看', icon: 'look', color: 'gold' },
    { label: '搜一搜', icon: 'search', color: 'red' },
  ],
  [{ label: '附近的人', icon: 'people', color: 'blue-text' }],
  [{ label: '游戏', icon: 'discover', color: 'multi' }],
  [{ label: '小程序', icon: 'discover', color: 'purple' }],
];
const meGroups = [
  [{ label: '服务', icon: 'chats', color: 'green-text' }],
  [
    { label: '收藏', icon: 'look', color: 'multi' },
    { label: '朋友圈', icon: 'moments', color: 'blue-text' },
    { label: '作品', icon: 'video', color: 'blue-text' },
    { label: '小店与卡包', icon: 'tag', color: 'red' },
    { label: '表情', icon: 'discover', color: 'gold' },
  ],
  [{ label: '设置', icon: 'settings', color: 'blue-text' }],
];
const darkMode = ref(false);
const unavailable = ref('');
const searchOpen = ref(false);
const generating = ref(false);
const extrasOpen = ref(false);
const paymentKind = ref<'红包' | '转账' | null>(null);
const paymentAmount = ref('');
const paymentRemark = ref('');
const paymentView = ref<{
  message: 微信消息;
  index: number;
  kind: '红包' | '转账';
  amount: string;
  remark: string;
  status?: string;
} | null>(null);
const cardView = ref<string | null>(null);
const cardPickerOpen = ref(false);
const forwarding = ref<微信消息 | null>(null);
const detailsOpen = ref(false);
const voiceOpen = ref(false);
const voiceText = ref('');
const voiceDuration = ref('');
function openExtra(label: string) {
  extrasOpen.value = false;
  if (label === '红包' || label === '转账') paymentKind.value = label;
  else if (label === '名片') cardPickerOpen.value = true;
  else showUnavailable(label);
}
async function sendPayment() {
  if (!paymentKind.value || !selectedKey.value || sending.value) return;
  if (!/^\d+(?:\.\d+)?$/.test(paymentAmount.value) || Number(paymentAmount.value) <= 0) {
    error.value = '请输入有效金额。';
    return;
  }
  if (/[<>]/.test(paymentRemark.value)) {
    error.value = '备注不能包含尖括号。';
    return;
  }
  sending.value = true;
  error.value = '';
  try {
    await store.sendWeChatMessage(selectedKey.value, [
      `<${paymentKind.value} 金额="${paymentAmount.value}g">${paymentRemark.value}</${paymentKind.value}>`,
    ]);
    paymentKind.value = null;
    paymentAmount.value = '';
    paymentRemark.value = '';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '发送失败';
  } finally {
    sending.value = false;
  }
}
const extraActions = [
  { label: '相册', icon: 'photo' },
  { label: '拍摄', icon: 'camera' },
  { label: '视频通话', icon: 'video-call' },
  { label: '位置', icon: 'location' },
  { label: '红包', icon: 'redpacket' },
  { label: '礼物', icon: 'gift' },
  { label: '转账', icon: 'transfer' },
  { label: '名片', icon: 'contacts' },
  { label: '收藏', icon: 'favorite' },
];
const stickerFileInput = ref<HTMLInputElement>();
const newStickerName = ref('');
const newStickerSource = ref('');
const savingSticker = ref(false);
async function readStickerFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  error.value = '';
  try {
    newStickerSource.value = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error('无法读取图片。'));
      reader.readAsDataURL(file);
    });
    newStickerName.value = file.name.replace(/\.[^.]+$/, '');
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '无法读取图片。';
  } finally {
    input.value = '';
  }
}
async function saveSticker() {
  if (!newStickerSource.value || savingSticker.value) return;
  savingSticker.value = true;
  error.value = '';
  try {
    await store.addWeChatSticker(newStickerName.value, newStickerSource.value);
    newStickerName.value = '';
    newStickerSource.value = '';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '保存表情包失败。';
  } finally {
    savingSticker.value = false;
  }
}
function showUnavailable(label: string) {
  unavailable.value = label;
}
function syncTheme() {
  darkMode.value = getVariables({ type: 'script', script_id: getScriptId() })?.darkMode === true;
}
onMounted(() => {
  syncTheme();
  eventOn('mag_variable_update_ended', syncTheme);
  eventOn(tavern_events.GENERATION_STARTED, onGenerationStart);
  eventOn(tavern_events.GENERATION_ENDED, onGenerationEnd);
  eventOn(tavern_events.GENERATION_STOPPED, onGenerationEnd);
});
onUnmounted(() => {
  eventRemoveListener('mag_variable_update_ended', syncTheme);
  eventRemoveListener(tavern_events.GENERATION_STARTED, onGenerationStart);
  eventRemoveListener(tavern_events.GENERATION_ENDED, onGenerationEnd);
  eventRemoveListener(tavern_events.GENERATION_STOPPED, onGenerationEnd);
});
function onGenerationStart() {
  generating.value = true;
}
function onGenerationEnd() {
  generating.value = false;
}
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
          ? isWeChatMessage(last)
            ? `${last.发送者 === 'user' ? '我' : accounts.value[last.发送者]?.昵称 || last.发送者}：${contentSummary(last.内容)}`
            : operationSummary(last)
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
const cardCandidates = computed(() => Object.entries(accounts.value).filter(([id]) => id !== 'user'));
const inviteCandidates = computed(() =>
  cardCandidates.value.filter(([id]) => self.value?.好友.includes(id) && !selectedSession.value?.成员.includes(id)),
);
const incomingRequests = computed(() =>
  Object.entries(wechat.value?.会话 ?? {})
    .map(([, session]) => friendRequest(session))
    .filter((item): item is NonNullable<typeof item> => !!item && item.目标 === 'user')
    .map(item => [item.操作者, item] as const),
);
const outgoingRequests = computed(() =>
  Object.entries(wechat.value?.会话 ?? {})
    .map(([, session]) => friendRequest(session))
    .filter((item): item is NonNullable<typeof item> => !!item && item.操作者 === 'user')
    .map(item => [item.目标!, item] as const),
);
function outgoingRequest(id: string) {
  return friendRequest(wechat.value?.会话[privateChatKey(id)])?.操作者 === 'user';
}
const addCandidates = computed(() =>
  Object.entries(accounts.value).filter(
    ([id, account]) =>
      id !== 'user' &&
      !self.value?.好友.includes(id) &&
      !friendRequest(wechat.value?.会话[privateChatKey(id)]) &&
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
function showMessageTime(index: number): boolean {
  const messages = selectedSession.value?.消息;
  if (!messages || index === 0) return true;
  const current = messages[index].时间.match(/T(\d{1,2}):(\d{2})/);
  const previous = messages[index - 1].时间.match(/T(\d{1,2}):(\d{2})/);
  if (!current || !previous) return false;
  return Number(current[1]) * 60 + Number(current[2]) - (Number(previous[1]) * 60 + Number(previous[2])) >= 5;
}
function selectTab(next: Tab) {
  tab.value = next;
  query.value = '';
  searchOpen.value = false;
  error.value = '';
}
function openChat(key: string) {
  selectedKey.value = key;
  draft.value = '';
  quoted.value = null;
  stickerOpen.value = false;
  extrasOpen.value = false;
  detailsOpen.value = false;
  cardView.value = null;
  error.value = '';
  scrollBottom();
}
function openCard(id: string) {
  if (!accounts.value[id]) {
    error.value = '名片中的账号不存在。';
    return;
  }
  cardView.value = id;
}
function openCardChat() {
  if (!cardView.value) return;
  openContact(cardView.value);
}
async function requestCardFriend() {
  if (!cardView.value) return;
  await requestFriend(cardView.value);
  if (!error.value) cardView.value = null;
}
function openPayment(message: 微信消息, index: number) {
  const item = message.内容[index];
  if (typeof item !== 'string') return;
  const match = item.match(/^<(红包|转账) 金额="([^"]+)">([\s\S]*?)<\/\1>$/);
  if (!match) return;
  paymentView.value = {
    message,
    index,
    kind: match[1] as '红包' | '转账',
    amount: match[2],
    remark: match[3],
    status: message.特殊内容状态?.[index],
  };
}
async function performOperation(event: Omit<OperationEvent, '类型' | '时间'>) {
  if (sending.value || !selectedKey.value) return;
  sending.value = true;
  error.value = '';
  try {
    await store.performWeChatOperation({ 类型: '操作', 时间: worldTime.value, ...event });
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '微信操作失败。';
  } finally {
    sending.value = false;
  }
}
async function resolvePayment(operation: '领取红包' | '领取转账' | '退回转账') {
  const view = paymentView.value;
  if (!view || !selectedKey.value) return;
  await performOperation({
    操作: operation,
    操作者: 'user',
    会话: selectedKey.value,
    目标: { 发送者: view.message.发送者, 时间: view.message.时间 },
  });
  if (!error.value) paymentView.value = null;
}
async function poke(id: string) {
  if (!selectedKey.value || id === 'user') return;
  await performOperation({ 操作: '拍一拍', 操作者: 'user', 目标: id, 会话: selectedKey.value });
}
async function invite(id: string) {
  if (!selectedKey.value) return;
  await performOperation({ 操作: '邀请进群', 操作者: 'user', 会话: selectedKey.value, 目标: id });
  if (!error.value) detailsOpen.value = false;
}
function startForward(message: 微信消息) {
  forwarding.value = message;
}
async function sendForward(destination: string) {
  const source = selectedSession.value;
  const message = forwarding.value;
  if (!source || !message || !selectedKey.value) return;
  sending.value = true;
  error.value = '';
  try {
    const snapshot = { 发送者: message.发送者, 时间: message.时间, 内容: message.内容 };
    const forwarded: 微信消息内容 =
      source.类型 === '私聊'
        ? { 转发: { 私聊: { 成员: [...source.成员], 消息: [snapshot] } } }
        : { 转发: { 群聊: { 名称: source.名称 || selectedKey.value, 成员: [...source.成员], 消息: [snapshot] } } };
    await store.sendWeChatMessage(destination, [forwarded]);
    forwarding.value = null;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '转发失败。';
  } finally {
    sending.value = false;
  }
}
async function sendCard(id: string) {
  if (!selectedKey.value) return;
  sending.value = true;
  error.value = '';
  try {
    await store.sendWeChatMessage(selectedKey.value, [`<名片 角色="${id}">`]);
    cardPickerOpen.value = false;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '名片发送失败。';
  } finally {
    sending.value = false;
  }
}
async function sendVoice() {
  if (
    !selectedKey.value ||
    !voiceText.value.trim() ||
    !/^\d+$/.test(voiceDuration.value) ||
    Number(voiceDuration.value) <= 0
  ) {
    error.value = '请填写语音转写内容和有效时长。';
    return;
  }
  if (/[<>]/.test(voiceText.value)) {
    error.value = '转写内容不能包含尖括号。';
    return;
  }
  sending.value = true;
  error.value = '';
  try {
    await store.sendWeChatMessage(selectedKey.value, [
      `<语音 时长="${voiceDuration.value}s">${voiceText.value.trim()}</语音>`,
    ]);
    voiceOpen.value = false;
    voiceText.value = '';
    voiceDuration.value = '';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '语音消息发送失败。';
  } finally {
    sending.value = false;
  }
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
    await store.sendWeChatMessage(selectedKey.value, [text], quoted.value ?? undefined);
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
    await store.sendWeChatMessage(selectedKey.value, [`<表情包>${name}</表情包>`], quoted.value ?? undefined);
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
