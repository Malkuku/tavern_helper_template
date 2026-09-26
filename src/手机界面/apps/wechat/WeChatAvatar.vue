<template>
  <span class="wx-avatar" :class="{ 'wx-avatar-user': id === 'user' }">
    <img v-if="account?.头像" :src="account.头像" :alt="account.昵称 || id" />
    <template v-else>{{ (account?.昵称 || id).slice(0, 1) }}</template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { 微信数据 } from '../../types';

const props = defineProps<{ id: string; accounts: 微信数据['账号'] }>();
const account = computed(() => props.accounts[props.id]);
</script>
