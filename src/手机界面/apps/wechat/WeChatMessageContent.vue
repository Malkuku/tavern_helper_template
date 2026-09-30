<template>
  <div class="wx-content-parts">
    <template v-for="({ part: item, sourceIndex }, index) in displayContentParts(items)" :key="index">
      <span v-if="typeof item === 'string' && parseText(item).kind === 'text'" class="wx-content-text">{{ item }}</span>
      <div v-else-if="typeof item === 'string' && parseText(item).kind === 'voice'" class="wx-rich wx-voice">
        <div class="wx-voice-heading">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M4 9v6m4-9v12m4-15v18m4-13v8m4-6v4" stroke-linecap="round" />
          </svg>
          <strong
            >语音 <span>{{ parseText(item).label }}</span></strong
          >
        </div>
        <span class="wx-voice-transcript">{{ parseText(item).detail }}</span>
      </div>
      <div v-else-if="typeof item === 'string' && parseText(item).kind === 'sticker'" class="wx-rich wx-sticker">
        <img
          v-if="stickerSource(parseText(item).label)"
          :src="stickerSource(parseText(item).label)"
          :alt="parseText(item).label"
        />
        <span v-else>表情包 · {{ parseText(item).label }}</span>
      </div>
      <button
        v-else-if="typeof item === 'string' && parseText(item).kind === 'card'"
        type="button"
        class="wx-rich wx-contact-card"
        @click="emit('open-card', parseText(item).label)"
      >
        <span class="wx-contact-card-avatar"
          ><img
            v-if="resolveWechatImage(accounts[parseText(item).label]?.头像)"
            :src="resolveWechatImage(accounts[parseText(item).label].头像)"
            alt=""
          /><template v-else>{{
            (accounts[parseText(item).label]?.昵称 || parseText(item).label).slice(0, 1)
          }}</template></span
        >
        <strong>{{ accounts[parseText(item).label]?.昵称 || parseText(item).label }}</strong>
        <small>个人名片</small>
      </button>
      <button
        v-else-if="typeof item === 'string' && parseText(item).kind === 'location'"
        type="button"
        class="wx-rich wx-location-card"
        @click="emit('open-location', parseText(item).label)"
      >
        <span class="wx-location-pin">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
            <circle cx="12" cy="10" r="2.4" />
          </svg>
        </span>
        <span class="wx-location-info"
          ><strong>{{ parseText(item).label }}</strong
          ><small>查看地图位置</small></span
        >
        <svg
          class="wx-location-chevron"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="m9 6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <button
        v-else-if="typeof item === 'string'"
        type="button"
        class="wx-rich wx-payment"
        :class="{ 'wx-payment-done': states?.[sourceIndex + startIndex] }"
        @click="emit('open-payment', sourceIndex + startIndex)"
      >
        <span class="wx-payment-icon">{{ parseText(item).kind === 'redpacket' ? '🧧' : '⇄' }}</span>
        <span class="wx-payment-body"
          ><strong>{{ parseText(item).kind === 'redpacket' ? '红包' : `¥${parseText(item).label}` }}</strong
          ><small>{{ states?.[sourceIndex + startIndex] || paymentCaption(item) }}</small></span
        >
        <small class="wx-payment-status">{{ parseText(item).kind === 'redpacket' ? '红包' : '转账' }}</small>
      </button>
      <details v-else class="wx-rich wx-forward">
        <summary>转发的{{ '私聊' in item.转发 ? '私聊' : '群聊' }}记录 · {{ forwardMessages(item).length }} 条</summary>
        <div v-for="(message, messageIndex) in forwardMessages(item)" :key="messageIndex" class="wx-forward-line">
          <strong>{{ accounts[message.发送者]?.昵称 || message.发送者 }}</strong>
          <WeChatMessageContent
            v-if="depth < 2"
            :items="message.内容"
            :accounts="accounts"
            :sender="message.发送者"
            :group="'群聊' in item.转发"
            :depth="depth + 1"
            @open-location="emit('open-location', $event)"
          />
          <span v-else>[消息]</span>
        </div>
      </details>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { 微信数据, 微信消息, 微信消息内容, 微信转发内容 } from '../../types';
import { parseLocationShare } from '../map/locationShare';
import { resolveWechatImage } from './imageLibrary';
import { stickerSourceByName } from './stickerSource';
import { displayContentParts, parseTransferMessage } from './wechatData';

const props = withDefaults(
  defineProps<{
    items: 微信消息内容[];
    accounts: 微信数据['账号'];
    sender: string;
    group?: boolean;
    depth?: number;
    startIndex?: number;
    states?: 微信消息['特殊内容状态'];
  }>(),
  { depth: 0, startIndex: 0, states: undefined, group: false },
);
const emit = defineEmits<{
  'open-card': [id: string];
  'open-payment': [index: number];
  'open-location': [key: string];
}>();

function parseText(value: string): {
  kind: 'text' | 'voice' | 'sticker' | 'redpacket' | 'transfer' | 'card' | 'location';
  label: string;
  detail: string;
} {
  const voice = value.match(/^<语音\s+时长="([^"]+)">([\s\S]*?)<\/语音>$/);
  if (voice) return { kind: 'voice', label: voice[1], detail: voice[2] };
  const sticker = value.match(/^<表情包>([\s\S]*?)<\/表情包>$/);
  if (sticker) return { kind: 'sticker', label: sticker[1], detail: '' };
  const card = value.match(/^<名片\s+角色="([^"]+)">$/);
  if (card) return { kind: 'card', label: card[1], detail: '' };
  const location = parseLocationShare(value);
  if (location) return { kind: 'location', label: location, detail: '' };
  const transfer = parseTransferMessage(value);
  if (transfer) return { kind: 'transfer', label: transfer.amount.replace(/g$/i, ''), detail: transfer.remark };
  const redpacket = value.match(/^<红包\s+金额="([^"]+)">([\s\S]*?)<\/红包>$/);
  if (redpacket) return { kind: 'redpacket', label: redpacket[1].replace(/g$/i, ''), detail: redpacket[2] };
  return { kind: 'text', label: '', detail: '' };
}

function stickerSource(name: string): string {
  return stickerSourceByName(props.accounts, props.sender, name, resolveWechatImage);
}

function paymentCaption(value: string): string {
  if (parseText(value).kind === 'redpacket') return '领取红包';
  const recipient = parseTransferMessage(value)?.recipient;
  if (recipient) return `转给 ${props.accounts[recipient]?.昵称 || recipient}`;
  if (props.group) return '未指定收款人';
  return props.sender === 'user' ? '你发起了一笔转账' : '待收款';
}

function forwardMessages(item: 微信转发内容): 微信消息[] {
  return '私聊' in item.转发 ? item.转发.私聊.消息 : item.转发.群聊.消息;
}
</script>
