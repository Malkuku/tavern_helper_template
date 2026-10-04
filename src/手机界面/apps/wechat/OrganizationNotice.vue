<template>
  <section class="wx-organization-notices" aria-label="组织财务通知">
    <header class="wx-header wx-chat-header">
      <button class="wx-back" type="button" aria-label="返回 Weline" @click="emit('close')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="m15 5-7 7 7 7" />
        </svg>
      </button>
      <div class="wx-chat-title"><strong>组织财务</strong></div>
    </header>
    <div class="wx-messages">
      <template v-for="(notice, index) in notices" :key="index">
        <time v-if="dividers[index]" class="wx-time-divider">{{ displayWeChatTime(notice.时间, worldTime) }}</time>
        <div class="wx-message">
          <WeChatAvatar :id="organizationNoticeAccount" :accounts="accounts" />
          <div class="wx-message-main">
            <div class="wx-bubble wx-bubble-special">
              <div class="wx-rich wx-payment wx-payment-done">
                <span class="wx-payment-icon" aria-hidden="true">⇄</span>
                <span class="wx-payment-body"
                  ><strong>￥{{ notice.日元 }}</strong
                  ><small>已到账 · 兑换 {{ notice.点数 }} 点恶堕积分</small></span
                >
                <small class="wx-payment-status">组织兑换</small>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
    <p class="wx-system-tip">此会话仅接收组织通知</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { 手机数据, 微信数据 } from '../../types';
import { organizationNoticeAccount } from '../witch/organizationExchange';
import { displayWeChatTime, weChatTimeDividers } from './wechatTime';
import WeChatAvatar from './WeChatAvatar.vue';

const props = defineProps<{
  notices: NonNullable<手机数据['组织兑换通知']>;
  worldTime: string;
  accounts: 微信数据['账号'];
}>();
const emit = defineEmits<{ close: [] }>();
const dividers = computed(() => weChatTimeDividers(props.notices));
</script>
