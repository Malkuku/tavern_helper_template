<template>
  <span
    class="wx-avatar"
    :class="{ 'wx-avatar-user': id === 'user', 'wx-avatar-organization': id === organizationNoticeAccount }"
  >
    <template v-if="id === organizationNoticeAccount">
      <WitchMark class="wx-finance-mark" />
      <svg class="wx-finance-seal" viewBox="0 0 24 24" fill="none" role="img" aria-label="组织财务">
        <circle cx="12" cy="12" r="10.5" fill="#301527" stroke="#E4B97A" />
        <circle cx="12" cy="12" r="8.2" stroke="#E4B97A" stroke-opacity=".35" stroke-width=".6" />
        <path
          d="m8 6 4 6 4-6M12 12v6M8 12h8M8 15h8"
          stroke="#FFE0AE"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </template>
    <img
      v-else-if="account?.头像 && resolveWechatImage(account.头像)"
      :src="resolveWechatImage(account.头像)"
      :alt="account.昵称 || id"
    />
    <template v-else>{{ (account?.昵称 || id).slice(0, 1) }}</template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { 微信数据 } from '../../types';
import { resolveWechatImage } from './imageLibrary';
import WitchMark from '../witch/WitchMark.vue';
import { organizationNoticeAccount } from '../witch/organizationExchange';

const props = defineProps<{ id: string; accounts: 微信数据['账号'] }>();
const account = computed(() => props.accounts[props.id]);
</script>

<style scoped>
span.wx-avatar.wx-avatar-organization {
  position: relative;
  overflow: hidden;
  background: linear-gradient(145deg, #411335, #150c25);
  box-shadow: inset 0 0 0 1px #b26490;
}
.wx-finance-mark {
  width: 82%;
  height: 82%;
  margin: -5% 5% 0 -5%;
  filter: drop-shadow(0 0 3px #fa87c077);
}
.wx-finance-seal {
  position: absolute;
  right: 3%;
  bottom: 3%;
  width: 38%;
  height: 38%;
}
</style>
