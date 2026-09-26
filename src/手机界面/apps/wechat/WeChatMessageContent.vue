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
      <div v-else-if="typeof item === 'string'" class="wx-rich wx-payment">
        <strong>{{ parseText(item).kind === 'redpacket' ? '红包' : '转账' }} · {{ parseText(item).label }}</strong>
        <span>{{ parseText(item).detail }}</span>
      </div>
      <div v-else-if="'引用' in item" class="wx-rich wx-quote">
        <small>引用 {{ accounts[item.引用.发送者]?.昵称 || item.引用.发送者 }}</small>
        <WeChatMessageContent
          v-if="depth < 2"
          :items="item.引用.内容"
          :accounts="accounts"
          :sender="item.引用.发送者"
          :depth="depth + 1"
        />
        <span v-else>[引用消息]</span>
      </div>
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
  defineProps<{ items: 微信消息内容[]; accounts: 微信数据['账号']; sender: string; depth?: number }>(),
  { depth: 0 },
);

function parseText(value: string): {
  kind: 'text' | 'voice' | 'sticker' | 'redpacket' | 'transfer';
  label: string;
  detail: string;
} {
  const voice = value.match(/^<语音\s+时长="([^"]+)">([\s\S]*?)<\/语音>$/);
  if (voice) return { kind: 'voice', label: voice[1], detail: voice[2] };
  const sticker = value.match(/^<表情包>([\s\S]*?)<\/表情包>$/);
  if (sticker) return { kind: 'sticker', label: sticker[1], detail: '' };
  const payment = value.match(/^<(红包|转账)\s+金额="([^"]+)">([\s\S]*?)<\/\1>$/);
  if (payment) return { kind: payment[1] === '红包' ? 'redpacket' : 'transfer', label: payment[2], detail: payment[3] };
  return { kind: 'text', label: '', detail: '' };
}

function stickerSource(name: string): string {
  return props.accounts[props.sender]?.表情包?.[name] || '';
}

function forwardMessages(item: 微信转发内容): 微信消息[] {
  return '私聊' in item.转发 ? item.转发.私聊.消息 : item.转发.群聊.消息;
}
</script>
