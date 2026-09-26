<template>
  <div class="wx-content-parts">
    <template v-for="(item, index) in items" :key="index">
      <span v-if="typeof item === 'string' && parseText(item).kind === 'text'" class="wx-content-text">{{ item }}</span>
      <div v-else-if="typeof item === 'string' && parseText(item).kind === 'voice'" class="wx-rich wx-voice">
        <strong>))) 语音 {{ parseText(item).label }}</strong>
        <span>{{ parseText(item).detail }}</span>
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
        <span class="wx-contact-card-avatar">{{
          (accounts[parseText(item).label]?.昵称 || parseText(item).label).slice(0, 1)
        }}</span>
        <span
          ><strong>{{ accounts[parseText(item).label]?.昵称 || parseText(item).label }}</strong
          ><small>个人名片</small></span
        >
      </button>
      <button
        v-else-if="typeof item === 'string'"
        type="button"
        class="wx-rich wx-payment"
        :class="{ 'wx-payment-done': states?.[index + startIndex] }"
        @click="emit('open-payment', index + startIndex)"
      >
        <span class="wx-payment-icon">{{ parseText(item).kind === 'redpacket' ? '🧧' : '¥' }}</span>
        <span class="wx-payment-body"
          ><strong>{{ parseText(item).kind === 'redpacket' ? '微信红包' : '微信转账' }}</strong
          ><small>{{ parseText(item).detail || parseText(item).label }}</small></span
        >
        <span class="wx-payment-amount">{{ parseText(item).label }}</span>
        <small class="wx-payment-status">{{
          states?.[index + startIndex] || (parseText(item).kind === 'redpacket' ? '领取红包' : '确认收款')
        }}</small>
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
            :depth="depth + 1"
          />
          <span v-else>[消息]</span>
        </div>
      </details>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { 微信数据, 微信消息, 微信消息内容, 微信转发内容 } from '../../types';

const props = withDefaults(
  defineProps<{
    items: 微信消息内容[];
    accounts: 微信数据['账号'];
    sender: string;
    depth?: number;
    startIndex?: number;
    states?: 微信消息['特殊内容状态'];
  }>(),
  { depth: 0, startIndex: 0, states: undefined },
);
const emit = defineEmits<{ 'open-card': [id: string]; 'open-payment': [index: number] }>();

function parseText(value: string): {
  kind: 'text' | 'voice' | 'sticker' | 'redpacket' | 'transfer' | 'card';
  label: string;
  detail: string;
} {
  const voice = value.match(/^<语音\s+时长="([^"]+)">([\s\S]*?)<\/语音>$/);
  if (voice) return { kind: 'voice', label: voice[1], detail: voice[2] };
  const sticker = value.match(/^<表情包>([\s\S]*?)<\/表情包>$/);
  if (sticker) return { kind: 'sticker', label: sticker[1], detail: '' };
  const card = value.match(/^<名片\s+角色="([^"]+)">$/);
  if (card) return { kind: 'card', label: card[1], detail: '' };
  const payment = value.match(/^<(红包|转账)\s+金额="([^"]+)">([\s\S]*?)<\/\1>$/);
  if (payment)
    return {
      kind: payment[1] === '红包' ? 'redpacket' : 'transfer',
      label: payment[2],
      detail: payment[3],
    };
  return { kind: 'text', label: '', detail: '' };
}

function stickerSource(name: string): string {
  return props.accounts[props.sender]?.表情包?.[name] || '';
}

function forwardMessages(item: 微信转发内容): 微信消息[] {
  return '私聊' in item.转发 ? item.转发.私聊.消息 : item.转发.群聊.消息;
}
</script>
